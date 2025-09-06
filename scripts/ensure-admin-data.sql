-- اطمینان از وجود چت‌بات‌ها
INSERT INTO chatbots (id, name, primary_color, text_color, background_color, chat_icon, position, welcome_message, navigation_message, stats_multiplier)
VALUES 
  (1, 'چت‌بات پشتیبانی اصلی', '#3B82F6', '#FFFFFF', '#F3F4F6', '💬', 'bottom-right', 'سلام! به سیستم پشتیبانی ما خوش آمدید.', 'چطور می‌توانم کمکتان کنم؟', 1.0),
  (2, 'چت‌بات فروش', '#10B981', '#FFFFFF', '#F3F4F6', '🛒', 'bottom-right', 'سلام! به فروشگاه ما خوش آمدید.', 'چه محصولی دنبال می‌کنید؟', 2.0)
ON CONFLICT (id) DO UPDATE SET
  stats_multiplier = EXCLUDED.stats_multiplier;

-- اضافه کردن پیام‌های بیشتر
INSERT INTO chatbot_messages (chatbot_id, user_message, bot_response, user_ip, timestamp)
VALUES
  (1, 'سلام خوبید؟', 'سلام! بله ممنون. چطور می‌توانم کمکتان کنم؟', '192.168.1.1', NOW()),
  (1, 'قیمت محصولات چقدر است؟', 'قیمت‌ها متفاوت است. کدام محصول را می‌خواهید؟', '192.168.1.2', NOW() - INTERVAL '1 hour'),
  (1, 'ارسال رایگان دارید؟', 'بله، برای خریدهای بالای 500 هزار تومان ارسال رایگان است.', '192.168.1.3', NOW() - INTERVAL '2 hours'),
  (1, 'چطور سفارش دهم؟', 'می‌توانید از وبسایت ما سفارش دهید یا با شماره تماس بگیرید.', '192.168.1.4', NOW() - INTERVAL '3 hours'),
  (1, 'گارانتی دارید؟', 'بله، تمام محصولات ما دارای گارانتی معتبر هستند.', '192.168.1.5', NOW() - INTERVAL '4 hours'),
  (2, 'محصولات جدید چیه؟', 'محصولات جدید ما شامل گوشی‌های هوشمند و لپ‌تاپ‌ها است.', '192.168.1.6', NOW() - INTERVAL '30 minutes'),
  (2, 'تخفیف دارید؟', 'بله، این هفته تخفیف ویژه 20 درصدی داریم.', '192.168.1.7', NOW() - INTERVAL '1 hour'),
  (2, 'زمان ارسال چقدر است؟', 'معمولاً 2 تا 3 روز کاری طول می‌کشد.', '192.168.1.8', NOW() - INTERVAL '2 hours');

-- اضافه کردن تیکت‌های بیشتر
INSERT INTO tickets (chatbot_id, user_ip, subject, message, status, priority, created_at)
VALUES
  (1, '192.168.1.100', 'مشکل در پرداخت', 'نمی‌توانم پرداخت کنم', 'open', 'high', NOW()),
  (1, '192.168.1.101', 'سوال درباره محصول', 'این محصول موجود است؟', 'closed', 'medium', NOW() - INTERVAL '1 day'),
  (1, '192.168.1.102', 'تاخیر در ارسال', 'سفارشم نرسیده', 'in_progress', 'high', NOW() - INTERVAL '2 days'),
  (2, '192.168.1.103', 'درخواست مرجوعی', 'می‌خواهم مرجوع کنم', 'open', 'medium', NOW() - INTERVAL '1 hour'),
  (2, '192.168.1.104', 'سوال فنی', 'چطور نصب کنم؟', 'resolved', 'low', NOW() - INTERVAL '3 days');
