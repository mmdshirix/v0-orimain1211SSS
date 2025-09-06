import mysql from "mysql2/promise"

let _pool: mysql.Pool | null = null

export function getPool() {
  if (_pool) return _pool

  const url = process.env.DATABASE_URL

  if (url) {
    // Note: mysql2 supports "uri" in createPool (as any for TS)
    _pool = mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: 10,
      charset: "utf8mb4_general_ci",
      multipleStatements: true,
    } as any)
  } else {
    const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env
    _pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME, // Very important
      port: Number(DB_PORT || 3306),
      waitForConnections: true,
      connectionLimit: 10,
      charset: "utf8mb4_general_ci",
      multipleStatements: true,
    })
  }

  return _pool
}

// Safe tagged template with "?" placeholders
export async function sql(strings: TemplateStringsArray, ...values: any[]) {
  const pool = getPool()
  let query = ""
  const params: any[] = []
  for (let i = 0; i < strings.length; i++) {
    query += strings[i]
    if (i < values.length) {
      query += "?"
      params.push(values[i])
    }
  }
  const [rows] = await pool.execute(query, params)
  return rows as any[]
}

// Raw query execution with params
export async function sqlUnsafe(query: string, params: any[] = []) {
  const pool = getPool()
  const [rows] = await pool.execute(query, params)
  return rows as any[]
}

export const query = sqlUnsafe

// --- TYPE DEFINITIONS ---
export interface Chatbot {
  id: number
  name: string
  created_at: string
  updated_at: string
  primary_color: string
  text_color: string
  background_color: string
  chat_icon: string
  position: string
  margin_x: number
  margin_y: number
  deepseek_api_key: string | null
  welcome_message: string
  navigation_message: string
  knowledge_base_text: string | null
  knowledge_base_url: string | null
  store_url: string | null
  ai_url: string | null
  stats_multiplier: number
}

export interface ChatbotMessage {
  id: number
  chatbot_id: number
  user_message: string
  bot_response: string | null
  timestamp: string
  user_ip: string | null
  user_agent: string | null
}

export interface ChatbotFAQ {
  id: number
  chatbot_id: number
  question: string
  answer: string | null
  emoji: string | null
  position: number
}

export interface ChatbotProduct {
  id: number
  chatbot_id: number
  name: string
  description: string | null
  image_url: string | null
  price: number | null
  position: number
  button_text: string
  secondary_text: string
  product_url: string | null
}

export interface ChatbotOption {
  id: number
  chatbot_id: number
  label: string
  emoji: string | null
  position: number
}

export interface Ticket {
  id: number
  chatbot_id: number
  name: string
  email: string
  phone: string | null
  user_ip: string | null
  user_agent: string | null
  subject: string
  message: string
  image_url: string | null
  status: "open" | "closed" | "pending" | "in_progress" | "resolved"
  priority: "low" | "normal" | "high"
  created_at: string
  updated_at: string
}

export interface TicketResponse {
  id: number
  ticket_id: number
  message: string
  is_admin: boolean
  created_at: string
}

export interface AdminUser {
  id: number
  chatbot_id: number
  username: string
  password_hash: string
  full_name: string | null
  email: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

interface SaveMessagePayload {
  chatbot_id: number
  user_message: string
  bot_response?: string | null
  user_ip?: string | null
  user_agent?: string | null
}

// --- DATABASE FUNCTIONS ---

export async function testDatabaseConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const result = await sql`SELECT 1 as test`
    return { success: true, message: "اتصال به دیتابیس MySQL موفق" }
  } catch (error) {
    console.error("Database connection error:", error)
    return { success: false, message: `خطا در اتصال: ${error}` }
  }
}

export async function initializeDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    console.log("Initializing MySQL database tables...")

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

    // Optional sample data
    await sqlUnsafe(
      `INSERT IGNORE INTO chatbots (name, welcome_message, navigation_message)
       VALUES ('نمونه چت‌بات', 'سلام! به چت‌بات نمونه خوش آمدید', 'چطور می‌توانم کمکتان کنم؟')`,
    )

    console.log("MySQL database tables initialized successfully")
    return { success: true, message: "دیتابیس MySQL با موفقیت راه‌اندازی شد" }
  } catch (error) {
    console.error("MySQL database initialization error:", error)
    return { success: false, message: `خطا در راه‌اندازی دیتابیس MySQL: ${error}` }
  }
}

