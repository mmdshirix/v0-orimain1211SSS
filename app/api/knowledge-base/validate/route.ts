import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function fetchAndCleanContent(url: string): Promise<{ content: string; contentLength: number }> {
  const timeout = 8000 // 8 seconds
  const maxChars = 12000

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TalkSell-Bot/1.0 (+https://talksell.ir)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7",
        "Accept-Language": "en-US,en;q=0.9,fa;q=0.8",
        "Cache-Control": "no-cache",
      },
      redirect: "follow",
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const rawContent = await response.text()
    const contentType = response.headers.get("content-type") || ""

    let cleanContent = rawContent

    // Clean HTML content if it's HTML
    if (contentType.includes("text/html")) {
      cleanContent = rawContent
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

    const truncatedContent = cleanContent.slice(0, maxChars)

    return {
      content: truncatedContent,
      contentLength: truncatedContent.length,
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === "AbortError") {
      throw new Error("درخواست به دلیل طولانی شدن زمان انتظار لغو شد")
    }
    throw error
  }
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "آدرس URL الزامی است" }, { status: 400 })
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "فرمت URL نامعتبر است" }, { status: 400 })
    }

    // Fetch and validate content
    const { content, contentLength } = await fetchAndCleanContent(url)

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "محتوای قابل استخراجی از این URL یافت نشد" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      preview: content.slice(0, 500), // First 500 chars for preview
      contentLength,
      message: `محتوای ${contentLength} کاراکتر با موفقیت استخراج شد`,
    })
  } catch (error: any) {
    console.error("Knowledge base validation error:", error)

    let errorMessage = "خطا در بارگذاری محتوا از URL"
    if (error.message.includes("fetch")) {
      errorMessage = "خطا در اتصال به URL مورد نظر"
    } else if (error.message.includes("timeout") || error.message.includes("انتظار")) {
      errorMessage = "زمان انتظار برای بارگذاری محتوا تمام شد"
    } else if (error.message.includes("HTTP")) {
      errorMessage = `خطای سرور: ${error.message}`
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
