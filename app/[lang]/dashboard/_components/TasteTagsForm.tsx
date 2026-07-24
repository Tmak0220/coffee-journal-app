"use client"

import { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import MasterRequestButton from "./MasterRequestButton"

type TasteTag = {
  id: string
  parent_id: string | null
  slug: string
  name: string
  name_ja: string
  attribute_type: "flavor" | "mouthfeel" | "aftertaste"
  sort_order: number
}

type TreeTasteTag = TasteTag & {
  children: TasteTag[]
}

type Props = {
  selectedIds: string[] 
  onToggleTaste: (id: string) => void
  currentLang: "ja" | "en"
}

const ATTRIBUTE_LABELS = {
  flavor: { en: "FLAVOR & AROMA", ja: "フレーバー・アロマ" },
  mouthfeel: { en: "MOUTHFEEL", ja: "口当たり" },
  aftertaste: { en: "AFTERTASTE", ja: "余韻・後味" }
} as const

export default function TasteTagsForm({ selectedIds, onToggleTaste, currentLang }: Props) {
  const [rawTastes, setRawTastes] = useState<TasteTag[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null)

  useEffect(() => {
    const fetchTastes = async () => {
      try {
        const { data } = await supabase
          .from("tastes")
          .select("id, parent_id, slug, name, name_ja, attribute_type, sort_order")
          .order("sort_order", { ascending: true })
        
        if (data) {
          setRawTastes(data as unknown as TasteTag[])
        }
      } catch (err) {
        console.error("Failed to fetch tastes:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchTastes()
  }, [])

  const tasteGroups = useMemo(() => {
    const buildTree = (type: "flavor" | "mouthfeel" | "aftertaste") => {
      const filtered = rawTastes.filter(t => t.attribute_type === type)
      const parents = filtered.filter(t => !t.parent_id) as TreeTasteTag[]
      
      if (parents.length === 0 && filtered.length > 0) {
        return []
      }

      const allDescendants = filtered.filter(t => t.parent_id !== null)

      const isDescendantOf = (child: TasteTag, rootId: string): boolean => {
        let current: TasteTag | undefined = child
        while (current && current.parent_id) {
          if (current.parent_id === rootId) return true
          current = rawTastes.find(t => t.id === current?.parent_id)
        }
        return false
      }

      return parents.map((parent, index) => {
        const correctChildren = allDescendants.filter(child => isDescendantOf(child, parent.id))
        const orphanChildren = index === 0 
          ? allDescendants.filter(child => !parents.some(p => isDescendantOf(child, p.id)))
          : []

        return {
          ...parent,
          children: [...correctChildren, ...orphanChildren]
        }
      })
    }

    return {
      flavor: buildTree("flavor"),
      mouthfeel: buildTree("mouthfeel"),
      aftertaste: buildTree("aftertaste"),
    }
  }, [rawTastes])

  const selectedTastes = useMemo(() => {
    return rawTastes.filter(t => selectedIds.includes(t.id))
  }, [rawTastes, selectedIds])

  const toggleExpand = (parentId: string) => {
    setExpandedParentId(prev => (prev === parentId ? null : parentId))
  }

  const mainTitle = "TASTE & FLAVOR TAGS"
  const mainDesc = currentLang === "ja" ? "テイスティング評価・味の要素を選択してください" : "Please select flavor and taste profiles"

  const mainTitleStyle = "text-[15px] font-bold tracking-wider text-[#161616] uppercase"
  const mainDescStyle = "text-[13px] font-normal text-[#8e8e8e] mt-0.5"

  if (loading) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className={mainTitleStyle}>
            {mainTitle}
          </h2>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className={mainTitleStyle}>
          {mainTitle}
        </h2>
        <p className={mainDescStyle}>
          {mainDesc}
        </p>
      </div>

      {selectedTastes.length > 0 && (
        <div className="p-4 bg-neutral-50/60 rounded-2xl border border-neutral-200/60 animate-fadeIn">
          <p className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase mb-2.5">
            {currentLang === "ja" ? "選択中のタグ" : "Selected Tags"} ({selectedTastes.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedTastes.map((tag) => {
              const tagName = currentLang === "en" ? tag.name : tag.name_ja
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => onToggleTaste(tag.id)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-medium pl-3 pr-2.5 py-1.5 bg-neutral-900 border border-neutral-900 text-white rounded-full shadow-sm hover:bg-neutral-800 transition-colors group"
                  title={currentLang === "ja" ? "クリックで解除" : "Click to remove"}
                >
                  <span>{tagName}</span>
                  <span className="text-[10px] text-neutral-400 group-hover:text-white transition-colors font-sans">
                    ✕
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      
      <div className="space-y-8 mt-6">
        {(Object.keys(tasteGroups) as Array<keyof typeof tasteGroups>).map((type) => {
          const parentTags = tasteGroups[type]
          if (parentTags.length === 0) return null

          const labelEn = ATTRIBUTE_LABELS[type].en
          const labelJa = ATTRIBUTE_LABELS[type].ja

          return (
            <div key={type} className="space-y-4">
              <div className="flex items-center gap-3 w-full select-none">
                <div className="text-[13px] font-bold tracking-wider text-[#161616] uppercase">
                  {labelEn}
                </div>
                {currentLang === "ja" && (
                  <span className="text-[12px] font-normal tracking-wide text-[#8e8e8e] uppercase">
                    {labelJa}
                  </span>
                )}
                <div className="flex-1 h-[1px] bg-neutral-100" />
              </div>
              
              <div className="flex flex-wrap gap-x-4 gap-y-5 items-start justify-start">
                {parentTags.map((parent) => {
                  const isParentSelected = selectedIds.includes(parent.id)
                  const isExpanded = expandedParentId === parent.id
                  const parentName = currentLang === "en" ? parent.name : parent.name_ja
                  const hasChildren = parent.children.length > 0

                  return (
                    <div 
                      key={parent.id} 
                      className={`transition-all duration-300 ${
                        isExpanded 
                          ? "w-full bg-neutral-50/60 p-5 rounded-[32px] border border-neutral-200 flex flex-col gap-5" 
                          : "inline-flex"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 select-none">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTaste(parent.id);
                          }}
                          className={`text-[14px] md:text-[15px] px-6 py-3 rounded-full border tracking-wide transition-all duration-200 font-medium shadow-sm active:scale-[0.97] ${
                            isParentSelected
                              ? "bg-neutral-900 border-neutral-900 text-white font-semibold"
                              : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400 hover:text-neutral-950"
                          }`}
                        >
                          {parentName}
                        </button>

                        {hasChildren && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(parent.id);
                            }}
                            className={`w-[46px] h-[46px] flex items-center justify-center rounded-full border transition-all duration-200 shadow-sm active:scale-[0.93] ${
                              isExpanded
                                ? "bg-neutral-900 border-neutral-900 text-white"
                                : isParentSelected
                                  ? "bg-neutral-100 border-neutral-300 text-neutral-700 hover:bg-neutral-200"
                                  : "bg-white border-neutral-200 text-neutral-400 hover:border-neutral-400 hover:text-neutral-800"
                            }`}
                          >
                            <span className={`text-[13px] font-light transition-transform duration-300 ${isExpanded ? "rotate-45" : ""}`}>
                              ＋
                            </span>
                          </button>
                        )}
                      </div>

                      {hasChildren && isExpanded && (
                        <div className="flex flex-wrap gap-3 p-4 bg-white rounded-[24px] border border-neutral-200/50 shadow-inner w-full animate-fadeIn">
                          {parent.children.map((child) => {
                            const isChildSelected = selectedIds.includes(child.id)
                            const childName = currentLang === "en" ? child.name : child.name_ja
                            return (
                              <button
                                key={child.id}
                                type="button"
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  onToggleTaste(child.id); 
                                }}
                                className={`text-[13px] px-5 py-2.5 rounded-full border tracking-wide transition-all duration-200 active:scale-[0.96] select-none ${
                                  isChildSelected
                                    ? "bg-neutral-700 border-transparent text-white font-medium shadow-sm"
                                    : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400 hover:text-neutral-900"
                                }`}
                              >
                                {childName}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="pt-2">
        <MasterRequestButton
          currentLang={currentLang}
          options={[
            { value: "TASTE_FLAVOR", labelJa: "フレーバー・アロマ", labelEn: "Flavor & Aroma" },
            { value: "TASTE_MOUTHFEEL", labelJa: "口当たり", labelEn: "Mouthfeel" },
            { value: "TASTE_AFTERTASTE", labelJa: "余韻・後味", labelEn: "Aftertaste" }
          ]}
          placeholderJa="例: ジャスミン、シルキー、長い余韻"
          placeholderEn="e.g., Jasmine, silky, long finish"
        />
      </div>
    </div>
  )
}
