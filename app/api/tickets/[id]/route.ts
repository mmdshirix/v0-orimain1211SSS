import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ticketId = params.id

    if (!ticketId) {
      return NextResponse.json({ error: "Ticket ID is required" }, { status: 400 })
    }

    const result = await sql`
      SELECT 
        t.id,
        t.chatbot_id,
        t.name,
        t.phone,
        t.email,
        t.subject,
        t.message,
        t.image_url,
        t.status,
        t.created_at,
        t.updated_at,
        COALESCE(
          JSON_ARRAYAGG(
            CASE WHEN tr.id IS NOT NULL THEN
              JSON_OBJECT(
                'id', tr.id,
                'message', tr.message,
                'is_admin', tr.is_admin,
                'created_at', tr.created_at
              )
            END
          ),
          JSON_ARRAY()
        ) as responses
      FROM tickets t
      LEFT JOIN ticket_responses tr ON t.id = tr.ticket_id
      WHERE t.id = ${ticketId}
      GROUP BY t.id, t.chatbot_id, t.name, t.phone, t.email, t.subject, t.message, t.image_url, t.status, t.created_at, t.updated_at
    `

    if (!Array.isArray(result) || result.length === 0) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      ticket: result[0],
    })
  } catch (error) {
    console.error("Error fetching ticket:", error)
    return NextResponse.json({ error: "خطا در دریافت تیکت" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ticketId = params.id
    const { status } = await request.json()

    if (!ticketId || !status) {
      return NextResponse.json({ error: "Ticket ID and status are required" }, { status: 400 })
    }

    await sql`
      UPDATE tickets 
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${ticketId}
    `

    const result = await sql`
      SELECT id, status, updated_at FROM tickets WHERE id = ${ticketId}
    `

    if (!Array.isArray(result) || result.length === 0) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      ticket: result[0],
    })
  } catch (error) {
    console.error("Error updating ticket:", error)
    return NextResponse.json({ error: "خطا در به‌روزرسانی تیکت" }, { status: 500 })
  }
}
