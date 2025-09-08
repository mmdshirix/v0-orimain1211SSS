import crypto from "crypto"
import { getChatbot, getProductsByChatbotId, getKBCache, setKBCache } from "./db"

interface KBObject {
  kb_policy_text: string
  kb_url_excerpt: string
  kb_products: Array<{
    name: string
    description: string
    price: number | null
    product_url: string | null
    image_url: string | null
    button_text: string
  }>
}

export async function composeKnowledgeBase(chatbotId: number): Promise<KBObject> {
  const chatbot = await getChatbot(chatbotId)
  if (!chatbot) {
    throw new Error(`Chatbot ${chatbotId} not found`)
  }

  // Get policy text from knowledge_base_text
  const kb_policy_text = chatbot.knowledge_base_text || ""

  // Get URL content with caching
  let kb_url_excerpt = ""
  if (chatbot.knowledge_base_url) {
    kb_url_excerpt = await fetchAndCacheURL(chatbotId, chatbot.knowledge_base_url)
  }

  // Get products for this chatbot
  const products = await getProductsByChatbotId(chatbotId)
  const kb_products = products.map((product) => ({
    name: product.name,
    description: (product.description || "").substring(0, 400), // Truncate to ~400 chars
    price: product.price,
    product_url: product.product_url,
    image_url: product.image_url,
    button_text: product.button_text,
  }))

  return {
    kb_policy_text,
    kb_url_excerpt,
    kb_products,
  }
}

async function fetchAndCacheURL(chatbotId: number, url: string): Promise<string> {
  try {
    // Generate hash for cache key
    const hash = crypto.createHash("md5").update(url).digest("hex")

    // Check cache first
    const cached = await getKBCache(chatbotId, url)
    if (cached && cached.hash === hash) {
      return cached.content
    }

    // Fetch fresh content
    const response = await fetch(url, {
      headers: {
        "User-Agent": "TalkSell-Bot/1.0",
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()

    // Strip HTML tags and normalize whitespace
    const cleanText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 2000) // Summarize to ~2k chars

    // Cache the result
    await setKBCache(chatbotId, url, cleanText, hash)

    return cleanText
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error)
    return "" // Return empty string on error
  }
}
