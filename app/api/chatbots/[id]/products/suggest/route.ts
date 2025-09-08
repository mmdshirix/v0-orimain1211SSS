import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function calculateProductRelevance(userMessage: string, product: any): number {
  const userTokens = userMessage
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2) // Skip very short tokens

  const productName = (product.name || "").toLowerCase()
  const productDesc = (product.description || "").toLowerCase()
  const productTokens = (productName + " " + productDesc)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)

  let score = 0

  userTokens.forEach((token) => {
    // Name matches get highest score (boost factor)
    if (productName.includes(token)) {
      score += 3
    }
    // Description matches get medium score
    else if (productDesc.includes(token)) {
      score += 2
    }
    // Token overlap gets base score
    else if (productTokens.includes(token)) {
      score += 1
    }
  })

  // Bonus for products with prices (more likely to be purchasable)
  if (product.price && Number(product.price) > 0) {
    score += 0.5
  }

  return score
}

function normalizeProductUrls(products: any[]) {
  return products.map((product) => ({
    ...product,
    // Ensure product_url is complete
    product_url:
      product.product_url && !product.product_url.startsWith("http")
        ? `https://${product.product_url}`
        : product.product_url || "#",
    // Ensure image_url is complete
    image_url:
      product.image_url && !product.image_url.startsWith("http")
        ? `https://${product.image_url}`
        : product.image_url || "/placeholder.svg",
    // Ensure price is a number
    price: Number(product.price || 0),
    // Provide default button text
    button_text: product.button_text || "خرید",
  }))
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  const q = new URL(req.url).searchParams.get("q") || ""

  try {
    const rows = await query<any>(
      `SELECT id,name,description,image_url,price,position,button_text,secondary_text,product_url
      FROM chatbot_products WHERE chatbot_id=? ORDER BY position ASC, id ASC`,
      [id],
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json([])
    }

    if (!q.trim()) {
      return NextResponse.json(normalizeProductUrls(rows.slice(0, 4)))
    }

    const scoredProducts = rows
      .map((product) => ({
        ...product,
        relevanceScore: calculateProductRelevance(q, product),
      }))
      .filter((p) => p.relevanceScore > 0) // Only return products with some relevance
      .sort((a, b) => {
        // Sort by relevance score first, then by position
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore
        }
        return a.position - b.position
      })
      .slice(0, 4) // Take top 4 most relevant

    const finalProducts = scoredProducts.map(({ relevanceScore, ...product }) => product)

    return NextResponse.json(normalizeProductUrls(finalProducts))
  } catch (error) {
    console.error("Error in product suggestion API:", error)
    return NextResponse.json([])
  }
}
