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
    return NextResponse.json(rows || [])
  }

  const like = `%${kws.join("%")}%`
  const rows = await query<any>(
    `SELECT id,name,description,image_url,price,position,button_text,secondary_text,product_url
     FROM chatbot_products
     WHERE chatbot_id=? AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)
     ORDER BY position ASC, id ASC LIMIT 4`,
    [id, like, like],
  )
  return NextResponse.json(rows || [])
}
