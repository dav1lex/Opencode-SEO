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
    technical: "technical-rules.md",
    content: "content-rules.md",
    schema: "schema-rules.md",
  }
  const documented = Object.entries(files).flatMap(([category, file]) =>
    [
      ...readFileSync(
        new URL(
          `../.opencode/skills/seo-page/references/${file}`,
          import.meta.url,
        ),
        "utf8",
      ).matchAll(
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
