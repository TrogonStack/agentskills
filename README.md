# AgentSkills

**AgentSkills is a Claude plugin that extends AI agents with reusable skills and commands for enhanced productivity and specialized capabilities.** The plugin provides a modular architecture for distributing and sharing agent capabilities, enabling developers to leverage pre-built expertise rather than recreating solutions from scratch.

**AgentSkills provides a collection of modular skills and commands that can be installed and used by Claude-powered agents.** These skills enable agents to perform specific tasks more effectively, from code generation patterns to workflow automation. The plugin architecture allows for easy distribution and sharing of agent capabilities across different projects and teams.

**The need for AgentSkills arises from the challenge of repeatedly implementing similar agent behaviors and patterns across different contexts.** Instead of recreating specialized knowledge and workflows each time, developers can leverage pre-built skills that encapsulate best practices, domain expertise, and proven solutions. This reduces development time, ensures consistency, and enables rapid deployment of sophisticated agent capabilities.

**AgentSkills is useful for developers building AI-powered applications with Claude, teams looking to standardize agent behaviors across projects, and organizations seeking to share and maintain reusable agent expertise.** It's particularly valuable for those working with event modeling, command patterns, and complex automation workflows where consistent, tested approaches are essential.

```bash
claude plugin marketplace add TrogonStack/agentskills
claude plugin install {plugin-name}@trogonstack
```

In Cursor on a Teams or Enterprise plan, import `https://github.com/TrogonStack/agentskills` as a team marketplace from **Dashboard > Plugins & MCPs > Team Marketplaces > Add Marketplace > Import from Repo**, then install plugins from **Customize** in the sidebar.

Each plugin also ships a root `plugin.json` following the [Agent Plugins](https://agent-plugins.org) 1.0.0 spec, for any client that supports it.

On other Cursor plans, copy a plugin into the local plugins directory and restart Cursor:

```bash
git clone https://github.com/TrogonStack/agentskills
mkdir -p ~/.cursor/plugins/local
cp -R agentskills/plugins/{plugin-name} ~/.cursor/plugins/local/
```

See all available plugins under [plugins](./plugins) directory.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on commit messages and releases.
