import { expect, test } from "bun:test"
import { rules, validateFindings } from "../.opencode/lib/findings"
import { readFileSync } from "node:fs"

const finding = {
  rule: "TECH-META-MISSING",
  category: "technical",
  issue: "Missing canonical",
  evidence: "No canonical link was collected",
  impact: "Duplicate URL signals may split",
  fix: "Add one canonical link",
  priority: "high",
  confidence: "high",
}

test("accepts complete findings", () => {
  expect(validateFindings([finding])).toEqual([finding])
})

test("rejects incomplete findings", () => {
  expect(() => validateFindings([{ ...finding, evidence: "" }])).toThrow(
    "non-empty evidence",
  )
})

test("rejects duplicate findings", () => {
  expect(() => validateFindings([finding, finding])).toThrow("duplicates")
})

test("rejects priority above rule maximum", () => {
  expect(() =>
    validateFindings([
      { ...finding, rule: "TECH-HEADING-CLARITY", priority: "high" },
    ]),
  ).toThrow("exceeds rule priority")
})

test("rejects unmeasured performance claims", () => {
  expect(() =>
    validateFindings([{ ...finding, issue: "Possible CLS problem" }]),
  ).toThrow("unmeasured performance")
})

test("rejects measured rule without metric source", () => {
  expect(() =>
    validateFindings([
      {
        ...finding,
        rule: "TECH-PERFORMANCE-MEASURED",
        issue: "LCP is slow",
        evidence: "LCP 4.2s",
      },
    ]),
  ).toThrow("lacks measured performance evidence")
})

test("rule references match validator registry", () => {
  const files = {
    technical: ["technical-rules.md", "../.opencode/skills/seo-page/references"],
    content: ["content-rules.md", "../.opencode/skills/seo-page/references"],
    schema: ["schema-rules.md", "../.opencode/skills/seo-page/references"],
    site: ["SKILL.md", "../.opencode/skills/seo-site"],
  }
  const documented = Object.entries(files).flatMap(([category, [file, base]]) =>
    [
      ...readFileSync(new URL(`${base}/${file}`, import.meta.url), "utf8").matchAll(
        /`([A-Z]+-[A-Z-]+)`:[^\n]+?(Critical|High|Medium|Low) maximum/gi,
      ),
    ].map((match) => [match[1], [category, match[2].toLowerCase()]]),
  )
  expect(Object.fromEntries(documented)).toEqual(rules)
})

test("rejects missing robots meta as a defect", () => {
  expect(() =>
    validateFindings([{ ...finding, issue: "Robots meta is missing" }]),
  ).toThrow("default robots behavior")
})

test("rejects arbitrary word-count findings", () => {
  expect(() =>
    validateFindings([
      {
        ...finding,
        rule: "CONTENT-DEPTH",
        category: "content",
        issue: "Thin content",
        evidence: "Page contains 900 words",
        priority: "medium",
      },
    ]),
  ).toThrow("content length")
})

test("rejects optional LocalBusiness fields as required", () => {
  expect(() =>
    validateFindings([
      {
        ...finding,
        rule: "SCHEMA-REQUIRED",
        category: "schema",
        issue: "LocalBusiness telephone is missing",
        evidence: "No telephone property",
      },
    ]),
  ).toThrow("recommended LocalBusiness")
})

test("two findings identical except for page both survive dedup", () => {
  const finding1 = {
    ...finding,
    page: "https://example.com/page1",
  }
  const finding2 = {
    ...finding,
    page: "https://example.com/page2",
  }
  expect(validateFindings([finding1, finding2])).toHaveLength(2)
})

test("TECH-ROBOTS-BLOCK finding about robots.txt Sitemap directive is accepted", () => {
  const result = validateFindings([
    {
      ...finding,
      rule: "TECH-ROBOTS-BLOCK",
      category: "technical",
      issue: "robots.txt is missing a Sitemap directive",
      evidence: "No Sitemap: line found",
      priority: "high",
    },
  ])
  expect(result).toHaveLength(1)
})

test("non-TECH-ROBOTS-BLOCK finding saying Robots meta is missing is rejected", () => {
  expect(() =>
    validateFindings([
      {
        ...finding,
        issue: "Robots meta is missing",
      },
    ]),
  ).toThrow("default robots behavior")
})

test("invalid target URL yields clear error message", () => {
  expect(() => validateFindings([finding], "not-a-url")).toThrow(
    "Validator target must be a valid absolute URL",
  )
})