// Chatbot Functions
export async function getAllChatbots(): Promise<Chatbot[]> {
  try {
    const result = await sql`SELECT * FROM chatbots ORDER BY created_at DESC`
    return result as unknown as Chatbot[]
  } catch (error) {
    console.error("Error fetching chatbots:", error)
    return []
  }
}

export async function getChatbots(): Promise<Chatbot[]> {
  try {
    const result = await sql`
      SELECT 
        id, 
        name, 
        created_at, 
        updated_at,
        primary_color,
        text_color,
        background_color,
        chat_icon,
        position,
        margin_x,
        margin_y,
        welcome_message,
        navigation_message,
        knowledge_base_text,
        knowledge_base_url,
        store_url,
        ai_url,
        deepseek_api_key,
        COALESCE(stats_multiplier, 1.0) as stats_multiplier
      FROM chatbots 
      ORDER BY created_at DESC
    `
    return result as unknown as Chatbot[]
  } catch (error: any) {
    // Auto-fix if columns are missing, then retry once
    if (error?.message?.includes("column") && error?.message?.includes("doesn't exist")) {
      console.warn("One or more columns missing – running auto-fix script…")
      try {
        // Check and add stats_multiplier column
        await sqlUnsafe(`SELECT stats_multiplier FROM chatbots LIMIT 1`).catch(async () => {
          await sqlUnsafe(`ALTER TABLE chatbots ADD COLUMN stats_multiplier DECIMAL(5,2) DEFAULT 1.0`)
        })

        // Check and add margin_x column
        await sqlUnsafe(`SELECT margin_x FROM chatbots LIMIT 1`).catch(async () => {
          await sqlUnsafe(`ALTER TABLE chatbots ADD COLUMN margin_x INT DEFAULT 20`)
        })

        // Check and add margin_y column
        await sqlUnsafe(`SELECT margin_y FROM chatbots LIMIT 1`).catch(async () => {
          await sqlUnsafe(`ALTER TABLE chatbots ADD COLUMN margin_y INT DEFAULT 20`)
        })

        console.log("Auto-fix completed, retrying getChatbots...")
        return getChatbots() // Retry the function
      } catch (fixError) {
        console.error("Auto-fix failed:", fixError)
        throw new Error(`Failed to fix missing columns: ${fixError}`)
      }
    }
    console.error("Error fetching chatbots from MySQL:", error)
    throw new Error(`Failed to fetch chatbots: ${error}`)
  }
}

export async function getChatbot(id: number): Promise<Chatbot | null> {
  try {
    const result =
      await sql`SELECT *, COALESCE(stats_multiplier, 1.0) as stats_multiplier FROM chatbots WHERE id = ${id}`
    return result.length > 0 ? (result[0] as unknown as Chatbot) : null
  } catch (error) {
    console.error(`Error fetching chatbot ${id}:`, error)
    return null
  }
}

export async function updateChatbot(id: number, data: Partial<Chatbot>): Promise<Chatbot | null> {
  try {
    await sql`
      UPDATE chatbots
      SET
        name = COALESCE(${data.name}, name),
        primary_color = COALESCE(${data.primary_color}, primary_color),
        text_color = COALESCE(${data.text_color}, text_color),
        background_color = COALESCE(${data.background_color}, background_color),
        chat_icon = COALESCE(${data.chat_icon}, chat_icon),
        position = COALESCE(${data.position}, position),
        margin_x = COALESCE(${data.margin_x}, margin_x),
        margin_y = COALESCE(${data.margin_y}, margin_y),
        welcome_message = COALESCE(${data.welcome_message}, welcome_message),
        navigation_message = COALESCE(${data.navigation_message}, navigation_message),
        knowledge_base_text = COALESCE(${data.knowledge_base_text}, knowledge_base_text),
        knowledge_base_url = COALESCE(${data.knowledge_base_url}, knowledge_base_url),
        store_url = COALESCE(${data.store_url}, store_url),
        ai_url = COALESCE(${data.ai_url}, ai_url),
        stats_multiplier = COALESCE(${data.stats_multiplier}, stats_multiplier),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `
    const result = await sql`SELECT * FROM chatbots WHERE id = ${id}`
    return result.length > 0 ? (result[0] as unknown as Chatbot) : null
  } catch (error) {
    console.error(`Error updating chatbot ${id}:`, error)
    return null
  }
}

