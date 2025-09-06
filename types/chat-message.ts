export interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  products?: Array<{
    id: number
    name: string
    description: string
    price: number
    image_url: string
    product_url: string
    button_text: string
  }>
  suggestions?: Array<{
    text: string
    emoji: string
  }>
}
