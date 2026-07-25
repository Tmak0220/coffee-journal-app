import imageCompression from "browser-image-compression"

type CompressionOptions = {
  maxSizeMB?: number
  maxWidthOrHeight?: number
}

export async function compressImage(
  file: File,
  {
    maxSizeMB = 1,
    maxWidthOrHeight = 1200,
  }: CompressionOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選択してください。")
  }

  const options = {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    preserveExif: false,
  }

  try {
    // 1. 画像を圧縮する（この時点でライブラリの仕様によりファイル名がblob等に壊れることがあります）
    const compressedFile = await imageCompression(file, options)

    const maxBytes = Math.max(maxSizeMB, 0.1) * 1024 * 1024
    if (compressedFile.size > maxBytes * 1.15) {
      throw new Error(
        "画像を指定されたサイズまで圧縮できませんでした。別の画像をお試しください。"
      )
    }

    // 2. 🟢 壊れたファイル名を修復する
    // 元のファイル（file.name）から拡張子（jpgやpngなど）を抜き出し、デフォルトは 'jpg' にします
    const originalExt = file.name.split('.').pop() || 'jpg'
    
    // 3. 🟢 正しい拡張子を持たせた新しい File オブジェクトを作り直す
    const repairedFile = new File(
      [compressedFile], 
      `compressed-${Date.now()}.${originalExt}`, 
      { type: compressedFile.type, lastModified: Date.now() }
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