export async function deleteChatbot(id: number): Promise<boolean> {
  try {
    await sql`DELETE FROM chatbots WHERE id = ${id}`
    return true
  } catch (error) {
    console.error(`Error deleting chatbot ${id} from MySQL:`, error)
    return false
  }
}

export async function createChatbot(data: {
  name: string
  welcome_message?: string
  navigation_message?: string
  primary_color?: string
  text_color?: string
  background_color?: string
  chat_icon?: string
  position?: string
  margin_x?: number
  margin_y?: number
  deepseek_api_key?: string
  knowledge_base_text?: string
  knowledge_base_url?: string
  store_url?: string
  ai_url?: string
  stats_multiplier?: number
}): Promise<Chatbot> {
  try {
    if (!data.name || data.name.trim() === "") {
      throw new Error("نام چت‌بات الزامی است")
    }

    await sqlUnsafe(
      `INSERT INTO chatbots (
        name, welcome_message, navigation_message, primary_color, text_color, background_color, 
        chat_icon, position, margin_x, margin_y, deepseek_api_key, knowledge_base_text, 
        knowledge_base_url, store_url, ai_url, stats_multiplier, created_at, updated_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
      [
        data.name.trim(),
        data.welcome_message || "سلام! چطور می‌توانم به شما کمک کنم؟",
        data.navigation_message || "چه چیزی شما را به اینجا آورده است؟",
        data.primary_color || "#14b8a6",
        data.text_color || "#ffffff",
        data.background_color || "#f3f4f6",
        data.chat_icon || "💬",
        data.position || "bottom-right",
        data.margin_x || 20,
        data.margin_y || 20,
        data.deepseek_api_key || null,
        data.knowledge_base_text || null,
        data.knowledge_base_url || null,
        data.store_url || null,
        data.ai_url || null,
        data.stats_multiplier || 1.0,
      ],
    )

    const result = await sqlUnsafe(`SELECT * FROM chatbots WHERE id = LAST_INSERT_ID()`)
    return result[0] as unknown as Chatbot
  } catch (error) {
    console.error("Error creating chatbot in MySQL:", error)
    throw new Error(`Failed to create chatbot: ${error}`)
  }
}

// Message Functions
export async function getChatbotMessages(chatbotId: number): Promise<ChatbotMessage[]> {
  try {
    const result = await sql`
      SELECT * FROM chatbot_messages WHERE chatbot_id = ${chatbotId} ORDER BY timestamp DESC LIMIT 100
    `
    return result as unknown as ChatbotMessage[]
  } catch (error) {
    console.error("Error fetching messages from MySQL:", error)
    return []
  }
}

export async function saveMessage(payload: SaveMessagePayload) {
  const { chatbot_id, user_message, bot_response, user_ip, user_agent } = payload
  try {
    const pool = getPool()
    const result = await pool.execute(
      `INSERT INTO chatbot_messages (chatbot_id, user_message, bot_response, user_ip, user_agent, timestamp)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [chatbot_id, user_message, bot_response || null, user_ip || null, user_agent || null],
    )
    return (result[0] as any).insertId
  } catch (error) {
    console.error("Error saving message:", error)
    throw error
  }
}

export const createMessage = saveMessage

// FAQ Functions
export async function getFAQsByChatbotId(chatbotId: number): Promise<ChatbotFAQ[]> {
  try {
    const faqs = await sql`SELECT * FROM chatbot_faqs WHERE chatbot_id = ${chatbotId} ORDER BY id ASC`
    return faqs
  } catch (error) {
    console.error("Error fetching FAQs by chatbot ID:", error)
    throw error
  }
}

export async function syncChatbotFAQs(chatbotId: number, faqs: any[]): Promise<ChatbotFAQ[]> {
  try {
    // Delete existing FAQs
    await sql`DELETE FROM chatbot_faqs WHERE chatbot_id = ${chatbotId}`

    const savedFAQs: ChatbotFAQ[] = []

    // Insert new FAQs
    for (let i = 0; i < faqs.length; i++) {
      const faq = faqs[i]
      await sql`
        INSERT INTO chatbot_faqs (chatbot_id, question, answer, emoji, position)
        VALUES (${chatbotId}, ${faq.question}, ${faq.answer}, ${faq.emoji || "❓"}, ${i})
      `
      const result = await sql`SELECT * FROM chatbot_faqs WHERE id = LAST_INSERT_ID()`
      if (result[0]) {
        savedFAQs.push(result[0] as unknown as ChatbotFAQ)
      }
    }

    return savedFAQs
  } catch (error) {
    console.error("Error syncing chatbot FAQs:", error)
    throw error
  }
}

