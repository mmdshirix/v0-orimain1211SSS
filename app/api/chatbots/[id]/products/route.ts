import { NextResponse } from "next/server"
import { syncChatbotProducts, getChatbotProducts, type ChatbotProduct } from "@/lib/db"

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
    const products = await getChatbotProducts(chatbotId)
    return cors(NextResponse.json(products))
  } catch (error) {
    console.error(`[API GET /products] Error fetching products for chatbot ${chatbotId}:`, error)
    return cors(NextResponse.json({ error: "خطا در دریافت محصولات" }, { status: 500 }))
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const chatbotId = Number.parseInt(params.id, 10)
  if (isNaN(chatbotId)) {
    return cors(NextResponse.json({ error: "شناسه چت‌بات نامعتبر است" }, { status: 400 }))
  }

  try {
    const products = (await request.json()) as Partial<ChatbotProduct>[]
    if (!Array.isArray(products)) {
      return cors(NextResponse.json({ error: "داده‌های ارسالی باید یک آرایه از محصولات باشد" }, { status: 400 }))
    }

    const validProducts = products
      .filter((product) => product.name?.trim())
      .map((product, index) => ({
        chatbot_id: chatbotId,
        name: product.name!.trim(),
        description: product.description?.trim() || null,
        price: product.price || null,
        image_url: product.image_url || null,
        button_text: product.button_text || "خرید",
        secondary_text: product.secondary_text || "جزئیات",
        product_url: product.product_url || null,
        position: index,
      }))

    const updatedProducts = await syncChatbotProducts(chatbotId, validProducts)
    return cors(NextResponse.json(updatedProducts))
  } catch (error) {
    console.error(`[API PUT /products] Error syncing products for chatbot ${chatbotId}:`, error)
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"
    return cors(
      NextResponse.json({ error: "خطای داخلی سرور در ذخیره محصولات", details: errorMessage }, { status: 500 }),
    )
  }
}
