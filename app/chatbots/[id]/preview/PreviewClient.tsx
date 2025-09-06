"use client"
import { useIsMounted } from "@/hooks/use-is-mounted"
import { SafeErrorBoundary } from "@/components/safe-error-boundary"
import ChatbotWidget from "@/components/chatbot-widget"
import type { ChatbotSanitized } from "@/lib/sanitize"

export default function PreviewClient({ chatbot }: { chatbot: ChatbotSanitized }) {
  const mounted = useIsMounted()
  if (!mounted) return <div style={{ padding: 16 }}>Loading…</div>

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-center">
      <SafeErrorBoundary>
        <div style={{ width: "100%", maxWidth: 420 }}>
          <ChatbotWidget chatbot={chatbot} />
        </div>
      </SafeErrorBoundary>
    </main>
  )
}
