export function linkify(text: string): string {
  const url = /(https?:\/\/[^\s)]+)(?![^<]*>)/g
  return text.replace(
    url,
    (m) => `<a href="${m}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">${m}</a>`,
  )
}
