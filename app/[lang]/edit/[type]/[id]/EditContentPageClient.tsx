"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const currentLang = lang === "en" ? "en" : "ja"
  const [userId, setUserId] = useState("")
  const [tier, setTier] = useState<MembershipTier>("free")
  const [authorType, setAuthorType] = useState<"pro" | "owner">("pro")
  const [authorized, setAuthorized] = useState(false)
  const [checked, setChecked] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

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
      if (record) {
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
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-400">SIGN IN REQUIRED</p>
          <h1 className="mt-4 text-xl font-semibold text-neutral-900">
            {currentLang === "en" ? "This post cannot be edited" : "この投稿は編集できません"}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-neutral-500">
            {currentLang === "en"
              ? "Sign in with the account that owns this post."
              : "投稿を所有するアカウントでログインしてください。"}
          </p>
          <Link href={`/${currentLang}/dashboard`} className="mt-8 inline-flex rounded-full bg-neutral-900 px-7 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700">
            {currentLang === "en" ? "Back to Dashboard" : "ダッシュボードへ戻る"}
          </Link>
        </section>
      </main>
    )
  }

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false)
    setStatusMessage(null)
    setDeleting(true)
    try {
      const response = await fetch("/api/delete-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Delete failed")
      setStatusMessage({
        text: currentLang === "en" ? "Post and images deleted." : "投稿と画像を削除しました",
        type: "success",
      })
      window.setTimeout(() => {
        router.push(`/${currentLang}/dashboard`)
      }, 1000)
    } catch (error) {
      setStatusMessage({
        text: error instanceof Error ? error.message : (currentLang === "en" ? "Failed to delete." : "削除に失敗しました。"),
        type: "error",
      })
    } finally {
      setDeleting(false)
    }
  }

  const title = currentLang === "en" ? "EDIT POST" : "投稿を編集"
  const deleteAction = (
    <button
      type="button"
      onClick={() => setShowDeleteModal(true)}
      disabled={deleting}
      className="w-full rounded-full border border-red-200 px-8 py-3.5 text-sm font-medium tracking-wider text-red-600 transition-all duration-300 hover:bg-red-50 disabled:opacity-40 sm:w-auto"
    >
      {deleting
        ? (currentLang === "en" ? "Deleting..." : "削除中...")
        : (currentLang === "en" ? "Delete" : "削除する")}
    </button>
  )

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mx-auto mb-8 max-w-5xl border-b border-neutral-200 pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-neutral-400">{type}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">{title}</h1>
      </header>
      {type === "event" && <EventPostForm userId={userId} lang={currentLang} editId={id} secondaryAction={deleteAction} deleteStatusMessage={statusMessage} />}
      {type === "gear" && <GearReviewForm lang={currentLang} editId={id} secondaryAction={deleteAction} deleteStatusMessage={statusMessage} />}
      {type === "blog" && <CreateBlogForm lang={currentLang} editId={id} authorType={authorType} membership_tier={tier} onBlogCreated={() => undefined} secondaryAction={deleteAction} deleteStatusMessage={statusMessage} />}
      {type === "verification" && <PublishProRecipeForm userId={userId} lang={currentLang} editId={id} authorType={authorType} membership_tier={tier} secondaryAction={deleteAction} deleteStatusMessage={statusMessage} />}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
          <div className="w-full max-w-md space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl transition-all duration-300">
            <div className="space-y-2">
              <h3 className="text-base font-bold tracking-wide text-neutral-900">
                {currentLang === "en" ? "Delete Post" : "投稿の削除"}
              </h3>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-neutral-500">
                {currentLang === "en"
                  ? "Are you sure you want to delete this post?\n(The associated images will also be permanently deleted. This action cannot be undone.)"
                  : "この投稿を削除しますか？\n（アップロードされた画像も同時に完全に削除されます。この操作は取り消せません）"}
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-full border border-neutral-200 px-5 py-2.5 text-xs font-semibold tracking-wide text-neutral-600 transition-all duration-200 hover:bg-neutral-50"
              >
                {currentLang === "en" ? "Cancel" : "キャンセル"}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-full bg-red-600 px-6 py-2.5 text-xs font-semibold tracking-wide text-white shadow-sm transition-all duration-200 hover:bg-red-700"
              >
                {currentLang === "en" ? "Delete" : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
