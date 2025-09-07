"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Save,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Calculator,
  TrendingUp,
  Palette,
  MessageSquare,
  HelpCircle,
  ShoppingBag,
  Move,
  Globe,
  FileText,
  Eye,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { Chatbot, ChatbotFAQ, ChatbotProduct } from "@/lib/db"
import ProductsManager from "@/components/products-manager"

const settingsSchema = z.object({
  name: z.string().min(1, "نام چت‌بات الزامی است"),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "کد رنگ نامعتبر است"),
  text_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "کد رنگ نامعتبر است"),
  background_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "کد رنگ نامعتبر است"),
  chat_icon: z.string(),
  position: z.string(),
  margin_x: z.number().min(0).max(200),
  margin_y: z.number().min(0).max(200),
  welcome_message: z.string().min(1, "پیام خوشامدگویی الزامی است"),
  navigation_message: z.string(),
  knowledge_base_text: z.string().optional(),
  knowledge_base_url: z.string().optional(),
  store_url: z.string().optional(),
  stats_multiplier: z.number().min(0.1).max(100),
})

interface ChatbotSettingsFormProps {
  chatbot: Chatbot
}

interface KnowledgeBaseStatus {
  isValidating: boolean
  isValid: boolean | null
  error: string | null
  contentPreview: string | null
  lastChecked: Date | null
}

