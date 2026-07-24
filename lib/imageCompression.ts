import imageCompression from "browser-image-compression"

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
  }

  try {
    // 1. 画像を圧縮する（この時点でライブラリの仕様によりファイル名がblob等に壊れることがあります）
    const compressedFile = await imageCompression(file, options)

    const MAX_SIZE = 5 * 1024 * 1024
    if (compressedFile.size > MAX_SIZE) {
      throw new Error(
        "画像サイズが大きすぎます。5MB以下の画像を選択してください。"
      )
    }

    // 2. 🟢 壊れたファイル名を修復する
    // 元のファイル（file.name）から拡張子（jpgやpngなど）を抜き出し、デフォルトは 'jpg' にします
    const originalExt = file.name.split('.').pop() || 'jpg'
    
    // 3. 🟢 正しい拡張子を持たせた新しい File オブジェクトを作り直す
    const repairedFile = new File(
      [compressedFile], 
      `compressed-${Date.now()}.${originalExt}`, 
      { type: compressedFile.type }
    )

    // 修復したファイルを返す
    return repairedFile
  } catch (error) {
    console.error("画像圧縮エラー:", error)

    if (error instanceof Error) {
      throw error
    }

    throw new Error(
      "画像の圧縮に失敗しました。別の画像をお試しください。"
    )
  }
}