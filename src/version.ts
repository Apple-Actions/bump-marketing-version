function parseVersionParts(version: string): number[] | null {
  const parts = String(version)
    .split('.')
    .map(p => Number(p))
  if (!parts.length || parts.some(n => !Number.isInteger(n) || n < 0)) {
    return null
  }
  return parts
}

export function compareVersions(a: string, b: string): number {
  const pa = parseVersionParts(a)
  const pb = parseVersionParts(b)
  if (!pa || !pb) {
    return 0
  }
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na !== nb) {
      return na < nb ? -1 : 1
    }
  }
  return 0
}

/** One minor past the live App Store version (1 → 1.1, 1.2 → 1.3). */
export function nextMinor(version: string): string {
  const parts = parseVersionParts(version)
  if (!parts) {
    throw new Error(
      `MARKETING_VERSION is not a dotted integer version: ${version}`
    )
  }
  if (parts.length === 1) {
    return `${parts[0]}.1`
  }
  return `${parts[0]}.${parts[1] + 1}`
}

export function replaceMarketingVersion(
  contents: string,
  newVersion: string
): string {
  if (!/^MARKETING_VERSION\s*=/m.test(contents)) {
    throw new Error('file has no MARKETING_VERSION line')
  }
  const after = contents.replace(
    /^MARKETING_VERSION\s*=\s*.*$/m,
    `MARKETING_VERSION = ${newVersion}`
  )
  if (after === contents) {
    throw new Error(`MARKETING_VERSION already ${newVersion}`)
  }
  return after
}
