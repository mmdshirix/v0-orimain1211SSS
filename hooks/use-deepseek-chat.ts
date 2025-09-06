"use client"
import { useCallback, useRef, useState, useEffect } from "react"
import type React from "react"

export type ChatMsg = { id: string; role: "user" | "assistant" | "system"; content: string }

export function useDeepseekChat(initBody: any) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

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

      // call API
      try {
        const ctl = new AbortController()
        abortRef.current = ctl

        console.log("[chat hook] Sending request to /api/chat")

        const contextMessages = [...messages, userMsg].slice(-15).map((m) => ({ role: m.role, content: m.content }))

        const res = await fetch("/api/chat", {
          method: "POST",
          signal: ctl.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...initBody,
            messages: contextMessages,
          }),
        })

        console.log("[chat hook] Response status:", res.status, res.statusText)

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error("[chat hook] API error:", errorData)

          // Show Persian error message to user
          const errorMsg: ChatMsg = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "متأسفانه در حال حاضر امکان پاسخگویی وجود ندارد. لطفاً دوباره تلاش کنید.",
          }
          setMessages((prev) => [...prev, errorMsg])
          return
        }

        if (!res.body) {
          throw new Error("No response body")
        }

        // streaming read
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ""
        // create assistant msg
        const id = crypto.randomUUID()
        setMessages((prev) => [...prev, { id, role: "assistant", content: "" }])

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })
          setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: acc } : m)))
        }

        console.log("[chat hook] Streaming completed successfully")
      } catch (err) {
        console.error("[chat stream error]", err)
        const errorMsg: ChatMsg = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "خطایی در ارتباط رخ داده است. لطفاً دوباره تلاش کنید.",
        }
        setMessages((prev) => [...prev, errorMsg])
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