// Product Functions
export async function getProductsByChatbotId(chatbotId: number): Promise<ChatbotProduct[]> {
  try {
    const products = await sql`SELECT * FROM chatbot_products WHERE chatbot_id = ${chatbotId} ORDER BY id ASC`
    return products
  } catch (error) {
    console.error("Error fetching products by chatbot ID:", error)
    throw error
  }
}

export async function syncChatbotProducts(chatbotId: number, products: any[]): Promise<ChatbotProduct[]> {
  try {
    // Delete existing products
    await sql`DELETE FROM chatbot_products WHERE chatbot_id = ${chatbotId}`

    const savedProducts: ChatbotProduct[] = []

    // Insert new products
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      await sql`
        INSERT INTO chatbot_products (
          chatbot_id, name, description, price, image_url, 
          button_text, secondary_text, product_url, position
        )
        VALUES (
          ${chatbotId}, ${product.name}, ${product.description || null}, 
          ${product.price || null}, ${product.image_url || null}, ${product.button_text || "خرید"}, 
          ${product.secondary_text || "جزئیات"}, ${product.product_url || null}, ${i}
        )
      `
      const result = await sql`SELECT * FROM chatbot_products WHERE id = LAST_INSERT_ID()`
      if (result[0]) {
        savedProducts.push(result[0] as unknown as ChatbotProduct)
      }
    }

    return savedProducts
  } catch (error) {
    console.error("Error syncing chatbot products:", error)
    throw error
  }
}

// Option Functions
export async function getChatbotOptions(chatbotId: number): Promise<ChatbotOption[]> {
  try {
    const result = await sql`
      SELECT * FROM chatbot_options WHERE chatbot_id = ${chatbotId} ORDER BY position ASC
    `
    return result as unknown as ChatbotOption[]
  } catch (error) {
    console.error("Error fetching options from MySQL:", error)
    return []
  }
}

export async function createChatbotOption(option: Omit<ChatbotOption, "id">): Promise<ChatbotOption> {
  await sql`INSERT INTO chatbot_options (chatbot_id, label, emoji, position) VALUES (${option.chatbot_id}, ${option.label}, ${option.emoji}, ${option.position})`
  const result = await sql`SELECT * FROM chatbot_options WHERE id = LAST_INSERT_ID()`
  return result[0] as unknown as ChatbotOption
}

export async function deleteChatbotOption(id: number): Promise<boolean> {
  await sql`DELETE FROM chatbot_options WHERE id = ${id}`
  return true
}

// Ticket Functions
export async function createTicket(ticket: Omit<Ticket, "id" | "created_at" | "updated_at">): Promise<Ticket> {
  try {
    await sql`
      INSERT INTO tickets (
        chatbot_id, name, email, phone, subject, message, 
        image_url, status, priority, user_ip, user_agent, created_at, updated_at
      )
      VALUES (
        ${ticket.chatbot_id}, ${ticket.name}, ${ticket.email}, ${ticket.phone}, 
        ${ticket.subject}, ${ticket.message}, ${ticket.image_url}, ${ticket.status}, 
        ${ticket.priority}, ${ticket.user_ip}, ${ticket.user_agent}, NOW(), NOW()
      )
    `
    const result = await sql`SELECT * FROM tickets WHERE id = LAST_INSERT_ID()`
    return result[0] as unknown as Ticket
  } catch (error) {
    console.error("Error creating ticket:", error)
    throw error
  }
}

export async function getTicketById(ticketId: number): Promise<Ticket | null> {
  try {
    const result = await sql`
      SELECT * FROM tickets WHERE id = ${ticketId}
    `
    return result[0] || null
  } catch (error) {
    console.error("Error getting ticket:", error)
    throw error
  }
}

