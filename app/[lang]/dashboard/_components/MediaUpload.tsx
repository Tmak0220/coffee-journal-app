"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { compressImage } from "@/lib/imageCompression"

type Props = {
  userId: string
  type: "avatar" | "cover"
  initialUrl: string | null
  onUploaded: (url: string | null) => void
  label: string
  className?: string
  lang?: string
}

type StatusMessage = {
  text: string
  type: "error" | "success"
}

const mediaUploadDict = {
  ja: {
    avatarTitle: "AVATAR IMAGE",
    avatarDesc: "プロフィール画像の設定",
    coverTitle: "PROFILE VISUALS",
    coverDesc: "カバー画像（16:9推奨）の設定",
    noFileSelected: "選択されていません",
    uploading: "処理中...",
    successMessage: "プレビュー画像を反映しました（保存ボタンで確定）",
    errorMessage: "画像のアップロードに失敗しました。時間をおいて再度お試しください。",
    changeImage: "変更",
    deleteImage: "削除",
    chooseFile: "ファイルを選択",
    placeholderCover: "カバー画像を設定"
  },
  en: {
    avatarTitle: "AVATAR IMAGE",
    avatarDesc: "Profile Picture Settings",
    coverTitle: "PROFILE VISUALS",
    coverDesc: "Cover Image Settings (16:9 Recommended)",
    noFileSelected: "No file chosen",
    uploading: "Processing...",
    successMessage: "Preview updated (Click save button to commit)",
    errorMessage: "Failed to upload image. Please try again later.",
    changeImage: "Edit",
    deleteImage: "Delete",
    chooseFile: "Choose File",
    placeholderCover: "Set Cover Image"
  }
}

