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

const kbCache = new Map<string, { content: string; timestamp: number; url: string }>()
const CACHE_TTL = 1000 * 60 * 30 // 30 minutes cache

async function fetchKB(url?: string, hardText?: string) {
  const max = Number(process.env.AI_MAX_CONTEXT_CHARS || 12000)
  const timeout = Number(process.env.AI_KB_FETCH_TIMEOUT_MS || 8000) // Increased timeout

  // Start with hardcoded text
  let text = (hardText || "").toString().slice(0, max)

  if (!text && url) {
    const cacheKey = `kb_${url}`
    const cached = kbCache.get(cacheKey)
    const now = Date.now()

    // Check cache first
    if (cached && now - cached.timestamp < CACHE_TTL && cached.url === url) {
      console.log(`[KB Cache] Using cached content for: ${url}`)
      return cached.content.slice(0, max)
    }

    try {
      console.log(`[KB Fetch] Fetching content from: ${url}`)
      const ctl = new AbortController()
      const tid = setTimeout(() => ctl.abort(), timeout)

      const res = await fetch(url, {
        signal: ctl.signal,
        headers: {
          "User-Agent": "TalkSell-Bot/1.0 (+https://talksell.ir)",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
          "Accept-Language": "en-US,en;q=0.9,fa;q=0.8",
          "Cache-Control": "no-cache",
        },
        redirect: "follow",
        timeout: timeout,
      })

      clearTimeout(tid)

      if (res.ok) {
        const rawText = await res.text()

        // Clean HTML content if it's HTML
        const contentType = res.headers.get("content-type") || ""
        let cleanText = rawText

        if (contentType.includes("text/html")) {
          // Basic HTML cleaning - remove scripts, styles, and common HTML tags
          cleanText = rawText
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
            .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        }

        text = cleanText.slice(0, max)

        // Cache the result
        kbCache.set(cacheKey, {
          content: text,
          timestamp: now,
          url: url,
        })

        console.log(`[KB Fetch] Successfully fetched and cached ${text.length} characters from: ${url}`)
      } else {
        console.warn(`[KB Fetch] Failed to fetch ${url}: ${res.status} ${res.statusText}`)
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.warn(`[KB Fetch] Timeout fetching ${url}`)
      } else {
        console.warn(`[KB Fetch] Error fetching ${url}:`, error.message)
      }
    }
  }

  return text
}

