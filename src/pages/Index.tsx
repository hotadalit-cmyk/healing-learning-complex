import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ChangeEvent, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BatteryWarning,
  Bell,
  Bike,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  Gauge,
  Globe2,
  GraduationCap,
  History,
  Info,
  LayoutDashboard,
  Link2,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  QrCode,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CustomerPortal } from '@/components/CustomerPortal';
import AIWorkbench from '@/components/AIWorkbench';
import { AcademyPanel, AIJournalPanel, ContextualTip, KnowledgePanel } from '@/components/KnowledgeAcademy';
import { hasPassedCourse, redactPersonalData, type RequestDraft } from '@/lib/aiTools';
import {
  AUDIT_STORAGE_KEY,
  CLIENT_STORAGE_KEY,
  CONSENT_STORAGE_KEY,
  ORDER_STORAGE_KEY,
  PARTS_STORAGE_KEY,
  createHistoryEvent,
  formatRuble,
  loadFromStorage,
  nextStatus,
  saveToStorage,
  seedClients,
  seedFleets,
  seedOrders,
  seedParts,
  type BatteryAssessment,
  type Client,
  type EstimateLine,
  type HistoryEvent,
  type InventoryPart,
  type OrderStatus,
  type ServiceOrder,
} from '@/lib/tokoData';
import { PUBLIC_B2B_INQUIRIES_STORAGE_KEY, type PublicB2BInquiry } from '@/lib/publicSite';


type Section = 'overview' | 'orders' | 'clients' | 'devices' | 'inventory' | 'b2b' | 'reports' | 'settings' | 'ai' | 'knowledge' | 'academy' | 'ai-log';
type Role = 'owner' | 'operator' | 'master' | 'b2b' | 'client';
type OrderForm = {
  clientName: string;
  phone: string;
  email: string;
  deviceType: string;
  brand: string;
  model: string;
  issue: string;
  source: string;
  dueDate: string;
  accessories: string;
  defects: string;
};

const roleLabels: Record<Role, string> = {
  owner: 'Владелец',
  operator: 'Оператор',
  master: 'Мастер',
  b2b: 'B2B-клиент',
  client: 'Клиент',
};

const sectionInfo: Record<Section, { title: string; subtitle: string }> = {
  overview: { title: 'Обзор мастерской', subtitle: 'Главное за сегодня — заявки, загрузка и деньги под контролем.' },
  orders: { title: 'Заказ-наряды', subtitle: 'Вся работа мастерской — от заявки до выдачи техники.' },
  clients: { title: 'Клиенты', subtitle: 'Контакты, история обращений и связанные устройства.' },
  devices: { title: 'Устройства', subtitle: 'Техника клиентов и её сервисная история.' },
  inventory: { title: 'Склад запчастей', subtitle: 'Остатки, резервы и движение запчастей.' },
  b2b: { title: 'B2B-парки', subtitle: 'Сервис корпоративных парков и контроль SLA.' },
  reports: { title: 'Отчёты и аналитика', subtitle: 'Ключевые показатели мастерской за выбранный период.' },
  settings: { title: 'Настройки', subtitle: 'Доступы, сервисные процессы и параметры рабочего пространства.' },
  ai: { title: 'ИИ-помощник', subtitle: 'Локальные демонстрационные черновики с обязательной проверкой сотрудником.' },
  knowledge: { title: 'Утверждённая база знаний', subtitle: 'Поиск с цитатами по документам, разрешённым для выбранной роли.' },
  academy: { title: 'ТОКОХОД Академия', subtitle: 'Учебные модули, тесты, прогресс и назначения курсов.' },
  'ai-log': { title: 'Журнал ИИ-действий', subtitle: 'История черновиков, источников и подтверждений сотрудников.' },
};

const defaultForm: OrderForm = {
  clientName: '',
  phone: '',
  email: '',
  deviceType: 'Электросамокат',
  brand: '',
  model: '',
  issue: '',
  source: 'Телефон',
  dueDate: '',
  accessories: '',
  defects: '',
};

const navGroups: Array<{ label: string; items: Array<{ id: Section; label: string; icon: LucideIcon }> }> = [
  {
    label: 'РАБОЧАЯ ЗОНА',
    items: [
      { id: 'overview', label: 'Обзор', icon: LayoutDashboard },
      { id: 'orders', label: 'Заказы', icon: ClipboardList },
      { id: 'clients', label: 'Клиенты', icon: Users },
      { id: 'devices', label: 'Устройства', icon: Bike },
    ],
  },
  {
    label: 'УПРАВЛЕНИЕ',
    items: [
      { id: 'inventory', label: 'Склад', icon: Package },
      { id: 'b2b', label: 'B2B-парки', icon: BriefcaseBusiness },
      { id: 'reports', label: 'Отчёты', icon: TrendingUp },
    ],
  },
  {
    label: 'ПОМОЩЬ И ОБУЧЕНИЕ',
    items: [
      { id: 'ai', label: 'ИИ-помощник', icon: Sparkles },
      { id: 'knowledge', label: 'База знаний', icon: BookOpen },
      { id: 'academy', label: 'Академия', icon: GraduationCap },
      { id: 'ai-log', label: 'Журнал ИИ', icon: History },
    ],
  },
];

const batteryFlags: Array<{ key: keyof Omit<BatteryAssessment, 'decision' | 'note'>; label: string }> = [
  { key: 'swelling', label: 'Вздутие аккумулятора' },
  { key: 'caseDamage', label: 'Повреждение корпуса' },
  { key: 'heatMarks', label: 'Следы перегрева' },
  { key: 'odor', label: 'Необычный запах' },
  { key: 'moisture', label: 'Следы влаги' },
  { key: 'insulation', label: 'Нарушение изоляции' },
];

const safeText = (value: string | undefined) => value?.trim() || '—';
const orderTotal = (lines: EstimateLine[]) => lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

function ActionButton({
  children,
  variant = 'primary',
  icon: Icon,
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'; icon?: LucideIcon }) {
  return (
    <button type={type} className={`action-button action-${variant} ${className}`} {...props}>
      {Icon && <Icon size={17} strokeWidth={1.9} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

function IconButton({ icon: Icon, label, className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button type={type} className={`icon-button ${className}`} aria-label={label} title={label} {...props}>
      <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const classByStatus: Record<OrderStatus, string> = {
    'Новая заявка': 'status-new',
    'Ожидает приёмки': 'status-waiting',
    'Принято': 'status-received',
    'Диагностика': 'status-diagnostic',
    'Ожидает согласования': 'status-approval',
    'В работе': 'status-progress',
    'Готово к выдаче': 'status-ready',
    'Выдано': 'status-done',
    'Гарантийное обращение': 'status-warranty',
    'Отказ / не ремонтируется': 'status-rejected',
  };
  const iconByStatus: Record<OrderStatus, LucideIcon> = {
    'Новая заявка': ClipboardList,
    'Ожидает приёмки': Clock3,
    'Принято': CheckCircle2,
    'Диагностика': Wrench,
    'Ожидает согласования': FileCheck2,
    'В работе': Wrench,
    'Готово к выдаче': CheckCheck,
    'Выдано': CheckCircle2,
    'Гарантийное обращение': ShieldCheck,
    'Отказ / не ремонтируется': AlertTriangle,
  };
  const StatusIcon = iconByStatus[status];
  return <span className={`status-badge ${classByStatus[status]}`}><StatusIcon size={12} strokeWidth={2.2} aria-hidden="true" />{status}</span>;
}

function Modal({ open, onClose, children, className = '', labelledBy }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; labelledBy?: string }) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal-panel ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </section>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-heading-actions">{actions}</div>}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, change, tone = 'green', detail }: { icon: LucideIcon; label: string; value: string; change?: string; tone?: 'green' | 'orange' | 'blue' | 'dark'; detail?: string }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-icon-${tone}`}><Icon size={19} strokeWidth={1.9} /></div>
      {change && <span className="metric-change"><ArrowUpRight size={13} />{change}</span>}
      <p className="metric-label">{label}</p>
      <div className="metric-value">{value}</div>
      {detail && <p className="metric-detail">{detail}</p>}
    </article>
  );
}

function calendarDateForOrder(order: ServiceOrder, now: Date) {
  const due = order.dueDate.toLowerCase();
  if (due.includes('сегодня')) return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (due.includes('завтра')) return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (due.includes('просрочен')) return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const dateMatch = due.match(/(\d{1,2})\s+([а-яё]+)/i);
  if (!dateMatch) return null;
  const monthIndexByPrefix: Record<string, number> = { янв: 0, фев: 1, мар: 2, апр: 3, май: 4, мая: 4, июн: 5, июл: 6, авг: 7, сен: 8, сент: 8, окт: 9, ноя: 10, дек: 11 };
  const monthPrefix = dateMatch[2].replace('.', '').slice(0, 4);
  const monthIndex = monthIndexByPrefix[monthPrefix] ?? monthIndexByPrefix[monthPrefix.slice(0, 3)] ?? -1;
  if (monthIndex < 0) return null;
  return new Date(now.getFullYear(), monthIndex, Number(dateMatch[1]));
}

function MiniCalendar({ orders }: { orders: ServiceOrder[] }) {
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const today = new Date();
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: cellCount }, (_, index) => new Date(year, month, index - offset + 1));
  const monthLabel = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(monthCursor);
  const appointmentKeys = new Set(orders.map((order) => calendarDateForOrder(order, today)).filter((date): date is Date => !!date).map((date) => date.toDateString()));
  const selectedCount = orders.filter((order) => calendarDateForOrder(order, today)?.toDateString() === selectedDate.toDateString()).length;
  const selectedHasAppointments = appointmentKeys.has(selectedDate.toDateString());

  return (
    <section className="panel calendar-panel">
      <div className="calendar-heading">
        <div><span className="section-kicker">РАСПИСАНИЕ</span><h2>{monthLabel.charAt(0).toLocaleUpperCase('ru-RU') + monthLabel.slice(1)}</h2></div>
        <div className="calendar-controls">
          <button aria-label="Предыдущий месяц" onClick={() => setMonthCursor((value) => new Date(value.getFullYear(), value.getMonth() - 1, 1))}><ChevronLeft size={16} /></button>
          <button aria-label="Следующий месяц" onClick={() => setMonthCursor((value) => new Date(value.getFullYear(), value.getMonth() + 1, 1))}><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="calendar-weekdays">{['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="calendar-grid">
        {cells.map((date) => {
          const inMonth = date.getMonth() === month;
          const isToday = date.toDateString() === today.toDateString();
          const isSelected = date.toDateString() === selectedDate.toDateString();
          const hasAppointment = inMonth && appointmentKeys.has(date.toDateString());
          return <button key={date.toISOString()} className={`${inMonth ? '' : 'outside-month'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasAppointment ? 'has-appointment' : ''}`} onClick={() => setSelectedDate(date)} aria-pressed={isSelected} aria-current={isToday ? 'date' : undefined} aria-label={date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}>
            <span>{date.getDate()}</span>{hasAppointment && <i />}
          </button>;
        })}
      </div>
      <div className="calendar-selected-note"><CalendarDays size={14} /><span>{selectedDate.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })} · {selectedHasAppointments ? `${selectedCount} ${selectedCount === 1 ? 'запись' : selectedCount < 5 ? 'записи' : 'записей'}` : 'нет запланированных записей'}</span></div>
    </section>
  );
}

