import { type NextRequest, NextResponse } from "next/server"
import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { getChatbot, saveMessage, getChatbotMemory, setChatbotMemory } from "@/lib/db"
import { composeKnowledgeBase } from "@/lib/kb-composer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "sk-5513eacec9a7491c9d38cf8b776f7b62"
const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
const DEEPSEEK_MODEL = "deepseek-chat"

console.log(`[INIT] DeepSeek API Key source: ${process.env.DEEPSEEK_API_KEY ? "ENV" : "FALLBACK"}`)
console.log(`[INIT] DeepSeek Base URL: ${DEEPSEEK_BASE_URL}`)
console.log(`[INIT] DeepSeek Model: ${DEEPSEEK_MODEL}`)

const deepseek = createOpenAI({
  baseURL: DEEPSEEK_BASE_URL,
  apiKey: DEEPSEEK_API_KEY,
})

function calculateProductRelevance(userMessage: string, product: any): number {
  const userTokens = userMessage.toLowerCase().split(/\s+/)
  const productTokens = [
    ...(product.name || "").toLowerCase().split(/\s+/),
    ...(product.description || "").toLowerCase().split(/\s+/),
  ]

  // Purchase intent keywords
  const purchaseKeywords = ["خرید", "سفارش", "قیمت", "تخفیف", "موجودی", "خریدن", "سفارشی", "فروش"]
  const hasPurchaseIntent = userTokens.some((token) => purchaseKeywords.includes(token))

  let score = 0
  userTokens.forEach((token) => {
    if (token.length > 2) {
      // Exact name matches get highest score
      if (product.name?.toLowerCase().includes(token)) {
        score += 5
      } else if (productTokens.includes(token)) {
        score += 2
      }
    }
  })

  // Bonus for purchase intent
  if (hasPurchaseIntent && score > 0) {
    score += 3
  }

  // Only return products with meaningful relevance
  return score >= 3 ? score : 0
}

async function getProductSuggestions(chatbotId: number, userMessage: string) {
  try {
    const kb = await composeKnowledgeBase(chatbotId)
    const products = kb.kb_products.filter((p) => p.price !== null && p.price > 0)

    const scoredProducts = products
      .map((product) => ({
        ...product,
        relevanceScore: calculateProductRelevance(userMessage, product),
      }))
      .filter((p) => p.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 4)

    return scoredProducts.map(({ relevanceScore, ...product }) => ({
      id: product.name, // Use name as ID for now
      name: product.name,
      description: product.description,
      price: product.price,
      product_url: product.product_url,
      image_url: product.image_url,
      button_text: product.button_text || "مشاهده محصول",
    }))
  } catch (error) {
    console.error("Failed to get product suggestions:", error)
    return []
  }
}

async function getNextSuggestions(lastAssistant: string, userMessage: string, kbContent: string) {
  try {
    const suggestions = []

    // Context-based suggestions
    if (lastAssistant.includes("محصول") || lastAssistant.includes("خرید") || userMessage.includes("قیمت")) {
      suggestions.push({ text: "جزئیات بیشتر محصولات", emoji: "📋" })
      suggestions.push({ text: "نحوه سفارش چگونه است؟", emoji: "🛒" })
    } else if (lastAssistant.includes("خدمات") || lastAssistant.includes("پشتیبانی")) {
      suggestions.push({ text: "ساعات کاری چیست؟", emoji: "🕐" })
      suggestions.push({ text: "راه‌های تماس", emoji: "📞" })
    } else {
      suggestions.push({ text: "محصولات شما چیست؟", emoji: "🛍️" })
      suggestions.push({ text: "خدمات ارائه شده", emoji: "🔧" })
    }

    // Always add a general question
    suggestions.push({ text: "درباره شما بیشتر بگویید", emoji: "ℹ️" })

    // Return exactly 3 unique suggestions
    return suggestions.slice(0, 3)
  } catch (error) {
    console.error("Failed to get next suggestions:", error)
    return [
      { text: "سوال دیگری دارم", emoji: "❓" },
      { text: "راهنمایی بیشتر", emoji: "💡" },
      { text: "تماس با پشتیبانی", emoji: "📞" },
    ]
  }
}