async function getProductKnowledge(chatbotId: number): Promise<string> {
  try {
    const url = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/chatbots/${chatbotId}/products`
    const res = await fetch(url)
    if (res.ok) {
      const products = await res.json()
      if (products.length === 0) return ""

      // Structure products as knowledge for AI
      const productKnowledge = products
        .map(
          (p: any) =>
            `محصول: ${p.name}\nتوضیحات: ${p.description || "توضیحاتی ارائه نشده"}\nقیمت: ${p.price ? `${p.price} تومان` : "قیمت موجود نیست"}\nلینک: ${p.product_url || "لینک موجود نیست"}\n`,
        )
        .join("\n")

      return `=== فهرست محصولات فروشگاه ===\n${productKnowledge}=== پایان فهرست محصولات ===\n`
    }
  } catch (error) {
    console.error("Failed to fetch product knowledge:", error)
  }
  return ""
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
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [api/chat] Request received`)

  try {
    if (!KEY) {
      console.error(`[${timestamp}] [api/chat] CRITICAL: DEEPSEEK_API_KEY not found in environment`)
      return NextResponse.json(
        {
          error: "missing-deepseek-key",
          message: "کلید API یافت نشد. لطفاً با پشتیبانی تماس بگیرید.",
        },
        { status: 500 },
      )
    }

    console.log(`[${timestamp}] [api/chat] Environment check passed - API key exists`)
    console.log(`[${timestamp}] [api/chat] Using model: ${MODEL}, Base URL: ${BASE}`)

    const body = await req.json().catch(() => ({}))
    const { messages = [], chatbotId } = body || {}

    console.log(
      `[${timestamp}] [api/chat] Request body parsed - chatbotId: ${chatbotId}, messages count: ${messages.length}`,
    )

    const bot = chatbotId ? await getChatbotById(Number(chatbotId)) : null
    if (!bot) {
      console.error(`[${timestamp}] [api/chat] Chatbot not found for ID: ${chatbotId}`)
      return NextResponse.json(
        {
          error: "chatbot-not-found",
          message: "چت‌بات مورد نظر یافت نشد.",
        },
        { status: 404 },
      )
    }

    console.log(`[${timestamp}] [api/chat] Chatbot found: ${bot.name}`)

    const [kb, productKnowledge] = await Promise.all([
      fetchKB(bot.knowledge_base_url, bot.knowledge_base_text),
      getProductKnowledge(chatbotId),
    ])

    console.log(`[${timestamp}] [api/chat] Knowledge base loaded: ${kb ? kb.length : 0} characters`)
    console.log(
      `[${timestamp}] [api/chat] Product knowledge loaded: ${productKnowledge ? productKnowledge.length : 0} characters`,
    )

    if (bot.knowledge_base_url) {
      console.log(
        `[${timestamp}] [api/chat] KB source: URL (${bot.knowledge_base_url}) + text (${bot.knowledge_base_text?.length || 0} chars)`,
      )
    } else if (bot.knowledge_base_text) {
      console.log(`[${timestamp}] [api/chat] KB source: text only (${bot.knowledge_base_text.length} chars)`)
    } else {
      console.log(`[${timestamp}] [api/chat] KB source: none provided`)
    }

    const combinedKnowledge = [kb, productKnowledge].filter(Boolean).join("\n\n")

    const system = [
      `You are ${bot.name || "Chat"}, a helpful Persian assistant for this business.`,
      ``,
      combinedKnowledge
        ? `=== KNOWLEDGE BASE ===\n${combinedKnowledge}\n=== END OF KNOWLEDGE BASE ===`
        : `=== NO SPECIFIC KNOWLEDGE BASE PROVIDED ===`,
      ``,
      bot.store_url ? `Store Website: ${bot.store_url}` : "",
      ``,
      `RESPONSE GUIDELINES:`,
      `1. Answer in Persian (فارسی) in a helpful and friendly manner`,
      `2. When you have relevant information in the Knowledge Base above, use it to provide detailed answers`,
      `3. For basic greetings, general questions, or when helping users navigate, you can respond naturally`,
      `4. When discussing specific products or services, prioritize information from the Knowledge Base`,
      `5. If asked about specific details not in the Knowledge Base, politely say you don't have that specific information and suggest contacting support`,
      `6. Be conversational and helpful - you're here to assist customers`,
      `7. When recommending products, provide details from the product knowledge when available`,
      `8. For questions completely outside your business scope, politely redirect to relevant topics`,
    ]
      .filter(Boolean)
      .join("\n")

    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || ""

    try {
      console.log(`[${timestamp}] [api/chat] Attempting primary streaming with AI SDK`)

      const result = await streamText({
        model: openai(MODEL),
        system,
        messages: toOpenAIChatMessages(messages),
      })

      console.log(`[${timestamp}] [api/chat] AI SDK streaming initiated successfully`)

      const stream = new ReadableStream({
        async start(controller) {
          let fullResponse = ""
          let hasContent = false
          const reader = result.textStream.getReader()

          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              if (value && value.length > 0) {
                fullResponse += value
                hasContent = true
                // Immediately flush each chunk to prevent buffering
                controller.enqueue(new TextEncoder().encode(value))
              }
            }

            console.log(
              `[${timestamp}] [api/chat] Primary streaming completed, response length: ${fullResponse.length}, hasContent: ${hasContent}`,
            )

            if (!hasContent || fullResponse.trim().length === 0) {
              console.error(`[${timestamp}] [api/chat] Empty response from AI SDK, providing fallback`)
              const fallbackText = "متأسفانه پاسخی دریافت نشد. لطفاً دوباره تلاش کنید."
              controller.enqueue(new TextEncoder().encode(fallbackText))
              fullResponse = fallbackText
            }

            const [products, nextSuggestions] = await Promise.all([
              getProductSuggestions(chatbotId, lastUserMessage),
              getNextSuggestions(fullResponse, combinedKnowledge || ""),
            ])

            console.log(
              `[${timestamp}] [api/chat] Suggestions generated - products: ${products.length}, next: ${nextSuggestions.length}`,
            )

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
            console.error(`[${timestamp}] [api/chat] Stream processing error:`, error)
            if (!hasContent) {
              const errorText = "خطا در دریافت پاسخ. لطفاً دوباره تلاش کنید."
              controller.enqueue(new TextEncoder().encode(errorText))
            }
            controller.close()
          }
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } catch (err: any) {
      console.error(`[${timestamp}] [api/chat] Primary streaming failed, attempting fallback`)
      console.error(`[${timestamp}] [api/chat] Error details:`, {
        status: err?.status,
        message: err?.message,
        responseBody: err?.responseBody,
        stack: err?.stack?.split("\n").slice(0, 3).join("\n"),
      })
    }

    const url = `${BASE.replace(/\/$/, "")}/v1/chat/completions`
    const payload = {
      model: MODEL,
      stream: true,
      messages: [{ role: "system", content: system }, ...toOpenAIChatMessages(messages)],
      max_tokens: 2000,
      temperature: 0.7,
    }

    console.log(`[${timestamp}] [api/chat] Attempting fallback streaming to: ${url}`)

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

      console.log(`[${timestamp}] [api/chat] Fallback response status: ${res.status} ${res.statusText}`)

      if (!res.ok || !res.body) {
        let detail = ""
        try {
          detail = await res.text()
        } catch {}
        console.error(`[${timestamp}] [api/chat] Fallback streaming failed:`, { status: res.status, detail })
        throw new Error(`raw-stream-bad-response: ${res.status} ${detail}`)
      }

      console.log(`[${timestamp}] [api/chat] Fallback streaming initiated successfully`)

      const stream = new ReadableStream({
        async start(controller) {
          const reader = res.body!.getReader()
          const decoder = new TextDecoder()
          let buffer = ""
          let fullResponse = ""
          let hasContent = false

          try {
            while (true) {
              const { value, done } = await reader.read()
              if (done) {
                console.log(
                  `[${timestamp}] [api/chat] Fallback streaming completed, response length: ${fullResponse.length}, hasContent: ${hasContent}`,
                )

                if (!hasContent || fullResponse.trim().length === 0) {
                  console.error(`[${timestamp}] [api/chat] Empty response from fallback streaming`)
                  const fallbackText = "متأسفانه پاسخی دریافت نشد. لطفاً دوباره تلاش کنید."
                  controller.enqueue(new TextEncoder().encode(fallbackText))
                  fullResponse = fallbackText
                }

                const [products, nextSuggestions] = await Promise.all([
                  getProductSuggestions(chatbotId, lastUserMessage),
                  getNextSuggestions(fullResponse, combinedKnowledge || ""),
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
                    hasContent = true
                    controller.enqueue(new TextEncoder().encode(delta))
                  }
                } catch {}
              }
            }
          } catch (streamError) {
            console.error(`[${timestamp}] [api/chat] Fallback stream processing error:`, streamError)
            if (!hasContent) {
              const errorText = "خطا در دریافت پاسخ. لطفاً دوباره تلاش کنید."
              controller.enqueue(new TextEncoder().encode(errorText))
            }
            controller.close()
          }
        },
      })

      return new Response(stream, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } catch (e2: any) {
      console.error(
        `[${timestamp}] [api/chat] Fallback streaming failed, attempting non-streaming fallback:`,
        e2?.message || e2,
      )

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

      try {
        const res = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: MODEL,
            stream: false,
            messages: [{ role: "system", content: system }, ...toOpenAIChatMessages(messages)],
            max_tokens: 2000,
            temperature: 0.7,
          }),
        })

        clearTimeout(timeoutId)
        console.log(`[${timestamp}] [api/chat] Non-streaming fallback response: ${res.status} ${res.statusText}`)

        let text = ""
        if (res.ok) {
          const j = await res.json().catch(() => null)
          text = j?.choices?.[0]?.message?.content || ""

          if (text && text.trim().length > 0) {
            console.log(`[${timestamp}] [api/chat] Non-streaming response received, length: ${text.length}`)

            const [products, nextSuggestions] = await Promise.all([
              getProductSuggestions(chatbotId, lastUserMessage),
              getNextSuggestions(text, combinedKnowledge || ""),
            ])

            if (products.length > 0) {
              text += `\n\nSUGGESTED_PRODUCTS: ${JSON.stringify(products)}`
            }

            if (nextSuggestions.length > 0) {
              text += `\n\nNEXT_SUGGESTIONS: ${JSON.stringify(nextSuggestions)}`
            }
          } else {
            console.error(`[${timestamp}] [api/chat] Empty response from DeepSeek API`)
            text = "متأسفانه پاسخی دریافت نشد. لطفاً دوباره تلاش کنید."
          }
        } else {
          console.error(`[${timestamp}] [api/chat] Non-streaming fallback failed with status: ${res.status}`)
          text = `خطای اتصال به DeepSeek (${res.status}). لطفاً دوباره تلاش کنید.`
        }

        return NextResponse.json({ textFallback: text }, { status: 200 })
      } catch (timeoutError) {
        clearTimeout(timeoutId)
        console.error(`[${timestamp}] [api/chat] Non-streaming fallback timeout or error:`, timeoutError)
        return NextResponse.json(
          {
            textFallback: "زمان انتظار تمام شد. لطفاً دوباره تلاش کنید.",
          },
          { status: 200 },
        )
      }
    }
  } catch (err: any) {
    console.error(`[${timestamp}] [api/chat] FATAL ERROR:`, {
      message: err?.message,
      stack: err?.stack?.split("\n").slice(0, 5).join("\n"),
      timestamp,
    })

    return NextResponse.json(
      {
        error: "chat-failed",
        message: "خطای سیستمی رخ داده است. لطفاً دوباره تلاش کنید.",
        detail: String(err?.message || err),
      },
      { status: 500 },
    )
  }
}
