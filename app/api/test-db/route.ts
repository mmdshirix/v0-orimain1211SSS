import { NextResponse } from "next/server"
import { sqlUnsafe, testDatabaseConnection } from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    console.log("Testing MySQL database connection...")

    // Test basic connection
    const connectionTest = await testDatabaseConnection()
    if (!connectionTest.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Database connection failed",
          details: connectionTest.message,
        },
        { status: 500 },
      )
    }

    // Test basic query
    const testQuery = await sqlUnsafe("SELECT 1 as test, NOW() as current_time")

    // Test if chatbots table exists
    let tableExists = false
    try {
      await sqlUnsafe("SELECT COUNT(*) as count FROM chatbots LIMIT 1")
      tableExists = true
    } catch (e) {
      tableExists = false
    }

    return NextResponse.json({
      ok: true,
      message: "MySQL connection successful",
      connection: connectionTest.message,
      testQuery: testQuery[0],
      chatbotsTableExists: tableExists,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("Database test error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: "Database test failed",
        details: String(error?.message || error),
      },
      { status: 500 },
    )
  }
}