export default function ChatbotSettingsForm({ chatbot }: ChatbotSettingsFormProps) {
  const [isLoadingGeneral, setIsLoadingGeneral] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [faqs, setFaqs] = useState<Partial<ChatbotFAQ>[]>([])
  const [loadingFaqs, setLoadingFaqs] = useState(true)
  const [isLoadingFaqs, setIsLoadingFaqs] = useState(false)
  const [products, setProducts] = useState<Partial<ChatbotProduct>[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [kbStatus, setKbStatus] = useState<KnowledgeBaseStatus>({
    isValidating: false,
    isValid: null,
    error: null,
    contentPreview: null,
    lastChecked: null,
  })
  const { toast } = useToast()

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: chatbot.name || "",
      primary_color: chatbot.primary_color || "#2563EB",
      text_color: chatbot.text_color || "#FFFFFF",
      background_color: chatbot.background_color || "#F3F4F6",
      chat_icon: chatbot.chat_icon || "🤖",
      position: chatbot.position || "bottom-right",
      margin_x: chatbot.margin_x ?? 20,
      margin_y: chatbot.margin_y ?? 20,
      welcome_message: chatbot.welcome_message || "",
      navigation_message: chatbot.navigation_message || "",
      knowledge_base_text: chatbot.knowledge_base_text || "",
      knowledge_base_url: chatbot.knowledge_base_url || "",
      store_url: chatbot.store_url || "",
      stats_multiplier: chatbot.stats_multiplier || 1.0,
    },
  })

  const statsMultiplier = form.watch("stats_multiplier")
  const knowledgeBaseUrl = form.watch("knowledge_base_url")

  useEffect(() => {
    loadFaqs()
    loadProducts()
  }, [chatbot.id])

  const validateKnowledgeBaseUrl = async (url: string) => {
    if (!url || !url.trim()) {
      setKbStatus({
        isValidating: false,
        isValid: null,
        error: null,
        contentPreview: null,
        lastChecked: null,
      })
      return
    }

    setKbStatus((prev) => ({ ...prev, isValidating: true, error: null }))

    try {
      const response = await fetch("/api/knowledge-base/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setKbStatus({
          isValidating: false,
          isValid: true,
          error: null,
          contentPreview: data.preview || null,
          lastChecked: new Date(),
        })
        toast({
          title: "✅ موفقیت",
          description: `محتوای ${data.contentLength || 0} کاراکتر از URL بارگذاری شد`,
        })
      } else {
        setKbStatus({
          isValidating: false,
          isValid: false,
          error: data.error || "خطا در بارگذاری محتوا",
          contentPreview: null,
          lastChecked: new Date(),
        })
      }
    } catch (error) {
      setKbStatus({
        isValidating: false,
        isValid: false,
        error: "خطا در اتصال به سرور",
        contentPreview: null,
        lastChecked: new Date(),
      })
    }
  }

  const loadFaqs = async () => {
    setLoadingFaqs(true)
    try {
      const response = await fetch(`/api/chatbots/${chatbot.id}/faqs`)
      if (!response.ok) throw new Error("Failed to load FAQs")
      const data = await response.json()
      setFaqs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error loading FAQs:", error)
      toast({ title: "❌ خطا", description: "خطا در بارگذاری سوالات متداول", variant: "destructive" })
    } finally {
      setLoadingFaqs(false)
    }
  }

  const loadProducts = async () => {
    setLoadingProducts(true)
    try {
      const response = await fetch(`/api/chatbots/${chatbot.id}/products`)
      if (!response.ok) throw new Error("Failed to load products")
      const data = await response.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error loading products:", error)
      toast({ title: "❌ خطا", description: "خطا در بارگذاری محصولات", variant: "destructive" })
    } finally {
      setLoadingProducts(false)
    }
  }

  const savePartialSettings = async (
    data: Partial<Chatbot>,
    loadingSetter: React.Dispatch<React.SetStateAction<boolean>>,
    successMessage: string,
  ) => {
    loadingSetter(true)
    try {
      const response = await fetch(`/api/chatbots/${chatbot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save settings")
      }
      toast({ title: "✅ موفقیت", description: successMessage })
    } catch (error: any) {
      toast({ title: "❌ خطا", description: error.message || "خطا در ذخیره تنظیمات", variant: "destructive" })
    } finally {
      loadingSetter(false)
    }
  }

  const handleSaveGeneral = () => {
    const data = {
      name: form.getValues("name"),
      position: form.getValues("position"),
      margin_x: form.getValues("margin_x"),
      margin_y: form.getValues("margin_y"),
      primary_color: form.getValues("primary_color"),
      text_color: form.getValues("text_color"),
      background_color: form.getValues("background_color"),
      chat_icon: form.getValues("chat_icon"),
    }
    savePartialSettings(data, setIsLoadingGeneral, "تنظیمات عمومی و ظاهری با موفقیت ذخیره شد!")
  }

  const handleSaveMessages = () => {
    const data = {
      welcome_message: form.getValues("welcome_message"),
      navigation_message: form.getValues("navigation_message"),
      knowledge_base_text: form.getValues("knowledge_base_text"),
      knowledge_base_url: form.getValues("knowledge_base_url"),
      store_url: form.getValues("store_url"),
    }
    savePartialSettings(data, setIsLoadingMessages, "پیام‌ها و پایگاه دانش با موفقیت ذخیره شد!")
  }

  const handleSaveStats = () => {
    const data = {
      stats_multiplier: form.getValues("stats_multiplier"),
    }
    savePartialSettings(data, setIsLoadingStats, "ضریب آماری با موفقیت ذخیره شد!")
  }

  const handleSaveFaqs = async () => {
    setIsLoadingFaqs(true)
    try {
      const validFaqs = faqs
        .filter((faq) => faq.question?.trim() && faq.answer?.trim())
        .map((faq, index) => ({ ...faq, position: index }))
      const response = await fetch(`/api/chatbots/${chatbot.id}/faqs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validFaqs),
      })
      if (!response.ok) throw new Error("Failed to save FAQs")
      toast({ title: "✅ موفقیت", description: "سوالات متداول با موفقیت ذخیره شد!" })
      await loadFaqs()
    } catch (error) {
      toast({ title: "❌ خطا", description: "خطا در ذخیره سوالات متداول", variant: "destructive" })
    } finally {
      setIsLoadingFaqs(false)
    }
  }

  const handleSaveProducts = async () => {
    setIsLoadingProducts(true)
    try {
      const validProducts = products.filter((p) => p.name?.trim()).map((p, index) => ({ ...p, position: index }))
      const response = await fetch(`/api/chatbots/${chatbot.id}/products`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validProducts),
      })
      if (!response.ok) throw new Error("Failed to save products")
      toast({ title: "✅ موفقیت", description: "محصولات با موفقیت ذخیره شد!" })
      await loadProducts()
    } catch (error) {
      toast({ title: "❌ خطا", description: "خطا در ذخیره محصولات", variant: "destructive" })
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const addFaq = () => setFaqs([...faqs, { question: "", answer: "", emoji: "❓", position: faqs.length }])
  const updateFaq = (index: number, field: keyof ChatbotFAQ, value: string) => {
    setFaqs(faqs.map((faq, i) => (i === index ? { ...faq, [field]: value } : faq)))
  }
  const removeFaq = (index: number) => setFaqs(faqs.filter((_, i) => i !== index))
  const moveFaq = (index: number, direction: "up" | "down") => {
    const newFaqs = [...faqs]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newFaqs.length) return
    ;[newFaqs[index], newFaqs[targetIndex]] = [newFaqs[targetIndex], newFaqs[index]]
    setFaqs(newFaqs)
  }

  const calculateExampleStats = (baseValue: number) => {
    return Math.round(baseValue * statsMultiplier)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">تنظیمات چت‌بات: {chatbot.name}</h2>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-gray-100 h-auto">
          <TabsTrigger value="general">
            <Palette className="ml-2 h-4 w-4" />
            ظاهر
          </TabsTrigger>
          <TabsTrigger value="positioning">
            <Move className="ml-2 h-4 w-4" />
            موقعیت
          </TabsTrigger>
          <TabsTrigger value="messages">
            <MessageSquare className="ml-2 h-4 w-4" />
            پیام‌ها
          </TabsTrigger>
          <TabsTrigger value="faqs">
            <HelpCircle className="ml-2 h-4 w-4" />
            سوالات متداول
          </TabsTrigger>
          <TabsTrigger value="products">
            <ShoppingBag className="ml-2 h-4 w-4" />
            محصولات
          </TabsTrigger>
          <TabsTrigger value="stats">
            <Calculator className="ml-2 h-4 w-4" />
            ضریب آماری
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>تنظیمات ظاهری</CardTitle>
                <Button type="button" onClick={handleSaveGeneral} disabled={isLoadingGeneral}>
                  <Save className="ml-2 h-4 w-4" />
                  {isLoadingGeneral ? "در حال ذخیره..." : "ذخیره ظاهر"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 mt-4">
              <div>
                <Label htmlFor="name">نام چت‌بات</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="primary_color">رنگ اصلی</Label>
                  <Input id="primary_color" type="color" {...form.register("primary_color")} className="p-1 h-10" />
                </div>
                <div>
                  <Label htmlFor="text_color">رنگ متن</Label>
                  <Input id="text_color" type="color" {...form.register("text_color")} className="p-1 h-10" />
                </div>
                <div>
                  <Label htmlFor="background_color">رنگ پس‌زمینه</Label>
                  <Input
                    id="background_color"
                    type="color"
                    {...form.register("background_color")}
                    className="p-1 h-10"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="chat_icon">آیکون چت (ایموجی یا URL)</Label>
                <Input id="chat_icon" {...form.register("chat_icon")} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positioning">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>موقعیت دقیق ویجت</CardTitle>
                <Button type="button" onClick={handleSaveGeneral} disabled={isLoadingGeneral}>
                  <Save className="ml-2 h-4 w-4" />
                  {isLoadingGeneral ? "در حال ذخیره..." : "ذخیره موقعیت"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 mt-4">
              <div>
                <Label htmlFor="position">گوشه صفحه</Label>
                <Controller
                  name="position"
                  control={form.control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bottom-right">پایین راست</SelectItem>
                        <SelectItem value="bottom-left">پایین چپ</SelectItem>
                        <SelectItem value="top-right">بالا راست</SelectItem>
                        <SelectItem value="top-left">بالا چپ</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="margin_x">فاصله افقی (پیکسل)</Label>
                  <Controller
                    name="margin_x"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Slider
                          id="margin_x"
                          min={0}
                          max={200}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                        <span className="font-bold w-12 text-center">{field.value}px</span>
                      </div>
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="margin_y">فاصله عمودی (پیکسل)</Label>
                  <Controller
                    name="margin_y"
                    control={form.control}
                    render={({ field }) => (
                      <div className="flex items-center gap-2">
                        <Slider
                          id="margin_y"
                          min={0}
                          max={200}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                        <span className="font-bold w-12 text-center">{field.value}px</span>
                      </div>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>پیام‌ها و پایگاه دانش</CardTitle>
                <Button type="button" onClick={handleSaveMessages} disabled={isLoadingMessages}>
                  <Save className="ml-2 h-4 w-4" />
                  {isLoadingMessages ? "در حال ذخیره..." : "ذخیره پیام‌ها"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="welcome_message">پیام خوشامدگویی</Label>
                  <Textarea id="welcome_message" {...form.register("welcome_message")} />
                </div>
                <div>
                  <Label htmlFor="navigation_message">پیام راهنمایی</Label>
                  <Textarea id="navigation_message" {...form.register("navigation_message")} />
                </div>
              </div>

              <div>
                <Label htmlFor="store_url">آدرس فروشگاه (اختیاری)</Label>
                <Input
                  id="store_url"
                  {...form.register("store_url")}
                  placeholder="https://example.com"
                  className="font-mono"
                />
                <p className="text-sm text-gray-500 mt-1">آدرس فروشگاه برای ارجاع کاربران به محصولات</p>
              </div>

              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">پایگاه دانش</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="knowledge_base_url" className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        آدرس وب‌سایت پایگاه دانش
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="knowledge_base_url"
                          {...form.register("knowledge_base_url")}
                          placeholder="https://example.com/knowledge-base"
                          className="font-mono"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => validateKnowledgeBaseUrl(knowledgeBaseUrl || "")}
                          disabled={kbStatus.isValidating || !knowledgeBaseUrl?.trim()}
                        >
                          {kbStatus.isValidating ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {kbStatus.lastChecked && (
                        <div className="flex items-center gap-2 mt-2">
                          {kbStatus.isValid ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              محتوا بارگذاری شد
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              خطا در بارگذاری
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            آخرین بررسی: {kbStatus.lastChecked.toLocaleTimeString("fa-IR")}
                          </span>
                        </div>
                      )}

                      {kbStatus.error && (
                        <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {kbStatus.error}
                        </p>
                      )}

                      <p className="text-sm text-gray-500 mt-1">
                        محتوای این صفحه به‌طور خودکار استخراج و به پایگاه دانش اضافه می‌شود
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="knowledge_base_text" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        متن پایگاه دانش
                      </Label>
                      <Textarea
                        id="knowledge_base_text"
                        {...form.register("knowledge_base_text")}
                        rows={8}
                        placeholder="اطلاعات مربوط به کسب‌وکار، محصولات، خدمات و سوالات متداول خود را اینجا وارد کنید..."
                      />
                      <p className="text-sm text-gray-500 mt-1">این متن مستقیماً به پایگاه دانش چت‌بات اضافه می‌شود</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 border rounded-lg p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        پیش‌نمایش محتوا
                      </h4>

                      {kbStatus.contentPreview ? (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-700 bg-white p-3 rounded border max-h-40 overflow-y-auto">
                            {kbStatus.contentPreview}
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>محتوای استخراج شده از URL</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(knowledgeBaseUrl, "_blank")}
                              className="h-6 px-2"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : form.watch("knowledge_base_text") ? (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-700 bg-white p-3 rounded border max-h-40 overflow-y-auto">
                            {form.watch("knowledge_base_text")?.slice(0, 500)}
                            {(form.watch("knowledge_base_text")?.length || 0) > 500 && "..."}
                          </div>
                          <div className="text-xs text-gray-500">
                            متن پایگاه دانش ({form.watch("knowledge_base_text")?.length || 0} کاراکتر)
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 text-center py-8">
                          هیچ محتوایی برای نمایش وجود ندارد
                          <br />
                          یک URL وارد کنید یا متن پایگاه دانش را تکمیل کنید
                        </div>
                      )}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">نکات مهم:</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• محتوای URL و متن با هم ترکیب می‌شوند</li>
                        <li>• محتوا هر ۳۰ دقیقه به‌روزرسانی می‌شود</li>
                        <li>• حداکثر ۱۲۰۰۰ کاراکتر پردازش می‌شود</li>
                        <li>• محتوای HTML به‌طور خودکار تمیز می‌شود</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faqs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>مدیریت سوالات متداول</CardTitle>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleSaveFaqs}
                    disabled={isLoadingFaqs}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="ml-2 h-4 w-4" />
                    {isLoadingFaqs ? "در حال ذخیره..." : "ذخیره سوالات"}
                  </Button>
                  <Button type="button" onClick={addFaq} variant="outline">
                    <Plus className="ml-2 h-4 w-4" />
                    افزودن سوال
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 mt-4">
              {loadingFaqs ? (
                <div className="text-center py-4">در حال بارگذاری...</div>
              ) : (
                <div className="space-y-3">
                  {faqs.map((faq, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-1">
                          <Label>ایموجی</Label>
                          <Input
                            value={faq.emoji || ""}
                            onChange={(e) => updateFaq(index, "emoji", e.target.value)}
                            placeholder="❓"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <Label>سوال</Label>
                          <Input
                            value={faq.question || ""}
                            onChange={(e) => updateFaq(index, "question", e.target.value)}
                            placeholder="سوال شما..."
                          />
                        </div>
                        <div className="md:col-span-5">
                          <Label>پاسخ</Label>
                          <Textarea
                            value={faq.answer || ""}
                            onChange={(e) => updateFaq(index, "answer", e.target.value)}
                            placeholder="پاسخ شما..."
                            rows={2}
                          />
                        </div>
                        <div className="md:col-span-2 flex gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => moveFaq(index, "up")}
                            disabled={index === 0}
                          >
                            <MoveUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => moveFaq(index, "down")}
                            disabled={index === faqs.length - 1}
                          >
                            <MoveDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeFaq(index)}
                            className="text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {faqs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <p>هیچ سوال متداولی تعریف نشده است.</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>مدیریت محصولات</CardTitle>
                <Button
                  type="button"
                  onClick={handleSaveProducts}
                  disabled={isLoadingProducts}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Save className="ml-2 h-4 w-4" />
                  {isLoadingProducts ? "در حال ذخیره..." : "ذخیره محصولات"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="mt-4">
              {loadingProducts ? (
                <div className="text-center py-4">در حال بارگذاری...</div>
              ) : (
                <ProductsManager products={products} setProducts={setProducts} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-6 w-6 text-blue-600" />
                  تنظیم ضریب آماری
                </CardTitle>
                <Button type="button" onClick={handleSaveStats} disabled={isLoadingStats}>
                  <Save className="ml-2 h-4 w-4" />
                  {isLoadingStats ? "در حال ذخیره..." : "ذخیره ضریب"}
                </Button>
              </div>
              <CardDescription>این ضریب در آمار نمایش داده شده به مدیران چت‌بات اعمال می‌شود.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="space-y-4">
                  <Label htmlFor="stats_multiplier" className="text-base font-medium">
                    ضریب آماری
                  </Label>
                  <Controller
                    name="stats_multiplier"
                    control={form.control}
                    render={({ field }) => (
                      <Input
                        id="stats_multiplier"
                        type="number"
                        min="0.1"
                        max="100"
                        step="0.1"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="text-xl font-bold text-center h-12"
                      />
                    )}
                  />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h3 className="font-bold mb-3 flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    پیش‌نمایش آمار
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>پیام‌ها (واقعی: ۱۰)</span>
                      <span className="font-bold text-blue-600">{calculateExampleStats(10)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>کاربران (واقعی: ۵)</span>
                      <span className="font-bold text-green-600">{calculateExampleStats(5)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>تیکت‌ها (واقعی: ۳)</span>
                      <span className="font-bold text-orange-600">{calculateExampleStats(3)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
