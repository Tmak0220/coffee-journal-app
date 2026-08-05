export async function requestAdminTranslation(resource: "posts" | "blogs" | "pro_recipes" | "admin_journals", id: string) {
  const response = await fetch("/api/admin/translations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource, id }),
  })
  if (response.status === 403) return { skipped: true }
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || "English translation could not be created")
  return body
}

export async function tryAdminTranslation(resource: "posts" | "blogs" | "pro_recipes" | "admin_journals", id: string) {
  try {
    return await requestAdminTranslation(resource, id)
  } catch (error) {
    // The Japanese record is already committed. Keep the post flow successful;
    // administrators can retry failed translations from the translation manager.
    console.error("Automatic English translation failed:", error)
    return { skipped: false, failed: true }
  }
}
