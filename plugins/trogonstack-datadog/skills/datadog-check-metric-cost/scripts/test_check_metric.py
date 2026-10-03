# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6", "pytest>=8"]
# ///
from pathlib import Path

from check_metric import EX_NOINPUT, DocsStatus, Mapping, MappingTable, MetricName, main, registry_metrics

PAGE = """
Intro text | with a pipe that is not a table

| otel | datadog | description |
| ---- | ------- | ----------- |
| system.cpu.utilization | system.cpu.user | CPU. |
| spark.job.task.active | spark.job.num_tasks{status: running} | Tasks. |
| process.runtime.jvm.memory.usage | jvm.gc.eden_size | Memory. |
| kafka.producer.byte-rate | kafka.producer.bytes_out | Bytes. |
| | orphan | No otel name. |
"""


def table() -> MappingTable:
    return MappingTable.parse(PAGE)


def test_parse_keeps_valid_rows_only():
    assert table().mappings == sorted(
        [
            Mapping("kafka.producer.byte-rate", "kafka.producer.bytes_out"),
            Mapping("process.runtime.jvm.memory.usage", "jvm.gc.eden_size"),
            Mapping("spark.job.task.active", "spark.job.num_tasks{status: running}"),
            Mapping("system.cpu.utilization", "system.cpu.user"),
        ]
    )


def test_parse_returns_nothing_without_a_table():
    assert MappingTable.parse("# No table here").mappings == []


def test_parse_accepts_aligned_separators_and_code_spans():
    page = "| otel | datadog |\n|:---|:---:|\n| `system.cpu.utilization` | `system.cpu.user` |\n"
    assert MappingTable.parse(page).mappings == [Mapping("system.cpu.utilization", "system.cpu.user")]


def test_parse_accepts_tables_without_outer_pipes():
    page = "otel | datadog\n--- | ---\nsystem.cpu.utilization | system.cpu.user\n\nAfter | the table\n"
    assert MappingTable.parse(page).mappings == [Mapping("system.cpu.utilization", "system.cpu.user")]


def test_parse_ignores_pipes_in_prose_before_the_table():
    page = "Prose | with a pipe\n\n| otel | datadog |\n| --- | --- |\n| a.b | c.d |\n"
    assert MappingTable.parse(page).mappings == [Mapping("a.b", "c.d")]


def test_missing_registry_is_an_error(tmp_path: Path):
    assert main(["--no-org", "--registry", str(tmp_path / "missing")]) == EX_NOINPUT


def test_exact_match_on_either_side():
    assert table().check(MetricName("system.cpu.utilization")).status is DocsStatus.MAPPED
    assert table().check(MetricName("system.cpu.user")).status is DocsStatus.MAPPED


def test_exact_match_ignores_datadog_tag_suffix():
    result = table().check(MetricName("spark.job.num_tasks"))
    assert result.status is DocsStatus.MAPPED


def test_similar_ranks_closest_first():
    result = table().check(MetricName("myapp.jvm.memory.usage"))
    assert result.status is DocsStatus.SIMILAR
    assert result.mappings[0].otel == "process.runtime.jvm.memory.usage"


def test_similar_normalizes_separators():
    result = table().check(MetricName("kafka.producer.byte_rate"))
    assert result.status is DocsStatus.SIMILAR
    assert result.mappings[0].otel == "kafka.producer.byte-rate"


def test_unrelated_name_is_unmapped():
    assert table().check(MetricName("totally.new.thing")).status is DocsStatus.UNMAPPED


def test_registry_reads_both_formats_recursively(tmp_path: Path):
    (tmp_path / "manifest.yaml").write_text("file_format: manifest/2.0.0\nname: x\n")
    (tmp_path / "top.yaml").write_text("file_format: definition/2\nmetrics:\n  - name: top.metric\n")
    nested = tmp_path / "a" / "b"
    nested.mkdir(parents=True)
    (nested / "old.yml").write_text("groups:\n  - id: g\n    type: metric\n    metric_name: nested.v1\n  - id: s\n    type: span\n")
    assert registry_metrics(tmp_path) == [MetricName("nested.v1"), MetricName("top.metric")]
