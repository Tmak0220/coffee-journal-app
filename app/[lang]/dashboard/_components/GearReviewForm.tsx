"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import HeroImageUploader from "./HeroImageUploader"

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
}

// 💡 多言語テキスト辞書
const dict = {
  ja: {
    sectionTitle: "器具レビューを投稿",
    sectionDesc: "愛用しているコーヒー器具の感想やおすすめ設定をシェアしましょう。",
    labelGear: "対象の器具",
    placeholderGear: "ブランド名や器具名で検索...",
    btnChange: "変更",
    searching: "検索中...",
    notFound: "お探しの器具が見つかりませんでした。",
    onlyRegistered: "登録済みの器具のみレビューできます。",
    btnRequest: "見つからない場合は登録をリクエストする",
    labelFlavor: "抽出・味わいの傾向（任意）",
    labelSetting: "設定・パラメータ（任意）",
    placeholderSetting: "例: 92℃ / 抽出比率 1:15 / メッシュ#30",
    labelReview: "レビュー",
    placeholderReview: "特徴、使い勝手などを自由にお書きください。",
    btnSubmit: "投稿する",
    btnSubmitting: "処理中...",
    selectGearError: "レビューする器具を選択してください。",
    loginError: "投稿するにはログインが必要です。",
    submitError: "投稿に失敗しました。",
    // モーダル用テキスト
    modalTitle: "器具の登録リクエスト",
    modalTypeLabel: "種類",
    modalContentLabel: "追加したい器具名・ブランド名",
    modalPlaceholder: "例: FELLOW Stagg EKG / HARIO V60",
    modalSubmit: "リクエストを送信",
    modalCancel: "キャンセル",
    modalSuccess: "リクエストを送信しました。運営者が確認します。",
    modalError: "送信に失敗しました。もう一度お試しください。",
    modalLoginRequired: "リクエストを送信するにはログインが必要です。"
  },
  en: {
    sectionTitle: "GEAR REVIEW",
    sectionDesc: "Share your experience with coffee gears.",
    labelGear: "Select Gear",
    placeholderGear: "Search brand or gear name...",
    btnChange: "Change",
    searching: "Searching...",
    notFound: "Gear not found.",
    onlyRegistered: "Only registered gears can be reviewed.",
    btnRequest: "Can't find it? Request new registration",
    labelFlavor: "Flavor Profile / Tendency (Optional)",
    labelSetting: "Setting Note (Optional)",
    placeholderSetting: "e.g., 92°C / 1:15 ratio / Mesh #30",
    labelReview: "Review",
    placeholderReview: "Describe its features and usability...",
    btnSubmit: "Post Review",
    btnSubmitting: "Processing...",
    selectGearError: "Please select a gear.",
    loginError: "Please log in to submit.",
    submitError: "Failed to submit review.",
    // モーダル用テキスト
    modalTitle: "Gear Registration Request",
    modalTypeLabel: "Category",
    modalContentLabel: "Gear name & brand you want to add",
    modalPlaceholder: "e.g., FELLOW Stagg EKG / HARIO V60",
    modalSubmit: "Submit Request",
    modalCancel: "Cancel",
    modalSuccess: "Request submitted successfully. Our team will review it.",
    modalError: "Failed to submit. Please try again.",
    modalLoginRequired: "Please log in to submit a request."
  }
}

// 💡 味わい・抽出傾向の選択肢
const FLAVOR_PROFILE_OPTIONS = [
  { value: 5, labelJa: "クリーン・クリア", labelEn: "Clean & Clarity" },
  { value: 4, labelJa: "バランス型", labelEn: "Balanced" },
  { value: 3, labelJa: "ボディ・コク重視", labelEn: "Rich & Heavy Body" },
  { value: 2, labelJa: "ユニーク・特殊抽出", labelEn: "Unique Extracted" },
]

// 🔍 scale と kettle 以外の場合に true を返す判定関数
function shouldShowRating(gear: GearSuggestion | null): boolean {
  if (!gear) return false
  if (!gear.type) return true

  const hiddenTypes = ["scale", "kettle"]
  return !hiddenTypes.includes(gear.type.toLowerCase())
}

