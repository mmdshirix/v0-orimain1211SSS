import { NextResponse } from "next/server"
import { syncChatbotFAQs, getChatbotFAQs, type ChatbotFAQ } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function cors(res: NextResponse) {
  res.headers.set("Access-Control-Allow-Origin", "*")
  res.headers.set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  return res
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }))
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const chatbotId = Number.parseInt(params.id, 10)
  if (isNaN(chatbotId)) {
    return cors(NextResponse.json({ error: "شناسه چت‌بات نامعتبر است" }, { status: 400 }))
  }

  try {
    const faqs = await getChatbotFAQs(chatbotId)
    return cors(NextResponse.json(faqs))
  } catch (error) {
    console.error(`[API GET /faqs] Error fetching FAQs for chatbot ${chatbotId}:`, error)
    return cors(NextResponse.json({ error: "خطا در دریافت سوالات متداول" }, { status: 500 }))
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const chatbotId = Number.parseInt(params.id, 10)
  if (isNaN(chatbotId)) {
    return cors(NextResponse.json({ error: "شناسه چت‌بات نامعتبر است" }, { status: 400 }))
  }

  try {
    const faqs = (await request.json()) as Partial<ChatbotFAQ>[]
    if (!Array.isArray(faqs)) {
      return cors(NextResponse.json({ error: "داده‌های ارسالی باید یک آرایه از سوالات باشد" }, { status: 400 }))
    }

    const validFaqs = faqs
      .filter((faq) => faq.question?.trim() && faq.answer?.trim())
      .map((faq, index) => ({
        chatbot_id: chatbotId,
        question: faq.question!.trim(),
        answer: faq.answer!.trim(),
        emoji: faq.emoji || "❓",
        position: index,
      }))

    const updatedFAQs = await syncChatbotFAQs(chatbotId, validFaqs)
    return cors(NextResponse.json(updatedFAQs))
  } catch (error) {
    console.error(`[API PUT /faqs] Error syncing FAQs for chatbot ${chatbotId}:`, error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return cors(NextResponse.json({ error: "خطای داخلی سرور در ذخیره سوالات", details: errorMessage }, { status: 500 }))
  }
}
