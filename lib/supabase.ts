import { createBrowserClient } from '@supabase/ssr'

// 💡 createClient から createBrowserClient に変更
// これにより、ブラウザ側でログインした際に自動でクッキーが生成・管理されるようになります。
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)