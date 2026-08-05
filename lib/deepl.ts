import "server-only"

type DeepLResponse = { translations?: Array<{ text: string }> }

export async function translateJapaneseTexts(values: string[]): Promise<string[]> {
  const key = process.env.DEEPL_API_KEY
  if (!key) throw new Error("DEEPL_API_KEY is not configured")

  const baseUrl = (process.env.DEEPL_API_BASE_URL || "https://api-free.deepl.com").replace(/\/$/, "")
  const translated = new Array<string>(values.length)
  const groups = [false, true].map(isHtml => values
    .map((text, index) => ({ text, index }))
    .filter(item => /<\/?[a-z][\s\S]*>/i.test(item.text) === isHtml))

  for (const group of groups) {
    for (let start = 0; start < group.length; start += 50) {
      const batch = group.slice(start, start + 50)
      const isHtml = /<\/?[a-z][\s\S]*>/i.test(batch[0]?.text || "")
      const response = await fetch(`${baseUrl}/v2/translate`, {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: batch.map(item => item.text),
          source_lang: "JA",
          target_lang: "EN-US",
          preserve_formatting: true,
          ...(isHtml ? { tag_handling: "html" } : {}),
        }),
        cache: "no-store",
      })

      const body = (await response.json().catch(() => ({}))) as DeepLResponse & { message?: string }
      if (!response.ok) throw new Error(body.message || `DeepL request failed (${response.status})`)
      if (!body.translations || body.translations.length !== batch.length) {
        throw new Error("DeepL returned an unexpected number of translations")
      }
      body.translations.forEach((item, index) => { translated[batch[index].index] = item.text })
    }
  }
  return translated
}

export async function translateOptionalFields<T extends Record<string, unknown>>(
  source: T,
  fields: Array<keyof T>,
): Promise<T> {
  const targets = fields.filter(field => typeof source[field] === "string" && String(source[field]).trim())
  if (!targets.length) return { ...source }
  const translated = await translateJapaneseTexts(targets.map(field => String(source[field])))
  const result = { ...source }
  targets.forEach((field, index) => { result[field] = translated[index] as T[keyof T] })
  return result
}

export async function translateJsonStrings(value: unknown): Promise<unknown> {
  const paths: Array<Array<string | number>> = []
  const texts: string[] = []
  const clone = structuredClone(value)

  const visit = (item: unknown, path: Array<string | number>) => {
    if (typeof item === "string" && item.trim() && !/^https?:\/\//i.test(item) && !/^\d+(?::\d+)?(?:\s*(?:°C|rpm|%|g|kg|ppm|mg\/L))?$/i.test(item.trim())) {
      paths.push(path); texts.push(item)
      return
    }
    if (Array.isArray(item)) item.forEach((child, index) => visit(child, [...path, index]))
    else if (item && typeof item === "object") Object.entries(item).forEach(([key, child]) => visit(child, [...path, key]))
  }
  visit(clone, [])
  if (!texts.length) return clone
  const translated = await translateJapaneseTexts(texts)
  paths.forEach((path, index) => {
    let cursor: any = clone
    path.slice(0, -1).forEach(part => { cursor = cursor[part] })
    cursor[path[path.length - 1]] = translated[index]
  })
  return clone
}
