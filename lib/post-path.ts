const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i

export function decodePostPathSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function cleanPostPathSegment(value: unknown): string | null {
  if (typeof value !== "string") return null
  const cleaned = decodePostPathSegment(value).trim()
  return cleaned || null
}

export function extractPostId(segments: string[]): string {
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const match = decodePostPathSegment(segments[index]).match(UUID_PATTERN)
    if (match) return match[0]
  }
  return ""
}

export function buildPostPath(lang: string, segments: unknown[]): string {
  const cleaned = segments
    .map(cleanPostPathSegment)
    .filter((segment): segment is string => Boolean(segment))

  return `/${lang}/posts/${cleaned.map(encodeURIComponent).join("/")}`
}

export function isCanonicalPostPath(requested: string[], canonical: unknown[]): boolean {
  const requestedDecoded = requested.map(decodePostPathSegment)
  const requestedCleaned = requestedDecoded.map(segment => segment.trim()).filter(Boolean)
  const canonicalCleaned = canonical
    .map(cleanPostPathSegment)
    .filter((segment): segment is string => Boolean(segment))
  const containsUntrimmedSegment = requestedDecoded.some(
    (segment, index) => segment !== segment.trim() || /%0[ad]/i.test(requested[index]),
  )

  return !containsUntrimmedSegment
    && requestedCleaned.length === canonicalCleaned.length
    && requestedCleaned.every((segment, index) => segment === canonicalCleaned[index])
}
