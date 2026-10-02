#!/usr/bin/env bash
set -euo pipefail

out="$(cd "$(dirname "$0")/.." && pwd)/references/otel-metrics-mapping.md"
src="$(curl -sfL https://docs.datadoghq.com/opentelemetry/mapping/metrics_mapping.md)"

{
  printf '# OpenTelemetry to Datadog metrics mapping\n\n'
  printf 'Snapshot of the [Metrics Mappings](https://docs.datadoghq.com/opentelemetry/mapping/metrics_mapping.md#metrics-mappings) table, taken %s. ' "$(date -u +%Y-%m-%d)"
  printf 'Datadog collects the OpenTelemetry metrics in the `otel` column at no extra cost. One OpenTelemetry metric can map to several Datadog metrics.\n\n'
  printf 'Regenerate with `scripts/refresh-mapping.sh`.\n\n'
  printf '| otel | datadog |\n| ---- | ------- |\n'
  awk -F'|' '/^\| -/ { t = 1; next }
    t && /^\|/ {
      o = $2; g = $3
      gsub(/^ +| +$/, "", o); gsub(/^ +| +$/, "", g)
      if (o != "") print "| `" o "` | `" g "` |"
    }' <<<"$src" | LC_ALL=C sort -u
} >"$out"
