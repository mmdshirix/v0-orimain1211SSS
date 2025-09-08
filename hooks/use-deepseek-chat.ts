"use client"
import { useCallback, useRef, useState, useEffect } from "react"
import type React from "react"

export type ChatMsg = { id: string; role: "user" | "assistant" | "system"; content: string }

function generateClientId(): string {
  const stored = localStorage.getItem("talksell-client-id")
  if (stored) return stored

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  localStorage.setItem("talksell-client-id", clientId)
  return clientId
}

export function useDeepseekChat(initBody: any) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const clientIdRef = useRef<string>(generateClientId())

  const chatbotId = initBody?.chatbotId || "default"
  const storageKey = `talksell-chat-${chatbotId}`

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsedMessages = JSON.parse(saved)
        if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
          setMessages(parsedMessages)
        }
      }
    } catch (error) {
      console.error("Failed to load chat history:", error)
    }
  }, [storageKey])

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages))
      } catch (error) {
        console.error("Failed to save chat history:", error)
      }
    }
  }, [messages, storageKey])

  // Clear memory function
  const clearMemory = useCallback(() => {
    setMessages([])
    try {
      localStorage.removeItem(storageKey)
      const newClientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem("talksell-client-id", newClientId)
      clientIdRef.current = newClientId
    } catch (error) {
      console.error("Failed to clear chat history:", error)
    }
  }, [storageKey])

  const append = useCallback((msg: Omit<ChatMsg, "id">) => {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), ...msg }])
  }, [])

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault()
      const text = input.trim()
      if (!text || isLoading) return

      // push user msg
      const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", content: text }
      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setIsLoading(true)

      let retryCount = 0
      const maxRetries = 2

      const attemptRequest = async (): Promise<void> => {
        try {
          const ctl = new AbortController()
          abortRef.current = ctl

          const timeoutId = setTimeout(() => {
            ctl.abort()
          }, 30000) // 30 second timeout

          console.log(`[chat hook] Sending request to /api/chat (attempt ${retryCount + 1})`)

          const contextMessages = [...messages, userMsg].slice(-15).map((m) => ({ role: m.role, content: m.content }))

          const res = await fetch("/api/chat", {
            method: "POST",
            signal: ctl.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...initBody,
              messages: contextMessages,
              clientId: clientIdRef.current,
            }),
          })

          clearTimeout(timeoutId)
          console.log("[chat hook] Response status:", res.status, res.statusText)

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            console.error("[chat hook] API error:", errorData)

            let errorMessage = "متأسفانه در حال حاضر امکان پاسخگویی وجود ندارد. لطفاً دوباره تلاش کنید."

            if (res.status === 429) {
              errorMessage = "تعداد درخواست‌ها زیاد است. لطفاً کمی صبر کنید و دوباره تلاش کنید."
            } else if (res.status === 500) {
              errorMessage = "خطای سرور رخ داده است. لطفاً دوباره تلاش کنید."
            } else if (res.status === 503) {
              errorMessage = "سرویس موقتاً در دسترس نیست. لطفاً دوباره تلاش کنید."
            } else if (errorData.error === "missing-api-key") {
              errorMessage = "تنظیمات چت‌بات ناقص است. لطفاً با پشتیبانی تماس بگیرید."
            } else if (errorData.message) {
              errorMessage = errorData.message
            }

            if ((res.status >= 500 || res.status === 429) && retryCount < maxRetries) {
              retryCount++
              console.log(`[chat hook] Retrying request (${retryCount}/${maxRetries})`)
              await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount)) // Exponential backoff
              return attemptRequest()
            }

            const errorMsg: ChatMsg = {
              id: crypto.randomUUID(),
              role: "assistant",
              content: errorMessage,
            }
            setMessages((prev) => [...prev, errorMsg])
            return
          }

          const contentType = res.headers.get("content-type") || ""

          if (contentType.includes("application/json")) {
            // Handle non-streaming fallback response
            const data = await res.json()
            console.log("[chat hook] Received non-streaming response:", data)

            if (data.textFallback) {
              const assistantMsg: ChatMsg = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: data.textFallback,
              }
              setMessages((prev) => [...prev, assistantMsg])
            } else {
              throw new Error("No text content in response")
            }
          } else {
            // Handle streaming response
            if (!res.body) {
              throw new Error("No response body")
            }

            const reader = res.body.getReader()
            const decoder = new TextDecoder()
            let acc = ""
            let tokensReceived = 0
            let hasReceivedContent = false

            // create assistant msg
            const id = crypto.randomUUID()
            setMessages((prev) => [...prev, { id, role: "assistant", content: "" }])

            try {
              console.log("[chat hook] Starting stream processing")
              while (true) {
                const { value, done } = await reader.read()
                if (done) {
                  console.log("[chat hook] Stream reading completed")
                  break
                }

                const chunk = decoder.decode(value, { stream: true })
                if (chunk.length > 0) {
                  acc += chunk
                  tokensReceived++
                  hasReceivedContent = true
                  console.log(`[chat hook] Token ${tokensReceived}: ${chunk.length} chars`)
                }

                let displayContent = acc
                displayContent = displayContent.replace(/SUGGESTED_PRODUCTS:\s*\[.*?\]/s, "").trim()
                displayContent = displayContent.replace(/NEXT_SUGGESTIONS:\s*\[.*?\]/s, "").trim()

                setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: displayContent } : m)))
              }
            } catch (streamError) {
              console.error("[chat hook] Streaming error:", streamError)
              if (!hasReceivedContent) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === id ? { ...m, content: "خطا در دریافت پاسخ. لطفاً دوباره تلاش کنید." } : m)),
                )
                return
              }
            }

            let finalContent = acc
            finalContent = finalContent.replace(/SUGGESTED_PRODUCTS:\s*\[.*?\]/s, "").trim()
            finalContent = finalContent.replace(/NEXT_SUGGESTIONS:\s*\[.*?\]/s, "").trim()

            console.log(
              "[chat hook] Stream completed - tokensReceived:",
              tokensReceived,
              "hasReceivedContent:",
              hasReceivedContent,
              "finalContent length:",
              finalContent.length,
              "raw length:",
              acc.length,
            )

            if (!hasReceivedContent || tokensReceived === 0) {
              console.error("[chat hook] No content received from server")
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === id ? { ...m, content: "متأسفانه پاسخی دریافت نشد. لطفاً دوباره تلاش کنید." } : m,
                ),
              )
            } else {
              const contentToShow =
                finalContent.length > 0
                  ? finalContent
                  : acc.replace(/SUGGESTED_PRODUCTS:.*|NEXT_SUGGESTIONS:.*/gs, "").trim()
              console.log("[chat hook] Preserving received content:", contentToShow.substring(0, 100) + "...")
              setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: contentToShow } : m)))
            }

            console.log("[chat hook] Streaming completed successfully, tokens received:", tokensReceived)
          }
        } catch (err: any) {
          console.error("[chat stream error]", err)

          let errorMessage = "خطایی در ارتباط رخ داده است. لطفاً دوباره تلاش کنید."

          if (err.name === "AbortError") {
            errorMessage = "درخواست لغو شد یا زمان انتظار تمام شد."
          } else if (err.message?.includes("fetch") || err.message?.includes("network")) {
            errorMessage = "خطای اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید."
          } else if (err.message?.includes("timeout")) {
            errorMessage = "زمان انتظار تمام شد. لطفاً دوباره تلاش کنید."
          }

          if ((err.name === "AbortError" || err.message?.includes("fetch")) && retryCount < maxRetries) {
            retryCount++
            console.log(`[chat hook] Retrying after error (${retryCount}/${maxRetries})`)
            await new Promise((resolve) => setTimeout(resolve, 2000 * retryCount))
            return attemptRequest()
          }

          const errorMsg: ChatMsg = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: errorMessage,
          }
          setMessages((prev) => [...prev, errorMsg])
        }
      }

      try {
        await attemptRequest()
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [input, isLoading, messages, initBody],
  )

  const stop = useCallback(() => {
    try {
      abortRef.current?.abort()
    } catch {}
  }, [])

  return { messages, input, setInput, isLoading, append, handleSubmit, stop, clearMemory }
}
