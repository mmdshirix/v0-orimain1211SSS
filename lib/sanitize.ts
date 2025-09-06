import { safeTrim, safeStr, safeNum } from "./safe"

export type ChatbotSanitized = {
  id: number
  name: string
  primary_color: string
  text_color: string
  background_color: string
  chat_icon: string
  position: string
  margin_x: number
  margin_y: number
  welcome_message: string
  navigation_message: string
  knowledge_base_text: string
  knowledge_base_url: string
  store_url: string
  ai_url: string
  stats_multiplier: number
}

// ورودی خام از DB یا API را به خروجی 100٪ امن تبدیل می‌کند
export function sanitizeChatbot(input: any): ChatbotSanitized {
  return {
    id: Number(input?.id ?? 0),
    name: safeTrim(input?.name, ""),
    primary_color: safeTrim(input?.primary_color, "#14b8a6"),
    text_color: safeTrim(input?.text_color, "#ffffff"),
    background_color: safeTrim(input?.background_color, "#f3f4f6"),
    chat_icon: safeStr(input?.chat_icon, "💬"),
    position: safeTrim(input?.position, "bottom-right"),
    margin_x: safeNum(input?.margin_x, 20),
    margin_y: safeNum(input?.margin_y, 20),
    welcome_message: safeTrim(input?.welcome_message, "سلام! چطور می‌توانم به شما کمک کنم؟"),
    navigation_message: safeTrim(input?.navigation_message, "چه چیزی شما را به اینجا آورده است؟"),
    knowledge_base_text: safeTrim(input?.knowledge_base_text, ""),
    knowledge_base_url: safeTrim(input?.knowledge_base_url, ""),
    store_url: safeTrim(input?.store_url, ""),
    ai_url: safeTrim(input?.ai_url, ""),
    stats_multiplier: safeNum(input?.stats_multiplier, 1.0),
  }
}
