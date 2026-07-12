import { lookup } from "node:dns/promises"
import { BlockList, isIP } from "node:net"

type Address = { address: string; family: number }
type Resolver = (hostname: string) => Promise<Address[]>

const blockedIpv4 = new BlockList()
const blockedIpv6 = new BlockList()

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) blockedIpv4.addSubnet(network, prefix, "ipv4")

for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) blockedIpv6.addSubnet(network, prefix, "ipv6")

const resolveAll: Resolver = async (hostname) =>
  lookup(hostname, { all: true, verbatim: true })

export async function validateTargetUrl(
  raw: string,
  resolver: Resolver = resolveAll,
): Promise<string> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error("Target must be a valid absolute URL")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("Target must use HTTP or HTTPS")
  if (url.username || url.password)
    throw new Error("Target URL must not contain credentials")

  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "")
  if (!hostname || hostname.toLowerCase() === "localhost" || hostname.toLowerCase().endsWith(".localhost"))
    throw new Error("Local targets are blocked")

  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await resolver(hostname)

  if (!addresses.length) throw new Error("Target hostname did not resolve")
  for (const { address, family } of addresses) {
    const type = family === 4 ? "ipv4" : family === 6 ? "ipv6" : undefined
    if (
      !type ||
      (type === "ipv4"
        ? blockedIpv4.check(address, type)
        : blockedIpv6.check(address, type))
    )
      throw new Error("Target resolves to a blocked network")
  }

  url.hostname = hostname
  return url.toString()
}
