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

type OriginSuggestion = {
  id: number
  name: string
  name_ja: string | null
  slug?: string | null
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

  // Gear のステート（入力文字列 & 選択中のGearオブジェクト）
  const [gearInput, setGearInput] = useState("")
  const [selectedGear, setSelectedGear] = useState<GearSuggestion | null>(null)
  const [gearSuggestions, setGearSuggestions] = useState<GearSuggestion[]>([])

  // Gear から自動で紐付ける Origins (ブランド・会社) のステート
  const [selectedBrandOrigin, setSelectedBrandOrigin] = useState<OriginSuggestion | null>(null)

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

  // 編集時初期データの取得
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
        supabase.from("posts").select("user_id, type, description, image_urls, source_origin_id").eq("id", editId).eq("user_id", user.id).single(),
        supabase.from("post_gears").select("gear_id, rating, grind_setting, comment").eq("post_id", editId).maybeSingle(),
      ])
      if (!active) return
      if (postResult.error || !postResult.data || postResult.data.type !== "gear_review" || !linkResult.data) {
        setErrorMessage(currentLang === "en" ? "Gear review not found." : "器具レビューが見つかりません。")
        setLoadingInitial(false)
        return
      }

      // 器具取得および入力欄テキスト初期表示
      const { data: gear } = await supabase.from("gears")
        .select("id, brand, brand_ja, name, name_ja, type")
        .eq("id", linkResult.data.gear_id).single()
      if (gear) {
        setSelectedGear(gear as GearSuggestion)
        const gearDisplayName = currentLang === "en" ? gear.name : (gear.name_ja || gear.name)
        setGearInput(gearDisplayName)
      }

      // 既存の紐付けOriginがあれば取得
      if (postResult.data.source_origin_id) {
        const { data: originData } = await supabase
          .from("origins")
          .select("id, name, name_ja, slug")
          .eq("id", postResult.data.source_origin_id)
          .single()
        if (originData) setSelectedBrandOrigin(originData)
      }

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

  // 1. 器具 (gears) を search_keywords で検索
  useEffect(() => {
    const currentName = selectedGear ? (currentLang === "en" ? selectedGear.name : (selectedGear.name_ja || selectedGear.name)) : ""
    if (gearInput.trim().length < 1 || (selectedGear && currentName === gearInput)) {
      setGearSuggestions([])
      return
    }

    const fetchGears = async () => {
      const { data } = await supabase
        .from("gears")
        .select("id, brand, brand_ja, name, name_ja, type")
        .ilike("search_keywords", `%${gearInput}%`)
        .limit(5)

      setGearSuggestions((data as GearSuggestion[]) || [])
    }

    const timer = setTimeout(fetchGears, 200)
    return () => clearTimeout(timer)
  }, [gearInput, selectedGear, currentLang])

  // 2. 器具選択時に、そのブランド情報（gear.brand / gear.brand_ja）から origins テーブルと自動照合
  const handleSelectGear = async (gear: GearSuggestion) => {
    setSelectedGear(gear)
    const gearDisplayName = currentLang === "en" ? gear.name : (gear.name_ja || gear.name)
    setGearInput(gearDisplayName)
    setGearSuggestions([])

    // gear.brand または gear.brand_ja を使って origins の search_keywords から該当ブランドを検索して紐付け
    const targetBrand = gear.brand_ja || gear.brand
    if (targetBrand) {
      const { data } = await supabase
        .from("origins")
        .select("id, slug, name, name_ja")
        .ilike("search_keywords", `%${targetBrand}%`)
        .limit(1)

      if (data && data.length > 0) {
        setSelectedBrandOrigin(data[0] as OriginSuggestion)
      } else {
        setSelectedBrandOrigin(null)
      }
    } else {
      setSelectedBrandOrigin(null)
    }
  }

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
        type: "gear_review",
        source_origin_id: selectedBrandOrigin?.id || null // 自動参照された origins.id を連携
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

        {/* SELECT GEAR 選択セクション */}
        <div className="border-b border-neutral-100 pb-8 space-y-3">
          <div>
            <label className="text-sm font-bold text-neutral-900 tracking-wider block uppercase">
              {t.labelGear}
            </label>
            <p className="text-xs text-neutral-500 font-normal mt-0.5">
              {t.labelGearSub}
            </p>
          </div>

          <div className="relative max-w-xl">
            <input
              type="text"
              value={gearInput}
              onChange={(e) => {
                setGearInput(e.target.value)
                if (selectedGear) {
                  setSelectedGear(null)
                  setSelectedBrandOrigin(null)
                  setFlavorProfile(null)
                }
              }}
              placeholder={t.placeholderGear}
              className="w-full text-sm px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition duration-200 placeholder:text-neutral-400"
            />

            {gearSuggestions.length > 0 && (
              <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-neutral-100">
                {gearSuggestions.map((item) => {
                  const displayBrand = currentLang === "en" ? item.brand : (item.brand_ja || item.brand)
                  const displayName = currentLang === "en" ? item.name : (item.name_ja || item.name)

                  return (
                    <li
                      key={item.id}
                      onMouseDown={() => handleSelectGear(item)}
                      className="p-3 text-left hover:bg-neutral-50 cursor-pointer transition duration-150 flex flex-col"
                    >
                      <span className="text-[10px] text-neutral-400 font-medium tracking-wide">
                        {displayBrand}
                      </span>
                      <span className="text-xs font-bold text-neutral-800 mt-0.5">
                        {displayName}
                      </span>
                    </li>
                  )
                })}
              </ul>
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
        </div>

        {/* FLAVOR PROFILE & SETTING NOTE */}
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

        {/* REVIEW */}
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