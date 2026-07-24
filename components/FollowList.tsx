"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"

type Props = {
  userId: string
  type: "followers" | "following"
}

// 💡 新しいrole構成に対応
type UserRole = "user" | "barista" | "owner" | "admin"

type UserData = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  role: UserRole
}

// タブの選択肢に admin も内包、あるいは適宜割り振り
type RoleTabType = "all" | "barista" | "owner" | "admin" | "user"

export default function FollowList({ userId, type }: Props) {
  const [list, setList] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeRoleTab, setActiveRoleTab] = useState<RoleTabType>("all")

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      const isFollowers = type === "followers"
      const targetColumn = isFollowers ? "follower_id" : "following_id"
      const filterColumn = isFollowers ? "following_id" : "follower_id"

      // 💡 先ほど追加した view_type は、タイムライン等でOrigins/Expertsの特設ページ単位に絞り込む際に使います
      // ここでは、ユーザーのプロフィール画面における「つながり（フォロワー・フォロー中）の一覧」を全件取得します
      const { data, error } = await supabase
        .from("follows")
        .select(`
          user_data:${targetColumn} (
            id,
            username,
            display_name,
            avatar_url,
            role
          )
        `)
        .eq(filterColumn, userId)

      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      const formattedData = (data || [])
        .map((item: any) => item.user_data)
        .filter((user): user is UserData => !!user)

      setList(formattedData)
      setLoading(false)
    }

    if (userId) {
      fetchData()
    }
  }, [userId, type])

  const filteredList = list.filter((user) => {
    if (activeRoleTab === "all") return true
    return user.role === activeRoleTab
  })

  // 各種カウンターの集計
  const baristaCount = list.filter((u) => u.role === "barista").length
  const ownerCount = list.filter((u) => u.role === "owner").length
  const adminCount = list.filter((u) => u.role === "admin").length
  const normalUserCount = list.filter((u) => u.role === "user").length

  if (loading) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto mt-6 animate-pulse">
        <div className="flex gap-2 border-b border-neutral-100 pb-3 overflow-x-auto no-scrollbar">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 bg-neutral-100 rounded-lg w-20 flex-shrink-0" />
          ))}
        </div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 border border-neutral-100 rounded-2xl p-4">
            <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200/60 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-neutral-100 rounded w-1/3" />
              <div className="h-3 bg-neutral-100 rounded w-1/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (list.length === 0) {
    return (
      <div className="p-12 text-center text-xs font-mono text-subtle border border-dashed border-border rounded-2xl max-w-2xl mx-auto mt-6">
        {type === "followers" ? "NO FOLLOWERS YET" : "NO FOLLOWING USERS YET"}
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-6 space-y-6">
      {/* タブメニューメニュー */}
      <div className="flex items-center gap-1.5 border-b border-border pb-2 overflow-x-auto no-scrollbar">
        {(["all", "barista", "owner", "admin", "user"] as RoleTabType[]).map((tab) => {
          const label = {
            all: `すべて (${list.length})`,
            barista: `プロ / 職人 (${baristaCount})`,
            owner: `ロースター・店舗 (${ownerCount})`,
            admin: `運営・管理者 (${adminCount})`,
            user: `愛好家 (${normalUserCount})`,
          }[tab]

          return (
            <button
              key={tab}
              onClick={() => setActiveRoleTab(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition duration-200 ${
                activeRoleTab === tab ? "bg-foreground text-background font-bold" : "text-subtle hover:bg-neutral-50"
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ユーザーリスト一覧 */}
      <div className="space-y-3">
        {filteredList.map((user, index) => (
          <Link
            key={`${user.id}-${index}`}
            href={user.username ? `/user/@${user.username}` : "#"}
            className="flex items-center gap-4 border border-border rounded-2xl p-4 bg-surface hover:bg-neutral-50 transition active:scale-[0.995] group"
          >
            <div className="w-12 h-12 rounded-full relative overflow-hidden border border-border flex-shrink-0">
              {user.avatar_url ? (
                <Image src={user.avatar_url} alt="" fill sizes="48px" className="object-cover" />
              ) : (
                <div className="w-full h-full bg-neutral-50 flex items-center justify-center text-xs font-mono text-zinc-400">☕</div>
              )}
            </div>

            <div className="flex-1 min-w-0 flex items-center justify-between gap-4">
              <div className="flex flex-col min-w-0">
                <p className="font-bold text-sm text-foreground truncate group-hover:underline">
                  {user.display_name || user.username || "名称非公開"}
                </p>
                {user.username && <p className="text-xs font-mono text-subtle truncate mt-0.5">@{user.username}</p>}
              </div>

              {/* ロールバッジ出し分け */}
              <div className="flex-shrink-0">
                {user.role === "barista" && <span className="text-[9px] bg-amber-900 text-amber-50 font-mono font-bold px-2 py-0.5 rounded">PRO</span>}
                {user.role === "owner" && <span className="text-[9px] bg-zinc-900 text-zinc-50 font-mono font-bold px-2 py-0.5 rounded">ROASTER</span>}
                {user.role === "admin" && <span className="text-[9px] bg-red-900 text-red-50 font-mono font-bold px-2 py-0.5 rounded">ADMIN</span>}
                {user.role === "user" && <span className="text-[9px] border border-border text-subtle font-mono px-2 py-0.5 rounded">USER</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
