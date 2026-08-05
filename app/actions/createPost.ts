"use server"

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerSupabaseClient } from "@/lib/supabase-server"
import { S3Client, CopyObjectCommand, DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { isAdminUser, translateAdminResource } from "@/lib/admin-content-translation"

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function serverMoveToPermanentStorage(tmpUrl: string): Promise<string> {
  if (!tmpUrl || !tmpUrl.includes("/tmp/")) return tmpUrl

  try {
    const urlObj = new URL(tmpUrl)
    const srcKey = decodeURIComponent(urlObj.pathname.slice(1)) 

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0") 

    const destKey = srcKey.replace(/^tmp\/([^/]+)\/(.+)$/, `uploads/$1/${year}/${month}/$2`)

    await r2.send(
      new CopyObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        CopySource: `${process.env.R2_BUCKET_NAME}/${srcKey}`,
        Key: destKey,
      })
    )

    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: srcKey,
      })
    )

    const baseUrl = (
      process.env.R2_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_R2_PUBLIC_URL
    )?.replace(/\/$/, "")

    if (!baseUrl) {
      throw new Error("R2 public URL is not configured")
    }

    return `${baseUrl}/${destKey}`
  } catch (err) {
    console.error(`Failed to move file to permanent storage: ${tmpUrl}`, err)
    throw new Error("画像を一時保存領域から本保存領域へ移動できませんでした。")
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeOriginId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isInteger(parsed) ? parsed : null
}

function parseDurationSeconds(value: unknown): number | null {
  const text = String(value ?? "").trim()
  if (!text) return null

  if (/^\d+(?:\.\d+)?$/.test(text)) {
    return Math.round(Number(text))
  }

  const colonMatch = text.match(/^(\d+):(\d{1,2})$/)
  if (colonMatch) {
    return Number(colonMatch[1]) * 60 + Number(colonMatch[2])
  }

  const minutes = text.match(/(\d+(?:\.\d+)?)\s*(?:分|min(?:ute)?s?)/i)
  const seconds = text.match(/(\d+(?:\.\d+)?)\s*(?:秒|sec(?:ond)?s?|s)\b/i)
  if (minutes || seconds) {
    return Math.round(
      Number(minutes?.[1] || 0) * 60 +
      Number(seconds?.[1] || 0)
    )
  }

  return null
}

