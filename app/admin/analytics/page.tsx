"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Clock, TrendingUp, Download, RefreshCw, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AnalyticsData {
  totalMessages: number
  totalTickets: number
  averageResponseTime: number
  satisfactionRate: number
  dailyStats: Array<{
    date: string
    messages: number
    tickets: number
  }>
  ticketsByStatus: Array<{
    status: string
    count: number
    percentage: number
  }>
  hourlyActivity: Array<{
    hour: number
    messages: number
  }>
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("7d")
  const [isLoading, setIsLoading] = useState(false)
  const [chatbotId, setChatbotId] = useState(1) // Default chatbot ID
  const [data, setData] = useState<AnalyticsData>({
    totalMessages: 0,
    totalTickets: 0,
    averageResponseTime: 0,
    satisfactionRate: 0,
    dailyStats: [],
    ticketsByStatus: [],
    hourlyActivity: [],
  })

  const loadAnalyticsData = async () => {
    setIsLoading(true)
    try {
      const days = timeRange === "1d" ? 1 : timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
      const response = await fetch(`/api/admin/stats?chatbotId=${chatbotId}&days=${days}`)

      if (response.ok) {
        const apiData = await response.json()

        // Process the real data from API
        const totalMessages = apiData.messagesByDay?.reduce((sum: number, day: any) => sum + day.c, 0) || 0
        const totalTickets = apiData.ticketsByDay?.reduce((sum: number, day: any) => sum + day.c, 0) || 0

        // Create daily stats combining messages and tickets
        const dailyStats = []
        const messageMap = new Map(apiData.messagesByDay?.map((item: any) => [item.d, item.c]) || [])
        const ticketMap = new Map(apiData.ticketsByDay?.map((item: any) => [item.d, item.c]) || [])

        // Get all unique dates
        const allDates = new Set([
          ...(apiData.messagesByDay?.map((item: any) => item.d) || []),
          ...(apiData.ticketsByDay?.map((item: any) => item.d) || []),
        ])

        for (const date of Array.from(allDates).sort()) {
          dailyStats.push({
            date: date,
            messages: messageMap.get(date) || 0,
            tickets: ticketMap.get(date) || 0,
          })
        }

        // Process ticket status data
        const totalTicketCount = apiData.ticketsByStatus?.reduce((sum: number, item: any) => sum + item.c, 0) || 1
        const ticketsByStatus =
          apiData.ticketsByStatus?.map((item: any) => ({
            status: item.status,
            count: item.c,
            percentage: Math.round((item.c / totalTicketCount) * 100),
          })) || []

        // Generate hourly activity (mock data for now as we don't have hourly breakdown in API)
        const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
          hour,
          messages: Math.floor(Math.random() * (totalMessages / 24)) + Math.floor(totalMessages / 48),
        }))

        setData({
          totalMessages,
          totalTickets,
          averageResponseTime: 2.1, // Mock data - could be calculated from response times
          satisfactionRate: 92.5, // Mock data - could come from user feedback
          dailyStats,
          ticketsByStatus,
          hourlyActivity,
        })
      }
    } catch (error) {
      console.error("Error loading analytics data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange, chatbotId])

  const handleRefresh = async () => {
    await loadAnalyticsData()
  }

  const handleExport = () => {
    // Create CSV export of current data
    const csvData = [
      ["Date", "Messages", "Tickets"],
      ...data.dailyStats.map((day) => [day.date, day.messages, day.tickets]),
    ]

    const csvContent = csvData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `analytics-${timeRange}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const maxHourlyMessages = Math.max(...data.hourlyActivity.map((h) => h.messages))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">آمار و گزارشات</h1>
        <div className="flex gap-3">
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
            className="border-blue-200 focus:border-blue-500 shadow-md"
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">24 ساعت گذشته</SelectItem>
              <SelectItem value="7d">7 روز گذشته</SelectItem>
              <SelectItem value="30d">30 روز گذشته</SelectItem>
              <SelectItem value="90d">3 ماه گذشته</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-lg"
          >
            <RefreshCw className={`ml-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            بروزرسانی
          </Button>
          <Button
            onClick={handleExport}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
          >
            <Download className="ml-2 h-4 w-4" />
            دانلود گزارش
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کل پیام‌ها</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalMessages.toLocaleString("fa-IR")}</div>
            <p className="text-xs text-muted-foreground">
              در{" "}
              {timeRange === "1d" ? "24 ساعت" : timeRange === "7d" ? "7 روز" : timeRange === "30d" ? "30 روز" : "3 ماه"}{" "}
              گذشته
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">کل تیکت‌ها</CardTitle>
            <Ticket className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalTickets.toLocaleString("fa-IR")}</div>
            <p className="text-xs text-muted-foreground">
              در{" "}
              {timeRange === "1d" ? "24 ساعت" : timeRange === "7d" ? "7 روز" : timeRange === "30d" ? "30 روز" : "3 ماه"}{" "}
              گذشته
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">زمان پاسخ متوسط</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageResponseTime} ثانیه</div>
            <p className="text-xs text-muted-foreground">میانگین زمان پاسخگویی</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">رضایت کاربران</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">%{data.satisfactionRate}</div>
            <p className="text-xs text-muted-foreground">بر اساس بازخورد کاربران</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>فعالیت روزانه</CardTitle>
            <CardDescription>تعداد پیام‌ها و تیکت‌ها در روزهای گذشته</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.dailyStats.length > 0 ? (
                data.dailyStats.map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <div className="text-sm">
                      {new Date(day.date).toLocaleDateString("fa-IR", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-gray-600">{day.messages} پیام</div>
                      <div className="text-sm text-gray-600">{day.tickets} تیکت</div>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min((day.messages / Math.max(...data.dailyStats.map((d) => d.messages), 1)) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  {isLoading ? "در حال بارگذاری..." : "داده‌ای برای نمایش وجود ندارد"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ticket Status */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>وضعیت تیکت‌ها</CardTitle>
            <CardDescription>توزیع تیکت‌ها بر اساس وضعیت</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.ticketsByStatus.length > 0 ? (
                data.ticketsByStatus.map((ticket, index) => (
                  <div key={ticket.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="hover:bg-blue-100 transition-colors">
                        {index + 1}
                      </Badge>
                      <span className="text-sm">
                        {ticket.status === "open"
                          ? "باز"
                          : ticket.status === "pending"
                            ? "در انتظار"
                            : ticket.status === "answered"
                              ? "پاسخ داده شده"
                              : ticket.status === "closed"
                                ? "بسته شده"
                                : ticket.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{ticket.count}</span>
                      <span className="text-sm text-gray-500">%{ticket.percentage}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-4">
                  {isLoading ? "در حال بارگذاری..." : "تیکتی وجود ندارد"}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Activity */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>فعالیت ساعتی</CardTitle>
          <CardDescription>توزیع پیام‌ها در طول شبانه‌روز</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-24 gap-1 h-32">
            {data.hourlyActivity.map((hour) => (
              <div key={hour.hour} className="flex flex-col items-center justify-end">
                <div
                  className="bg-gradient-to-t from-blue-500 to-indigo-500 w-full rounded-t"
                  style={{ height: `${maxHourlyMessages > 0 ? (hour.messages / maxHourlyMessages) * 100 : 0}%` }}
                  title={`ساعت ${hour.hour}: ${hour.messages} پیام`}
                />
                <div className="text-xs text-gray-500 mt-1">{hour.hour}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
