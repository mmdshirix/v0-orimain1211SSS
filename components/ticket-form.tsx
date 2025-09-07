"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Send, Phone, MessageSquare, Clock, User, CheckCircle, AlertCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface TicketFormProps {
  chatbotId: number
  onClose: () => void
}

interface Ticket {
  id: number
  subject: string
  message: string
  phone: string
  status: "open" | "in_progress" | "resolved" | "closed"
  created_at: string
  updated_at: string
}

interface TicketResponse {
  id: number
  ticket_id: number
  message: string
  is_admin: boolean
  created_at: string
}

const statusConfig = {
  open: { label: "باز", color: "bg-blue-500", icon: AlertCircle },
  in_progress: { label: "در حال بررسی", color: "bg-yellow-500", icon: Clock },
  resolved: { label: "حل شده", color: "bg-green-500", icon: CheckCircle },
  closed: { label: "بسته شده", color: "bg-gray-500", icon: XCircle },
}

export default function TicketForm({ chatbotId, onClose }: TicketFormProps) {
  const [view, setView] = useState<"create" | "list" | "detail">("create")
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [responses, setResponses] = useState<TicketResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [newResponse, setNewResponse] = useState("")

  // Create new ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim() || !subject.trim() || !message.trim()) return

    setLoading(true)
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatbot_id: chatbotId,
          name: "کاربر", // Default name since it's required by API
          phone: phone.trim(),
          subject: subject.trim(),
          message: message.trim(),
        }),
      })

      if (response.ok) {
        setPhone("")
        setSubject("")
        setMessage("")
        setView("list")
        await loadUserTickets(phone.trim())
      }
    } catch (error) {
      console.error("Error creating ticket:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load user tickets by phone
  const loadUserTickets = async (userPhone: string) => {
    if (!userPhone.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/tickets/user/${encodeURIComponent(userPhone.trim())}?chatbotId=${chatbotId}`)
      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error("Error loading tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load ticket responses
  const loadTicketResponses = async (ticketId: number) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/tickets/${ticketId}/responses`)
      if (response.ok) {
        const data = await response.json()
        setResponses(data.responses || [])
      }
    } catch (error) {
      console.error("Error loading responses:", error)
    } finally {
      setLoading(false)
    }
  }

  // Add response to ticket
  const handleAddResponse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket || !newResponse.trim()) return

    setLoading(true)
    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: newResponse.trim(),
          is_admin: false,
        }),
      })

      if (response.ok) {
        setNewResponse("")
        await loadTicketResponses(selectedTicket.id)
      }
    } catch (error) {
      console.error("Error adding response:", error)
    } finally {
      setLoading(false)
    }
  }

  // View ticket details
  const viewTicketDetail = async (ticket: Ticket) => {
    setSelectedTicket(ticket)
    await loadTicketResponses(ticket.id)
    setView("detail")
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString))
  }

  // Create ticket view
  if (view === "create") {
    return (
      <div className="p-3 h-full overflow-y-auto bg-white text-gray-900" dir="rtl">
        <div className="space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">ایجاد تیکت جدید</h2>
            <p className="text-sm text-gray-600">سوال یا مشکل خود را برای ما ارسال کنید</p>
          </div>

          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">شماره تماس</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09123456789"
                required
                className="text-right bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">موضوع</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="موضوع تیکت خود را وارد کنید"
                required
                className="text-right bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-900">پیام</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="توضیحات کامل مشکل یا سوال خود را بنویسید..."
                rows={4}
                required
                className="text-right bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? "در حال ارسال..." : "ارسال تیکت"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (phone.trim()) {
                    loadUserTickets(phone.trim())
                    setView("list")
                  }
                }}
              >
                مشاهده تیکت‌های قبلی
              </Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Ticket list view
  if (view === "list") {
    return (
      <div className="p-3 h-full overflow-y-auto bg-white text-gray-900" dir="rtl">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">تیکت‌های شما</h2>
              <p className="text-sm text-gray-600">
                {tickets.length > 0 ? `${tickets.length} تیکت یافت شد` : "تیکتی یافت نشد"}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setView("create")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">در حال بارگذاری...</p>
            </div>
          ) : tickets.length > 0 ? (
            <div className="space-y-3">
              {tickets.map((ticket) => {
                const status = statusConfig[ticket.status]
                const StatusIcon = status.icon
                return (
                  <div
                    key={ticket.id}
                    className="cursor-pointer hover:shadow-md transition-shadow bg-white rounded-lg border border-gray-200 p-4"
                    onClick={() => viewTicketDetail(ticket)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm line-clamp-1 text-gray-900">{ticket.subject}</h3>
                      <Badge variant="secondary" className={cn("text-white text-xs", status.color)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">{ticket.message}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(ticket.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {ticket.phone}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">هیچ تیکتی یافت نشد</p>
              <Button onClick={() => setView("create")}>ایجاد تیکت جدید</Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Ticket detail view
  if (view === "detail" && selectedTicket) {
    const status = statusConfig[selectedTicket.status]
    const StatusIcon = status.icon

    return (
      <div className="p-3 h-full overflow-y-auto bg-white text-gray-900" dir="rtl">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">جزئیات تیکت</h2>
            <Button variant="ghost" size="sm" onClick={() => setView("list")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>

          {/* Ticket Info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-sm text-gray-900">{selectedTicket.subject}</h3>
              <Badge variant="secondary" className={cn("text-white text-xs", status.color)}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <p className="text-xs text-gray-600 mb-2">{selectedTicket.message}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{formatDate(selectedTicket.created_at)}</span>
              <span>{selectedTicket.phone}</span>
            </div>
          </div>

          <Separator />

          {/* Responses */}
          <div>
            <h4 className="font-medium text-sm mb-3 text-gray-900">پاسخ‌ها</h4>
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : responses.length > 0 ? (
                responses.map((response) => (
                  <div
                    key={response.id}
                    className={cn(
                      "p-3 rounded-lg text-sm",
                      response.is_admin
                        ? "bg-blue-50 border-r-4 border-blue-500"
                        : "bg-gray-50 border-r-4 border-gray-300",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3 h-3" />
                      <span className="text-xs font-medium text-gray-900">
                        {response.is_admin ? "پشتیبانی" : "شما"}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(response.created_at)}</span>
                    </div>
                    <p className="text-gray-700">{response.message}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 py-4">هنوز پاسخی ارسال نشده</p>
              )}
            </div>

            {/* Add Response */}
            {selectedTicket.status !== "closed" && (
              <form onSubmit={handleAddResponse} className="space-y-3">
                <Textarea
                  value={newResponse}
                  onChange={(e) => setNewResponse(e.target.value)}
                  placeholder="پاسخ خود را بنویسید..."
                  rows={3}
                  className="text-right bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <Button type="submit" disabled={loading || !newResponse.trim()} className="w-full">
                  <Send className="w-4 h-4 ml-2" />
                  {loading ? "در حال ارسال..." : "ارسال پاسخ"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    )
  }

  return null
}
