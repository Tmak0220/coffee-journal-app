import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = 'https://ratqiewbugeyzdyojuvw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdHFpZXdidWdleXpkeW9qdXZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc4ODI5NywiZXhwIjoyMDk2MzY0Mjk3fQ._uhewkJcfJsmp2dml8Do7VruskJY-bdaTiTsuPEFJV8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ★あなたの新しいCloudflare R2（または新サイト）のベースURLに変えてください
const NEW_R2_BASE_URL = 'https://pub-209f68c742e44b3cbaa204d8b155f525.r2.dev'; 

async function cleanAndMigrate() {
  console.log('⏳ posts.json を読み込み中...');
  const rawData = fs.readFileSync('posts.json', 'utf-8');
  const posts = JSON.parse(rawData);

  const records = posts.map((post: any) => {
    let rawContent = post.content?.rendered || '';

    // ----------------------------------------------------
    // 【1】画像URLの抽出 と R2ドメインへの置換
    // ----------------------------------------------------
    const imageUrls: string[] = [];
    
    // data-src="https://real-coffee.net/..." のURLを抽出する正規表現
    const imgSrcRegex = /data-src="https:\/\/real-coffee\.net\/([^"]+)"/g;
    let match;
    
    while ((match = imgSrcRegex.exec(rawContent)) !== null) {
      const oldPath = match[1]; // wp-content/uploads/... の部分
      // 新しいR2のURLを組み立てて配列に追加
      imageUrls.push(`${NEW_R2_BASE_URL}/${oldPath}`);
    }

    // 本文中の古いドメインをすべて新しいR2ドメインに置換しておく
    let cleanedDescription = rawContent.replace(/https:\/\/real-coffee\.net/g, NEW_R2_BASE_URL);

    // ----------------------------------------------------
    // 【2】不要なHTMLタグのクレンジング（WordPress固有タグ除去）
    // ----------------------------------------------------
    // フィギュアタグや埋め込みブロックを綺麗に除去、またはシンプルなプレーンテキスト化
    cleanedDescription = cleanedDescription
      .replace(/<figure[^>]*>([\s\S]*?)<\/figure>/g, '$1') // figureタグ自体を外す
      .replace(/<div[^>]*>/g, '').replace(/<\/div>/g, '') // div除去
      .replace(/<p[^>]*>/g, '').replace(/<\/p>/g, '\n')     // pタグを改行に変換
      .replace(/<blockquote[^>]*>/g, '\n> ').replace(/<\/blockquote>/g, '\n') // 引用マークダウン化
      .replace(/<h[1-6][^>]*>/g, '\n### ').replace(/<\/h[1-6]>/g, '\n') // 見出しの簡易マークダウン化
      .replace(/<br\s*\/?>/g, '\n') // 改行タグを本物の改行に
      .replace(/<[^>]*>/g, '') // その他残った全てのHTMLタグ（aタグ等）を消去（テキストだけ残す）
      .replace(/\n\s*\n/g, '\n\n') // 無駄な連続改行を整理
      .trim();

    return {
      title: post.title?.rendered || '無題のログ',
      description: cleanedDescription, // クレンジング完了後の美しいテキスト
      image_urls: imageUrls,           // R2に紐付いた画像URL配列
      status: 'draft',
      created_at: post.date || new Date().toISOString(),
      updated_at: post.date || new Date().toISOString()
    };
  });

  console.log(`✅ ${records.length} 件のデータ整形＆画像抽出が完了。一度Supabaseをリセットして再投入します...`);

  // 二重登録を防ぐため、一度中身を完全に削除（TRUNCATE）
  await supabase.from('posts').delete().neq('status', 'completely_impossible_status_string');

  // 1000件ずつ流し込み
  const chunkSize = 1000;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    console.log(`🚀 ${i + 1} 〜 ${Math.min(i + chunkSize, records.length)} 件目をクレンジング投入中...`);
    
    const { error } = await supabase.from('posts').insert(chunk);
    if (error) {
      console.error('❌ エラー発生:', error.message);
      return;
    }
  }

  console.log('🎉 HTMLクレンジングおよびR2画像URLの自動マッピングがすべて成功しました！');
}

cleanAndMigrate();