export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [api/chat] Request received`)

  try {
    const body = await req.json().catch(() => ({}))
    const { messages = [], chatbotId, clientId } = body || {}

    console.log(`[${timestamp}] [api/chat] chatbotId: ${chatbotId}, messages: ${messages.length}`)

    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === "") {
      console.error(`[${timestamp}] [api/chat] Missing DeepSeek API key`)
      return NextResponse.json(
        { error: "missing-api-key", message: "تنظیمات چت‌بات ناقص است. لطفاً با پشتیبانی تماس بگیرید." },
        { status: 500 },
      )
    }

    const chatbot = chatbotId ? await getChatbot(Number(chatbotId)) : null
    if (!chatbot) {
      console.error(`[${timestamp}] [api/chat] Chatbot not found: ${chatbotId}`)
      return NextResponse.json({ error: "chatbot-not-found", message: "چت‌بات یافت نشد." }, { status: 404 })
    }

    console.log(`[${timestamp}] [api/chat] Chatbot found: ${chatbot.name}`)

    const kb = await composeKnowledgeBase(chatbotId)
    console.log(
      `[${timestamp}] [api/chat] KB assembled - policy: ${kb.kb_policy_text.length}, url: ${kb.kb_url_excerpt.length}, products: ${kb.kb_products.length}`,
    )

    const memory = clientId ? await getChatbotMemory(chatbotId, clientId) : null
    console.log(`[${timestamp}] [api/chat] Memory loaded: ${memory ? "yes" : "no"}`)

    const systemPrompt = [
      `You are ${chatbot.name}, a helpful Persian assistant for this business.`,
      ``,
      `=== KNOWLEDGE BASE ===`,
      kb.kb_policy_text ? `BUSINESS POLICY & INFO:\n${kb.kb_policy_text}\n` : "",
      kb.kb_url_excerpt ? `WEBSITE CONTENT:\n${kb.kb_url_excerpt}\n` : "",
      kb.kb_products.length > 0
        ? `PRODUCTS:\n${kb.kb_products
            .map((p) => `- ${p.name}: ${p.description} (قیمت: ${p.price ? `${p.price} تومان` : "موجود نیست"})`)
            .join("\n")}\n`
        : "",
      `=== END KNOWLEDGE BASE ===`,
      ``,
      memory ? `CONVERSATION CONTEXT: ${memory}` : "",
      ``,
      `STRICT RESPONSE RULES:`,
      `1. Answer ONLY using information from the Knowledge Base above`,
      `2. If information is not in the Knowledge Base, respond briefly: "این اطلاعات در دانش من موجود نیست."`,
      `3. Always respond in Persian (فارسی)`,
      `4. For basic greetings, respond naturally but stay focused on business topics`,
      `5. Never fabricate prices, links, or product details not in the KB`,
      `6. Keep responses concise and helpful`,
    ]
      .filter(Boolean)
      .join("\n")

    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || ""

    try {
      console.log(`[${timestamp}] [api/chat] Starting DeepSeek streaming`)
      console.log(`[${timestamp}] [api/chat] Using model: ${DEEPSEEK_MODEL}`)
      console.log(`[${timestamp}] [api/chat] System prompt length: ${systemPrompt.length}`)

      const result = await streamText({
        model: deepseek(DEEPSEEK_MODEL),
        system: systemPrompt,
        messages: messages.map((m: any) => ({ role: m.role, content: String(m.content || "") })),
        maxTokens: 1500,
        temperature: 0.7,
        maxRetries: 1,
      })

      const stream = new ReadableStream({
        async start(controller) {
          let fullResponse = ""
          let tokenCount = 0
          const reader = result.textStream.getReader()

          const timeoutId = setTimeout(() => {
            console.error(`[${timestamp}] [api/chat] Stream timeout after 30s`)
            if (tokenCount === 0) {
              const fallbackText = "زمان انتظار تمام شد. لطفاً دوباره تلاش کنید."
              controller.enqueue(new TextEncoder().encode(fallbackText))
              fullResponse = fallbackText
            }
            controller.close()
          }, 30000)

          try {
            console.log(`[${timestamp}] [api/chat] Starting to read DeepSeek stream`)
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                console.log(`[${timestamp}] [api/chat] Stream reading completed`)
                break
              }

              if (value && value.length > 0) {
                fullResponse += value
                tokenCount++
                controller.enqueue(new TextEncoder().encode(value))
                console.log(`[${timestamp}] [api/chat] Token ${tokenCount}: "${value}" (${value.length} chars)`)
              }
            }

            clearTimeout(timeoutId)
            console.log(
              `[${timestamp}] [api/chat] Stage 1 completed: ${fullResponse.length} chars, ${tokenCount} tokens`,
            )

            if (tokenCount === 0) {
              console.error(`[${timestamp}] [api/chat] CRITICAL: Zero tokens received from DeepSeek`)
              const fallbackText = "متأسفانه پاسخی دریافت نشد. لطفاً دوباره تلاش کنید."
              controller.enqueue(new TextEncoder().encode(fallbackText))
              fullResponse = fallbackText
            }

            const products = await getProductSuggestions(chatbotId, lastUserMessage)
            console.log(`[${timestamp}] [api/chat] Stage 2 completed: ${products.length} products`)

            if (products.length > 0) {
              const productData = `\n\nSUGGESTED_PRODUCTS: ${JSON.stringify(products)}`
              controller.enqueue(new TextEncoder().encode(productData))
            }

            const nextSuggestions = await getNextSuggestions(
              fullResponse,
              lastUserMessage,
              kb.kb_policy_text + kb.kb_url_excerpt,
            )
            console.log(`[${timestamp}] [api/chat] Stage 3 completed: ${nextSuggestions.length} suggestions`)

            const suggestionData = `\n\nNEXT_SUGGESTIONS: ${JSON.stringify(nextSuggestions)}`
            controller.enqueue(new TextEncoder().encode(suggestionData))

            try {
              await saveMessage({
                chatbot_id: chatbotId,
                user_message: lastUserMessage,
                bot_response: fullResponse,
                user_ip: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
                user_agent: req.headers.get("user-agent") || null,
              })

              if (clientId && messages.length > 4) {
                const recentMessages = messages
                  .slice(-6)
                  .map((m: any) => `${m.role}: ${m.content}`)
                  .join("\n")
                const newMemory = `Recent conversation:\n${recentMessages}\nLast response: ${fullResponse.substring(0, 200)}`
                await setChatbotMemory(chatbotId, clientId, newMemory)
              }
            } catch (dbError) {
              console.error(`[${timestamp}] [api/chat] Database save error:`, dbError)
            }

            controller.close()
          } catch (error) {
            clearTimeout(timeoutId)
            console.error(`[${timestamp}] [api/chat] Stream processing error:`, error)
            if (tokenCount === 0) {
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
    } catch (streamError: any) {
      console.error(`[${timestamp}] [api/chat] DeepSeek connection failed:`, streamError)
      console.error(`[${timestamp}] [api/chat] Connection details:`, {
        baseURL: DEEPSEEK_BASE_URL,
        model: DEEPSEEK_MODEL,
        hasApiKey: !!DEEPSEEK_API_KEY,
        keyPrefix: DEEPSEEK_API_KEY.substring(0, 10),
        errorMessage: streamError.message,
      })

      return NextResponse.json(
        {
          error: "deepseek-connection-failed",
          message: "خطا در ارتباط با هوش مصنوعی. لطفاً دوباره تلاش کنید.",
        },
        { status: 503 },
      )
    }
  } catch (error: any) {
    console.error(`[${timestamp}] [api/chat] FATAL ERROR:`, error)
    return NextResponse.json(
      {
        error: "system-error",
        message: "خطای سیستمی رخ داده است. لطفاً دوباره تلاش کنید.",
      },
      { status: 500 },
    )
  }
}
