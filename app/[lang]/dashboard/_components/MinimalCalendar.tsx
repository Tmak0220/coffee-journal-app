"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAppPopup } from "@/context/AppPopupContext"

export type VisibilityType = "draft" | "private" | "members" | "public"

type EventStub = {
  id: string
  title: string
  event_date: string
  end_date?: string | null
  type: "report" | "memo"
  memo?: string | null
  image_url?: string | null
  visibility?: VisibilityType
}

type Props = {
  events?: EventStub[]
  onDateClick?: (date: string) => void
  onEventDelete?: (id: string, type: "report" | "memo") => void
  onEventUpdate?: (
    id: string, 
    type: "report" | "memo", 
    newMemo: string, 
    newTitle: string, 
    newStartDate: string, 
    newEndDate: string
  ) => void
  lang?: "ja" | "en" 
  isOwnProfile?: boolean
  isSignedInViewer?: boolean
  editable?: boolean
}

const calendarDict = {
  ja: {
    edit: "編集",
    cancel: "キャンセル",
    save: "保存",
    saving: "保存中...",
    delete: "削除する",
    deleting: "削除中...",
    back: "戻る",
    noMemo: "詳細メモはありません",
    editItem: "内容を編集",
    editTitle: "タイトル",
    editMemo: "メモ内容",
    editStartDate: "開始日",
    editEndDate: "終了日（任意）",
    placeholderTitle: "タイトルを入力...",
    placeholderMemo: "メモを入力...",
    confirmDeleteMemo: "この簡易メモを削除しますか？",
    confirmDeleteReport: "このレポートを削除しますか？",
    moreItems: (count: number) => `他 ${count} 件`,
    failedDelete: "削除に失敗しました",
    failedSave: "保存に失敗しました",
    visDraft: "下書き",
    visPrivate: "非公開",
    visMembers: "限定",
    visPublic: "公開",
  },
  en: {
    edit: "Edit",
    cancel: "Cancel",
    save: "Save",
    saving: "Saving...",
    delete: "Delete",
    deleting: "Deleting...",
    back: "Back",
    noMemo: "No description available",
    editItem: "Edit Item",
    editTitle: "Title",
    editMemo: "Memo",
    editStartDate: "Start Date",
    editEndDate: "End Date (Optional)",
    placeholderTitle: "Event title...",
    placeholderMemo: "Write a description...",
    confirmDeleteMemo: "Delete this memo?",
    confirmDeleteReport: "Delete this report?",
    moreItems: (count: number) => `And ${count} more`,
    failedDelete: "Failed to delete",
    failedSave: "Failed to save",
    visDraft: "Draft",
    visPrivate: "Private",
    visMembers: "Members",
    visPublic: "Public",
  }
}

const visBadgeStyle: Record<VisibilityType, { bg: string; text: string; border: string }> = {
  draft: { bg: "bg-neutral-100", text: "text-neutral-500", border: "border-neutral-200" },
  private: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200/60" },
  members: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200/60" },
  public: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200/60" },
}

