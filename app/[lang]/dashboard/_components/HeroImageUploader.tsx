"use client"

import { useState, useEffect, useRef } from "react"
import { compressImage } from "@/lib/imageCompression"

type Props = {
  currentLang?: "ja" | "en" | string
  initialImageUrls?: string[]
  onImagesChanged?: (urls: string[]) => void
  onImageUploaded?: (url: string | null) => void
  deferDeletion?: boolean
  onRemovedImagesChanged?: (urls: string[]) => void
  isAdmin?: boolean
}

const uploaderDict = {
  ja: {
    sectionTitle: "IMAGES / 画像 (必須)",
    placeholder: "画像をアップロード、またはドラッグ＆ドロップ",
    changeImage: "変更",
    deleteImage: "削除",
    moveLeft: "左へ移動",
    moveRight: "右へ移動",
    restoreImage: "復元する",
    pendingDeletion: "保存すると削除される画像",
    compressing: "アップロード中...",
    uploadFailed: "アップロード失敗",
    deleteFailed: "削除に失敗しました",
    maxAlert: "最大3枚まで登録可能です"
  },
  en: {
    sectionTitle: "IMAGES (Required)",
    placeholder: "Upload Image or Drag & Drop",
    changeImage: "Change",
    deleteImage: "Delete",
    moveLeft: "Move Left",
    moveRight: "Move Right",
    restoreImage: "Restore",
    pendingDeletion: "Images to be deleted when saved",
    compressing: "Uploading...",
    uploadFailed: "Upload failed",
    deleteFailed: "Failed to delete",
    maxAlert: "Up to 3 images"
  }
} as const

const parseSafeUrls = (input: string[], isAdmin = false): string[] => {
  const filtered = input.map(url => url.trim()).filter(url => url.startsWith("http"))
  return isAdmin ? filtered : filtered.slice(0, 3)
}

