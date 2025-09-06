export function processMessageInstantly(content: string) {
  // Extract suggested products from message content
  const productMatch = content.match(/SUGGESTED_PRODUCTS:\s*(\[.*?\])/s)
  let matchedProducts: any[] = []

  if (productMatch) {
    try {
      matchedProducts = JSON.parse(productMatch[1])
    } catch (error) {
      console.error("Failed to parse suggested products:", error)
    }
  }

  // Extract next suggestions from message content
  const suggestionMatch = content.match(/NEXT_SUGGESTIONS:\s*(\[.*?\])/s)
  let nextSuggestions: any[] = []

  if (suggestionMatch) {
    try {
      nextSuggestions = JSON.parse(suggestionMatch[1])
    } catch (error) {
      console.error("Failed to parse next suggestions:", error)
    }
  }

  // Clean content by removing the structured data
  const cleanContent = content
    .replace(/SUGGESTED_PRODUCTS:\s*\[.*?\]/s, "")
    .replace(/NEXT_SUGGESTIONS:\s*\[.*?\]/s, "")
    .trim()

  return {
    cleanContent,
    matchedProducts,
    nextSuggestions,
  }
}
