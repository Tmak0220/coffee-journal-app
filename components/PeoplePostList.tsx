"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useAppPopup } from "@/context/AppPopupContext"

type PeoplePostListProps = {
  userId?: string
  lang?: string
  editable?: boolean
  targetType?: "expert" | "origin"
  originId?: number
}

type LinkedPostMode = "auto" | "review"
type DisplayStatus = "pending" | "approved" | "hidden"

type ServedLogItem = {
  recipeId: string
  linkKind: "expert" | "origin"
  id: string
  title: string
  coffeeName: string | null
  imageUrl: string | null
  authorId: string
  createdAt: string
  status: DisplayStatus
  pinned: boolean
  user: {
    display_name: string | null
    username: string | null
  } | null
}

export default function PeoplePostList({ userId = "", lang = "ja", editable = false, targetType = "expert", originId }: PeoplePostListProps) {
  const { confirmPopup } = useAppPopup()
  const currentLang = lang === "en" ? "en" : "ja"
  const isEn = currentLang === "en"
  const [logs, setLogs] = useState<ServedLogItem[]>([])
  const [mode, setMode] = useState<LinkedPostMode>("auto")
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [ownerUserId, setOwnerUserId] = useState<string | null>(userId || null)

  const t = isEn ? {
    noPosts: "No posts from other users yet.",
    noOwnPosts: "No posts linked by this account yet.",
    ownSectionTitle: "ACCOUNT POSTS",
    userSectionTitle: "USER POSTS",
    byUser: "By",
    viewLog: "View Details",
    beanLabel: "Bean:",
    sectionTitle: "LINKED POSTS",
    sectionDesc: "Manage posts linked to this profile.",
    displaySetting: "PUBLICATION SETTING",
    auto: "Publish automatically",
    autoDesc: "Linked posts are displayed on your public page as soon as they are published.",
    review: "Publish after approval",
    reviewDesc: "Linked posts remain pending until you approve them.",
    settingNotice: "This setting controls how future linked posts are published. We recommend choosing the policy that suits you and keeping it consistent. You can change it later without submitting a request.",
    changeTitle: "Change publication setting?",
    changeToAuto: "Future linked posts will be published automatically. Posts currently awaiting approval will also become visible.",
    changeToReview: "Future linked posts will remain hidden from your public page until you approve them. Posts that are already visible will remain visible.",
    changeConfirm: "Change setting",
    cancel: "Cancel",
    pending: "PENDING",
    approved: "VISIBLE",
    hidden: "HIDDEN",
    approve: "Approve",
    hide: "Hide",
    show: "Show",
    pin: "Pin",
    unpin: "Unpin",
  } : {
    noPosts: "他のユーザーからの投稿はまだありません。",
    noOwnPosts: "アカウントからの投稿はまだありません。",
    ownSectionTitle: "アカウントの投稿",
    userSectionTitle: "ユーザーからの投稿",
    byUser: "投稿者:",
    viewLog: "詳細を見る",
    beanLabel: "使用豆:",
    sectionTitle: "関連投稿",
    sectionDesc: "このプロフィールに関連付けられた投稿を管理します。",
    displaySetting: "公開方法",
    auto: "自動的に表示",
    autoDesc: "関連付けられた投稿は、投稿後すぐに公開ページへ表示されます。",
    review: "承認後に表示",
    reviewDesc: "関連付けられた投稿は、承認するまで公開ページに表示されません。",
    settingNotice: "この設定は、今後関連付けられる投稿の公開方法を決めるものです。運用方針に合う方法を選び、基本的には同じ設定で使い続けることをおすすめします。申請なしで後から変更できます。",
    changeTitle: "公開方法を変更しますか？",
    changeToAuto: "今後の関連投稿は自動的に公開されます。現在承認待ちの投稿も公開ページに表示されます。",
    changeToReview: "今後の関連投稿は承認するまで公開ページに表示されません。すでに表示中の投稿はそのまま維持されます。",
    changeConfirm: "設定を変更",
    cancel: "キャンセル",
    pending: "承認待ち",
    approved: "表示中",
    hidden: "非表示",
    approve: "承認",
    hide: "非表示",
    show: "表示する",
    pin: "ピン留め",
    unpin: "ピンを外す",
  }

  const fetchServedLogs = async () => {
    if (targetType === "expert" && !userId) return
    setLoading(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const viewerId = sessionData.session?.user?.id || null
    const canViewMembers = editable || Boolean(viewerId)

    if (targetType === "origin" && !originId) {
      setLogs([])
      setLoading(false)
      return
    }

    let currentOwnerId = userId || null

    if (targetType === "origin" && originId) {
      const { data: originData } = await supabase.from("origins").select("user_id, linked_posts_mode").eq("id", originId).maybeSingle()
      if (originData?.user_id) {
        currentOwnerId = originData.user_id
        setOwnerUserId(originData.user_id)
      }
    }

    const profileQuery = targetType === "origin"
      ? supabase.from("origins").select("linked_posts_mode").eq("id", originId!).maybeSingle()
      : supabase.from("experts").select("linked_posts_mode").eq("user_id", userId).maybeSingle()
    
    const linkedPostsQuery = targetType === "origin"
      ? supabase
          .from("origin_post_links")
          .select("id, post_id, display_status, is_pinned")
          .eq("origin_id", originId!)
      : supabase
          .from("expert_post_links")
          .select("id, post_id, display_status, is_pinned")
          .eq("expert_user_id", userId)

    // posts の外部キーを正とし、古い投稿で origin_post_links が欠けていても
    // Source / Market / Event のいずれか一つだけの紐付けから表示できるようにする。
    const directlyLinkedPostsQuery = targetType === "origin"
      ? supabase
          .from("posts")
          .select("id, user_id")
          .or(`source_origin_id.eq.${originId!},market_origin_id.eq.${originId!},event_origin_id.eq.${originId!}`)
      : Promise.resolve({ data: [], error: null })

    const [profileResult, linkedPostsResult, directlyLinkedPostsResult] = await Promise.all([
      profileQuery,
      linkedPostsQuery,
      directlyLinkedPostsQuery,
    ])

    if (profileResult.data?.linked_posts_mode === "review") setMode("review")
    else setMode("auto")

    if (linkedPostsResult.error) {
      console.error("Error fetching linked posts:", linkedPostsResult.error)
      setLogs([])
      setLoading(false)
      return
    }

    if (directlyLinkedPostsResult.error) {
      console.error("Error fetching directly linked origin posts:", directlyLinkedPostsResult.error)
    }

    const linkedRows = [...(linkedPostsResult.data || [])] as any[]
    if (targetType === "origin") {
      const linkedPostIds = new Set(linkedRows.map((item: any) => item.post_id))
      for (const directlyLinkedPost of directlyLinkedPostsResult.data || []) {
        if (linkedPostIds.has(directlyLinkedPost.id)) continue
        linkedRows.push({
          id: `direct-${originId}-${directlyLinkedPost.id}`,
          post_id: directlyLinkedPost.id,
          display_status:
            profileResult.data?.linked_posts_mode === "review" &&
            directlyLinkedPost.user_id !== currentOwnerId
              ? "pending"
              : "approved",
          is_pinned: false,
        })
      }
    }
    const postIds = Array.from(new Set(linkedRows.map((item: any) => item.post_id).filter(Boolean)))
    if (postIds.length === 0) {
      setLogs([])
      setLoading(false)
      return
    }

    const { data: postData, error: postError } = await supabase
      .from("posts")
      .select("id, title, image_urls, created_at, visibility, lang, user_id")
      .in("id", postIds)
      .eq("lang", currentLang)
      .in("visibility", canViewMembers ? ["members", "public"] : ["public"])

    if (postError) {
      console.error("Error fetching posts linked to profile:", postError)
      setLogs([])
      setLoading(false)
      return
    }

    const authorIds = Array.from(new Set((postData || []).map((post: any) => post.user_id).filter(Boolean)))
    const { data: authorData, error: authorError } = authorIds.length > 0
      ? await supabase.from("users").select("id, display_name, username").in("id", authorIds)
      : { data: [], error: null }
    if (authorError) console.error("Error fetching linked post authors:", authorError)

    const postMap = new Map((postData || []).map((post: any) => [post.id, post]))
    const authorMap = new Map((authorData || []).map((author: any) => [author.id, author]))
    const seenIds = new Set<string>()
    const formatted: ServedLogItem[] = []
    for (const item of linkedRows as any[]) {
      const rawPost = postMap.get(item.post_id) as any
      const status = (item.display_status || "approved") as DisplayStatus
      if (!editable && status !== "approved") continue
      if (!rawPost || seenIds.has(rawPost.id)) continue
      seenIds.add(rawPost.id)
      const author = authorMap.get(rawPost.user_id) as any
      formatted.push({
        recipeId: item.id,
        linkKind: targetType === "origin" ? "origin" : "expert",
        id: rawPost.id,
        title: rawPost.title || (isEn ? "Untitled" : "無題"),
        coffeeName: item.bean_name ?? null,
        imageUrl: Array.isArray(rawPost.image_urls) ? rawPost.image_urls[0] || null : null,
        authorId: rawPost.user_id,
        createdAt: rawPost.created_at,
        status,
        pinned: Boolean(item.is_pinned),
        user: author ? {
          display_name: author.display_name,
          username: author.username,
        } : null,
      })
    }
    formatted.sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setLogs(formatted)
    setLoading(false)
  }

  useEffect(() => {
    void fetchServedLogs()
  }, [currentLang, editable, originId, targetType, userId])

  const changeMode = async (nextMode: LinkedPostMode) => {
    if (nextMode === mode) return
    const confirmed = await confirmPopup({
      title: t.changeTitle,
      message: nextMode === "auto" ? t.changeToAuto : t.changeToReview,
      confirmLabel: t.changeConfirm,
      cancelLabel: t.cancel,
    })
    if (!confirmed) return

    const previous = mode
    setMode(nextMode)
    const { error } = targetType === "origin"
      ? await supabase.rpc("set_owner_linked_posts_mode", { p_origin_id: originId, p_mode: nextMode })
      : await supabase.rpc("set_expert_linked_posts_mode", { p_mode: nextMode })
    if (error) {
      console.error("Failed to update linked post mode:", error)
      setMode(previous)
    }
  }

  const moderate = async (item: ServedLogItem, action: "approve" | "hide" | "show" | "pin" | "unpin") => {
    const recipeId = item.recipeId
    setUpdatingId(recipeId)
    const nextValues = action === "pin"
      ? { is_pinned: true, updated_at: new Date().toISOString() }
      : action === "unpin"
        ? { is_pinned: false, updated_at: new Date().toISOString() }
        : { display_status: action === "approve" || action === "show" ? "approved" : "hidden", updated_at: new Date().toISOString() }
    const { error } = item.linkKind === "origin"
      ? await supabase.from("origin_post_links").update(nextValues).eq("id", recipeId).eq("origin_id", originId!)
      : await supabase.from("expert_post_links").update(nextValues).eq("id", recipeId).eq("expert_user_id", userId)
    if (error) console.error("Failed to moderate linked post:", error)
    else await fetchServedLogs()
    setUpdatingId(null)
  }

  const statusLabel = (status: DisplayStatus) => t[status]

  const activeOwnerId = ownerUserId || userId
  const ownLogs = activeOwnerId ? logs.filter((log) => log.authorId === activeOwnerId) : []
  const userLogs = logs.filter((log) => !activeOwnerId || log.authorId !== activeOwnerId)

  const groups = [
    { key: "own", title: t.ownSectionTitle, empty: t.noOwnPosts, items: ownLogs },
    { key: "users", title: t.userSectionTitle, empty: t.noPosts, items: userLogs },
  ]

  const renderCards = (items: ServedLogItem[], ownGroup: boolean) => (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${editable ? "lg:grid-cols-2" : "lg:grid-cols-4"}`}>
      {items.map((log) => (
        <article
          key={log.recipeId}
          className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white shadow-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-neutral-300/90 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.10)]"
        >
          {log.pinned && (
            <span
              className="absolute left-3 top-3 z-10 flex size-9 items-center justify-center rounded-[11px] border border-white/80 bg-white/90 text-neutral-900 shadow-[0_5px_18px_rgba(0,0,0,0.14)] backdrop-blur-md"
              aria-label={isEn ? "Pinned post" : "ピン留めされた投稿"}
              title={isEn ? "Pinned post" : "ピン留めされた投稿"}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-[19px]"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7.2 4.75h9.6l3.15 5.05L12 19.25 4.05 9.8 7.2 4.75Z" strokeWidth="1.45" />
                <path d="m4.35 9.8 4.15-.1L12 19.25l3.5-9.55 4.15.1M7.2 4.75 8.5 9.7h7l1.3-4.95" strokeWidth="1.05" opacity=".72" />
              </svg>
            </span>
          )}
          {!editable && (
            <Link href={`/${currentLang}/posts/${log.id}`} className="relative block aspect-[4/3] overflow-hidden bg-neutral-100">
              {log.imageUrl ? (
                <Image
                  src={log.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-300">
                  {isEn ? "No image" : "画像なし"}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </Link>
          )}
          <div className={`flex flex-1 flex-col ${editable ? (log.pinned ? "px-5 pb-5 pt-14" : "p-5") : "p-4"}`}>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-500">
                    {ownGroup ? (isEn ? "OWN POST" : "アカウントの投稿") : (isEn ? "USER POST" : "ユーザー投稿")}
                  </span>
                </div>
                {editable && <span className="rounded-md bg-neutral-900 px-2 py-1 text-[9px] font-semibold text-white">{statusLabel(log.status)}</span>}
              </div>
              <p className="font-mono text-[10px] text-neutral-400">{new Date(log.createdAt).toLocaleDateString(isEn ? "en-US" : "ja-JP")}</p>
              <h3 className={`${editable ? "text-sm" : "min-h-10 text-[13px] leading-5"} line-clamp-2 font-bold text-neutral-800`}>{log.title}</h3>
              {log.coffeeName && <p className="w-fit rounded-lg border border-neutral-100 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600"><span className="mr-1.5 text-neutral-400">{t.beanLabel}</span>{log.coffeeName}</p>}
            </div>
            <div className="mt-auto border-t border-neutral-100 pt-3">
              {!ownGroup && log.user && <p className="mb-3 line-clamp-1 text-[11px] text-neutral-400">{t.byUser} <span className="font-semibold text-neutral-700">{log.user.display_name || `@${log.user.username}`}</span></p>}
              {editable && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {log.status === "pending" && <button disabled={updatingId === log.recipeId} onClick={() => void moderate(log, "approve")} className="rounded-lg bg-neutral-900 px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50">{t.approve}</button>}
                  {log.status === "hidden"
                    ? <button disabled={updatingId === log.recipeId} onClick={() => void moderate(log, "show")} className="rounded-lg border border-neutral-300 px-3 py-2 text-[10px] font-semibold disabled:opacity-50">{t.show}</button>
                    : <button disabled={updatingId === log.recipeId} onClick={() => void moderate(log, "hide")} className="rounded-lg border border-neutral-300 px-3 py-2 text-[10px] font-semibold disabled:opacity-50">{t.hide}</button>}
                  {log.status === "approved" && <button disabled={updatingId === log.recipeId} onClick={() => void moderate(log, log.pinned ? "unpin" : "pin")} className="rounded-lg border border-neutral-300 px-3 py-2 text-[10px] font-semibold disabled:opacity-50">{log.pinned ? t.unpin : t.pin}</button>}
                </div>
              )}
              <Link href={`/${currentLang}/posts/${log.id}`} className={`${editable ? "rounded-xl border border-neutral-300 px-4 py-2.5 text-center text-xs hover:border-neutral-900 hover:bg-neutral-900 hover:text-white" : "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] group-hover:gap-2"} block w-full font-medium text-neutral-800 transition-all`}>
                {t.viewLog}{!editable && <span aria-hidden="true">→</span>}
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  )

  return (
    <div className={`mx-auto w-full space-y-8 ${
      editable
        ? "max-w-5xl rounded-xl border border-neutral-200 bg-white px-6 pb-10 pt-6 shadow-sm sm:px-10 sm:pb-16 sm:pt-10"
        : "max-w-none"
    }`}>
      {editable && (
        <div className="border-b border-neutral-100 pb-5">
          <h2 className="text-[15px] font-bold uppercase tracking-wider text-neutral-900">{t.sectionTitle}</h2>
          <p className="mt-0.5 text-[11px] font-medium tracking-wide text-neutral-400">
            {t.sectionDesc}
          </p>
        </div>
      )}

      {editable && (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 sm:p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">{t.displaySetting}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["auto", "review"] as LinkedPostMode[]).map((value) => (
              <button key={value} type="button" onClick={() => void changeMode(value)} className={`rounded-xl border p-4 text-left transition ${mode === value ? "border-neutral-900 bg-white ring-2 ring-neutral-100" : "border-neutral-200 bg-white hover:border-neutral-400"}`}>
                <span className="block text-xs font-semibold text-neutral-900">{t[value]}</span>
                <span className="mt-1 block text-[10px] leading-5 text-neutral-400">{value === "auto" ? t.autoDesc : t.reviewDesc}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 border-t border-neutral-200/70 pt-4 text-[10px] leading-5 text-neutral-500">
            {t.settingNotice}
          </p>
        </div>
      )}

      {loading ? (
        <div aria-busy="true" className={`grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 ${editable ? "lg:grid-cols-2" : "lg:grid-cols-4"}`}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm">
              {!editable && <div className="aspect-[4/3] bg-neutral-100" />}
              <div className="p-4">
                <div className="h-3 w-24 rounded bg-neutral-100" />
                <div className="mt-5 h-5 w-3/4 rounded bg-neutral-100" />
                <div className="mt-4 h-3 w-full rounded bg-neutral-100" />
                <div className="mt-2 h-3 w-4/5 rounded bg-neutral-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-14">
          {groups.map((group) => (
            <section key={group.key}>
              <div className="flex items-end justify-between border-b border-neutral-100 pb-4">
                <h2 className="text-[15px] font-bold tracking-wider text-neutral-900">{group.title}</h2>
                <span className="font-mono text-[9px] tracking-wider text-neutral-400">{group.items.length} ITEMS</span>
              </div>
              {group.items.length === 0 ? (
                <div className="rounded-b-2xl border-x border-b border-dashed border-neutral-200 bg-neutral-50/30 px-5 py-10 text-center text-xs text-neutral-400">{group.empty}</div>
              ) : (
                <div className="mt-5">{renderCards(group.items, group.key === "own")}</div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
