import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const chatbotId = params.id

    if (!chatbotId) {
      return NextResponse.json({ error: "Chatbot ID is required" }, { status: 400 })
    }

    // Get chatbot info with stats multiplier
    const chatbotResult = await sql`
      SELECT name, stats_multiplier
      FROM chatbots 
      WHERE id = ${chatbotId}
    `

    if (!Array.isArray(chatbotResult) || chatbotResult.length === 0) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 })
    }

    const chatbot = chatbotResult[0]
    const multiplier = chatbot.stats_multiplier || 1

    // Get real message count
    const messageResult = await sql`
      SELECT COUNT(*) as count
      FROM messages 
      WHERE chatbot_id = ${chatbotId}
    `
    const realMessageCount = Number.parseInt(messageResult[0]?.count || "0")
    const displayMessageCount = Math.floor(realMessageCount * multiplier)

    // Get real user count (unique phone numbers)
    const userResult = await sql`
      SELECT COUNT(DISTINCT phone) as count
      FROM messages 
      WHERE chatbot_id = ${chatbotId} AND phone IS NOT NULL
    `
    const realUserCount = Number.parseInt(userResult[0]?.count || "0")
    const displayUserCount = Math.floor(realUserCount * multiplier)

    // Get real ticket count
    const ticketResult = await sql`
      SELECT COUNT(*) as count
      FROM tickets 
      WHERE chatbot_id = ${chatbotId}
    `
    const realTicketCount = Number.parseInt(ticketResult[0]?.count || "0")
    const displayTicketCount = Math.floor(realTicketCount * multiplier)

    const messagesChartResult = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM messages 
      WHERE chatbot_id = ${chatbotId} 
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `

    // Apply multiplier to chart data
    const messagesChart = messagesChartResult.map((row) => ({
      date: row.date,
      count: Math.floor(Number.parseInt(row.count) * multiplier),
    }))

    // Get top questions from messages
    const topQuestionsResult = await sql`
      SELECT 
        content as question,
        COUNT(*) as count
      FROM messages 
      WHERE chatbot_id = ${chatbotId} 
        AND role = 'user'
        AND content IS NOT NULL
        AND LENGTH(content) > 5
      GROUP BY content
      ORDER BY count DESC
      LIMIT 5
    `

    // Apply multiplier to top questions
    const topQuestions = topQuestionsResult.map((row) => ({
      question: row.question,
      count: Math.floor(Number.parseInt(row.count) * multiplier),
    }))

    // Get recent tickets
    const recentTicketsResult = await sql`
      SELECT 
        id,
        name,
        subject,
        status,
        created_at
      FROM tickets 
      WHERE chatbot_id = ${chatbotId}
      ORDER BY created_at DESC
      LIMIT 5
    `

    return NextResponse.json({
      success: true,
      data: {
        chatbot: {
          name: chatbot.name,
          stats_multiplier: multiplier,
        },
        stats: {
          totalMessages: displayMessageCount,
          totalUsers: displayUserCount,
          totalTickets: displayTicketCount,
          realStats: {
            messages: realMessageCount,
            users: realUserCount,
            tickets: realTicketCount,
          },
        },
        charts: {
          messages: messagesChart,
          topQuestions: topQuestions,
        },
        recentTickets: recentTicketsResult,
      },
    })
  } catch (error) {
    console.error("Error fetching admin panel data:", error)
    return NextResponse.json({ error: "خطا در دریافت داده‌های پنل ادمین" }, { status: 500 })
  }
}
