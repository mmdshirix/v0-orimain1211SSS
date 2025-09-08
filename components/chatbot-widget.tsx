"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useDeepseekChat } from "@/hooks/use-deepseek-chat"
import { safeTrim } from "@/lib/safe"
import type { ChatbotSanitized } from "@/lib/sanitize"
import TicketForm from "@/components/ticket-form" // Fixed import path to match kebab-case filename

interface ChatbotWidgetProps {
  chatbot: ChatbotSanitized
}

interface SuggestedProduct {
  id: number
  name: string
  description: string
  price: number
  image_url: string
  product_url: string
  button_text: string
}

interface NextSuggestion {
  text: string
  emoji: string
}

const linkifyText = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi
  const parts = text.split(urlRegex)

  return parts.map((part, index) => {
    if (urlRegex.test(part)) {
      let url = part
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url
      }
      return (
        <a
          key={index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline break-all"
        >
          {part}
        </a>
      )
    }
    return part
  })
}

export default function ChatbotWidget({ chatbot }: ChatbotWidgetProps) {
  const [activeTab, setActiveTab] = useState<"ai" | "store" | "ticket">("ai")
  const [faqs, setFaqs] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [suggestedProducts, setSuggestedProducts] = useState<SuggestedProduct[]>([])
  const [nextSuggestions, setNextSuggestions] = useState<NextSuggestion[]>([])
  const [welcomeShown, setWelcomeShown] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const chatbotId = Number(chatbot?.id ?? 0)
  const botName = safeTrim(chatbot?.name, "Chat")
  const kbText = safeTrim(chatbot?.knowledge_base_text, "")
  const kbUrl = safeTrim(chatbot?.knowledge_base_url, "")
  const storeUrl = safeTrim(chatbot?.store_url, "")

  const popularEmojis = ["😊", "👍", "❤️", "😂", "🔥", "👏", "🎉", "💯", "🤔", "😍"]

  const { messages, input, setInput, isLoading, append, handleSubmit, clearMemory } = useDeepseekChat({
    chatbotId,
    chatbotName: botName,
    kbText,
    kbUrl,
    storeUrl,
  })

  const playNotificationSound = () => {
    if (soundEnabled) {
      try {
        const audio = new Audio("https://www.soundjay.com/misc/sounds/bell-ringing-05.wav")
        audio.volume = 0.3
        audio.play().catch(() => {
          const context = new (window.AudioContext || (window as any).webkitAudioContext)()
          const oscillator = context.createOscillator()
          const gainNode = context.createGain()
          oscillator.connect(gainNode)
          gainNode.connect(context.destination)
          oscillator.frequency.value = 800
          gainNode.gain.setValueAtTime(0.1, context.currentTime)
          oscillator.start()
          oscillator.stop(context.currentTime + 0.2)
        })
      } catch (error) {
        console.log("Sound notification failed:", error)
      }
    }
  }

  const handleCloseWidget = () => {
    if (window.parent) {
      window.parent.postMessage({ type: "CLOSE_CHATBOT" }, "*")
    }
  }

  const handleClearHistory = () => {
    clearMemory()
    setShowMenu(false)
    const sessionKey = `talksell-welcome-shown-${chatbotId}`
    sessionStorage.removeItem(sessionKey)
    setWelcomeShown(false)
    const msg = safeTrim(chatbot?.welcome_message, "")
    if (msg) {
      setTimeout(() => {
        append({ role: "assistant", content: msg })
        setWelcomeShown(true)
        sessionStorage.setItem(sessionKey, "true")
      }, 100)
    }
  }

  const handleToggleSound = () => {
    setSoundEnabled(!soundEnabled)
    setShowMenu(false)
    localStorage.setItem(`talksell-sound-${chatbotId}`, (!soundEnabled).toString())
  }

  useEffect(() => {
    fetch(`/api/chatbots/${chatbotId}/faqs`)
      .then((r) => r.json())
      .then(setFaqs)
      .catch(() => {})
    fetch(`/api/chatbots/${chatbotId}/products`)
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => {})
    const savedSoundSetting = localStorage.getItem(`talksell-sound-${chatbotId}`)
    if (savedSoundSetting !== null) {
      setSoundEnabled(savedSoundSetting === "true")
    }
  }, [chatbotId])

  useEffect(() => {
    const sessionKey = `talksell-welcome-shown-${chatbotId}`
    const welcomeShownInSession = sessionStorage.getItem(sessionKey)

    if (!welcomeShownInSession && !welcomeShown && messages.length === 0) {
      const msg = safeTrim(chatbot?.welcome_message, "")
      if (msg) {
        append({ role: "assistant", content: msg })
        setWelcomeShown(true)
        sessionStorage.setItem(sessionKey, "true")
      }
    }
  }, [welcomeShown, messages.length, chatbot?.welcome_message, append, chatbotId])

  useEffect(() => {
    const el = document.getElementById("ts-bottom")
    if (el) el.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length])

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === "assistant" && lastMessage.content && messages.length > 1) {
      playNotificationSound()
      const content = lastMessage.content

      const productRegex = /SUGGESTED_PRODUCTS:\s*(\[.*?\])/
      const productMatch = content.match(productRegex)
      if (productMatch) {
        try {
          const products = JSON.parse(productMatch[1])
          setSuggestedProducts(products)
        } catch (e) {
          console.error("Product parsing error:", e)
        }
      }

      const suggestionRegex = /NEXT_SUGGESTIONS:\s*(\[.*?\])/
      const suggestionMatch = content.match(suggestionRegex)
      if (suggestionMatch) {
        try {
          const suggestions = JSON.parse(suggestionMatch[1])
          setNextSuggestions(suggestions)
        } catch (e) {
          console.error("Suggestion parsing error:", e)
        }
      }
    }
  }, [messages])

  const canSend = safeTrim(input, "").length > 0 && !isLoading

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSend) return
    handleSubmit(e)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (canSend) handleSubmit()
    }
  }

  const handleFAQClick = (faq: any) => {
    setInput((prev) => (prev ? prev + "\n" : "") + safeTrim(faq.question, ""))
  }

  const handleSuggestionClick = (suggestion: NextSuggestion) => {
    setInput(suggestion.text)
  }

  const handleEmojiClick = (emoji: string) => {
    setInput((prev) => prev + emoji)
    setShowEmojiPicker(false)
  }

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(timestamp)
  }

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
    } catch (error) {
      console.error("Failed to copy text:", error)
    }
  }

  return (
    <div
      id="ts-root"
      className="w-full m-0 p-0"
      style={{
        overflow: "hidden",
        ["--ts-primary" as any]: chatbot.primary_color,
        ["--ts-fg" as any]: chatbot.text_color,
        ["--ts-bg" as any]: chatbot.background_color,
      }}
    >
      <div
        id="ts-shell"
        className="grid w-full bg-[var(--ts-bg)] text-[var(--ts-fg)] m-0"
        style={{
          gridTemplateRows: "64px 1fr 140px",
          overflow: "hidden",
          height: "100%",
        }}
        dir="rtl"
      >
        <header
          className="px-4 py-3 text-white m-0 shadow-sm flex-shrink-0"
          style={{
            backgroundColor: chatbot.primary_color,
            height: "64px",
            minHeight: "64px",
            maxHeight: "64px",
            overflow: "hidden",
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-lg">💬</span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">{botName}</h3>
                <p className="text-xs text-white/90">آنلاین</p>
              </div>
            </div>
            <div className="flex items-center gap-1 relative">
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded text-lg"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {showMenu && (
                  <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-[99999]">
                    <div className="py-2">
                      <button
                        onClick={handleClearHistory}
                        className="w-full px-4 py-3 text-right text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        <span>پاک کردن تاریخچه مکالمه</span>
                      </button>
                      <button
                        onClick={handleToggleSound}
                        className="w-full px-4 py-3 text-right text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors"
                      >
                        {soundEnabled ? (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                            />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                            />
                          </svg>
                        )}
                        <span>{soundEnabled ? "خاموش کردن صدا" : "روشن کردن صدا"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleCloseWidget}
                className="text-white/80 hover:text-white hover:bg-white/20 p-1.5 rounded text-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <section
          id="ts-body"
          className="overflow-y-auto px-4 py-4 m-0 bg-gray-50 flex-1"
          style={{
            overflowY: "auto",
            overflowX: "hidden",
            height: "100%",
          }}
        >
          {activeTab === "ai" && (
            <div className="space-y-4">
              {messages.length > 0 && (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-3">
                      <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        {message.role === "assistant" ? (
                          <div className="flex gap-3 max-w-[85%]">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                              style={{ backgroundColor: chatbot.primary_color }}
                            >
                              <span className="text-lg">💬</span>
                            </div>
                            <div className="flex-1">
                              <div className="bg-white rounded-2xl rounded-tl-md px-[18px] py-4 text-sm shadow-sm border border-gray-100">
                                <div className="text-gray-800 leading-relaxed">
                                  {linkifyText(
                                    message.content
                                      .replace(/SUGGESTED_PRODUCTS:.*$/s, "")
                                      .replace(/NEXT_SUGGESTIONS:.*$/s, "")
                                      .trim(),
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2 px-1">
                                <button
                                  onClick={() => handleCopy(message.content)}
                                  className="p-2 rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all duration-200"
                                  title="کپی"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
                                    />
                                  </svg>
                                </button>
                                <button
                                  className="p-2 rounded-full text-gray-400 hover:text-green-500 hover:bg-green-50 transition-all duration-200"
                                  title="پسندیدن"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.831 3.218-.266.558-.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5.25 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z"
                                    />
                                  </svg>
                                </button>
                                <button
                                  className="p-2 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200"
                                  title="نپسندیدن"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M7.5 15h2.25m8.25-9.75c0-1.553-.295-3.036-.831-4.398C16.472 0.403 15.683 0 14.25 0H5.25C4.167 0 3.387.453 3.081.977A12.004 12.004 0 002.25 5.375c0 1.194.232 2.333.654 3.375M7.5 15l4.5-4.5L16.5 15m-9 0h9m-9 0v-3.375c0-.621.504-1.125 1.125-1.125h6.75c.621 0 1.125.504 1.125 1.125v6.75M7.5 15v2.25A2.25 2.25 0 009.75 19.5h4.5a2.25 2.25 0 002.25-2.25V15m-9 0H2.25A2.25 2.25 0 010 12.75V6.108c0-1.026.694-1.945 1.715-2.054C2.127 4.009 2.534 4 2.947 4H5.25c.621 0 1.125.504 1.125 1.125v6.75M7.5 15v2.25A2.25 2.25 0 009.75 19.5h4.5a2.25 2.25 0 002.25-2.25V15"
                                    />
                                  </svg>
                                </button>
                                <span className="text-xs text-gray-400 mr-1">{formatTime(new Date())}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 max-w-[85%] justify-end">
                            <div
                              className="text-white rounded-2xl rounded-tr-md px-4 py-[14px] text-sm shadow-sm"
                              style={{ backgroundColor: chatbot.primary_color }}
                            >
                              <div className="leading-relaxed">{linkifyText(message.content)}</div>
                            </div>
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1"
                              style={{ backgroundColor: chatbot.primary_color }}
                            >
                              <span className="text-xs text-white font-medium">شما</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {faqs.length > 0 && messages.length >= 1 && (
                <div className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 gap-3">
                    {faqs.slice(0, 4).map((faq) => (
                      <button
                        key={faq.id}
                        onClick={() => handleFAQClick(faq)}
                        className="min-h-[50px] px-4 py-3 text-right justify-start bg-white border-0 rounded-2xl text-sm font-medium text-gray-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          boxShadow: `0 2px 8px ${chatbot.primary_color}25, 0 1px 3px ${chatbot.primary_color}15`,
                        }}
                      >
                        <div className="flex items-center gap-2.5 w-full">
                          <span className="text-lg flex-shrink-0">{faq.emoji}</span>
                          <span className="flex-1 text-right leading-tight">{faq.question}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: chatbot.primary_color }}
                  >
                    <span className="text-sm text-white">💬</span>
                  </div>
                  <div className="bg-white rounded-2xl rounded-tl-md p-4 shadow-sm border border-gray-100">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}

              {suggestedProducts.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {suggestedProducts.slice(0, 4).map((product) => (
                    <a
                      key={product.id}
                      href={product.product_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border shadow-sm overflow-hidden bg-white hover:shadow-md transition-all"
                    >
                      {product.image_url && (
                        <img
                          src={product.image_url || "/placeholder.svg"}
                          alt={product.name}
                          className="h-28 w-full object-cover"
                        />
                      )}
                      <div className="p-3">
                        <div className="text-sm font-medium line-clamp-2 text-gray-900">{product.name}</div>
                        <div className="text-xs text-gray-600 line-clamp-2 mt-1">{product.description}</div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900">{Number(product.price || 0)} تومان</span>
                          <span
                            className="text-xs px-2 py-1 rounded-md text-white"
                            style={{ background: chatbot.primary_color }}
                          >
                            {product.button_text}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {nextSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {nextSuggestions.slice(0, 3).map((suggestion, i) => (
                    <button
                      key={i}
                      className="rounded-2xl border px-3 py-2 shadow-sm bg-white hover:shadow-md transition-all text-gray-700"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion.emoji} {suggestion.text}
                    </button>
                  ))}
                </div>
              )}

              <div id="ts-bottom" className="h-1" />
            </div>
          )}

          {activeTab === "store" && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">فروشگاه محصولات</h2>
                <p className="text-sm text-gray-600">محصولات ما را مشاهده کنید</p>
              </div>
              {products.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                  {products.map((product) => (
                    <a
                      key={product.id}
                      href={product.product_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border shadow-sm overflow-hidden bg-white hover:shadow-md transition-all"
                    >
                      {product.image_url && (
                        <img
                          src={product.image_url || "/placeholder.svg"}
                          alt={product.name}
                          className="h-32 w-full object-cover"
                        />
                      )}
                      <div className="p-3">
                        <h4 className="font-medium text-sm text-gray-900 mb-1">{product.name}</h4>
                        {product.description && (
                          <p className="text-xs text-gray-600 mb-2 line-clamp-2">{product.description}</p>
                        )}
                        {product.price && (
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-lg font-bold text-green-600">{Number(product.price)} تومان</span>
                          </div>
                        )}
                        <button
                          className="w-full text-xs py-2 px-3 rounded text-white"
                          style={{ backgroundColor: chatbot.primary_color }}
                        >
                          {product.button_text || "خرید"}
                        </button>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🛍️</div>
                  <p className="text-sm text-gray-600">هیچ محصولی در حال حاضر موجود نیست</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "ticket" && (
            <div className="h-full">
              <TicketForm chatbotId={chatbotId} onClose={() => {}} />
            </div>
          )}
        </section>

        <footer
          className="px-3 pt-2 pb-1 bg-white border-t border-gray-200 flex-shrink-0"
          style={{
            height: "140px",
            minHeight: "140px",
            maxHeight: "140px",
            overflow: "hidden",
          }}
        >
          <div className="flex">
            <button
              onClick={() => setActiveTab("ai")}
              className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
                activeTab === "ai" ? `border-b-2` : "text-gray-400 hover:text-gray-600"
              }`}
              style={{
                color: activeTab === "ai" ? chatbot.primary_color : undefined,
                borderBottomColor: activeTab === "ai" ? chatbot.primary_color : undefined,
              }}
            >
              <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 2L3 7v11a2 2 0 002 2h10a2 2 0 002-2V7l-7-5zM6 12a1 1 0 000 2h1a1 1 0 100-2H5zm3 0a1 1 0 000 2h1a1 1 0 100-2H8zm3 0a1 1 0 000 2h1a1 1 0 100-2h-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>هوش مصنوعی</span>
            </button>
            <button
              onClick={() => setActiveTab("store")}
              className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
                activeTab === "store" ? `border-b-2` : "text-gray-400 hover:text-gray-600"
              }`}
              style={{
                color: activeTab === "store" ? chatbot.primary_color : undefined,
                borderBottomColor: activeTab === "store" ? chatbot.primary_color : undefined,
              }}
            >
              <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M2 5a2 2 0 012-2h8a2 2 0 012 2v6h2a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3 1a1 1 0 000 2h1a1 1 0 100-2H5zm3 0a1 1 0 000 2h1a1 1 0 100-2H8zm3 0a1 1 0 000 2h1a1 1 0 100-2h-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>فروشگاه</span>
            </button>
            <button
              onClick={() => setActiveTab("ticket")}
              className={`flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors ${
                activeTab === "ticket" ? `border-b-2` : "text-gray-400 hover:text-gray-600"
              }`}
              style={{
                color: activeTab === "ticket" ? chatbot.primary_color : undefined,
                borderBottomColor: activeTab === "ticket" ? chatbot.primary_color : undefined,
              }}
            >
              <svg className="w-5 h-5 mb-1" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M2 5a2 2 0 012-2h8a2 2 0 012 2v6h2a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3 1a1 1 0 000 2h1a1 1 0 100-2H5zm3 0a1 1 0 000 2h1a1 1 0 100-2H8zm3 0a1 1 0 000 2h1a1 1 0 100-2h-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>تیکت</span>
            </button>
          </div>

          {activeTab === "ai" && (
            <div className="pt-3 pb-1 bg-white relative">
              <form onSubmit={handleFormSubmit} className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="پیام خود را بنویسید..."
                    className="w-full rounded-full px-6 py-4 pr-14 pl-14 outline-none resize-none border-2 border-gray-200 bg-gray-50 text-sm transition-all duration-200 min-h-[56px] text-black"
                    style={{
                      fontSize: "14px",
                      lineHeight: "1.5",
                      color: "#000000",
                      borderColor: showEmojiPicker ? chatbot.primary_color : undefined,
                      backgroundColor: showEmojiPicker ? "white" : undefined,
                      boxShadow: showEmojiPicker ? `0 0 0 3px ${chatbot.primary_color}20` : undefined,
                    }}
                    rows={1}
                    dir="rtl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-all"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={!canSend}
                  className="rounded-full w-12 h-12 text-white disabled:opacity-40 transition-all duration-200 hover:shadow-xl flex items-center justify-center shadow-lg flex-shrink-0"
                  style={{ backgroundColor: chatbot.primary_color }}
                >
                  <svg className="w-6 h-6 rotate-180" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </form>

              {showEmojiPicker && (
                <div className="absolute bottom-20 right-4 bg-white rounded-2xl shadow-xl border border-gray-200 p-3 z-50">
                  <div className="grid grid-cols-5 gap-2">
                    {popularEmojis.map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => handleEmojiClick(emoji)}
                        className="w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center text-xl"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center mt-1 pb-1">
                <a
                  href="https://talksell.ir/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span>قدرت گرفته از</span>
                  <img
                    src="https://talksell.ir/wp-content/uploads/2025/07/cropped-tg.png"
                    alt="TalkSell Logo"
                    className="w-4 h-4 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                    }}
                  />
                  <span className="font-medium">تاکسل</span>
                </a>
              </div>
            </div>
          )}
        </footer>
      </div>
    </div>
  )
}
