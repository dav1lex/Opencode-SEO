import { validateTargetUrl } from "./url-safety"

const CONCURRENCY = 8
const TIMEOUT_MS = 15_000
const USER_AGENT = "opencode-seo/1.0 (+https://github.com/dav1lex/opencode-seo)"

export type LinkStatus = {
  url: string
  status: number | null
  error?: string
  redirectedTo?: string
}

/**
 * Requests each internal link the page actually contains.
 *
 * Collecting 500 links and never asking whether any of them resolve was the biggest blind
 * spot left: a broken nav link is a plain defect, and the only reason `/blog` ever surfaced
 * on titancode.pl was that the browser happened to prefetch it.
 *
 * HEAD first, because it is cheap. Servers that reject HEAD (405/501) get a GET retry —
 * treating "this server dislikes HEAD" as "this page is broken" would be a false positive.
 */
export async function checkLinks(urls: string[], limit = 100): Promise<LinkStatus[]> {
  const unique = [...new Set(urls)].slice(0, limit)
  const results: LinkStatus[] = []

  for (let start = 0; start < unique.length; start += CONCURRENCY) {
    const batch = unique.slice(start, start + CONCURRENCY)
    results.push(...(await Promise.all(batch.map(checkOne))))
  }
  return results
}

async function checkOne(url: string): Promise<LinkStatus> {
  let safe: string
  try {
    safe = await validateTargetUrl(url)
  } catch (error) {
    return { url, status: null, error: error instanceof Error ? error.message : String(error) }
  }

  const request = (method: string) =>
    fetch(safe, {
      method,
      redirect: "follow",
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

  try {
    let response = await request("HEAD")
    if (response.status === 405 || response.status === 501) response = await request("GET")

    return {
      url,
      status: response.status,
      ...(response.url && response.url !== safe ? { redirectedTo: response.url } : {}),
    }
  } catch (error) {
    return { url, status: null, error: error instanceof Error ? error.message : String(error) }
  }
}