export async function getChatbotTickets(chatbotId: number): Promise<Ticket[]> {
  try {
    const result = await sql`
      SELECT * FROM tickets WHERE chatbot_id = ${chatbotId} ORDER BY created_at DESC
    `
    return result as unknown as Ticket[]
  } catch (error) {
    console.error("Error fetching tickets from MySQL:", error)
    return []
  }
}

export async function updateTicketStatus(ticketId: number, status: string): Promise<void> {
  try {
    await sql`
      UPDATE tickets 
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${ticketId}
    `
  } catch (error) {
    console.error("Error updating ticket status:", error)
    throw error
  }
}

export async function getTicketResponses(ticketId: number): Promise<TicketResponse[]> {
  try {
    const result = await sql`
      SELECT * FROM ticket_responses WHERE ticket_id = ${ticketId} ORDER BY created_at ASC
    `
    return result as unknown as TicketResponse[]
  } catch (error) {
    console.error("Error fetching ticket responses:", error)
    return []
  }
}

export async function addTicketResponse(ticketId: number, response: string, isAdmin = false): Promise<void> {
  try {
    await sql`
      INSERT INTO ticket_responses (ticket_id, message, is_admin, created_at)
      VALUES (${ticketId}, ${response}, ${isAdmin}, NOW())
    `
  } catch (error) {
    console.error("Error adding ticket response:", error)
    throw error
  }
}

