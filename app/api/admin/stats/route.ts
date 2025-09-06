import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const u = new URL(req.url)
  const botId = Number(u.searchParams.get("chatbotId") || "0")
  const days = Number(u.searchParams.get("days") || "7")

  const msgs = await query<any>(
    `SELECT DATE(timestamp) d, COUNT(*) c
     FROM chatbot_messages
     WHERE chatbot_id=? AND timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(timestamp) ORDER BY d ASC`,
    [botId, days],
  )

  const tks = await query<any>(
    `SELECT DATE(created_at) d, COUNT(*) c
     FROM tickets
     WHERE chatbot_id=? AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(created_at) ORDER BY d ASC`,
    [botId, days],
  )

  const byStatus = await query<any>(`SELECT status, COUNT(*) c FROM tickets WHERE chatbot_id=? GROUP BY status`, [
    botId,
  ])

  return NextResponse.json({ messagesByDay: msgs, ticketsByDay: tks, ticketsByStatus: byStatus })
}
