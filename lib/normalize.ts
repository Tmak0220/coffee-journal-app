export const toNullString = (v?: string | null) => {
    if (!v) return null
    const t = v.trim()
    return t === "" ? null : t.toLowerCase()
  }