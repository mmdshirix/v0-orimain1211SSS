"use client"

type Msg = { id: string; role: "user" | "assistant" | "system"; content: string }

export function useChatMemory(botId: number) {
  const key = `ts_mem_${botId}`
  const load = (): Msg[] => {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]")
    } catch {
      return []
    }
  }
  const save = (arr: Msg[]) => localStorage.setItem(key, JSON.stringify(arr))
  const clear = () => localStorage.removeItem(key)
  return { load, save, clear }
}
