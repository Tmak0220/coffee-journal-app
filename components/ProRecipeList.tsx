"use client"

import React from "react"
import Link from "next/link"

// 必要に応じてプロジェクトのデータ型に合わせて調整してください
type ProRecipe = {
  id: string
  title: string
  coffee_name?: string
  coffee_lot?: string
  created_at: string
  // サムネイル画像やその他の表示したい情報があればここに追加
  thumbnail_url?: string 
}

type ProRecipeListProps = {
  recipes: ProRecipe[]
  username: string
  lang: string
  t: {
    noRecipes?: string
    viewRecipe?: string
    coffeeName?: string
    coffeeLot?: string
  }
}

export default function ProRecipeList({ recipes = [], username, lang, t }: ProRecipeListProps) {
  // レシピが1つもない場合の表示
  if (recipes.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50">
        <p className="text-sm text-neutral-400">
          {t.noRecipes || "投稿されたプロレシピはまだありません。"}
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {recipes.map((recipe) => (
        <Link
          key={recipe.id}
          href={`/${lang}/recipes/${recipe.id}`} // 詳細ページへのルーティングに合わせて調整してください
          className="group block border border-neutral-200/80 rounded-2xl overflow-hidden bg-white hover:border-neutral-400/80 hover:shadow-md transition-all duration-300"
        >
          {/* サムネイル画像エリア (画像がない場合はプレースホルダー) */}
          <div className="aspect-[16/10] bg-neutral-100 w-full relative overflow-hidden flex items-center justify-center border-b border-neutral-100">
            {recipe.thumbnail_url ? (
              <img
                src={recipe.thumbnail_url}
                alt={recipe.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-neutral-300">
                <svg className="w-8 h-8 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
            )}
          </div>

          {/* コンテンツエリア */}
          <div className="p-5 space-y-3">
            <h3 className="font-bold text-[15px] text-neutral-900 leading-snug tracking-wide line-clamp-2 group-hover:text-neutral-800 transition-colors">
              {recipe.title}
            </h3>

            {/* 豆の基本情報（データがあれば表示） */}
            {(recipe.coffee_name || recipe.coffee_lot) && (
              <div className="space-y-1 pt-1">
                {recipe.coffee_name && (
                  <p className="text-[12px] text-neutral-500 line-clamp-1 flex items-center gap-1.5">
                    <span className="font-semibold text-[11px] px-1.5 py-0.5 rounded bg-neutral-50 border border-neutral-200 text-neutral-600 shrink-0">
                      {t.coffeeName || "Bean"}
                    </span>
                    {recipe.coffee_name}
                  </p>
                )}
                {recipe.coffee_lot && (
                  <p className="text-[12px] text-neutral-400 line-clamp-1 flex items-center gap-1.5">
                    <span className="font-semibold text-[11px] px-1.5 py-0.5 rounded bg-neutral-50 border border-neutral-200 text-neutral-500 shrink-0">
                      {t.coffeeLot || "Lot"}
                    </span>
                    {recipe.coffee_lot}
                  </p>
                )}
              </div>
            )}

            {/* 日付・ボトムエリア */}
            <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400 font-medium">
              <span>
                {new Date(recipe.created_at).toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="text-neutral-500 font-semibold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                {t.viewRecipe || "レシピを見る"} →
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}