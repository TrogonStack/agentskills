#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: check-metric.sh [--registry <dir>] [--no-org] [<metric>...]

Checks each metric against the live Datadog OpenTelemetry metrics mapping and,
when pup is authenticated, against the custom metrics usage of the current org.

  --registry <dir>  Also check every metric defined in a Weaver registry (needs yq).
  --no-org          Skip the org check.

Set PUP to override the pup command, for example PUP="mise exec github:DataDog/pup@latest -- pup".
EOF
}

mapping_url="https://docs.datadoghq.com/opentelemetry/mapping/metrics_mapping.md"
org_check=1
metrics=()

while [ $# -gt 0 ]; do
  case "$1" in
    --registry)
      [ $# -ge 2 ] || { usage >&2; exit 64; }
      command -v yq >/dev/null || { echo "yq is required for --registry" >&2; exit 69; }
      while IFS= read -r m; do
        [ -n "$m" ] && metrics+=("$m")
      done < <(find "$2" -type f \( -name '*.yaml' -o -name '*.yml' \) -exec \
        yq -N '.metrics[]?.name, (.groups[]? | select(.type == "metric") | .metric_name)' {} + | LC_ALL=C sort -u)
      shift 2
      ;;
    --no-org) org_check=0; shift ;;
    -h | --help) usage; exit 0 ;;
    -*) usage >&2; exit 64 ;;
    *) metrics+=("$1"); shift ;;
  esac
done

[ ${#metrics[@]} -gt 0 ] || { echo "No metrics to check." >&2; usage >&2; exit 64; }

src="$(curl -sfL "$mapping_url")" || { echo "Could not download $mapping_url" >&2; exit 69; }

mappings="$(awk -F'|' '/^\| -/ { t = 1; next }
  t && /^\|/ {
    o = $2; g = $3
    gsub(/^ +| +$/, "", o); gsub(/^ +| +$/, "", g)
    if (o ~ /^[A-Za-z0-9_.-]+$/ && g != "") print o "\t" g
  }' <<<"$src" | LC_ALL=C sort -u)"

if [ -z "$mappings" ]; then
  echo "No rows parsed from $mapping_url; the page format may have changed. Check it by hand." >&2
  exit 70
fi

read -r -a pup <<<"${PUP:-pup}"
if [ "$org_check" -eq 1 ] && ! "${pup[@]}" auth status --no-agent >/dev/null 2>&1; then
  echo "Org check skipped: pup is missing or not authenticated (run 'pup auth login')." >&2
  org_check=0
fi

check_docs() {
  local name="$1" exact similar
  exact="$(awk -F'\t' -v n="$name" '$1 == n || $2 == n || index($2, n "{") == 1' <<<"$mappings")"
  if [ -n "$exact" ]; then
    echo "  docs: mapped, no extra cost when collected through the supported integration"
    awk -F'\t' '{ print "    " $1 " -> " $2 }' <<<"$exact"
    return
  fi
  similar="$(awk -F'\t' -v n="$name" '
    function norm(s) { gsub(/[-_]/, ".", s); return tolower(s) }
    BEGIN {
      k = split(norm(n), p, ".")
      key = k >= 2 ? p[k - 1] "." p[k] : p[k]
    }
    index(norm($1), key) || index(norm($2), key)' <<<"$mappings" | head -n 10)"
  if [ -n "$similar" ]; then
    echo "  docs: no exact mapping; similar mapped metrics:"
    awk -F'\t' '{ print "    " $1 " -> " $2 }' <<<"$similar"
  else
    echo "  docs: no mapping; custom unless a Datadog integration collects it"
  fi
}

check_org() {
  local name="$1" custom integration
  custom="$("${pup[@]}" metrics query --no-agent --from 1d \
    --query "max:datadog.estimated_usage.metrics.custom.by_metric{metric_name:$name}" \
    --jq '[.series[]?.pointlist[]? | select(.[1] != null) | .[1]] | max' 2>/dev/null || true)"
  if [ -n "$custom" ] && [ "$custom" != "null" ]; then
    echo "  org: billed as custom, up to $custom custom metrics in the last day"
    return
  fi
  if ! integration="$("${pup[@]}" metrics metadata get "$name" --no-agent --jq '.integration // empty' 2>/dev/null)"; then
    echo "  org: not reporting"
  elif integration="${integration//\"/}" && [ -n "$integration" ] && [ "$integration" != "null" ]; then
    echo "  org: reporting through the $integration integration, not counted as custom"
  else
    echo "  org: reporting, not counted as custom in the last day"
  fi
}

for name in "${metrics[@]}"; do
  echo "$name"
  check_docs "$name"
  [ "$org_check" -eq 1 ] && check_org "$name"
done
