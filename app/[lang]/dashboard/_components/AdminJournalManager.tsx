"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { tryAdminTranslation } from "@/lib/request-admin-translation"

type JournalPost = {
  id: string
  title: string
  source_name: string | null
  source_url: string | null
  content: string
  category: string
  lang: "ja" | "en"
  created_at: string
  updated_at?: string
  translation_group_id?: string | null
}

type Props = {
  authorId: string
  lang: "ja" | "en"
}

type StatusMessage = {
  text: string
  type: "error" | "success"
}

type FilterCategory = "all" | "news" | "event" | "column" | "announcement"
type SortOrder = "desc" | "asc"

const uiDict = {
  ja: {
    formTitle: "JOURNAL",
    formSubTitle: "投稿",
    formTitleEdit: "EDIT",
    formSubTitleEdit: "編集",
    
    labelTitle: "TITLE",
    descTitle: "タイトル",
    placeTitle: "タイトル",
    
    labelCategory: "CATEGORY",
    descCategory: "カテゴリー",
    catNews: "ニュース",
    catEvent: "イベント",
    catColumn: "コラム",
    catAnnouncement: "お知らせ",
    catAll: "すべて",
    
    labelSource: "MEDIA (OPTIONAL)",
    descSource: "メディア（任意）",
    placeSource: "メディア名",
    
    labelUrl: "URL (OPTIONAL)",
    descUrl: "URL（任意）",
    
    labelContent: "DESCRIPTION",
    descContent: "説明",
    placeContent: "説明",
    
    btnPublish: "公開する",
    btnUpdate: "変更を保存する",
    btnCancel: "キャンセル",
    btnProcessing: "処理中...",
    listTitle: "PUBLISHED POSTS",
    listSubTitle: "投稿一覧",
    btnEdit: "編集",
    btnDelete: "削除",
    alertMissing: "必須項目（タイトル・説明）を入力してください。",
    alertFail: "処理に失敗しました：",
    alertSuccess: "投稿を公開しました。",
    alertUpdateSuccess: "投稿を更新しました。",
    
    sortNewest: "新しい順",
    sortOldest: "古い順"
  },
  en: {
    formTitle: "JOURNAL",
    formSubTitle: "Create Post",
    formTitleEdit: "EDIT",
    formSubTitleEdit: "Edit Post",
    
    labelTitle: "TITLE",
    descTitle: "Title",
    placeTitle: "Title",
    
    labelCategory: "CATEGORY",
    descCategory: "Category",
    catNews: "News",
    catEvent: "Event",
    catColumn: "Column",
    catAnnouncement: "Announcement",
    catAll: "All",
    
    labelSource: "MEDIA (OPTIONAL)",
    descSource: "Media (Optional)",
    placeSource: "Media",
    
    labelUrl: "URL (OPTIONAL)",
    descUrl: "URL (Optional)",
    
    labelContent: "DESCRIPTION",
    descContent: "Description",
    placeContent: "Description",
    
    btnPublish: "Publish Post",
    btnUpdate: "Save Changes",
    btnCancel: "Cancel",
    btnProcessing: "Processing...",
    listTitle: "PUBLISHED POSTS",
    listSubTitle: "Published Posts List",
    btnEdit: "Edit",
    btnDelete: "Delete",
    alertMissing: "Please fill in all required fields (Title and Description).",
    alertFail: "Operation failed: ",
    alertSuccess: "Post has been successfully published.",
    alertUpdateSuccess: "Post has been successfully updated.",
    
    sortNewest: "Newest",
    sortOldest: "Oldest"
  }
}

