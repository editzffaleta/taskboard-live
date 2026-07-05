type SupportedLocale = 'pt' | 'en';

const DEFAULT_LOCALE: SupportedLocale = 'pt';

const HTTP_MESSAGES: Record<SupportedLocale, Record<string, string>> = {
  pt: {
    'http.too_many_requests':
      'Muitas requisições em pouco tempo. Tente novamente em instantes.',
  },
  en: {
    'http.too_many_requests':
      'Too many requests in a short period. Please try again shortly.',
  },
};

export function translateHttpMessage(
  key: string,
  locale: SupportedLocale = DEFAULT_LOCALE,
): string {
  return (
    HTTP_MESSAGES[locale]?.[key] ?? HTTP_MESSAGES[DEFAULT_LOCALE][key] ?? key
  );
}