// Analytics Functions - Converting PostgreSQL date functions to MySQL equivalents
export async function getTotalMessageCount(chatbotId: number): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(*) as total
      FROM chatbot_messages 
      WHERE chatbot_id = ${chatbotId}
    `
    return result[0]?.total || 0
  } catch (error) {
    console.error("Error getting total message count:", error)
    return 0
  }
}

export async function getUniqueUsersCount(chatbotId: number): Promise<number> {
  try {
    const result = await sql`
      SELECT COUNT(DISTINCT user_ip) as unique_users
      FROM chatbot_messages 
      WHERE chatbot_id = ${chatbotId}
    `
    return result[0]?.unique_users || 0
  } catch (error) {
    console.error("Error getting unique users count:", error)
    return 0
  }
}

export async function getAverageMessagesPerUser(chatbotId: number): Promise<number> {
  try {
    const result = await sql`
      SELECT 
        ROUND(COUNT(*) * 1.0 / COUNT(DISTINCT user_ip), 2) as avg_messages
      FROM chatbot_messages 
      WHERE chatbot_id = ${chatbotId}
    `
    return result[0]?.avg_messages || 0
  } catch (error) {
    console.error("Error getting average messages per user:", error)
    return 0
  }
}

export async function getMessageCountByDay(chatbotId: number, days = 7): Promise<{ date: string; count: number }[]> {
  try {
    const result = await sql`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM chatbot_messages 
      WHERE chatbot_id = ${chatbotId} 
        AND timestamp >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `
    return result as unknown as { date: string; count: number }[]
  } catch (error) {
    console.error("Error getting message count by day:", error)
    return []
  }
}

export async function getMessageCountByWeek(chatbotId: number, weeks = 4): Promise<{ week: string; count: number }[]> {
  try {
    const result = await sql`
      SELECT 
        DATE(DATE_SUB(timestamp, INTERVAL WEEKDAY(timestamp) DAY)) as week,
        COUNT(*) as count
      FROM chatbot_messages 
      WHERE chatbot_id = ${chatbotId} 
        AND timestamp >= DATE_SUB(NOW(), INTERVAL ${weeks} WEEK)
      GROUP BY DATE(DATE_SUB(timestamp, INTERVAL WEEKDAY(timestamp) DAY))
      ORDER BY week DESC
    `
    return result as unknown as { week: string; count: number }[]
  } catch (error) {
    console.error("Error getting message count by week:", error)
    return []
  }
}

export async function getMessageCountByMonth(
  chatbotId: number,
  months = 6,
): Promise<{ month: string; count: number }[]> {
  try {
    const result = await sql`
      SELECT 
        DATE_FORMAT(timestamp, '%Y-%m-01') as month,
        COUNT(*) as count
      FROM chatbot_messages 
      WHERE chatbot_id = ${chatbotId} 
        AND timestamp >= DATE_SUB(NOW(), INTERVAL ${months} MONTH)
      GROUP BY DATE_FORMAT(timestamp, '%Y-%m-01')
      ORDER BY month DESC
    `
    return result as unknown as { month: string; count: number }[]
  } catch (error) {
    console.error("Error getting message count by month:", error)
    return []
  }
}

export async function getTopUserQuestions(
  chatbotId: number,
  limit = 10,
): Promise<{ question: string; count: number }[]> {
  try {
    const result = await sql`
      SELECT 
        user_message as question,
        COUNT(*) as frequency
      FROM chatbot_messages 
      WHERE chatbot_id = ${chatbotId}
        AND CHAR_LENGTH(user_message) > 5
      GROUP BY user_message
      ORDER BY frequency DESC
      LIMIT ${limit}
    `
    return result as unknown as { question: string; count: number }[]
  } catch (error) {
    console.error("Error getting top user questions:", error)
    return []
  }
}

// Admin User Functions - Removed createAdminUser function to handle in API routes
export async function getChatbotAdminUsers(chatbotId: number): Promise<AdminUser[]> {
  try {
    const result = await sql`
      SELECT id, chatbot_id, username, full_name, email, is_active, last_login, created_at, updated_at
      FROM chatbot_admin_users
      WHERE chatbot_id = ${chatbotId}
      ORDER BY created_at DESC
    `
    return result as unknown as AdminUser[]
  } catch (error) {
    console.error("Error fetching admin users:", error)
    return []
  }
}

export async function updateAdminUser(id: number, updates: Partial<AdminUser>): Promise<AdminUser | null> {
  try {
    await sql`
      UPDATE chatbot_admin_users
      SET
        username = COALESCE(${updates.username}, username),
        password_hash = COALESCE(${updates.password_hash}, password_hash),
        full_name = COALESCE(${updates.full_name}, full_name),
        email = COALESCE(${updates.email}, email),
        is_active = COALESCE(${updates.is_active}, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `
    const result = await sql`
      SELECT id, chatbot_id, username, full_name, email, is_active, last_login, created_at, updated_at
      FROM chatbot_admin_users WHERE id = ${id}
    `
    return result.length > 0 ? (result[0] as unknown as AdminUser) : null
  } catch (error) {
    console.error("Error updating admin user:", error)
    return null
  }
}

export async function deleteAdminUser(id: number): Promise<boolean> {
  try {
    await sql`DELETE FROM chatbot_admin_users WHERE id = ${id}`
    return true
  } catch (error) {
    console.error("Error deleting admin user:", error)
    return false
  }
}

export async function getAdminUserByUsername(chatbotId: number, username: string): Promise<AdminUser | null> {
  try {
    const result = await sql`
      SELECT * FROM chatbot_admin_users
      WHERE chatbot_id = ${chatbotId} AND username = ${username} AND is_active = true
    `
    return result.length > 0 ? (result[0] as unknown as AdminUser) : null
  } catch (error) {
    console.error("Error fetching admin user by username:", error)
    return null
  }
}

export async function updateAdminUserLastLogin(id: number): Promise<void> {
  try {
    await sql`UPDATE chatbot_admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ${id}`
  } catch (error) {
    console.error("Error updating admin user last login:", error)
  }
}

// Stats Multiplier Functions
export async function updateStatsMultiplier(chatbotId: number, multiplier: number): Promise<boolean> {
  try {
    await sql`UPDATE chatbots SET stats_multiplier = ${multiplier} WHERE id = ${chatbotId}`
    return true
  } catch (error) {
    console.error("Error updating stats multiplier:", error)
    return false
  }
}

export async function getStatsMultiplier(chatbotId: number): Promise<number> {
  try {
    const result = await sql`SELECT COALESCE(stats_multiplier, 1.0) as multiplier FROM chatbots WHERE id = ${chatbotId}`
    return result.length > 0 ? Number(result[0].multiplier) : 1.0
  } catch (error) {
    console.error("Error getting stats multiplier:", error)
    return 1.0
  }
}

// Additional Functions
export async function getChatbotById(id: number) {
  try {
    const result = await sql`SELECT * FROM chatbots WHERE id = ${id}`
    return result[0]
  } catch (error) {
    console.error("Error fetching chatbot by ID:", error)
    throw error
  }
}

export const getChatbotFAQs = getFAQsByChatbotId
export const getChatbotProducts = getProductsByChatbotId