async function syncOriginPostLinks(supabaseAdmin: any, postId: string) {
  const [{ data: post, error: postError }, { data: recipeRows, error: recipeError }] = await Promise.all([
    supabaseAdmin
      .from("posts")
      .select("user_id, source_origin_id, market_origin_id, event_origin_id")
      .eq("id", postId)
      .single(),
    supabaseAdmin
      .from("recipes")
      .select("shop_origin_id, barista_user_id")
      .eq("post_id", postId)
      .or("shop_origin_id.not.is.null,barista_user_id.not.is.null"),
  ])
  if (postError) throw postError
  if (recipeError) throw recipeError

  const originIds = Array.from(new Set<number>([
    post.source_origin_id,
    post.market_origin_id,
    post.event_origin_id,
    ...(recipeRows || []).map((recipe: any) => recipe.shop_origin_id),
  ].map(normalizeOriginId).filter((id): id is number => id !== null)))

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("origin_post_links")
    .select("origin_id")
    .eq("post_id", postId)
  if (existingError) throw existingError

  const existingIds = new Set<number>((existing || []).map((link: any) => link.origin_id))
  const missingIds = originIds.filter((originId) => !existingIds.has(originId))

  if (missingIds.length > 0) {
    const { data: origins, error: originError } = await supabaseAdmin
      .from("origins")
      .select("id, user_id, linked_posts_mode")
      .in("id", missingIds)
    if (originError) throw originError

    const { error: insertError } = await supabaseAdmin
      .from("origin_post_links")
      .insert((origins || []).map((origin: any) => ({
        origin_id: origin.id,
        post_id: postId,
        display_status: origin.user_id && origin.user_id !== post.user_id && origin.linked_posts_mode === "review"
          ? "pending"
          : "approved",
      })))
    if (insertError) throw insertError
  }

  if (originIds.length > 0) {
    const { data: ownedOrigins, error: ownedOriginError } = await supabaseAdmin
      .from("origins")
      .select("id")
      .eq("user_id", post.user_id)
      .in("id", originIds)
    if (ownedOriginError) throw ownedOriginError

    const ownedOriginIds = (ownedOrigins || []).map((origin: any) => origin.id)
    if (ownedOriginIds.length > 0) {
      const { error: approveOwnError } = await supabaseAdmin
        .from("origin_post_links")
        .update({ display_status: "approved", updated_at: new Date().toISOString() })
        .eq("post_id", postId)
        .in("origin_id", ownedOriginIds)
      if (approveOwnError) throw approveOwnError
    }
  }

  const staleIds = Array.from(existingIds).filter((originId) => !originIds.includes(originId))
  if (staleIds.length > 0) {
    const { error: deleteError } = await supabaseAdmin
      .from("origin_post_links")
      .delete()
      .eq("post_id", postId)
      .in("origin_id", staleIds)
    if (deleteError) throw deleteError
  }

  const expertUserIds = Array.from(new Set<string>(
    (recipeRows || [])
      .map((recipe: any) => recipe.barista_user_id)
      .filter((id: unknown): id is string => typeof id === "string" && uuidPattern.test(id))
  ))
  const { data: existingExpertLinks, error: existingExpertError } = await supabaseAdmin
    .from("expert_post_links")
    .select("expert_user_id")
    .eq("post_id", postId)
  if (existingExpertError) throw existingExpertError

  const existingExpertIds = new Set<string>(
    (existingExpertLinks || []).map((link: any) => link.expert_user_id)
  )
  const missingExpertIds = expertUserIds.filter((id) => !existingExpertIds.has(id))
  if (missingExpertIds.length > 0) {
    const { data: experts, error: expertError } = await supabaseAdmin
      .from("experts")
      .select("user_id, linked_posts_mode")
      .in("user_id", missingExpertIds)
    if (expertError) throw expertError

    const { error: insertExpertError } = await supabaseAdmin
      .from("expert_post_links")
      .insert((experts || []).map((expert: any) => ({
        expert_user_id: expert.user_id,
        post_id: postId,
        display_status:
          expert.user_id !== post.user_id && expert.linked_posts_mode === "review"
            ? "pending"
            : "approved",
      })))
    if (insertExpertError) throw insertExpertError
  }

  const staleExpertIds = Array.from(existingExpertIds).filter((id) => !expertUserIds.includes(id))
  if (staleExpertIds.length > 0) {
    const { error: deleteExpertError } = await supabaseAdmin
      .from("expert_post_links")
      .delete()
      .eq("post_id", postId)
      .in("expert_user_id", staleExpertIds)
    if (deleteExpertError) throw deleteExpertError
  }
}

export async function syncPostOriginLinksForOwner(postId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("ログインが必要です")

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const { data: post, error } = await supabaseAdmin
    .from("posts")
    .select("id, user_id")
    .eq("id", postId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) throw error
  if (!post) throw new Error("投稿を確認できませんでした")

  await syncOriginPostLinks(supabaseAdmin, post.id)
  return { success: true }
}

