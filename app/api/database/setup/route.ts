import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { databaseUrl } = await request.json()

    if (!databaseUrl || (!databaseUrl.includes("postgres://") && !databaseUrl.includes("mysql://"))) {
      return NextResponse.json(
        { error: "Invalid database URL format. Must be postgres:// or mysql://" },
        { status: 400 },
      )
    }

    try {
      if (databaseUrl.includes("mysql://")) {
        // Set the URL temporarily for testing
        const originalUrl = process.env.DATABASE_URL
        process.env.DATABASE_URL = databaseUrl

        // Test with our existing MySQL connection
        const result = await sql`SELECT 1 as test`

        if (result && Array.isArray(result) && result.length > 0) {
          return NextResponse.json({
            success: true,
            message: "MySQL database connection successful! URL has been set for this session.",
            note: "To make this permanent, add DATABASE_URL to your environment variables in deployment platform.",
          })
        } else {
          // Restore original URL if test failed
          if (originalUrl) process.env.DATABASE_URL = originalUrl
          return NextResponse.json({ error: "MySQL database connection test failed - no response" }, { status: 400 })
        }
      } else {
        return NextResponse.json(
          { error: "PostgreSQL is no longer supported. Please use MySQL database URL." },
          { status: 400 },
        )
      }
    } catch (dbError) {
      console.error("Database connection error:", dbError)
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: dbError instanceof Error ? dbError.message : "Unknown database error",
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Setup error:", error)
    return NextResponse.json(
      {
        error: "Failed to setup database",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    const databaseUrl = process.env.DATABASE_URL

    if (!databaseUrl) {
      return NextResponse.json({
        connected: false,
        error: "No DATABASE_URL found",
        instruction: "Please set DATABASE_URL using the form below",
      })
    }

    try {
      const result = await sql`SELECT 1 as test`

      if (result && Array.isArray(result) && result.length > 0) {
        return NextResponse.json({
          connected: true,
          url: databaseUrl.substring(0, 30) + "...",
          message: "MySQL database connection is working",
        })
      } else {
        return NextResponse.json({
          connected: false,
          error: "MySQL database URL exists but connection test failed",
        })
      }
    } catch (error) {
      return NextResponse.json({
        connected: false,
        error: "Database connection failed",
        details: error instanceof Error ? error.message : "Unknown error",
      })
    }
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: "Failed to check database status",
      details: error instanceof Error ? error.message : "Unknown error",
    })
  }
}
