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
              width: 100% !important;
              box-sizing: border-box !important;
              overflow: hidden !important;
              position: relative !important;
              line-height: 1 !important;
              font-size: 14px !important;
            }
            
            /* Desktop uses fixed 640px height - single source of truth */
            @media (min-width: 481px) {
              html, body, #__next { 
                height: 640px !important; 
                max-height: 640px !important;
                min-height: 640px !important;
              }
            }
            
            /* Mobile uses full viewport height only on mobile */
            @media (max-width: 480px) {
              html, body, #__next { 
                height: 100vh !important; 
                max-height: 100vh !important;
                min-height: 100vh !important;
                width: 100vw !important;
              }
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
            /* Enhanced isolation to prevent CSS inheritance from host sites */
            :root { 
              padding: 0 !important; 
              margin: 0 !important;
              line-height: 1 !important;
              font-size: 14px !important;
              vertical-align: baseline !important;
            }
            /* Force exact height matching iframe loader - single source of truth */
            #ts-root {
              overflow: hidden !important;
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
              position: relative !important;
              vertical-align: top !important;
              line-height: 1 !important;
              border: none !important;
              outline: none !important;
            }
            
            /* Desktop: exact 640px height matching loader */
            @media (min-width: 481px) {
              #ts-root {
                height: 640px !important;
                max-height: 640px !important;
                min-height: 640px !important;
                width: 100% !important;
              }
            }
            
            /* Mobile: full viewport matching loader */
            @media (max-width: 480px) {
              #ts-root {
                height: 100vh !important;
                max-height: 100vh !important;
                min-height: 100vh !important;
                width: 100vw !important;
              }
            }
            
            /* Additional reset for common host site interference */
            #ts-root * {
              margin: 0 !important;
              padding: 0 !important;
              border: 0 !important;
              font-size: inherit !important;
              vertical-align: baseline !important;
              line-height: inherit !important;
            }
          `,
          }}
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "transparent", overflow: "hidden" }}>{children}</body>
    </html>
  )
}
