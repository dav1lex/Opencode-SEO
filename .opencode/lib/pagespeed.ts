import { validateTargetUrl } from "./url-safety"

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

// PSI embeds CrUX field data in `loadingExperience`, so one keyless call returns
// both lab (Lighthouse) and field (CrUX p75) data. No separate CrUX request.
const FIELD_METRICS = {
  LARGEST_CONTENTFUL_PAINT_MS: "LCP",
  INTERACTION_TO_NEXT_PAINT: "INP",
  CUMULATIVE_LAYOUT_SHIFT_SCORE: "CLS",
  EXPERIMENTAL_TIME_TO_FIRST_BYTE: "TTFB",
} as const

const LAB_AUDITS = {
  "largest-contentful-paint": "LCP",
  "cumulative-layout-shift": "CLS",
  "total-blocking-time": "TBT",
  "speed-index": "SI",
  "first-contentful-paint": "FCP",
} as const

export type Metric = { metric: string; p75: number; category: string }
export type LabMetric = { metric: string; value: number; displayValue: string | null }

export type PagespeedEvidence = {
  url: string
  strategy: "mobile" | "desktop"
  source: "PageSpeed Insights v5"
  field: { source: "url" | "origin"; metrics: Metric[] } | null
  lab: { performanceScore: number | null; metrics: LabMetric[] }
}

export async function fetchPagespeed(
  target: string,
  strategy: "mobile" | "desktop" = "mobile",
  apiKey = process.env.GOOGLE_API_KEY,
): Promise<PagespeedEvidence> {
  const url = await validateTargetUrl(target)
  const query = new URLSearchParams({ url, strategy, category: "PERFORMANCE" })
  if (apiKey) query.set("key", apiKey)

  const response = await fetch(`${PSI_ENDPOINT}?${query}`)
  const payload = (await response.json()) as any
  if (!response.ok) {
    const reason = payload?.error?.message ?? String(response.status)
    // The keyless tier draws on a shared quota that is routinely exhausted.
    throw new Error(
      apiKey
        ? `PageSpeed Insights failed: ${reason}`
        : `PageSpeed Insights failed without an API key: ${reason}. Set GOOGLE_API_KEY (free, 25k queries/day) and retry.`,
    )
  }

  // `loadingExperience` is this URL's own CrUX record; `originLoadingExperience`
  // is the whole origin's. Prefer URL-level, fall back to origin, else no field data.
  const experience = payload.loadingExperience?.metrics
    ? { source: "url" as const, data: payload.loadingExperience }
    : payload.originLoadingExperience?.metrics
      ? { source: "origin" as const, data: payload.originLoadingExperience }
      : null

  const field = experience
    ? {
        source: experience.source,
        metrics: Object.entries(FIELD_METRICS).flatMap(([key, metric]) => {
          const entry = experience.data.metrics[key]
          return entry?.percentile === undefined
            ? []
            : [{ metric, p75: entry.percentile, category: entry.category }]
        }),
      }
    : null

  const audits = payload.lighthouseResult?.audits ?? {}
  return {
    url,
    strategy,
    source: "PageSpeed Insights v5",
    field,
    lab: {
      performanceScore: payload.lighthouseResult?.categories?.performance?.score ?? null,
      metrics: Object.entries(LAB_AUDITS).flatMap(([key, metric]) => {
        const audit = audits[key]
        return audit?.numericValue === undefined
          ? []
          : [{ metric, value: audit.numericValue, displayValue: audit.displayValue ?? null }]
      }),
    },
  }
}
