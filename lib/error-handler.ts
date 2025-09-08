export interface ErrorResponse {
  error: string
  message: string
  code?: string
  retryable?: boolean
}

export class ChatbotError extends Error {
  public code: string
  public retryable: boolean
  public userMessage: string

  constructor(code: string, message: string, userMessage: string, retryable = false) {
    super(message)
    this.name = "ChatbotError"
    this.code = code
    this.retryable = retryable
    this.userMessage = userMessage
  }
}

export const ErrorCodes = {
  MISSING_API_KEY: "missing-api-key",
  CHATBOT_NOT_FOUND: "chatbot-not-found",
  RATE_LIMITED: "rate-limited",
  SERVER_ERROR: "server-error",
  NETWORK_ERROR: "network-error",
  TIMEOUT_ERROR: "timeout-error",
  INVALID_REQUEST: "invalid-request",
  KB_FETCH_ERROR: "kb-fetch-error",
  MEMORY_ERROR: "memory-error",
} as const

export function createErrorResponse(error: ChatbotError | Error): ErrorResponse {
  if (error instanceof ChatbotError) {
    return {
      error: error.code,
      message: error.userMessage,
      code: error.code,
      retryable: error.retryable,
    }
  }

  // Handle unknown errors
  return {
    error: ErrorCodes.SERVER_ERROR,
    message: "خطای سیستمی رخ داده است. لطفاً دوباره تلاش کنید.",
    retryable: true,
  }
}

export function handleApiError(error: any, context: string): ChatbotError {
  console.error(`[${context}] Error:`, error)

  if (error.name === "AbortError") {
    return new ChatbotError(
      ErrorCodes.TIMEOUT_ERROR,
      "Request was aborted",
      "زمان انتظار تمام شد. لطفاً دوباره تلاش کنید.",
      true,
    )
  }

  if (error.message?.includes("fetch") || error.message?.includes("network")) {
    return new ChatbotError(
      ErrorCodes.NETWORK_ERROR,
      "Network error occurred",
      "خطای اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.",
      true,
    )
  }

  if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
    return new ChatbotError(
      ErrorCodes.NETWORK_ERROR,
      "Connection failed",
      "امکان اتصال به سرور وجود ندارد. لطفاً دوباره تلاش کنید.",
      true,
    )
  }

  return new ChatbotError(
    ErrorCodes.SERVER_ERROR,
    error.message || "Unknown error",
    "خطای سیستمی رخ داده است. لطفاً دوباره تلاش کنید.",
    true,
  )
}

export function isRetryableError(error: any): boolean {
  if (error instanceof ChatbotError) {
    return error.retryable
  }

  // Network errors and timeouts are generally retryable
  return (
    error.name === "AbortError" ||
    error.message?.includes("fetch") ||
    error.message?.includes("network") ||
    error.code === "ENOTFOUND" ||
    error.code === "ECONNREFUSED"
  )
}
