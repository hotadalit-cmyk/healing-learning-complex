import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, Bike, BookOpen, CalendarDays,
  Check, CheckCircle2, Clock3, CreditCard, Download, FileText,
  GraduationCap, Home, LogOut, MessageCircle, Plus, Send, ShieldCheck,
  Smartphone, UserRound, Wrench,
} from 'lucide-react';
import { AcademyPanel, KnowledgePanel } from '@/components/KnowledgeAcademy';
import { CustomerShell, DeviceIllustration } from '@/components/CustomerShell';
import { seedClients, type EstimateLine, type ServiceOrder, type WarrantyInfo } from '@/lib/tokoData';
import { trackPublicEvent } from '@/lib/publicSite';

const CUSTOMER_SESSION_KEY = 'tokohod.customer.session.v1';
const CUSTOMER_DEVICES_KEY = 'tokohod.customer.devices.v1';
const CUSTOMER_CASES_KEY = 'tokohod.customer.warranty-cases.v1';
const CUSTOMER_MESSAGES_KEY = 'tokohod.customer.messages.v1';
const CUSTOMER_PREFERENCES_KEY = 'tokohod.customer.preferences.v1';
const CUSTOMER_AUDIT_KEY = 'tokohod.customer.audit.v1';
const DEMO_OTP = '0000';

type PortalScreen = 'home' | 'devices' | 'device' | 'orders' | 'order' | 'quote' | 'documents' | 'document' | 'warranty' | 'notifications' | 'help' | 'chat' | 'profile' | 'academy';
type QuoteDecision = 'Согласована' | 'Отклонена';
type ClientDevice = {
  id: string;
  phone: string;
  brand: string;
  model: string;
  deviceType: string;
  qrId?: string;
  serial?: string;
  createdAt: string;
  photoName?: string;
};
type WarrantyCase = {
  id: string;
  orderId: string;
  phone: string;
  description: string;
  attachmentNames: string[];
  createdAt: string;
  status: string;
};
type ClientMessage = { id: string; phone: string; orderId?: string; text: string; createdAt: string; direction: 'client' | 'system' };
type NotificationPreferences = { sms: boolean; email: boolean; push: boolean; telegram: boolean; serviceTips: boolean };
type CustomerDocumentKind = 'order-summary' | 'estimate' | 'work-summary' | 'warranty';
type CustomerDocument = { id: string; orderId: string; kind: CustomerDocumentKind; title: string; subtitle: string };
type DocumentContent = { title: string; order: ServiceOrder; lines: string[]; itemLines?: EstimateLine[] };

type CustomerPortalProps = {
  orders: ServiceOrder[];
  onQuoteDecision: (orderId: string, decision: QuoteDecision) => void;
  onSwitchRole: () => void;
  homeHref?: string;
  showDemoRoleSwitch?: boolean;
};

const navItems = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'devices', label: 'Устройства', icon: Bike },
  { id: 'orders', label: 'Заказы', icon: Wrench },
  { id: 'help', label: 'Помощь', icon: MessageCircle },
  { id: 'profile', label: 'Профиль', icon: UserRound },
];

const requiredNotifications = [
  'Новая версия сметы и запрос согласования',
  'Устройство готово к выдаче',
  'Изменение ожидаемого срока',
  'Обращение по гарантии',
  'Важное сообщение по заказу',
];

const defaultPreferences: NotificationPreferences = { sms: false, email: false, push: false, telegram: false, serviceTips: false };

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function formatPhone(value: string) {
  const digits = normalizePhone(value);
  if (digits.length !== 10) return value;
  return `+7 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function formatRuble(value: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(value);
}

function formatWarrantyDate(value?: string) {
  if (!value) return 'Не указан';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

function isWarrantyActive(warranty?: WarrantyInfo) {
  if (!warranty) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const workUntil = new Date(`${warranty.workUntil}T12:00:00`);
  return !Number.isNaN(workUntil.getTime()) && workUntil >= today;
}

function customerStatusLabel(status: ServiceOrder['status']) {
  const labels: Record<ServiceOrder['status'], string> = {
    'Новая заявка': 'Заявка получена',
    'Ожидает приёмки': 'Ожидает передачи устройства',
    'Принято': 'Принято в сервис',
    'Диагностика': 'Проверка устройства',
    'Ожидает согласования': 'Нужно согласовать смету',
    'В работе': 'Работы выполняются',
    'Готово к выдаче': 'Готово к выдаче',
    'Выдано': 'Выдано владельцу',
    'Гарантийное обращение': 'Проверяем обращение',
    'Отказ / не ремонтируется': 'Нужно связаться с сервисом',
  };
  return labels[status];
}

function customerOrderStatus(order: ServiceOrder) {
  if (order.status === 'Ожидает согласования' && order.quoteDecision === 'Согласована') return 'Смета согласована · ожидает следующего этапа';
  if (order.status === 'Ожидает согласования' && order.quoteDecision === 'Отклонена') return 'Смета отклонена · решение сохранено';
  return customerStatusLabel(order.status);
}

function customerOrderDescription(order: ServiceOrder) {
  if (order.status === 'Ожидает согласования' && order.quoteDecision === 'Согласована') return 'Вы подтвердили сумму и срок. Решение сохранено локально в демо; реальный сервис не получил уведомление.';
  if (order.status === 'Ожидает согласования' && order.quoteDecision === 'Отклонена') return 'Вы отклонили текущую версию сметы. Решение сохранено локально в демо; реальный сервис не получил уведомление.';
  return customerStatusDescription(order.status);
}

function customerStatusDescription(status: ServiceOrder['status']) {
  const descriptions: Record<ServiceOrder['status'], string> = {
    'Новая заявка': 'Заявка зарегистрирована. Сервис свяжется с вами, чтобы подтвердить детали.',
    'Ожидает приёмки': 'Согласуйте с сервисом время и способ передачи устройства.',
    'Принято': 'Устройство принято. Следующий этап — диагностика.',
    'Диагностика': 'Мастер проверяет устройство. Стоимость и срок ремонта не определяются до проверки.',
    'Ожидает согласования': 'Проверьте позиции, итоговую сумму и срок в смете. После ответа решение фиксируется; начало работ подтверждает сервис.',
    'В работе': 'Работы выполняются по согласованной смете.',
    'Готово к выдаче': 'Работы завершены. Свяжитесь с сервисом, чтобы уточнить время получения.',
    'Выдано': 'Заказ закрыт. Документы и историю можно открыть ниже.',
    'Гарантийное обращение': 'Сервис проверяет обращение. Дождитесь подтверждения команды.',
    'Отказ / не ремонтируется': 'Работы остановлены. Свяжитесь с сервисом для обсуждения следующего шага.',
  };
  return descriptions[status];
}

function latestEstimate(order: ServiceOrder) {
  const history = order.estimateHistory ?? [];
  return history.find((item) => item.version === order.estimateVersion) ?? (order.estimateVersion > 0 ? {
    version: order.estimateVersion,
    createdAt: order.history.find((item) => item.action.toLowerCase().includes('смет'))?.at ?? order.createdAt,
    lines: order.estimateLines,
    total: order.amount ?? order.estimateLines.reduce((sum, line) => sum + line.quantity * line.price, 0),
    decision: order.quoteDecision ?? 'Ожидает ответа' as const,
    decidedAt: order.quoteDecidedAt,
  } : undefined);
}

function appendCustomerAudit(action: string, orderId?: string) {
  const previous = readLocal<Array<{ id: string; action: string; orderId?: string; at: string }>>(CUSTOMER_AUDIT_KEY, []);
  const entry = { id: `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, action, ...(orderId ? { orderId } : {}), at: new Date().toISOString() };
  writeLocal(CUSTOMER_AUDIT_KEY, [entry, ...previous].slice(0, 300));
}