export default function GearReviewForm({ lang = "ja" }: Props) {
  const router = useRouter()
  const isEn = lang === "en"
  const currentLang = isEn ? "en" : "ja"
  const t = dict[currentLang]

  // フォーム状態
  const [selectedGear, setSelectedGear] = useState<GearSuggestion | null>(null)
  const [gearSearchQuery, setGearSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<GearSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // 評価（味わい・抽出の傾向）
  const [flavorProfile, setFlavorProfile] = useState<number | null>(null)
  const [grindSetting, setGrindSetting] = useState("")
  const [comment, setComment] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // モーダル表示状態
  const [isModalOpen, setIsModalOpen] = useState(false)

  // scale, kettle 以外の場合に評価を表示
  const showRating = shouldShowRating(selectedGear)

  // 🔍 器具（gears）のサジェスト検索処理
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

  // 🚀 投稿送信ハンドラー
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

      const { data: postData, error: postError } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          title: `${selectedGear.brand_ja || selectedGear.brand} ${selectedGear.name_ja || selectedGear.name} レビュー`,
          description: comment.trim() || null,
          image_urls: imageUrls.length > 0 ? imageUrls.slice(0, 3) : null,
          visibility: "public",
          lang: currentLang,
          type: "gear_review"
        })
        .select()
        .single()

      if (postError) throw postError

      const { error: gearLinkError } = await supabase
        .from("post_gears")
        .insert({
          post_id: postData.id,
          gear_id: selectedGear.id,
          rating: showRating ? flavorProfile : null,
          grind_setting: grindSetting.trim() || null,
          comment: comment.trim() || null
        })

      if (gearLinkError) throw gearLinkError

      router.push(`/${lang}/posts/${postData.id}`)
      router.refresh()

    } catch (err: any) {
      console.error(err)
      setErrorMessage(err.message || t.submitError)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white border border-neutral-200 p-6 sm:p-10 rounded-xl shadow-sm w-full max-w-5xl mx-auto">
      <div>
        <h2 className="text-sm sm:text-base font-bold tracking-wider text-neutral-900 uppercase">
          {t.sectionTitle}
        </h2>
        <p className="mt-1 text-[13px] font-normal tracking-wide text-neutral-500">
          {t.sectionDesc}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 space-y-10">
        {errorMessage && (
          <div className="text-sm p-4 rounded-xl border max-w-xl transition-all duration-300 text-red-600 bg-red-50/40 border-red-200">
            {errorMessage}
          </div>
        )}

        {/* 📷 画像アップロード */}
        <HeroImageUploader
          currentLang={currentLang}
          initialImageUrls={imageUrls}
          onImagesChanged={setImageUrls}
        />

        {/* 🔍 対象の器具 */}
        <div className="border-b border-neutral-100 pb-8 space-y-3">
          <label className="text-[14px] font-bold text-neutral-900 tracking-wide block">
            {t.labelGear}
          </label>

          {selectedGear ? (
            <div className="flex items-center justify-between p-4 bg-neutral-50/50 border border-neutral-200 rounded-xl">
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

              {/* サジェストドロップダウン */}
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

              {/* 検索したが見つからなかった場合 */}
              {hasSearched && !isSearching && suggestions.length === 0 && (
                <div className="absolute z-20 left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-xl shadow-lg p-4 text-center">
                  <p className="text-xs text-neutral-500">
                    {t.notFound}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-block mt-2 text-xs text-neutral-900 font-bold underline hover:text-neutral-600 transition"
                  >
                    {t.btnRequest}
                  </button>
                </div>
              )}

              {/* 常時表示の登録リクエスト導線 */}
              <div className="mt-2 text-xs text-neutral-400 space-y-2">
                <p>{t.onlyRegistered}</p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="text-neutral-600 hover:text-neutral-900 font-medium underline transition"
                >
                  {t.btnRequest}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ☕️ 味わい・抽出の傾向 & ⚙️ 設定メモ */}
        <div className="border-b border-neutral-100 pb-8 space-y-8">
          
          {/* ✨ scale / kettle 以外が選択されている時に表示 */}
          {showRating && (
            <div className="space-y-3 transition-all duration-300">
              <label className="text-[14px] font-bold text-neutral-900 tracking-wide block">
                {t.labelFlavor}
              </label>
              
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

          {/* 設定・パラメータメモ */}
          <div className="space-y-3 max-w-xl">
            <label className="text-[14px] font-bold text-neutral-900 tracking-wide block">
              {t.labelSetting}
            </label>
            <input
              type="text"
              value={grindSetting}
              onChange={(e) => setGrindSetting(e.target.value)}
              placeholder={t.placeholderSetting}
              className="w-full text-sm px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition duration-200 placeholder:text-neutral-400"
            />
          </div>
        </div>

        {/* ✍️ レビュー本文 */}
        <div className="space-y-3">
          <label className="text-[14px] font-bold text-neutral-900 tracking-wide block">
            {t.labelReview}
          </label>
          <textarea
            rows={5}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.placeholderReview}
            className="w-full text-sm p-4 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 leading-relaxed transition duration-200 placeholder:text-neutral-400"
          />
        </div>

        {/* 🚀 送信ボタン */}
        <div className="pt-4 border-t border-neutral-100 flex justify-end">
          <button
            type="submit"
            disabled={submitting || !selectedGear}
            className="w-full sm:w-auto bg-neutral-950 hover:bg-neutral-900 text-white border border-transparent px-10 py-3.5 rounded-full text-sm font-medium tracking-wider transition-all duration-300 shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? t.btnSubmitting : t.btnSubmit}
          </button>
        </div>
      </form>

      {/* 💡 同居させたインラインマスターリクエストモーダル */}
      <GearRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        t={t}
        currentLang={currentLang}
      />
    </div>
  )
}

// ==========================================
// 💡 CoffeeBeansInfoForm とスタイルを完全に共通化させたモーダル
// ==========================================
type GearRequestModalProps = {
  isOpen: boolean
  onClose: () => void
  t: any
  currentLang: "ja" | "en"
}

function GearRequestModal({ isOpen, onClose, t, currentLang }: GearRequestModalProps) {
  const [requestType, setRequestType] = useState("GEAR")
  const [requestValue, setRequestValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalMessage, setModalMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  if (!isOpen) return null

  const handleRequestSubmit = async () => {
    if (!requestValue.trim()) return

    setIsSubmitting(true)
    setModalMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setModalMessage({ text: t.modalLoginRequired, type: "error" })
        setIsSubmitting(false)
        return
      }

      // 💡 [GEAR] プレフィックスを付与して admin_notifications テーブルに統一格納
      const { error } = await supabase
        .from("admin_notifications")
        .insert({
          user_id: user.id,
          type: "master_request",
          requested_display_name: `[${requestType}] ${requestValue.trim()}`,
          status: "pending",
          created_at: new Date().toISOString()
        })

      if (error) throw error

      setModalMessage({ text: t.modalSuccess, type: "success" })
      setRequestValue("")
      
      setTimeout(() => {
        onClose()
        setModalMessage(null)
      }, 2000)
    } catch (err) {
      console.error("【Request Error】:", err)
      setModalMessage({ text: t.modalError, type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-md p-6 shadow-xl space-y-5">
        <div>
          <h3 className="text-base font-bold text-neutral-900">{t.modalTitle}</h3>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{t.modalTypeLabel}</label>
            <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className="w-full text-sm border border-neutral-200 rounded-xl px-3.5 py-3 bg-neutral-50 font-medium text-neutral-800 focus:outline-none">
              <option value="DRIPPER">{currentLang === "en" ? "Dripper" : "Dripper（ドリッパー）"}</option>
              <option value="GRINDER">{currentLang === "en" ? "Grinder" : "Grinder（グラインダー・ミル）"}</option>
              <option value="KETTLE">{currentLang === "en" ? "Kettle" : "Kettle（ケトル）"}</option>
              <option value="SCALE">{currentLang === "en" ? "Scale" : "Scale（スケール）"}</option>
              <option value="GEAR">{currentLang === "en" ? "Other Gear" : "Other Gear（その他の器具）"}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">
              {t.modalContentLabel}
            </label>
            <input
              type="text"
              placeholder={t.modalPlaceholder}
              value={requestValue}
              onChange={(e) => setRequestValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault()
              }}
              className="w-full text-sm border border-neutral-200 rounded-xl px-3.5 py-3 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400"
            />
          </div>

          {modalMessage && (
            <div className={`text-xs p-3 rounded-xl border font-medium ${
              modalMessage.type === "success" 
                ? "text-emerald-700 bg-emerald-50 border-emerald-200" 
                : "text-red-700 bg-red-50 border-red-200"
            }`}>
              {modalMessage.text}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                setModalMessage(null)
              }}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 transition-colors"
            >
              {t.modalCancel}
            </button>
            <button
              type="button"
              onClick={handleRequestSubmit}
              disabled={isSubmitting || !requestValue.trim()}
              className="flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              {isSubmitting ? "..." : t.modalSubmit}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
