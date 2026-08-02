"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import MinimalCalendar, { VisibilityType } from "@/app/[lang]/dashboard/_components/MinimalCalendar"
import { getVisibleContentStatuses } from "@/lib/permissions"

type CalendarItem = {
  id: string
  title: string
  event_date: string
  end_date?: string | null
  memo?: string | null
  visibility?: VisibilityType
  type: "report" | "memo"
}

type Props = {
  targetUserId: string | null | undefined
  lang: "ja" | "en"
  className?: string
}

export default function PublicProfileCalendar({ targetUserId, lang, className = "" }: Props) {
  const [events, setEvents] = useState<CalendarItem[]>([])
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [isSignedInViewer, setIsSignedInViewer] = useState(false)

  useEffect(() => {
    if (!targetUserId) {
      setEvents([])
      return
    }

    let active = true

    const fetchCalendar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const viewerId = user?.id || null
      const isOwn = viewerId === targetUserId
      const viewerIsSignedIn = Boolean(viewerId)

      let memoQuery = supabase
        .from("calendar_memos")
        .select("id, title, start_date, end_date, memo, visibility")
        .eq("user_id", targetUserId)
        .eq("lang", lang)

      let postQuery = supabase
        .from("posts")
        .select("id, title, event_date, end_date, description, visibility")
        .eq("user_id", targetUserId)
        .eq("lang", lang)

      const visible = getVisibleContentStatuses({ viewerId, ownerId: targetUserId })
      memoQuery = memoQuery.in("visibility", visible)
      postQuery = postQuery.in("visibility", visible)

      const [memosResult, postsResult] = await Promise.all([memoQuery, postQuery])
      if (!active) return
      if (memosResult.error) console.error("Failed to load public calendar memos:", memosResult.error)
      if (postsResult.error) console.error("Failed to load public calendar posts:", postsResult.error)

      const memoItems: CalendarItem[] = (memosResult.data || []).map(item => ({
        id: item.id,
        title: item.title,
        event_date: item.start_date,
        end_date: item.end_date || null,
        memo: item.memo || null,
        visibility: item.visibility as VisibilityType,
        type: "memo"
      }))

      const postItems: CalendarItem[] = (postsResult.data || [])
        .filter(item => Boolean(item.event_date))
        .map(item => ({
          id: item.id,
          title: item.title || "Untitled",
          event_date: item.event_date as string,
          end_date: item.end_date || null,
          memo: item.description || null,
          visibility: (item.visibility || "public") as VisibilityType,
          type: "report"
        }))

      setIsOwnProfile(isOwn)
      setIsSignedInViewer(viewerIsSignedIn)
      setEvents([...memoItems, ...postItems])
    }

    fetchCalendar()
    return () => { active = false }
  }, [targetUserId, lang])

  if (!targetUserId) return null

  return (
    <div className={className}>
      <MinimalCalendar
        events={events}
        isOwnProfile={isOwnProfile}
        isSignedInViewer={isSignedInViewer}
        editable={false}
        lang={lang}
      />
    </div>
  )
}
