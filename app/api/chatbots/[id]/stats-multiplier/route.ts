import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const chatbotId = Number(params.id)

  try {
    const result = await sql`
      SELECT stats_multiplier FROM chatbots WHERE id = ${chatbotId}
    `

    if (!Array.isArray(result) || result.length === 0) {
      return NextResponse.json({ error: "چت‌بات یافت نشد" }, { status: 404 })
    }

    return NextResponse.json({
      chatbot_id: chatbotId,
      stats_multiplier: Number(result[0].stats_multiplier) || 1.0,
    })
  } catch (error) {
    console.error("Error fetching stats multiplier:", error)
    return NextResponse.json({ error: "خطا در دریافت ضریب آماری" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const chatbotId = Number(params.id)

  try {
    const { stats_multiplier } = await request.json()

    // Validate multiplier
    if (typeof stats_multiplier !== "number" || stats_multiplier < 0.1 || stats_multiplier > 100) {
      return NextResponse.json({ error: "ضریب باید بین 0.1 تا 100 باشد" }, { status: 400 })
    }

    await sql`
      UPDATE chatbots 
      SET stats_multiplier = ${stats_multiplier}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${chatbotId}
    `

    const result = await sql`
      SELECT id, stats_multiplier FROM chatbots WHERE id = ${chatbotId}
    `

    if (!Array.isArray(result) || result.length === 0) {
      return NextResponse.json({ error: "چت‌بات یافت نشد" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      chatbot_id: chatbotId,
      stats_multiplier: Number(result[0].stats_multiplier),
      message: "ضریب آماری با موفقیت به‌روزرسانی شد",
    })
  } catch (error) {
    console.error("Error updating stats multiplier:", error)
    return NextResponse.json({ error: "خطا در به‌روزرسانی ضریب آماری" }, { status: 500 })
  }
}
