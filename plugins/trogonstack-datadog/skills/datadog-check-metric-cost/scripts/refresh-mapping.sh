#!/usr/bin/env bash
set -euo pipefail

out="$(cd "$(dirname "$0")/.." && pwd)/references/otel-metrics-mapping.md"
src="$(curl -sfL https://docs.datadoghq.com/opentelemetry/mapping/metrics_mapping.md)"

rows="$(awk -F'|' '/^\| -/ { t = 1; next }
  t && /^\|/ {
    o = $2; g = $3
    gsub(/^ +| +$/, "", o); gsub(/^ +| +$/, "", g)
    if (o ~ /^[A-Za-z0-9_.-]+$/ && g != "") print "| `" o "` | `" g "` |"
  }' <<<"$src" | LC_ALL=C sort -u)"

if [ -z "$rows" ]; then
  echo "No mapping rows extracted; the table format may have changed. Keeping $out." >&2
  exit 1
fi

tmp="$(mktemp "$out.XXXXXX")"
trap 'rm -f "$tmp"' EXIT

{
  printf '# OpenTelemetry to Datadog metrics mapping\n\n'
  printf 'Snapshot of the [Metrics Mappings](https://docs.datadoghq.com/opentelemetry/mapping/metrics_mapping.md#metrics-mappings) table, taken %s. ' "$(date -u +%Y-%m-%d)"
  printf 'Datadog collects the OpenTelemetry metrics in the `otel` column at no extra cost when they arrive through a supported integration. One OpenTelemetry metric can map to several Datadog metrics.\n\n'
  printf 'Regenerate with `scripts/refresh-mapping.sh`.\n\n'
  printf '| otel | datadog |\n| ---- | ------- |\n'
  printf '%s\n' "$rows"
} >"$tmp"

mv "$tmp" "$out"
trap - EXIT
