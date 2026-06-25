export function formatNumber(amount: number, lang: string): string {
  const locale = lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-FR" : "en-US";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrency(amount: number, currency: string, lang: string): string {
  const formatted = formatNumber(amount, lang);
  if (lang === "ar") {
    return `${formatted} ${currency}`;
  }
  return `${formatted} ${currency}`;
}

export function formatDate(dateInput: string | Date, lang: string): string {
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";
  
  const locale = lang === "ar" ? "ar-MA" : lang === "fr" ? "fr-FR" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function getCategoryName(nameKey: string, t: any): string {
  if (nameKey.startsWith("category_")) {
    return t(`dashboard.categories.${nameKey}`);
  }
  return nameKey;
}

export function getProgressBarColor(percent: number): string {
  if (percent >= 100) return "bg-rose-500";
  if (percent >= 80) return "bg-orange-500";
  return "bg-emerald-500";
}

export function getProgressBarTextColor(percent: number): string {
  if (percent >= 100) return "text-rose-600 dark:text-rose-400";
  if (percent >= 80) return "text-orange-600 dark:text-orange-400";
  return "text-emerald-600 dark:text-emerald-400";
}
