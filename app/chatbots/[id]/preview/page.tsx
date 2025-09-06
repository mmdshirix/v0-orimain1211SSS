export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { notFound } from "next/navigation"
import { getChatbotById } from "@/lib/db"
import PreviewClient from "./PreviewClient"
import { sanitizeChatbot } from "@/lib/sanitize"

interface PreviewChatbotPageProps {
  params: {
    id: string
  }
}

export default async function PreviewChatbotPage({ params }: PreviewChatbotPageProps) {
  const chatbotId = Number.parseInt(params.id)

  if (isNaN(chatbotId)) {
    notFound()
  }

  const raw = await getChatbotById(chatbotId)

  if (!raw) {
    notFound()
  }

  const chatbot = sanitizeChatbot(raw)

  return <PreviewClient chatbot={chatbot} />
}
