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
- `HREFLANG-SELF-MISSING`: Page has hreflang tags but omits a self-referencing entry or `x-default`. Medium maximum. Without self-reference, language targeting is incomplete.
- `HREFLANG-RETURN-MISSING`: A hreflang target page does not link back to the source page (missing return tag). Medium maximum. Requires multi-page evidence.
- `HREFLANG-CANONICAL-MISMATCH`: Hreflang URL points to a page whose canonical differs from the referenced URL. Medium maximum. Requires multi-page evidence.

Passed checks may mention HTTP status, rendered content, metadata, social cards, language, and console state. Do not convert defaults or unmeasured risks into findings.
