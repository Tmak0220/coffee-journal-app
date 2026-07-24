'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'
import { motion, AnimatePresence, Variants } from 'framer-motion'
import Link from 'next/link'

interface OriginItem {
  id: number
  name: string
  name_ja: string | null
  display_name?: string | null
  display_name_en?: string | null
  slug: string
  type: string | null
  parent_id: number | null
  sort_order: number | null
  has_children?: boolean
}

interface OriginSearchManagerProps {
  initialAreas: OriginItem[]
  lang: 'ja' | 'en'
}

export default function OriginSearchManager({ initialAreas, lang }: OriginSearchManagerProps) {
  const [currentItems, setCurrentItems] = useState<OriginItem[]>(initialAreas)
  const [loading, setLoading] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  
  const t = {
    ja: { 
      all: 'すべての地域', 
      noData: 'この地域にはまだデータが登録されていません。',
      market: 'ロースター・ショップ',
      source: '生産地・農園',
      event: 'イベント・フェスティバル',
      region: '地域・エリア'
    },
    en: { 
      all: 'All Regions', 
      noData: 'No data registered in this region.',
      market: 'Roasters & Shops',
      source: 'Origins & Farms',
      event: 'Events & Festivals',
      region: 'Regions'
    }
  }[lang]

  const getItemTitle = (item: OriginItem): string => {
    if (lang === 'ja') {
      return item.name_ja || item.display_name || item.name || ''
    }
    return item.name || item.display_name_en || ''
  }

  const [navHistory, setNavHistory] = useState<{ id: number | null; name: string }[]>([
    { id: null, name: t.all }
  ])

  const currentParentId = navHistory[navHistory.length - 1].id

  useEffect(() => {
    if (currentParentId === null) {
      setCurrentItems(initialAreas.map(item => ({ ...item, has_children: true })))
    }
  }, [initialAreas, currentParentId])

  useEffect(() => {
    setNavHistory(prev => {
      const next = [...prev]
      next[0] = { id: null, name: t.all }
      return next
    })
  }, [lang, t.all])

  useEffect(() => {
    if (currentParentId === null) return

    async function fetchLayerData() {
      setLoading(true)
      try {
        const { data: subItems } = await supabase
          .from('origins')
          .select('*')
          .eq('parent_id', currentParentId)
          .order('sort_order', { ascending: true })

        if (subItems && subItems.length > 0) {
          const subItemIds = subItems.map(item => item.id)
          const { data: childrenCheck } = await supabase
            .from('origins')
            .select('parent_id')
            .in('parent_id', subItemIds)

          const hasChildrenSet = new Set(childrenCheck?.map(c => c.parent_id) || [])

          const itemsWithChildrenFlag = subItems.map(item => ({
            ...item,
            has_children: hasChildrenSet.has(item.id)
          }))

          setCurrentItems(itemsWithChildrenFlag)
        } else {
          setCurrentItems([])
        }
      } catch (err) {
        console.error('データ取得エラー:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLayerData()
  }, [currentParentId])

  const handleItemSelect = (item: OriginItem) => {
    setDirection('forward')
    const displayName = getItemTitle(item) || item.name || ''
    setNavHistory([...navHistory, { id: item.id, name: displayName }])
  }

  const handleNavClick = (index: number) => {
    setDirection('backward')
    setNavHistory(navHistory.slice(0, index + 1))
  }

  const variants: Variants = {
    enter: (dir: 'forward' | 'backward') => ({ x: dir === 'forward' ? 20 : -20, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { duration: 0.25, ease: 'easeOut' } },
    exit: (dir: 'forward' | 'backward') => ({ x: dir === 'forward' ? -20 : 20, opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } })
  }

  const groupItemsByType = (items: OriginItem[]) => {
    const groups: { [key: string]: OriginItem[] } = {
      region: [],
      market: [],
      source: [],
      event: []
    }

    items.forEach(item => {
      if (!item.type) {
        groups.region.push(item)
      } else if (groups[item.type]) {
        groups[item.type].push(item)
      } else {
        groups.region.push(item)
      }
    })

    return groups
  }

  const groupedItems = groupItemsByType(currentItems)
  const groupOrder = ['region', 'market', 'source', 'event']

  return (
    <div className="w-full">
      <div className="flex items-center gap-x-2 gap-y-1 mb-6 sm:mb-8 text-xs tracking-wider border-b border-neutral-200/50 pb-3 sm:pb-4 overflow-x-auto no-scrollbar whitespace-nowrap">
        {navHistory.map((step, index) => (
          <div key={index} className="flex items-center gap-2 shrink-0">
            {index > 0 && <span className="text-neutral-400 font-light">/</span>}
            <button
              onClick={() => handleNavClick(index)}
              className={cn(
                "transition-colors py-1 px-1.5 font-medium tracking-wide",
                index === navHistory.length - 1 
                  ? "text-neutral-900 font-semibold" 
                  : "text-neutral-400 hover:text-neutral-800"
              )}
              disabled={index === navHistory.length - 1}
            >
              {step.name}
            </button>
          </div>
        ))}
      </div>

      <div className="overflow-hidden relative min-h-[300px] sm:min-h-[350px]">
        {loading ? (
          <div className="flex justify-center py-20 sm:py-24">
            <div className="animate-spin h-5 w-5 border border-neutral-800 border-t-transparent rounded-full" />
          </div>
        ) : (
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentParentId ?? 'root'}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full space-y-8 sm:space-y-10"
            >
              {currentItems && currentItems.length > 0 ? (
                groupOrder.map(groupKey => {
                  const itemsInGroup = groupedItems[groupKey]
                  if (!itemsInGroup || itemsInGroup.length === 0) return null

                  const sectionTitle = t[groupKey as keyof typeof t]

                  return (
                    <div key={groupKey} className="space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-4">
                        <h2 className="text-xs font-bold tracking-[0.2em] text-neutral-400 uppercase font-sans">
                          {sectionTitle}
                        </h2>
                        <div className="h-[1px] bg-neutral-100 flex-grow" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                        {itemsInGroup.map((item) => {
                          const itemTitle = getItemTitle(item)
                          
                          const isDetailPage = 
                            item.type === 'source' || 
                            item.type === 'market' || 
                            (item.type === 'event' && !item.has_children)

                          const cardClassName = "p-4 sm:p-6 text-left bg-neutral-50/40 hover:bg-white border border-neutral-200/70 hover:border-neutral-400 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex justify-between items-center group active:scale-[0.98]"

                          if (isDetailPage) {
                            return (
                              <Link
                                key={item.id}
                                href={`/${lang}/origins/${item.slug}`}
                                className={cardClassName}
                              >
                                <span className="text-sm sm:text-base font-semibold tracking-wide text-neutral-800 group-hover:text-black transition duration-300 font-sans">
                                  {itemTitle}
                                </span>
                                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 transition-all duration-300 transform group-hover:translate-x-1 group-hover:text-black ml-2" />
                              </Link>
                            )
                          }

                          return (
                            <button
                              key={item.id}
                              onClick={() => handleItemSelect(item)}
                              className={cardClassName}
                            >
                              <span className="text-sm sm:text-base font-semibold tracking-wide text-neutral-800 group-hover:text-black transition duration-300 font-sans">
                                {itemTitle}
                              </span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400 transition-all duration-300 transform group-hover:translate-x-1 group-hover:text-black ml-2" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-neutral-500 text-xs tracking-wider py-16 sm:py-20 text-center bg-white/50 rounded-xl border border-dashed border-neutral-200">
                  {t.noData}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}