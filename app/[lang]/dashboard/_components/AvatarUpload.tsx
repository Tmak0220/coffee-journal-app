"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { serverUploadAvatar } from "@/app/actions/createPost"
import { compressImage } from "@/lib/imageCompression"

type Props = {
  userId: string
  initialAvatarUrl: string | null
  username: string | null
  displayName: string | null
  label?: string
  lang?: "ja" | "en"
}

type StatusMessage = {
  text: string
  type: "error" | "success"
}

const textDict = {
  ja: {
    title: "AVATAR IMAGE",
    descTitle: "プロフィール画像の設定",
    viewProfile: "VIEW PROFILE",
    uploading: "処理中...",
    success: "アバター画像を更新しました。",
    error: "画像のアップロードに失敗しました。時間をおいて再度お試しください。",
    deleteError: "画像を削除できませんでした。時間をおいて再度お試しください。",
    deleteImage: "画像を削除",
    noFile: "選択されていません"
  },
  en: {
    title: "AVATAR IMAGE",
    descTitle: "Profile Picture Settings",
    viewProfile: "VIEW PROFILE",
    uploading: "Processing...",
    success: "Avatar image updated successfully.",
    error: "Failed to upload image. Please try again later.",
    deleteError: "Failed to delete the image. Please try again later.",
    deleteImage: "Delete image",
    noFile: "No file chosen"
  }
}

export default function AvatarUpload({ 
  userId, 
  initialAvatarUrl, 
  username, 
  displayName, 
  label,
  lang = "ja"
}: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = textDict[currentLang]

  const buttonLabel = label || (currentLang === "ja" ? "ファイルを選択" : "Choose File")

  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl || "")
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState("")
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)

  const uploadedUrlRef = useRef<string | null>(avatarUrl || null)

  useEffect(() => {
    setFileName(t.noFile)
  }, [currentLang, t.noFile])

  useEffect(() => {
    uploadedUrlRef.current = avatarUrl
  }, [avatarUrl])

  useEffect(() => () => setStatusMessage(null), [])

  const showMessage = (text: string, type: "error" | "success") => {
    setStatusMessage({ text, type })
    setTimeout(() => {
      setStatusMessage(null)
    }, 4000)
  }

  const deleteOldR2Object = async (urlToDelete: string) => {
    if (!urlToDelete || urlToDelete.startsWith("data:") || !urlToDelete.includes("avatars")) {
      return
    }
    try {
      await fetch("/api/delete-object", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToDelete }),
      })
    } catch (err) {
      console.error("Failed to clean up old avatar from R2:", err)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setFileName(t.noFile)
      return
    }

    setFileName(file.name)
    setUploading(true)
    setStatusMessage(null)

    const oldAvatarUrl = avatarUrl

    let uploadedNewUrl: string | null = null
    try {
      const compressedFile = await compressImage(file, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 512,
      })
      const formData = new FormData()
      formData.append("file", compressedFile)

      const publicUrl = await serverUploadAvatar(formData, userId)
      uploadedNewUrl = publicUrl

      const { error: dbError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId)

      if (dbError) throw dbError

      setAvatarUrl(publicUrl)
      showMessage(t.success, "success")

      if (oldAvatarUrl) {
        await deleteOldR2Object(oldAvatarUrl)
      }

    } catch (error) {
      console.error('Error uploading avatar:', error)
      if (uploadedNewUrl && uploadedNewUrl !== avatarUrl) {
        await deleteOldR2Object(uploadedNewUrl)
      }
      showMessage(t.error, "error")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleDelete = async () => {
    if (!avatarUrl || uploading) return
    setUploading(true)
    setStatusMessage(null)
    const oldAvatarUrl = avatarUrl
    try {
      const { error: dbError } = await supabase
        .from("users")
        .update({ avatar_url: null })
        .eq("id", userId)
      if (dbError) throw dbError

      await deleteOldR2Object(oldAvatarUrl)
      setAvatarUrl("")
      uploadedUrlRef.current = null
      setFileName(t.noFile)
      showMessage(t.success, "success")
    } catch (error) {
      console.error("Error deleting avatar:", error)
      showMessage(t.deleteError, "error")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white border border-neutral-200/60 pt-6 sm:pt-12 pb-10 sm:pb-20 px-6 sm:px-12 rounded-xl shadow-sm w-full max-w-5xl mx-auto space-y-14">
      <div>
        <h2 className="text-[18px] font-bold tracking-[0.05em] text-neutral-900 uppercase">
          {t.title}
        </h2>
        <p className="mt-1 text-[13px] font-normal tracking-wide text-neutral-400">
          {t.descTitle}
        </p>
      </div>

      <div className="flex flex-col items-center space-y-16 w-full pt-2">
        <div className="group relative w-44 h-44 rounded-full overflow-hidden border border-neutral-200 bg-neutral-50/60 flex items-center justify-center shadow-sm cursor-pointer transition-colors duration-300">
          {username ? (
            <Link 
              href={`/${currentLang}/users/${username}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="absolute inset-0 w-full h-full flex items-center justify-center"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  fill
                  sizes="176px"
                  priority
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="text-4xl text-neutral-300 select-none tracking-wide flex items-center justify-center transition-transform duration-500 group-hover:scale-105 font-light uppercase">
                  {(displayName || username || "U")[0]}
                </div>
              )}
              
              <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <span className="text-[11px] text-white tracking-[0.2em] font-medium pl-[0.2em]">
                  {t.viewProfile}
                </span>
              </div>
            </Link>
          ) : (
            avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill sizes="176px" priority className="object-cover" />
            ) : (
              <div className="text-4xl text-neutral-300 select-none font-light uppercase">
                {(displayName || username || "U")[0]}
              </div>
            )
          )}
        </div>

        <div className="w-full flex items-center justify-center gap-6 flex-wrap">
          <label className="inline-flex items-center cursor-pointer">
            <span className={`bg-neutral-900 hover:bg-neutral-800 text-white border border-transparent px-7 py-3.5 rounded-full text-[15px] font-medium tracking-wide transition-all duration-200 shadow-sm hover:shadow active:scale-[0.97] ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              {uploading ? t.uploading : buttonLabel}
            </span>

            <input 
              type="file" 
              accept="image/*" 
              onChange={handleUpload} 
              disabled={uploading} 
              className="hidden" 
            />
          </label>

          {avatarUrl && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading}
              className="rounded-full border border-neutral-300 bg-white px-6 py-3.5 text-[13px] font-medium text-neutral-600 transition hover:border-red-300 hover:text-red-600 disabled:opacity-50"
            >
              {t.deleteImage}
            </button>
          )}

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
