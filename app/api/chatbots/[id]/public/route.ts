import { NextResponse } from "next/server"
import { sqlUnsafe } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function cors(res: any) {
  res.headers.set("Access-Control-Allow-Origin", "*")
  res.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  return res
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id)
    if (!id) return cors(NextResponse.json({ error: "invalid id" }, { status: 400 }))

    const rows: any[] = await sqlUnsafe(
      `SELECT
         id,
         COALESCE(name, '')                                       AS name,
         COALESCE(primary_color, '#14b8a6')                       AS primary_color,
         COALESCE(text_color, '#ffffff')                          AS text_color,
         COALESCE(background_color, '#f3f4f6')                    AS background_color,
         COALESCE(chat_icon, '💬')                                AS chat_icon,
         COALESCE(position, 'bottom-right')                       AS position,
         COALESCE(margin_x, 20)                                   AS margin_x,
         COALESCE(margin_y, 20)                                   AS margin_y,
         COALESCE(welcome_message, 'سلام! چطور می‌توانم به شما کمک کنم؟') AS welcome_message,
         COALESCE(navigation_message, 'چه چیزی شما را به اینجا آورده است؟') AS navigation_message,
         COALESCE(knowledge_base_text, '')                        AS knowledge_base_text,
         COALESCE(knowledge_base_url, '')                         AS knowledge_base_url,
         COALESCE(store_url, '')                                  AS store_url,
         COALESCE(ai_url, '')                                     AS ai_url,
         COALESCE(stats_multiplier, 1.00)                         AS stats_multiplier
       FROM chatbots WHERE id = ?`,
      [id],
    )

    if (!rows.length) return cors(NextResponse.json({ error: "not found" }, { status: 404 }))

    // Return public data only (no sensitive keys like deepseek_api_key)
    return cors(NextResponse.json(rows[0]))
  } catch (e: any) {
    console.error("GET /api/chatbots/[id]/public error:", e)
    return cors(NextResponse.json({ error: String(e?.message || e) }, { status: 500 }))
  }
}
