# OpenCode SEO

OpenCode-native SEO analysis system. Build workflows from commands, skills, focused subagents, MCP tools, and deterministic scripts.

## Architecture

- `.opencode/commands/`: user entry points
- `.opencode/skills/`: on-demand workflow instructions
- `.opencode/agents/`: focused SEO subagents
- `.opencode/plugins/`: lifecycle and tool hooks; add only when commands or skills cannot solve need
- `.opencode/tools/`: typed wrappers around deterministic scripts
- `scripts/`: parsing, validation, measurement, and comparison
- `tests/`: smallest checks proving deterministic logic

## Rules

- `/opencode-seo` is only public entry point.
- Use Playwright MCP for rendered-page interaction.
- Use scripts for parsing, validation, calculations, and repeatable checks.
- Use model for interpretation, prioritization, and synthesis.
- Every finding needs issue, evidence, impact, fix, priority, and confidence.
- Never invent browser output, metrics, API data, or search results.
- Missing optional capability must reduce scope, not fail entire workflow.
- Delegate only relevant specialists. Avoid unconditional agent fan-out.
- Keep secrets in environment variables.
- Never hardcode target URLs, domains, or machine-specific paths.
- Prefer deletion and native OpenCode features over compatibility wrappers.

## Verification

- Validate resolved config with `opencode debug config`.
- Check MCP availability with `opencode mcp list`.
- Restart OpenCode after changing config, commands, agents, skills, plugins, or tools.