export default function MinimalCalendar({ 
  events = [], 
  onDateClick, 
  onEventDelete, 
  onEventUpdate,
  lang = "ja",
  isOwnProfile = false,
  isSignedInViewer = false,
  editable = false
}: Props) {
  const t = calendarDict[lang]
  const { showPopup } = useAppPopup()

  const [currentDate, setCurrentDate] = useState(new Date())
  
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [editTitleValue, setEditTitleValue] = useState<string>("") 
  const [editMemoValue, setEditMemoValue] = useState<string>("") 
  const [editStartDateValue, setEditStartDateValue] = useState<string>("")
  const [editEndDateValue, setEditEndDateValue] = useState<string>("")
  const [isSaving, setIsSaving] = useState<boolean>(false)

  const [activePopupDate, setActivePopupDate] = useState<string | null>(null)
  
  const calendarRef = useRef<HTMLDivElement>(null)

  // 表示フィルタリングロジック
  const visibleEvents = useMemo(() => {
    // ダッシュボードでは draft を含む全件を表示する
    if (editable) return events

    // 公開ページでは draft を表示しない。private は投稿者本人だけが閲覧できる。
    return events.filter((ev) => {
      const vis = ev.visibility || "public"
      if (vis === "draft") return false
      if (vis === "private") return isOwnProfile
      if (vis === "public") return true
      if (vis === "members" && isSignedInViewer) return true
      return false
    })
  }, [events, editable, isOwnProfile, isSignedInViewer])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  
  const blanks = Array(firstDayOfMonth).fill(null)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const calendarCells = [...blanks, ...days]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(e.target as Node)) {
        setActivePopupDate(null)
        setEditingId(null)
        setDeleteConfirmId(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const getRangeStatus = (dayNum: number) => {
    const targetStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
    const targetTime = new Date(targetStr).getTime()

    let isStart = false
    let isEnd = false
    let isBetween = false

    for (const ev of visibleEvents) {
      if (!ev.event_date) continue
      const startTime = new Date(ev.event_date).getTime()
      
      if (ev.end_date) {
        const endTime = new Date(ev.end_date).getTime()
        
        if (targetTime === startTime) {
          isStart = true
        } else if (targetTime === endTime) {
          isEnd = true
        } else if (targetTime > startTime && targetTime < endTime) {
          isBetween = true
        }
      }
    }

    return { isStart, isEnd, isBetween }
  }

  const getEventsForDate = (dayNum: number) => {
    const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
    return visibleEvents.filter(e => {
      if (e.event_date === formattedDate) return true
      if (e.end_date) {
        const t = new Date(formattedDate).getTime()
        const s = new Date(e.event_date).getTime()
        const ed = new Date(e.end_date).getTime()
        return t >= s && t <= ed
      }
      return false
    })
  }

  const handleDeleteItem = async (e: React.MouseEvent, eventId: string, type: "report" | "memo") => {
    e.stopPropagation() 
    e.preventDefault()
    if (!editable) return
    
    setDeletingId(eventId)
    try {
      const table = type === "memo" ? "calendar_memos" : "posts"
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", eventId)

      if (error) throw error
      onEventDelete?.(eventId, type)
      setDeleteConfirmId(null)
      setActivePopupDate(null)
    } catch (err: any) {
      showPopup(
        lang === "ja" ? "削除できませんでした。時間をおいて、もう一度お試しください。" : "We couldn't delete this item. Please wait a moment and try again.",
        "error",
        lang === "ja" ? "削除に失敗しました" : "Unable to delete"
      )
    } finally {
      setDeletingId(null)
    }
  }

  const handleSaveEvent = async (e: React.MouseEvent, eventId: string, type: "report" | "memo") => {
    e.stopPropagation()
    e.preventDefault()
    if (!editable) return
    if (editTitleValue.length > 40) {
      showPopup(lang === "ja" ? "タイトルは40文字以内に収めてください。" : "Please keep the title to 40 characters or fewer.", "info", lang === "ja" ? "文字数をご確認ください" : "Check the title length")
      return
    }
    if (editMemoValue.length > 400) {
      showPopup(lang === "ja" ? "メモは400文字以内に収めてください。" : "Please keep the memo to 400 characters or fewer.", "info", lang === "ja" ? "文字数をご確認ください" : "Check the memo length")
      return
    }
    setIsSaving(true)

    try {
      const table = type === "memo" ? "calendar_memos" : "posts"
      const dateColumn = type === "memo" ? "start_date" : "event_date"
      
      const updateData = {
        title: editTitleValue,
        memo: editMemoValue,
        [dateColumn]: editStartDateValue,
        end_date: editEndDateValue || null
      }

      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq("id", eventId)

      if (error) throw error
      
      onEventUpdate?.(eventId, type, editMemoValue, editTitleValue, editStartDateValue, editEndDateValue)
      setEditingId(null)
      setActivePopupDate(null)
    } catch (err: any) {
      showPopup(
        lang === "ja" ? "変更を保存できませんでした。時間をおいて、もう一度お試しください。" : "We couldn't save your changes. Please wait a moment and try again.",
        "error",
        lang === "ja" ? "保存に失敗しました" : "Unable to save"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const weekdayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

  return (
    <div 
      ref={calendarRef} 
      className="mx-auto w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-neutral-100 select-none">
        <span className="text-sm sm:text-base font-semibold tracking-wider text-neutral-800">
          {year} / {String(month + 1).padStart(2, "0")}
        </span>
        <div className="flex gap-1">
          <button 
            type="button" 
            onClick={prevMonth} 
            className="p-1.5 text-neutral-400 hover:text-neutral-800 text-xs transition-colors rounded-full hover:bg-neutral-50"
          >
            ←
          </button>
          <button 
            type="button" 
            onClick={nextMonth} 
            className="p-1.5 text-neutral-400 hover:text-neutral-800 text-xs transition-colors rounded-full hover:bg-neutral-50"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center mt-3 sm:mt-4">
        {weekdayLabels.map((label, idx) => (
          <span 
            key={label} 
            className={`text-[9px] font-bold tracking-widest ${idx === 0 || idx === 6 ? "text-neutral-300" : "text-neutral-400"}`}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1.5 sm:gap-y-2 mt-2 sm:mt-3">
        {calendarCells.map((day, index) => {
          if (day === null) {
            return <div key={`blank-${index}`} className="aspect-square" />
          }

          const dayEvents = getEventsForDate(day)
          const hasEvents = dayEvents.length > 0
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const dayOfWeek = index % 7

          const { isStart, isEnd, isBetween } = getRangeStatus(day)
          const isPopupOpen = activePopupDate === dateStr

          let rangeBgClass = ""
          if (isStart) {
            rangeBgClass = `bg-red-50/70 text-red-900 border border-r-0 border-red-200/40 rounded-l-full ${dayOfWeek === 6 ? "rounded-r-full border-r" : ""}`
          } else if (isEnd) {
            rangeBgClass = `bg-red-50/70 text-red-900 border border-l-0 border-red-200/40 rounded-r-full ${dayOfWeek === 0 ? "rounded-l-full border-l" : ""}`
          } else if (isBetween) {
            if (dayOfWeek === 0) {
              rangeBgClass = "bg-red-50/40 text-red-900 border border-red-100/40 border-r-0 rounded-l-lg"
            } else if (dayOfWeek === 6) {
              rangeBgClass = "bg-red-50/40 text-red-900 border border-red-100/40 border-l-0 rounded-r-lg"
            } else {
              rangeBgClass = "bg-red-50/40 text-red-900 border-y border-red-100/40"
            }
          }

          return (
            <div
              key={`day-${day}`}
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                if (hasEvents) {
                  setActivePopupDate(isPopupOpen ? null : dateStr)
                  setEditingId(null)
                  setDeleteConfirmId(null)
                } else if (editable) {
                  onDateClick?.(dateStr)
                }
              }}
              onKeyDown={(e) => { 
                if (e.key === "Enter" || e.key === " ") { 
                  if (hasEvents) {
                    setActivePopupDate(isPopupOpen ? null : dateStr)
                  } else if (editable) {
                    onDateClick?.(dateStr)
                  }
                } 
              }}
              className={`relative aspect-square w-full py-1 flex flex-col items-center justify-center text-[12px] sm:text-[13px] transition-all duration-200 cursor-pointer select-none overflow-visible ${rangeBgClass} ${isPopupOpen ? "z-30" : "z-10"}`}
            >
              <span className={`font-medium z-10 ${isStart || isEnd ? "text-red-600 font-bold" : "text-neutral-700 hover:text-neutral-900"}`}>
                {day}
              </span>
              
              {hasEvents && !isBetween && (
                <div className="absolute bottom-1 flex gap-1 justify-center items-center z-10 max-w-[80%] overflow-hidden">
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <span 
                      key={ev.id + i} 
                      className={`w-1 h-1 rounded-full shrink-0 ${
                        isStart || isEnd 
                          ? (ev.type === "report" ? "bg-red-500" : "bg-red-300") 
                          : (ev.type === "report" ? "bg-neutral-800" : "bg-neutral-300")
                      }`} 
                    />
                  ))}
                </div>
              )}

              {isBetween && (
                <div className={`absolute h-[2px] bg-red-300/30 top-[50%] -translate-y-[50%] pointer-events-none ${
                  dayOfWeek === 0 ? "left-1.5 w-[calc(100%-6px)]" : 
                  dayOfWeek === 6 ? "right-1.5 w-[calc(100%-6px)]" : "w-full"
                }`} />
              )}

              {hasEvents && isPopupOpen && (
                <div 
                  className="absolute bottom-[90%] left-1/2 -translate-x-1/2 pb-3 flex flex-col items-center pointer-events-auto z-50 w-max max-w-[calc(100vw-2rem)] sm:max-w-[280px] transition-all"
                  onClick={(e) => {
                    e.stopPropagation()
                  }} 
                >
                  <div className="bg-white border border-neutral-200 text-neutral-800 text-[11.5px] sm:text-[12px] rounded-2xl py-3 px-4 shadow-xl space-y-3 w-full">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const isConfirmingDelete = deleteConfirmId === ev.id
                      const isEditing = editingId === ev.id

                      const visKey = ev.visibility || "draft"
                      const badgeStyle = visBadgeStyle[visKey]
                      const visLabel = visKey === "draft" ? t.visDraft : visKey === "private" ? t.visPrivate : visKey === "members" ? t.visMembers : t.visPublic

                      return (
                        <div key={ev.id} className="flex flex-col gap-1.5 text-left border-b border-neutral-100 last:border-0 pb-2.5 last:pb-0">
                          
                          {!isConfirmingDelete && !isEditing && (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-1.5 flex-wrap max-w-[160px]">
                                  <span className="font-bold text-neutral-900 leading-snug break-words">
                                    {ev.title}
                                  </span>
                                  
                                  {editable && (
                                    <span className={`text-[8.5px] font-semibold px-1 py-0.2 rounded border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border} shrink-0`}>
                                      {visLabel}
                                    </span>
                                  )}
                                </div>

                                {editable && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setEditingId(ev.id)
                                        setEditTitleValue(ev.title || "")
                                        setEditMemoValue(ev.memo || "")
                                        setEditStartDateValue(ev.event_date || "")
                                        setEditEndDateValue(ev.end_date || "")
                                      }}
                                      className="text-neutral-400 hover:text-neutral-700 text-[10.5px] px-1 py-0.5 rounded transition-colors hover:bg-neutral-50"
                                    >
                                      {t.edit}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setDeleteConfirmId(ev.id)
                                      }}
                                      className="text-neutral-400 hover:text-red-500 text-[11px] p-0.5 transition-colors rounded hover:bg-neutral-50"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              <p className="text-[11px] text-neutral-500 font-normal leading-relaxed whitespace-pre-wrap max-w-[200px]">
                                {ev.memo ? ev.memo : <span className="italic text-neutral-300">{t.noMemo}</span>}
                              </p>
                            </>
                          )}

                          {isEditing && editable && (
                            <div className="flex flex-col gap-2 min-w-[200px]">
                              <span className="font-semibold text-neutral-400 text-[9px] uppercase tracking-wider">{t.editItem}</span>
                              
                              <div className="flex flex-col gap-0.5">
                                <label className="text-[9px] text-neutral-400 uppercase font-semibold">{t.editTitle}</label>
                                <input
                                  type="text"
                                  maxLength={40}
                                  value={editTitleValue}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    setEditTitleValue(e.target.value)
                                  }}
                                  className="w-full text-[11px] px-2 py-1 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-neutral-50 text-neutral-800"
                                  placeholder={t.placeholderTitle}
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-1.5">
                                <div className="flex flex-col gap-0.5">
                                  <label className="text-[9px] text-neutral-400 uppercase font-semibold">{t.editStartDate}</label>
                                  <input
                                    type="date"
                                    value={editStartDateValue}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      setEditStartDateValue(e.target.value)
                                    }}
                                    className="w-full text-[10px] px-1.5 py-1 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-neutral-50 text-neutral-800"
                                  />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <label className="text-[9px] text-neutral-400 uppercase font-semibold">{t.editEndDate}</label>
                                  <input
                                    type="date"
                                    value={editEndDateValue}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      setEditEndDateValue(e.target.value)
                                    }}
                                    className="w-full text-[10px] px-1.5 py-1 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-neutral-50 text-neutral-800"
                                  />
                                </div>
                              </div>

                              <div className="flex flex-col gap-0.5">
                                <label className="text-[9px] text-neutral-400 uppercase font-semibold">{t.editMemo}</label>
                                <textarea
                                  maxLength={400}
                                  value={editMemoValue}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    setEditMemoValue(e.target.value)
                                  }}
                                  className="w-full text-[11px] p-1.5 border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-400 bg-neutral-50 text-neutral-800 resize-none"
                                  rows={2}
                                  placeholder={t.placeholderMemo}
                                />
                              </div>

                              <div className="flex justify-end gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingId(null)
                                  }}
                                  className="text-[10px] text-neutral-400 hover:text-neutral-600 px-2 py-1 rounded bg-neutral-50 hover:bg-neutral-100 transition-colors"
                                >
                                  {t.cancel}
                                </button>
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={(e) => handleSaveEvent(e, ev.id, ev.type)}
                                  className="text-[10px] text-white bg-neutral-900 hover:bg-neutral-800 px-2.5 py-1 rounded shadow-xs disabled:opacity-50 font-medium transition-colors"
                                >
                                  {isSaving ? t.saving : t.save}
                                </button>
                              </div>
                            </div>
                          )}

                          {isConfirmingDelete && editable && (
                            <div className="bg-red-50/40 border border-red-100/50 rounded-xl p-2.5 text-center space-y-2 min-w-[180px]">
                              <p className="text-[10.5px] text-red-700 font-semibold leading-normal">
                                {ev.type === "memo" ? t.confirmDeleteMemo : t.confirmDeleteReport}
                              </p>
                              <div className="flex justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteConfirmId(null)
                                  }}
                                  className="text-[9.5px] text-neutral-500 bg-white border border-neutral-100 hover:bg-neutral-50 px-2.5 py-1 rounded-md transition-colors"
                                >
                                  {t.back}
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingId === ev.id}
                                  onClick={(e) => handleDeleteItem(e, ev.id, ev.type)}
                                  className="text-[9.5px] text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-md font-medium transition-colors"
                                >
                                  {deletingId === ev.id ? t.deleting : t.delete}
                                </button>
                              </div>
                            </div>
                          )}

                        </div>
                      )
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[9.5px] text-neutral-400 text-right font-light">
                        {t.moreItems(dayEvents.length - 3)}
                      </div>
                    )}
                  </div>
                  <div className="w-2 h-2 bg-white border-r border-b border-neutral-200 rotate-45 -mt-1 shadow-xs pointer-events-none" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