function getTimeline(order: ServiceOrder) {
  const stages = [
    { label: 'Заявка принята', match: ['заявка создана', 'заявка получена'] },
    { label: 'Устройство принято', match: ['устройство принято', 'принято в сервис'] },
    { label: 'Диагностика', match: ['диагност'] },
    { label: 'Смета и ваше решение', match: ['смета', 'согласован'] },
    { label: 'Работы', match: ['работ', 'в работу'] },
    { label: 'Проверка перед выдачей', match: ['провер', 'тест'] },
    { label: 'Готово к выдаче', match: ['готов'] },
    { label: 'Выдано', match: ['выдан'] },
  ];
  const currentIndex: Record<ServiceOrder['status'], number> = {
    'Новая заявка': 0,
    'Ожидает приёмки': 0,
    'Принято': 1,
    'Диагностика': 2,
    'Ожидает согласования': 3,
    'В работе': 4,
    'Готово к выдаче': 6,
    'Выдано': 7,
    'Гарантийное обращение': 2,
    'Отказ / не ремонтируется': 1,
  };
  const quoteApprovedWaiting = order.status === 'Ожидает согласования' && order.quoteDecision === 'Согласована';
  const current = quoteApprovedWaiting ? 4 : currentIndex[order.status];
  return stages.map((stage, index) => {
    const event = order.history.find((item) => stage.match.some((word) => item.action.toLowerCase().includes(word)));
    return {
      ...stage,
      label: quoteApprovedWaiting && index === 4 ? 'Подготовка к следующему этапу' : stage.label,
      index,
      complete: index < current || order.status === 'Выдано' || (quoteApprovedWaiting && index === 3),
      current: index === current && order.status !== 'Выдано',
      time: index === 0 ? order.createdAt : event?.at,
      waitingForService: quoteApprovedWaiting && index === current,
    };
  });
}

function buildCustomerDocuments(orders: ServiceOrder[]): CustomerDocument[] {
  return orders.flatMap((order) => {
    const docs: CustomerDocument[] = [{ id: `${order.id}-summary`, orderId: order.id, kind: 'order-summary', title: 'Сводка заказа', subtitle: `${order.id} · ${order.brand} ${order.model}` }];
    if (order.estimateVersion > 0) docs.push({ id: `${order.id}-estimate-${order.estimateVersion}`, orderId: order.id, kind: 'estimate', title: `Смета v${order.estimateVersion}`, subtitle: `${customerOrderStatus(order)} · ${formatRuble(latestEstimate(order)?.total ?? order.amount ?? 0)}` });
    if (order.status === 'Выдано') docs.push({ id: `${order.id}-work-summary`, orderId: order.id, kind: 'work-summary', title: 'Сводка выполненных работ', subtitle: 'Демо-предпросмотр · заказ выдан' });
    if (order.warranty) docs.push({ id: `${order.id}-warranty`, orderId: order.id, kind: 'warranty', title: 'Гарантийная карточка', subtitle: `Документ ${order.warranty.documentNumber} · до ${formatWarrantyDate(order.warranty.workUntil)}` });
    return docs;
  });
}

