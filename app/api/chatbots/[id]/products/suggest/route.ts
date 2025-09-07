import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function keywords(q: string) {
  return (q || "")
    .toString()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
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
  const kws = keywords(q)

  if (!kws.length) {
    const rows = await query<any>(
      `SELECT id,name,description,image_url,price,position,button_text,secondary_text,product_url
      FROM chatbot_products WHERE chatbot_id=? ORDER BY position ASC, id ASC LIMIT 4`,
      [id],
    )
    return NextResponse.json(normalizeProductUrls(rows || []))
  }

  const like = `%${kws.join("%")}%`
  const rows = await query<any>(
    `SELECT id,name,description,image_url,price,position,button_text,secondary_text,product_url
     FROM chatbot_products
     WHERE chatbot_id=? AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)
     ORDER BY position ASC, id ASC LIMIT 4`,
    [id, like, like],
  )
  return NextResponse.json(normalizeProductUrls(rows || []))
}
