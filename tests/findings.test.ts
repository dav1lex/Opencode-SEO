import { expect, test } from "bun:test"
import { validateFindings } from "../.opencode/lib/findings"

const finding = {
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