export default function MediaUpload({ 
  userId, 
  type, 
  initialUrl, 
  onUploaded, 
  label, 
  className = "", 
  lang = "ja" 
}: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = mediaUploadDict[currentLang]

  const [currentUrl, setCurrentUrl] = useState<string | null>(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState("")
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadedUrlRef = useRef<string | null>(initialUrl)

  const buttonLabel = label || (currentLang === "ja" ? "ファイルを選択" : "Choose File")

  // 💡 initialUrl が更新（親コンポーネント側でDBから再取得）されたら確実に入力値を同期する
  useEffect(() => {
    setCurrentUrl(initialUrl)
    uploadedUrlRef.current = initialUrl
  }, [initialUrl])

  useEffect(() => {
    uploadedUrlRef.current = currentUrl
    onUploaded(currentUrl)
  }, [currentUrl, onUploaded])

  useEffect(() => {
    setFileName(t.noFileSelected)
  }, [currentLang, t.noFileSelected])

  useEffect(() => {
    const handleBeforeUnload = () => {
      const url = uploadedUrlRef.current
      // まだ確定保存（initialUrlへの反映）がされていない一時的なアップロード画像のみをBeaconで消すよう条件を厳格化
      if (url && url !== initialUrl && !url.startsWith("data:")) {
        const blob = new Blob([JSON.stringify({ urls: [url] })], { type: "application/json" })
        navigator.sendBeacon("/api/delete-object-beacon", blob)
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      setStatusMessage(null)
    }
  }, [initialUrl, type])

  const showMessage = (text: string, type: "error" | "success") => {
    setStatusMessage({ text, type })
    setTimeout(() => {
      setStatusMessage(null)
    }, 4000)
  }

  const deleteOldR2Object = async (urlToDelete: string) => {
    if (!urlToDelete || urlToDelete.startsWith("data:")) {
      return
    }
    try {
      await fetch("/api/delete-object", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToDelete }),
      })
    } catch (err) {
      console.error("Failed to clean up old file from R2:", err)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setUploading(true)
    setStatusMessage(null)

    const oldUrl = currentUrl

    try {
      const compressedFile = await compressImage(file, type === "avatar"
        ? { maxSizeMB: 0.4, maxWidthOrHeight: 512 }
        : { maxSizeMB: 1.2, maxWidthOrHeight: 1920 })
      const formData = new FormData()
      formData.append("file", compressedFile)
      formData.append("folder", type === "avatar" ? "avatars" : "covers")

      const response = await fetch("/api/upload", { 
        method: "POST",
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Upload failed")

      setCurrentUrl(data.url)
      showMessage(t.successMessage, "success")

      if (oldUrl && oldUrl !== initialUrl) {
        await deleteOldR2Object(oldUrl)
      }
    } catch (err: any) {
      console.error(err)
      showMessage(t.errorMessage, "error")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleRemoveImage = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentUrl) return

    setUploading(true)
    setStatusMessage(null)

    const urlToRemove = currentUrl

    try {
      setCurrentUrl(null)
      setFileName(t.noFileSelected)

      if (urlToRemove !== initialUrl) {
        await deleteOldR2Object(urlToRemove)
      }
    } catch (err) {
      console.error(err)
      showMessage(t.errorMessage, "error")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`bg-white border border-neutral-200/60 pt-6 sm:pt-12 pb-10 sm:pb-20 px-6 sm:px-12 rounded-xl shadow-sm w-full max-w-5xl mx-auto space-y-14 ${className}`}>
      
      <div>
        <h2 className="text-[18px] font-bold tracking-[0.05em] text-neutral-900 uppercase">
          {type === "avatar" ? t.avatarTitle : t.coverTitle}
        </h2>
        <p className="mt-1 text-[13px] font-normal tracking-wide text-neutral-400">
          {type === "avatar" ? t.avatarDesc : t.coverDesc}
        </p>
      </div>

      <div className="flex flex-col items-center space-y-16 w-full pt-2">
        
        <div 
          onClick={() => { if (!uploading) fileInputRef.current?.click() }}
          className={`group relative border border-neutral-200 bg-neutral-50/60 flex items-center justify-center shadow-sm cursor-pointer transition-colors duration-300 ${
            type === "avatar" 
              ? "w-44 h-44 rounded-full overflow-hidden" 
              : "w-full aspect-[16/9] sm:aspect-[3/1] rounded-xl overflow-hidden"
          }`}
        >
          {currentUrl ? (
            <>
              {/* 💡 修正箇所: alt 属性の指定を安全な文字列フォーマットに変更、かつ unoptimized プロパティを付与 */}
              <Image
                src={currentUrl}
                alt={`${type} image`}
                fill
                priority
                unoptimized
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="text-[11px] font-mono text-neutral-900 tracking-wider font-semibold bg-white hover:bg-neutral-100 px-3.5 py-2 rounded-xl shadow-sm transition-all duration-200 active:scale-[0.96]"
                >
                  {t.changeImage.toUpperCase()}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={uploading}
                  className="text-[11px] font-mono text-white tracking-wider font-semibold bg-red-600 hover:bg-red-700 px-3.5 py-2 rounded-xl shadow-sm transition-all duration-200 active:scale-[0.96]"
                >
                  {t.deleteImage.toUpperCase()}
                </button>
              </div>
            </>
          ) : (
            <div className="select-none text-center">
              {type === "avatar" ? (
                <div className="text-4xl text-neutral-300 font-light uppercase tracking-wide">
                  {label ? label[0] : "CJ"}
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="w-8 h-8 text-neutral-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.9 2.9m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <span className="text-[12px] text-neutral-400 font-medium tracking-wide">
                    {t.placeholderCover}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-full flex items-center justify-center gap-6 flex-wrap">
          <label className="inline-flex items-center cursor-pointer">
            <span className={`bg-neutral-900 hover:bg-neutral-800 text-white border border-transparent px-7 py-3.5 rounded-full text-[15px] font-medium tracking-wide transition-all duration-200 shadow-sm hover:shadow active:scale-[0.97] ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              {uploading ? t.uploading : buttonLabel}
            </span>

            <input 
              type="file" 
              ref={fileInputRef}
              accept="image/*" 
              onChange={handleFileChange} 
              disabled={uploading} 
              className="hidden" 
            />
          </label>

          <span className="text-[14px] text-neutral-400 font-normal tracking-wide truncate max-w-[240px]">
            {fileName}
          </span>
        </div>

        {statusMessage && (
          <div className={`text-[13px] tracking-wide p-4 rounded-[24px] border w-full max-w-xl text-center transition-all duration-300 ${
            statusMessage.type === "error" 
              ? "text-red-600 bg-red-50/40 border-red-200" 
              : "text-neutral-700 bg-neutral-50/60 border-neutral-200"
          }`}>
            {statusMessage.text}
          </div>
        )}

      </div>
    </div>
  )
}
