export function isHostReachable(status: number): boolean {
  return status >= 200 && status < 300;
}

export function providerHttpError(status: number): string {
  if (status === 401) return "سيرفر البث رفض صلاحية الوصول (401) — تحقق من صلاحية الاشتراك وقيود الاتصال";
  if (status === 403) return "سيرفر البث منع الوصول (403) — تحقق من قيود الشبكة أو الجهاز لدى مزوّد البث";
  if (status === 404) return "رابط المحتوى غير موجود على سيرفر البث (404)";
  if (status === 429) return "طلبات كثيرة على سيرفر البث (429) — حاول بعد قليل";
  return `تعذر الاتصال بسيرفر البث (${status})`;
}

export function mediaPlaybackError(code?: number): string {
  if (code === 2) return "تعذر تحميل الفيديو بسبب اتصال الشبكة أو رفض سيرفر البث";
  if (code === 3) return "تعذر فك ترميز الفيديو — قد لا يدعم الجهاز صيغة المحتوى";
  if (code === 4) return "المصدر غير قابل للتشغيل — قد يكون الرابط مرفوضًا أو الصيغة غير مدعومة";
  return "تعذر تشغيل هذا المحتوى";
}