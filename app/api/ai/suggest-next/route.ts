import { type NextRequest, NextResponse } from "next/server"
import { createOpenAI } from "@ai-sdk/openai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const openai = createOpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const { lastAssistant, kbHint } = await req.json()
    const sys = `Generate 4 short Persian follow-up suggestions (max 20 chars each) with leading emoji, JSON array of strings only. Example: ["🛒 ...","❓ ...","⚙️ ...","📦 ..."]`
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat"

    const res = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Context: ${kbHint || ""}\nAssistant said: ${lastAssistant || ""}` },
      ],
      temperature: 0.7,
    })

    const raw = res.choices?.[0]?.message?.content || "[]"
    let arr: string[] = []
    try {
      arr = JSON.parse(raw)
    } catch {
      arr = []
    }
    if (!Array.isArray(arr) || arr.length < 4) {
      arr = ["❓ بیشتر توضیح بده", "🛒 محصولات مرتبط", "📞 پشتیبانی", "📦 وضعیت سفارش"]
    }
    return NextResponse.json(arr.slice(0, 4))
  } catch (e) {
    return NextResponse.json(["❓ بیشتر توضیح بده", "🛒 محصولات مرتبط", "📞 پشتیبانی", "📦 وضعیت سفارش"])
  }
}
