"use client"

type LangMode = "ja" | "en"

type Props = {
  value: LangMode
  onChange: (lang: LangMode) => void
  currentUiLang: "ja" | "en"
}

export default function LanguageSwitcherTabs({
  value,
  onChange,
  currentUiLang
}: Props) {
  const isEn = currentUiLang === "en"

  const content = {
    ja: {
      title: "LANGUAGE",
      description: "編集する言語",
      labelJa: "日本語",
      labelEn: "English"
    },
    en: {
      title: "LANGUAGE",
      description: "Content Language Selection",
      labelJa: "Japanese",
      labelEn: "English"
    }
  }[isEn ? "en" : "ja"]

  return (
    <div className="bg-white border border-neutral-200/60 pt-6 sm:pt-12 pb-10 sm:pb-12 px-6 sm:px-12 rounded-xl shadow-sm w-full max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-8">
      
      <div className="space-y-1">
        <h2 className="text-[18px] font-bold tracking-[0.05em] text-neutral-900 uppercase">
          {content.title}
        </h2>
        <p className="text-[13px] font-normal tracking-wide text-neutral-400">
          {content.description}
        </p>
      </div>

      <div className="inline-flex p-1 bg-neutral-50 border border-neutral-200/60 rounded-full select-none self-start sm:self-center shadow-sm">
        <button
          type="button"
          onClick={() => onChange("ja")}
          className={`px-7 py-3 rounded-full text-[14px] tracking-wide transition-all duration-200 active:scale-[0.97] ${
            value === "ja"
              ? "bg-neutral-900 text-white font-medium shadow-sm"
              : "text-neutral-400 hover:text-neutral-700 font-normal"
          }`}
        >
          {content.labelJa}
        </button>
        <button
          type="button"
          onClick={() => onChange("en")}
          className={`px-7 py-3 rounded-full text-[14px] tracking-wide transition-all duration-200 active:scale-[0.97] ${
            value === "en"
              ? "bg-neutral-900 text-white font-medium shadow-sm"
              : "text-neutral-400 hover:text-neutral-700 font-normal"
          }`}
        >
          {content.labelEn}
        </button>
      </div>

    </div>
  )
}