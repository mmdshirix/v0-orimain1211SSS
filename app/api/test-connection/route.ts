import { NextResponse } from "next/server"
import { testDatabaseConnection, initializeDatabase } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("[v0] Testing database connection...")

    // Test connection
    const connectionTest = await testDatabaseConnection()
    console.log("[v0] Connection test result:", connectionTest)

    if (!connectionTest.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Database connection failed",
          error: connectionTest.message,
        },
        { status: 500 },
      )
    }

    // Initialize database if needed
    console.log("[v0] Initializing database...")
    const initResult = await initializeDatabase()
    console.log("[v0] Database initialization result:", initResult)

    return NextResponse.json({
      success: true,
      connection: connectionTest,
      initialization: initResult,
    })
  } catch (error: any) {
    console.error("[v0] Test connection error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || String(error),
      },
      { status: 500 },
    )
  }
}
