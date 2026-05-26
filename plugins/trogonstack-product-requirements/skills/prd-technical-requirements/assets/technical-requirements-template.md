# Technical Requirements

- **Project:** {projectid}
- **Last updated:** <YYYY-MM-DD>

## Performance
| User action | Metric | Target | Conditions |
|-------------|--------|--------|------------|
| <action> | p95 latency | <ms> | <hardware / network> |

## Scale
- Launch: <users / tenants / events>
- 12 months: <users / tenants / events>
- Peak vs steady-state: <ratio>

## Reliability & availability
- SLO: <99.x%> over <window>
- RTO / RPO: <values>
- Degradation: <what still works when X fails>

## Security
- Authentication: <method>
- Authorization: <model>
- Data classification: <input / output sensitivity>
- Threat model concerns: <list>

## Privacy & compliance
- Regimes: <GDPR / HIPAA / SOC 2 / PCI / regional>
- Sensitive data: <handling rules>
- Retention / deletion: <rules>
- Audit logging: <scope>

## Integrations
| System | Direction | Contract | Failure semantics |
|--------|-----------|----------|-------------------|
| <name> | in / out | <API / event / file> | <retry / dead-letter / fail-open> |

## Platforms & environments
- Supported: <browsers / OS / device>
- Minimums: <hardware / network>
- Deployment: <cloud / on-prem / hybrid>
- Offline behavior: <expected>

## Accessibility
- Standard: <WCAG level>
- Required behaviors: <keyboard / SR / contrast / motion>

## Localization
- Languages at launch: <list>
- Languages within 12 months: <list>
- RTL: <yes / no>
- Formats: <dates / numbers / currency / time zones>

## Observability
- Logs: <required fields>
- Metrics: <named SLIs>
- Traces: <required spans>
- Dashboards / alerts required before GA: <list>

## Cost constraints
- Unit cost target: <per user / request / event>
- Infrastructure ceiling: <amount>

## Explicit non-constraints
- <category>: not a constraint for this product because <reason>
