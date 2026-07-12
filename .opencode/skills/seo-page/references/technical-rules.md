# Technical rules

- `TECH-INDEX-CONFLICT`: Collected robots metadata or response header blocks intended indexing. Critical maximum.
- `TECH-META-MISSING`: Title, description, canonical, language, or viewport is absent when needed for page interpretation. High maximum. Absence alone must have concrete impact.
- `TECH-CANON-CONFLICT`: Canonical points to a materially different page or hostname without supporting evidence. High maximum. Ignore root trailing-slash normalization.
- `TECH-RENDER-FAIL`: Main content or navigation failed to render, or required resources failed. High maximum.
- `TECH-HEADING-CLARITY`: Heading structure materially obscures page hierarchy. Low maximum. Multiple H1 elements alone do not qualify.
- `TECH-IMAGE-ALT`: Meaningful image lacks useful text alternative, or decorative image has noisy alternative text. Medium maximum.
- `TECH-ACCESSIBILITY`: Collected accessibility tree shows an interactive control without usable role or name. Medium maximum.
- `TECH-CONSOLE-ERROR`: Captured console or network failure affects page content or interaction. High maximum.
- `TECH-PERFORMANCE-MEASURED`: Lab or field data shows a performance failure. High maximum. Navigation timing alone is not CWV evidence.
- `TECH-LINK-ANCHOR-GENERIC`: Internal links use generic, non-descriptive anchor text (e.g., "click here", "read more", "here"). Low maximum. Separate enhancements from findings: report count as evidence, flag only when generic anchors form primary navigation for key pages.
- `TECH-LINK-ANCHOR-CONFLICT`: Same anchor text points to different internal destinations, creating navigation ambiguity. Low maximum.
- `TECH-META-MEANINGLESS`: Title or description provides no useful descriptive content (e.g., "Home", "Untitled", empty, identical to domain name). Medium maximum. Length alone is not meaningfulness. Default values injected by a CMS count as meaningless.
- `TECH-ROBOTS-BLOCK`: robots.txt blocks the audited page or critical resources from crawling. High maximum. Absent robots.txt is default allow, not a defect.
- `TECH-PERFORMANCE-OUTLIER`: A page has TTFB, transfer size, or decoded body size significantly higher (>3×) than the site median. Medium maximum. Evidence must include the outlier value and median.
- `TECH-REDIRECT-CHAIN`: Collected redirect chain has more than one hop, or crosses hostname or protocol before resolving. Medium maximum. Evidence must list each hop and status. A single HTTP-to-HTTPS or trailing-slash hop is not a defect.
- `TECH-JS-DEPENDENT`: Server HTML carries little or no main content, and the content appears only after JavaScript execution. Medium maximum. Evidence must compare collected raw HTML text length against rendered DOM text length. Rendering is supported but delayed and budgeted; report the dependency, never claim the page will not be indexed.
- `TECH-IMAGE-DIMENSIONS`: A visible image reserves no space before it loads, so its arrival shifts the layout. Medium maximum. Use the collected `reservesSpace` field: it is false only when the image has neither a `width`/`height` attribute pair nor a computed CSS `aspect-ratio`. Evidence must name the image and its rendered box. Report the shift; cite CLS only when `page-performance.json` measured it.
- `TECH-IMAGE-LAZY-LCP`: An image rendered above the fold carries `loading="lazy"`, which defers the request that the initial viewport is waiting on. Medium maximum. Use the collected `aboveFold` and `attributes.loading` fields. Below-the-fold lazy loading is correct and never a finding.
- `TECH-IMAGE-WEIGHT`: A single image transfers an unreasonable number of bytes for its rendered size. Medium maximum. Evidence must cite the collected `transferSize` in bytes and the rendered box. A `transferSize` of `null` means the browser did not report it (cache hit, or a cross-origin response with no `Timing-Allow-Origin` header) — that is unknown, not small, and must not be reported as a finding.
- `TECH-SOCIAL-PREVIEW`: Open Graph or Twitter Card metadata is absent or incomplete, so shared links render without a title, description, or image. Low maximum. This affects link previews, not search ranking; never claim otherwise.
- `HREFLANG-SELF-MISSING`: Page has hreflang tags but omits a self-referencing entry or `x-default`. Medium maximum. Without self-reference, language targeting is incomplete.
- `HREFLANG-RETURN-MISSING`: A hreflang target page does not link back to the source page (missing return tag). Medium maximum. Requires multi-page evidence.
- `HREFLANG-CANONICAL-MISMATCH`: Hreflang URL points to a page whose canonical differs from the referenced URL. Medium maximum. Requires multi-page evidence.

Passed checks may mention HTTP status, response headers, redirect chain, rendered content, metadata, social cards, language, and console state. Do not convert defaults or unmeasured risks into findings.

`TECH-INDEX-CONFLICT` covers an `X-Robots-Tag` response header carrying `noindex` or `none`; `TECH-CANON-CONFLICT` covers a `Link: rel="canonical"` response header that disagrees with the page. Both live in `page-http.json`. A response header outranks the equivalent meta tag when the two disagree; say so in evidence.

`TECH-PERFORMANCE-MEASURED` accepts only `page-performance.json` (PageSpeed Insights). Field data is CrUX p75 from real Chrome users; lab data is Lighthouse. Low-traffic pages have no field data and `field` is `null` — that is not a defect, and lab data alone must be labelled as lab.
