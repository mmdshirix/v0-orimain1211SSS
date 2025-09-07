import { NextResponse } from "next/server"

export async function GET() {
  const scriptContent = `
(function() {
    const sessionKey = 'TalkSellWidgetLoaded-' + Date.now();
    if (window.TalkSellWidgetLoaded) {
        console.log('🤖 [TalkSell Widget] ⚠️ Widget already loaded, skipping...');
        return;
    }
    window.TalkSellWidgetLoaded = true;

    console.log('🤖 [TalkSell Widget] 🎉 TalkSell Widget script loaded successfully');

    // پیدا کردن اسکریپت تگ فعلی
    const currentScript = document.currentScript || document.querySelector('script[src*="widget-loader.js"]');
    if (!currentScript) {
        console.error('🤖 [TalkSell Widget] ❌ Could not find script tag');
        return;
    }

    console.log('🤖 [TalkSell Widget] 🔍 Reading configuration from script attributes...');

    // خواندن تنظیمات از data attributes
    const chatbotId = currentScript.getAttribute('data-chatbot-id');
    const position = currentScript.getAttribute('data-position') || 'bottom-right';
    const primaryColor = currentScript.getAttribute('data-primary-color') || '#0D9488';
    const marginX = parseInt(currentScript.getAttribute('data-margin-x') || '20');
    const marginY = parseInt(currentScript.getAttribute('data-margin-y') || '20');
    const autoOpen = currentScript.getAttribute('data-auto-open') === 'true';
    const welcomeDelay = parseInt(currentScript.getAttribute('data-welcome-delay') || '3000');

    if (!chatbotId) {
        console.error('🤖 [TalkSell Widget] ❌ data-chatbot-id is required');
        return;
    }

    console.log(\`🤖 [TalkSell Widget] 📋 Configuration loaded:\`, {
        chatbotId,
        position,
        primaryColor,
        marginX: marginX + 'px',
        marginY: marginY + 'px',
        autoOpen,
        welcomeDelay: welcomeDelay + 'ms'
    });

    const BASE_URL = new URL(currentScript.src).origin;

    // ایجاد کانتینر اصلی
    const container = document.createElement('div');
    container.id = 'talksell-widget-container';
    container.style.cssText = \`
        position: fixed;
        z-index: 999999;
        width: auto;
        height: auto;
        pointer-events: none;
    \`;

    // دکمه لانچر
    const launcherButton = document.createElement('div');
    launcherButton.id = 'talksell-launcher-button';
    launcherButton.style.cssText = \`
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: \${primaryColor};
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
        pointer-events: auto;
        position: relative;
        z-index: 2;
        user-select: none;
    \`;
    launcherButton.innerHTML = '💬';

    const widgetFrame = document.createElement('iframe');
    widgetFrame.id = 'talksell-widget-iframe';
    widgetFrame.src = \`\${BASE_URL}/widget/\${chatbotId}\`;
    widgetFrame.style.cssText = \`
        border: none !important;
        width: 400px !important;
        max-width: calc(100vw - 40px) !important;
        height: 640px !important;
        max-height: 640px !important;
        min-height: 640px !important;
        border-radius: 16px !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2) !important;
        position: absolute !important;
        opacity: 0 !important;
        transition: opacity 0.3s ease !important;
        pointer-events: none !important;
        display: none !important;
        z-index: 1 !important;
        background: white !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        line-height: 1 !important;
        vertical-align: top !important;
        box-sizing: border-box !important;
        border-spacing: 0 !important;
        border-collapse: separate !important;
        top: auto !important;
        left: auto !important;
        right: auto !important;
        bottom: auto !important;
    \`;

    console.log(\`🤖 [TalkSell Widget] 📐 Applying position: \${position} with margins X:\${marginX}px, Y:\${marginY}px\`);

    // اعمال موقعیت با فاصله‌های سفارشی
    function applyPosition() {
        // پاک کردن موقعیت‌های قبلی
        container.style.bottom = 'auto';
        container.style.top = 'auto';
        container.style.left = 'auto';
        container.style.right = 'auto';

        // تنظیم موقعیت کانتینر بر اساس position و margin ها
        if (position.includes('bottom')) {
            container.style.bottom = marginY + 'px';
            widgetFrame.style.bottom = '80px';
        }
        if (position.includes('top')) {
            container.style.top = marginY + 'px';
            widgetFrame.style.top = '80px';
        }
        if (position.includes('right')) {
            container.style.right = marginX + 'px';
            widgetFrame.style.right = '0px';
        }
        if (position.includes('left')) {
            container.style.left = marginX + 'px';
            widgetFrame.style.left = '0px';
        }

        console.log(\`🤖 [TalkSell Widget] ✅ Position applied successfully - Container positioned at \${position} with X:\${marginX}px, Y:\${marginY}px\`);
    }

    applyPosition();

    // اضافه کردن عناصر به DOM
    container.appendChild(widgetFrame);
    container.appendChild(launcherButton);
    document.body.appendChild(container);

    console.log('🤖 [TalkSell Widget] 🏗️ Widget elements created and added to DOM');

    let isOpen = false;

    // تابع تغییر وضعیت
    function toggleWidget() {
        isOpen = !isOpen;
        console.log(\`🤖 [TalkSell Widget] 🔄 Toggle widget to: \${isOpen ? 'OPEN' : 'CLOSED'}\`);
        
        if (isOpen) {
            widgetFrame.style.display = 'block';
            setTimeout(() => {
                widgetFrame.style.opacity = '1';
                widgetFrame.style.pointerEvents = 'auto';
                launcherButton.innerHTML = '✕';
            }, 10);
        } else {
            widgetFrame.style.opacity = '0';
            widgetFrame.style.pointerEvents = 'none';
            launcherButton.innerHTML = '💬';
            setTimeout(() => {
                if (!isOpen) widgetFrame.style.display = 'none';
            }, 300);
        }
    }

    // رویدادها
    launcherButton.addEventListener('click', toggleWidget);
    
    launcherButton.addEventListener('mouseenter', () => {
        launcherButton.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
    });
    
    launcherButton.addEventListener('mouseleave', () => {
        launcherButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });

    window.addEventListener('message', (event) => {
        if (event.source !== widgetFrame.contentWindow) return;
        
        if (event.data.type === 'CLOSE_CHATBOT' || event.data.type === 'orion-chatbot-close') {
            if (isOpen) toggleWidget();
        } else if (event.data.type === 'orion-chatbot-toggle') {
            toggleWidget();
        }
    });

    function updateIframeSize() {
        const isMobile = window.innerWidth <= 480;
        if (isMobile) {
            widgetFrame.style.width = '100vw !important';
            widgetFrame.style.height = '100vh !important';
            widgetFrame.style.maxWidth = '100vw !important';
            widgetFrame.style.maxHeight = '100vh !important';
            widgetFrame.style.minHeight = '100vh !important';
            widgetFrame.style.borderRadius = '0px !important';
            widgetFrame.style.left = '0 !important';
            widgetFrame.style.right = '0 !important';
            widgetFrame.style.top = '0 !important';
            widgetFrame.style.bottom = '0 !important';
            widgetFrame.style.position = 'fixed !important';
        } else {
            widgetFrame.style.width = '400px !important';
            widgetFrame.style.height = '640px !important';
            widgetFrame.style.maxWidth = 'calc(100vw - 40px) !important';
            widgetFrame.style.maxHeight = '640px !important';
            widgetFrame.style.minHeight = '640px !important';
            widgetFrame.style.borderRadius = '16px !important';
            widgetFrame.style.position = 'absolute !important';
            // Reapply positioning for desktop
            applyPosition();
        }
    }

    // Initial size update
    updateIframeSize();

    // Update size on window resize
    window.addEventListener('resize', updateIframeSize);

    // باز کردن خودکار
    if (autoOpen) {
        console.log(\`🤖 [TalkSell Widget] ⏰ Auto-open scheduled for \${welcomeDelay}ms\`);
        setTimeout(() => {
            if (!isOpen) {
                console.log('🤖 [TalkSell Widget] 🚀 Auto-opening widget');
                toggleWidget();
            }
        }, welcomeDelay);
    }

    console.log('🤖 [TalkSell Widget] ✅ Widget initialization completed successfully');

})();
  `

  return new NextResponse(scriptContent, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  })
}
