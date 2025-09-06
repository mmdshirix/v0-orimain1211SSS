import type React from "react"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
            /* Enhanced iframe reset to prevent white space and ensure proper height */
            html, body, #__next { 
              margin: 0 !important; 
              padding: 0 !important; 
              height: 600px !important; 
              max-height: 600px !important;
              min-height: 600px !important;
              width: 100% !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              position: relative !important;
              line-height: 1 !important;
              font-size: 14px !important;
            }
            * { 
              box-sizing: border-box !important; 
            }
            body { 
              background: white !important; 
              font-family: system-ui, -apple-system, sans-serif !important;
              overflow: hidden !important;
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            /* Prevent host site CSS inheritance and baseline gaps */
            :root { 
              padding: 0 !important; 
              margin: 0 !important;
              line-height: 1 !important;
            }
            /* Force exact 600px height container */
            #ts-root {
              height: 600px !important;
              max-height: 600px !important;
              min-height: 600px !important;
              width: 100% !important;
              overflow: hidden !important;
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            
            /* Mobile full screen with proper height management */
            @media (max-width: 768px) {
              html, body, #__next, #ts-root { 
                height: 100vh !important;
                max-height: 100vh !important;
                min-height: 100vh !important;
                width: 100vw !important;
              }
            }
          `,
          }}
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "transparent", overflow: "hidden" }}>{children}</body>
    </html>
  )
}
