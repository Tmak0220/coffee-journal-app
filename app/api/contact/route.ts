import { NextResponse } from "next/server"
import { Resend } from "resend"

export async function POST(request: Request) {
  try {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      console.error("RESEND_API_KEY is not configured")
      return NextResponse.json({ error: "Mail service is not configured" }, { status: 503 })
    }

    const resend = new Resend(apiKey)
    const { name, email, message, honey } = await request.json()

    if (honey) {
      return NextResponse.json({ success: true }) 
    }

    await resend.emails.send({
      from: "COFFEE JOURNAL <contact@pct-e.com>",
      to: "rivu65622252@gmail.com",
      subject: `【お問い合わせ】${name}様より`,
      text: `お名前: ${name}\nメールアドレス: ${email}\n\n【本文】\n${message}`,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("メール送信エラー:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
