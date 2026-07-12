# Structured-data rules

- `SCHEMA-PARSE`: Structured-data block does not parse. High maximum.
- `SCHEMA-REQUIRED`: Required property for a documented Google feature is absent. High maximum. Name the feature and exact required property.
- `SCHEMA-ENTITY-LINK`: `@id` reference has no matching entity or creates contradictory identity. Medium maximum.
- `SCHEMA-CONTENT-MISMATCH`: Markup materially disagrees with visible page content or advertises unavailable functionality. High maximum.
- `SCHEMA-DEPRECATED`: Markup targets a retired or unsupported Google feature and creates misleading expectations. Medium maximum.
- `SCHEMA-SEARCH-ACTION`: SearchAction points to unverified or unavailable search behavior. Medium maximum.
- `SCHEMA-SELF-RATING`: The site marks up `aggregateRating` or `Review` for its own Organization, LocalBusiness, or Product. Medium maximum. Google's structured-data policy prohibits self-serving review markup, and it is ineligible for rich results regardless of review count. Evidence must name the entity and the rating property.

Current constraints:

- FAQ rich results stopped appearing 2026-05-07; Google removed documentation 2026-06-15. Existing accurate FAQPage may remain, but no SERP benefit may be claimed.
- Sitelinks search box was removed in 2024. SearchAction has no sitelinks-search-box benefit.
- LocalBusiness required properties are `name` and `address`. Telephone, geo, opening hours, and other properties are recommended, not required.
- Do not recommend self-serving Review or AggregateRating markup for business's own reviews.
- Service schema is not a Google rich-result feature. Treat it only as optional semantics.
- Repeated descriptions and short `sameAs` arrays are not defects.
- `SCHEMA-CROSS-PAGE-CONFLICT`: Multiple pages define the same entity type with contradictory core properties (different identifiers, divergent descriptions, conflicting addresses). High maximum. Category `schema`.
- `SCHEMA-MISSING-CLASS`: A page type commonly structured (article, product, local business) has no JSON-LD while sibling pages of the same type embed it. Low maximum. Category `schema`.

List optional enhancements separately from findings. They do not enter findings validation.
