import { sql } from "@/lib/db"

export interface AdminUser {
  id: number
  chatbot_id: number
  username: string
  full_name: string | null
  email: string | null
  is_active: boolean
  last_login: string | null
}

// Simple hash function (for development - use bcrypt in production)
function simpleHash(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString()
}

// Generate secure session token
function generateSessionToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Create admin user
export async function createAdminUser(data: {
  chatbot_id: number
  username: string
  password: string
  full_name?: string
  email?: string
}): Promise<AdminUser> {
  if (!sql) throw new Error("Database not available")

  const passwordHash = simpleHash(data.password)

  try {
    await sql`
      INSERT INTO chatbot_admin_users (chatbot_id, username, password_hash, full_name, email)
      VALUES (${data.chatbot_id}, ${data.username}, ${passwordHash}, ${data.full_name || null}, ${data.email || null})
    `

    const result = await sql`
      SELECT id, chatbot_id, username, full_name, email, is_active, last_login
      FROM chatbot_admin_users WHERE id = LAST_INSERT_ID()
    `

    return result[0] as AdminUser
  } catch (error) {
    console.error("Error creating admin user:", error)
    throw new Error("Failed to create admin user")
  }
}

// Authenticate admin user
export async function authenticateAdmin(
  chatbotId: number,
  username: string,
  password: string,
): Promise<AdminUser | null> {
  if (!sql) throw new Error("Database not available")

  try {
    const result = await sql`
      SELECT id, chatbot_id, username, password_hash, full_name, email, is_active, last_login
      FROM chatbot_admin_users 
      WHERE chatbot_id = ${chatbotId} AND username = ${username} AND is_active = true
    `

    if (result.length === 0) return null

    const user = result[0]
    const passwordHash = simpleHash(password)

    if (passwordHash !== user.password_hash) return null

    // Update last login
    await sql`
      UPDATE chatbot_admin_users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = ${user.id}
    `

    return {
      id: user.id,
      chatbot_id: user.chatbot_id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      is_active: user.is_active,
      last_login: new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error authenticating admin:", error)
    return null
  }
}

// Get admin users for chatbot
export async function getAdminUsers(chatbotId: number): Promise<AdminUser[]> {
  if (!sql) return []

  try {
    const result = await sql`
      SELECT id, chatbot_id, username, full_name, email, is_active, last_login
      FROM chatbot_admin_users 
      WHERE chatbot_id = ${chatbotId}
      ORDER BY created_at DESC
    `

    return result as AdminUser[]
  } catch (error) {
    console.error("Error fetching admin users:", error)
    return []
  }
}

// Update admin user
export async function updateAdminUser(
  id: number,
  data: Partial<{
    username: string
    password: string
    full_name: string
    email: string
    is_active: boolean
  }>,
): Promise<boolean> {
  if (!sql) return false

  try {
    const updates: string[] = []
    const values: any[] = []

    if (data.username) {
      updates.push(`username = ?`)
      values.push(data.username)
    }

    if (data.password) {
      const passwordHash = simpleHash(data.password)
      updates.push(`password_hash = ?`)
      values.push(passwordHash)
    }

    if (data.full_name !== undefined) {
      updates.push(`full_name = ?`)
      values.push(data.full_name)
    }

    if (data.email !== undefined) {
      updates.push(`email = ?`)
      values.push(data.email)
    }

    if (data.is_active !== undefined) {
      updates.push(`is_active = ?`)
      values.push(data.is_active)
    }

    if (updates.length === 0) return false

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(id)

    const query = `UPDATE chatbot_admin_users SET ${updates.join(", ")} WHERE id = ?`

    await sql.unsafe(query, values)
    return true
  } catch (error) {
    console.error("Error updating admin user:", error)
    return false
  }
}

// Delete admin user
export async function deleteAdminUser(id: number): Promise<boolean> {
  if (!sql) return false

  try {
    await sql`DELETE FROM chatbot_admin_users WHERE id = ${id}`
    return true
  } catch (error) {
    console.error("Error deleting admin user:", error)
    return false
  }
}

// Create session
export async function createSession(userId: number): Promise<string> {
  if (!sql) throw new Error("Database not available")

  const sessionToken = generateSessionToken()
  try {
    await sql`
      INSERT INTO chatbot_admin_sessions (user_id, session_token, expires_at)
      VALUES (${userId}, ${sessionToken}, DATE_ADD(NOW(), INTERVAL 7 DAY))
    `
    return sessionToken
  } catch (error) {
    console.error("Error creating session:", error)
    throw new Error("Failed to create session")
  }
}

// Verify session
export async function verifySession(sessionToken: string): Promise<AdminUser | null> {
  if (!sql) throw new Error("Database not available")

  try {
    const result = await sql`
      SELECT u.id, u.chatbot_id, u.username, u.full_name, u.email, u.is_active, u.last_login
      FROM chatbot_admin_sessions s
      JOIN chatbot_admin_users u ON s.user_id = u.id
      WHERE s.session_token = ${sessionToken} 
        AND s.expires_at > CURRENT_TIMESTAMP 
        AND u.is_active = true
    `

    return result.length > 0 ? (result[0] as AdminUser) : null
  } catch (error) {
    console.error("Error verifying session:", error)
    return null
  }
}

// Get current admin user (for server-side usage)
export async function getCurrentAdminUser(sessionToken?: string): Promise<AdminUser | null> {
  if (!sessionToken) return null
  return verifySession(sessionToken)
}

// Logout admin
export async function logoutAdmin(sessionToken: string): Promise<void> {
  if (!sql) return

  try {
    await sql`DELETE FROM chatbot_admin_sessions WHERE session_token = ${sessionToken}`
  } catch (error) {
    console.error("Error logging out admin:", error)
  }
}
