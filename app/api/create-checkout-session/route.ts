import { NextResponse } from "next/server"

// Checkout is created by the authenticated Server Action at
// /[lang]/members/action.ts. Keep this legacy endpoint closed so an old client
// cannot create a session with the removed single-price configuration.
export async function POST() {
  return NextResponse.json(
    { error: "Use the membership checkout flow" },
    { status: 410 }
  )
}
