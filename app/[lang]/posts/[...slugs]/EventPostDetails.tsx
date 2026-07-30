"use client"

import Link from "next/link"
import { Post } from "./PostPageClient"

type EventProps = {
  post: Post
  lang: "ja" | "en"
}

// 辞書定義
const dict = {
  ja: {
    eventBadge: "EVENT REPORT",
    eventDate: "開催日",
    visibilityDraft: "下書き",
    visibilityPrivate: "非公開",
    visibilityMembers: "限定公開",
  },
  en: {
    eventBadge: "EVENT REPORT",
    eventDate: "Event Date",
    visibilityDraft: "Draft",
    visibilityPrivate: "Private",
    visibilityMembers: "Members Only",
  },
}

export default function EventPostDetails({ post, lang }: EventProps) {
  const t = dict[lang] || dict.ja

  // 1. 関連イベント（origins）のデータ参照と名称解決
  const origin = post.origins as {
    id: number
    name?: string
    name_ja?: string | null
    display_name?: string | null
    display_name_en?: string | null
    slug?: string
  } | null

  const originName = origin
    ? lang === "en"
      ? (origin.display_name_en || origin.display_name || origin.name || origin.name_ja)
      : (origin.display_name || origin.name_ja || origin.name)
    : null

  // 2. 日付のフォーマット処理 (YYYY/MM/DD)
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    return date.toLocaleDateString(lang === "en" ? "en-US" : "ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <article className="space-y-6">
      {/* 1. ヘッダーエリア */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 select-none">
          {/* イベントタグ */}
          <span className="public-kicker public-accent-rose">
            {t.eventBadge}
          </span>

          {/* 関連イベント名バッジ ([...slug] 構造に対応した動的リンク) */}
          {originName && origin?.slug && (
            <Link
              href={`/${lang}/origins/${origin.slug}`}
              className="inline-block bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 border border-neutral-200/80 text-[11px] font-medium px-3 py-1 rounded-full transition-colors duration-200"
            >
              {originName}
            </Link>
          )}

          {/* 非公開/限定公開バッジ */}
          {post.visibility && post.visibility !== "public" && (
            <span className="inline-block bg-red-50 text-red-600 border border-red-200 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
              {post.visibility === "draft" && t.visibilityDraft}
              {post.visibility === "private" && t.visibilityPrivate}
              {post.visibility === "members" && t.visibilityMembers}
            </span>
          )}
        </div>

        {/* タイトル */}
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.025em] text-neutral-950 sm:text-4xl">
          {post.title}
        </h1>

        {/* 開催日表示 */}
        {post.event_date && (
          <div className="flex items-center gap-2 text-xs text-neutral-500 pt-1">
            <span>{t.eventDate}:</span>
            <time className="text-neutral-900 font-semibold">
              {formatDate(post.event_date)}
              {post.end_date && post.end_date !== post.event_date && (
                <> 〜 {formatDate(post.end_date)}</>
              )}
            </time>
          </div>
        )}
      </div>

      <hr className="border-neutral-200/60" />

      {/* 2. 本文 (改行保持) */}
      {post.description && (
        <div className="min-h-[120px] whitespace-pre-wrap rounded-2xl border border-rose-200/50 bg-rose-50/25 p-6 text-sm font-normal leading-8 text-neutral-700 shadow-sm sm:text-base">
          {post.description}
        </div>
      )}
    </article>
  )
}
