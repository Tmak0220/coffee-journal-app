"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { FormSkeleton } from "@/components/ui/PageSkeletons"
import EventPostForm from "@/app/[lang]/dashboard/_components/EventPostForm"
import GearReviewForm from "@/app/[lang]/dashboard/_components/GearReviewForm"
import CreateBlogForm from "@/app/[lang]/dashboard/_components/CreateBlogForm"
import PublishProRecipeForm from "@/app/[lang]/dashboard/_components/PublishProRecipeForm"

type EditorType = "event" | "gear" | "blog" | "verification"
type MembershipTier = "free" | "standard" | "pro" | "business"

const isEditorType = (value: string): value is EditorType =>
  ["event", "gear", "blog", "verification"].includes(value)

export default function EditContentPageClient({
  params,
}: {
  params: Promise<{ lang: string; type: string; id: string }>
}) {
  const { lang, type, id } = use(params)
  const currentLang = lang === "en" ? "en" : "ja"
  const [userId, setUserId] = useState("")
  const [tier, setTier] = useState<MembershipTier>("free")
  const [authorType, setAuthorType] = useState<"pro" | "owner">("pro")
  const [authorized, setAuthorized] = useState(false)
  const [checked, setChecked] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    let active = true
    void (async () => {
      if (!isEditorType(type)) {
        setChecked(true)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setChecked(true)
        return
      }
      const table = type === "blog" ? "blogs" : type === "verification" ? "pro_recipes" : "posts"
      const fields = type === "blog" ? "user_id, author_type" : "user_id"
      const { data: record } = await supabase.from(table).select(fields).eq("id", id).eq("user_id", user.id).maybeSingle()
      const { data: profile } = await supabase.from("users").select("membership_tier").eq("id", user.id).maybeSingle()
      if (!active) return
      const membershipTier = (profile?.membership_tier || "free") as MembershipTier
      if (record && membershipTier !== "free") {
        setUserId(user.id)
        setTier(membershipTier)
        if ("author_type" in record && record.author_type === "owner") setAuthorType("owner")
        setAuthorized(true)
      }
      setChecked(true)
    })()
    return () => { active = false }
  }, [id, type])

  if (!checked) return <FormSkeleton />

  if (!authorized || !isEditorType(type)) {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-3xl items-center justify-center px-5 py-16">
        <section className="w-full rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm sm:p-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-400">MEMBERS ONLY</p>
          <h1 className="mt-4 text-xl font-semibold text-neutral-900">
            {currentLang === "en" ? "This post cannot be edited" : "この投稿は編集できません"}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-neutral-500">
            {currentLang === "en"
              ? "Sign in with the paid member account that owns this post."
              : "投稿を所有する有料会員アカウントでログインしてください。"}
          </p>
          <Link href={`/${currentLang}/dashboard`} className="mt-8 inline-flex rounded-full bg-neutral-900 px-7 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700">
            {currentLang === "en" ? "Back to Dashboard" : "ダッシュボードへ戻る"}
          </Link>
        </section>
      </main>
    )
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError("")
    try {
      const response = await fetch("/api/delete-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Delete failed")
      window.location.assign(`/${currentLang}/dashboard`)
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : (currentLang === "en" ? "Failed to delete." : "削除に失敗しました。"))
      setDeleting(false)
    }
  }

  const title = currentLang === "en" ? "EDIT POST" : "投稿を編集"
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mx-auto mb-8 max-w-5xl border-b border-neutral-200 pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-400">{type}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">{title}</h1>
      </header>
      {type === "event" && <EventPostForm userId={userId} lang={currentLang} editId={id} />}
      {type === "gear" && <GearReviewForm lang={currentLang} editId={id} />}
      {type === "blog" && <CreateBlogForm lang={currentLang} editId={id} authorType={authorType} membership_tier={tier} onBlogCreated={() => undefined} />}
      {type === "verification" && <PublishProRecipeForm userId={userId} lang={currentLang} editId={id} authorType={authorType} membership_tier={tier} />}
      <section className="mx-auto mt-10 max-w-5xl border-t border-neutral-200 pt-8">
        <button type="button" onClick={() => setShowDeleteModal(true)} className="rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50">
          {currentLang === "en" ? "Delete post" : "投稿を削除する"}
        </button>
      </section>

      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-7 shadow-2xl sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-red-500">DELETE POST</p>
            <h2 className="mt-3 text-xl font-semibold text-neutral-900">
              {currentLang === "en" ? "Delete this post?" : "この投稿を削除しますか？"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-neutral-500">
              {currentLang === "en"
                ? "The post, related data, and uploaded images will be permanently deleted. This action cannot be undone."
                : "投稿、関連データ、アップロード画像を完全に削除します。この操作は取り消せません。"}
            </p>
            {deleteError && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">{deleteError}</p>}
            <div className="mt-7 grid grid-cols-2 gap-3">
              <button type="button" disabled={deleting} onClick={() => { setShowDeleteModal(false); setDeleteError("") }} className="rounded-xl border border-neutral-200 px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50">
                {currentLang === "en" ? "Cancel" : "キャンセル"}
              </button>
              <button type="button" disabled={deleting} onClick={handleDelete} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50">
                {deleting ? (currentLang === "en" ? "Deleting..." : "削除中...") : (currentLang === "en" ? "Delete permanently" : "完全に削除する")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
