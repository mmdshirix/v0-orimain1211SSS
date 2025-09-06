import { NextResponse } from "next/server"
import { sqlUnsafe } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const name = (body?.name ?? "").toString().trim()
    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })

    const primaryColor = body?.primary_color ?? "#14b8a6"
    const textColor = body?.text_color ?? "#ffffff"
    const backgroundColor = body?.background_color ?? "#f3f4f6"
    const chatIcon = body?.chat_icon ?? "💬"
    const position = body?.position ?? "bottom-right"
    const marginX = Number(body?.margin_x ?? 20)
    const marginY = Number(body?.margin_y ?? 20)
    const welcomeMessage = body?.welcome_message ?? "سلام! چطور می‌توانم به شما کمک کنم؟"
    const navMessage = body?.navigation_message ?? "چه چیزی شما را به اینجا آورده است؟"
    const kbText = body?.knowledge_base_text ?? null
    const kbUrl = body?.knowledge_base_url ?? null
    const storeUrl = body?.store_url ?? null
    const aiUrl = body?.ai_url ?? null
    const statsMultiplier = Number(body?.stats_multiplier ?? 1.0)

    await sqlUnsafe(
      `INSERT INTO chatbots
       (name, primary_color, text_color, background_color, chat_icon, position, margin_x, margin_y,
        welcome_message, navigation_message, knowledge_base_text, knowledge_base_url, store_url, ai_url, stats_multiplier)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        name,
        primaryColor,
        textColor,
        backgroundColor,
        chatIcon,
        position,
        marginX,
        marginY,
        welcomeMessage,
        navMessage,
        kbText,
        kbUrl,
        storeUrl,
        aiUrl,
        statsMultiplier,
      ],
    )

    const lastId: any[] = await sqlUnsafe(`SELECT LAST_INSERT_ID() AS id`)
    const id = lastId?.[0]?.id

    const botRows: any[] = await sqlUnsafe(`SELECT * FROM chatbots WHERE id = ?`, [id])
    const bot = botRows?.[0] ?? null

    return NextResponse.json({ ok: true, bot }, { status: 201 })
  } catch (e: any) {
    console.error("POST /api/chatbots error:", e)
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}

export async function GET() {
  try {
    console.log("[v0] Starting GET /api/chatbots")

    // Test basic connection
    const testResult = await sqlUnsafe(`SELECT 1 as test`)
    console.log("[v0] Database connection test:", testResult)

    // Check if chatbots table exists
    const tableCheck = await sqlUnsafe(`SHOW TABLES LIKE 'chatbots'`)
    console.log("[v0] Chatbots table exists:", tableCheck.length > 0)

    if (tableCheck.length === 0) {
      console.log("[v0] Chatbots table doesn't exist, initializing database...")
      const { initializeDatabase } = await import("@/lib/db")
      const initResult = await initializeDatabase()
      console.log("[v0] Database initialization result:", initResult)
    }

    const rows = await sqlUnsafe(`SELECT * FROM chatbots ORDER BY id DESC`)
    console.log("[v0] Found chatbots:", rows.length)
    return NextResponse.json(rows)
  } catch (e: any) {
    console.error("[v0] GET /api/chatbots error:", e)
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}
