"use client"

import React from "react"
import { Globe, ShoppingBag, Link2, Plus, Trash2 } from "lucide-react"

type LinkItem = {
  label: string
  url: string
}

type Props = {
  links: LinkItem[]
  onChange: (links: LinkItem[]) => void
  label: string
  description: string
  placeholderLabel: string
  placeholderUrl: string
  addLabel: string
}

export default function SocialLinksInput({
  links,
  onChange,
  label,
  description,
  placeholderLabel,
  placeholderUrl,
  addLabel
}: Props) {
  
  const handleAdd = () => {
    onChange([...links, { label: "", url: "" }])
  }

  const handleRemove = (index: number) => {
    onChange(links.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, field: keyof LinkItem, value: string) => {
    const updated = [...links]
    updated[index][field] = value
    onChange(updated)
  }

  const getSocialIcon = (url: string) => {
    const lowerUrl = url.toLowerCase()
    if (!lowerUrl.trim()) return <Link2 className="w-4 h-4 text-neutral-400" />

    if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) {
      return (
        <svg className="w-4 h-4 text-neutral-800" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    }
    if (lowerUrl.includes("facebook.com")) {
      return (
        <svg className="w-4 h-4 text-neutral-800" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
        </svg>
      )
    }
    if (lowerUrl.includes("instagram.com")) {
      return (
        <svg className="w-4 h-4 text-neutral-800" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
        </svg>
      )
    }
    if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
      return (
        <svg className="w-4 h-4 text-neutral-800" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      )
    }
    if (lowerUrl.includes("tiktok.com")) {
      return (
        <svg className="w-4 h-4 text-neutral-800" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.525.02c1.31 0 2.564.332 3.666.92V6.2c-1.042-.617-2.25-.974-3.54-.974H10.1c-.005 0-.01 0-.015.001v4.472c0 .004 0 .008.001.012h2.553c2.478 0 4.49 2.012 4.49 4.49v.114a4.493 4.493 0 0 1-4.376 4.488h-.129a4.49 4.49 0 0 1-4.49-4.49v-14.3a.044.044 0 0 1 .043-.044h4.348z"/>
        </svg>
      )
    }
    if (lowerUrl.includes("shop") || lowerUrl.includes("store") || lowerUrl.includes("base.ec") || lowerUrl.includes("shopify")) {
      return <ShoppingBag className="w-4 h-4 text-neutral-800" />
    }
    return <Globe className="w-4 h-4 text-neutral-800" />
  }

  const inputStyle = "w-full text-[14px] border border-neutral-200/80 rounded-xl px-4 py-3 bg-neutral-50/30 text-neutral-900 focus:outline-none focus:border-neutral-400 focus:bg-white placeholder:text-neutral-400 transition-all duration-200"

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900 font-mono">{label}</label>
        <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5">{description}</p>
      </div>
      <div className="space-y-3">
        {links && links.map((link, index) => (
          <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-neutral-50/50 border border-neutral-100 p-3 rounded-xl animate-fade-in">
            <div className="flex-1 flex items-center gap-2">
              <div className="p-2 bg-white border border-neutral-200/60 rounded-lg shrink-0 flex items-center justify-center w-8 h-8">
                {getSocialIcon(link.url)}
              </div>
              <input 
                type="text"
                value={link.label}
                onChange={(e) => handleChange(index, "label", e.target.value)}
                placeholder={placeholderLabel}
                className={`${inputStyle} !py-2`}
              />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <input 
                type="url"
                value={link.url}
                onChange={(e) => handleChange(index, "url", e.target.value)}
                placeholder={placeholderUrl}
                className={`${inputStyle} !py-2`}
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-2 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors duration-150 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-[13px] font-medium text-neutral-600 hover:text-neutral-900 border border-dashed border-neutral-300 hover:border-neutral-400 bg-white px-4 py-2.5 rounded-xl transition-all duration-150 select-none"
        >
          <Plus className="w-4 h-4" />
          {addLabel}
        </button>
      </div>
    </div>
  )
}