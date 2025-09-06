export function safeTrim(v: unknown, fallback = ""): string {
  if (v == null) return fallback
  try {
    return (typeof v === "string" ? v : String(v)).trim()
  } catch {
    return fallback
  }
}

export function safeStr(v: unknown, fallback = ""): string {
  if (v == null) return fallback
  try {
    return typeof v === "string" ? v : String(v)
  } catch {
    return fallback
  }
}

export function safeNum(v: unknown, fallback = 0): number {
  try {
    const n = Number(v as any)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}
