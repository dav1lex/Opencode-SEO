/**
 * robots.txt matching, per Google's spec.
 *
 * This was previously handed to a model as raw text with "is this page blocked?" — a question
 * with a real answer that path-prefix matching, wildcards, `$` anchors, and longest-match
 * precedence decide, not a reader's impression.
 */

type Group = { agents: string[]; rules: { allow: boolean; path: string }[] }

export type Robots = { groups: Group[]; sitemaps: string[] }

export function parseRobots(text: string): Robots {
  const groups: Group[] = []
  const sitemaps: string[] = []
  let current: Group | null = null
  // Consecutive User-agent lines share one group; a rule line closes the agent list.
  let acceptingAgents = false

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim()
    if (!line) continue
    const split = line.indexOf(":")
    if (split < 0) continue
    const field = line.slice(0, split).trim().toLowerCase()
    const value = line.slice(split + 1).trim()

    if (field === "sitemap") {
      sitemaps.push(value)
      continue
    }
    if (field === "user-agent") {
      if (!current || !acceptingAgents) {
        current = { agents: [], rules: [] }
        groups.push(current)
        acceptingAgents = true
      }
      current.agents.push(value.toLowerCase())
      continue
    }
    if (field !== "allow" && field !== "disallow") continue
    if (!current) continue
    acceptingAgents = false
    // "Disallow:" with an empty value allows everything; it is not a rule.
    if (field === "disallow" && !value) continue
    current.rules.push({ allow: field === "allow", path: value })
  }

  return { groups, sitemaps }
}

/** Escapes a robots path into a regex, honouring `*` wildcards and a trailing `$` anchor. */
function toPattern(path: string): RegExp {
  const anchored = path.endsWith("$")
  const body = anchored ? path.slice(0, -1) : path
  const escaped = body.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")
  return new RegExp(`^${escaped}${anchored ? "$" : ""}`)
}

/**
 * Google picks the single most specific group for the agent — an exact name beats `*`, and
 * `*` is used only when no named group matches. Within that group, the longest matching rule
 * wins; on an equal-length tie, Allow beats Disallow.
 */
export function isAllowed(robots: Robots, pathname: string, agent = "googlebot"): boolean {
  const wanted = agent.toLowerCase()
  const named = robots.groups.filter((group) =>
    group.agents.some((a) => a !== "*" && wanted.startsWith(a)),
  )
  const chosen = named.length ? named : robots.groups.filter((g) => g.agents.includes("*"))
  if (!chosen.length) return true

  let best: { allow: boolean; length: number } | null = null
  for (const group of chosen) {
    for (const rule of group.rules) {
      if (!toPattern(rule.path).test(pathname)) continue
      if (
        !best ||
        rule.path.length > best.length ||
        (rule.path.length === best.length && rule.allow)
      )
        best = { allow: rule.allow, length: rule.path.length }
    }
  }
  return best ? best.allow : true
}
