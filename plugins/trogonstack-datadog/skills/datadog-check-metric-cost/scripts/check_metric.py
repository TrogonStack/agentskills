#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6"]
# ///
"""Check metrics against Datadog's no-cost OpenTelemetry mappings and the current org's custom metrics usage."""

from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import shlex
import subprocess
import sys
import urllib.request
from dataclasses import asdict, dataclass, field
from enum import Enum
from pathlib import Path

import yaml

MAPPING_URL = "https://docs.datadoghq.com/opentelemetry/mapping/metrics_mapping.md"
METRIC_NAME = re.compile(r"^[A-Za-z0-9_.-]+$")
TABLE_SEPARATOR = re.compile(r"^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$")
USAGE_METRICS = {
    "indexed": "datadog.estimated_usage.metrics.custom.by_metric",
    "ingested": "datadog.estimated_usage.metrics.custom.ingested.by_metric",
}
SIMILAR_LIMIT = 10

EX_USAGE = 64
EX_DATAERR = 65
EX_NOINPUT = 66
EX_UNAVAILABLE = 69
EX_SOFTWARE = 70


@dataclass(frozen=True, order=True)
class MetricName:
    value: str

    def __str__(self) -> str:
        return self.value

    @property
    def valid(self) -> bool:
        return bool(METRIC_NAME.match(self.value))

    @property
    def normalized(self) -> str:
        return re.sub(r"[-_]", ".", self.value).lower()

    @property
    def segments(self) -> frozenset[str]:
        return frozenset(self.normalized.split("."))


@dataclass(frozen=True, order=True)
class Mapping:
    otel: str
    datadog: str

    def matches(self, name: MetricName) -> bool:
        return name.value in (self.otel, self.datadog) or self.datadog.startswith(f"{name.value}{{")


class DocsStatus(str, Enum):
    MAPPED = "mapped"
    SIMILAR = "similar"
    UNMAPPED = "unmapped"


class OrgStatus(str, Enum):
    CUSTOM = "custom"
    INTEGRATION = "integration"
    NOT_CUSTOM = "not_custom"
    NOT_REPORTING = "not_reporting"
    ERROR = "error"


@dataclass
class DocsResult:
    status: DocsStatus
    mappings: list[Mapping] = field(default_factory=list)


@dataclass
class OrgResult:
    status: OrgStatus
    indexed_custom_metrics: float | None = None
    ingested_custom_metrics: float | None = None
    integration: str | None = None
    error: str | None = None


@dataclass
class Report:
    metric: MetricName
    docs: DocsResult
    org: OrgResult | None = None


class MappingTable:
    def __init__(self, mappings: list[Mapping]) -> None:
        self.mappings = mappings

    @classmethod
    def parse(cls, markdown: str) -> MappingTable:
        rows: set[Mapping] = set()
        in_table = False
        for line in markdown.splitlines():
            if TABLE_SEPARATOR.match(line):
                in_table = True
                continue
            if "|" not in line:
                in_table = False
            if not in_table:
                continue
            cells = [cell.strip().strip("`") for cell in line.strip().strip("|").split("|")]
            if len(cells) < 2:
                continue
            otel, datadog = cells[0], cells[1]
            if METRIC_NAME.match(otel) and datadog:
                rows.add(Mapping(otel, datadog))
        return cls(sorted(rows))

    def check(self, name: MetricName) -> DocsResult:
        exact = [m for m in self.mappings if m.matches(name)]
        if exact:
            return DocsResult(DocsStatus.MAPPED, exact)
        similar = self.similar(name)
        if similar:
            return DocsResult(DocsStatus.SIMILAR, similar)
        return DocsResult(DocsStatus.UNMAPPED)

    def similar(self, name: MetricName) -> list[Mapping]:
        required = min(2, len(name.segments))
        scored = []
        for mapping in self.mappings:
            score = max(
                self._score(name, MetricName(mapping.otel)),
                self._score(name, MetricName(mapping.datadog)),
            )
            if score[0] >= required:
                scored.append((score, mapping))
        scored.sort(key=lambda item: (-item[0][0], -item[0][1], item[1]))
        return [mapping for _, mapping in scored[:SIMILAR_LIMIT]]

    @staticmethod
    def _score(name: MetricName, candidate: MetricName) -> tuple[int, float]:
        shared = len(name.segments & candidate.segments)
        ratio = difflib.SequenceMatcher(None, name.normalized, candidate.normalized).ratio()
        return shared, ratio


class PupError(Exception):
    pass


