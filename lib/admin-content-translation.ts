import "server-only"
import { randomUUID } from "crypto"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { translateJsonStrings, translateOptionalFields } from "@/lib/deepl"

export type TranslatableResource = "posts" | "blogs" | "pro_recipes" | "admin_journals"

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const omitGenerated = (row: Record<string, any>, foreignKey?: string) => {
  const copy = { ...row }
  for (const key of ["id", "created_at", "updated_at"]) delete copy[key]
  if (foreignKey) delete copy[foreignKey]
  return copy
}

async function replaceChildren(db: SupabaseClient, table: string, foreignKey: string, sourceId: string, targetId: string, translateFields: string[] = [], jsonFields: string[] = []) {
  const { data, error } = await db.from(table).select("*").eq(foreignKey, sourceId)
  if (error) throw error
  const { error: deleteError } = await db.from(table).delete().eq(foreignKey, targetId)
  if (deleteError) throw deleteError
  if (!data?.length) return
  const rows = []
  for (const row of data) {
    const translated = translateFields.length ? await translateOptionalFields(row, translateFields) : { ...row }
    for (const field of jsonFields) {
      if (translated[field] != null) translated[field] = await translateJsonStrings(translated[field])
    }
    rows.push({ ...omitGenerated(translated, foreignKey), [foreignKey]: targetId })
  }
  const { error: insertError } = await db.from(table).insert(rows)
  if (insertError) throw insertError
}

async function translatedPayload(resource: TranslatableResource, row: Record<string, any>) {
  if (resource === "posts") return translateOptionalFields(row, ["title", "description", "tastes"])
  if (resource === "blogs") return translateOptionalFields(row, ["title", "content"])
  if (resource === "admin_journals") return translateOptionalFields(row, ["title", "content"])

  const result = await translateOptionalFields(row, [
    "recipe_title", "bean_name", "water_name", "minerals", "log_purpose", "log_process",
    "log_conclusion", "grind_size",
  ])
  for (const field of ["selected_variables", "pour_steps", "water_profile", "roast_profile", "cupping_profile", "verification_patterns"]) {
    if (result[field] != null) result[field] = await translateJsonStrings(result[field])
  }
  return result
}

export async function translateAdminResource(resource: TranslatableResource, id: string) {
  const db = admin()
  const { data: source, error } = await db.from(resource).select("*").eq("id", id).maybeSingle()
  if (error) throw error
  if (!source) throw new Error("Translation source was not found")
  if (source.lang !== "ja") throw new Error("Only Japanese content can be translated")

  const groupId = source.translation_group_id || randomUUID()
  if (!source.translation_group_id) {
    const { error: groupError } = await db.from(resource).update({ translation_group_id: groupId }).eq("id", id)
    if (groupError) throw groupError
  }

  const { data: existing, error: existingError } = await db.from(resource)
    .select("id").eq("translation_group_id", groupId).eq("lang", "en").maybeSingle()
  if (existingError) throw existingError

  const translated = await translatedPayload(resource, source)
  // A translated record is another language representation of the same publication,
  // not a newly published item. Keep the source publication date on both versions.
  const payload = {
    ...omitGenerated(translated),
    created_at: source.created_at,
    lang: "en",
    translation_group_id: groupId,
  }
  const saved = existing
    ? await db.from(resource).update(payload).eq("id", existing.id).select("id").single()
    : await db.from(resource).insert(payload).select("id").single()
  if (saved.error) throw saved.error
  const targetId = saved.data.id as string

  if (resource === "posts") {
    await replaceChildren(db, "post_varieties", "post_id", id, targetId)
    await replaceChildren(db, "post_processes", "post_id", id, targetId)
    await replaceChildren(db, "post_tastes", "post_id", id, targetId)
    await replaceChildren(db, "post_gears", "post_id", id, targetId, ["grind_setting", "comment"])
    await replaceChildren(db, "recipes", "post_id", id, targetId, ["bean_name", "grind_size", "notes", "shop_name", "serving_style"], ["pour_steps"])
    await replaceChildren(db, "origin_post_links", "post_id", id, targetId)
    await replaceChildren(db, "expert_post_links", "post_id", id, targetId)
  } else if (resource === "pro_recipes") {
    await replaceChildren(db, "pro_recipe_gears", "pro_recipe_id", id, targetId)
  }
  return { sourceId: id, translatedId: targetId, groupId, updated: Boolean(existing) }
}

export async function isAdminUser(userId: string) {
  const { data } = await admin().from("users").select("role").eq("id", userId).maybeSingle()
  return data?.role === "admin"
}

export async function resolveLocalizedResource(
  resource: TranslatableResource,
  id: string,
  lang: "ja" | "en",
) {
  const db = admin()
  const { data: requested, error } = await db.from(resource).select("*").eq("id", id).maybeSingle()
  if (error) throw error
  if (!requested) return null
  if (requested.lang === lang || !requested.translation_group_id) return requested

  const { data: localized, error: localizedError } = await db
    .from(resource)
    .select("*")
    .eq("translation_group_id", requested.translation_group_id)
    .eq("lang", lang)
    .maybeSingle()
  if (localizedError) throw localizedError
  return localized || requested
}