export default function AdminJournalManager({ authorId, lang }: Props) {
  const formUi = uiDict[lang] || uiDict.ja

  const [journalTitle, setJournalTitle] = useState("")
  const [sourceName, setSourceName] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [journalContent, setJournalContent] = useState("")
  const [category, setCategory] = useState("news")
  
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all")
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc")
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [posts, setPosts] = useState<JournalPost[]>([])
  const [processing, setProcessing] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("admin_journals")
      .select("id, title, source_name, source_url, content, category, lang, created_at, updated_at, translation_group_id")
      .eq("author_id", authorId)
      .eq("lang", lang)
      .order("created_at", { ascending: false })
    
    if (!error && data) {
      setPosts(data)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [authorId, lang])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)

    if (!journalTitle || !journalContent) {
      setStatusMessage({ text: formUi.alertMissing, type: "error" })
      return
    }

    setProcessing(true)

    const formattedSourceName = sourceName.trim() === "" ? null : sourceName
    const formattedSourceUrl = sourceUrl.trim() === "" ? null : sourceUrl

    try {
      if (editingId) {
        const { data: updated, error: updateError } = await supabase
          .from("admin_journals")
          .update({
            title: journalTitle,
            source_name: formattedSourceName,
            source_url: formattedSourceUrl,
            content: journalContent,
            category: category,
            lang: lang,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingId)
          .select("id")
          .single()

        if (updateError) throw updateError
        if (lang === "ja" && updated?.id) await tryAdminTranslation("admin_journals", updated.id)
        
        setStatusMessage({ text: formUi.alertUpdateSuccess, type: "success" })
        resetForm()
        fetchPosts()
      } else {
        const { data: inserted, error: insertError } = await supabase.from("admin_journals").insert({
          author_id: authorId,
          title: journalTitle,
          source_name: formattedSourceName,
          source_url: formattedSourceUrl,
          content: journalContent,
          category: category,
          is_published: true,
          lang: lang
        }).select("id").single()

        if (insertError) throw insertError
        if (lang === "ja" && inserted?.id) await tryAdminTranslation("admin_journals", inserted.id)

        setStatusMessage({ text: formUi.alertSuccess, type: "success" })
        resetForm()
        fetchPosts()
      }

      setTimeout(() => setStatusMessage(null), 4000)

    } catch (error: any) {
      setStatusMessage({ text: formUi.alertFail + error.message, type: "error" })
    } finally {
      setProcessing(false)
    }
  }

  const handleDelete = async (id: string) => {
    setStatusMessage(null)
    const target = posts.find(post => post.id === id)
    const deleteQuery = supabase.from("admin_journals").delete()
    const { error } = target?.translation_group_id
      ? await deleteQuery.eq("translation_group_id", target.translation_group_id)
      : await deleteQuery.eq("id", id)

    if (error) {
      setStatusMessage({ text: formUi.alertFail + error.message, type: "error" })
    } else {
      fetchPosts()
      if (editingId === id) resetForm()
    }
  }

  const startEdit = (post: JournalPost) => {
    setStatusMessage(null)
    setEditingId(post.id)
    setJournalTitle(post.title)
    setSourceName(post.source_name || "")
    setSourceUrl(post.source_url || "")
    setJournalContent(post.content)
    setCategory(post.category === "colun" ? "column" : post.category)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const resetForm = () => {
    setEditingId(null)
    setJournalTitle("")
    setSourceName("")
    setSourceUrl("")
    setJournalContent("")
    setCategory("news")
  }

  const filteredAndSortedPosts = posts
    .filter((post) => {
      if (post.lang !== lang) return false
      const postCat = post.category === "colun" ? "column" : post.category
      if (filterCategory === "all") return true
      return postCat === filterCategory
    })
    .sort((a, b) => {
      const timeA = new Date(a.created_at).getTime()
      const timeB = new Date(b.created_at).getTime()
      return sortOrder === "desc" ? timeB - timeA : timeA - timeB
    })

  const inputStyle = "w-full text-[15px] border border-neutral-300 rounded-xl px-4 py-3 bg-white text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 placeholder:text-neutral-400 transition-all duration-300"
  const selectStyle = `${inputStyle} appearance-none bg-no-repeat bg-[right_1.25rem_center] pr-10`

  return (
    <div className="space-y-12 w-full max-w-5xl mx-auto">
      
      <div className="space-y-10 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
        <div>
          <h2 className="text-[15px] font-semibold tracking-wider text-neutral-900 uppercase">
            {editingId ? formUi.formTitleEdit : formUi.formTitle}
          </h2>
          <p className="mt-1 text-[13px] font-normal tracking-wide text-neutral-500">
            {editingId ? formUi.formSubTitleEdit : formUi.formSubTitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="space-y-2">
              <div>
                <p className="text-[15px] font-semibold tracking-wider text-neutral-900">{formUi.labelTitle}</p>
                <p className="text-[13px] font-normal tracking-wide text-neutral-500">{formUi.descTitle}</p>
              </div>
              <input
                type="text"
                value={journalTitle}
                onChange={(e) => setJournalTitle(e.target.value)}
                placeholder={formUi.placeTitle}
                className={inputStyle}
              />
            </div>
            
            <div className="space-y-2">
              <div>
                <p className="text-[15px] font-semibold tracking-wider text-neutral-900">{formUi.labelCategory}</p>
                <p className="text-[13px] font-normal tracking-wide text-neutral-500">{formUi.descCategory}</p>
              </div>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={selectStyle}
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23737373' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.2' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`
                  }}
                >
                  <option value="news">{formUi.catNews}</option>
                  <option value="event">{formUi.catEvent}</option>
                  <option value="column">{formUi.catColumn}</option>
                  <option value="announcement">{formUi.catAnnouncement}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <div className="space-y-2">
              <div>
                <p className="text-[15px] font-semibold tracking-wider text-neutral-900">{formUi.labelSource}</p>
                <p className="text-[13px] font-normal tracking-wide text-neutral-500">{formUi.descSource}</p>
              </div>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder={formUi.placeSource}
                className={inputStyle}
              />
            </div>
            
            <div className="space-y-2">
              <div>
                <p className="text-[15px] font-semibold tracking-wider text-neutral-900">{formUi.labelUrl}</p>
                <p className="text-[13px] font-normal tracking-wide text-neutral-500">{formUi.descUrl}</p>
              </div>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className={`${inputStyle} font-mono`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-[15px] font-semibold tracking-wider text-neutral-900">{formUi.labelContent}</p>
              <p className="text-[13px] font-normal tracking-wide text-neutral-500">{formUi.descContent}</p>
            </div>
            <textarea
              rows={12}
              value={journalContent}
              placeholder={formUi.placeContent}
              onChange={(e) => setJournalContent(e.target.value)}
              className={`${inputStyle} leading-relaxed resize-y min-h-[250px]`}
            />
          </div>

          <div className="pt-4 space-y-4">
            {statusMessage && (
              <div className={`text-sm p-4 rounded-xl border max-w-xl transition-all duration-300 ${
                statusMessage.type === "error" 
                  ? "text-red-600 bg-red-50/40 border-red-200" 
                  : "text-neutral-900 bg-neutral-50 border-neutral-200"
              }`}>
                {statusMessage.text}
              </div>
            )}

            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={processing}
                className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-white border border-transparent px-10 py-3.5 rounded-md text-sm font-medium tracking-wider transition-all duration-300 shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50"
              >
                {processing ? formUi.btnProcessing : (editingId ? formUi.btnUpdate : formUi.btnPublish)}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full sm:w-auto border border-neutral-200 hover:border-neutral-300 bg-white px-6 py-3.5 rounded-md text-sm font-medium tracking-wider text-neutral-500 hover:text-neutral-900 transition duration-300 shadow-sm"
                >
                  {formUi.btnCancel}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="space-y-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-2 border-b border-neutral-100">
          <div>
            <h2 className="text-[15px] font-semibold tracking-wider text-neutral-900 uppercase">
              {formUi.listTitle} ({filteredAndSortedPosts.length})
            </h2>
            <p className="mt-1 text-[13px] font-normal tracking-wide text-neutral-500">
              {formUi.listSubTitle}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-200/40 select-none text-[12px]">
              {(["all", "news", "event", "column", "announcement"] as FilterCategory[]).map((cat) => {
                const label = 
                  cat === "all" ? formUi.catAll : 
                  cat === "news" ? formUi.catNews : 
                  cat === "event" ? formUi.catEvent : 
                  cat === "column" ? formUi.catColumn : formUi.catAnnouncement
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg font-medium tracking-wide transition-all duration-200 ${
                      filterCategory === cat
                        ? "bg-white text-neutral-950 shadow-[0_2px_4px_rgba(0,0,0,0.02)] font-semibold"
                        : "text-neutral-400 hover:text-neutral-700"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            <div className="inline-flex p-1 bg-neutral-100 rounded-xl border border-neutral-200/40 select-none text-[12px]">
              <button
                type="button"
                onClick={() => setSortOrder("desc")}
                className={`px-3 py-1.5 rounded-lg font-medium tracking-wide transition-all duration-200 ${
                  sortOrder === "desc"
                    ? "bg-white text-neutral-950 shadow-[0_2px_4px_rgba(0,0,0,0.02)] font-semibold"
                    : "text-neutral-400 hover:text-neutral-700"
                }`}
              >
                {formUi.sortNewest}
              </button>
              <button
                type="button"
                onClick={() => setSortOrder("asc")}
                className={`px-3 py-1.5 rounded-lg font-medium tracking-wide transition-all duration-200 ${
                  sortOrder === "asc"
                    ? "bg-white text-neutral-950 shadow-[0_2px_4px_rgba(0,0,0,0.02)] font-semibold"
                    : "text-neutral-400 hover:text-neutral-700"
                }`}
              >
                {formUi.sortOldest}
              </button>
            </div>
          </div>
        </div>
        
        {filteredAndSortedPosts.length === 0 ? (
          <p className="text-sm text-neutral-400 py-4 text-center font-normal tracking-wide">No {lang === "ja" ? "Japanese" : "English"} journal posts found matching the criteria.</p>
        ) : (
          <div className="divide-y divide-neutral-200/50">
            {filteredAndSortedPosts.map((post) => (
              <div key={post.id} className="py-6 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:bg-neutral-50/40 transition-colors px-3 -mx-3 rounded-xl duration-300">
                <div className="space-y-2.5 min-w-0 flex-1">
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono tracking-wider uppercase bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded font-bold">
                      {post.category === "colun" ? "column" : post.category}
                    </span>
                    <span className="text-[10px] font-mono bg-neutral-900 text-white px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                      {post.lang}
                    </span>
                  </div>

                  <h4 className="text-base font-semibold text-neutral-900 break-words leading-snug">
                    {post.title}
                  </h4>

                  {(post.source_name || post.source_url) && (
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-400 font-mono">
                      {post.source_name && <span className="text-neutral-500 font-sans">{post.source_name}</span>}
                      {post.source_name && post.source_url && <span className="text-neutral-300">•</span>}
                      {post.source_url && <span className="truncate max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl">{post.source_url}</span>}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2.5 self-end md:self-start flex-shrink-0 pt-1">
                  <button
                    onClick={() => startEdit(post)}
                    className="border border-neutral-200 bg-white px-4 py-2 rounded-md text-xs font-medium tracking-wider text-neutral-600 hover:text-neutral-900 hover:border-neutral-300 transition-all duration-200 shadow-sm active:scale-[0.97]"
                  >
                    {formUi.btnEdit}
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="border border-transparent bg-red-50/50 px-4 py-2 rounded-md text-xs font-medium tracking-wider text-red-600 hover:bg-red-600 hover:text-white transition-all duration-200 active:scale-[0.97]"
                  >
                    {formUi.btnDelete}
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
