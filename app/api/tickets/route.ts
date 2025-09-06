import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    console.log("Tickets API called")

    const body = await request.json()
    console.log("Request body:", body)

    const { chatbotId, name, phone, email, subject, message, imageUrl } = body

    if (!chatbotId || !name || !phone || !subject || !message) {
      console.log("Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user IP and user agent
    const userIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    console.log("Creating ticket with data:", {
      chatbot_id: Number.parseInt(chatbotId),
      name: name.trim(),
      email: email.trim(),
      phone: phone || null,
      subject: subject.trim(),
      message: message.trim(),
      image_url: imageUrl || null,
      user_ip: userIp,
      user_agent: userAgent,
    })

    await sql`
      INSERT INTO tickets (chatbot_id, name, phone, email, subject, message, image_url, status, created_at)
      VALUES (${Number.parseInt(chatbotId)}, ${name.trim()}, ${phone.trim()}, ${email || null}, ${subject.trim()}, ${message.trim()}, ${imageUrl || null}, 'open', NOW())
    `

    const result = await sql`
      SELECT id, created_at FROM tickets WHERE id = LAST_INSERT_ID()
    `

    if (!Array.isArray(result) || result.length === 0) {
      throw new Error("Failed to create ticket")
    }

    const ticket = result[0]

    console.log("Ticket created successfully:", ticket.id)

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      message: "تیکت شما با موفقیت ثبت شد",
      createdAt: ticket.created_at,
    })
  } catch (error) {
    console.error("Error creating ticket:", error)
    return NextResponse.json(
      {
        error: "خطا در ثبت تیکت",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chatbotId = searchParams.get("chatbotId")
    const phone = searchParams.get("phone")

    if (!chatbotId) {
      console.log("chatbotId is required")
      return NextResponse.json({ error: "chatbotId is required" }, { status: 400 })
    }

    let tickets
    if (phone) {
      // Get tickets for specific phone number
      tickets = await sql`
        SELECT id, name, phone, email, subject, message, image_url, status, created_at, updated_at
        FROM tickets 
        WHERE chatbot_id = ${chatbotId} AND phone = ${phone}
        ORDER BY created_at DESC
      `
    } else {
      // Get all tickets for chatbot
      tickets = await sql`
        SELECT id, name, phone, email, subject, message, image_url, status, created_at, updated_at
        FROM tickets 
        WHERE chatbot_id = ${chatbotId}
        ORDER BY created_at DESC
      `
    }

    return NextResponse.json({
      success: true,
      tickets,
    })
  } catch (error) {
    console.error("Error fetching tickets:", error)
    return NextResponse.json({ error: "خطا در دریافت تیکت‌ها" }, { status: 500 })
  }
}
