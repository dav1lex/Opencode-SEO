# OpenCode SEO

SEO workflows built for OpenCode.

## Development

```bash
git clone <repository>
cd opencode-seo
opencode
```

Run:

```text
/opencode-seo page <url>
```

Playwright MCP starts automatically in an isolated browser profile.

After config changes, restart OpenCode. Check setup with:

```bash
opencode debug config
opencode mcp list
```

Only command routing exists today. Page audit implementation comes next.