function OrderTable({
  orders,
  onOpen,
  compact = false,
  onNew,
}: {
  orders: ServiceOrder[];
  onOpen: (order: ServiceOrder) => void;
  compact?: boolean;
  onNew?: () => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><ClipboardList size={24} /></div>
        <strong>Заказов пока нет</strong>
        <p>Попробуйте изменить фильтр или создайте первый заказ-наряд.</p>
        {onNew && <ActionButton icon={Plus} onClick={onNew}>Создать заказ</ActionButton>}
      </div>
    );
  }
  return (
    <div className={`table-scroll ${compact ? 'table-compact' : ''}`}>
      <table className="data-table orders-table">
        <thead>
          <tr>
            <th>Заказ</th>
            <th>{compact ? 'Клиент и устройство' : 'Клиент'}</th>
            {!compact && <th>Устройство</th>}
            {!compact && <th>Неисправность</th>}
            <th>Статус</th>
            {!compact && <th>Мастер</th>}
            <th>Срок</th>
            <th className="align-right">Сумма</th>
            <th aria-label="Действия" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} onClick={() => onOpen(order)} className="clickable-row">
              <td>
                <strong className="order-id">{order.id}</strong>
                <span className="cell-subtext">{order.createdAt}</span>
              </td>
              <td>
                <div className="client-device-cell">
                  <span className="client-name">{order.clientName}</span>
                  {compact && <span className="cell-subtext">{order.brand} {order.model}</span>}
                </div>
              </td>
              {!compact && <td className="table-device-cell"><strong>{order.brand} {order.model}</strong><span>{order.deviceType}</span></td>}
              {!compact && <td className="issue-cell" title={order.issue}>{order.issue}</td>}
              <td><StatusBadge status={order.status} /></td>
              {!compact && <td><span className="master-name">{order.master}</span></td>}
              <td><span className={order.dueDate.includes('Просрочен') ? 'due-overdue' : 'due-date'}>{order.dueDate}</span></td>
              <td className="align-right"><strong className="table-amount">{formatRuble(order.amount)}</strong></td>
              <td><IconButton icon={MoreHorizontal} label={`Открыть ${order.id}`} onClick={(event) => { event.stopPropagation(); onOpen(order); }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDateLong() {
  return new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
}

function makeNewOrderId(orders: ServiceOrder[]) {
  const current = Math.max(2846, ...orders.map((order) => Number(order.id.replace(/\D/g, '')) || 0));
  return `ТО-${current + 1}`;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escapeCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const content = [headers, ...rows].map((row) => row.map(escapeCell).join(';')).join('\r\n');
  const blob = new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Index() {
  const [section, setSection] = useState<Section>('overview');
  const [role, setRole] = useState<Role>('owner');
  const [orders, setOrders] = useState<ServiceOrder[]>(() => loadFromStorage(ORDER_STORAGE_KEY, seedOrders));
  const [clients, setClients] = useState<Client[]>(() => loadFromStorage(CLIENT_STORAGE_KEY, seedClients));
  const [publicB2BInquiries, setPublicB2BInquiries] = useState<PublicB2BInquiry[]>(() => loadFromStorage(PUBLIC_B2B_INQUIRIES_STORAGE_KEY, []));
  const [parts, setParts] = useState<InventoryPart[]>(() => loadFromStorage(PARTS_STORAGE_KEY, seedParts));
  const [audit, setAudit] = useState<HistoryEvent[]>(() => loadFromStorage(AUDIT_STORAGE_KEY, [
    createHistoryEvent('Ольга С.', 'Заказ ТО-2846 создан', 'Входящая заявка через QR-код'),
    createHistoryEvent('Денис П.', 'Смета v2 отправлена клиенту', 'ТО-2845 · 8 420 ₽'),
    createHistoryEvent('Анна, ЭкоЛогистика', 'Смета v1 согласована', 'ТО-2844 · 6 800 ₽'),
    createHistoryEvent('Ольга С.', 'Устройство принято', 'ТО-2846 · Xiaomi 4 Pro'),
  ]));
  const [search, setSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState('Все');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'card' | 'estimate' | 'history'>('card');
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [form, setForm] = useState<OrderForm>(defaultForm);
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [quoteDraft, setQuoteDraft] = useState<EstimateLine[]>([]);
  const [reservationPart, setReservationPart] = useState<InventoryPart | null>(null);
  const [reservationOrderId, setReservationOrderId] = useState('');
  const [reservationQty, setReservationQty] = useState('1');
  const [writeOffPart, setWriteOffPart] = useState<InventoryPart | null>(null);
  const [writeOffOrderId, setWriteOffOrderId] = useState('');
  const [batteryEditing, setBatteryEditing] = useState(false);
  const [batteryDraft, setBatteryDraft] = useState<BatteryAssessment | null>(null);
  const [activeClient, setActiveClient] = useState<Client | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [knowledgeQuery, setKnowledgeQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);

  const activeOrder = orders.find((order) => order.id === activeOrderId) ?? null;
  const activeOrderHasBatteryFlags = activeOrder ? batteryFlags.some(({ key }) => activeOrder.battery[key]) : false;
  const activeOrderIssueSuggestsBatteryRisk = Boolean(activeOrder && /вздут|батар|аккумулятор|перегрев|нагрев|запах|дым|влаг|намок|дожд/i.test(activeOrder.issue));
  const activeOrderNeedsBatteryGate = activeOrderHasBatteryFlags || activeOrderIssueSuggestsBatteryRisk;
  const activeOrderBatteryRisk = activeOrderHasBatteryFlags || (activeOrderIssueSuggestsBatteryRisk && activeOrder?.battery.decision !== 'Риск не выявлен');
  const activeOrderBatteryCleared = Boolean(activeOrder && !activeOrderHasBatteryFlags && activeOrder.battery.decision === 'Риск не выявлен');
  const hasBatteryTraining = (role === 'owner' || role === 'master') && hasPassedCourse(role, 'battery-safety');
  const batteryTrainingRequired = (role === 'owner' || role === 'master') && !hasBatteryTraining;
  const activeOrderWorkBlocked = Boolean(activeOrder && nextStatus(activeOrder.status) === 'В работе' && activeOrderNeedsBatteryGate && (!activeOrderBatteryCleared || batteryTrainingRequired));
  const roleName = roleLabels[role];
  const isB2BRole = role === 'b2b';
  const visibleOrders = useMemo(
    () => isB2BRole
      ? orders.filter((order) => order.companyId === 'fleet-eco')
      : role === 'master'
        ? orders.filter((order) => order.master === 'Илья К.')
        : role === 'client'
          ? orders.filter((order) => order.clientName === 'Алина Смирнова')
          : orders,
    [isB2BRole, orders, role],
  );
  const availableSections = useMemo<Section[]>(() => role === 'client'
    ? ['overview']
    : role === 'b2b'
      ? ['b2b', 'orders', 'ai', 'knowledge', 'academy']
      : role === 'master'
        ? ['overview', 'orders', 'devices', 'ai', 'knowledge', 'academy']
        : role === 'operator'
          ? ['overview', 'orders', 'clients', 'devices', 'inventory', 'b2b', 'ai', 'knowledge', 'academy']
          : ['overview', 'orders', 'clients', 'devices', 'inventory', 'b2b', 'reports', 'settings', 'ai', 'knowledge', 'academy', 'ai-log'], [role]);

  useEffect(() => {
    document.title = 'Рабочая панель · демо — ТОКОХОД';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex,nofollow';
  }, []);
  useEffect(() => saveToStorage(ORDER_STORAGE_KEY, orders), [orders]);
  useEffect(() => saveToStorage(CLIENT_STORAGE_KEY, clients), [clients]);
  useEffect(() => saveToStorage(PARTS_STORAGE_KEY, parts), [parts]);
  useEffect(() => saveToStorage(AUDIT_STORAGE_KEY, audit.slice(0, 80)), [audit]);

  useEffect(() => {
    const syncStorage = (event: StorageEvent) => {
      if (event.key === ORDER_STORAGE_KEY) setOrders(loadFromStorage(ORDER_STORAGE_KEY, seedOrders));
      if (event.key === CLIENT_STORAGE_KEY) setClients(loadFromStorage(CLIENT_STORAGE_KEY, seedClients));
      if (event.key === PUBLIC_B2B_INQUIRIES_STORAGE_KEY) setPublicB2BInquiries(loadFromStorage(PUBLIC_B2B_INQUIRIES_STORAGE_KEY, []));
      if (event.key === PARTS_STORAGE_KEY) setParts(loadFromStorage(PARTS_STORAGE_KEY, seedParts));
      if (event.key === AUDIT_STORAGE_KEY) setAudit(loadFromStorage(AUDIT_STORAGE_KEY, []));
    };
    window.addEventListener('storage', syncStorage);
    return () => window.removeEventListener('storage', syncStorage);
  }, []);

  useEffect(() => {
    if (!availableSections.includes(section)) setSection(availableSections[0]);
  }, [availableSections, section]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(''), 3400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const addAudit = (event: HistoryEvent) => {
    setAudit((previous) => [event, ...previous].slice(0, 80));
  };

  const markPublicB2BInquiryInProgress = (id: string) => {
    if (role !== 'owner' && role !== 'operator') return;
    const inquiry = publicB2BInquiries.find((item) => item.id === id);
    if (!inquiry || inquiry.status === 'В работе') return;
    const updated = publicB2BInquiries.map((item) => item.id === id ? { ...item, status: 'В работе' as const } : item);
    saveToStorage(PUBLIC_B2B_INQUIRIES_STORAGE_KEY, updated);
    setPublicB2BInquiries(updated);
    const event = createHistoryEvent(roleName, 'B2B-запрос взят в работу', `${inquiry.id} · ${inquiry.companyName}`);
    addAudit(event);
    setToast(`${inquiry.id}: локальный статус изменён на «В работе».`);
  };

  const commitOrderUpdate = (id: string, action: string, update: (order: ServiceOrder) => ServiceOrder, note?: string) => {
    const event = createHistoryEvent(roleName, action, note);
    setOrders((previous) => previous.map((order) => order.id === id
      ? { ...update(order), history: [event, ...order.history] }
      : order));
    addAudit(event);
  };

  const recordCustomerQuoteDecision = (orderId: string, decision: 'Согласована' | 'Отклонена') => {
    const order = orders.find((item) => item.id === orderId);
    if (!order || order.status !== 'Ожидает согласования' || !order.estimateVersion) {
      setToast('Смета изменилась или заказ недоступен. Обновите кабинет и проверьте новую версию.');
      return;
    }
    const now = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace('.', '');
    const currentTotal = order.amount ?? order.estimateLines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    const existing = order.estimateHistory ?? [];
    const snapshot = existing.find((item) => item.version === order.estimateVersion) ?? {
      version: order.estimateVersion,
      createdAt: order.createdAt,
      lines: order.estimateLines,
      total: currentTotal,
      decision: order.quoteDecision ?? 'Ожидает ответа' as const,
      decidedAt: order.quoteDecidedAt,
    };
    const estimateHistory = [
      ...existing.filter((item) => item.version !== order.estimateVersion),
      { ...snapshot, decision, decidedAt: now },
    ].sort((a, b) => a.version - b.version);
    const event = createHistoryEvent(roleName, `Клиент ${decision.toLowerCase()} смету v${order.estimateVersion}`, `${order.id} · ${formatRuble(currentTotal)} · ${now}`);
    setOrders((previous) => previous.map((item) => item.id === orderId ? {
      ...item,
      quoteDecision: decision,
      quoteDecidedAt: now,
      estimateHistory,
      history: [event, ...item.history],
    } : item));
    addAudit(event);
    setToast(decision === 'Согласована' ? `Смета v${order.estimateVersion} сохранена в демо-журнале.` : `Отказ от сметы v${order.estimateVersion} сохранён локально; уведомление сервису не отправлено.`);
  };

  const selectSection = (next: Section) => {
    setSection(next);
    setMobileNavOpen(false);
    setSearch('');
  };

  const changeRole = (nextRole: Role) => {
    setRole(nextRole);
    setRoleMenuOpen(false);
    setSection(nextRole === 'b2b' ? 'b2b' : nextRole === 'master' ? 'orders' : 'overview');
    setActiveOrderId(null);
    setToast(`Режим просмотра: ${roleLabels[nextRole]}`);
  };

  const openOrder = (order: ServiceOrder) => {
    setActiveOrderId(order.id);
    setDetailTab('card');
    setBatteryEditing(false);
    setBatteryDraft(order.battery);
  };

  const openNewOrder = () => {
    setForm(role === 'b2b' ? { ...defaultForm, clientName: 'ЭкоЛогистика', phone: '+7 8162 55-20-10', source: 'B2B-парк' } : defaultForm);
    setPhotoNames([]);
    setConsentChecked(false);
    setNewOrderOpen(true);
  };

  const onPhotoSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const accepted = files.filter((file) => file.type.startsWith('image/'));
    setPhotoNames((previous) => [...previous, ...accepted.map((file) => file.name)].slice(0, 5));
    if (accepted.length < files.length) setToast('Добавить можно только фотографии в формате JPG, PNG или HEIC.');
    event.target.value = '';
  };

  const submitNewOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consentChecked) {
      setToast('Для сохранения заявки отметьте согласие на обработку данных.');
      return;
    }
    const id = makeNewOrderId(orders);
    const eventItem = createHistoryEvent(roleName, 'Создан заказ-наряд', `Источник: ${form.source}`);
    const newOrder: ServiceOrder = {
      id,
      createdAt: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace('.', ''),
      clientName: form.clientName.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      companyId: role === 'b2b' ? 'fleet-eco' : undefined,
      deviceType: form.deviceType,
      brand: form.brand.trim() || 'Не указана',
      model: form.model.trim() || 'Модель не указана',
      qrId: `TK-${new Date().getFullYear().toString().slice(-2)}-${id.slice(-4)}`,
      issue: form.issue.trim(),
      status: 'Новая заявка',
      source: form.source,
      master: '—',
      dueDate: form.dueDate ? new Date(form.dueDate).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Без срока',
      estimateVersion: 0,
      estimateLines: [],
      battery: { swelling: false, caseDamage: false, heatMarks: false, odor: false, moisture: false, insulation: false, decision: 'Не оценена' },
      accessories: form.accessories.split(',').map((item) => item.trim()).filter(Boolean),
      defects: form.defects.split(',').map((item) => item.trim()).filter(Boolean),
      photos: photoNames,
      reservedParts: [],
      history: [eventItem],
    };
    setOrders((previous) => [newOrder, ...previous]);
    addAudit(eventItem);
    const consents = loadFromStorage<Array<{ orderId: string; acceptedAt: string; version: string }>>(CONSENT_STORAGE_KEY, []);
    saveToStorage(CONSENT_STORAGE_KEY, [{ orderId: id, acceptedAt: new Date().toISOString(), version: 'privacy-2026-01' }, ...consents]);
    setNewOrderOpen(false);
    setSection('orders');
    setOrderFilter('Все');
    setActiveOrderId(id);
    setToast(`Заявка ${id} добавлена в систему.`);
  };

  const advanceOrder = (order: ServiceOrder) => {
    const status = nextStatus(order.status);
    if (!status) return;
    const hasBatteryFlags = batteryFlags.some(({ key }) => order.battery[key]);
    const issueSuggestsRisk = /вздут|батар|аккумулятор|перегрев|нагрев|запах|дым|влаг|намок|дожд/i.test(order.issue);
    const batteryCheckRequired = hasBatteryFlags || issueSuggestsRisk;
    const batteryCheckCleared = !hasBatteryFlags && order.battery.decision === 'Риск не выявлен';
    const requiredRoleNeedsTraining = (role === 'owner' || role === 'master') && !hasPassedCourse(role, 'battery-safety');
    if (status === 'В работе' && batteryCheckRequired && (!batteryCheckCleared || requiredRoleNeedsTraining)) {
      setToast('Переход к работам заблокирован: нужна оценка ответственного мастера и успешный курс по батареям (≥80%) для ответственной роли. Не заряжайте и не вскрывайте устройство.');
      return;
    }
    commitOrderUpdate(order.id, `Статус изменён: ${status}`, (current) => ({ ...current, status }), `Предыдущий статус: ${order.status}`);
    setToast(`${order.id}: статус «${status}».`);
  };

  const openQuoteEditor = () => {
    if (!activeOrder) return;
    if (activeOrder.quoteDecision === 'Согласована' && !window.confirm(`Изменение согласованной суммы создаст смету v${activeOrder.estimateVersion + 1}. Предыдущая версия останется в истории, клиенту потребуется согласовать новую. Продолжить?`)) return;
    setQuoteDraft(activeOrder.estimateLines.length
      ? activeOrder.estimateLines.map((line) => ({ ...line }))
      : [{ title: 'Диагностика и дефектовка', kind: 'Работа', quantity: 1, price: 1200 }]);
    setQuoteOpen(true);
  };

  const saveQuote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeOrder) return;
    const lines = quoteDraft.filter((line) => line.title.trim() && line.price > 0 && line.quantity > 0);
    if (lines.length === 0) {
      setToast('Добавьте в смету хотя бы одну работу или запчасть.');
      return;
    }
    const total = orderTotal(lines);
    const version = activeOrder.estimateVersion + 1;
    const now = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace('.', '');
    const oldHistory = activeOrder.estimateHistory ?? (activeOrder.estimateVersion > 0 ? [{
      version: activeOrder.estimateVersion,
      createdAt: activeOrder.history.find((item) => item.action.toLowerCase().includes('смет'))?.at ?? activeOrder.createdAt,
      lines: activeOrder.estimateLines,
      total: orderTotal(activeOrder.estimateLines),
      decision: activeOrder.quoteDecision ?? 'Ожидает ответа' as const,
      decidedAt: activeOrder.quoteDecidedAt,
    }] : []);
    commitOrderUpdate(activeOrder.id, `Создана смета v${version}`, (current) => ({
      ...current,
      estimateVersion: version,
      estimateLines: lines,
      estimateHistory: [...oldHistory, { version, createdAt: now, lines, total, decision: 'Ожидает ответа' }],
      amount: total,
      quoteDecision: undefined,
      quoteDecidedAt: undefined,
      status: 'Ожидает согласования',
    }), `${formatRuble(total)} · отправлена клиенту`);
    setQuoteOpen(false);
    setToast(`Смета v${version} сохранена. Состав и сумма предыдущих версий не изменяются.`);
  };

  const copyStatusLink = async (order: ServiceOrder) => {
    const url = `${window.location.origin}/status/${encodeURIComponent(order.id)}`;
    if (!order.publicStatusEnabled) {
      const event = createHistoryEvent(roleName, 'Публичная ссылка статуса активирована', order.id);
      setOrders((previous) => previous.map((current) => current.id === order.id ? { ...current, publicStatusEnabled: true, history: [event, ...current.history] } : current));
      addAudit(event);
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast('Ссылка на статус ремонта скопирована.');
    } catch {
      window.prompt('Скопируйте ссылку для клиента:', url);
    }
  };

  const copyQuoteLink = async (order: ServiceOrder) => {
    const url = `${window.location.origin}/estimate/${encodeURIComponent(order.id)}?v=${order.estimateVersion}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast('Ссылка на согласование скопирована.');
    } catch {
      window.prompt('Скопируйте ссылку для клиента:', url);
    }
  };

  const saveBatteryRisk = () => {
    if (!activeOrder || !batteryDraft) return;
    const hasRisk = batteryFlags.some(({ key }) => batteryDraft[key]);
    const event = createHistoryEvent(roleName, 'Оценка риска аккумулятора сохранена', batteryDraft.decision);
    commitOrderUpdate(activeOrder.id, event.action, (current) => ({ ...current, battery: batteryDraft }), batteryDraft.decision);
    setBatteryEditing(false);
    setToast(hasRisk ? 'Риск зафиксирован. Следуйте безопасному решению мастера.' : 'Оценка аккумулятора сохранена.');
  };

  const reservePart = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reservationPart || !reservationOrderId) return;
    const quantity = Math.max(1, Number(reservationQty) || 1);
    const currentPart = parts.find((part) => part.id === reservationPart.id);
    const order = orders.find((item) => item.id === reservationOrderId);
    if (!currentPart || !order || currentPart.stock - currentPart.reserved < quantity) {
      setToast('Недостаточно свободного остатка для резерва.');
      return;
    }
    setParts((previous) => previous.map((part) => part.id === currentPart.id ? { ...part, reserved: part.reserved + quantity } : part));
    const existing = order.reservedParts.find((entry) => entry.partId === currentPart.id);
    const eventItem = createHistoryEvent(roleName, 'Запчасть зарезервирована', `${currentPart.name} × ${quantity}`);
    setOrders((previous) => previous.map((item) => item.id !== order.id ? item : {
      ...item,
      reservedParts: existing
        ? item.reservedParts.map((entry) => entry.partId === currentPart.id ? { ...entry, quantity: entry.quantity + quantity } : entry)
        : [...item.reservedParts, { partId: currentPart.id, quantity }],
      history: [eventItem, ...item.history],
    }));
    addAudit(eventItem);
    setReservationPart(null);
    setToast(`${currentPart.name} зарезервирован под ${order.id}.`);
  };

  const writeOffReservedPart = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!writeOffPart || !writeOffOrderId) return;
    const order = orders.find((item) => item.id === writeOffOrderId);
    const part = parts.find((item) => item.id === writeOffPart.id);
    if (!order || !part || part.stock < 1) return;
    const reservedLine = order.reservedParts.find((entry) => entry.partId === part.id && entry.quantity > 0);
    if (!reservedLine && part.stock - part.reserved < 1) {
      setToast('Нет свободного остатка или резерва под выбранный заказ.');
      return;
    }
    setParts((previous) => previous.map((item) => item.id !== part.id ? item : {
      ...item,
      stock: item.stock - 1,
      reserved: reservedLine ? Math.max(0, item.reserved - 1) : item.reserved,
    }));
    const eventItem = createHistoryEvent(roleName, 'Запчасть списана по заказу', `${part.name} · ${order.id}`);
    setOrders((previous) => previous.map((item) => item.id !== order.id ? item : {
      ...item,
      reservedParts: item.reservedParts
        .map((entry) => entry.partId === part.id ? { ...entry, quantity: Math.max(0, entry.quantity - 1) } : entry)
        .filter((entry) => entry.quantity > 0),
      history: [eventItem, ...item.history],
    }));
    addAudit(eventItem);
    setWriteOffPart(null);
    setToast(`${part.name} списана со склада по ${order.id}.`);
  };

  const exportOrders = () => {
    downloadCsv('tokohod-zakazy.csv', ['Заказ', 'Дата', 'Клиент', 'Телефон', 'Устройство', 'Статус', 'Мастер', 'Срок', 'Сумма', 'Источник'], visibleOrders.map((order) => [
      order.id, order.createdAt, order.clientName, order.phone, `${order.brand} ${order.model}`, order.status, order.master, order.dueDate, order.amount ?? '', order.source,
    ]));
    setToast('Экспорт заказов подготовлен в CSV для Excel.');
  };

  const filteredVisibleOrders = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    return visibleOrders.filter((order) => {
      const matchesSearch = !lowerSearch || [order.id, order.clientName, order.phone, order.brand, order.model, order.issue].some((value) => value.toLowerCase().includes(lowerSearch));
      const matchesFilter = orderFilter === 'Все'
        || (orderFilter === 'В работе' && ['Принято', 'Диагностика', 'В работе'].includes(order.status))
        || (orderFilter === 'Согласование' && order.status === 'Ожидает согласования')
        || (orderFilter === 'К выдаче' && order.status === 'Готово к выдаче')
        || (orderFilter === 'Гарантия' && order.status === 'Гарантийное обращение')
        || (orderFilter === 'Новые' && ['Новая заявка', 'Ожидает приёмки'].includes(order.status))
        || (orderFilter === 'Просрочка' && order.dueDate.includes('Просрочен'));
      return matchesSearch && matchesFilter;
    });
  }, [orderFilter, search, visibleOrders]);

  const filteredClients = useMemo(() => clients.filter((client) => {
    const q = search.toLowerCase();
    return !q || [client.name, client.phone, client.email].some((text) => text.toLowerCase().includes(q));
  }), [clients, search]);

  const page = sectionInfo[section];
  const lowStockParts = parts.filter((part) => part.stock - part.reserved <= part.minStock);
  const orderCounts = {
    new: visibleOrders.filter((order) => order.status === 'Новая заявка' || order.status === 'Ожидает приёмки').length,
    approval: visibleOrders.filter((order) => order.status === 'Ожидает согласования').length,
    ready: visibleOrders.filter((order) => order.status === 'Готово к выдаче').length,
    active: visibleOrders.filter((order) => ['Принято', 'Диагностика', 'В работе'].includes(order.status)).length,
    overdue: visibleOrders.filter((order) => order.dueDate.includes('Просрочен')).length,
  };
  const pendingWebsiteOrders = orders.filter((order) => order.source === 'Сайт' && order.status === 'Новая заявка');
  const pendingWebsiteB2B = publicB2BInquiries.filter((inquiry) => inquiry.status === 'Новая заявка');
  const localIncomingCount = role === 'owner' || role === 'operator' ? pendingWebsiteOrders.length + pendingWebsiteB2B.length : 0;

  const renderDashboard = () => (
    <>
      <PageHeading
        eyebrow={formatDateLong().toLocaleUpperCase('ru-RU')}
        title={isB2BRole ? 'Добро пожаловать в кабинет парка' : role === 'operator' ? 'Доброе утро, Ольга' : role === 'master' ? 'Доброе утро, Илья' : 'Доброе утро, Алексей'}
        description={isB2BRole ? 'Статусы техники, согласования и документы вашей компании.' : role === 'owner' ? 'Мастерская в ритме. Вот что важно не упустить сегодня.' : 'Ваши задачи на сегодня и заказы, которые требуют внимания.'}
        actions={isB2BRole ? <ActionButton icon={Plus} onClick={openNewOrder}>Новая заявка</ActionButton> : <ActionButton icon={Plus} onClick={openNewOrder}>Новый заказ</ActionButton>}
      />
      {isB2BRole ? (
        <div className="b2b-overview-grid">
          <MetricCard icon={Bike} label="Техника в парке" value="24" detail="22 на линии · 2 в сервисе" tone="green" />
          <MetricCard icon={ClipboardList} label="Активные заявки" value={String(visibleOrders.length)} detail="По всем адресам обслуживания" tone="blue" />
          <MetricCard icon={Clock3} label="SLA за месяц" value="94%" change="+4,2%" detail="Цель по договору — 90%" tone="orange" />
          <B2BPanel orders={visibleOrders} onOpen={openOrder} />
        </div>
      ) : (
        <>
          {role === 'owner' ? (
            <>
              <div className="metric-grid dashboard-kpis">
                <MetricCard icon={ClipboardList} label="Заявки" value="24" change="+12%" tone="blue" detail="за выбранный период" />
                <MetricCard icon={Wrench} label="В работе" value="16" change="+7%" tone="blue" detail="заказов сейчас" />
                <MetricCard icon={CheckCircle2} label="Готово" value="6" change="+20%" tone="green" detail="можно выдавать" />
                <MetricCard icon={Wallet} label="Выручка" value="420 000 ₽" change="+18%" tone="dark" detail="за выбранный период" />
              </div>
              <section className="dashboard-alert" role="status">
                <span className="dashboard-alert-icon"><AlertTriangle size={22} /></span>
                <div><strong>3 заявки превышают SLA</strong><p>Требуется внимание сервисной команды.</p></div>
                <button className="dashboard-alert-action" onClick={() => { setOrderFilter('Просрочка'); selectSection('orders'); }}>Проверить <ArrowRight size={16} /></button>
              </section>
            </>
          ) : (
            <div className="metric-grid">
              <MetricCard icon={ClipboardList} label="Новые заявки" value={String(orderCounts.new)} tone="blue" detail="Доступные вам заявки" />
              <MetricCard icon={Clock3} label="Ждут согласования" value={String(orderCounts.approval)} tone="orange" detail="Сметы, ожидающие ответа" />
              <MetricCard icon={AlertCircle} label="Просрочено" value={String(orderCounts.overdue)} tone="orange" detail="По вашим заказам" />
              <MetricCard icon={CheckCheck} label="Готово к выдаче" value={String(orderCounts.ready)} tone="green" detail="Можно связаться с клиентом" />
            </div>
          )}
          <div className="overview-columns">
            <div className="overview-main-column">
              <section className="panel orders-preview-panel">
                <div className="panel-heading">
                  <div>
                    <div className="section-kicker">ТРЕБУЮТ ВНИМАНИЯ</div>
                    <h2>Заказы в работе</h2>
                  </div>
                  <button className="text-link" onClick={() => selectSection('orders')}>Все заказы <ArrowRight size={15} /></button>
                </div>
                <OrderTable orders={visibleOrders.filter((order) => !['Выдано', 'Отказ / не ремонтируется'].includes(order.status)).slice(0, 5)} onOpen={openOrder} compact />
              </section>
            </div>

            <aside className="overview-side-column">
              <MiniCalendar orders={visibleOrders} />
              <section className="panel stock-panel">
                <div className="panel-heading compact-heading">
                  <div className="heading-with-icon"><span className="heading-icon amber"><Package size={16} /></span><div><div className="section-kicker">СКЛАД</div><h2>Нужно пополнить</h2></div></div>
                  <button className="icon-link" onClick={() => selectSection('inventory')} aria-label="Открыть склад"><ArrowRight size={17} /></button>
                </div>
                <div className="stock-list">
                  {lowStockParts.slice(0, 3).map((part) => (
                    <div className="stock-row" key={part.id}>
                      <div className="part-mini-icon"><Wrench size={16} /></div>
                      <div className="stock-part-name"><strong>{part.name}</strong><span>Арт. {part.sku}</span></div>
                      <div className="stock-amount"><strong className="stock-low">{part.stock - part.reserved}</strong><span>мин. {part.minStock}</span></div>
                    </div>
                  ))}
                </div>
                <button className="panel-bottom-link" onClick={() => selectSection('inventory')}>Перейти к складу <ArrowRight size={15} /></button>
              </section>

              <section className="panel workload-panel">
                <div className="panel-heading compact-heading">
                  <div className="heading-with-icon"><span className="heading-icon mint"><Gauge size={16} /></span><div><div className="section-kicker">КОМАНДА</div><h2>Загрузка мастеров</h2></div></div>
                  <button className="icon-link" onClick={() => setToast('Сводка загрузки обновлена.')} aria-label="Обновить загрузку"><MoreHorizontal size={17} /></button>
                </div>
                <div className="workload-list">
                  {[['Илья К.', 'Диагностика · моторы', 78, '4 заказа'], ['Денис П.', 'Механика · электрика', 62, '3 заказа'], ['Павел Р.', 'Приёмка · выдача', 44, '2 заказа']].map(([name, skill, percent, count]) => (
                    <div className="workload-item" key={String(name)}>
                      <div className="workload-avatar">{String(name).split(' ').map((p) => p[0]).join('')}</div>
                      <div className="workload-content"><div className="workload-top"><strong>{name}</strong><span>{count}</span></div><div className="workload-caption">{skill}</div><div className="progress-track"><span style={{ width: `${percent}%` }} /></div></div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="sla-callout">
                <div className="sla-callout-icon"><BriefcaseBusiness size={18} /></div>
                <div><strong>B2B · SLA сегодня</strong><p>1 заказ близок к сроку реакции</p></div>
                <button onClick={() => selectSection('b2b')} aria-label="Открыть B2B"><ArrowRight size={17} /></button>
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  );

  const renderOrders = () => {
    const filters = ['Все', 'Новые', 'В работе', 'Согласование', 'К выдаче', 'Просрочка', 'Гарантия'];
    return (
      <>
        <PageHeading title={isB2BRole ? 'Заявки парка' : page.title} description={isB2BRole ? 'Заказы по компании ЭкоЛогистика. Данные других клиентов недоступны.' : page.subtitle} actions={<><ActionButton variant="outline" icon={Download} onClick={exportOrders}>Экспорт CSV</ActionButton><ActionButton icon={Plus} onClick={openNewOrder}>Новый заказ</ActionButton></>} />
        <div className="panel order-list-panel">
          <div className="list-toolbar">
            <div className="filter-tabs">
              {filters.map((filter) => <button key={filter} className={orderFilter === filter ? 'filter-tab active' : 'filter-tab'} onClick={() => setOrderFilter(filter)}>{filter}{filter === 'Все' && <span className="tab-count">{visibleOrders.length}</span>}</button>)}
            </div>
            <div className="list-toolbar-right">
              <label className="inline-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти заказ..." /></label>
              <button className="filter-button" onClick={() => setToast('Фильтр по мастеру и дате будет доступен в полном релизе.')}><Filter size={16} />Фильтры</button>
            </div>
          </div>
          <OrderTable orders={filteredVisibleOrders} onOpen={openOrder} onNew={openNewOrder} />
          <div className="table-footnote"><span>Показано {filteredVisibleOrders.length} из {visibleOrders.length} заказов</span><span><ShieldCheck size={14} />Изменения статусов сохраняются в истории</span></div>
        </div>
      </>
    );
  };

  const renderClients = () => (
    <>
      <PageHeading title={page.title} description={page.subtitle} actions={<ActionButton icon={Plus} onClick={() => setToast('Добавление клиента доступно из карточки нового заказа.')}>Добавить клиента</ActionButton>} />
      <div className="panel data-panel">
        <div className="list-toolbar">
          <div className="panel-heading-inline"><strong>База клиентов</strong><span>{clients.length} карточек</span></div>
          <label className="inline-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Имя, телефон или email" /></label>
        </div>
        <div className="table-scroll">
          <table className="data-table clients-table">
            <thead><tr><th>Клиент</th><th>Контакты</th><th>Устройства</th><th>Заказы</th><th>Последнее обращение</th><th>Источник</th><th /></tr></thead>
            <tbody>{filteredClients.map((client) => <tr key={client.id} className="clickable-row" onClick={() => setActiveClient(client)}>
              <td><div className="person-cell"><span className={`person-avatar ${client.type === 'Компания' ? 'company-avatar' : ''}`}>{client.name.split(' ').slice(0, 2).map((word) => word[0]).join('')}</span><div><strong>{client.name}</strong><span className="cell-subtext">{client.type}</span></div></div></td>
              <td><strong>{client.phone}</strong><span className="cell-subtext">{client.email}</span></td>
              <td><span className="number-pill">{client.devices}</span></td><td>{client.orders}</td><td>{client.lastVisit}</td><td><span className="source-tag">{client.channel}</span></td><td><ChevronRight size={16} className="table-chevron" /></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="table-footnote"><span>Контакты используются только для сервисных уведомлений.</span><span><ShieldCheck size={14} />Согласия хранятся отдельно</span></div>
      </div>
    </>
  );

  const renderDevices = () => (
    <>
      <PageHeading title={page.title} description={page.subtitle} actions={<ActionButton variant="outline" icon={QrCode} onClick={() => setToast('QR-паспорт создаётся автоматически при регистрации устройства.')}>Как работает QR</ActionButton>} />
      <div className="device-summary-row">
        <div className="device-summary-card"><span className="metric-icon metric-icon-green"><Bike size={18} /></span><div><strong>{visibleOrders.length + 11}</strong><span>Устройств в базе</span></div></div>
        <div className="device-summary-card"><span className="metric-icon metric-icon-blue"><QrCode size={18} /></span><div><strong>{visibleOrders.length + 11}</strong><span>QR-паспортов</span></div></div>
        <div className="device-summary-card"><span className="metric-icon metric-icon-orange"><ShieldAlert size={18} /></span><div><strong>{visibleOrders.filter((order) => batteryFlags.some(({ key }) => order.battery[key])).length}</strong><span>С отметкой о риске</span></div></div>
      </div>
      <div className="panel data-panel">
        <div className="list-toolbar"><div className="panel-heading-inline"><strong>Техника и сервисная история</strong><span>QR-паспорт не содержит персональных данных</span></div><label className="inline-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Модель, клиент, QR-ID" /></label></div>
        <div className="table-scroll"><table className="data-table device-table"><thead><tr><th>Устройство</th><th>Владелец</th><th>QR-ID</th><th>Заказ</th><th>Статус</th><th>Риск батареи</th><th /></tr></thead><tbody>
          {visibleOrders.filter((order) => !search || `${order.brand} ${order.model} ${order.clientName} ${order.qrId}`.toLowerCase().includes(search.toLowerCase())).map((order) => {
            const hasRisk = batteryFlags.some(({ key }) => order.battery[key]);
            return <tr key={order.id} className="clickable-row" onClick={() => openOrder(order)}><td><div className="device-name-cell"><span className="device-icon"><Bike size={17} /></span><div><strong>{order.brand} {order.model}</strong><span className="cell-subtext">{order.deviceType}{order.serial ? ` · ${order.serial}` : ''}</span></div></div></td><td>{order.clientName}</td><td><Link className="qr-id" to={`/qr/${encodeURIComponent(order.qrId)}`} onClick={(event) => event.stopPropagation()}>{order.qrId} <ExternalLink size={12} /></Link></td><td><strong>{order.id}</strong></td><td><StatusBadge status={order.status} /></td><td>{hasRisk ? <span className="risk-label"><AlertTriangle size={14} />Есть отметка</span> : <span className="safe-label"><ShieldCheck size={14} />Нет</span>}</td><td><IconButton icon={MoreHorizontal} label={`Открыть ${order.id}`} onClick={(event) => { event.stopPropagation(); openOrder(order); }} /></td></tr>;
          })}
        </tbody></table></div>
      </div>
    </>
  );

  const renderInventory = () => (
    <>
      <PageHeading title={page.title} description={page.subtitle} actions={<><ActionButton variant="outline" icon={Download} onClick={() => { downloadCsv('tokohod-sklad.csv', ['Название', 'Артикул', 'Поставщик', 'Закупочная цена', 'Цена клиенту', 'Остаток', 'Резерв', 'Минимум'], parts.map((part) => [part.name, part.sku, part.supplier, part.purchasePrice, part.retailPrice, part.stock, part.reserved, part.minStock])); setToast('Файл склада подготовлен для Excel.'); }}>Экспорт CSV</ActionButton><ActionButton icon={Plus} onClick={() => setToast('Добавление новой запчасти доступно в следующем шаге настройки склада.')}>Новая запчасть</ActionButton></>} />
      <div className="inventory-metrics"><div><span className="inventory-metric-icon"><Package size={17} /></span><span><strong>{parts.length}</strong><small>Позиции каталога</small></span></div><div><span className="inventory-metric-icon blue"><ClipboardCheck size={17} /></span><span><strong>{parts.reduce((sum, part) => sum + part.reserved, 0)}</strong><small>Зарезервировано</small></span></div><div><span className="inventory-metric-icon orange"><AlertTriangle size={17} /></span><span><strong>{lowStockParts.length}</strong><small>Ниже минимума</small></span></div><div><span className="inventory-metric-icon green"><CircleDollarSign size={17} /></span><span><strong>{formatRuble(parts.reduce((sum, part) => sum + part.purchasePrice * part.stock, 0))}</strong><small>Закупочная стоимость</small></span></div></div>
      <div className="panel data-panel inventory-panel">
        <div className="list-toolbar"><div className="panel-heading-inline"><strong>Все запчасти</strong><span>Остатки обновляются при резерве и списании</span></div><button className="filter-button" onClick={() => setToast('Показаны все категории запчастей.')}><Filter size={16} />Категории</button></div>
        <div className="table-scroll"><table className="data-table inventory-table"><thead><tr><th>Запчасть</th><th>Артикул</th><th>Поставщик</th><th>Закупка</th><th>Клиенту</th><th>В наличии</th><th>Совместимость</th><th>Действие</th></tr></thead><tbody>
          {parts.map((part) => {
            const available = part.stock - part.reserved;
            const below = available <= part.minStock;
            return <tr key={part.id}><td><div className="inventory-part"><span className="part-mini-icon"><Wrench size={15} /></span><strong>{part.name}</strong></div></td><td className="sku-cell">{part.sku}</td><td>{part.supplier}</td><td>{formatRuble(part.purchasePrice)}</td><td>{formatRuble(part.retailPrice)}</td><td><div className="stock-number"><strong className={below ? 'stock-low' : ''}>{available}</strong><span>резерв {part.reserved} · мин. {part.minStock}</span></div></td><td><span className="compatible-list">{part.compatible.slice(0, 2).join(', ')}</span></td><td><div className="row-actions"><IconButton icon={Plus} label={`Зарезервировать ${part.name}`} onClick={() => { setReservationPart(part); setReservationOrderId(orders.find((order) => !['Выдано', 'Отказ / не ремонтируется'].includes(order.status))?.id ?? ''); setReservationQty('1'); }} /><IconButton icon={ArrowDownRight} label={`Списать ${part.name}`} className="issue-button" disabled={part.stock === 0} onClick={() => { setWriteOffPart(part); setWriteOffOrderId(orders.find((order) => order.reservedParts.some((entry) => entry.partId === part.id))?.id ?? orders[0]?.id ?? ''); }} /></div></td></tr>;
          })}
        </tbody></table></div>
        <div className="inventory-legend"><span><i className="legend-dot dot-green" />Достаточный остаток</span><span><i className="legend-dot dot-amber" />Ниже минимального уровня</span><span>Списывайте детали только после выполнения работ.</span></div>
      </div>
    </>
  );

  const renderB2B = () => {
    const fleets = isB2BRole ? seedFleets.filter((fleet) => fleet.id === 'fleet-eco') : seedFleets;
    const b2bOrders = visibleOrders.filter((order) => order.companyId);
    return (
      <>
        <PageHeading title={isB2BRole ? 'Мой парк · ЭкоЛогистика' : page.title} description={isB2BRole ? 'Доступ только к данным вашей компании и документам по парку.' : page.subtitle} actions={<><ActionButton variant="outline" icon={Download} onClick={() => { downloadCsv('tokohod-b2b-otchet.csv', ['Заказ', 'Дата', 'Устройство', 'Статус', 'SLA', 'Срок'], b2bOrders.map((order) => [order.id, order.createdAt, `${order.brand} ${order.model}`, order.status, order.dueDate.includes('Просрочен') ? 'Нарушен' : 'В срок', order.dueDate])); setToast('B2B-отчёт без внутренних закупочных цен экспортирован.'); }}>Месячный отчёт</ActionButton><ActionButton icon={Plus} onClick={openNewOrder}>Создать заявку</ActionButton></>} />
        {!isB2BRole && <section className="panel data-panel b2b-orders-panel"><div className="panel-heading b2b-orders-heading"><div><div className="section-kicker">ПУБЛИЧНЫЙ САЙТ · ЛОКАЛЬНЫЕ ФОРМЫ</div><h2>Новые B2B-запросы</h2></div><span className="source-tag">{publicB2BInquiries.filter((inquiry) => inquiry.status === 'Новая заявка').length} новых</span></div><div className="table-scroll"><table className="data-table b2b-table"><thead><tr><th>Компания / запрос</th><th>Контакт</th><th>Связь</th><th>Парк</th><th>Источник и согласие</th><th>Статус</th><th /></tr></thead><tbody>{publicB2BInquiries.length ? publicB2BInquiries.map((inquiry) => <tr key={inquiry.id}><td><strong>{inquiry.companyName}</strong><span className="cell-subtext">{inquiry.id} · {new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(inquiry.submittedAt))}</span><span className="cell-subtext">{inquiry.comment || inquiry.transportTypes.join(', ')}</span></td><td>{inquiry.contactName}</td><td><strong>{inquiry.phone}</strong><span className="cell-subtext">{inquiry.email}</span></td><td>{inquiry.deviceCount} · {inquiry.transportTypes.join(', ')}</td><td><span className="source-tag">{inquiry.source}</span><span className="cell-subtext">Согласие: {new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(inquiry.consentAcceptedAt))}</span><span className="cell-subtext">{inquiry.utmCampaign ? `UTM: ${inquiry.utmCampaign}` : inquiry.sourceUrl}</span></td><td><span className="source-tag">{inquiry.status}</span></td><td>{inquiry.status === 'Новая заявка' ? <button className="text-link" onClick={() => markPublicB2BInquiryInProgress(inquiry.id)}>Взять в работу</button> : <span className="cell-subtext">В работе</span>}</td></tr>) : <tr><td colSpan={7} className="empty-cell">Новых запросов пока нет. Заявки с публичного сайта будут сохраняться локально в этом браузере.</td></tr>}</tbody></table></div><div className="b2b-table-foot"><Info size={15}/><span>Локальное демо: уведомление внешнему оператору не отправляется. Данные не синхронизируются между браузерами.</span></div></section>}
        {isB2BRole ? <div className="b2b-hero-card"><div className="b2b-hero-mark"><BriefcaseBusiness size={22} /></div><div className="b2b-hero-copy"><span>ВАШ ДОГОВОР · SLA 90%</span><h2>ЭкоЛогистика</h2><p>Великий Новгород · договор действует до 31 декабря 2026</p></div><div className="b2b-hero-stat"><strong>94%</strong><span>SLA за месяц</span></div><div className="b2b-hero-stat"><strong>24</strong><span>устройства в парке</span></div></div> : null}
        {!isB2BRole && <div className="fleet-grid">{fleets.map((fleet) => <article className="fleet-card" key={fleet.id} style={{ '--fleet-accent': fleet.color } as CSSProperties}>
          <div className="fleet-card-top"><div className="fleet-logo"><BriefcaseBusiness size={18} /></div><span className="contract-status"><i />Договор активен</span><IconButton icon={MoreHorizontal} label={`Действия ${fleet.name}`} onClick={() => setToast(`Карточка ${fleet.name} открыта.`)} /></div>
          <h3>{fleet.name}</h3><p>ИНН {fleet.inn} · до {fleet.contract}</p>
          <div className="fleet-stats"><div><strong>{fleet.devices}</strong><span>устройств</span></div><div><strong>{fleet.activeOrders}</strong><span>заказов в работе</span></div><div><strong>{fleet.sla}</strong><span>SLA за месяц</span></div></div>
          <div className="fleet-contact"><span className="person-avatar company-avatar">{fleet.contact.split(' ').map((word) => word[0]).join('')}</span><div><strong>{fleet.contact}</strong><span>{fleet.phone}</span></div><button onClick={() => setToast(`Связаться с ${fleet.contact}`)}><ArrowUpRight size={15} /></button></div>
        </article>)}</div>}
        <div className="panel data-panel b2b-orders-panel"><div className="panel-heading b2b-orders-heading"><div><div className="section-kicker">ПАРК И СЕРВИС</div><h2>{isB2BRole ? 'Мои заявки' : 'Заказы корпоративных клиентов'}</h2></div><span className="sla-inline"><span className="sla-green-dot" />SLA фиксируется автоматически</span></div>
          <div className="table-scroll"><table className="data-table b2b-table"><thead><tr><th>Заказ / поступление</th><th>Компания</th><th>Устройство</th><th>Статус</th><th>Реакция</th><th>Срок выполнения</th><th /></tr></thead><tbody>
            {b2bOrders.length ? b2bOrders.map((order) => <tr key={order.id} className="clickable-row" onClick={() => openOrder(order)}><td><strong>{order.id}</strong><span className="cell-subtext">{order.createdAt}</span></td><td>{order.clientName}</td><td>{order.brand} {order.model}</td><td><StatusBadge status={order.status} /></td><td><span className="sla-value">{order.status === 'Новая заявка' ? 'Ожидается' : '18 мин'}</span></td><td><span className={order.dueDate.includes('Просрочен') ? 'due-overdue' : 'due-date'}>{order.dueDate}</span></td><td><IconButton icon={ChevronRight} label={`Открыть ${order.id}`} onClick={(event) => { event.stopPropagation(); openOrder(order); }} /></td></tr>) : <tr><td colSpan={7} className="empty-cell">Заявок пока нет</td></tr>}
          </tbody></table></div>
          <div className="b2b-table-foot"><ShieldCheck size={15} /><span>Клиентский экспорт не содержит закупочных цен и внутренней маржи.</span><button onClick={() => setToast('Отчёт формируется из заявок выбранного периода.')}>Подробнее</button></div>
        </div>
      </>
    );
  };

  const renderAI = () => (
    <>
      <PageHeading title="ИИ-помощник" description="Черновики заявки, диагностики, клиентского сообщения и B2B-отчёта. Ничего не фиксируется и не отправляется автоматически." />
      <AIWorkbench
        role={role}
        roleLabel={roleName}
        orders={visibleOrders}
        parts={parts}
        onCreateRequest={(draft: RequestDraft) => {
          const knownTypes = ['Электросамокат', 'Электровелосипед', 'Моноколесо'];
          setForm({
            ...defaultForm,
            deviceType: knownTypes.includes(draft.deviceType) ? draft.deviceType : draft.deviceType === 'Не указано' ? defaultForm.deviceType : 'Другое',
            brand: draft.brand === 'Не указана' ? '' : draft.brand,
            model: draft.model === 'Уточнить у клиента' ? '' : draft.model,
            issue: redactPersonalData(draft.issue),
            source: 'Демо-черновик сообщения',
          });
          setPhotoNames([]);
          setConsentChecked(false);
          setNewOrderOpen(true);
          setToast('Черновик перенесён в форму. Контакт, согласие и все поля нужно проверить вручную.');
        }}
        onConfirmDiagnosis={(orderId, note) => {
          if (!orders.some((order) => order.id === orderId)) {
            setToast('Заказ больше не доступен в текущей роли. Запись не добавлена.');
            return;
          }
          commitOrderUpdate(orderId, 'Запись диагностики из черновика подтверждена сотрудником', (current) => current, redactPersonalData(note).slice(0, 1200));
          setToast(`Наблюдения добавлены в историю ${orderId}; статус и смета не изменены.`);
        }}
      />
    </>
  );

  const renderKnowledge = () => <><PageHeading title={sectionInfo.knowledge.title} description={sectionInfo.knowledge.subtitle} /><KnowledgePanel role={role} query={knowledgeQuery} onQueryChange={setKnowledgeQuery} /></>;
  const renderAcademy = () => <><PageHeading title={sectionInfo.academy.title} description={sectionInfo.academy.subtitle} /><AcademyPanel role={role} /></>;
  const renderAIJournal = () => <><PageHeading title={sectionInfo['ai-log'].title} description={sectionInfo['ai-log'].subtitle} /><AIJournalPanel role={role} /></>;

  const renderReports = () => (
    <>
      <PageHeading title={page.title} description={page.subtitle} actions={<button className="period-select" onClick={() => setToast('Отчёт за период: 1–31 октября 2026.')}><CalendarDays size={15} />01–31 октября 2026<ChevronDown size={14} /></button>} />
      <div className="report-metric-grid">
        <MetricCard icon={Wallet} label="Выручка" value="1 284 600 ₽" change="+12,8%" tone="green" detail="к предыдущему месяцу" />
        <MetricCard icon={ClipboardList} label="Заказы" value="203" change="+8,4%" tone="blue" detail="за выбранный период" />
        <MetricCard icon={CircleDollarSign} label="Средний чек" value="6 328 ₽" change="+3,1%" tone="orange" detail="по закрытым заказам" />
        <MetricCard icon={Users} label="Повторные клиенты" value="31%" change="+2,2%" tone="dark" detail="от всех клиентов" />
      </div>
      <div className="report-grid">
        <section className="panel report-panel"><div className="panel-heading"><div><div className="section-kicker">ДИНАМИКА</div><h2>Заказы по неделям</h2><p>Количество заказов, принятых мастерской</p></div><button className="icon-button" aria-label="Экспортировать отчет" onClick={exportOrders}><Download size={17} /></button></div>
          <div className="report-bars">{[34, 48, 44, 65, 58, 74, 92, 78, 83, 68, 97, 80].map((v, index) => <div className="report-bar-column" key={index}><div className="report-bar" style={{ height: `${v}%` }} /><span>{['1 окт', '3', '5', '7', '9', '11', '13', '15', '17', '19', '21', '23'][index]}</span></div>)}</div>
          <div className="chart-legend"><i />Заказы <span>·</span><small>пик — 24 заказа</small></div>
        </section>
        <section className="panel funnel-panel"><div className="panel-heading"><div><div className="section-kicker">ВОРОНКА</div><h2>От заявки до выдачи</h2></div></div><div className="funnel-list">
          {[['Заявки', '100%', 100, '203'], ['Приняты в сервис', '78%', 78, '158'], ['Смета согласована', '64%', 64, '130'], ['Выданы клиенту', '57%', 57, '116']].map(([label, rate, width, count]) => <div className="funnel-item" key={String(label)}><div className="funnel-label"><span>{label}</span><strong>{rate}</strong></div><div className="funnel-track"><span style={{ width: `${width}%` }} /></div><small>{count} заказов</small></div>)}
        </div></section>
      </div>
      <section className="panel reports-list-panel"><div className="panel-heading"><div><div className="section-kicker">ГОТОВЫЕ ОТЧЁТЫ</div><h2>Сводки мастерской</h2></div></div><div className="report-links-grid">
        {([
          { name: 'Выручка по услугам', description: 'Работы, запчасти и средний чек', icon: CircleDollarSign },
          { name: 'Загрузка мастеров', description: 'Часы в работе и длительность ремонта', icon: Gauge },
          { name: 'Склад и списания', description: 'Продажи, резервы и дефицит', icon: Package },
          { name: 'B2B · SLA', description: 'Соблюдение сроков по компаниям', icon: BriefcaseBusiness },
        ] as Array<{ name: string; description: string; icon: LucideIcon }>).map(({ name, description, icon: Icon }) => <button className="report-link-card" key={name} onClick={() => { downloadCsv(`tokohod-${name.toLowerCase().replace(/\s+/g, '-')}.csv`, ['Отчёт', 'Период', 'Значение'], [[name, 'Октябрь 2026', 'Демо-данные']]); setToast(`${name} выгружен в CSV.`); }}><span className="report-link-icon"><Icon size={18} /></span><span><strong>{name}</strong><small>{description}</small></span><Download size={16} className="report-download" /></button>)}
      </div></section>
    </>
  );

  const renderSettings = () => (
    <>
      <PageHeading title={page.title} description={page.subtitle} />
      <div className="settings-layout">
        <section className="panel settings-card"><div className="settings-section-head"><div className="settings-icon"><Users size={19} /></div><div><h2>Команда и роли</h2><p>Доступы настраиваются по принципу минимальных прав.</p></div><ActionButton variant="outline" onClick={() => setToast('Приглашение сотрудника скопировано в черновик.')}>Пригласить</ActionButton></div>
          <div className="team-list">{[['АМ', 'Алексей Михайлов', 'Владелец', 'online'], ['ОС', 'Ольга Смирнова', 'Оператор', 'online'], ['ИК', 'Илья Кузнецов', 'Мастер', 'online'], ['ДП', 'Денис Петров', 'Мастер', 'offline']].map(([initials, name, title, state]) => <div className="team-row" key={String(name)}><span className="person-avatar">{initials}</span><div><strong>{name}</strong><span>{title}</span></div><i className={`presence-dot ${state}`} /><button className="text-link" onClick={() => setToast(`Настройки доступа: ${name}`)}>Доступы</button></div>)}</div>
          <div className="demo-role-note"><AlertCircle size={16} /><span>Переключатель роли в этом прототипе демонстрирует интерфейс. Настоящая авторизация и изоляция данных выполняются сервером.</span></div>
        </section>
        <section className="panel settings-card"><div className="settings-section-head"><div className="settings-icon green"><ShieldCheck size={19} /></div><div><h2>Безопасность и данные</h2><p>Защитите доступ к сервисной информации.</p></div></div>
          <div className="settings-option"><div><strong>Вход сотрудников с двухфакторной защитой</strong><span>Рекомендуется для всех аккаунтов команды</span></div><span className="setting-pill setting-pending">Требует подключения</span></div>
          <div className="settings-option"><div><strong>Резервное копирование базы</strong><span>Ежедневно · хранение 30 дней</span></div><span className="setting-pill setting-demo">Демо</span></div>
          <div className="settings-option"><div><strong>Журнал критичных действий</strong><span>Заказы, суммы, склад и роли</span></div><button className="text-link" onClick={() => document.querySelector('.audit-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Открыть</button></div>
          <div className="settings-option"><div><strong>Экспорт данных</strong><span>Заказы, клиенты, устройства и склад</span></div><ActionButton variant="outline" icon={Download} onClick={exportOrders}>Выгрузить</ActionButton></div>
        </section>
        <section className="panel settings-card integration-card"><div className="settings-section-head"><div className="settings-icon amber"><Send size={18} /></div><div><h2>Интеграции</h2><p>Подключите каналы уведомлений и документы.</p></div></div><div className="integration-list">{([
          { name: 'Telegram-уведомления', description: 'Отправка статусов и смет клиентам', status: 'Не подключено', icon: Send },
          { name: 'SMS-провайдер', description: 'Одноразовые коды и сервисные сообщения', status: 'Не подключено', icon: Smartphone },
          { name: 'PDF-документы', description: 'Заказ-наряды и акты выдачи', status: 'Готово к настройке', icon: FileText },
        ] as Array<{ name: string; description: string; status: string; icon: LucideIcon }>).map(({ name, description, status, icon: Icon }) => <div className="integration-row" key={name}><span className="integration-icon"><Icon size={17} /></span><div><strong>{name}</strong><small>{description}</small></div><span className="setting-pill setting-pending">{status}</span><button className="text-link" onClick={() => setToast(`Настройка интеграции: ${name}`)}>Подключить</button></div>)}</div></section>
        <section className="panel settings-card audit-card"><div className="settings-section-head"><div className="settings-icon"><History size={19} /></div><div><h2>Журнал критичных действий</h2><p>Кто, когда и что изменил в заказах, сметах и на складе.</p></div><ActionButton variant="outline" icon={Download} onClick={() => { downloadCsv('tokohod-zhurnal-deystviy.csv', ['Дата и время', 'Пользователь', 'Действие', 'Детали'], audit.map((event) => [event.at, event.actor, event.action, event.note ?? ''])); setToast('Журнал действий экспортирован в CSV.'); }}>Экспорт</ActionButton></div><div className="audit-list">{audit.slice(0, 8).map((event) => <div className="audit-row" key={event.id}><span className="audit-icon"><History size={14} /></span><div><strong>{event.action}</strong><small>{event.note ?? 'Изменение зафиксировано'}</small></div><span className="audit-actor">{event.actor}</span><time>{event.at}</time></div>)}</div><div className="audit-list-footer"><ShieldCheck size={14} />Записи журнала хранятся отдельно и не удаляются при изменении карточки.</div></section>
      </div>
    </>
  );

  const renderSection = () => {
    switch (section) {
      case 'overview': return renderDashboard();
      case 'orders': return renderOrders();
      case 'clients': return renderClients();
      case 'devices': return renderDevices();
      case 'inventory': return renderInventory();
      case 'b2b': return renderB2B();
      case 'reports': return renderReports();
      case 'settings': return renderSettings();
      case 'ai': return renderAI();
      case 'knowledge': return renderKnowledge();
      case 'academy': return renderAcademy();
      case 'ai-log': return renderAIJournal();
    }
  };

  const closeDetails = () => setActiveOrderId(null);

  if (role === 'client') return <CustomerPortal orders={orders} onQuoteDecision={recordCustomerQuoteDecision} onSwitchRole={() => changeRole('owner')} showDemoRoleSwitch />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-mobile-open' : ''}`}>
        <div className="brand-lockup"><span className="brand-mark"><Zap size={22} fill="currentColor" /></span><div><strong>ТОКОХОД</strong><small>сервис электротранспорта</small></div><button className="mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="Закрыть меню"><X size={18} /></button></div>
        <div className="workspace-switcher"><span className="workspace-avatar">Т</span><span><strong>ТОКОХОД · Новгород</strong><small>Рабочее пространство</small></span><ChevronDown size={15} /></div>
        <nav className="sidebar-nav" aria-label="Основная навигация">
          {navGroups.map((group) => <div className="nav-group" key={group.label}><div className="nav-group-label">{group.label}</div>{group.items.filter((item) => availableSections.includes(item.id)).map((item) => {
            const Icon = item.icon;
            const badgeCount = item.id === 'orders' ? orderCounts.new + orderCounts.approval : item.id === 'inventory' ? lowStockParts.length : 0;
            return <button key={item.id} className={`nav-item ${section === item.id ? 'active' : ''}`} onClick={() => selectSection(item.id)}><Icon size={18} strokeWidth={1.8} /><span>{isB2BRole && item.id === 'b2b' ? 'Мой парк' : item.label}</span>{badgeCount > 0 && <em>{badgeCount}</em>}</button>;
          })}</div>)}
          {role === 'owner' && <div className="nav-group nav-bottom-group"><button className={`nav-item ${section === 'settings' ? 'active' : ''}`} onClick={() => selectSection('settings')}><Settings size={18} strokeWidth={1.8} /><span>Настройки</span></button></div>}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-public-card"><div className="public-card-icon"><Globe2 size={16} /></div><div><strong>Публичная страница</strong><span>Сайт и QR-паспорта</span></div><Link to="/" aria-label="Открыть публичный сайт"><ArrowUpRight size={16} /></Link></div>
        <div className="sidebar-footer">
          <button className={`user-profile ${roleMenuOpen ? 'profile-open' : ''}`} onClick={() => setRoleMenuOpen((open) => !open)}><span className="user-avatar">{role === 'b2b' ? 'ЭЛ' : role === 'master' ? 'ИК' : role === 'operator' ? 'ОС' : 'АМ'}</span><span className="user-meta"><strong>{role === 'b2b' ? 'ЭкоЛогистика' : role === 'master' ? 'Илья Кузнецов' : role === 'operator' ? 'Ольга Смирнова' : 'Алексей Михайлов'}</strong><small>{roleName} · демо-режим</small></span><MoreHorizontal size={18} /></button>
          {roleMenuOpen && <div className="role-menu"><span>Предпросмотр ролей</span>{(Object.keys(roleLabels) as Role[]).map((item) => <button key={item} onClick={() => changeRole(item)} className={role === item ? 'selected' : ''}>{role === item && <Check size={14} />}{roleLabels[item]}</button>)}</div>}
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu-button" onClick={() => setMobileNavOpen(true)} aria-label="Открыть меню"><Menu size={20} /></button>
          <div className="mobile-brand"><span className="brand-mark"><Zap size={19} fill="currentColor" /></span><strong>ТОКОХОД</strong></div>
          <label className="global-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск заказов, клиентов, устройств..." /><kbd>⌘ K</kbd></label>
          <div className="topbar-actions">
            <button className="help-button" onClick={() => setToast('Помощь: свяжитесь с администратором мастерской.')}><span>?</span><span>Помощь</span></button>
            <div className="notification-wrap"><IconButton icon={Bell} label="Уведомления" className={notificationsOpen ? 'icon-selected' : ''} onClick={() => setNotificationsOpen((open) => !open)} />{localIncomingCount > 0 && <i className="notification-indicator" />}
              {notificationsOpen && <div className="notification-popover"><div className="notification-head"><strong>Уведомления</strong><span>{localIncomingCount ? `${localIncomingCount} локально` : 'демо'}</span></div>{(role === 'owner' || role === 'operator') && pendingWebsiteOrders.slice(0, 4).map((order) => <button className="notification-item" key={`site-${order.id}`} onClick={() => { setNotificationsOpen(false); selectSection('orders'); openOrder(order); }}><i className="notification-dot blue" /><span><strong>Новая заявка с сайта · {order.id}</strong><small>{order.clientName} · {order.deviceType} · локально в этом браузере</small></span></button>)}{(role === 'owner' || role === 'operator') && pendingWebsiteB2B.slice(0, 4).map((inquiry) => <button className="notification-item" key={`b2b-${inquiry.id}`} onClick={() => { setNotificationsOpen(false); selectSection('b2b'); }}><i className="notification-dot orange" /><span><strong>Новый B2B-запрос · {inquiry.companyName}</strong><small>{inquiry.id} · {inquiry.deviceCount} устройств · локально в этом браузере</small></span></button>)}{(role === 'b2b' ? [
                ['Обновлён статус заказа', 'ТО-2844 · Volteco Flex 500W', 'green'],
              ] : role === 'master' ? [
                ['Продолжить диагностику', 'ТО-2846 · Xiaomi 4 Pro', 'blue'],
                ['Гарантийное обращение', 'ТО-2839 · KingSong 16X', 'orange'],
              ] : [
                ['Смета ждёт ответа', 'ТО-2845 · 8 420 ₽ · 18 минут назад', 'orange'],
                ['Заказ готов к выдаче', 'ТО-2843 · Мария Петрова', 'green'],
                ['Остаток ниже минимума', 'Колодки дискового тормоза · 3 шт.', 'blue'],
              ]).map(([title, detail, tone]) => <button className="notification-item" key={String(title)} onClick={() => { setNotificationsOpen(false); const orderId = String(detail).match(/ТО-\d+/)?.[0]; const target = visibleOrders.find((order) => order.id === orderId); if (target) openOrder(target); else if (String(title).includes('Остаток') && availableSections.includes('inventory')) selectSection('inventory'); else setToast('Нет доступных уведомлений для этой роли.'); }}><i className={`notification-dot ${tone}`} /><span><strong>{title}</strong><small>{detail}</small></span></button>)}<button className="notification-all" onClick={() => { setNotificationsOpen(false); selectSection('orders'); }}>Все уведомления <ArrowRight size={14} /></button></div>}
            </div>
            <span className="topbar-divider" />
            <button className="header-user" onClick={() => setRoleMenuOpen((open) => !open)}><span className="header-avatar">{role === 'b2b' ? 'ЭЛ' : role === 'master' ? 'ИК' : role === 'operator' ? 'ОС' : 'АМ'}</span><ChevronDown size={14} /></button>
          </div>
        </header>

        <div className="main-content">
          <div className="main-content-inner">
            {section !== 'overview' && <div className="breadcrumb"><span>ТОКОХОД</span><ChevronRight size={13} /><strong>{isB2BRole && section === 'b2b' ? 'Мой парк' : page.title}</strong></div>}
            {renderSection()}
            <footer className="workspace-footer"><span>ТОКОХОД · Сервисная платформа</span><span><span className="online-indicator" />Все изменения сохранены в демо-режиме</span></footer>
          </div>
        </div>
      </main>

      <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
        {[['overview', 'Обзор', LayoutDashboard], ['orders', 'Заказы', ClipboardList], ['inventory', 'Склад', Package], ['b2b', 'B2B', BriefcaseBusiness]].filter(([id]) => availableSections.includes(id as Section)).map(([id, label, Icon]) => <button key={String(id)} className={section === id ? 'active' : ''} onClick={() => selectSection(id as Section)}><Icon size={19} /><span>{String(label)}</span></button>)}
      </nav>

      {activeOrder && <div className="drawer-overlay" onMouseDown={(event) => event.target === event.currentTarget && closeDetails()}>
        <aside className="order-drawer" role="dialog" aria-modal="true" aria-label={`Заказ ${activeOrder.id}`}>
          <div className="drawer-topbar"><div><span className="drawer-eyebrow">ЗАКАЗ-НАРЯД</span><strong>{activeOrder.id}</strong></div><div className="drawer-top-actions"><button className="drawer-action-link" onClick={() => copyStatusLink(activeOrder)}><Link2 size={15} />Статус клиенту</button><IconButton icon={X} label="Закрыть заказ" onClick={closeDetails} /></div></div>
          <div className="drawer-scroll">
            <div className="order-drawer-title"><div><h2>{activeOrder.brand} {activeOrder.model}</h2><p>{activeOrder.deviceType} <span>·</span> QR-ID {activeOrder.qrId}</p></div><StatusBadge status={activeOrder.status} /></div>
            <div className="drawer-primary-actions">
              {role !== 'b2b' && nextStatus(activeOrder.status) && <ActionButton icon={ArrowRight} disabled={activeOrderWorkBlocked} onClick={() => advanceOrder(activeOrder)}>{activeOrder.status === 'Готово к выдаче' ? 'Выдать устройство' : `Далее: ${nextStatus(activeOrder.status)}`}</ActionButton>}
              {role !== 'b2b' && <ActionButton variant="outline" icon={FileText} onClick={openQuoteEditor}>{activeOrder.estimateVersion ? 'Новая версия сметы' : 'Сформировать смету'}</ActionButton>}
            </div>
            {activeOrderWorkBlocked && <div className="battery-training-lock"><ShieldAlert size={16} /><span>Переход к работам заблокирован до сохранения оценки ответственного мастера{batteryTrainingRequired ? ' и успешного курса «Безопасность батарей» (≥80%)' : ''}.{batteryTrainingRequired && <button onClick={() => { setActiveOrderId(null); selectSection('academy'); }}>Открыть курс</button>}</span></div>}
            <div className="detail-tabs"><button className={detailTab === 'card' ? 'active' : ''} onClick={() => setDetailTab('card')}>Карточка</button><button className={detailTab === 'estimate' ? 'active' : ''} onClick={() => setDetailTab('estimate')}>Смета {activeOrder.estimateVersion ? <i>{activeOrder.estimateVersion}</i> : null}</button><button className={detailTab === 'history' ? 'active' : ''} onClick={() => setDetailTab('history')}>История</button></div>

            {detailTab === 'card' && <div className="drawer-content-section">
              <div className="detail-section-heading"><div><span className="section-kicker">КЛИЕНТ</span><h3>Контакт и устройство</h3></div><button className="text-link" onClick={() => setToast(`Набрать ${activeOrder.phone}`)}>Связаться <ArrowUpRight size={14} /></button></div>
              <div className="customer-device-card"><div className="customer-card-row"><span className="person-avatar">{activeOrder.clientName.split(' ').slice(0, 2).map((word) => word[0]).join('')}</span><div><strong>{activeOrder.clientName}</strong><a href={`tel:${activeOrder.phone}`}>{activeOrder.phone}</a></div><button className="icon-button small" aria-label="Скопировать телефон" onClick={() => { navigator.clipboard?.writeText(activeOrder.phone); setToast('Телефон скопирован.'); }}><Copy size={15} /></button></div><div className="customer-info-row"><span>Электронная почта</span><strong>{safeText(activeOrder.email)}</strong></div><div className="customer-info-row"><span>Источник заявки</span><strong><span className="source-tag">{activeOrder.source}</span></strong></div></div>
              {(activeOrder.sourceUrl || activeOrder.contactChannel || activeOrder.consentAcceptedAt || activeOrder.clientComment || activeOrder.promoCode) && <div className="intake-grid public-attribution-grid mt-section"><div className="intake-field"><span>Время поступления</span><strong>{activeOrder.submittedAt ? new Date(activeOrder.submittedAt).toLocaleString('ru-RU') : activeOrder.createdAt}</strong></div><div className="intake-field"><span>Канал связи</span><strong>{safeText(activeOrder.contactChannel)}</strong></div><div className="intake-field"><span>Желаемое время приёмки</span><strong>{activeOrder.preferredDate ? new Date(activeOrder.preferredDate).toLocaleString('ru-RU') : 'Не указано'}</strong></div><div className="intake-field wide"><span>Страница заявки</span><strong>{safeText(activeOrder.sourceUrl)}</strong></div><div className="intake-field wide"><span>UTM-атрибуция</span><strong>{[['source', activeOrder.utmSource], ['medium', activeOrder.utmMedium], ['campaign', activeOrder.utmCampaign], ['term', activeOrder.utmTerm], ['content', activeOrder.utmContent]].filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join(' · ') || 'Нет UTM-параметров'}</strong></div>{activeOrder.referrerUrl && <div className="intake-field wide"><span>Предыдущая страница</span><strong>{activeOrder.referrerUrl}</strong></div>}{activeOrder.clientComment && <div className="intake-field wide"><span>Комментарий клиента</span><strong>{activeOrder.clientComment}</strong></div>}{activeOrder.promoCode && <div className="intake-field"><span>Промокод, указанный клиентом</span><strong>{activeOrder.promoCode}</strong></div>}<div className="intake-field wide"><span>Согласие</span><strong>{activeOrder.consentAcceptedAt ? `Принято ${new Date(activeOrder.consentAcceptedAt).toLocaleString('ru-RU')} · версия ${activeOrder.consentVersion ?? 'не указана'}` : 'Не зафиксировано'}</strong></div></div>}
              <div className="detail-section-heading mt-section"><div><span className="section-kicker">ПРИЁМКА</span><h3>Состояние и комплектация</h3></div><button className="text-link" onClick={() => setToast('Фото приёмки доступны в карточке заказа-наряда.')}>Фото {activeOrder.photos.length}</button></div>
              <div className="intake-grid"><div className="intake-field"><span>Серийный номер</span><strong>{safeText(activeOrder.serial)}</strong></div><div className="intake-field"><span>Цвет</span><strong>{safeText(activeOrder.color)}</strong></div><div className="intake-field wide"><span>Переданные аксессуары</span><strong>{activeOrder.accessories.length ? activeOrder.accessories.join(', ') : 'Не переданы'}</strong></div><div className="intake-field wide"><span>Внешние дефекты</span><strong className={activeOrder.defects.length ? 'defect-text' : ''}>{activeOrder.defects.length ? activeOrder.defects.join(', ') : 'Не обнаружены'}</strong></div><div className="photo-strip wide">{activeOrder.photos.length ? activeOrder.photos.map((photo, index) => <div className="photo-placeholder" key={`${photo}-${index}`}><span><FileCheck2 size={16} /></span><small>{photo}</small></div>) : <div className="no-photos"><span><FileText size={16} /></span>Фото приёмки ещё не добавлены</div>}</div>{activeOrder.photoFileNames?.length ? <div className="intake-field wide"><span>Имена файлов, выбранных в браузере (изображения не загружены)</span><strong>{activeOrder.photoFileNames.join(', ')}</strong></div> : null}</div>
              <div className="detail-section-heading mt-section"><div><span className="section-kicker">ОБРАЩЕНИЕ</span><h3>Описание неисправности</h3></div><span className="due-pill"><CalendarDays size={13} />{activeOrder.dueDate}</span></div>
              <div className="issue-card"><p>{activeOrder.issue}</p><div><span>Мастер</span><strong>{activeOrder.master}</strong></div></div>
              <ContextualTip order={activeOrder} role={role} onOpenKnowledge={(query) => { setKnowledgeQuery(query); setActiveOrderId(null); selectSection('knowledge'); }} />

              <div className={`battery-card ${batteryFlags.some(({ key }) => activeOrder.battery[key]) ? 'battery-card-risk' : ''}`}>
                <div className="battery-card-head"><span className="battery-icon"><BatteryWarning size={18} /></span><div><strong>Безопасность аккумулятора</strong><small>{activeOrder.battery.decision}</small></div>{(role === 'owner' || role === 'master') && <button className="text-link" onClick={() => { setBatteryDraft({ ...activeOrder.battery }); setBatteryEditing((open) => !open); }}>{batteryEditing ? 'Свернуть' : 'Оценить'}</button>}</div>
                {activeOrderBatteryRisk && <p className="battery-warning-copy"><AlertTriangle size={14} />Есть признак или упоминание риска. Не заряжать, не включать и не вскрывать устройство; решение принимает ответственный мастер.</p>}
                {activeOrderBatteryRisk && (role === 'master' || role === 'owner') && <div className="battery-training-lock compact"><ShieldAlert size={15} /><span>{!hasPassedCourse(role, 'battery-safety') ? 'До успешного теста (не менее 80%) самостоятельные работы с батареей заблокированы.' : !activeOrderBatteryCleared ? 'Курс пройден, но риск не закрыт ответственным мастером. Работы остаются заблокированы.' : 'Риск закрыт в карточке ответственным мастером.'}{!hasPassedCourse(role, 'battery-safety') && <button onClick={() => { setActiveOrderId(null); selectSection('academy'); }}>Перейти к курсу</button>}</span></div>}
                {batteryEditing && batteryDraft && (role === 'owner' || role === 'master') && <div className="battery-editor"><div className="battery-checks">{batteryFlags.map(({ key, label }) => <label key={key}><input type="checkbox" checked={batteryDraft[key]} onChange={(event) => setBatteryDraft((draft) => draft ? { ...draft, [key]: event.target.checked } : draft)} /><span>{label}</span></label>)}</div><label className="field-label">Решение мастера<select value={batteryDraft.decision} onChange={(event) => { if (event.target.value === 'Отказать в приёмке' && !window.confirm('Подтвердить отказ в приёмке? Зафиксируйте безопасное решение для клиента и устройства.')) return; setBatteryDraft((draft) => draft ? { ...draft, decision: event.target.value } : draft); }}><option>Не оценена</option><option>Риск не выявлен</option><option>Принять в безопасную зону</option><option>Передать партнёру</option><option>Отказать в приёмке</option><option>Выдать без ремонта батареи</option></select></label><p className="safety-note"><ShieldAlert size={14} />Не заряжать, не разбирать и не восстанавливать повреждённые батареи.</p><ActionButton icon={Check} onClick={saveBatteryRisk}>Сохранить оценку</ActionButton></div>}
              </div>
            </div>}

            {detailTab === 'estimate' && <div className="drawer-content-section estimate-detail">
              <div className="detail-section-heading"><div><span className="section-kicker">РАСЧЁТ РАБОТ</span><h3>Смета v{activeOrder.estimateVersion || '—'}</h3></div>{activeOrder.estimateVersion > 0 && <button className="text-link" onClick={() => copyQuoteLink(activeOrder)}><Link2 size={14} />Ссылка клиенту</button>}</div>
              {activeOrder.estimateLines.length ? <><div className="estimate-table"><div className="estimate-row estimate-head"><span>Работа или запчасть</span><span>Кол-во</span><span>Стоимость</span></div>{activeOrder.estimateLines.map((line, index) => <div className="estimate-row" key={`${line.title}-${index}`}><span><strong>{line.title}</strong><small>{line.kind}</small></span><span>{line.quantity}</span><strong>{formatRuble(line.price * line.quantity)}</strong></div>)}<div className="estimate-total"><span>Итого клиенту</span><strong>{formatRuble(activeOrder.amount)}</strong></div></div><div className={`quote-decision ${activeOrder.quoteDecision === 'Согласована' ? 'decision-approved' : activeOrder.quoteDecision === 'Отклонена' ? 'decision-rejected' : 'decision-pending'}`}><span>{activeOrder.quoteDecision === 'Согласована' ? <CheckCircle2 size={17} /> : <Clock3 size={16} />}</span><div><strong>{activeOrder.quoteDecision ?? 'Ожидает ответа клиента'}</strong><small>{activeOrder.quoteDecidedAt ? `Зафиксировано ${activeOrder.quoteDecidedAt}` : `Версия v${activeOrder.estimateVersion} · ссылка доступна клиенту`}</small></div></div></> : <div className="empty-state quote-empty"><div className="empty-icon"><FileText size={23} /></div><strong>Смета ещё не сформирована</strong><p>Добавьте работы и запчасти. Каждое изменение будет сохранено отдельной версией.</p><ActionButton icon={Plus} onClick={openQuoteEditor}>Создать смету</ActionButton></div>}
              {activeOrder.estimateHistory && activeOrder.estimateHistory.length > 0 && <div className="estimate-version-list"><h4>Версии сметы</h4>{[...activeOrder.estimateHistory].reverse().map((snapshot) => <div key={snapshot.version}><span>v{snapshot.version}</span><small>{snapshot.createdAt}</small><strong>{formatRuble(snapshot.total)}</strong><em>{snapshot.decision}</em></div>)}</div>}
            </div>}

            {detailTab === 'history' && <div className="drawer-content-section history-detail"><div className="detail-section-heading"><div><span className="section-kicker">ЖУРНАЛ</span><h3>История заказа</h3></div><span className="history-lock"><ShieldCheck size={14} />неизменяемая</span></div><div className="timeline">{activeOrder.history.map((event, index) => <div className="timeline-item" key={event.id}><div className={`timeline-marker ${index === 0 ? 'current' : ''}`}><span /></div><div><strong>{event.action}</strong><p>{event.note}</p><div className="timeline-meta"><span>{event.at}</span><span>{event.actor}</span></div></div></div>)}</div><div className="audit-bottom-note"><ShieldCheck size={15} />Критичные действия не удаляются и доступны владельцу.</div></div>}
          </div>
          <div className="drawer-footer"><div><span>Предварительная стоимость</span><strong>{formatRuble(activeOrder.amount)}</strong></div>{role !== 'b2b' && <ActionButton variant="outline" icon={Send} onClick={() => setToast(`Уведомление для ${activeOrder.clientName} подготовлено.`)}>Уведомить клиента</ActionButton>}</div>
        </aside>
      </div>}

      <Modal open={newOrderOpen} onClose={() => setNewOrderOpen(false)} className="form-modal" labelledBy="new-order-title">
        <div className="modal-heading"><div className="modal-heading-icon"><ClipboardList size={19} /></div><div><h2 id="new-order-title">Новая заявка / заказ-наряд</h2><p>Заполните данные клиента и устройства. Номер присвоится автоматически.</p></div><IconButton icon={X} label="Закрыть" onClick={() => setNewOrderOpen(false)} /></div>
        <form onSubmit={submitNewOrder} className="modal-form">
          <div className="form-section-title"><span>01</span>Клиент</div>
          <div className="form-grid"><label className="field-label">ФИО или компания<input required value={form.clientName} onChange={(event) => setForm({ ...form, clientName: event.target.value })} placeholder="Например, Анна Смирнова" /></label><label className="field-label">Телефон<input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="+7 900 000-00-00" /></label><label className="field-label">E-mail <span className="optional">необязательно</span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.ru" /></label><label className="field-label">Источник заявки<select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })}><option>Телефон</option><option>Сайт</option><option>QR-код</option><option>Рекомендация</option><option>B2B-парк</option><option>Реклама</option></select></label></div>
          <div className="form-section-title"><span>02</span>Устройство и неисправность</div>
          <div className="form-grid"><label className="field-label">Тип транспорта<select value={form.deviceType} onChange={(event) => setForm({ ...form, deviceType: event.target.value })}><option>Электросамокат</option><option>Электровелосипед</option><option>Моноколесо</option><option>Другое</option></select></label><label className="field-label">Бренд<input value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} placeholder="Xiaomi, Ninebot..." /></label><label className="field-label full-field">Модель<input value={form.model} onChange={(event) => setForm({ ...form, model: event.target.value })} placeholder="Модель и версия" /></label><label className="field-label full-field">Описание проблемы<textarea required rows={3} value={form.issue} onChange={(event) => setForm({ ...form, issue: event.target.value })} placeholder="Что случилось? Когда появилась неисправность?" /></label></div>
          <div className="form-grid compact-form-grid"><label className="field-label">Дата и время приёмки<input type="datetime-local" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></label><label className="field-label">Комплектация<input value={form.accessories} onChange={(event) => setForm({ ...form, accessories: event.target.value })} placeholder="Зарядное, ключи..." /></label><label className="field-label full-field">Видимые дефекты<input value={form.defects} onChange={(event) => setForm({ ...form, defects: event.target.value })} placeholder="Царапины, сколы или «нет»" /></label></div>
          <label className="upload-zone"><input type="file" accept="image/*" multiple onChange={onPhotoSelect} /><span className="upload-icon"><Plus size={17} /></span><span><strong>Добавить фото приёмки</strong><small>JPG, PNG, HEIC · до 5 файлов{photoNames.length ? ` · выбрано ${photoNames.length}` : ''}</small></span><span className="upload-button">Выбрать</span></label>
          {photoNames.length > 0 && <div className="selected-files">{photoNames.map((name, index) => <span key={`${name}-${index}`}>{name}<button type="button" onClick={() => setPhotoNames((previous) => previous.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Удалить ${name}`}><X size={12} /></button></span>)}</div>}
          <label className="consent-line"><input type="checkbox" checked={consentChecked} onChange={(event) => setConsentChecked(event.target.checked)} /><span>Клиент дал согласие на обработку персональных данных. <small>Текст и версия согласия фиксируются с датой и временем.</small></span></label>
          <div className="modal-actions"><button type="button" className="action-button action-ghost" onClick={() => setNewOrderOpen(false)}><span>Отмена</span></button><button type="submit" className="action-button action-primary"><Plus size={16} /><span>Создать заказ</span></button></div>
        </form>
      </Modal>

      <Modal open={quoteOpen} onClose={() => setQuoteOpen(false)} className="quote-modal" labelledBy="quote-modal-title">
        <div className="modal-heading"><div className="modal-heading-icon green"><FileText size={19} /></div><div><h2 id="quote-modal-title">{activeOrder?.estimateVersion ? `Новая версия сметы · ${activeOrder.id}` : `Смета · ${activeOrder?.id ?? ''}`}</h2><p>Сохранённые версии не перезаписываются. Сумма: {formatRuble(orderTotal(quoteDraft))}</p></div><IconButton icon={X} label="Закрыть" onClick={() => setQuoteOpen(false)} /></div>
        <form className="modal-form" onSubmit={saveQuote}><div className="quote-editor-list"><div className="quote-editor-head"><span>Наименование</span><span>Тип</span><span>Кол-во</span><span>Цена за ед.</span><span /></div>{quoteDraft.map((line, index) => <div className="quote-editor-row" key={index}><input aria-label="Название работы или запчасти" required value={line.title} onChange={(event) => setQuoteDraft((previous) => previous.map((item, lineIndex) => lineIndex === index ? { ...item, title: event.target.value } : item))} placeholder="Работа / запчасть" /><select aria-label="Тип позиции" value={line.kind} onChange={(event) => setQuoteDraft((previous) => previous.map((item, lineIndex) => lineIndex === index ? { ...item, kind: event.target.value as EstimateLine['kind'] } : item))}><option>Работа</option><option>Запчасть</option></select><input aria-label="Количество" type="number" min="1" value={line.quantity} onChange={(event) => setQuoteDraft((previous) => previous.map((item, lineIndex) => lineIndex === index ? { ...item, quantity: Number(event.target.value) } : item))} /><input aria-label="Цена" type="number" min="0" value={line.price} onChange={(event) => setQuoteDraft((previous) => previous.map((item, lineIndex) => lineIndex === index ? { ...item, price: Number(event.target.value) } : item))} /><IconButton icon={X} label="Удалить строку" onClick={() => setQuoteDraft((previous) => previous.filter((_, lineIndex) => lineIndex !== index))} /></div>)}</div><button type="button" className="add-quote-line" onClick={() => setQuoteDraft((previous) => [...previous, { title: '', kind: 'Работа', quantity: 1, price: 0 }])}><Plus size={15} />Добавить позицию</button><div className="quote-total-line"><span>Предварительная стоимость</span><strong>{formatRuble(orderTotal(quoteDraft))}</strong></div><p className="quote-immutable-note"><ShieldCheck size={15} />После отправки клиенту версия и сумма будут зафиксированы. Изменения оформляются новой версией.</p><div className="modal-actions"><button type="button" className="action-button action-ghost" onClick={() => setQuoteOpen(false)}><span>Отмена</span></button><button type="submit" className="action-button action-primary"><Send size={16} /><span>Сохранить и отправить</span></button></div></form>
      </Modal>

      <Modal open={!!reservationPart} onClose={() => setReservationPart(null)} className="small-modal" labelledBy="reserve-title">
        <div className="modal-heading"><div className="modal-heading-icon amber"><Package size={18} /></div><div><h2 id="reserve-title">Резерв запчасти</h2><p>{reservationPart?.name}</p></div><IconButton icon={X} label="Закрыть" onClick={() => setReservationPart(null)} /></div>
        <form className="modal-form" onSubmit={reservePart}><label className="field-label">Заказ-наряд<select required value={reservationOrderId} onChange={(event) => setReservationOrderId(event.target.value)}>{orders.filter((order) => !['Выдано', 'Отказ / не ремонтируется'].includes(order.status)).map((order) => <option key={order.id} value={order.id}>{order.id} · {order.clientName}</option>)}</select></label><label className="field-label">Количество<input type="number" min="1" max={Math.max(1, (reservationPart?.stock ?? 1) - (reservationPart?.reserved ?? 0))} value={reservationQty} onChange={(event) => setReservationQty(event.target.value)} /></label><div className="modal-inline-note"><Package size={15} />Доступно: {(reservationPart?.stock ?? 0) - (reservationPart?.reserved ?? 0)} шт.</div><div className="modal-actions"><button type="button" className="action-button action-ghost" onClick={() => setReservationPart(null)}><span>Отмена</span></button><button type="submit" className="action-button action-primary"><Check size={16} /><span>Зарезервировать</span></button></div></form>
      </Modal>

      <Modal open={!!writeOffPart} onClose={() => setWriteOffPart(null)} className="small-modal" labelledBy="writeoff-title">
        <div className="modal-heading"><div className="modal-heading-icon amber"><ArrowDownRight size={18} /></div><div><h2 id="writeoff-title">Списание запчасти</h2><p>{writeOffPart?.name}</p></div><IconButton icon={X} label="Закрыть" onClick={() => setWriteOffPart(null)} /></div>
        <form className="modal-form" onSubmit={writeOffReservedPart}><label className="field-label">Заказ-наряд<select required value={writeOffOrderId} onChange={(event) => setWriteOffOrderId(event.target.value)}>{orders.filter((order) => !['Выдано', 'Отказ / не ремонтируется'].includes(order.status)).map((order) => <option key={order.id} value={order.id}>{order.id} · {order.clientName}</option>)}</select></label><div className="modal-inline-note"><AlertCircle size={15} />Остаток: {writeOffPart?.stock ?? 0} шт. · резерв: {writeOffPart?.reserved ?? 0} шт.</div><p className="form-hint">Списание отразится в истории заказа и журнале критичных действий.</p><div className="modal-actions"><button type="button" className="action-button action-ghost" onClick={() => setWriteOffPart(null)}><span>Отмена</span></button><button type="submit" className="action-button action-primary"><ArrowDownRight size={16} /><span>Списать 1 шт.</span></button></div></form>
      </Modal>

      <Modal open={!!activeClient} onClose={() => setActiveClient(null)} className="small-modal client-modal" labelledBy="client-modal-title">
        {activeClient && <><div className="modal-heading"><div className="person-avatar large">{activeClient.name.split(' ').slice(0, 2).map((word) => word[0]).join('')}</div><div><h2 id="client-modal-title">{activeClient.name}</h2><p>{activeClient.type} · клиент с {activeClient.lastVisit.toLowerCase()}</p></div><IconButton icon={X} label="Закрыть" onClick={() => setActiveClient(null)} /></div><div className="client-detail-list"><div><span>Телефон</span><strong>{activeClient.phone}</strong></div><div><span>Email</span><strong>{activeClient.email}</strong></div><div><span>Устройства</span><strong>{activeClient.devices}</strong></div><div><span>Обращений</span><strong>{activeClient.orders}</strong></div><div><span>Источник первого обращения</span><strong>{activeClient.channel}</strong></div></div><div className="modal-actions"><button className="action-button action-outline" onClick={() => { setActiveClient(null); selectSection('orders'); setSearch(activeClient.name); }}><ClipboardList size={15} /><span>История заказов</span></button><button className="action-button action-primary" onClick={() => { const name = activeClient.name; setActiveClient(null); openNewOrder(); setForm((previous) => ({ ...previous, clientName: name, phone: activeClient.phone })); }}><Plus size={15} /><span>Новый заказ</span></button></div></>}
      </Modal>

      {toast && <div className="toast-message" role="status"><span><Check size={15} /></span>{toast}<button onClick={() => setToast('')} aria-label="Закрыть уведомление"><X size={14} /></button></div>}
      {mobileNavOpen && <button className="mobile-nav-scrim" aria-label="Закрыть меню" onClick={() => setMobileNavOpen(false)} />}
    </div>
  );
}

function B2BPanel({ orders, onOpen }: { orders: ServiceOrder[]; onOpen: (order: ServiceOrder) => void }) {
  return <section className="panel b2b-home-panel"><div className="panel-heading"><div><div className="section-kicker">МОЙ ПАРК · ЭКОЛОГИСТИКА</div><h2>Состояние техники</h2><p>Данные видны только вашей компании</p></div><span className="b2b-hero-mark small"><BriefcaseBusiness size={17} /></span></div><div className="b2b-home-stats"><div><strong>24</strong><span>в парке</span></div><div><strong>22</strong><span>на линии</span></div><div><strong>2</strong><span>в сервисе</span></div></div><div className="b2b-mini-order-list">{orders.slice(0, 4).map((order) => <button key={order.id} onClick={() => onOpen(order)}><span className="b2b-mini-device"><Bike size={15} /></span><span><strong>{order.id}</strong><small>{order.brand} {order.model}</small></span><StatusBadge status={order.status} /></button>)}</div><div className="sla-progress-row"><span>SLA за месяц</span><strong>94%</strong></div><div className="progress-track sla-progress"><span style={{ width: '94%' }} /></div></section>;
}

export default Index;
