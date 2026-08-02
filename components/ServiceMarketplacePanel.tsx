"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { formatServicePrice, SERVICE_COPY, SERVICE_TYPES, type ServiceType } from "@/lib/service-marketplace"
import { useAuthModal } from "@/context/AuthModalContext"
import { useAppPopup } from "@/context/AppPopupContext"

type Offering = {
  id: string
  service_type: ServiceType
  title: string
  description: string
  price_yen: number
  delivery_days: number
  duration_minutes: number | null
  is_active: boolean
}

type ServiceOrder = {
  id: string
  request_content: string
  status: "requested" | "accepted" | "rejected" | "in_progress" | "delivered" | "completed" | "canceled"
  amount_yen: number
  created_at: string
  service_offerings: { title: string } | null
}

type Props = {
  providerUserId: string
  providerType: "expert" | "origin"
  originId?: number | null
  lang: "ja" | "en"
  mode?: "public" | "manager" | "buyer"
  className?: string
}

const emptyOffering = (serviceType: ServiceType, lang: "ja" | "en"): Offering => ({
  id: "",
  service_type: serviceType,
  title: SERVICE_COPY[serviceType][lang].title,
  description: SERVICE_COPY[serviceType][lang].description,
  price_yen: 3000,
  delivery_days: 7,
  duration_minutes: serviceType === "online_consultation" ? 45 : null,
  is_active: false,
})