export default function HeroImageUploader({ 
  currentLang = "ja", 
  initialImageUrls = [], 
  onImagesChanged, 
  onImageUploaded,
  deferDeletion = false,
  onRemovedImagesChanged,
  isAdmin = false
}: Props) {
  const langKey = currentLang === "en" ? "en" : "ja"
  const t = uploaderDict[langKey]
  
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(() => parseSafeUrls(initialImageUrls, isAdmin))
  const [uploading, setUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [removedImages, setRemovedImages] = useState<Array<{ url: string; index: number }>>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceIndexRef = useRef<number | null>(null)
  const urlsRef = useRef<string[]>([])
  
  const initialUrlsRef = useRef<string[]>(parseSafeUrls(initialImageUrls, isAdmin))
  const capturedInitialUrlsRef = useRef(initialUrlsRef.current.length > 0)

  useEffect(() => {
    const nextUrls = parseSafeUrls(initialImageUrls, isAdmin)
    if (deferDeletion && capturedInitialUrlsRef.current) return
    const currentSerialized = JSON.stringify(uploadedUrls)
    const nextSerialized = JSON.stringify(nextUrls)

    if (currentSerialized !== nextSerialized) {
      setUploadedUrls(nextUrls)
      initialUrlsRef.current = nextUrls
      if (nextUrls.length > 0) capturedInitialUrlsRef.current = true
    }
  }, [deferDeletion, initialImageUrls, uploadedUrls, isAdmin])

  useEffect(() => {
    urlsRef.current = uploadedUrls || []
  }, [uploadedUrls])

  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentUrls = urlsRef.current
      const originalUrls = initialUrlsRef.current
      const newlyAddedUrls = currentUrls.filter(url => !originalUrls.includes(url))
      
      if (newlyAddedUrls.length > 0) {
        const blob = new Blob([JSON.stringify({ urls: newlyAddedUrls })], { type: "application/json" })
        navigator.sendBeacon("/api/delete-object-beacon", blob)
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  const notifyParent = (urls: string[]) => {
    if (typeof onImagesChanged === "function") {
      onImagesChanged(urls)
    } else if (typeof onImageUploaded === "function") {
      onImageUploaded(urls[0] || null)
    }
  }

  // 順序入れ替え処理
  const moveImage = (index: number, direction: "left" | "right", e: React.MouseEvent) => {
    e.stopPropagation()
    const targetIndex = direction === "left" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= uploadedUrls.length) return

    const nextUrls = [...uploadedUrls]
    const [movedItem] = nextUrls.splice(index, 1)
    nextUrls.splice(targetIndex, 0, movedItem)

    setUploadedUrls(nextUrls)
    notifyParent(nextUrls)
  }

  const triggerUpload = (index: number | null) => {
    if (uploading) return
    if (!isAdmin && index === null && safeRenderUrls.length >= 3) {
      setErrorMessage(t.maxAlert)
      return
    }
    replaceIndexRef.current = index
    fileInputRef.current?.click()
  }

  const processFile = async (file: File, targetIndex: number | null) => {
    if (!isAdmin && targetIndex === null && (uploadedUrls || []).length >= 3) {
      setErrorMessage(t.maxAlert)
      return
    }
    setUploading(true)
    setErrorMessage(null)
    
    try {
      const currentList = uploadedUrls || []
      if (targetIndex !== null && currentList[targetIndex]) {
        const isNewUpload = !initialUrlsRef.current.includes(currentList[targetIndex])
        if (isNewUpload) {
          await fetch("/api/delete-object", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: currentList[targetIndex] }),
          })
        }
      }

      const compressedFile = await compressImage(file)
      const formData = new FormData()
      formData.append("file", compressedFile)
      formData.append("folder", "tmp")

      const res = await fetch("/api/upload", { method: "POST", body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || `Status: ${res.status}`)

      let nextUrls: string[] = []
      if (targetIndex !== null) {
        const replacedUrl = currentList[targetIndex]
        nextUrls = [...currentList]
        nextUrls[targetIndex] = data.url
        if (deferDeletion && replacedUrl && replacedUrl !== data.url) {
          const nextRemoved = [...removedImages.filter((item) => item.url !== replacedUrl), { url: replacedUrl, index: targetIndex }]
          setRemovedImages(nextRemoved)
          onRemovedImagesChanged?.(nextRemoved.map((item) => item.url))
        }
      } else {
        nextUrls = [...currentList, data.url]
      }

      setUploadedUrls(nextUrls)
      notifyParent(nextUrls)
    } catch (err: any) {
      console.error(err)
      setErrorMessage(`${t.uploadFailed}: ${err.message || err}`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
      replaceIndexRef.current = null
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0], replaceIndexRef.current)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true)
    } else if (e.type === "dragleave") {
      setIsDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)

    if (uploading) return

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (!file.type.startsWith("image/")) return

      if (!isAdmin && safeRenderUrls.length >= 3) {
        setErrorMessage(t.maxAlert)
        return
      }

      await processFile(file, null)
    }
  }

  const removeImage = async (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const currentList = uploadedUrls || []
    const urlToDelete = currentList[index]
    if (!urlToDelete) return
    
    const isNewUpload = !initialUrlsRef.current.includes(urlToDelete)

    if (isNewUpload && !deferDeletion) {
      setUploading(true)
      setErrorMessage(null)
      try {
        const res = await fetch("/api/delete-object", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlToDelete }),
        })
        if (!res.ok) throw new Error(t.deleteFailed)
      } catch (err: any) {
        console.error(err)
        setErrorMessage(err.message || err)
        setUploading(false)
        return
      } finally {
        setUploading(false)
      }
    }
    
    const nextUrls = currentList.filter((_, i) => i !== index)
    if (deferDeletion) {
      const nextRemoved = [...removedImages.filter((item) => item.url !== urlToDelete), { url: urlToDelete, index }]
      setRemovedImages(nextRemoved)
      onRemovedImagesChanged?.(nextRemoved.map((item) => item.url))
    }
    setUploadedUrls(nextUrls)
    notifyParent(nextUrls)
  }

  const restoreImage = (url: string) => {
    if (!isAdmin && uploadedUrls.length >= 3) {
      setErrorMessage(t.maxAlert)
      return
    }
    const removed = removedImages.find((item) => item.url === url)
    if (!removed) return
    const nextUrls = [...uploadedUrls]
    nextUrls.splice(Math.min(removed.index, nextUrls.length), 0, url)
    const nextRemoved = removedImages.filter((item) => item.url !== url)
    setRemovedImages(nextRemoved)
    onRemovedImagesChanged?.(nextRemoved.map((item) => item.url))
    setUploadedUrls(nextUrls)
    notifyParent(nextUrls)
  }

  const safeRenderUrls = parseSafeUrls(uploadedUrls, isAdmin)
  const currentLength = safeRenderUrls.length
  const showUploadButton = isAdmin || currentLength < 3

  return (
    <div 
      className={`bg-white border p-6 sm:p-10 rounded-xl shadow-sm w-full max-w-5xl mx-auto transition-colors duration-200 ${
        isDragActive ? "border-neutral-400 bg-neutral-50/50" : "border-neutral-200"
      }`}
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
    >
      <span className="text-[15px] font-semibold tracking-wider text-neutral-900 uppercase block mb-4">
        {t.sectionTitle} (
        {isAdmin 
          ? `${currentLength}${langKey === "ja" ? "枚" : " images"}`
          : `${currentLength}${langKey === "ja" ? "枚 / 最大3枚" : " / Max 3 images"}`}
        )
      </span>
      
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageChange} 
        accept="image/*" 
        className="hidden" 
        disabled={uploading}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full">
        {safeRenderUrls.map((url, index) => (
          <div 
            key={url}
            className="relative w-full aspect-video rounded-xl border border-neutral-300 overflow-hidden group bg-white shadow-sm"
          >
            <img 
              src={url} 
              alt={`Preview ${index + 1}`} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" 
            />
            
            {/* メインのホバー操作UI */}
            <div className="absolute inset-0 bg-neutral-900/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center p-2 gap-2">
              
              {/* 移動ボタンエリア（2枚以上ある場合のみ表示） */}
              {safeRenderUrls.length > 1 && (
                <div className="flex items-center gap-1.5 bg-neutral-900/80 p-1 rounded-lg border border-white/20 mb-1">
                  <button
                    type="button"
                    onClick={(e) => moveImage(index, "left", e)}
                    disabled={index === 0 || uploading}
                    title={t.moveLeft}
                    className="p-1 text-white hover:text-amber-300 disabled:opacity-30 disabled:hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                  <span className="text-[11px] text-neutral-300 font-medium px-1 select-none">
                    {index + 1} / {safeRenderUrls.length}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => moveImage(index, "right", e)}
                    disabled={index === safeRenderUrls.length - 1 || uploading}
                    title={t.moveRight}
                    className="p-1 text-white hover:text-amber-300 disabled:opacity-30 disabled:hover:text-white transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                </div>
              )}

              {/* 変更・削除ボタン */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => triggerUpload(index)}
                  disabled={uploading}
                  className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium tracking-wider px-3 py-1.5 rounded-md transition-all duration-200 border border-white/10"
                >
                  {t.changeImage}
                </button>
                <button
                  type="button"
                  onClick={(e) => removeImage(index, e)}
                  disabled={uploading}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-medium tracking-wider px-3 py-1.5 rounded-md transition-all duration-200"
                >
                  {t.deleteImage}
                </button>
              </div>
            </div>
          </div>
        ))}

        {showUploadButton && (
          <div 
            onClick={() => triggerUpload(null)}
            className="relative w-full aspect-video rounded-xl border border-neutral-300 bg-white text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center p-4 text-center select-none"
          >
            <div className="text-neutral-400 mb-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <p className="text-[15px] text-neutral-400 font-normal tracking-wide">
              {t.placeholder} {!isAdmin && `(${currentLength}/3)`}
            </p>
          </div>
        )}
      </div>

      {deferDeletion && removedImages.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200/70 bg-amber-50/55 p-4">
          <p className="mb-3 text-[11px] font-semibold tracking-wide text-amber-900">{t.pendingDeletion}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {removedImages.map(({ url }) => (
              <div key={url} className="overflow-hidden rounded-xl border border-amber-200 bg-white">
                <img src={url} alt="" className="aspect-video w-full object-cover opacity-60" />
                <button
                  type="button"
                  onClick={() => restoreImage(url)}
                  className="w-full border-t border-amber-100 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-50"
                >
                  {t.restoreImage}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {uploading && (
        <p className="text-sm text-neutral-500 font-medium animate-pulse text-center mt-4">
          {t.compressing}
        </p>
      )}

      {errorMessage && (
        <div className="text-sm p-4 rounded-xl border text-red-600 bg-red-50 border-red-200 text-center max-w-xl mx-auto mt-4">
          {errorMessage}
        </div>
      )}
    </div>
  )
}