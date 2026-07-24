"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Option = {
  id: string
  name: string
  name_ja: string | null
  group?: string | null
}

type Props = {
  lang: "ja" | "en"
}

const TASTE_GROUP_ORDER = ["flavor", "mouthfeel", "aftertaste"]
const GEAR_GROUP_ORDER = [
  "dripper_conical",
  "dripper_flat_bottom",
  "dripper_trapezoid",
  "immersion_dropper",
  "aeropress",
  "french_press",
  "siphon",
  "moka_pot",
  "espresso_machine",
  "grinder_hand",
  "grinder_electric",
  "filter_paper",
  "filter_metal",
  "filter_cloth",
  "kettle",
  "server",
  "scale",
]

export default function AdvancedSearchForm({ lang }: Props) {
  const router = useRouter()
  const isEn = lang === "en"
  const [varieties, setVarieties] = useState<Option[]>([])
  const [processes, setProcesses] = useState<Option[]>([])
  const [tastes, setTastes] = useState<Option[]>([])
  const [gears, setGears] = useState<Option[]>([])
  const [varietyId, setVarietyId] = useState("")
  const [processId, setProcessId] = useState("")
  const [tasteIds, setTasteIds] = useState<string[]>([])
  const [gearIds, setGearIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const loadOptions = async () => {
      const [varietyResult, processResult, tasteResult, gearResult] = await Promise.all([
        supabase.from("varieties").select("id, name, name_ja").order("name"),
        supabase.from("processes").select("id, name, name_ja").order("name"),
        supabase.from("tastes").select("id, name, name_ja, attribute_type").order("sort_order"),
        supabase.from("gears").select("id, name, name_ja, type").order("name"),
      ])
      if (!cancelled) {
        setVarieties((varietyResult.data || []).map((item) => ({ ...item, id: String(item.id) })))
        setProcesses((processResult.data || []).map((item) => ({ ...item, id: String(item.id) })))
        setTastes((tasteResult.data || []).map((item: any) => ({ ...item, id: String(item.id), group: item.attribute_type })))
        setGears((gearResult.data || []).map((item: any) => ({ ...item, id: String(item.id), group: item.type })))
        setLoading(false)
      }
    }
    loadOptions()
    return () => { cancelled = true }
  }, [])

  const label = (option: Option) => isEn ? option.name : (option.name_ja || option.name)
  const selectedCount = Number(Boolean(varietyId)) + Number(Boolean(processId)) + tasteIds.length + gearIds.length
  const canSearch = selectedCount > 0

  const tasteGroupLabels: Record<string, string> = isEn
    ? { flavor: "Flavor", mouthfeel: "Mouthfeel", aftertaste: "Aftertaste", other: "Other" }
    : { flavor: "フレーバー", mouthfeel: "マウスフィール", aftertaste: "余韻・アフターテイスト", other: "その他" }
  const gearGroupLabels: Record<string, string> = isEn
    ? {
        dripper_conical: "Conical Drippers",
        dripper_flat_bottom: "Flat-bottom Drippers",
        dripper_trapezoid: "Trapezoid Drippers",
        immersion_dropper: "Immersion Drippers",
        aeropress: "AeroPress",
        french_press: "French Press",
        siphon: "Siphon",
        moka_pot: "Moka Pot",
        espresso_machine: "Espresso Machines",
        grinder_hand: "Hand Grinders",
        grinder_electric: "Electric Grinders",
        filter_paper: "Paper Filters",
        filter_metal: "Metal Filters",
        filter_cloth: "Cloth Filters",
        kettle: "Kettles",
        server: "Servers",
        scale: "Scales",
        other: "Other",
      }
    : {
        dripper_conical: "円すい型ドリッパー",
        dripper_flat_bottom: "平底型ドリッパー",
        dripper_trapezoid: "台形型ドリッパー",
        immersion_dropper: "浸漬式ドリッパー",
        aeropress: "エアロプレス",
        french_press: "フレンチプレス",
        siphon: "サイフォン",
        moka_pot: "モカポット",
        espresso_machine: "エスプレッソマシン",
        grinder_hand: "手挽きグラインダー",
        grinder_electric: "電動グラインダー",
        filter_paper: "ペーパーフィルター",
        filter_metal: "金属フィルター",
        filter_cloth: "布フィルター",
        kettle: "ケトル",
        server: "サーバー",
        scale: "スケール",
        other: "その他",
      }

  const groupedTastes = useMemo(() => {
    const groups = new Map<string, Option[]>()
    tastes.forEach((taste) => {
      const group = TASTE_GROUP_ORDER.includes(taste.group || "") ? taste.group! : "other"
      groups.set(group, [...(groups.get(group) || []), taste])
    })
    return [...TASTE_GROUP_ORDER, "other"]
      .map((group) => ({ group, items: groups.get(group) || [] }))
      .filter(({ items }) => items.length > 0)
  }, [tastes])

  const groupedGears = useMemo(() => {
    const groups = new Map<string, Option[]>()
    gears.forEach((gear) => {
      const group = GEAR_GROUP_ORDER.includes(gear.group || "") ? gear.group! : "other"
      groups.set(group, [...(groups.get(group) || []), gear])
    })
    return [...GEAR_GROUP_ORDER, "other"]
      .map((group) => ({ group, items: groups.get(group) || [] }))
      .filter(({ items }) => items.length > 0)
  }, [gears])

  const toggle = (id: string, values: string[], setter: (value: string[]) => void, max: number) => {
    if (values.includes(id)) setter(values.filter((value) => value !== id))
    else if (values.length < max) setter([...values, id])
  }

  const submit = () => {
    if (!canSearch) return
    const params = new URLSearchParams()
    if (varietyId) params.set("variety_id", varietyId)
    if (processId) params.set("process_id", processId)
    if (tasteIds.length) params.set("taste_ids", tasteIds.join(","))
    if (gearIds.length) params.set("gear_ids", gearIds.join(","))
    router.push(`/${lang}/search/result?${params.toString()}`)
  }

  const reset = () => {
    setVarietyId("")
    setProcessId("")
    setTasteIds([])
    setGearIds([])
  }

  const SelectField = ({
    title,
    value,
    onChange,
    options,
    placeholder,
  }: {
    title: string
    value: string
    onChange: (value: string) => void
    options: Option[]
    placeholder: string
  }) => (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold tracking-[0.08em] text-foreground/75">{title}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-foreground outline-none transition focus:border-foreground/50"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{label(option)}</option>)}
      </select>
    </label>
  )

  if (loading) {
    return <div className="mt-10 h-80 animate-pulse rounded-[28px] bg-neutral-50" />
  }

  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="space-y-8">
        <div className="grid gap-5 sm:grid-cols-2 sm:gap-8">
          <SelectField
            title={isEn ? "VARIETY" : "品種"}
            value={varietyId}
            onChange={setVarietyId}
            options={varieties}
            placeholder={isEn ? "Any variety" : "すべての品種"}
          />
          <SelectField
            title={isEn ? "PROCESS" : "精製方法"}
            value={processId}
            onChange={setProcessId}
            options={processes}
            placeholder={isEn ? "Any process" : "すべての精製方法"}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-8">
          <div>
            <div className="mb-2 flex items-end justify-between">
              <span className="text-xs font-semibold tracking-[0.08em] text-foreground/75">{isEn ? "GEAR" : "器具"}</span>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-foreground/60">{isEn ? "Up to 3" : "最大3件"}</span>
            </div>
            <div className="max-h-[390px] overflow-y-auto rounded-2xl border border-border bg-surface p-3">
              <div className="space-y-6">
                {groupedGears.map(({ group, items }) => (
                  <div key={group} className="border-b border-border/60 pb-5 last:border-0 last:pb-0">
                    <div className="sticky top-0 z-10 mb-2.5 flex items-center justify-between rounded-lg bg-neutral-100/95 px-3 py-2 backdrop-blur">
                      <span className="text-[11px] font-semibold tracking-wide text-foreground/75">
                        {gearGroupLabels[group] || group.replaceAll("_", " ")}
                      </span>
                      <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[9px] text-subtle">{items.length}</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {items.map((gear) => {
                        const selected = gearIds.includes(gear.id)
                        return (
                          <button
                            key={gear.id}
                            type="button"
                            onClick={() => toggle(gear.id, gearIds, setGearIds, 3)}
                            disabled={!selected && gearIds.length >= 3}
                            className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition disabled:opacity-30 ${
                              selected
                                ? "border-foreground bg-foreground font-semibold text-background shadow-sm"
                                : "border-transparent bg-neutral-50/80 text-foreground/85 hover:border-border hover:bg-white"
                            }`}
                          >
                            <span className="block truncate font-medium">{label(gear)}</span>
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                              selected ? "border-white/50 bg-white text-black" : "border-neutral-300 text-transparent"
                            }`}>✓</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-end justify-between">
              <span className="text-xs font-semibold tracking-[0.08em] text-foreground/75">{isEn ? "FLAVOR & SENSORY" : "フレーバー・味覚特性"}</span>
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-foreground/60">{isEn ? "Up to 4" : "最大4件"}</span>
            </div>
            <div className="max-h-[390px] overflow-y-auto rounded-2xl border border-border bg-surface p-3">
              <div className="space-y-6">
                {groupedTastes.map(({ group, items }) => (
                  <div key={group} className="border-b border-border/60 pb-5 last:border-0 last:pb-0">
                    <div className="sticky top-0 z-10 mb-2.5 flex items-center justify-between rounded-lg bg-neutral-100/95 px-3 py-2 backdrop-blur">
                      <span className="text-[11px] font-semibold tracking-wide text-foreground/75">{tasteGroupLabels[group] || group}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[9px] text-subtle">{items.length}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                      {items.map((taste) => {
                        const selected = tasteIds.includes(taste.id)
                        return (
                          <button
                            key={taste.id}
                            type="button"
                            onClick={() => toggle(taste.id, tasteIds, setTasteIds, 4)}
                            disabled={!selected && tasteIds.length >= 4}
                            className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs transition disabled:opacity-30 ${
                              selected
                                ? "border-foreground bg-foreground font-semibold text-background shadow-sm"
                                : "border-transparent bg-neutral-50/80 text-foreground/85 hover:border-border hover:bg-white"
                            }`}
                          >
                            <span className="block truncate font-medium">{label(taste)}</span>
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] ${
                              selected ? "border-white/50 bg-white text-black" : "border-neutral-300 text-transparent"
                            }`}>✓</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-subtle">
          {isEn ? `${selectedCount} filters selected` : `${selectedCount}件の条件を選択中`}
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={reset} disabled={!canSearch} className="rounded-full border border-border px-5 py-3 text-xs font-medium text-foreground disabled:opacity-30">
            {isEn ? "Clear" : "クリア"}
          </button>
          <button type="button" onClick={submit} disabled={!canSearch} className="rounded-full bg-foreground px-7 py-3 text-xs font-semibold text-background transition hover:opacity-80 disabled:opacity-30">
            {isEn ? "Search with filters" : "この条件で検索"}
          </button>
        </div>
      </div>
    </section>
  )
}
