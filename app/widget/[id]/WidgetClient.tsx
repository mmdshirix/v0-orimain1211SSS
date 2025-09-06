"use client"
import ChatbotWidget from "@/components/chatbot-widget"
import { useIsMounted } from "@/hooks/use-is-mounted"
import { SafeErrorBoundary } from "@/components/safe-error-boundary"
import type { ChatbotSanitized } from "@/lib/sanitize"

export default function WidgetClient({ chatbot }: { chatbot: ChatbotSanitized }) {
  const mounted = useIsMounted()

  if (!mounted) return <div style={{ minHeight: 1 }} />

  return (
    <SafeErrorBoundary>
      <div style={{ width: "100%", minHeight: "100%" }}>
        <ChatbotWidget chatbot={chatbot} />
      </div>
    </SafeErrorBoundary>
  )
}
