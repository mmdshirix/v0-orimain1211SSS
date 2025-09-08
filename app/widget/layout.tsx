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
            /* Removed aggressive global resets, keeping only html/body resets */
            html { 
              margin: 0; 
              padding: 0; 
              height: 100%; 
              min-height: 0; 
              background: transparent; 
              font-size: 16px;
              box-sizing: border-box;
            }
            
            body { 
              margin: 0; 
              padding: 0; 
              height: 100%; 
              min-height: 0; 
              background: transparent; 
              line-height: 1.6;
              font-weight: 400;
              font-family: system-ui, -apple-system, sans-serif;
              overflow: hidden;
              box-sizing: border-box;
            }
            
            /* Override min-h-screen class specifically for widget path */
            main.min-h-screen { 
              min-height: 0 !important; 
              height: auto !important; 
              max-height: 100% !important; 
              padding: 0 !important; 
              margin: 0 !important; 
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
            
            /* Removed * selector global resets, keeping only essential resets */
            #ts-root {
              overflow: hidden;
              display: block;
              margin: 0;
              padding: 0;
              position: relative;
              vertical-align: top;
              border: none;
              outline: none;
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
          `,
          }}
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "transparent", overflow: "hidden" }}>{children}</body>
    </html>
  )
}