function documentContent(order: ServiceOrder, kind: CustomerDocumentKind): DocumentContent {
  const estimate = latestEstimate(order);
  const sharedLines = [
    `Заказ: ${order.id}`,
    `Устройство: ${order.deviceType} · ${order.brand} ${order.model}`,
    `QR-ID: ${order.qrId}`,
    `Дата заявки: ${order.createdAt}`,
    `Статус: ${customerOrderStatus(order)}`,
  ];
  if (kind === 'estimate') return {
    title: `Смета v${order.estimateVersion}`,
    order,
    lines: [...sharedLines, `Версия: v${estimate?.version ?? order.estimateVersion}`, `Создана: ${estimate?.createdAt ?? order.createdAt}`, `Ориентировочный срок: ${order.dueDate || 'уточняется сервисом'}`, `Итог: ${formatRuble(estimate?.total ?? order.amount ?? 0)}`],
    itemLines: estimate?.lines ?? order.estimateLines,
  };
  if (kind === 'work-summary') return {
    title: 'Сводка выполненных работ', order,
    lines: [...sharedLines, `Дата выдачи по демо-заказу: ${order.dueDate}`, 'Это информационная сводка интерфейса, а не юридический акт.'],
    itemLines: estimate?.lines ?? order.estimateLines,
  };
  if (kind === 'warranty') return {
    title: `Гарантийная карточка ${order.warranty?.documentNumber ?? ''}`.trim(), order,
    lines: [...sharedLines, `Работы указаны до: ${formatWarrantyDate(order.warranty?.workUntil)}`, ...(order.warranty?.partsUntil ? [`Запчасти указаны до: ${formatWarrantyDate(order.warranty.partsUntil)}`] : []), `Условия: ${order.warranty?.terms ?? 'Уточните условия у сервиса.'}`],
  };
  return { title: 'Сводка заказа', order, lines: [...sharedLines, `Ожидаемый срок: ${order.dueDate || 'уточняется сервисом'}`, 'Это информационная сводка кабинета; оригинал заказ-наряда будет доступен после подключения хранилища документов.'] };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function openPdfPrintView(content: DocumentContent) {
  const popup = window.open('', '_blank');
  if (!popup) {
    window.alert('Разрешите всплывающее окно, чтобы открыть печатную версию документа. В диалоге печати можно выбрать «Сохранить как PDF».');
    return;
  }
  const itemRows = content.itemLines?.map((line) => `<tr><td>${escapeHtml(line.title)}</td><td>${line.quantity}</td><td>${escapeHtml(formatRuble(line.price))}</td><td>${escapeHtml(formatRuble(line.quantity * line.price))}</td></tr>`).join('') ?? '';
  popup.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${escapeHtml(content.title)}</title><style>body{font:15px Arial,sans-serif;color:#14233a;max-width:760px;margin:40px auto;padding:0 24px}h1{font-size:25px;margin-bottom:8px}.sub{color:#69778a;font-size:12px;margin-bottom:24px}.rows{display:grid;gap:10px;margin:18px 0 24px}.row{padding:10px 0;border-bottom:1px solid #e1e5eb}table{width:100%;border-collapse:collapse;margin:18px 0}td,th{padding:9px 6px;border-bottom:1px solid #e1e5eb;text-align:left;font-size:13px}th{color:#69778a}.foot{margin-top:28px;padding:12px;background:#f5f7fa;color:#5f6d7f;font-size:11px;line-height:1.5}@media print{body{margin:0 auto;padding:18mm 10mm}.no-print{display:none}}</style></head><body><h1>${escapeHtml(content.title)}</h1><div class="sub">ТОКОХОД · клиентский кабинет · документ для просмотра</div><div class="rows">${content.lines.map((line) => `<div class="row">${escapeHtml(line)}</div>`).join('')}</div>${itemRows ? `<table><thead><tr><th>Позиция</th><th>Кол-во</th><th>Цена</th><th>Сумма</th></tr></thead><tbody>${itemRows}</tbody></table>` : ''}<div class="foot">Демо-предпросмотр. Официальный PDF-документ, акт и чек доступны только после подключения серверного хранилища документов и платёжного провайдера. При необходимости выберите в окне печати «Сохранить как PDF».</div><button class="no-print" onclick="window.print()">Печать / сохранить PDF</button><script>setTimeout(()=>window.print(),250)</script></body></html>`);
  popup.document.close();
}

function StatusPill({ order }: { order: ServiceOrder }) {
  const warm = order.status === 'Ожидает согласования' || order.status === 'Готово к выдаче';
  const green = order.status === 'Выдано' || order.quoteDecision === 'Согласована';
  return <span className={`customer-portal-status${warm && !green ? ' warm' : ''}${green ? ' green' : ''}`}>{customerOrderStatus(order)}</span>;
}

export function CustomerPortal({ orders, onQuoteDecision, onSwitchRole, homeHref = '/', showDemoRoleSwitch = false }: CustomerPortalProps) {
  const [authenticatedPhone, setAuthenticatedPhone] = useState(() => {
    try { return window.sessionStorage.getItem(CUSTOMER_SESSION_KEY) ?? ''; } catch { return ''; }
  });
  const [loginPhone, setLoginPhone] = useState('');
  const [challengePhone, setChallengePhone] = useState('');
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [screen, setScreen] = useState<PortalScreen>('home');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [addedDevices, setAddedDevices] = useState<ClientDevice[]>(() => readLocal(CUSTOMER_DEVICES_KEY, []));
  const [cases, setCases] = useState<WarrantyCase[]>(() => readLocal(CUSTOMER_CASES_KEY, []));
  const [messages, setMessages] = useState<ClientMessage[]>(() => readLocal(CUSTOMER_MESSAGES_KEY, []));
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => ({ ...defaultPreferences, ...readLocal(CUSTOMER_PREFERENCES_KEY, defaultPreferences) }));
  const [portalError, setPortalError] = useState('');
  const [deviceFormOpen, setDeviceFormOpen] = useState(false);
  const [deviceType, setDeviceType] = useState('Электросамокат');
  const [deviceBrand, setDeviceBrand] = useState('');
  const [deviceModel, setDeviceModel] = useState('');
  const [caseDescription, setCaseDescription] = useState('');
  const [caseOrderId, setCaseOrderId] = useState('');
  const [caseFiles, setCaseFiles] = useState<string[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [docPreview, setDocPreview] = useState<DocumentContent | null>(null);

  const signedIn = !!authenticatedPhone;
  const clientOrders = useMemo(() => signedIn ? orders.filter((order) => !order.companyId && normalizePhone(order.phone) === normalizePhone(authenticatedPhone)) : [], [orders, authenticatedPhone, signedIn]);
  const profileName = clientOrders[0]?.clientName ?? seedClients.find((client) => normalizePhone(client.phone) === normalizePhone(authenticatedPhone))?.name ?? 'Клиент ТОКОХОД';
  const sortedOrders = useMemo(() => [...clientOrders].sort((a, b) => Number(b.id.match(/\d+/)?.[0] ?? 0) - Number(a.id.match(/\d+/)?.[0] ?? 0)), [clientOrders]);
  const activeOrder = sortedOrders.find((order) => !['Выдано', 'Отказ / не ремонтируется'].includes(order.status));
  const selectedOrder = clientOrders.find((order) => order.id === selectedOrderId) ?? activeOrder;
  const documents = useMemo(() => buildCustomerDocuments(clientOrders), [clientOrders]);
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId);
  const selectedDocumentOrder = selectedDocument ? clientOrders.find((order) => order.id === selectedDocument.orderId) : undefined;
  const selectedDevice = useMemo(() => {
    const fromOrders = new Map<string, ClientDevice>();
    clientOrders.forEach((order) => {
      const id = order.qrId || order.id;
      const previous = fromOrders.get(id);
      fromOrders.set(id, previous ? previous : {
        id,
        phone: order.phone,
        brand: order.brand,
        model: order.model,
        deviceType: order.deviceType,
        qrId: order.qrId,
        serial: order.serial,
        createdAt: order.createdAt,
      });
    });
    const privateDevices = addedDevices.filter((device) => normalizePhone(device.phone) === normalizePhone(authenticatedPhone));
    return [...Array.from(fromOrders.values()), ...privateDevices];
  }, [clientOrders, addedDevices, authenticatedPhone]);
  const device = selectedDevice.find((item) => item.id === selectedDeviceId);
  const deviceOrders = device?.qrId ? sortedOrders.filter((order) => order.qrId === device.qrId) : [];
  const currentEstimate = selectedOrder ? latestEstimate(selectedOrder) : undefined;
  const screenTab = screen === 'home' ? 'home' : screen === 'devices' || screen === 'device' ? 'devices' : screen === 'orders' || screen === 'order' || screen === 'quote' ? 'orders' : screen === 'help' || screen === 'chat' ? 'help' : 'profile';

  useEffect(() => {
    const selectedIsAvailable = sortedOrders.some((order) => order.id === caseOrderId && !!order.warranty);
    if (selectedIsAvailable) return;
    const warrantyOrder = sortedOrders.find((order) => isWarrantyActive(order.warranty));
    setCaseOrderId(warrantyOrder?.id ?? '');
  }, [caseOrderId, sortedOrders]);

  const goTo = (next: PortalScreen) => {
    setScreen(next);
    setPortalError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const noteStorageFailure = (success: boolean) => {
    setPortalError(success ? '' : 'Браузер не сохранил изменения. Не закрывайте страницу и попробуйте ещё раз; синхронизация с сервисом в демо не подключена.');
  };

  const requestCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizePhone(loginPhone);
    if (normalized.length !== 10) {
      setLoginError('Введите номер телефона полностью.');
      return;
    }
    setChallengePhone(loginPhone);
    setCode('');
    setLoginError('');
  };

  const verifyCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code !== DEMO_OTP) {
      setLoginError('Неверный код. Для демо используйте 0000.');
      return;
    }
    setAuthenticatedPhone(challengePhone);
    setLoginError('');
    setScreen('home');
    appendCustomerAudit('Клиентская демо-сессия подтверждена');
    try { window.sessionStorage.setItem(CUSTOMER_SESSION_KEY, challengePhone); } catch { /* Session remains in memory for this tab. */ }
  };

  const logOut = () => {
    appendCustomerAudit('Выход из клиентской демо-сессии');
    setAuthenticatedPhone('');
    setChallengePhone('');
    setCode('');
    setScreen('home');
    try { window.sessionStorage.removeItem(CUSTOMER_SESSION_KEY); } catch { /* No-op when storage is unavailable. */ }
  };

  const openOrder = (order: ServiceOrder, next: PortalScreen = 'order') => {
    setSelectedOrderId(order.id);
    goTo(next);
  };

  const openDocument = (item: CustomerDocument) => {
    setSelectedDocumentId(item.id);
    setDocPreview(null);
    goTo('document');
  };

  const addDevice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!deviceBrand.trim() || !deviceModel.trim()) {
      setPortalError('Укажите бренд и модель устройства.');
      return;
    }
    const record: ClientDevice = {
      id: `device-${Date.now()}`,
      phone: authenticatedPhone,
      brand: deviceBrand.trim(),
      model: deviceModel.trim(),
      deviceType,
      createdAt: new Date().toISOString(),
    };
    const next = [record, ...addedDevices];
    noteStorageFailure(writeLocal(CUSTOMER_DEVICES_KEY, next));
    setAddedDevices(next);
    setDeviceBrand('');
    setDeviceModel('');
    setDeviceFormOpen(false);
    appendCustomerAudit('Устройство добавлено в демо-профиль');
  };

  const createWarrantyCase = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const order = clientOrders.find((item) => item.id === caseOrderId);
    if (!order?.warranty || !caseDescription.trim()) {
      setPortalError('Выберите заказ с гарантийным документом и опишите вопрос.');
      return;
    }
    const record: WarrantyCase = {
      id: `warranty-${Date.now()}`,
      orderId: order.id,
      phone: authenticatedPhone,
      description: caseDescription.trim(),
      attachmentNames: caseFiles,
      createdAt: new Date().toISOString(),
      status: 'Сохранено локально в демо · сервис не уведомлён',
    };
    const next = [record, ...cases];
    noteStorageFailure(writeLocal(CUSTOMER_CASES_KEY, next));
    setCases(next);
    appendCustomerAudit('Создано гарантийное обращение', order.id);
    setCaseDescription('');
    setCaseFiles([]);
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!messageDraft.trim()) return;
    const record: ClientMessage = {
      id: `message-${Date.now()}`,
      phone: authenticatedPhone,
      ...(selectedOrder ? { orderId: selectedOrder.id } : {}),
      text: messageDraft.trim(),
      createdAt: new Date().toISOString(),
      direction: 'client',
    };
    const next = [record, ...messages];
    noteStorageFailure(writeLocal(CUSTOMER_MESSAGES_KEY, next));
    setMessages(next);
    appendCustomerAudit('Сообщение сохранено в демо-чате', selectedOrder?.id);
    setMessageDraft('');
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    noteStorageFailure(writeLocal(CUSTOMER_PREFERENCES_KEY, next));
    appendCustomerAudit('Изменены настройки необязательных уведомлений');
  };

  const decideQuote = (decision: QuoteDecision) => {
    if (!selectedOrder || !currentEstimate) return;
    const action = decision === 'Согласована' ? 'согласовать' : 'отклонить';
    const deadline = selectedOrder.dueDate && selectedOrder.dueDate !== 'Без срока' ? selectedOrder.dueDate : 'срок уточнит сервис';
    const confirmation = decision === 'Согласована'
      ? `Вы подтверждаете смету v${currentEstimate.version} на ${formatRuble(currentEstimate.total)}. Ориентировочный срок: ${deadline}. После подтверждения эта версия будет зафиксирована в заказе. Согласовать?`
      : `Вы отклоняете смету v${currentEstimate.version} на ${formatRuble(currentEstimate.total)}. Работы не начнутся до согласования. Отправить решение сервису?`;
    if (!window.confirm(confirmation)) return;
    appendCustomerAudit(`Клиент ${action} смету v${currentEstimate.version}`, selectedOrder.id);
    onQuoteDecision(selectedOrder.id, decision);
  };

  const downloadDocument = (order: ServiceOrder, kind: CustomerDocumentKind) => {
    trackPublicEvent('document_open', { kind });
    const content = documentContent(order, kind);
    setDocPreview(content);
    openPdfPrintView(content);
  };

  const matchingCases = cases.filter((item) => normalizePhone(item.phone) === normalizePhone(authenticatedPhone));
  const matchingMessages = messages.filter((item) => normalizePhone(item.phone) === normalizePhone(authenticatedPhone));
  const invoiceMessage = 'Онлайн-оплата и платёжный провайдер не подключены. Не передавайте реквизиты карты в чате.';

  const shell = (content: ReactNode) => (
    <CustomerShell
      activeTab={screenTab}
      homeHref={homeHref}
      action={signedIn ? 'notifications' : 'contact'}
      onNotificationClick={() => goTo('notifications')}
      navItems={navItems}
      onNavigate={(id) => goTo(id as PortalScreen)}
      hideNavigation={!signedIn}
      wide
    >
      {portalError && <div className="customer-portal-error" role="status"><AlertTriangle size={16} />{portalError}</div>}
      {content}
    </CustomerShell>
  );

  if (!signedIn) return shell(
    <section className="customer-auth-view">
      <span className="customer-auth-icon"><Smartphone size={26} /></span>
      <span className="customer-eyebrow">ЛИЧНЫЙ КАБИНЕТ</span>
      <h1>{challengePhone ? 'Подтвердите номер' : 'Вход по телефону'}</h1>
      <p className="customer-auth-lead">Укажите телефон, который вы оставляли в заказе. После входа будут доступны только заказы, связанные с этим номером.</p>
      {!challengePhone ? (
        <form className="customer-form-card" onSubmit={requestCode}>
          <label htmlFor="customer-login-phone">Номер телефона</label>
          <input id="customer-login-phone" autoComplete="tel" inputMode="tel" value={loginPhone} onChange={(event) => setLoginPhone(event.target.value)} placeholder="+7 900 000-00-00" />
          {loginError && <p className="customer-form-error">{loginError}</p>}
          <button className="customer-primary-button" type="submit">Продолжить <ArrowRight size={17} /></button>
          <button className="customer-text-button customer-demo-autofill" type="button" onClick={() => setLoginPhone(seedClients.find((client) => client.type === 'Частный клиент')?.phone ?? '')}>Подставить тестовый номер из демо-данных</button>
        </form>
      ) : (
        <form className="customer-form-card" onSubmit={verifyCode}>
          <div className="customer-login-phone-line"><span>{formatPhone(challengePhone)}</span><button type="button" onClick={() => { setChallengePhone(''); setLoginError(''); }}>Изменить</button></div>
          <label htmlFor="customer-login-code">Код подтверждения</label>
          <input id="customer-login-code" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" />
          <p className="customer-demo-hint"><ShieldCheck size={15} />Демо-вход: код 0000. SMS-провайдер и серверная авторизация не подключены.</p>
          {loginError && <p className="customer-form-error">{loginError}</p>}
          <button className="customer-primary-button" type="submit">Войти в кабинет <ArrowRight size={17} /></button>
        </form>
      )}
      <div className="customer-auth-privacy"><ShieldCheck size={16} /><span>Телефон используется только для локальной фильтрации демо-заказов. Это не является проверкой личности или production-защитой данных.</span></div>
      {showDemoRoleSwitch && <button className="customer-text-button" type="button" onClick={onSwitchRole}>Вернуться к выбору демо-роли</button>}
    </section>,
  );

  let view: React.ReactNode = null;

  if (screen === 'home') {
    const clientNotifications = sortedOrders.filter((order) => (order.status === 'Ожидает согласования' && order.estimateVersion > 0 && order.quoteDecision !== 'Согласована') || order.status === 'Готово к выдаче' || order.status === 'Гарантийное обращение');
    view = <>
      <div className="customer-portal-welcome">
        <div><span className="customer-eyebrow">КЛИЕНТСКИЙ КАБИНЕТ</span><h1>Здравствуйте, {profileName.split(' ')[0]}!</h1><p>Устройства, заказы и документы — в одном месте.</p></div>
        <button className="customer-icon-button" type="button" aria-label="Настройки уведомлений" onClick={() => goTo('notifications')}><Bell size={20} />{clientNotifications.length > 0 && <span className="customer-badge-count">{clientNotifications.length}</span>}</button>
      </div>
      {!clientOrders.length ? <><section className="customer-empty-card"><span className="customer-empty-icon"><Bike size={24} /></span><h2>Пока нет заказов</h2><p>В кабинете отображаются только заказы, связанные с номером {formatPhone(authenticatedPhone)}.</p><Link className="customer-primary-button" to="/booking">Создать заявку <ArrowRight size={17} /></Link></section>{selectedDevice.length > 0 && <section className="customer-portal-section"><div className="customer-section-heading"><div><span className="customer-eyebrow">МОЯ ТЕХНИКА</span><h2>Устройства</h2></div><button type="button" onClick={() => goTo('devices')}>Все <ArrowRight size={15} /></button></div><div className="customer-device-grid compact">{selectedDevice.slice(0, 2).map((item) => <button className="customer-device-card" type="button" key={item.id} onClick={() => { setSelectedDeviceId(item.id); goTo('device'); }}><span className="customer-device-card-art"><DeviceIllustration deviceType={item.deviceType} /></span><span className="customer-device-card-copy"><small>{item.deviceType}</small><strong>{item.brand} {item.model}</strong><span>Личное устройство</span></span><ArrowRight size={17} /></button>)}</div></section>}<section className="customer-quick-actions"><button type="button" onClick={() => { setDeviceFormOpen(true); goTo('devices'); }}><span><Plus size={19} /></span><strong>Добавить устройство</strong></button><button type="button" onClick={() => goTo('help')}><span><BookOpen size={19} /></span><strong>Уход и помощь</strong></button></section></> : <div className="customer-home-layout">
        <div className="customer-home-primary">
          {activeOrder ? <section className="customer-active-order-card">
            <div className="customer-active-order-top"><span className="customer-section-label"><Wrench size={15} />АКТИВНЫЙ ЗАКАЗ · {activeOrder.id}</span><StatusPill order={activeOrder} /></div>
            <div className="customer-active-order-device"><div className="customer-mini-device-art"><DeviceIllustration deviceType={activeOrder.deviceType} /></div><div><strong>{activeOrder.brand} {activeOrder.model}</strong><span>{activeOrder.deviceType}</span><small>QR-ID · {activeOrder.qrId}</small></div></div>
            <h2>{customerOrderStatus(activeOrder)}</h2><p>{customerOrderDescription(activeOrder)}</p>
            <div className={`customer-next-step${activeOrder.status === 'Ожидает согласования' ? ' needs-action' : ''}`}>
              <strong>Что нужно сделать</strong>
              {activeOrder.status === 'Ожидает согласования' && activeOrder.estimateVersion > 0 && !activeOrder.quoteDecision ? <><span>Проверьте состав, итоговую сумму и срок в смете v{activeOrder.estimateVersion}.</span><button type="button" onClick={() => openOrder(activeOrder, 'quote')}>Открыть смету <ArrowRight size={16} /></button></>
                : activeOrder.status === 'Ожидает согласования' && activeOrder.quoteDecision === 'Отклонена' ? <><span>Вы отклонили смету. В демо ответ сохранён только в браузере; сервис не получит его без интеграции.</span><button type="button" onClick={() => goTo('chat')}>Связаться с сервисом <MessageCircle size={16} /></button></>
                  : activeOrder.status === 'Ожидает согласования' && activeOrder.quoteDecision === 'Согласована' ? <span>Решение сохранено только в демо-браузере. В реальной версии сервис должен подтвердить следующий этап; повторно согласовывать эту версию не нужно.</span>
                    : activeOrder.status === 'Готово к выдаче' ? <><span>Уточните у сервиса удобное время получения.</span><button type="button" onClick={() => goTo('chat')}>Связаться с сервисом <MessageCircle size={16} /></button></>
                      : activeOrder.status === 'Гарантийное обращение' ? <><span>Дождитесь проверки обращения специалистом.</span><button type="button" onClick={() => goTo('warranty')}>Открыть гарантию <ArrowRight size={16} /></button></>
                        : <span>Сейчас от вас ничего не требуется. Мы сообщим, если понадобится согласование или уточнение.</span>}
            </div>
            <button className="customer-secondary-button" type="button" onClick={() => openOrder(activeOrder)}>Подробности заказа <ArrowRight size={16} /></button>
          </section> : <section className="customer-empty-card"><h2>Нет активных заказов</h2><p>История завершённых заказов и гарантийные документы остаются в кабинете.</p><button className="customer-primary-button" type="button" onClick={() => goTo('orders')}>Открыть историю <ArrowRight size={16} /></button></section>}
          <section className="customer-quick-actions">
            <button type="button" onClick={() => { setDeviceFormOpen(true); goTo('devices'); }}><span><Plus size={19} /></span><strong>Добавить устройство</strong></button>
            <button type="button" onClick={() => goTo('documents')}><span><FileText size={19} /></span><strong>Мои документы</strong></button>
            <button type="button" onClick={() => goTo('warranty')}><span><ShieldCheck size={19} /></span><strong>Гарантия</strong></button>
            <button type="button" onClick={() => goTo('help')}><span><BookOpen size={19} /></span><strong>Уход и помощь</strong></button>
          </section>
        </div>
        <div className="customer-home-secondary">
          <section className="customer-portal-section"><div className="customer-section-heading"><div><span className="customer-eyebrow">МОЯ ТЕХНИКА</span><h2>Устройства</h2></div><button type="button" onClick={() => goTo('devices')}>Все <ArrowRight size={15} /></button></div>
            <div className="customer-device-grid compact">{selectedDevice.slice(0, 2).map((item) => <button className="customer-device-card" type="button" key={item.id} onClick={() => { setSelectedDeviceId(item.id); goTo('device'); }}><span className="customer-device-card-art"><DeviceIllustration deviceType={item.deviceType} /></span><span className="customer-device-card-copy"><small>{item.deviceType}</small><strong>{item.brand} {item.model}</strong><span>{item.qrId ? `QR · ${item.qrId}` : 'Личное устройство'}</span></span><ArrowRight size={17} /></button>)}
              {!selectedDevice.length && <div className="customer-inline-empty">Добавьте устройство, чтобы хранить связанные заказы и документы.</div>}
            </div>
          </section>
          <section className="customer-portal-section"><div className="customer-section-heading"><div><span className="customer-eyebrow">ВАЖНОЕ</span><h2>Уведомления</h2></div><button type="button" onClick={() => goTo('notifications')}>Настроить <ArrowRight size={15} /></button></div>
            {clientNotifications.length ? <div className="customer-notification-list">{clientNotifications.slice(0, 3).map((order) => <button type="button" key={order.id} onClick={() => openOrder(order, order.status === 'Ожидает согласования' ? 'quote' : 'order')}><span className="customer-notification-dot" /><span><strong>{order.status === 'Ожидает согласования' && order.quoteDecision === 'Отклонена' ? `В демо сохранён отказ по смете v${order.estimateVersion}` : order.status === 'Ожидает согласования' ? `Смета v${order.estimateVersion} ждёт решения` : customerOrderStatus(order)}</strong><small>Заказ {order.id} · {order.brand} {order.model}</small></span><ArrowRight size={16} /></button>)}</div> : <div className="customer-inline-empty">Новых сервисных уведомлений нет.</div>}
          </section>
          <div className="customer-privacy-note"><ShieldCheck size={15} /><span>Показываются только записи, связанные с подтверждённым в демо телефоном. Реальную проверку выполняет только серверная авторизация.</span></div>
        </div>
      </div>}
    </>;
  } else if (screen === 'devices') {
    view = <>
      <div className="customer-page-title"><span className="customer-eyebrow">МОЙ ПРОФИЛЬ</span><h1>Мои устройства</h1><p>Только ваша техника и связанные с ней заказы.</p></div>
      <div className="customer-device-list">{selectedDevice.map((item) => {
        const linkedOrders = item.qrId ? sortedOrders.filter((order) => order.qrId === item.qrId) : [];
        const latest = linkedOrders[0];
        return <button className="customer-device-card" type="button" key={item.id} onClick={() => { setSelectedDeviceId(item.id); goTo('device'); }}><span className="customer-device-card-art"><DeviceIllustration deviceType={item.deviceType} /></span><span className="customer-device-card-copy"><small>{item.deviceType}</small><strong>{item.brand} {item.model}</strong><span>{latest ? customerOrderStatus(latest) : 'Добавлено в профиль'}</span><span>{item.qrId ? `QR-ID · ${item.qrId}` : 'QR-паспорт не привязан'}</span></span><ArrowRight size={18} /></button>;
      })}</div>
      {deviceFormOpen ? <form className="customer-form-card customer-device-form" onSubmit={addDevice}><div className="customer-section-heading"><h2>Новое устройство</h2><button type="button" aria-label="Закрыть" onClick={() => setDeviceFormOpen(false)}>Закрыть</button></div><label htmlFor="new-device-type">Тип</label><select id="new-device-type" value={deviceType} onChange={(event) => setDeviceType(event.target.value)}><option>Электросамокат</option><option>Электровелосипед</option><option>Моноколесо</option></select><label htmlFor="new-device-brand">Бренд</label><input id="new-device-brand" value={deviceBrand} onChange={(event) => setDeviceBrand(event.target.value)} placeholder="Например, Segway-Ninebot" /><label htmlFor="new-device-model">Модель</label><input id="new-device-model" value={deviceModel} onChange={(event) => setDeviceModel(event.target.value)} placeholder="Например, Max G2" /><p className="customer-demo-hint"><ShieldCheck size={15} />Устройство сохранится локально. Фото и серийный номер не нужны; сервис привяжет заказ при обработке заявки.</p><button className="customer-primary-button" type="submit">Сохранить устройство <Check size={17} /></button></form>
        : <button className="customer-secondary-button customer-add-device-button" type="button" onClick={() => setDeviceFormOpen(true)}><Plus size={17} />Добавить устройство</button>}
      {!selectedDevice.length && <section className="customer-empty-card"><Bike size={27} /><h2>Пока нет устройств</h2><p>Добавьте технику или создайте заявку на сервис.</p><Link className="customer-primary-button" to="/booking">Создать заявку <ArrowRight size={16} /></Link></section>}
      <div className="customer-privacy-note"><ShieldCheck size={15} /><span>Фото устройства добавляются в кабинет только после явного разрешения владельца. QR-паспорт доступен отдельно по публичной ссылке.</span></div>
    </>;
  } else if (screen === 'device' && device) {
    const activeWarranty = deviceOrders.find((order) => isWarrantyActive(order.warranty));
    view = <>
      <button className="customer-back-button" type="button" onClick={() => goTo('devices')}><ArrowLeft size={16} />К устройствам</button>
      <div className="customer-device-detail-hero"><span className="customer-eyebrow customer-eyebrow-light">ПАСПОРТ В КАБИНЕТЕ</span><div className="customer-device-detail-art"><DeviceIllustration deviceType={device.deviceType} /></div><span className="customer-device-type-label">{device.deviceType}</span><h1>{device.brand} {device.model}</h1><span>QR-ID · {device.qrId ?? 'не привязан'}</span></div>
      <section className="customer-info-card"><div><span>Серийный номер</span><strong>{device.serial ? `••••${device.serial.slice(-4)}` : 'Не указан'}</strong></div><div><span>Добавлено</span><strong>{device.createdAt}</strong></div>{activeWarranty && <div><span>Гарантия по заказу {activeWarranty.id}</span><strong>До {formatWarrantyDate(activeWarranty.warranty?.workUntil)}</strong></div>}</section>
      {device.qrId && <Link className="customer-list-action" to={`/qr/${encodeURIComponent(device.qrId)}`}><span className="customer-list-action-icon"><ShieldCheck size={19} /></span><span><strong>Публичный QR-паспорт</strong><small>Только разрешённые сведения об устройстве</small></span><ArrowRight size={17} /></Link>}
      <section className="customer-portal-section"><div className="customer-section-heading"><div><span className="customer-eyebrow">ИСТОРИЯ В КАБИНЕТЕ</span><h2>Заказы по устройству</h2></div></div>
        {deviceOrders.length ? <div className="customer-order-list">{deviceOrders.map((order) => <button type="button" key={order.id} onClick={() => openOrder(order)}><span><strong>{order.id}</strong><small>{order.createdAt} · {customerOrderStatus(order)}</small></span><StatusPill order={order} /><ArrowRight size={16} /></button>)}</div> : <div className="customer-inline-empty">Пока нет заказов, связанных с этим устройством.</div>}
      </section>
    </>;
  } else if (screen === 'orders') {
    view = <>
      <div className="customer-page-title"><span className="customer-eyebrow">ИСТОРИЯ ОБРАЩЕНИЙ</span><h1>Мои заказы</h1><p>Статусы, решения по сметам и документы только по вашему профилю.</p></div>
      {sortedOrders.length ? <div className="customer-order-list">{sortedOrders.map((order) => <button type="button" key={order.id} onClick={() => openOrder(order)}><span className="customer-order-list-main"><strong>{order.id} · {order.brand} {order.model}</strong><small>{order.createdAt} · {order.deviceType}</small><em>{customerOrderStatus(order)}</em></span><StatusPill order={order} /><ArrowRight size={16} /></button>)}</div> : <section className="customer-empty-card"><h2>История пока пуста</h2><p>Создайте заявку, чтобы увидеть её здесь.</p><Link className="customer-primary-button" to="/booking">Новая заявка <ArrowRight size={16} /></Link></section>}
      <Link className="customer-list-action" to="/booking"><span className="customer-list-action-icon"><Plus size={19} /></span><span><strong>Создать заявку</strong><small>Опишите устройство и запрос</small></span><ArrowRight size={17} /></Link>
    </>;
  } else if ((screen === 'order' || screen === 'quote') && selectedOrder) {
    const timeline = getTimeline(selectedOrder);
    const showQuote = screen === 'quote' || (selectedOrder.status === 'Ожидает согласования' && !!selectedOrder.estimateVersion);
    view = <>
      <button className="customer-back-button" type="button" onClick={() => goTo('orders')}><ArrowLeft size={16} />К заказам</button>
      <div className="customer-page-title"><span className="customer-eyebrow">ЗАКАЗ · {selectedOrder.id}</span><h1>{showQuote ? 'Смета и решение' : 'Статус заказа'}</h1><p>{selectedOrder.brand} {selectedOrder.model} · {selectedOrder.deviceType}</p></div>
      <section className="customer-order-summary-card"><div className="customer-order-summary-top"><StatusPill order={selectedOrder} /><span>Создан {selectedOrder.createdAt}</span></div><h2>{customerOrderStatus(selectedOrder)}</h2><p>{customerOrderDescription(selectedOrder)}</p><div className="customer-order-summary-detail"><span>Ваше описание</span><strong>{selectedOrder.issue}</strong></div><div className="customer-order-summary-detail"><span>Ориентировочный срок</span><strong>{selectedOrder.dueDate || 'Уточняется сервисом'}</strong></div></section>
      {selectedOrder.status === 'Выдано' && <section className="customer-completed-work-card"><span className="customer-eyebrow">ИСТОРИЯ РАБОТ · {selectedOrder.id}</span><h2>Что было выполнено</h2>{selectedOrder.estimateLines.length ? <div>{selectedOrder.estimateLines.map((line, index) => <div key={`${line.title}-${index}`}><span>{line.title}<small>{line.kind} · {line.quantity} шт.</small></span><strong>{formatRuble(line.quantity * line.price)}</strong></div>)}</div> : <p>Состав работ уточните в выданном сервисом документе.</p>}<p className="customer-demo-hint"><ShieldCheck size={15} />Суммы и история относятся только к этому заказу. Официальный акт доступен после подключения документов.</p></section>}
      {showQuote && currentEstimate && <section className="customer-quote-card"><div className="customer-quote-heading"><div><span className="customer-eyebrow">ВЕРСИЯ СМЕТЫ</span><h2>Смета v{currentEstimate.version}</h2><small>Создана {currentEstimate.createdAt}</small></div><StatusPill order={selectedOrder} /></div><div className="customer-quote-items">{currentEstimate.lines.map((line, index) => <div className="customer-quote-item" key={`${line.title}-${index}`}><span><strong>{line.title}</strong><small>{line.kind} · {line.quantity} шт. × {formatRuble(line.price)}</small></span><strong>{formatRuble(line.quantity * line.price)}</strong></div>)}</div><div className="customer-quote-total"><span>Итоговая сумма версии v{currentEstimate.version}</span><strong>{formatRuble(currentEstimate.total)}</strong></div><div className="customer-quote-due"><CalendarDays size={16} /><span>Ориентировочный срок: <strong>{selectedOrder.dueDate || 'уточняется сервисом'}</strong></span></div>
        {selectedOrder.quoteDecision === 'Согласована' ? <div className="customer-result-card approved"><CheckCircle2 size={19} /><span><strong>Смета согласована</strong><small>Локальная демо-запись от {selectedOrder.quoteDecidedAt ?? ''} · версия v{currentEstimate.version}. Реальный сервис не уведомлён.</small></span></div>
          : selectedOrder.quoteDecision === 'Отклонена' ? <div className="customer-result-card declined"><AlertTriangle size={19} /><span><strong>Смета отклонена</strong><small>Локальная демо-запись сохранена. Реальный сервис не уведомлён.</small></span></div>
            : <><div className="customer-quote-confirm-note"><ShieldCheck size={16} /><span>Перед подтверждением проверьте итоговую сумму и срок. Ваш ответ будет записан для версии v{currentEstimate.version}.</span></div><div className="customer-quote-actions"><button type="button" className="customer-secondary-button" onClick={() => decideQuote('Отклонена')}>Отклонить</button><button type="button" className="customer-primary-button" onClick={() => decideQuote('Согласована')}>Подтвердить {formatRuble(currentEstimate.total)} <Check size={16} /></button></div></>}
        {selectedOrder.estimateHistory && selectedOrder.estimateHistory.length > 1 && <details className="customer-version-history"><summary>Предыдущие версии ({selectedOrder.estimateHistory.length - 1})</summary>{selectedOrder.estimateHistory.filter((snapshot) => snapshot.version !== currentEstimate.version).map((snapshot) => <div key={snapshot.version}><strong>Смета v{snapshot.version}</strong><span>{formatRuble(snapshot.total)} · {snapshot.decision} · {snapshot.createdAt}</span></div>)}</details>}
      </section>}
      <section className="customer-timeline-card customer-private-timeline" aria-label="Этапы заказа">{timeline.map((step) => <div className={`customer-timeline-step ${step.complete ? 'is-complete' : ''} ${step.current ? 'is-current' : ''}`} key={step.label}><div className="customer-timeline-marker">{step.complete ? <Check size={17} /> : step.current ? <Wrench size={16} /> : <Clock3 size={13} />}</div><div className="customer-timeline-content"><strong>{step.label}</strong><span>{step.current ? step.waitingForService ? 'Ожидаем обновления от сервиса' : 'Текущий этап' : step.complete ? step.time || 'Этап завершён' : 'Ожидается'}</span></div>{step.current && <ArrowRight size={16} />}</div>)}<div className="customer-eta"><Clock3 size={18} /><div><strong>Ориентировочный срок</strong><span>{selectedOrder.dueDate || 'Уточняется сервисом'}</span></div></div></section>
      <div className="customer-order-actions"><button type="button" onClick={() => { setSelectedOrderId(selectedOrder.id); goTo('documents'); }}>Документы <FileText size={16} /></button><button type="button" onClick={() => goTo('chat')}>Написать в сервис <MessageCircle size={16} /></button></div>
      <div className="customer-privacy-note"><ShieldCheck size={15} /><span>Здесь показаны только клиентские статусы и согласованные позиции. Внутренние заметки, фото диагностики и данные других заказов скрыты.</span></div>
    </>;
  } else if (screen === 'documents') {
    view = <>
      <div className="customer-page-title"><span className="customer-eyebrow">ФАЙЛЫ И ПОДТВЕРЖДЕНИЯ</span><h1>Мои документы</h1><p>Доступны только документы и сводки по вашим заказам.</p></div>
      {documents.length ? <div className="customer-document-list">{documents.map((item) => <button type="button" key={item.id} onClick={() => openDocument(item)}><span className="customer-document-icon"><FileText size={19} /></span><span><strong>{item.title}</strong><small>{item.subtitle}</small></span><Download size={17} /></button>)}</div> : <div className="customer-inline-empty">Документы появятся после создания заказа.</div>}
      <section className="customer-payment-unavailable"><CreditCard size={20} /><div><strong>Онлайн-оплата недоступна</strong><p>{invoiceMessage}</p></div></section>
      <section className="customer-document-note"><ShieldCheck size={17} /><span>В этом демо нет исходных PDF-файлов. Предпросмотр можно распечатать или сохранить как PDF; официальные акты и чеки будут доступны после подключения хранилища.</span></section>
    </>;
  } else if (screen === 'document' && selectedDocumentOrder && selectedDocument) {
    const content = docPreview?.order.id === selectedDocumentOrder.id ? docPreview : documentContent(selectedDocumentOrder, selectedDocument.kind);
    view = <>
      <button className="customer-back-button" type="button" onClick={() => goTo('documents')}><ArrowLeft size={16} />К документам</button>
      <div className="customer-page-title"><span className="customer-eyebrow">ПРЕДПРОСМОТР · {selectedDocument.orderId}</span><h1>{content.title}</h1><p>Информация из клиентского профиля. Не является официальной копией документа.</p></div>
      <section className="customer-document-preview"><div className="customer-document-brand">ТОКОХОД <span>· клиентский кабинет</span></div>{content.lines.map((line) => <div className="customer-document-preview-row" key={line}>{line}</div>)}{content.itemLines && <div className="customer-document-preview-lines">{content.itemLines.map((line, index) => <div key={`${line.title}-${index}`}><span>{line.title}<small>{line.quantity} × {formatRuble(line.price)}</small></span><strong>{formatRuble(line.quantity * line.price)}</strong></div>)}</div>}<p className="customer-document-disclaimer">Демо-предпросмотр. Оригинальный заказ-наряд, акт, гарантийный талон или чек доступен только из документа, выданного сервисом.</p></section>
      <button className="customer-primary-button" type="button" onClick={() => downloadDocument(selectedDocumentOrder, selectedDocument.kind)}><Download size={17} />Печать / сохранить как PDF</button>
    </>;
  } else if (screen === 'warranty') {
    const warrantyOrders = sortedOrders.filter((order) => order.warranty);
    view = <>
      <div className="customer-page-title"><span className="customer-eyebrow">ПОСЛЕ СЕРВИСА</span><h1>Гарантия и обращения</h1><p>Срок и покрытие смотрите в документе к конкретному заказу.</p></div>
      {warrantyOrders.length ? <div className="customer-warranty-list">{warrantyOrders.map((order) => <section className="customer-warranty-card" key={order.id}><div className="customer-warranty-heading"><span className="customer-warranty-icon"><ShieldCheck size={20} /></span><span><strong>{order.brand} {order.model}</strong><small>Заказ {order.id} · документ {order.warranty?.documentNumber}</small></span><span className={`customer-warranty-state${isWarrantyActive(order.warranty) ? ' active' : ''}`}>{isWarrantyActive(order.warranty) ? 'Действует по демо-данным' : 'Срок завершён'}</span></div><div className="customer-warranty-dates"><span>Работы до <strong>{formatWarrantyDate(order.warranty?.workUntil)}</strong></span>{order.warranty?.partsUntil && <span>Запчасти до <strong>{formatWarrantyDate(order.warranty.partsUntil)}</strong></span>}</div><div className="customer-warranty-cover"><strong>Работы</strong><span>{order.warranty?.coveredWork.join(', ') || 'Смотрите выданный документ'}</span><strong>Запчасти</strong><span>{order.warranty?.coveredParts.join(', ') || 'Смотрите выданный документ'}</span></div><p className="customer-demo-hint"><AlertTriangle size={15} />{order.warranty?.terms}</p><div className="customer-inline-actions"><button type="button" onClick={() => openDocument(documents.find((item) => item.orderId === order.id && item.kind === 'warranty')!)}>Открыть карточку <FileText size={16} /></button><button type="button" onClick={() => { setCaseOrderId(order.id); goTo('warranty'); document.getElementById('warranty-form')?.scrollIntoView({ behavior: 'smooth' }); }}>Создать обращение <ArrowRight size={16} /></button></div></section>)}</div> : <section className="customer-empty-card"><span className="customer-empty-icon"><ShieldCheck size={23} /></span><h2>Гарантийных документов пока нет</h2><p>Документ появится после выдачи заказа, если гарантия оформлена сервисом.</p></section>}
      <section className="customer-form-card" id="warranty-form"><div className="customer-form-heading"><span className="customer-eyebrow">ВОПРОС ПО ЗАКАЗУ</span><h2>Создать обращение</h2><p>Обращение будет связано только с выбранным заказом и потребует подтверждения сервисной командой.</p></div>
        <form onSubmit={createWarrantyCase}><label htmlFor="warranty-order">Заказ с гарантийным документом</label><select id="warranty-order" value={caseOrderId} onChange={(event) => setCaseOrderId(event.target.value)}><option value="">Выберите заказ</option>{warrantyOrders.map((order) => <option value={order.id} key={order.id}>{order.id} · {order.brand} {order.model}</option>)}</select><label htmlFor="warranty-description">Что случилось?</label><textarea id="warranty-description" rows={4} value={caseDescription} onChange={(event) => setCaseDescription(event.target.value)} placeholder="Опишите вопрос без попыток самостоятельно ремонтировать устройство." /><label htmlFor="warranty-photos">Фото для этого обращения (необязательно)</label><input id="warranty-photos" type="file" accept="image/*" multiple onChange={(event) => setCaseFiles(Array.from(event.target.files ?? []).map((file) => file.name))} /><p className="customer-demo-hint"><ShieldCheck size={15} />Файлы не загружаются и не передаются ИИ; в демо сохраняются только их имена локально.</p><button className="customer-primary-button" type="submit" disabled={!warrantyOrders.length}>Сохранить обращение <ArrowRight size={16} /></button></form>
      </section>
      {matchingCases.length > 0 && <section className="customer-portal-section"><div className="customer-section-heading"><div><span className="customer-eyebrow">ВАШИ ОБРАЩЕНИЯ</span><h2>История</h2></div></div><div className="customer-case-list">{matchingCases.map((item) => <article key={item.id}><strong>{item.orderId}</strong><span>{item.description}</span><small>{new Date(item.createdAt).toLocaleString('ru-RU')} · {item.status}</small></article>)}</div></section>}
    </>;
  } else if (screen === 'notifications') {
    view = <>
      <div className="customer-page-title"><span className="customer-eyebrow">НАСТРОЙКИ СВЯЗИ</span><h1>Уведомления</h1><p>Важные сообщения по ремонту остаются включены всегда.</p></div>
      <section className="customer-required-notifications"><div className="customer-required-title"><ShieldCheck size={20} /><div><strong>Обязательные сервисные уведомления</strong><small>Их нельзя отключить в клиентском кабинете</small></div></div>{requiredNotifications.map((item) => <div key={item}><CheckCircle2 size={17} /><span>{item}</span><strong>Всегда включены</strong></div>)}</section>
      <section className="customer-form-card customer-preferences"><div className="customer-form-heading"><span className="customer-eyebrow">НЕОБЯЗАТЕЛЬНЫЕ КАНАЛЫ</span><h2>Выберите способ связи</h2><p>Настройки сохраняются только в браузере; SMS, email, push и Telegram-провайдеры в демо не подключены.</p></div>{([['sms', 'SMS'], ['email', 'Электронная почта'], ['push', 'Push-уведомления'], ['telegram', 'Telegram'], ['serviceTips', 'Памятки по уходу']] as Array<[keyof NotificationPreferences, string]>).map(([key, label]) => <label className="customer-toggle-row" key={key}><span>{label}</span><input type="checkbox" checked={preferences[key]} onChange={(event) => updatePreference(key, event.target.checked)} /></label>)}</section>
      <div className="customer-privacy-note"><Bell size={15} /><span>Обязательные: новая смета, готовность, изменение срока, гарантийное обращение и важные сообщения.</span></div>
    </>;
  } else if (screen === 'help') {
    view = <>
      <div className="customer-page-title"><span className="customer-eyebrow">ПОДДЕРЖКА И УХОД</span><h1>Помощь по устройству</h1><p>Ответы берутся только из утверждённых памяток ТОКОХОД. Это не диагностика и не замена осмотра мастером.</p></div>
      <div className="customer-help-safety"><AlertTriangle size={19} /><div><strong>Есть запах, дым, нагрев, вздутие или следы влаги?</strong><p>Не используйте и не заряжайте устройство до осмотра. Для точной оценки требуется проверка мастером ТОКОХОД.</p><button type="button" onClick={() => goTo('chat')}>Связаться с сервисом <ArrowRight size={15} /></button></div></div>
      <div className="customer-help-actions"><button type="button" onClick={() => goTo('chat')}><MessageCircle size={19} /><span><strong>Написать в сервис</strong><small>Сообщение сохранится локально в демо</small></span><ArrowRight size={16} /></button><Link to="/contacts"><PhoneIcon /><span><strong>Контакты и адрес</strong><small>Открыть публичную страницу ТОКОХОД</small></span><ArrowRight size={16} /></Link></div>
      <section className="customer-knowledge-panel"><div className="customer-section-heading"><div><span className="customer-eyebrow">УТВЕРЖДЁННЫЕ МАТЕРИАЛЫ</span><h2>Памятки и безопасность</h2></div></div><KnowledgePanel role="client" /></section>
      <button className="customer-list-action" type="button" onClick={() => goTo('academy')}><span className="customer-list-action-icon"><GraduationCap size={19} /></span><span><strong>ТОКОХОД Академия</strong><small>Обучающие материалы для владельцев устройств</small></span><ArrowRight size={16} /></button>
    </>;
  } else if (screen === 'chat') {
    view = <>
      <button className="customer-back-button" type="button" onClick={() => goTo('help')}><ArrowLeft size={16} />Помощь</button>
      <div className="customer-page-title"><span className="customer-eyebrow">СВЯЗЬ С СЕРВИСОМ</span><h1>Сообщения</h1><p>{selectedOrder ? `Заказ ${selectedOrder.id} · ` : ''}Напишите вопрос, не отправляя личные данные или реквизиты.</p></div>
      <div className="customer-chat-demo-banner"><MessageCircle size={18} /><span>Чат с оператором не подключён. Сообщение будет сохранено только в этом браузере и не доставлено в сервис.</span></div>
      <section className="customer-chat-thread">{matchingMessages.filter((item) => !selectedOrder || !item.orderId || item.orderId === selectedOrder.id).length ? matchingMessages.filter((item) => !selectedOrder || !item.orderId || item.orderId === selectedOrder.id).slice().reverse().map((item) => <article className="customer-chat-message" key={item.id}><span>{item.direction === 'client' ? 'Вы' : 'ТОКОХОД'}</span><p>{item.text}</p><small>{new Date(item.createdAt).toLocaleString('ru-RU')}</small></article>) : <div className="customer-inline-empty">Сообщений пока нет.</div>}</section>
      <form className="customer-chat-form" onSubmit={sendMessage}><label htmlFor="customer-message">Ваше сообщение</label><textarea id="customer-message" rows={4} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="Опишите вопрос оператору…" /><button className="customer-primary-button" type="submit"><Send size={17} />Сохранить сообщение</button></form>
      <div className="customer-privacy-note"><ShieldCheck size={15} /><span>Не отправляйте платёжные реквизиты. Сообщение не уходит наружу и не передаётся ИИ в демо-версии.</span></div>
    </>;
  } else if (screen === 'profile') {
    view = <>
      <div className="customer-page-title"><span className="customer-eyebrow">МОИ ДАННЫЕ</span><h1>Профиль</h1><p>Данные кабинета используются для отображения связанных заказов.</p></div>
      <section className="customer-profile-card"><span className="customer-profile-avatar"><UserRound size={25} /></span><div><strong>{profileName}</strong><span>{formatPhone(authenticatedPhone)}</span><small>Профиль клиента · демо-вход</small></div></section>
      <div className="customer-profile-links"><button type="button" onClick={() => goTo('documents')}><FileText size={19} /><span><strong>Документы</strong><small>Сметы, сводки и гарантия</small></span><ArrowRight size={16} /></button><button type="button" onClick={() => goTo('warranty')}><ShieldCheck size={19} /><span><strong>Гарантия и обращения</strong><small>Сроки и история обращений</small></span><ArrowRight size={16} /></button><button type="button" onClick={() => goTo('notifications')}><Bell size={19} /><span><strong>Уведомления</strong><small>Обязательные сообщения включены</small></span><ArrowRight size={16} /></button><button type="button" onClick={() => goTo('academy')}><GraduationCap size={19} /><span><strong>Академия безопасности</strong><small>Обучающие материалы ТОКОХОД</small></span><ArrowRight size={16} /></button></div>
      <div className="customer-profile-actions">{showDemoRoleSwitch && <button type="button" onClick={onSwitchRole}>Сменить демо-роль</button>}<button type="button" onClick={logOut}><LogOut size={16} />Выйти из кабинета</button></div>
      <div className="customer-auth-privacy"><ShieldCheck size={16} /><span>В этой версии номер проверяется только локальным кодом 0000. Реальная авторизация, серверная изоляция, журналирование на сервере и интеграция каналов уведомлений требуют backend-а.</span></div>
    </>;
  } else if (screen === 'academy') {
    view = <><button className="customer-back-button" type="button" onClick={() => goTo('help')}><ArrowLeft size={16} />Помощь</button><div className="customer-page-title"><span className="customer-eyebrow">ТОКОХОД АКАДЕМИЯ</span><h1>Обучение владельца</h1><p>Только информационные материалы. При риске батареи самостоятельные действия запрещены.</p></div><AcademyPanel role="client" /><Link className="customer-list-action" to="/contacts"><span className="customer-list-action-icon"><MessageCircle size={19} /></span><span><strong>Задать вопрос сервису</strong><small>Связаться с командой ТОКОХОД</small></span><ArrowRight size={16} /></Link></>;
  }

  return shell(view);
}

function PhoneIcon() {
  return <Smartphone size={19} />;
}
