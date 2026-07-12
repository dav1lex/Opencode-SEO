import { afterEach, expect, test } from "bun:test"
import { fetchHttpEvidence } from "../.opencode/lib/http"

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

type Stub = { status: number; headers?: Record<string, string>; body?: string }

function stubFetch(routes: Record<string, Stub>) {
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input)
    const route = routes[url]
    if (!route) throw new Error(`Unexpected fetch: ${url}`)
    return new Response(route.body ?? "", {
      status: route.status,
      headers: route.headers,
    })
  }) as typeof fetch
}

test("captures status, X-Robots-Tag, and Link header", async () => {
  stubFetch({
    "https://example.com/": {
      status: 200,
      headers: {
        "x-robots-tag": "noindex, nofollow",
        link: '<https://example.com/canonical>; rel="canonical"',
        "content-type": "text/html; charset=utf-8",
      },
      body: "<html><body><p>Server rendered content here.</p></body></html>",
    },
  })

  const evidence = await fetchHttpEvidence("https://example.com/")
  expect(evidence.status).toBe(200)
  expect(evidence.indexing.xRobotsTag).toBe("noindex, nofollow")
  expect(evidence.indexing.linkHeader).toBe('<https://example.com/canonical>; rel="canonical"')
  expect(evidence.redirectChain).toEqual([])
  expect(evidence.raw.shellDetected).toBe(false)
  expect(evidence.raw.textLength).toBeGreaterThan(0)
})

test("parses only rel=canonical out of a mixed Link header", async () => {
  stubFetch({
    "https://example.com/": {
      status: 200,
      headers: {
        link: '<https://fonts.googleapis.com>; rel="preconnect", </real-canonical>; rel="canonical"',
      },
      body: "<html><body>ok</body></html>",
    },
  })

  const evidence = await fetchHttpEvidence("https://example.com/")
  expect(evidence.indexing.canonicalFromHeader).toBe("https://example.com/real-canonical")
})

test("a preconnect-only Link header yields no canonical", async () => {
  stubFetch({
    "https://example.com/": {
      status: 200,
      headers: { link: '<https://fonts.googleapis.com>; rel="preconnect"' },
      body: "<html><body>ok</body></html>",
    },
  })

  const evidence = await fetchHttpEvidence("https://example.com/")
  expect(evidence.indexing.canonicalFromHeader).toBeNull()
})

test("follows and records the redirect chain", async () => {
  stubFetch({
    "https://example.com/old": {
      status: 301,
      headers: { location: "https://example.com/new" },
    },
    "https://example.com/new": { status: 200, body: "<html><body>ok</body></html>" },
  })

  const evidence = await fetchHttpEvidence("https://example.com/old")
  expect(evidence.finalUrl).toBe("https://example.com/new")
  expect(evidence.status).toBe(200)
  expect(evidence.redirectChain).toEqual([
    { url: "https://example.com/old", status: 301, location: "https://example.com/new" },
  ])
})

test("blocks a redirect into a private network", async () => {
  stubFetch({
    "https://example.com/ssrf": {
      status: 302,
      headers: { location: "http://169.254.169.254/latest/meta-data/" },
    },
  })

  expect(fetchHttpEvidence("https://example.com/ssrf")).rejects.toThrow(
    "Target resolves to a blocked network",
  )
})

test("detects a hydration shell as JS-dependent", async () => {
  stubFetch({
    "https://example.com/spa": {
      status: 200,
      body: '<html><body><div id="__next"></div><script src="/app.js"></script></body></html>',
    },
  })

  const evidence = await fetchHttpEvidence("https://example.com/spa")
  expect(evidence.raw.shellDetected).toBe(true)
  expect(evidence.raw.textLength).toBe(0)
})

test("rejects an endless redirect loop", async () => {
  stubFetch({
    "https://example.com/loop": {
      status: 302,
      headers: { location: "https://example.com/loop" },
    },
  })

  expect(fetchHttpEvidence("https://example.com/loop")).rejects.toThrow(
    "Redirect chain exceeded 10 hops",
  )
})
