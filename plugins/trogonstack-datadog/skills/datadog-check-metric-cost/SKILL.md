---
name: datadog-check-metric-cost
description: "Check whether a metric is already collected by Datadog at no extra cost before defining a new one, and estimate its custom metric count when it is not. Use before adding a metric to a semantic convention registry, instrumenting a new metric, or reviewing metrics exported to Datadog. Do not use for: (1) metric naming, (2) dashboard or monitor design, (3) Datadog Agent or Collector installation."
allowed-tools:
  - Read
  - Shell
---

# Check a metric against Datadog before creating it

Datadog bills every metric that does not come from one of its integrations as a custom metric. Before defining a metric, confirm that Datadog does not already collect it at no extra cost, and estimate what it costs if it does not.

## Workflow

### Look for a no-cost equivalent

Datadog collects metrics from supported OpenTelemetry integrations at no extra cost. A metric is no-cost when it arrives through a supported collection path, such as a receiver that defines it in its `metadata.yaml`, and is listed in the [Metrics Mappings](https://docs.datadoghq.com/opentelemetry/mapping/metrics_mapping.md#metrics-mappings) table. A snapshot of that table is in [references/otel-metrics-mapping.md](references/otel-metrics-mapping.md). Paths are relative to this skill's directory:

```bash
grep -i '<term>' references/otel-metrics-mapping.md
```

Search by the OpenTelemetry name and by the concept, since the Datadog name often differs (`jvm.memory.used`, `memory`, `goroutine`).

A name match alone does not make a metric no-cost. The no-cost status comes from the collection path, so an application metric that reuses a mapped name is still custom. When a match exists, enable the integration that produces it instead of defining the metric yourself. A renamed or reshaped copy is billed as custom too.

The no-cost families are:

| Area                    | Source                                                                                                                                                                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosts                   | [Host Metrics](https://docs.datadoghq.com/opentelemetry/integrations/host_metrics.md) (`hostmetricsreceiver`)                                                                                                                                                                                                                                       |
| Containers              | [Docker](https://docs.datadoghq.com/opentelemetry/integrations/docker_metrics.md), [Podman](https://docs.datadoghq.com/opentelemetry/integrations/podman_metrics.md), [Kubernetes](https://docs.datadoghq.com/opentelemetry/integrations/kubernetes_metrics.md)                                                                                     |
| Runtimes                | [Runtime Metrics](https://docs.datadoghq.com/opentelemetry/integrations/runtime_metrics.md) for Java, .NET, Go, Node.js, and Python, with the matching language integration installed in Datadog                                                                                                                                                                                                                                  |
| Collector               | [Collector Health Metrics](https://docs.datadoghq.com/opentelemetry/integrations/collector_health_metrics.md)                                                                                                                                                                                                                                       |
| Web servers and proxies | [Apache](https://docs.datadoghq.com/opentelemetry/integrations/apache_metrics.md), [NGINX](https://docs.datadoghq.com/opentelemetry/integrations/nginx_metrics.md), [IIS](https://docs.datadoghq.com/opentelemetry/integrations/iis_metrics.md), [HAProxy](https://docs.datadoghq.com/opentelemetry/integrations/haproxy_metrics.md)                |
| Databases and messaging | [MySQL](https://docs.datadoghq.com/opentelemetry/integrations/mysql_metrics.md), [PostgreSQL](https://docs.datadoghq.com/opentelemetry/integrations/postgres_metrics.md), [SQL Server](https://docs.datadoghq.com/opentelemetry/integrations/sqlserver_metrics.md), [Kafka](https://docs.datadoghq.com/opentelemetry/integrations/kafka_metrics.md) |
| Big data                | [Apache Spark](https://docs.datadoghq.com/opentelemetry/integrations/spark_metrics.md)                                                                                                                                                                                                                                                              |

The Datadog docs warn that a misconfigured receiver can turn these into custom metrics. Configure receivers as their OpenTelemetry documentation describes.

### Prefer span-derived trace metrics for request rate, errors, and latency

APM computes [trace metrics](https://docs.datadoghq.com/tracing/metrics/metrics_namespace.md) (`trace.<SPAN_NAME>.hits`, `.errors`, `.duration`, and others) from 100% of traffic. With OpenTelemetry, the [`span_metrics` connector](https://docs.datadoghq.com/opentelemetry/integrations/trace_metrics.md) produces them, and it must run before any sampling processor. When spans already cover an operation, a hand-written counter or latency histogram for it usually duplicates trace metrics.

Do not confuse these with [metrics generated from spans](https://docs.datadoghq.com/tracing/trace_pipeline/generate_metrics.md) in the trace pipeline. Those are custom metrics.

### Treat everything else as a custom metric

These are custom metrics:

- Application metrics defined in a registry and emitted through the OpenTelemetry SDK, even when their name appears in the mapping table.
- Anything sent through DogStatsD or a custom Agent check.
- Metrics from Marketplace integrations, or from integrations outside the Datadog catalog.
- Metrics from [standard integrations that can emit custom metrics](https://docs.datadoghq.com/metrics/custom_metrics.md#standard-integrations): Java-JMX, Go-Expvar, ActiveMQ XML, OpenMetrics, Prometheus, Nagios, WMI, PDH, Windows performance counters, configured queries on MySQL, Postgres, Oracle, and SQL Server, and custom metrics from AWS.

### Estimate the cost of a custom metric

Datadog bills custom metrics under one of two mutually exclusive models, set by the contract. Ask which one the account uses when it is not known, since the estimate depends on it.

#### Timeseries (cardinality) pricing

Under Timeseries pricing, Datadog counts one custom metric per unique combination of metric name and tag values, including the `host` tag. See [counting custom metrics](https://docs.datadoghq.com/account_management/billing/custom_metrics.md#counting-custom-metrics).

| Datadog type                 | Custom metrics per tag combination                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| COUNT, RATE, GAUGE           | 1                                                                                                             |
| HISTOGRAM (Agent, DogStatsD) | 5 by default (`max`, `median`, `avg`, `95percentile`, `count`), more when aggregates or percentiles are added |
| DISTRIBUTION                 | 5 (`count`, `sum`, `min`, `max`, `avg`), 10 with percentiles enabled                                          |

Delta and cumulative monotonic OTLP sums map to COUNT, cumulative non-monotonic sums and gauges to GAUGE, and histograms to DISTRIBUTION by default. See [OTLP metric types](https://docs.datadoghq.com/metrics/open_telemetry/otlp_metric_types.md).

An OTLP histogram exported in the Datadog exporter's `counters` mode also emits one `.bucket` series per bucket, tagged with `lower_bound` and `upper_bound`, so every boundary multiplies the count.

Multiply the per-combination count by the cardinality of every attribute on the metric. Each high-cardinality attribute (IDs, raw paths, free-form strings) multiplies the bill, so drop or bound it before adding the metric.

Each paid host adds 100 ingested and 100 indexed custom metrics on Pro, 200 of each on Enterprise, pooled across the whole account. See [allocation](https://docs.datadoghq.com/account_management/billing/custom_metrics.md#allocation).

#### Metric Name pricing

Under [Metric Name pricing](https://docs.datadoghq.com/account_management/billing/metric_name_pricing.md), Datadog bills each unique metric name that submits more than 100 indexed datapoints in a month, plus datapoints beyond the volume each name includes. The custom metric definition is the same as under Timeseries pricing.

- Each new metric name is a billed unit, so prefer one metric with a bounded attribute over several metrics that differ only by name.
- Attributes do not add names, but every series they create sends datapoints. Estimate datapoints as series count times export frequency times the period.
- Distribution metrics multiply datapoints by 5, or by 10 with percentile aggregations enabled.
- Ingested datapoints are billed only above five times the indexed volume.

### Report the result

For each proposed metric, state one of:

- **No-cost equivalent exists**: name the OpenTelemetry metric and its Datadog mapping, and recommend reusing it.
- **Covered by trace metrics**: name the span and the `trace.*` metric that already answers the question.
- **Custom**: give the billing model, the Datadog type, the attributes with their expected cardinality, and the estimated custom metric count or datapoint volume.

## Check an OpenTelemetry Weaver registry

When metrics live in an [OpenTelemetry Weaver](https://github.com/open-telemetry/weaver) semantic convention registry, check the registry before generating code from it.

List the metrics it defines, including files in nested folders. `definition/2` files declare them under `metrics`, and older files declare groups with `type: metric` and a `metric_name`:

```bash
find <registry> -type f \( -name '*.yaml' -o -name '*.yml' \) -exec \
  yq -N '.metrics[]?.name, (.groups[]? | select(.type == "metric") | .metric_name)' {} +
```

For each metric:

- When it matches a no-cost OpenTelemetry metric, remove it from the registry and enable the integration that produces it. Emitting it from generated application code makes it custom, whatever its name.
- When it duplicates a trace metric, drop it and rely on spans.
- When it is custom and comes from an upstream semantic convention, declare the upstream registry under `dependencies` in `manifest.yaml` instead of copying its definition, so the name, unit, and attributes stay aligned.
- When it is custom, read the cardinality off the registry: the attributes the metric references, their enum members, and whether each one is `required`, `recommended`, or `opt_in`. Count `opt_in` attributes only if the deployment enables them.
- For histograms, read the boundaries from `annotations.aggregation.parameters.boundaries` when the registry sets them. They only change the count in `counters` mode.

## Refresh the snapshot

The mapping table changes as Datadog adds integrations. Regenerate the snapshot before relying on a miss:

```bash
scripts/refresh-mapping.sh
```

To confirm actual billing, check the usage page. Under Timeseries pricing, the [estimated usage metrics](https://docs.datadoghq.com/account_management/billing/usage_metrics.md) `datadog.estimated_usage.metrics.custom` and `datadog.estimated_usage.metrics.custom.ingested` track custom metric counts.
