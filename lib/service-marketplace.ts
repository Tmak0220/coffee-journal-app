export const SERVICE_TYPES = [
  "brew_recipe_review",
  "online_consultation",
  "roast_water_review",
] as const

export type ServiceType = (typeof SERVICE_TYPES)[number]

export const SERVICE_COPY = {
  brew_recipe_review: {
    ja: { title: "抽出レシピ改善", description: "抽出レシピと目標の味わいを確認し、改善案をまとめてお返しします。" },
    en: { title: "Brew Recipe Review", description: "Receive practical recommendations based on your recipe and target cup profile." },
  },
  online_consultation: {
    ja: { title: "オンライン相談", description: "コーヒーに関する課題をオンラインで整理し、次に試すことを一緒に決めます。" },
    en: { title: "Online Consultation", description: "Discuss a coffee-related challenge online and leave with clear next steps." },
  },
  roast_water_review: {
    ja: { title: "焙煎・水質レビュー", description: "焙煎記録または使用水の数値を確認し、比較・検証の視点からフィードバックします。" },
    en: { title: "Roast & Water Review", description: "Get structured feedback on roast records or brewing-water measurements." },
  },
} satisfies Record<ServiceType, Record<"ja" | "en", { title: string; description: string }>>

export const formatServicePrice = (priceYen: number, lang: "ja" | "en") =>
  new Intl.NumberFormat(lang === "en" ? "en-US" : "ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(priceYen)
