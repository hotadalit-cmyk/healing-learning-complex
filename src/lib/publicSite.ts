export type PublicContactConfig = {
  phone: string;
  telegramUrl: string;
  email: string;
  address: string;
  workingHours: string;
  entranceNote: string;
  parkingNote: string;
  mapEmbedUrl: string;
  directionsUrl: string;
};

/** Replace these empty values with verified business contacts before public launch. */
export const publicContactConfig: PublicContactConfig = {
  phone: '',
  telegramUrl: '',
  email: '',
  address: '',
  workingHours: '',
  entranceNote: '',
  parkingNote: '',
  mapEmbedUrl: '',
  directionsUrl: '',
};

export const PUBLIC_ANALYTICS_STORAGE_KEY = 'tokohod.public-analytics.v1';
export const PUBLIC_B2B_INQUIRIES_STORAGE_KEY = 'tokohod.public-b2b-inquiries.v1';
export const PUBLIC_FORM_RATE_LIMIT_STORAGE_KEY = 'tokohod.public-form-rate-limit.v1';

export type PublicB2BInquiry = {
  id: string;
  submittedAt: string;
  status: 'Новая заявка' | 'В работе';
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  deviceCount: number;
  transportTypes: string[];
  comment: string;
  source: string;
  sourceUrl: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  consentAcceptedAt: string;
  consentVersion: string;
};

export type PublicAnalyticsEvent = {
  id: string;
  event: string;
  at: string;
  path: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  metadata?: Record<string, string | number | boolean>;
};

function safeUtmValue(value: string | null) {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, 160);
  const containsEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(trimmed);
  const containsPhoneLikeValue = trimmed.replace(/\D/g, '').length >= 10;
  return containsEmail || containsPhoneLikeValue ? '[скрыто]' : trimmed || undefined;
}

export function currentUtmParams(search = typeof window !== 'undefined' ? window.location.search : '') {
  const params = new URLSearchParams(search);
  const utmSource = safeUtmValue(params.get('utm_source'));
  const utmMedium = safeUtmValue(params.get('utm_medium'));
  const utmCampaign = safeUtmValue(params.get('utm_campaign'));
  const utmTerm = safeUtmValue(params.get('utm_term'));
  const utmContent = safeUtmValue(params.get('utm_content'));
  return {
    ...(utmSource ? { utmSource } : {}),
    ...(utmMedium ? { utmMedium } : {}),
    ...(utmCampaign ? { utmCampaign } : {}),
    ...(utmTerm ? { utmTerm } : {}),
    ...(utmContent ? { utmContent } : {}),
  };
}

const dynamicPublicRouteTemplates = new Map<string, string>([
  ['qr', '/qr/:qrId'],
  ['status', '/status/:orderId'],
  ['estimate', '/estimate/:orderId'],
]);

/** Remove device and order IDs before persisting public URLs locally. */
export function safePublicPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return dynamicPublicRouteTemplates.get(segments[0] ?? '') ?? pathname;
}

function sanitizeStoredAnalytics(value: unknown): PublicAnalyticsEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is PublicAnalyticsEvent => Boolean(item && typeof item === 'object' && typeof (item as { path?: unknown }).path === 'string'))
    .map((item) => ({ ...item, path: safePublicPath(item.path) }));
}

export function trackPublicEvent(event: string, metadata?: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined') return;
  try {
    const previous = sanitizeStoredAnalytics(JSON.parse(window.localStorage.getItem(PUBLIC_ANALYTICS_STORAGE_KEY) ?? '[]'));
    const utm = currentUtmParams();
    const entry: PublicAnalyticsEvent = {
      id: `public-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      event,
      at: new Date().toISOString(),
      path: safePublicPath(window.location.pathname),
      ...(utm.utmSource ? { utmSource: utm.utmSource } : {}),
      ...(utm.utmMedium ? { utmMedium: utm.utmMedium } : {}),
      ...(utm.utmCampaign ? { utmCampaign: utm.utmCampaign } : {}),
      ...(metadata ? { metadata } : {}),
    };
    window.localStorage.setItem(PUBLIC_ANALYTICS_STORAGE_KEY, JSON.stringify([entry, ...previous].slice(0, 2000)));
  } catch {
    // Local analytics are intentionally best-effort; production needs a consent-aware analytics endpoint.
  }
}

export function readPublicAnalytics() {
  if (typeof window === 'undefined') return [] as PublicAnalyticsEvent[];
  try {
    return sanitizeStoredAnalytics(JSON.parse(window.localStorage.getItem(PUBLIC_ANALYTICS_STORAGE_KEY) ?? '[]'));
  } catch {
    return [] as PublicAnalyticsEvent[];
  }
}
