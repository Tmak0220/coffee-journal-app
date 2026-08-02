"use client"

type TimelineItem = {
  id: string
  title: string
  content: string
  link_url: string | null
  link_source: string | null
  target_group: string
  created_at: string
}

type ProfileTimelineProps = {
  items: TimelineItem[] | null
  lang: "ja" | "en"
  isSignedInUser: boolean
  className?: string
}

export default function ProfileTimeline({
  items,
  lang,
  isSignedInUser,
  className = "",
}: ProfileTimelineProps) {
  const isEn = lang === "en"

  return (
    <section className={`mt-12 overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-sm ${className}`}>
      <header className="flex items-end justify-between gap-4 border-b border-border/40 px-5 py-5 sm:px-6">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-subtle">Updates</p>
          <h2 className="mt-1 text-sm font-bold tracking-wide text-foreground">
            {isEn ? "Updates & Announcements" : "お知らせ・タイムライン"}
          </h2>
        </div>
        <span className="font-mono text-[9px] tracking-wider text-subtle">
          {items?.length || 0} {isEn ? "POSTS" : "件"}
        </span>
      </header>

      {!items || items.length === 0 ? (
        <p className="px-5 py-8 text-xs text-subtle sm:px-6">
          {isEn ? "No updates posted yet." : "まだ投稿はありません。"}
        </p>
      ) : (
        <div className="divide-y divide-border/35">
          {items.map((item) => {
            const isRestricted = item.target_group === "premium" && !isSignedInUser
            return (
              <article key={item.id} className="px-5 py-5 transition-colors hover:bg-neutral-50/70 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <time className="font-mono text-[9px] text-subtle">
                    {new Date(item.created_at).toLocaleDateString(isEn ? "en-US" : "ja-JP")}
                  </time>
                  {item.target_group === "premium" && (
                    <span className="rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[8px] font-bold tracking-wide text-amber-700">
                      {isEn ? "SIGNED-IN USERS" : "ログインユーザー限定"}
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-sm font-bold leading-6 text-foreground">{item.title}</h3>
                {isRestricted ? (
                  <p className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3 text-[11px] leading-5 text-subtle">
                    {isEn
                      ? "Sign in to view this update."
                      : "このお知らせを閲覧するにはログインしてください。"}
                  </p>
                ) : (
                  <>
                    <p className="mt-2 whitespace-pre-line text-xs leading-6 text-foreground/75">{item.content}</p>
                    {item.link_url && (
                      <a
                        href={item.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-foreground transition-all hover:gap-2"
                      >
                        {item.link_source || (isEn ? "Open link" : "リンクを見る")} →
                      </a>
                    )}
                  </>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