export default function ServiceMarketplacePanel({ providerUserId, providerType, originId = null, lang, mode = "public", className = "" }: Props) {
  const { openAuthModal } = useAuthModal()
  const { showPopup } = useAppPopup()
  const [offerings, setOfferings] = useState<Offering[]>([])
  const [selected, setSelected] = useState<Offering | null>(null)
  const [requestContent, setRequestContent] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [orders, setOrders] = useState<ServiceOrder[]>([])
  const [saving, setSaving] = useState(false)
  const isEn = lang === "en"

  const load = async () => {
    if (mode === "buyer") {
      const { data: orderData, error: orderError } = await supabase
        .from("service_orders")
        .select("id, request_content, status, amount_yen, created_at, service_offerings(title)")
        .eq("buyer_user_id", providerUserId)
        .order("created_at", { ascending: false })
      if (!orderError) setOrders((orderData || []) as unknown as ServiceOrder[])
      return
    }
    let query = supabase.from("service_offerings").select("id, service_type, title, description, price_yen, delivery_days, duration_minutes, is_active").eq("provider_user_id", providerUserId).eq("provider_type", providerType)
    query = originId ? query.eq("origin_id", originId) : query.is("origin_id", null)
    if (mode === "public") query = query.eq("is_active", true)
    const { data, error } = await query.order("created_at")
    if (error) {
      // The migration may not have been applied yet; keep public pages usable.
      if (error.code !== "42P01" && error.code !== "PGRST205") console.error("Service offerings fetch failed:", error)
      setOfferings(mode === "manager" ? SERVICE_TYPES.map((type) => emptyOffering(type, lang)) : [])
      return
    }
    const records = (data || []) as Offering[]
    setOfferings(mode === "manager"
      ? SERVICE_TYPES.map((type) => records.find((item) => item.service_type === type) || emptyOffering(type, lang))
      : records)
    if (mode === "manager") {
      const { data: orderData, error: orderError } = await supabase
        .from("service_orders")
        .select("id, request_content, status, amount_yen, created_at, service_offerings(title)")
        .eq("provider_user_id", providerUserId)
        .order("created_at", { ascending: false })
      if (!orderError) setOrders((orderData || []) as unknown as ServiceOrder[])
    }
  }

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null))
    void load()
  }, [providerUserId, providerType, originId, mode, lang])

  const updateOffering = (type: ServiceType, values: Partial<Offering>) =>
    setOfferings((items) => items.map((item) => item.service_type === type ? { ...item, ...values } : item))

  const saveOffering = async (offering: Offering) => {
    setSaving(true)
    const payload = {
      provider_user_id: providerUserId,
      provider_type: providerType,
      origin_id: providerType === "origin" ? originId : null,
      service_type: offering.service_type,
      title: offering.title.trim(),
      description: offering.description.trim(),
      price_yen: Math.max(3000, Number(offering.price_yen) || 3000),
      delivery_days: Math.max(1, Number(offering.delivery_days) || 7),
      duration_minutes: offering.service_type === "online_consultation" ? Math.max(15, Number(offering.duration_minutes) || 45) : null,
      is_active: offering.is_active,
    }
    const { error } = offering.id
      ? await supabase.from("service_offerings").update(payload).eq("id", offering.id)
      : await supabase.from("service_offerings").insert(payload)
    setSaving(false)
    if (error) return showPopup(isEn ? "Could not save the service." : "サービスを保存できませんでした。", "error")
    showPopup(isEn ? "Service settings saved." : "サービス設定を保存しました。", "success")
    await load()
  }

  const submitRequest = async () => {
    if (!selected) return
    if (!currentUserId) return openAuthModal()
    if (requestContent.trim().length < 20) return showPopup(isEn ? "Please describe your request in at least 20 characters." : "依頼内容を20文字以上で入力してください。", "error")
    setSaving(true)
    const { error } = await supabase.from("service_orders").insert({
      offering_id: selected.id,
      buyer_user_id: currentUserId,
      provider_user_id: providerUserId,
      request_content: requestContent.trim(),
      amount_yen: selected.price_yen,
    })
    setSaving(false)
    if (error) return showPopup(isEn ? "Could not send your request." : "依頼を送信できませんでした。", "error")
    setSelected(null)
    setRequestContent("")
    showPopup(isEn ? "Your request has been sent. Payment instructions will follow after acceptance." : "依頼を送信しました。受付後に支払い方法をご案内します。", "success")
  }

  const updateOrderStatus = async (orderId: string, status: ServiceOrder["status"]) => {
    const { error } = await supabase.rpc("update_service_order_status", {
      p_order_id: orderId,
      p_status: status,
    })
    if (error) return showPopup(isEn ? "Could not update the request." : "依頼の状態を更新できませんでした。", "error")
    await load()
  }

  if (mode === "public" && offerings.length === 0) return null

  if (mode === "buyer") return (
    <section className={`rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8 ${className}`}>
      <div className="flex items-end justify-between border-b border-neutral-200 pb-5">
        <div><p className="text-[10px] font-bold tracking-[0.18em] text-neutral-400">REQUESTS</p><h2 className="mt-2 text-xl font-bold">{isEn ? "Your service requests" : "送信したサービス依頼"}</h2></div>
        <span className="text-[10px] text-neutral-400">{orders.length} ITEMS</span>
      </div>
      {orders.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-neutral-200 px-5 py-8 text-center text-xs text-neutral-400">{isEn ? "No service requests yet." : "送信したサービス依頼はまだありません。"}</p> : <div className="mt-5 space-y-3">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-neutral-200 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold">{order.service_offerings?.title || (isEn ? "Service request" : "サービス依頼")}</p><p className="mt-1 text-[10px] text-neutral-400">{new Date(order.created_at).toLocaleDateString(isEn ? "en-US" : "ja-JP")} · {formatServicePrice(order.amount_yen, lang)} · {order.status}</p></div>{order.status === "requested" && <button type="button" onClick={() => void updateOrderStatus(order.id, "canceled")} className="rounded-xl border border-neutral-200 px-4 py-2 text-[10px] font-semibold">{isEn ? "Cancel request" : "依頼を取り消す"}</button>}{order.status === "delivered" && <button type="button" onClick={() => void updateOrderStatus(order.id, "completed")} className="rounded-xl bg-neutral-950 px-4 py-2 text-[10px] font-semibold text-white">{isEn ? "Confirm completion" : "完了を確認"}</button>}</div><p className="mt-4 whitespace-pre-wrap text-xs leading-6 text-neutral-600">{order.request_content}</p></article>)}</div>}
    </section>
  )

  return (
    <section className={`rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8 ${className}`}>
      <div className="border-b border-neutral-200 pb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">SERVICES</p>
        <h2 className="mt-2 text-xl font-bold text-neutral-900">{isEn ? "Coffee expertise, available by request" : "コーヒーの知識・技術を依頼する"}</h2>
        <p className="mt-2 text-xs leading-6 text-neutral-500">{isEn ? "Start with one clearly scoped request. Monthly membership is not required." : "月額契約ではなく、必要な内容を一件ずつ依頼できます。"}</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {offerings.map((offering) => (
          <article key={offering.service_type} className="flex flex-col rounded-2xl border border-neutral-200 bg-neutral-50/50 p-5">
            {mode === "manager" ? (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">{SERVICE_COPY[offering.service_type][lang].title}</p>
                <input value={offering.title} maxLength={100} onChange={(event) => updateOffering(offering.service_type, { title: event.target.value })} className="mt-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-neutral-500" />
                <textarea value={offering.description} maxLength={2000} rows={5} onChange={(event) => updateOffering(offering.service_type, { description: event.target.value })} className="mt-3 resize-none rounded-xl border border-neutral-200 bg-white px-4 py-3 text-xs leading-6 outline-none focus:border-neutral-500" />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-semibold text-neutral-500">{isEn ? "PRICE (JPY)" : "価格（円）"}<input type="number" min={3000} step={500} value={offering.price_yen} onChange={(event) => updateOffering(offering.service_type, { price_yen: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs" /></label>
                  <label className="text-[10px] font-semibold text-neutral-500">{isEn ? "DELIVERY DAYS" : "納期（日）"}<input type="number" min={1} max={90} value={offering.delivery_days} onChange={(event) => updateOffering(offering.service_type, { delivery_days: Number(event.target.value) })} className="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs" /></label>
                </div>
                <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-neutral-600"><input type="checkbox" checked={offering.is_active} onChange={(event) => updateOffering(offering.service_type, { is_active: event.target.checked })} />{isEn ? "Accept requests" : "依頼を受け付ける"}</label>
                <button type="button" disabled={saving || !offering.title.trim() || !offering.description.trim()} onClick={() => void saveOffering(offering)} className="mt-5 rounded-xl bg-neutral-950 px-4 py-3 text-xs font-semibold text-white disabled:opacity-40">{isEn ? "Save" : "設定を保存"}</button>
              </>
            ) : (
              <>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400">{SERVICE_COPY[offering.service_type][lang].title}</p>
                <h3 className="mt-3 text-base font-bold text-neutral-900">{offering.title}</h3>
                <p className="mt-3 flex-1 text-xs leading-6 text-neutral-600">{offering.description}</p>
                <div className="mt-5 flex items-end justify-between border-t border-neutral-200 pt-4"><span className="text-lg font-bold">{formatServicePrice(offering.price_yen, lang)}</span><span className="text-[10px] text-neutral-400">{isEn ? `${offering.delivery_days} days` : `目安 ${offering.delivery_days}日`}</span></div>
                {currentUserId !== providerUserId && <button type="button" onClick={() => setSelected(offering)} className="mt-4 rounded-xl bg-neutral-950 px-4 py-3 text-xs font-semibold text-white">{isEn ? "Request this service" : "このサービスを依頼"}</button>}
              </>
            )}
          </article>
        ))}
      </div>

      {mode === "manager" && <div className="mt-8 border-t border-neutral-200 pt-7"><div className="flex items-end justify-between"><div><p className="text-[10px] font-bold tracking-[0.18em] text-neutral-400">REQUESTS</p><h3 className="mt-2 text-base font-bold">{isEn ? "Incoming service requests" : "届いたサービス依頼"}</h3></div><span className="text-[10px] text-neutral-400">{orders.length} ITEMS</span></div>{orders.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-neutral-200 px-5 py-8 text-center text-xs text-neutral-400">{isEn ? "No requests yet." : "届いた依頼はまだありません。"}</p> : <div className="mt-5 space-y-3">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-neutral-200 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold">{order.service_offerings?.title || (isEn ? "Service request" : "サービス依頼")}</p><p className="mt-1 text-[10px] text-neutral-400">{new Date(order.created_at).toLocaleDateString(isEn ? "en-US" : "ja-JP")} · {formatServicePrice(order.amount_yen, lang)} · {order.status}</p></div>{order.status === "requested" && <div className="flex gap-2"><button type="button" onClick={() => void updateOrderStatus(order.id, "rejected")} className="rounded-xl border border-neutral-200 px-4 py-2 text-[10px] font-semibold">{isEn ? "Decline" : "見送る"}</button><button type="button" onClick={() => void updateOrderStatus(order.id, "accepted")} className="rounded-xl bg-neutral-950 px-4 py-2 text-[10px] font-semibold text-white">{isEn ? "Accept" : "受け付ける"}</button></div>}{order.status === "accepted" && <button type="button" onClick={() => void updateOrderStatus(order.id, "in_progress")} className="rounded-xl bg-neutral-950 px-4 py-2 text-[10px] font-semibold text-white">{isEn ? "Start work" : "対応を開始"}</button>}{order.status === "in_progress" && <button type="button" onClick={() => void updateOrderStatus(order.id, "delivered")} className="rounded-xl bg-neutral-950 px-4 py-2 text-[10px] font-semibold text-white">{isEn ? "Mark delivered" : "納品済みにする"}</button>}</div><p className="mt-4 whitespace-pre-wrap text-xs leading-6 text-neutral-600">{order.request_content}</p></article>)}</div>}</div>}

      {selected && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><p className="text-[10px] font-bold tracking-[0.18em] text-neutral-400">SERVICE REQUEST</p><h3 className="mt-2 text-xl font-bold">{selected.title}</h3><p className="mt-2 text-xs text-neutral-500">{formatServicePrice(selected.price_yen, lang)} · {isEn ? "Payment instructions follow acceptance" : "受付後に支払い方法をご案内"}</p><textarea autoFocus value={requestContent} onChange={(event) => setRequestContent(event.target.value)} maxLength={5000} rows={7} placeholder={isEn ? "Describe your current situation, goal, and relevant data..." : "現在の状況、目標、確認してほしい内容を入力してください…"} className="mt-6 w-full resize-none rounded-2xl border border-neutral-200 p-4 text-sm leading-7 outline-none focus:border-neutral-500" /><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-neutral-200 px-5 py-3 text-xs font-semibold">{isEn ? "Cancel" : "キャンセル"}</button><button type="button" disabled={saving} onClick={() => void submitRequest()} className="rounded-xl bg-neutral-950 px-5 py-3 text-xs font-semibold text-white disabled:opacity-40">{isEn ? "Send request" : "依頼を送信"}</button></div></div></div>}
    </section>
  )
}
