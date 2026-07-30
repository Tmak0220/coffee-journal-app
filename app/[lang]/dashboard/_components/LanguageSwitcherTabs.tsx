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
    <div className="mx-auto flex w-full max-w-5xl flex-col justify-between gap-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
      
      <div className="space-y-1">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-900">
          {content.title}
        </h2>
        <p className="text-xs font-normal tracking-wide text-neutral-500">
          {content.description}
        </p>
      </div>

      <div className="inline-grid grid-cols-2 gap-1 rounded-xl border border-neutral-200 bg-neutral-100/70 p-1.5 shadow-sm select-none self-start sm:self-center">
        <button
          type="button"
          onClick={() => onChange("ja")}
          className={`min-h-11 rounded-lg px-6 py-2.5 text-sm tracking-wide transition-all duration-200 active:scale-[0.97] ${
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
          className={`min-h-11 rounded-lg px-6 py-2.5 text-sm tracking-wide transition-all duration-200 active:scale-[0.97] ${
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