class Pup:
    def __init__(self, command: list[str]) -> None:
        self.command = command

    def _run(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run([*self.command, *args, "--no-agent"], capture_output=True, text=True, check=False)

    def authenticated(self) -> bool:
        try:
            return self._run("auth", "status").returncode == 0
        except FileNotFoundError:
            return False

    def custom_usage(self, usage_metric: str, name: MetricName) -> float | None:
        usage = self._run("metrics", "query", "--from", "1d", "--query", f"max:{usage_metric}{{metric_name:{name}}}")
        if usage.returncode != 0:
            raise PupError(usage.stderr.strip())
        points = [
            point[1]
            for series in json.loads(usage.stdout).get("series") or []
            for point in series.get("pointlist") or []
            if point[1] is not None
        ]
        return max(points) if points else None

    def check(self, name: MetricName) -> OrgResult:
        try:
            indexed = self.custom_usage(USAGE_METRICS["indexed"], name)
            ingested = self.custom_usage(USAGE_METRICS["ingested"], name)
        except PupError as error:
            return OrgResult(OrgStatus.ERROR, error=str(error))
        if indexed is not None or ingested is not None:
            return OrgResult(OrgStatus.CUSTOM, indexed_custom_metrics=indexed, ingested_custom_metrics=ingested)

        metadata = self._run("metrics", "metadata", "get", str(name))
        if metadata.returncode != 0:
            if "not found" in metadata.stderr:
                return OrgResult(OrgStatus.NOT_REPORTING)
            return OrgResult(OrgStatus.ERROR, error=metadata.stderr.strip())
        integration = json.loads(metadata.stdout).get("integration")
        if integration:
            return OrgResult(OrgStatus.INTEGRATION, integration=integration)
        return OrgResult(OrgStatus.NOT_CUSTOM)


def registry_metrics(root: Path) -> list[MetricName]:
    names: set[MetricName] = set()
    for path in sorted([*root.rglob("*.yaml"), *root.rglob("*.yml")]):
        for document in yaml.safe_load_all(path.read_text(encoding="utf-8")):
            if not isinstance(document, dict):
                continue
            for metric in document.get("metrics") or []:
                if isinstance(metric, dict) and metric.get("name"):
                    names.add(MetricName(metric["name"]))
            for group in document.get("groups") or []:
                if isinstance(group, dict) and group.get("type") == "metric" and group.get("metric_name"):
                    names.add(MetricName(group["metric_name"]))
    return sorted(names)


def fetch_mapping_table() -> MappingTable:
    with urllib.request.urlopen(MAPPING_URL, timeout=30) as response:
        return MappingTable.parse(response.read().decode())


def render_text(report: Report) -> str:
    lines = [str(report.metric)]
    docs = report.docs
    if docs.status is DocsStatus.MAPPED:
        lines.append("  docs: mapped, no extra cost when collected through the supported integration")
    elif docs.status is DocsStatus.SIMILAR:
        lines.append("  docs: no exact mapping; closest mapped metrics:")
    else:
        lines.append("  docs: no mapping; custom unless a Datadog integration collects it")
    lines.extend(f"    {m.otel} -> {m.datadog}" for m in docs.mappings)

    org = report.org
    if org is None:
        return "\n".join(lines)
    if org.status is OrgStatus.CUSTOM:
        counts = [
            f"{count:g} {kind}"
            for kind, count in (("indexed", org.indexed_custom_metrics), ("ingested", org.ingested_custom_metrics))
            if count is not None
        ]
        lines.append(f"  org: billed as custom, up to {' and '.join(counts)} custom metrics in the last day")
        lines.append("    Timeseries pricing estimate; under Metric Name pricing, check the usage page")
    elif org.status is OrgStatus.INTEGRATION:
        lines.append(f"  org: reporting through the {org.integration} integration, not counted as custom")
    elif org.status is OrgStatus.NOT_CUSTOM:
        lines.append("  org: reporting, not counted as custom in the last day")
    elif org.status is OrgStatus.NOT_REPORTING:
        lines.append("  org: not reporting")
    else:
        lines.append(f"  org: check failed: {org.error}")
    return "\n".join(lines)


def render_json(reports: list[Report]) -> str:
    def encode(report: Report) -> dict[str, object]:
        return {**asdict(report), "metric": str(report.metric)}

    return json.dumps([encode(r) for r in reports], default=lambda value: value.value, indent=2)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("metrics", nargs="*", type=MetricName, help="metric names to check")
    parser.add_argument("--registry", type=Path, action="append", default=[], help="also check every metric in a Weaver registry")
    parser.add_argument("--no-org", action="store_true", help="skip the org check")
    parser.add_argument("--json", action="store_true", help="print results as JSON")
    args = parser.parse_args(argv)

    for root in args.registry:
        if not root.is_dir():
            print(f"Registry not found: {root}", file=sys.stderr)
            return EX_NOINPUT

    metrics = sorted({*args.metrics, *(m for root in args.registry for m in registry_metrics(root))})
    if not metrics:
        parser.print_usage(sys.stderr)
        print("No metrics to check.", file=sys.stderr)
        return EX_USAGE
    invalid = [str(m) for m in metrics if not m.valid]
    if invalid:
        print(f"Not valid metric names: {', '.join(invalid)}", file=sys.stderr)
        return EX_DATAERR

    try:
        table = fetch_mapping_table()
    except OSError as error:
        print(f"Could not download {MAPPING_URL}: {error}", file=sys.stderr)
        return EX_UNAVAILABLE
    if not table.mappings:
        print(f"No rows parsed from {MAPPING_URL}; the page format may have changed. Check it by hand.", file=sys.stderr)
        return EX_SOFTWARE

    pup = None
    if not args.no_org:
        pup = Pup(shlex.split(os.environ.get("PUP", "pup")))
        if not pup.authenticated():
            print("Org check skipped: pup is missing or not authenticated (run 'pup auth login').", file=sys.stderr)
            pup = None

    reports = [Report(m, table.check(m), pup.check(m) if pup else None) for m in metrics]
    print(render_json(reports) if args.json else "\n".join(render_text(r) for r in reports))
    return 0


if __name__ == "__main__":
    sys.exit(main())
