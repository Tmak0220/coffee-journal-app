import { supabase } from "./supabase"

type NotificationInput = {
  originSlug: string
  originNameJa: string
  type: 'new_beans' | 'recipe'
  targetTitle: string // 豆の名前やレシピ名
  linkUrl?: string
}

/**
 * オーナーのフォロワー全員に通知を一斉送信する関数
 */
export async function broadcastNotificationToFollowers({
  originSlug,
  originNameJa,
  type,
  targetTitle,
  linkUrl
}: NotificationInput) {
  try {
    // 所有者がいるビジネスページは users.id 単位の共通フォローを使用する。
    // 所有者がいない産地マスターだけ、従来の origin_follows を使用する。
    const { data: origin, error: originError } = await supabase
      .from("origins")
      .select("user_id")
      .eq("slug", originSlug)
      .maybeSingle()

    if (originError) throw originError

    const { data: followerRows, error: fetchError } = origin?.user_id
      ? await supabase.from("follows").select("follower_id").eq("following_id", origin.user_id)
      : await supabase.from("origin_follows").select("user_id").eq("origin_slug", originSlug)

    if (fetchError) throw fetchError
    const followers = (followerRows || []).map((row: any) => ({
      user_id: row.follower_id || row.user_id,
    }))
    if (!followers || followers.length === 0) return { success: true, count: 0 }

    // 2. 通知の文面をタイプ別に生成
    const title = type === 'new_beans' ? "🆕 新豆入荷のお知らせ" : "☕ 公式おすすめレシピ公開"
    const content = type === 'new_beans'
      ? `${originNameJa} にて新しいお豆「${targetTitle}」の販売が開始されました！`
      : `${originNameJa} が「${targetTitle}」の公式おすすめ抽出レシピを公開しました。`

    // 3. 全フォロワー分の通知レコードを配列で作成
    const notificationRecords = followers.map(follower => ({
      user_id: follower.user_id,
      origin_slug: originSlug,
      type,
      title,
      content,
      link_url: linkUrl || null,
      is_read: false
    }))

    // 4. バルクインサート（一括挿入）で一気に通知を生成
    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notificationRecords)

    if (insertError) throw insertError

    return { success: true, count: followers.length }
  } catch (error) {
    console.error("Failed to broadcast notification:", error)
    return { success: false, error }
  }
}
