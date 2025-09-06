import { NextResponse } from "next/server"
import { sqlUnsafe } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST() {
  try {
    console.log("API: Initializing MySQL database...")

    const statements = [
      `CREATE TABLE IF NOT EXISTS chatbots (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        primary_color VARCHAR(50) DEFAULT '#14b8a6',
        text_color VARCHAR(50) DEFAULT '#ffffff',
        background_color VARCHAR(50) DEFAULT '#f3f4f6',
        chat_icon VARCHAR(16) DEFAULT '💬',
        position VARCHAR(50) DEFAULT 'bottom-right',
        margin_x INT DEFAULT 20,
        margin_y INT DEFAULT 20,
        deepseek_api_key TEXT,
        welcome_message VARCHAR(600) DEFAULT 'سلام! چطور می‌توانم به شما کمک کنم؟',
        navigation_message VARCHAR(600) DEFAULT 'چه چیزی شما را به اینجا آورده است؟',
        knowledge_base_text TEXT,
        knowledge_base_url VARCHAR(2048),
        store_url VARCHAR(2048),
        ai_url VARCHAR(2048),
        stats_multiplier DECIMAL(5,2) DEFAULT 1.00
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS chatbot_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chatbot_id INT NOT NULL,
        user_message TEXT NOT NULL,
        bot_response TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_ip VARCHAR(50),
        user_agent TEXT,
        FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE,
        INDEX idx_chatbot_timestamp (chatbot_id, timestamp),
        INDEX idx_user_ip (user_ip)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS chatbot_faqs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chatbot_id INT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT,
        emoji VARCHAR(16) DEFAULT '❓',
        position INT DEFAULT 0,
        FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE,
        INDEX idx_chatbot_position (chatbot_id, position)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS chatbot_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chatbot_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        price DECIMAL(10,2),
        position INT DEFAULT 0,
        button_text VARCHAR(100) DEFAULT 'خرید',
        secondary_text VARCHAR(100) DEFAULT 'جزئیات',
        product_url TEXT,
        FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE,
        INDEX idx_chatbot_position (chatbot_id, position)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS chatbot_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chatbot_id INT NOT NULL,
        label VARCHAR(255) NOT NULL,
        emoji VARCHAR(16),
        position INT NOT NULL DEFAULT 0,
        FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE,
        INDEX idx_chatbot_position (chatbot_id, position)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chatbot_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        user_ip VARCHAR(50),
        user_agent TEXT,
        subject VARCHAR(500) NOT NULL,
        message TEXT NOT NULL,
        image_url TEXT,
        status VARCHAR(50) DEFAULT 'open',
        priority VARCHAR(50) DEFAULT 'normal',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE,
        INDEX idx_chatbot_status (chatbot_id, status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS ticket_responses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ticket_id INT NOT NULL,
        message TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
        INDEX idx_ticket_created (ticket_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS chatbot_admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        chatbot_id INT NOT NULL,
        username VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        email VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (chatbot_id) REFERENCES chatbots(id) ON DELETE CASCADE,
        INDEX idx_chatbot_username (chatbot_id, username),
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

      `CREATE TABLE IF NOT EXISTS chatbot_admin_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES chatbot_admin_users(id) ON DELETE CASCADE,
        INDEX idx_session_token (session_token),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ]

    for (const stmt of statements) {
      await sqlUnsafe(stmt)
    }

    await sqlUnsafe(
      `INSERT IGNORE INTO chatbots (name, welcome_message, navigation_message)
       VALUES ('نمونه چت‌بات', 'سلام! به چت‌بات نمونه خوش آمدید', 'چطور می‌توانم کمکتان کنم؟')`,
    )

    console.log("API: MySQL database initialized successfully")
    return NextResponse.json({ ok: true, message: "دیتابیس MySQL با موفقیت راه‌اندازی شد" }, { status: 200 })
  } catch (e: any) {
    console.error("API: Database initialization error:", e)
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST to initialize database" })
}
