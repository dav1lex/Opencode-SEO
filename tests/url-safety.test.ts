import { describe, expect, test } from "bun:test"
import { validateTargetUrl } from "../.opencode/lib/url-safety"

const publicDns = async () => [{ address: "93.184.216.34", family: 4 }]

describe("validateTargetUrl", () => {
  test("accepts and normalizes a public HTTPS URL", async () => {
    expect(await validateTargetUrl("https://example.com/path", publicDns)).toBe(
      "https://example.com/path",
    )
  })

  for (const target of [
    "file:///etc/passwd",
    "http://localhost",
    "http://127.0.0.1",
    "http://10.0.0.1",
    "http://169.254.169.254",
    "http://[::1]",
    "http://user:pass@example.com",
  ]) {
    test(`blocks ${target}`, async () => {
      expect(validateTargetUrl(target, publicDns)).rejects.toBeInstanceOf(Error)
    })
  }

  test("blocks a hostname when any DNS answer is private", async () => {
    const mixedDns = async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "192.168.1.2", family: 4 },
    ]
    expect(validateTargetUrl("https://example.com", mixedDns)).rejects.toThrow(
      "blocked network",
    )
  })
})