export async function createPost(input: any, userId: string) {
  try {
    if (!input.title?.trim()) throw new Error("タイトルは必須です")
    if (!input.tastes?.trim()) throw new Error("味わいは必須です")
    if (!input.imageUrls?.length) throw new Error("画像は1枚以上必要です")

    const incompleteRecipe = (input.recipe_data || []).find((recipe: any) => {
      if (!recipe || recipe.mode === "none") return false
      const hasEquipment = Array.isArray(recipe.gearIds) && recipe.gearIds.length > 0
      const hasNotes = Boolean(String(recipe.notes || "").trim())
      if (recipe.mode === "self") {
        return !(
          hasEquipment ||
          String(recipe.waterTemp || "").trim() ||
          String(recipe.grindSize || "").trim() ||
          String(recipe.ratio || "").trim() ||
          String(recipe.tdsInput || "").trim() ||
          String(recipe.bloomTime || "").trim() ||
          String(recipe.totalTime || "").trim() ||
          (Array.isArray(recipe.pourSteps) && recipe.pourSteps.some((step: any) =>
            String(step?.amount || "").trim() || String(step?.time || "").trim()
          )) ||
          hasNotes
        )
      }
      return !(
        hasEquipment ||
        String(recipe.baristaName || "").trim() ||
        String(recipe.baristaUserId || "").trim() ||
        String(recipe.shopName || "").trim() ||
        recipe.shopOriginId ||
        String(recipe.servingStyle || "").trim() ||
        hasNotes
      )
    })
    if (incompleteRecipe) {
      throw new Error("レシピには少なくとも1つの項目を入力してください")
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const currentUserId = userId
    if (!currentUserId) throw new Error("ユーザー認証に失敗しました")

    const permanentImageUrls = await Promise.all(
      input.imageUrls.map((url: string) => serverMoveToPermanentStorage(url))
    )

    const insertPayload = {
      user_id: currentUserId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      tastes: input.tastes?.trim() || null,
      image_urls: permanentImageUrls,
      visibility: input.visibility || "draft",
      lang: input.lang === "en" ? "en" : "ja",
      source_origin_id: normalizeOriginId(input.source_origin_id),
      market_origin_id: normalizeOriginId(input.market_origin_id),
      event_origin_id: normalizeOriginId(input.event_origin_id),
    }

    const { data: post, error: postError } = await supabaseAdmin
      .from("posts")
      .insert(insertPayload)
      .select()
      .single()

    if (postError) throw new Error(`投稿の保存に失敗しました: ${postError.message}`)

    if (input.variety_id) {
      const varietyIds = input.variety_id.split(",").map((id: string) => parseInt(id.trim(), 10)).filter(Boolean)
      if (varietyIds.length > 0) {
        const varietyPayload = varietyIds.map((vId: number) => ({
          post_id: post.id,
          variety_id: vId
        }))
        const { error: vError } = await supabaseAdmin.from("post_varieties").insert(varietyPayload)
        if (vError) console.error("post_varieties insert error:", vError.message)
      }
    }

    if (input.process_id) {
      const processIds = input.process_id.split(",").map((id: string) => parseInt(id.trim(), 10)).filter(Boolean)
      if (processIds.length > 0) {
        const processPayload = processIds.map((pId: number) => ({
          post_id: post.id,
          process_id: pId
        }))
        const { error: pError } = await supabaseAdmin.from("post_processes").insert(processPayload)
        if (pError) console.error("post_processes insert error:", pError.message)
      }
    }

    const gearIds = Array.from(new Set<number>(
      (input.recipe_data || [])
        .flatMap((recipe: any) => Array.isArray(recipe.gearIds) ? recipe.gearIds : [])
        .filter((gearId: unknown): gearId is number => Number.isInteger(gearId))
    ))
    if (gearIds.length > 0) {
      const { error: gearError } = await supabaseAdmin.from("post_gears").insert(
        gearIds.map(gearId => ({ post_id: post.id, gear_id: gearId }))
      )
      if (gearError) throw new Error(`器具の保存に失敗しました: ${gearError.message}`)
    }

    if (input.recipe_data && Array.isArray(input.recipe_data)) {
      for (const [recipeIndex, recipe] of input.recipe_data.entries()) {
        if (recipe.mode === "none") continue

        let expertDisplayStatus: "approved" | "pending" = "approved"
        if (recipe.baristaUserId && recipe.baristaUserId !== currentUserId) {
          const { data: linkedExpert } = await supabaseAdmin
            .from("experts")
            .select("linked_posts_mode")
            .eq("user_id", recipe.baristaUserId)
            .maybeSingle()
          expertDisplayStatus = linkedExpert?.linked_posts_mode === "review" ? "pending" : "approved"
        }

        const recipePayload = {
          post_id: post.id,
          user_id: currentUserId,
          bean_name: input.title.trim(),
          is_template: false,
          sort_order: recipeIndex,
          mode: recipe.mode || "none",
          temperature: recipe.waterTemp ? parseFloat(recipe.waterTemp) : null,
          grind_size: recipe.grindSize || null,
          brew_ratio: recipe.ratio ? parseFloat(recipe.ratio) : null,
          tds: recipe.tdsInput ? parseFloat(recipe.tdsInput) : null,
          bloom_time_seconds: parseDurationSeconds(recipe.bloomTime),
          total_time_seconds: parseDurationSeconds(recipe.totalTime),
          pour_steps: Array.isArray(recipe.pourSteps)
            ? recipe.pourSteps.filter((step: any) => step?.amount || step?.time)
            : [],
          notes: recipe.notes || null,
          shop_name: recipe.shopName || null,
          shop_origin_id: recipe.shopOriginId || null,
          serving_style: recipe.servingStyle || null,
          ...(recipe.baristaUserId ? {
            barista_user_id: recipe.baristaUserId,
            expert_display_status: expertDisplayStatus,
            expert_is_pinned: false,
          } : {})
        }

        const { error: recipeError } = await supabaseAdmin
          .from("recipes")
          .insert(recipePayload)

        if (recipeError) {
          console.error("Recipe insert error:", recipeError.message)
          await supabaseAdmin.from("posts").delete().eq("id", post.id)
          throw new Error(`抽出レシピの保存に失敗しました: ${recipeError.message}`)
        }
      }
    }

    if (input.flavor_tags && input.flavor_tags.length > 0) {
      const validTags = input.flavor_tags.filter((tagId: any) => typeof tagId === "string" && uuidPattern.test(tagId))

      if (validTags.length > 0) {
        const tagPayload = validTags.map((tagId: string) => ({
          post_id: post.id,
          taste_id: tagId,
        }))
        const { error: tagError = null } = await supabaseAdmin.from("post_tastes").insert(tagPayload)
        if (tagError) console.error("post_tastes insert error:", tagError.message)
      }
    }

    await syncOriginPostLinks(supabaseAdmin, post.id)

    if (insertPayload.lang === "ja" && await isAdminUser(currentUserId)) {
      try {
        await translateAdminResource("posts", post.id)
      } catch (translationError) {
        console.error("Admin English translation failed:", translationError)
      }
    }

    return post
  } catch (err: any) {
    console.error("CreatePost Error:", err.message)
    throw new Error(err.message)
  }
}

export async function updatePost(postId: string, input: any, userId: string) {
  try {
    console.log("=== UPDATE_POST START ===");
    if (!postId) throw new Error("ポストIDが指定されていません")
    
    if (!uuidPattern.test(postId)) {
      throw new Error(`フロントエンドから渡された postId が不正な形式です（UUIDではありません）: "${postId}"`)
    }

    if (!input.title?.trim()) throw new Error("タイトルは必須です")

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const permanentImageUrls = await Promise.all(
      input.imageUrls.map((url: string) => serverMoveToPermanentStorage(url))
    )

    const updatePayload = {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      image_urls: permanentImageUrls,
      visibility: input.visibility || "public",
      source_origin_id: normalizeOriginId(input.source_origin_id),
      market_origin_id: normalizeOriginId(input.market_origin_id),
      event_origin_id: normalizeOriginId(input.event_origin_id),
    }

    const { data: updatedPostData, error: updateError } = await supabaseAdmin
      .from("posts")
      .update(updatePayload)
      .eq("id", postId)
      .eq("user_id", userId) 
      .select()
      .single()

    if (updateError) {
      console.error("Supabase Update Error Detail:", updateError);
      throw new Error(`投稿の更新に失敗しました: ${updateError.message}`)
    }

    if (input.variety_id !== undefined) {
      await supabaseAdmin.from("post_varieties").delete().eq("post_id", postId)
      
      if (input.variety_id) {
        const varietyIds = input.variety_id.split(",").map((id: string) => parseInt(id.trim(), 10)).filter(Boolean)
        if (varietyIds.length > 0) {
          const varietyPayload = varietyIds.map((vId: number) => ({
            post_id: postId,
            variety_id: vId
          }))
          const { error: vError } = await supabaseAdmin.from("post_varieties").insert(varietyPayload)
          if (vError) throw new Error(`品種の更新に失敗しました: ${vError.message}`)
        }
      }
    }

    if (input.process_id !== undefined) {
      await supabaseAdmin.from("post_processes").delete().eq("post_id", postId)
      
      if (input.process_id) {
        const processIds = input.process_id.split(",").map((id: string) => parseInt(id.trim(), 10)).filter(Boolean)
        if (processIds.length > 0) {
          const processPayload = processIds.map((pId: number) => ({
            post_id: postId,
            process_id: pId
          }))
          const { error: pError } = await supabaseAdmin.from("post_processes").insert(processPayload)
          if (pError) throw new Error(`精製方法の更新に失敗しました: ${pError.message}`)
        }
      }
    }

    if (input.recipe_data !== undefined) {
      const { error: deleteGearsError } = await supabaseAdmin.from("post_gears").delete().eq("post_id", postId)
      if (deleteGearsError) throw new Error(`器具の更新準備に失敗しました: ${deleteGearsError.message}`)

      const gearIds = Array.from(new Set<number>(
        (input.recipe_data || [])
          .flatMap((recipe: any) => Array.isArray(recipe.gearIds) ? recipe.gearIds : [])
          .filter((gearId: unknown): gearId is number => Number.isInteger(gearId))
      ))
      if (gearIds.length > 0) {
        const { error: gearError } = await supabaseAdmin.from("post_gears").insert(
          gearIds.map(gearId => ({ post_id: postId, gear_id: gearId }))
        )
        if (gearError) throw new Error(`器具の更新に失敗しました: ${gearError.message}`)
      }
    }

    if (input.selectedTags && Array.isArray(input.selectedTags)) {
      await supabaseAdmin.from("post_tastes").delete().eq("post_id", postId)

      const validTags = input.selectedTags.filter((tagId: any) => {
        return typeof tagId === "string" && uuidPattern.test(tagId)
      })

      if (validTags.length > 0) {
        const tagPayload = validTags.map((tagId: string) => ({
          post_id: postId,
          taste_id: tagId,
        }))
        
        const { error: tagLinkError } = await supabaseAdmin
          .from("post_tastes")
          .insert(tagPayload)

        if (tagLinkError) throw new Error(`タグの更新に失敗しました: ${tagLinkError.message}`)
      }
    }

    await syncOriginPostLinks(supabaseAdmin, postId)

    const { data: sourcePost } = await supabaseAdmin.from("posts").select("lang").eq("id", postId).maybeSingle()
    if (sourcePost?.lang === "ja" && await isAdminUser(userId)) {
      try {
        await translateAdminResource("posts", postId)
      } catch (translationError) {
        console.error("Admin English translation update failed:", translationError)
      }
    }

    return {
      success: true,
      imageUrls: permanentImageUrls
    }
  } catch (err: any) {
    console.error("UpdatePost Error:", err.message)
    throw new Error(err.message)
  }
}

export async function serverUploadAvatar(formData: FormData, userId: string): Promise<string> {
  const file = formData.get("file") as File
  if (!file) throw new Error("No file provided")

  const fileExt = file.name.split('.').pop()
  const destKey = `avatars/${userId}/avatar-${Date.now()}.${fileExt}`
  const bucketName = process.env.R2_BUCKET_NAME

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: destKey,
        Body: buffer,
        ContentType: file.type,
      })
    )

    const publicOrigin = (
      process.env.R2_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_R2_PUBLIC_URL
    )?.replace(/\/$/, "")

    if (!publicOrigin) {
      throw new Error("R2 public URL is not configured")
    }

    return `${publicOrigin}/${destKey}`
  } catch (err) {
    console.error("Failed to upload avatar to R2:", err)
    throw new Error("Failed to upload image to storage")
  }
}
