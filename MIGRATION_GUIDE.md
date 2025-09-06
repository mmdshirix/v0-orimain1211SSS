# راهنمای مهاجرت از PostgreSQL/Neon به MySQL/Liara

این راهنما مراحل کامل مهاجرت پروژه Next.js از PostgreSQL (Neon) به MySQL (Liara) و استقرار با Docker را شرح می‌دهد.

## ۱. تغییرات انجام شده

### تغییرات پایگاه داده
- ✅ جایگزینی `@neondatabase/serverless` با `mysql2`
- ✅ تبدیل `SERIAL PRIMARY KEY` به `INT AUTO_INCREMENT PRIMARY KEY`
- ✅ تبدیل `TIMESTAMP WITH TIME ZONE` به `TIMESTAMP`
- ✅ حذف `RETURNING` و استفاده از `LAST_INSERT_ID()`
- ✅ تبدیل `$1, $2` placeholders به `?`
- ✅ تبدیل توابع PostgreSQL به معادل MySQL

### تغییرات کد
- ✅ به‌روزرسانی `lib/db.ts` برای MySQL
- ✅ به‌روزرسانی `lib/admin-auth.ts` برای MySQL
- ✅ به‌روزرسانی API routes برای پشتیبانی از MySQL
- ✅ اضافه کردن `output: 'standalone'` به `next.config.mjs`
- ✅ ایجاد Dockerfile چندمرحله‌ای

## ۲. متغیرهای محیطی مورد نیاز

در پنل لیارا، متغیرهای زیر را تنظیم کنید:

\`\`\`env
# روش اول: استفاده از URL کامل
DATABASE_URL=mysql://root:uSBZmt1AF8zfuhYA5JWOG1oJ@confident-archimedes-g0sbg1j5c-db:3306/kind_liskov

# روش دوم: متغیرهای جداگانه
DB_HOST=confident-archimedes-g0sbg1j5c-db
DB_PORT=3306
DB_USER=root
DB_PASSWORD=uSBZmt1AF8zfuhYA5JWOG1oJ
DB_NAME=kind_liskov

# سایر متغیرها
NODE_ENV=production
DEEPSEEK_API_KEY=your_deepseek_api_key
NEXT_PUBLIC_APP_URL=https://your-app-domain.liara.run
\`\`\`

## ۳. مراحل استقرار در لیارا

### مرحله ۱: آماده‌سازی پروژه
1. اطمینان از وجود تمام فایل‌های به‌روزرسانی شده
2. تست محلی با MySQL (اختیاری)
3. ایجاد فایل ZIP از پروژه (بدون `node_modules` و `.next`)

### مرحله ۲: ایجاد برنامه Docker در لیارا
1. وارد پنل لیارا شوید
2. برنامه جدید از نوع Docker ایجاد کنید
3. شبکه خصوصی را فعال کنید
4. پورت ۳۰۰۰ را تنظیم کنید
5. متغیرهای محیطی را اضافه کنید

### مرحله ۳: اجرای اسکریپت مهاجرت
پس از استقرار، اسکریپت `scripts/mysql-migration.sql` را اجرا کنید:

\`\`\`bash
# از طریق phpMyAdmin یا MySQL client
mysql -h confident-archimedes-g0sbg1j5c-db -u root -p kind_liskov < scripts/mysql-migration.sql
\`\`\`

## ۴. تست عملکرد

پس از استقرار، موارد زیر را تست کنید:

### تست‌های اساسی
- [ ] اتصال به دیتابیس
- [ ] ایجاد چت‌بات جدید
- [ ] ارسال پیام در چت‌بات
- [ ] مشاهده آمار و گزارش‌ها

### تست‌های پنل ادمین
- [ ] ورود به پنل ادمین (username: admin, password: admin123)
- [ ] مشاهده لیست تیکت‌ها
- [ ] پاسخ به تیکت
- [ ] مدیریت کاربران ادمین

### تست‌های عملکردی
- [ ] آپلود تصاویر
- [ ] ایجاد FAQ
- [ ] مدیریت محصولات
- [ ] سیستم تیکت‌دهی

## ۵. نکات مهم

### امنیت
- رمز عبور پیش‌فرض ادمین را تغییر دهید
- از bcrypt برای هش کردن رمزهای عبور استفاده کنید (در نسخه‌های آینده)
- متغیرهای محیطی حساس را محرمانه نگه دارید

### عملکرد
- از Connection Pooling استفاده شده است
- Indexها برای بهبود عملکرد اضافه شده‌اند
- حالت Standalone برای کاهش حجم Docker image

### نظارت
- لاگ‌های لیارا را برای رفع اشکال بررسی کنید
- از ابزارهای نظارت MySQL استفاده کنید
- عملکرد کوئری‌ها را پایش کنید

## ۶. عیب‌یابی

### مشکلات رایج
1. **خطای اتصال به دیتابیس**: بررسی متغیرهای محیطی
2. **خطای Foreign Key**: اطمینان از ترتیب ایجاد جداول
3. **خطای Syntax**: بررسی سازگاری کوئری‌ها با MySQL
4. **مشکل Docker Build**: بررسی Dockerfile و وابستگی‌ها

### لاگ‌های مفید
\`\`\`bash
# مشاهده لاگ‌های برنامه
liara logs --app your-app-name

# مشاهده وضعیت کانتینر
docker ps
docker logs container_id
\`\`\`

## ۷. بک‌آپ و بازیابی

### بک‌آپ
\`\`\`bash
mysqldump -h confident-archimedes-g0sbg1j5c-db -u root -p kind_liskov > backup.sql
\`\`\`

### بازیابی
\`\`\`bash
mysql -h confident-archimedes-g0sbg1j5c-db -u root -p kind_liskov < backup.sql
\`\`\`

---

**نکته**: این مهاجرت تمام قابلیت‌های اصلی پروژه را حفظ می‌کند و عملکرد مشابهی با نسخه PostgreSQL خواهد داشت.
