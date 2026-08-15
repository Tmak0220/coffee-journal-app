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
      title: "CONTENT LANGUAGE",
      description: "作成・編集・一覧表示する投稿の言語を選択します。画面表示の言語はヘッダーで変更できます。",
      labelJa: "日本語の投稿",
      labelEn: "英語の投稿"
    },
    en: {
      title: "CONTENT LANGUAGE",
      description: "Choose the language for content you create, edit, and view. Change the interface language in the header.",
      labelJa: "Japanese content",
      labelEn: "English content"
    }
  }[isEn ? "en" : "ja"]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col justify-between gap-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
      
      <div className="max-w-2xl space-y-1.5">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-900">
          {content.title}
        </h2>
        <p className="text-xs font-normal leading-5 tracking-wide text-neutral-500">
          {content.description}
        </p>
      </div>

      <div className="inline-grid grid-cols-2 gap-1 rounded-xl border border-neutral-200 bg-neutral-100/70 p-1.5 shadow-sm select-none self-start sm:self-center">
        <button
          type="button"
          onClick={() => onChange("ja")}
          className={`min-h-11 rounded-lg px-4 py-2.5 text-xs tracking-wide transition-all duration-200 active:scale-[0.97] sm:px-5 ${
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
          className={`min-h-11 rounded-lg px-4 py-2.5 text-xs tracking-wide transition-all duration-200 active:scale-[0.97] sm:px-5 ${
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
