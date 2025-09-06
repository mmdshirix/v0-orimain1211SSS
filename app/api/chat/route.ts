import { type NextRequest, NextResponse } from "next/server"
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { getChatbotById } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const BASE = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
const KEY = process.env.DEEPSEEK_API_KEY!
const MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat"

const openai = createOpenAI({ baseURL: BASE, apiKey: KEY })

async function fetchKB(url?: string, hardText?: string) {
  const max = Number(process.env.AI_MAX_CONTEXT_CHARS || 12000)
  const timeout = Number(process.env.AI_KB_FETCH_TIMEOUT_MS || 3500)
  let text = (hardText || "").toString().slice(0, max)
  if (!text && url) {
    try {
      const ctl = new AbortController()
      const tid = setTimeout(() => ctl.abort(), timeout)
      const res = await fetch(url, { signal: ctl.signal })
      clearTimeout(tid)
      if (res.ok) text = (await res.text()).slice(0, max)
    } catch {}
  }
  return text
}

function toOpenAIChatMessages(messages: any[]) {
  return messages.map((m) => ({ role: m.role, content: String(m.content ?? "") }))
}

async function getProductSuggestions(chatbotId: number, userMessage: string) {
  try {
    const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/chatbots/${chatbotId}/products/suggest?q=${encodeURIComponent(userMessage)}`
    const res = await fetch(url)
    if (res.ok) {
      const products = await res.json()
      return products.slice(0, 4)
    }
  } catch (error) {
    console.error("Failed to fetch product suggestions:", error)
  }
  return []
}

async function getNextSuggestions(lastAssistant: string, kbHint: string) {
  try {
    const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai/suggest-next`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastAssistant, kbHint }),
    })
    if (res.ok) {
      const suggestions = await res.json()
      return suggestions.map((text: string, index: number) => ({
        text: text.replace(/^[^\s]+\s/, ""), // Remove emoji from text
        emoji: text.match(/^[^\s]+/)?.[0] || "💬", // Extract emoji
      }))
    }
  } catch (error) {
    console.error("Failed to fetch next suggestions:", error)
  }
  return []
}

export async function POST(req: NextRequest) {
  try {
    if (!KEY) return NextResponse.json({ error: "missing-deepseek-key" }, { status: 500 })

    const body = await req.json().catch(() => ({}))
    const { messages = [], chatbotId } = body || {}
    const bot = chatbotId ? await getChatbotById(Number(chatbotId)) : null
    if (!bot) return NextResponse.json({ error: "chatbot-not-found" }, { status: 404 })

    const kb = await fetchKB(bot.knowledge_base_url, bot.knowledge_base_text)
    const system = [
      `You are ${bot.name || "Chat"}, a precise Persian assistant. Answer in Persian.`,
      kb ? `Knowledge Base:\n${kb}` : `No external knowledge base.`,
      bot.store_url ? `Store URL: ${bot.store_url} — suggest relevant products when appropriate.` : "",
      `Be accurate and concise; ask clarifying questions if unsure.`,
    ]
      .filter(Boolean)
      .join("\n\n")

    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || ""

    try {
      const result = await streamText({
        model: openai(MODEL),
        system,
        messages: toOpenAIChatMessages(messages),
      })

      const stream = new ReadableStream({
        async start(controller) {
          let fullResponse = ""
          const reader = result.textStream.getReader()

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              fullResponse += value
              controller.enqueue(new TextEncoder().encode(value))
            }

            const [products, nextSuggestions] = await Promise.all([
              getProductSuggestions(chatbotId, lastUserMessage),
              getNextSuggestions(fullResponse, kb || ""),
            ])

            if (products.length > 0) {
              const productData = `\n\nSUGGESTED_PRODUCTS: ${JSON.stringify(products)}`
              controller.enqueue(new TextEncoder().encode(productData))
            }

            if (nextSuggestions.length > 0) {
              const suggestionData = `\n\nNEXT_SUGGESTIONS: ${JSON.stringify(nextSuggestions)}`
              controller.enqueue(new TextEncoder().encode(suggestionData))
            }

            controller.close()
          } catch (error) {
            console.error("Stream processing error:", error)
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    } catch (err: any) {
      console.error(
        "[api/chat] provider error; fallback to raw fetch",
        err?.status,
        err?.responseBody || err?.message || err,
      )
    }

    const url = `${BASE.replace(/\/$/, "")}/v1/chat/completions`
    const payload = {
      model: MODEL,
      stream: true,
      messages: [{ role: "system", content: system }, ...toOpenAIChatMessages(messages)],
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok || !res.body) {
        let detail = ""
        try {
          detail = await res.text()
        } catch {}
        throw new Error(`raw-stream-bad-response: ${res.status} ${detail}`)
      }

      const stream = new ReadableStream({
        async start(controller) {
          const reader = res.body!.getReader()
          const decoder = new TextDecoder()
          let buffer = ""
          let fullResponse = ""

          while (true) {
            const { value, done } = await reader.read()
            if (done) {
              const [products, nextSuggestions] = await Promise.all([
                getProductSuggestions(chatbotId, lastUserMessage),
                getNextSuggestions(fullResponse, kb || ""),
              ])

              if (products.length > 0) {
                const productData = `\n\nSUGGESTED_PRODUCTS: ${JSON.stringify(products)}`
                controller.enqueue(new TextEncoder().encode(productData))
              }

              if (nextSuggestions.length > 0) {
                const suggestionData = `\n\nNEXT_SUGGESTIONS: ${JSON.stringify(nextSuggestions)}`
                controller.enqueue(new TextEncoder().encode(suggestionData))
              }

              controller.close()
              return
            }

            buffer += decoder.decode(value, { stream: true })

            const lines = buffer.split("\n")
            buffer = lines.pop() || ""
            for (const line of lines) {
              const trimmed = line.trim()
              if (!trimmed.startsWith("data:")) continue
              const data = trimmed.slice(5).trim()
              if (data === "[DONE]") continue
              try {
                const json = JSON.parse(data)
                const delta = json?.choices?.[0]?.delta?.content || ""
                if (delta) {
                  fullResponse += delta
                  controller.enqueue(new TextEncoder().encode(delta))
                }
              } catch {}
            }
          }
        },
      })

      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    } catch (e2: any) {
      console.error("[api/chat] fallback stream failed:", e2?.message || e2)
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          stream: false,
          messages: [{ role: "system", content: system }, ...toOpenAIChatMessages(messages)],
        }),
      })

      let text = ""
      if (res.ok) {
        const j = await res.json().catch(() => null)
        text = j?.choices?.[0]?.message?.content || ""

        const [products, nextSuggestions] = await Promise.all([
          getProductSuggestions(chatbotId, lastUserMessage),
          getNextSuggestions(text, kb || ""),
        ])

        if (products.length > 0) {
          text += `\n\nSUGGESTED_PRODUCTS: ${JSON.stringify(products)}`
        }

        if (nextSuggestions.length > 0) {
          text += `\n\nNEXT_SUGGESTIONS: ${JSON.stringify(nextSuggestions)}`
        }
      } else {
        text = `خطای اتصال به DeepSeek (${res.status})`
      }

      return NextResponse.json({ textFallback: text }, { status: 200 })
    }
  } catch (err: any) {
    console.error("[api/chat] fatal:", err?.message || err)
    return NextResponse.json({ error: "chat-failed", detail: String(err?.message || err) }, { status: 500 })
  }
}
