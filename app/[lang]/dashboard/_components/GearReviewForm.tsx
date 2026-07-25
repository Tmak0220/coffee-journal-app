"use client"

import { useState, useEffect, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import HeroImageUploader from "./HeroImageUploader"
import MasterRequestButton, { MasterRequestOption } from "./MasterRequestButton"

type GearSuggestion = {
  id: number
  brand: string
  brand_ja: string | null
  name: string
  name_ja: string | null
  type?: string | null
}

type Props = {
  lang?: "ja" | "en"
  editId?: string
  secondaryAction?: ReactNode
}

const dict = {
  ja: {
    sectionTitle: "GEAR REVIEW",
    sectionDesc: "器具レビュー / 器具の感想やおすすめ設定の記録",
    labelGear: "SELECT GEAR",
    labelGearSub: "対象の器具を選択してください",
    placeholderGear: "ブランド名や器具名で検索...",
    btnChange: "変更",
    searching: "検索中...",
    notFound: "お探しの器具が見つかりませんでした。",
    labelFlavor: "FLAVOR PROFILE",
    labelFlavorSub: "抽出・味わいの傾向（任意）",
    labelSetting: "SETTING NOTE",
    labelSettingSub: "設定・パラメータ（任意）",
    placeholderSetting: "例: 92℃ / 抽出比率 1:15 / メッシュ#30",
    labelReview: "REVIEW",
    labelReviewSub: "レビュー（特徴、使い勝手など）",
    placeholderReview: "特徴、使い勝手などを自由にお書きください。",
    btnSubmit: "投稿する",
    btnSubmitting: "処理中...",
    selectGearError: "レビューする器具を選択してください。",
    loginError: "投稿するにはログインが必要です。",
    submitError: "投稿に失敗しました。",
  },
  en: {
    sectionTitle: "GEAR REVIEW",
    sectionDesc: "Share your experience with coffee gears.",
    labelGear: "SELECT GEAR",
    labelGearSub: "Select gear to review",
    placeholderGear: "Search brand or gear name...",
    btnChange: "Change",
    searching: "Searching...",
    notFound: "Gear not found.",
    labelFlavor: "FLAVOR PROFILE",
    labelFlavorSub: "Flavor Profile / Tendency (Optional)",
    labelSetting: "SETTING NOTE",
    labelSettingSub: "Setting Note (Optional)",
    placeholderSetting: "e.g., 92°C / 1:15 ratio / Mesh #30",
    labelReview: "REVIEW",
    labelReviewSub: "Review details",
    placeholderReview: "Describe its features and usability...",
    btnSubmit: "Post Review",
    btnSubmitting: "Processing...",
    selectGearError: "Please select a gear.",
    loginError: "Please log in to submit.",
    submitError: "Failed to submit review.",
  }
}

const GEAR_REQUEST_OPTIONS: MasterRequestOption[] = [
  { value: "DRIPPER", labelJa: "Dripper（ドリッパー）", labelEn: "Dripper" },
  { value: "GRINDER", labelJa: "Grinder（グラインダー・ミル）", labelEn: "Grinder" },
  { value: "KETTLE", labelJa: "Kettle（ケトル）", labelEn: "Kettle" },
  { value: "SCALE", labelJa: "Scale（スケール）", labelEn: "Scale" },
  { value: "GEAR", labelJa: "Other Gear（その他の器具）", labelEn: "Other Gear" },
]

const FLAVOR_PROFILE_OPTIONS = [
  { value: 5, labelJa: "クリーン・クリア", labelEn: "Clean & Clarity" },
  { value: 4, labelJa: "バランス型", labelEn: "Balanced" },
  { value: 3, labelJa: "ボディ重視", labelEn: "Rich & Heavy Body" },
  { value: 2, labelJa: "ユニーク・特殊抽出", labelEn: "Unique Extracted" },
]

function shouldShowRating(gear: GearSuggestion | null): boolean {
  if (!gear) return false
  if (!gear.type) return true

  const hiddenTypes = ["scale", "kettle"]
  return !hiddenTypes.includes(gear.type.toLowerCase())
}

export default function GearReviewForm({ lang = "ja", editId, secondaryAction }: Props) {
  const router = useRouter()
  const isEn = lang === "en"
  const currentLang = isEn ? "en" : "ja"
  const t = dict[currentLang]

  const [selectedGear, setSelectedGear] = useState<GearSuggestion | null>(null)
  const [gearSearchQuery, setGearSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<GearSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const [flavorProfile, setFlavorProfile] = useState<number | null>(null)
  const [grindSetting, setGrindSetting] = useState("")
  const [comment, setComment] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loadingInitial, setLoadingInitial] = useState(Boolean(editId))
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([])
  const initialImagesRef = useRef<string[]>([])

  const showRating = shouldShowRating(selectedGear)

  useEffect(() => {
    if (!editId) return
    let active = true
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setErrorMessage(t.loginError)
        setLoadingInitial(false)
        return
      }
      const [postResult, linkResult] = await Promise.all([
        supabase.from("posts").select("user_id, type, description, image_urls").eq("id", editId).eq("user_id", user.id).single(),
        supabase.from("post_gears").select("gear_id, rating, grind_setting, comment").eq("post_id", editId).maybeSingle(),
      ])
      if (!active) return
      if (postResult.error || !postResult.data || postResult.data.type !== "gear_review" || !linkResult.data) {
        setErrorMessage(currentLang === "en" ? "Gear review not found." : "器具レビューが見つかりません。")
        setLoadingInitial(false)
        return
      }
      const { data: gear } = await supabase.from("gears")
        .select("id, brand, brand_ja, name, name_ja, type")
        .eq("id", linkResult.data.gear_id).single()
      if (gear) setSelectedGear(gear as GearSuggestion)
      setFlavorProfile(linkResult.data.rating == null ? null : Number(linkResult.data.rating))
      setGrindSetting(linkResult.data.grind_setting || "")
      setComment(linkResult.data.comment || postResult.data.description || "")
      const urls = Array.isArray(postResult.data.image_urls) ? postResult.data.image_urls.filter((url): url is string => typeof url === "string") : []
      setImageUrls(urls)
      initialImagesRef.current = urls
      setLoadingInitial(false)
    })()
    return () => { active = false }
  }, [currentLang, editId, t.loginError])

  useEffect(() => {
    const query = gearSearchQuery.trim()
    if (!query || selectedGear) {
      setSuggestions([])
      setHasSearched(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const sanitized = query.replace(/[%_]/g, "\\$&")

      const { data, error } = await supabase
        .from("gears")
        .select("id, brand, brand_ja, name, name_ja, type")
        .or(`name.ilike.%${sanitized}%,name_ja.ilike.%${sanitized}%,brand.ilike.%${sanitized}%,brand_ja.ilike.%${sanitized}%`)
        .limit(6)

      if (!error && data) {
        setSuggestions(data as GearSuggestion[])
      }
      setIsSearching(false)
      setHasSearched(true)
    }, 300)

    return () => clearTimeout(timer)
  }, [gearSearchQuery, selectedGear])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!selectedGear) {
      setErrorMessage(t.selectGearError)
      return
    }

    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(t.loginError)

      const postPayload = {
          user_id: user.id,
          title: `${selectedGear.brand_ja || selectedGear.brand} ${selectedGear.name_ja || selectedGear.name} レビュー`,
          description: comment.trim() || null,
          image_urls: imageUrls.length > 0 ? imageUrls.slice(0, 3) : null,
          visibility: "public",
          lang: currentLang,
          type: "gear_review"
        }
      const postQuery = editId
        ? supabase.from("posts").update(postPayload).eq("id", editId).eq("user_id", user.id)
        : supabase.from("posts").insert(postPayload)
      const { data: postData, error: postError } = await postQuery.select().single()

      if (postError) throw postError

      if (editId) {
        const { error: deleteLinkError } = await supabase.from("post_gears").delete().eq("post_id", editId)
        if (deleteLinkError) throw deleteLinkError
      }
      const { error: gearLinkError } = await supabase.from("post_gears").insert({
          post_id: postData.id,
          gear_id: selectedGear.id,
          rating: showRating ? flavorProfile : null,
          grind_setting: grindSetting.trim() || null,
          comment: comment.trim() || null
        })

      if (gearLinkError) throw gearLinkError
      for (const url of removedImageUrls.filter(url => initialImagesRef.current.includes(url) && !imageUrls.includes(url))) {
        await fetch("/api/delete-object", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) })
      }
      initialImagesRef.current = imageUrls
      setRemovedImageUrls([])

      router.push(`/${lang}/posts/${postData.id}`)
      router.refresh()

    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.message || t.submitError)
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInitial) return <div className="h-[620px] animate-pulse rounded-xl border border-neutral-100 bg-neutral-50" />

  return (
    <div className="bg-white border border-neutral-200 p-6 sm:p-10 rounded-xl shadow-sm w-full max-w-5xl mx-auto">
      <div>
        <h2 className="text-base sm:text-lg font-bold tracking-wider text-neutral-900 uppercase">
          {t.sectionTitle}
        </h2>
        <p className="mt-1 text-xs sm:text-[13px] font-normal tracking-wide text-neutral-500">
          {t.sectionDesc}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 space-y-10">
        {errorMessage && (
          <div className="text-sm p-4 rounded-xl border max-w-xl transition-all duration-300 text-red-600 bg-red-50/40 border-red-200">
            {errorMessage}
          </div>
        )}

        <HeroImageUploader
          currentLang={currentLang}
          initialImageUrls={imageUrls}
          onImagesChanged={setImageUrls}
          deferDeletion={Boolean(editId)}
          onRemovedImagesChanged={setRemovedImageUrls}
        />

        <div className="border-b border-neutral-100 pb-8 space-y-3">
          <div>
            <label className="text-sm font-bold text-neutral-900 tracking-wider block uppercase">
              {t.labelGear}
            </label>
            <p className="text-xs text-neutral-500 font-normal mt-0.5">
              {t.labelGearSub}
            </p>
          </div>

          {selectedGear ? (
            <div className="flex items-center justify-between p-4 bg-neutral-50/50 border border-neutral-200 rounded-xl max-w-xl">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 block uppercase tracking-wider">
                  {selectedGear.brand_ja || selectedGear.brand}
                </span>
                <span className="text-sm font-bold text-neutral-900 mt-0.5 block">
                  {selectedGear.name_ja || selectedGear.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedGear(null)
                  setGearSearchQuery("")
                  setFlavorProfile(null)
                }}
                className="text-xs text-neutral-500 hover:text-neutral-900 font-medium px-3 py-1.5 rounded-lg hover:bg-neutral-100 transition duration-200"
              >
                {t.btnChange}
              </button>
            </div>
          ) : (
            <div className="relative max-w-xl">
              <input
                type="text"
                value={gearSearchQuery}
                onChange={(e) => setGearSearchQuery(e.target.value)}
                placeholder={t.placeholderGear}
                className="w-full text-sm px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition duration-200 placeholder:text-neutral-400"
              />
              {isSearching && (
                <span className="absolute right-4 top-3.5 text-xs text-neutral-400 animate-pulse font-medium">
                  {t.searching}
                </span>
              )}

              {suggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedGear(item)
                        setSuggestions([])
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-none transition duration-150 flex flex-col"
                    >
                      <span className="text-[10px] text-neutral-400 font-medium tracking-wide">
                        {item.brand_ja || item.brand}
                      </span>
                      <span className="text-xs font-bold text-neutral-800 mt-0.5">
                        {item.name_ja || item.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {hasSearched && !isSearching && suggestions.length === 0 && (
                <div className="mt-2 text-xs text-neutral-500">
                  <p>{t.notFound}</p>
                </div>
              )}

              <div className="mt-6 pt-2">
                <MasterRequestButton
                  currentLang={currentLang}
                  options={GEAR_REQUEST_OPTIONS}
                  placeholderJa="例: FELLOW Stagg EKG / HARIO V60"
                  placeholderEn="e.g., FELLOW Stagg EKG / HARIO V60"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-b border-neutral-100 pb-8 space-y-8">
          {showRating && (
            <div className="space-y-3 transition-all duration-300">
              <div>
                <label className="text-sm font-bold text-neutral-900 tracking-wider block uppercase">
                  {t.labelFlavor}
                </label>
                <p className="text-xs text-neutral-500 font-normal mt-0.5">
                  {t.labelFlavorSub}
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2.5">
                {FLAVOR_PROFILE_OPTIONS.map((option) => {
                  const isSelected = flavorProfile === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFlavorProfile(isSelected ? null : option.value)}
                      className={`px-4 py-2.5 text-xs font-medium rounded-xl border transition-all duration-200 select-none ${
                        isSelected
                          ? "bg-neutral-900 border-neutral-900 text-white shadow-sm"
                          : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                      }`}
                    >
                      {isEn ? option.labelEn : option.labelJa}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-3 max-w-xl">
            <div>
              <label className="text-sm font-bold text-neutral-900 tracking-wider block uppercase">
                {t.labelSetting}
              </label>
              <p className="text-xs text-neutral-500 font-normal mt-0.5">
                {t.labelSettingSub}
              </p>
            </div>
            <input
              type="text"
              value={grindSetting}
              onChange={(e) => setGrindSetting(e.target.value)}
              placeholder={t.placeholderSetting}
              className="w-full text-sm px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition duration-200 placeholder:text-neutral-400"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-bold text-neutral-900 tracking-wider block uppercase">
              {t.labelReview}
            </label>
            <p className="text-xs text-neutral-500 font-normal mt-0.5">
              {t.labelReviewSub}
            </p>
          </div>
          <textarea
            rows={5}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.placeholderReview}
            className="w-full text-sm p-4 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 leading-relaxed transition duration-200 placeholder:text-neutral-400"
          />
        </div>

        <div className="pt-4 border-t border-neutral-100 flex flex-col justify-end gap-3 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={submitting || !selectedGear}
            className="w-full sm:w-auto bg-neutral-950 hover:bg-neutral-900 text-white border border-transparent px-10 py-3.5 rounded-full text-sm font-medium tracking-wider transition-all duration-300 shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50"
          >
          {submitting ? t.btnSubmitting : editId ? (isEn ? "Save Changes" : "変更を保存する") : t.btnSubmit}
          </button>
          {secondaryAction}
        </div>
      </form>
    </div>
  )
}
