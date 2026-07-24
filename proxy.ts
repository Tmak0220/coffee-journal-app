import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // 💡 【最重要】APIルート（/api/...）へのリクエストはミドルウェアの干渉を受けずにバイパスさせる
  if (pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // 💡 1. 最初にベースとなるレスポンスを生成
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 💡 2. 最新の getAll / setAll 方式でクッキー同期を定義
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // リクエスト側のクッキーを更新
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          // レスポンスを新しくしてヘッダーを同期
          response = NextResponse.next({
            request,
          })
          
          // レスポンス側のクッキーも更新
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 💡 3. 現在のログインユーザーを取得（getAllのおかげでクッキーが100%読み取れます）
  const { data: { user } } = await supabase.auth.getUser()

  // ⭕️ ログインが必要な保護ルート（dashboard と edit-post）の判定
  // `/dashboard`, `/edit-post` および `/ja/dashboard`, `/en/edit-post` などにマッチします
  const isProtectedPath = 
    pathname.startsWith('/dashboard') || 
    pathname.startsWith('/edit-post') || 
    /^\/(ja|en)\/(dashboard|edit-post)/.test(pathname)

  // 未ログインの状態で保護ルートにアクセスした場合、ログイン画面へリダイレクト
  if (isProtectedPath && !user) {
    // 現在のURLから「ja」か「en」を安全に抜き出す（デフォルトは 'ja'）
    const segments = pathname.split('/')
    const currentLang = (segments[1] === 'en' || segments[1] === 'ja') ? segments[1] : 'ja'

    const url = request.nextUrl.clone()
    url.pathname = `/${currentLang}/login`
    url.searchParams.set('redirectedFrom', pathname)
    return NextResponse.redirect(url)
  }

  // 💡 4. クッキーが正しく詰め込まれた response を返す
  return response
}

// 適用するスコープ（静的ファイルや画像を除外）
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}