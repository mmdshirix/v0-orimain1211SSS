export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { getChatbotById } from "@/lib/db"
import WidgetClient from "./WidgetClient"
import { sanitizeChatbot } from "@/lib/sanitize"

export default async function WidgetPage({ params }: { params: { id: string } }) {
  const chatbotId = Number(params.id)
  if (isNaN(chatbotId)) return notFound()

  const raw = await getChatbotById(chatbotId)
  if (!raw) return notFound()

  const chatbot = sanitizeChatbot(raw)

  return <WidgetClient chatbot={chatbot} />
}
