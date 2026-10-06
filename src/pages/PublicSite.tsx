import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, BatteryWarning, Bike, CalendarDays,
  Check, CheckCircle2, ChevronDown, CircleHelp, Clock3, FileCheck2, FileText,
  Info, MapPin, Menu, MessageCircle, Package, Phone, QrCode, Search, Send,
  ShieldCheck, Smartphone, Wrench, X, Zap,
  type LucideIcon,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AUDIT_STORAGE_KEY,
  CLIENT_STORAGE_KEY,
  CONSENT_STORAGE_KEY,
  ORDER_STORAGE_KEY,
  createHistoryEvent,
  loadFromStorage,
  saveToStorage,
  seedClients,
  seedOrders,
  type Client,
  type HistoryEvent,
  type ServiceOrder,
} from '@/lib/tokoData';
import {
  currentUtmParams,
  PUBLIC_B2B_INQUIRIES_STORAGE_KEY,
  PUBLIC_FORM_RATE_LIMIT_STORAGE_KEY,
  publicContactConfig,
  safePublicPath,
  trackPublicEvent,
  type PublicB2BInquiry,
} from '@/lib/publicSite';

type PublicSitePage = 'home' | 'services' | 'scooters' | 'ebikes' | 'monowheels' | 'b2b' | 'faq' | 'contacts' | 'privacy' | 'warranty' | 'booking';
type BookingFormValues = {
  name: string;
  phone: string;
  deviceType: string;
  brand: string;
  model: string;
  issue: string;
  photoNames: string[];
  preferredDate: string;
  contactChannel: string;
  consent: boolean;
  email: string;
  serial: string;
  comment: string;
  promoCode: string;
  honeypot: string;
};
type B2BFormValues = {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  deviceCount: string;
  transportTypes: string[];
  comment: string;
  consent: boolean;
  honeypot: string;
};
type SubmitResult = { ok: true; id: string } | { ok: false; message: string };

type PublicSiteProps = { page?: PublicSitePage };

type ServiceInfo = {
  title: string;
  short: string;
  icon: LucideIcon;
  href: string;
  id: string;
};

const CONSENT_VERSION = 'privacy-2026-10-v1';

const serviceCards: ServiceInfo[] = [
  { id: 'diagnostics', title: 'Диагностика', short: 'Проверка устройства и понятный следующий шаг без обещаний до осмотра.', icon: Search, href: '/booking' },
  { id: 'maintenance', title: 'Плановое обслуживание', short: 'Профилактические работы по состоянию и рекомендациям производителя.', icon: CheckCircle2, href: '/booking' },
  { id: 'scooters', title: 'Электросамокаты', short: 'Механика, тормоза, колёса и электрические системы — после диагностики.', icon: Zap, href: '/service/e-scooters' },
  { id: 'ebikes', title: 'Электровелосипеды', short: 'Обслуживание механических узлов и систем электротранспорта.', icon: Bike, href: '/service/e-bikes' },
  { id: 'monowheels', title: 'Моноколёса', short: 'Проверка состояния и согласование объёма работ до ремонта.', icon: CircleHelp, href: '/service/monowheels' },
  { id: 'brakes', title: 'Тормоза и колёса', short: 'Осмотр, подбор работ и комплектующих после приёмки.', icon: CircleHelp, href: '/services#brakes' },
  { id: 'electronics', title: 'Электроника', short: 'Неисправности электроники оцениваются мастером при диагностике.', icon: Zap, href: '/services#electronics' },
  { id: 'parts', title: 'Запчасти', short: 'Совместимость и наличие уточняются по модели и идентификаторам.', icon: Package, href: '/services#parts' },
  { id: 'fleet', title: 'Корпоративные парки', short: 'Запрос на обслуживание парка и условия обсуждаются отдельно.', icon: FileCheck2, href: '/b2b' },
];

const processSteps = [
  { number: '01', title: 'Заявка', text: 'Опишите устройство и выберите удобный способ связи.', icon: MessageCircle },
  { number: '02', title: 'Приёмка и фотофиксация', text: 'Сотрудник фиксирует комплектность и видимое состояние при передаче.', icon: Smartphone },
  { number: '03', title: 'Диагностика', text: 'Мастер проверяет устройство и формирует перечень предложенных работ.', icon: Search },
  { number: '04', title: 'Смета и согласование', text: 'Стоимость и срок показываются до начала работ; решение остаётся за клиентом.', icon: FileCheck2 },
  { number: '05', title: 'Ремонт и проверка', text: 'Работы выполняются после согласования и завершаются проверкой.', icon: Wrench },
  { number: '06', title: 'Выдача и документы', text: 'Вы получаете устройство и документы, предусмотренные заказом.', icon: CheckCircle2 },
];

const faqs = [
  { question: 'Сколько стоит диагностика?', answer: 'Цена зависит от устройства и объёма проверки. Подтвердите стоимость у оператора перед приёмкой: неподтверждённый прайс на странице не публикуем.' },
  { question: 'Нужно ли записываться заранее?', answer: 'Рекомендуем отправить заявку. Сотрудник должен подтвердить доступное время приёмки. Точный адрес и график сервиса пока требуют подтверждения.' },
  { question: 'Можно ли привезти устройство после дождя?', answer: 'Не используйте и не заряжайте устройство до осмотра. Для точной оценки требуется проверка мастером ТОКОХОД. Оставьте заявку, чтобы согласовать безопасную передачу устройства; не вскрывайте батарею.' },
  { question: 'Что делать, если самокат не заряжается?', answer: 'Опишите симптом в заявке и дождитесь осмотра. Не разбирайте корпус или аккумулятор. При запахе, дыме, необычном нагреве, вздутии или следах влаги: не используйте и не заряжайте устройство до осмотра. Для точной оценки требуется проверка мастером ТОКОХОД.' },
  { question: 'Когда будет известна точная стоимость?', answer: 'После диагностики сервис подготовит смету с позициями. Ремонт начинается только после явного согласования клиентом.' },
  { question: 'Что входит в гарантию?', answer: 'Срок и условия определяются документом, выданным по конкретному заказу. Общие условия ТОКОХОД ещё не подтверждены для публикации; смотрите гарантийный документ или уточните до ремонта.' },
  { question: 'Можно ли заказать запчасти?', answer: 'Укажите марку и модель в заявке. Совместимость, цена и наличие подтверждаются после проверки конкретной детали.' },
  { question: 'Как работает QR-паспорт?', answer: 'QR открывает публичную страницу устройства с ограниченным набором сведений и контактами. Личные данные, ремонтная история и сметы доступны только владельцу в кабинете.' },
  { question: 'Как обслуживается корпоративный парк?', answer: 'Оставьте B2B-запрос с размером и составом парка. Условия договора, SLA и отчётности согласуются отдельно; неподтверждённые условия не обещаем на сайте.' },
  { question: 'Как связаться с сервисом?', answer: 'Оставьте заявку на сайте. Телефон, Telegram, адрес и часы работы появятся здесь после подтверждения контактных данных ТОКОХОД.' },
];

const pageMeta: Record<PublicSitePage, { title: string; description: string }> = {
  home: { title: 'ТОКОХОД — сервис электротранспорта в Великом Новгороде', description: 'Диагностика, обслуживание и ремонт электросамокатов, электровелосипедов и моноколёс. Запись, смета до работ и цифровой паспорт устройства.' },
  services: { title: 'Услуги ТОКОХОД — электротранспорт', description: 'Услуги по диагностике, обслуживанию и ремонту электротранспорта в Великом Новгороде.' },
  scooters: { title: 'Ремонт электросамокатов — ТОКОХОД', description: 'Диагностика и обслуживание электросамокатов в Великом Новгороде. Смета до начала работ.' },
  ebikes: { title: 'Ремонт электровелосипедов — ТОКОХОД', description: 'Диагностика и обслуживание электровелосипедов в Великом Новгороде.' },
  monowheels: { title: 'Ремонт моноколёс — ТОКОХОД', description: 'Диагностика и обслуживание моноколёс в Великом Новгороде.' },
  b2b: { title: 'Корпоративное обслуживание парков — ТОКОХОД', description: 'Запрос на обслуживание корпоративных парков электротранспорта в Великом Новгороде.' },
  faq: { title: 'Вопросы и ответы — ТОКОХОД', description: 'Ответы о приёмке, диагностике, смете, безопасности и цифровом QR-паспорте ТОКОХОД.' },
  contacts: { title: 'Контакты ТОКОХОД — Великий Новгород', description: 'Контакты и способы записи в сервис ТОКОХОД. Адрес и график требуют подтверждения перед публикацией.' },
  privacy: { title: 'Политика обработки данных — ТОКОХОД', description: 'Черновик политики обработки персональных данных для публичного сайта ТОКОХОД.' },
  warranty: { title: 'Гарантийные условия — ТОКОХОД', description: 'Информация о гарантийных документах и обращениях по выполненным работам ТОКОХОД.' },
  booking: { title: 'Запись на сервис — ТОКОХОД', description: 'Оставьте заявку на обслуживание электротранспорта в ТОКОХОД.' },
};

const serviceDetails: Partial<Record<PublicSitePage, { title: string; intro: string; points: string[]; suitableFor: string[] }>> = {
  scooters: {
    title: 'Ремонт электросамокатов',
    intro: 'Принимаем электросамокаты на диагностику и обслуживание. Итоговые перечень работ, стоимость и срок подтверждаются после осмотра и до начала ремонта.',
    points: ['Осмотр механических узлов и колёс', 'Проверка тормозной системы', 'Проверка электрических систем мастером', 'Смета с позициями для согласования', 'Проверка выполненных работ перед выдачей'],
    suitableFor: ['Самокат не включается или выключается', 'Появился шум, люфт или вибрация', 'Ухудшилось торможение', 'Нужны плановое обслуживание или запчасти'],
  },
  ebikes: {
    title: 'Ремонт электровелосипедов',
    intro: 'Проводим приёмку электровелосипедов и согласуем дальнейшие действия после диагностики. Работы с электрическими компонентами не выполняются без проверки мастером.',
    points: ['Осмотр рамы, колёс и тормозов', 'Описание симптомов без удалённой постановки диагноза', 'Проверка совместимости комплектующих', 'Смета до начала ремонта', 'Документы и условия гарантии к заказу'],
    suitableFor: ['Плановый осмотр перед сезоном', 'Необычный шум или люфт', 'Снижение эффективности тормозов', 'Вопрос по электроприводу или комплектующим'],
  },
  monowheels: {
    title: 'Ремонт моноколёс',
    intro: 'Моноколесо принимается в сервис после согласования времени. Мастер оценивает его состояние при приёмке; стоимость и срок не назначаются автоматически по описанию или фотографии.',
    points: ['Фиксация состояния при передаче', 'Осмотр колеса и внешних узлов', 'Проверка риска до начала работ', 'Согласование состава и суммы сметы', 'Выдача с документами по заказу'],
    suitableFor: ['Необычные звуки или вибрация', 'Вопрос по внешним повреждениям', 'Плановое обслуживание', 'Нужно проверить доступность детали'],
  },
};

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

function sourcePath() {
  return typeof window === 'undefined' ? '/' : `${window.location.origin}${safePublicPath(window.location.pathname)}`;
}

function safeReferrer() {
  if (typeof document === 'undefined' || !document.referrer) return undefined;
  try {
    const referrer = new URL(document.referrer);
    return `${referrer.origin}${safePublicPath(referrer.pathname)}`;
  } catch {
    return undefined;
  }
}

function limitFormRate() {
  try {
    const previous = Number(window.localStorage.getItem(PUBLIC_FORM_RATE_LIMIT_STORAGE_KEY) ?? 0);
    if (Date.now() - previous < 3500) return false;
    window.localStorage.setItem(PUBLIC_FORM_RATE_LIMIT_STORAGE_KEY, String(Date.now()));
  } catch {
    // Client-side limit is best-effort; a server-side anti-spam control is needed in production.
  }
  return true;
}

function PublicHeader({ onBook, onContactNotice }: { onBook: () => void; onContactNotice: (message: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const phone = publicContactConfig.phone.trim();
  const telegramUrl = publicContactConfig.telegramUrl.trim();
  const phoneHref = phone ? `tel:${phone.replace(/[^+\d]/g, '')}` : '';

  const callService = () => {
    trackPublicEvent('click_phone');
    if (!phoneHref) onContactNotice('Номер телефона ТОКОХОД не задан. Контакт появится после подтверждения данных сервиса.');
  };
  const openTelegram = () => {
    trackPublicEvent('click_telegram');
    if (!telegramUrl) onContactNotice('Ссылка на Telegram ещё не настроена. Оставьте заявку — канал связи можно выбрать в форме.');
  };

  return <header className="tp-header">
    <div className="tp-header-inner">
      <Link className="tp-brand" to="/" aria-label="ТОКОХОД — главная">
        <span className="tp-brand-mark"><Zap size={18} fill="currentColor" /></span>
        <span className="tp-brand-word">ТОКОХОД</span>
      </Link>
      <span className="tp-city"><MapPin size={14} />Великий Новгород</span>
      <nav className="tp-desktop-nav" aria-label="Основная навигация">
        <Link to="/services">Услуги</Link>
        <Link to="/#process">Как работаем</Link>
        <Link to="/b2b">Для компаний</Link>
        <Link to="/faq">FAQ</Link>
        <Link to="/contacts">Контакты</Link>
      </nav>
      <div className="tp-header-actions">
        <div className="tp-header-contact">
          {phoneHref ? <a className="tp-head-phone" href={phoneHref} onClick={callService}><Phone size={17} /><span>{phone}</span></a> : <button className="tp-head-phone tp-unconfigured" type="button" onClick={callService} aria-label="Телефон ТОКОХОД пока не настроен"><Phone size={17} /><span>Позвонить</span></button>}
          {telegramUrl ? <a className="tp-head-telegram" href={telegramUrl} target="_blank" rel="noreferrer" onClick={() => trackPublicEvent('click_telegram')} aria-label="Написать в Telegram"><Send size={16} /><span>Telegram</span></a> : <button className="tp-head-telegram tp-unconfigured" type="button" onClick={openTelegram} aria-label="Telegram ТОКОХОД пока не настроен"><Send size={16} /><span>Telegram</span></button>}
        </div>
        <span className="tp-header-hours"><Clock3 size={14} />{publicContactConfig.workingHours || 'График уточняется'}</span>
        <Link className="tp-account-link" to="/client" onClick={() => trackPublicEvent('client_portal_click')}><UserBadge />Кабинет · демо</Link>
        <button className="tp-button tp-button-primary tp-header-book" type="button" onClick={onBook}>Записаться <ArrowRight size={16} /></button>
        <button className="tp-menu-toggle" type="button" aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
    </div>
    {menuOpen && <nav className="tp-mobile-menu" aria-label="Мобильная навигация">
      <Link to="/services" onClick={() => setMenuOpen(false)}>Услуги <ArrowRight size={15} /></Link>
      <Link to="/#process" onClick={() => setMenuOpen(false)}>Как работаем <ArrowRight size={15} /></Link>
      <Link to="/b2b" onClick={() => setMenuOpen(false)}>Для компаний <ArrowRight size={15} /></Link>
      <Link to="/faq" onClick={() => setMenuOpen(false)}>Вопросы и ответы <ArrowRight size={15} /></Link>
      <Link to="/contacts" onClick={() => setMenuOpen(false)}>Контакты <ArrowRight size={15} /></Link>
      <div className="tp-mobile-contact-row">
        {phoneHref ? <a href={phoneHref} onClick={callService}><Phone size={17} />Позвонить</a> : <button type="button" onClick={callService}><Phone size={17} />Позвонить</button>}
        {telegramUrl ? <a href={telegramUrl} target="_blank" rel="noreferrer" onClick={() => trackPublicEvent('click_telegram')}><Send size={17} />Telegram</a> : <button type="button" onClick={openTelegram}><Send size={17} />Telegram</button>}
      </div>
    </nav>}
  </header>;
}

function UserBadge() {
  return <Smartphone size={15} aria-hidden="true" />;
}

function PublicFooter({ onBook, onContactNotice }: { onBook: () => void; onContactNotice: (message: string) => void }) {
  const phone = publicContactConfig.phone.trim();
  const telegramUrl = publicContactConfig.telegramUrl.trim();
  return <footer className="tp-footer">
    <div className="tp-footer-main tp-shell">
      <div className="tp-footer-brand-col">
        <Link className="tp-brand" to="/" aria-label="ТОКОХОД — главная"><span className="tp-brand-mark"><Zap size={18} fill="currentColor" /></span><span className="tp-brand-word">ТОКОХОД</span></Link>
        <p>Сервис электротранспорта<br />Великий Новгород</p>
        <span className="tp-footer-demo-note">Контакты и точка приёма требуют подтверждения перед публикацией.</span>
      </div>
      <div className="tp-footer-links"><strong>Услуги</strong><Link to="/services">Все услуги</Link><Link to="/service/e-scooters">Электросамокаты</Link><Link to="/service/e-bikes">Электровелосипеды</Link><Link to="/service/monowheels">Моноколёса</Link><Link to="/b2b">Корпоративные парки</Link></div>
      <div className="tp-footer-links"><strong>Информация</strong><Link to="/faq">FAQ</Link><Link to="/warranty">Гарантия</Link><Link to="/privacy">Политика обработки данных</Link><Link to="/client" onClick={() => trackPublicEvent('client_portal_click')}>Клиентский кабинет · демо</Link></div>
      <div className="tp-footer-contacts"><strong>Связь</strong>
        {phone ? <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} onClick={() => trackPublicEvent('click_phone')}><Phone size={15} />{phone}</a> : <button type="button" onClick={() => { trackPublicEvent('click_phone'); onContactNotice('Номер телефона не настроен. Перед публикацией добавьте его в конфигурацию сайта.'); }}><Phone size={15} />Номер уточняется</button>}
        {telegramUrl ? <a href={telegramUrl} target="_blank" rel="noreferrer" onClick={() => trackPublicEvent('click_telegram')}><Send size={15} />Telegram</a> : <button type="button" onClick={() => onContactNotice('Ссылка на Telegram ещё не настроена.')}><Send size={15} />Telegram не подключён</button>}
        <button type="button" onClick={onBook}><CalendarDays size={15} />Записаться на сервис</button>
      </div>
    </div>
    <div className="tp-footer-bottom tp-shell"><span>© {new Date().getFullYear()} ТОКОХОД · демо-публичный сайт</span><span>Формы и аналитика работают локально в этом браузере.</span></div>
  </footer>;
}

function BookingForm({ onSubmit, sourcePage }: { onSubmit: (values: BookingFormValues) => SubmitResult; sourcePage: string }) {
  const formId = useId();
  const [form, setForm] = useState<BookingFormValues>({ name: '', phone: '', deviceType: 'Электросамокат', brand: '', model: '', issue: '', photoNames: [], preferredDate: '', contactChannel: 'Телефон', consent: false, email: '', serial: '', comment: '', promoCode: '', honeypot: '' });
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState('');
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<BookingFormValues>) => setForm((current) => ({ ...current, ...patch }));
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.issue.trim() || !form.deviceType || !form.contactChannel) {
      trackPublicEvent('form_error', { form: 'booking', reason: 'required_fields', page: sourcePage });
      setError('Заполните имя, тип устройства и описание проблемы.');
      return;
    }
    if (!form.consent) {
      trackPublicEvent('form_error', { form: 'booking', reason: 'consent_missing', page: sourcePage });
      setError('Согласие на обработку данных обязательно для отправки заявки.');
      return;
    }
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      trackPublicEvent('form_error', { form: 'booking', reason: 'invalid_email', page: sourcePage });
      setError('Проверьте адрес электронной почты.');
      return;
    }
    if (form.contactChannel === 'E-mail' && !form.email.trim()) {
      trackPublicEvent('form_error', { form: 'booking', reason: 'email_required_for_channel', page: sourcePage });
      setError('Укажите адрес электронной почты для выбранного канала связи.');
      return;
    }
    if (normalizePhone(form.phone).length < 10) {
      trackPublicEvent('form_error', { form: 'booking', reason: 'invalid_phone', page: sourcePage });
      setError('Проверьте номер телефона.');
      return;
    }
    setSaving(true);
    const result = onSubmit(form);
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError('');
    setSavedId(result.id);
  };

  if (savedId) return <section className="tp-form-success" role="status">
    <span className="tp-success-icon"><Check size={22} /></span>
    <span className="tp-eyebrow">ЗАЯВКА СОХРАНЕНА</span>
    <h3>Спасибо, {form.name.trim().split(/\s+/)[0] || 'заявка принята'}.</h3>
    <p>Демо-номер заявки: <strong>{savedId}</strong>.</p>
    <div className="tp-demo-disclaimer"><Info size={17} /><span>В этой версии заявка сохранена только в браузере и появится в демо-панели. Оператор не получит уведомление без серверной интеграции.</span></div>
    <Link className="tp-button tp-button-secondary" to="/client" onClick={() => trackPublicEvent('client_portal_click')}><span>Клиентский кабинет · демо</span> <ArrowRight size={15} /></Link>
  </section>;

  return <form className="tp-form" onSubmit={handleSubmit} noValidate>
    <label className="tp-honeypot" aria-hidden="true">Оставьте это поле пустым<input tabIndex={-1} autoComplete="off" value={form.honeypot} onChange={(event) => update({ honeypot: event.target.value })} /></label>
    <div className="tp-form-grid">
      <label htmlFor={`${formId}-name`}>Имя <span aria-hidden="true">*</span><input id={`${formId}-name`} autoComplete="name" required value={form.name} onChange={(event) => update({ name: event.target.value })} placeholder="Как к вам обращаться" /></label>
      <label htmlFor={`${formId}-phone`}>Телефон <span aria-hidden="true">*</span><input id={`${formId}-phone`} autoComplete="tel" inputMode="tel" type="tel" pattern="[+0-9][0-9 ()-]{8,}" required value={form.phone} onChange={(event) => update({ phone: event.target.value })} placeholder="+7 900 000-00-00" /></label>
      <label htmlFor={`${formId}-type`}>Тип устройства <span aria-hidden="true">*</span><select id={`${formId}-type`} required value={form.deviceType} onChange={(event) => update({ deviceType: event.target.value })}><option>Электросамокат</option><option>Электровелосипед</option><option>Моноколесо</option><option>Другое</option></select></label>
      <label htmlFor={`${formId}-brand`}>Бренд <small>если знаете</small><input id={`${formId}-brand`} value={form.brand} onChange={(event) => update({ brand: event.target.value })} placeholder="Например, Segway" /></label>
      <label htmlFor={`${formId}-model`}>Модель <small>если знаете</small><input id={`${formId}-model`} value={form.model} onChange={(event) => update({ model: event.target.value })} placeholder="Модель устройства" /></label>
      <label htmlFor={`${formId}-date`}>Желаемая дата <small>необязательно</small><input id={`${formId}-date`} type="datetime-local" value={form.preferredDate} onChange={(event) => update({ preferredDate: event.target.value })} /></label>
      <label className="tp-form-wide" htmlFor={`${formId}-issue`}>Что случилось? <span aria-hidden="true">*</span><textarea id={`${formId}-issue`} rows={3} required value={form.issue} onChange={(event) => update({ issue: event.target.value })} placeholder="Опишите симптомы своими словами" /></label>
      <label htmlFor={`${formId}-channel`}>Как связаться <span aria-hidden="true">*</span><select id={`${formId}-channel`} value={form.contactChannel} onChange={(event) => update({ contactChannel: event.target.value })}><option>Телефон</option><option>Telegram</option><option>E-mail</option></select></label>
      <label className="tp-form-wide tp-file-picker" htmlFor={`${formId}-photos`}><span>Фото устройства <small>необязательно · до 5 файлов</small></span><input id={`${formId}-photos`} type="file" accept="image/*" multiple onChange={(event) => update({ photoNames: Array.from(event.target.files ?? []).slice(0, 5).map((file) => file.name) })} /><span className="tp-file-note">{form.photoNames.length ? `Выбрано: ${form.photoNames.join(', ')}` : 'Выберите изображения'}</span></label>
    </div>
    <details className="tp-optional-fields"><summary>Дополнительные сведения <ChevronDown size={16} /></summary><div className="tp-form-grid"><label htmlFor={`${formId}-email`}>E-mail <small>необязательно</small><input id={`${formId}-email`} type="email" autoComplete="email" value={form.email} onChange={(event) => update({ email: event.target.value })} placeholder="name@example.ru" /></label><label htmlFor={`${formId}-serial`}>Серийный номер <small>необязательно</small><input id={`${formId}-serial`} value={form.serial} onChange={(event) => update({ serial: event.target.value })} placeholder="Если номер легко найти" /></label><label htmlFor={`${formId}-promo`}>Промокод <small>необязательно</small><input id={`${formId}-promo`} value={form.promoCode} onChange={(event) => update({ promoCode: event.target.value })} /></label><label className="tp-form-wide" htmlFor={`${formId}-comment`}>Комментарий <small>необязательно</small><textarea id={`${formId}-comment`} rows={2} value={form.comment} onChange={(event) => update({ comment: event.target.value })} /></label></div></details>
    <label className="tp-consent" htmlFor={`${formId}-consent`}><input id={`${formId}-consent`} type="checkbox" checked={form.consent} onChange={(event) => update({ consent: event.target.checked })} required /><span>Согласен(-на) на обработку персональных данных по <Link to="/privacy" target="_blank" rel="noopener noreferrer">политике ТОКОХОД</Link>. <strong>*</strong></span></label>
    <p className="tp-form-local-note"><ShieldCheck size={15} />В демо данные сохраняются в этом браузере. Фотографии не загружаются: сохраняются только имена файлов.</p>
    {error && <p className="tp-form-error" role="alert">{error}</p>}
    <button className="tp-button tp-button-primary tp-form-submit" type="submit" disabled={saving}>{saving ? 'Сохраняем…' : 'Отправить заявку'} <ArrowRight size={17} /></button>
  </form>;
}

function B2BInquiryForm({ onSubmit }: { onSubmit: (values: B2BFormValues) => SubmitResult }) {
  const formId = useId();
  const [values, setValues] = useState<B2BFormValues>({ companyName: '', contactName: '', phone: '', email: '', deviceCount: '', transportTypes: [], comment: '', consent: false, honeypot: '' });
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState('');
  const update = (patch: Partial<B2BFormValues>) => setValues((current) => ({ ...current, ...patch }));
  const toggleType = (type: string) => update({ transportTypes: values.transportTypes.includes(type) ? values.transportTypes.filter((item) => item !== type) : [...values.transportTypes, type] });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!values.companyName.trim() || !values.contactName.trim() || !values.email.trim() || !/^\S+@\S+\.\S+$/.test(values.email.trim()) || !Number.isInteger(Number(values.deviceCount)) || Number(values.deviceCount) < 1 || Number(values.deviceCount) > 10000 || values.transportTypes.length === 0) {
      trackPublicEvent('form_error', { form: 'b2b', reason: 'required_fields' });
      setError('Заполните обязательные поля, корректный e-mail и выберите тип транспорта.');
      return;
    }
    if (!values.consent) {
      trackPublicEvent('form_error', { form: 'b2b', reason: 'consent_missing' });
      setError('Подтвердите согласие на обработку данных.');
      return;
    }
    if (normalizePhone(values.phone).length < 10) {
      trackPublicEvent('form_error', { form: 'b2b', reason: 'invalid_phone' });
      setError('Проверьте номер телефона.');
      return;
    }
    const result = onSubmit(values);
    if (!result.ok) { setError(result.message); return; }
    setSavedId(result.id);
    setError('');
  };
  if (savedId) return <div className="tp-form-success" role="status"><span className="tp-success-icon"><Check size={22} /></span><span className="tp-eyebrow">ЗАПРОС СОХРАНЁН</span><h3>Спасибо, {values.contactName.split(/\s+/)[0] || 'коллега'}.</h3><p>Демо-номер запроса: <strong>{savedId}</strong>.</p><div className="tp-demo-disclaimer"><Info size={17} /><span>Запрос виден в демо-панели ТОКОХОД на этом устройстве. Реальный оператор не уведомлён.</span></div></div>;
  return <form className="tp-form" onSubmit={submit} noValidate>
    <label className="tp-honeypot" aria-hidden="true">Оставьте поле пустым<input tabIndex={-1} autoComplete="off" value={values.honeypot} onChange={(event) => update({ honeypot: event.target.value })} /></label>
    <div className="tp-form-grid"><label htmlFor={`${formId}-company`}>Компания <span>*</span><input id={`${formId}-company`} required autoComplete="organization" value={values.companyName} onChange={(event) => update({ companyName: event.target.value })} /></label><label htmlFor={`${formId}-person`}>Контактное лицо <span>*</span><input id={`${formId}-person`} required autoComplete="name" value={values.contactName} onChange={(event) => update({ contactName: event.target.value })} /></label><label htmlFor={`${formId}-phone`}>Телефон <span>*</span><input id={`${formId}-phone`} required type="tel" autoComplete="tel" value={values.phone} onChange={(event) => update({ phone: event.target.value })} placeholder="+7 900 000-00-00" /></label><label htmlFor={`${formId}-email`}>E-mail <span>*</span><input id={`${formId}-email`} required type="email" autoComplete="email" value={values.email} onChange={(event) => update({ email: event.target.value })} placeholder="name@company.ru" /></label><label htmlFor={`${formId}-count`}>Количество устройств <span>*</span><input id={`${formId}-count`} required type="number" min="1" max="10000" value={values.deviceCount} onChange={(event) => update({ deviceCount: event.target.value })} /></label>
      <fieldset className="tp-form-wide tp-types-field"><legend>Типы транспорта <span>*</span></legend>{['Электросамокаты', 'Электровелосипеды', 'Моноколёса'].map((type) => <label key={type}><input type="checkbox" checked={values.transportTypes.includes(type)} onChange={() => toggleType(type)} />{type}</label>)}</fieldset>
      <label className="tp-form-wide" htmlFor={`${formId}-comment`}>Комментарий <small>необязательно</small><textarea id={`${formId}-comment`} rows={4} value={values.comment} onChange={(event) => update({ comment: event.target.value })} placeholder="Парк, география, желаемый формат обслуживания" /></label>
    </div>
    <label className="tp-consent" htmlFor={`${formId}-consent`}><input id={`${formId}-consent`} type="checkbox" required checked={values.consent} onChange={(event) => update({ consent: event.target.checked })} /><span>Согласен(-на) на обработку персональных данных по <Link to="/privacy" target="_blank" rel="noopener noreferrer">политике ТОКОХОД</Link>. <strong>*</strong></span></label>
    <p className="tp-form-local-note"><ShieldCheck size={15} />SLA, договор и тарифы согласуются индивидуально. В демо запрос сохраняется локально.</p>
    {error && <p className="tp-form-error" role="alert">{error}</p>}
    <button className="tp-button tp-button-primary tp-form-submit" type="submit">Отправить запрос <ArrowRight size={17} /></button>
  </form>;
}

function ServiceGrid({ onBook }: { onBook: () => void }) {
  return <div className="tp-services-grid">{serviceCards.map(({ id, title, short, icon: Icon, href }, index) => <article id={id} className="tp-service-card" key={id}>
    <div className="tp-service-card-head"><span className="tp-service-icon"><Icon size={22} strokeWidth={1.8} /></span><span className="tp-service-number">{String(index + 1).padStart(2, '0')}</span></div>
    <h3>{title}</h3><p>{short}</p>
    <div className="tp-service-card-actions"><Link to={href} onClick={() => trackPublicEvent('service_link_click', { service: id })}>Подробнее <ArrowRight size={15} /></Link><button type="button" onClick={onBook} aria-label={`Записаться: ${title}`}>Записаться</button></div>
  </article>)}</div>;
}

function FAQList({ compact = false }: { compact?: boolean }) {
  const items = compact ? faqs.slice(0, 5) : faqs;
  return <div className="tp-faq-list">{items.map((item, index) => <details className="tp-faq-item" key={item.question}><summary><span>{item.question}</span><span className="tp-faq-index">{String(index + 1).padStart(2, '0')} <ChevronDown size={17} /></span></summary><p>{item.answer}</p></details>)}</div>;
}

function CTASection({ onBook, title = 'Нужна помощь с устройством?', text = 'Оставьте заявку — сотрудник уточнит детали и подтвердит следующий шаг.' }: { onBook: () => void; title?: string; text?: string }) {
  return <section className="tp-cta-section"><div><span className="tp-eyebrow">ТОКОХОД · ВЕЛИКИЙ НОВГОРОД</span><h2>{title}</h2><p>{text}</p></div><button className="tp-button tp-button-primary" type="button" onClick={onBook}>Записаться на сервис <ArrowRight size={17} /></button></section>;
}

function ContactDetails({ onBook, onContactNotice }: { onBook: () => void; onContactNotice: (message: string) => void }) {
  const phone = publicContactConfig.phone.trim();
  const telegram = publicContactConfig.telegramUrl.trim();
  const email = publicContactConfig.email.trim();
  const address = publicContactConfig.address.trim();
  const directions = publicContactConfig.directionsUrl.trim();
  return <div className="tp-contact-grid">
    <article className="tp-contact-card"><span className="tp-contact-icon"><MapPin size={20} /></span><h3>Адрес</h3><p>{address || 'Точный адрес приёма нужно подтвердить перед публикацией.'}</p>{directions ? <a href={directions} target="_blank" rel="noreferrer" onClick={() => trackPublicEvent('route_click')}>Построить маршрут <ArrowUpRight size={15} /></a> : <span className="tp-contact-unavailable">Маршрут появится после подтверждения адреса</span>}</article>
    <article className="tp-contact-card"><span className="tp-contact-icon"><Clock3 size={20} /></span><h3>Часы работы</h3><p>{publicContactConfig.workingHours || 'График работы уточняется. Время приёмки подтвердит сотрудник.'}</p><span className="tp-contact-unavailable">Великий Новгород</span></article>
    <article className="tp-contact-card"><span className="tp-contact-icon"><Phone size={20} /></span><h3>Телефон</h3><p>{phone || 'Номер телефона не указан в конфигурации сайта.'}</p>{phone ? <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} onClick={() => trackPublicEvent('click_phone')}>Позвонить <ArrowRight size={15} /></a> : <button type="button" onClick={() => { trackPublicEvent('click_phone'); onContactNotice('Перед запуском добавьте подтверждённый номер телефона в конфигурацию сайта.'); }}>Оставить заявку вместо звонка <ArrowRight size={15} /></button>}</article>
    <article className="tp-contact-card"><span className="tp-contact-icon"><Send size={20} /></span><h3>Telegram и e-mail</h3><p>{telegram ? 'Напишите в Telegram.' : email || 'Telegram и e-mail пока не подключены.'}</p>{telegram ? <a href={telegram} target="_blank" rel="noreferrer" onClick={() => trackPublicEvent('click_telegram')}>Открыть Telegram <ArrowUpRight size={15} /></a> : email ? <a href={`mailto:${email}`} onClick={() => trackPublicEvent('click_email')}>Написать по e-mail <ArrowUpRight size={15} /></a> : <button type="button" onClick={onBook}>Оставить заявку <ArrowRight size={15} /></button>}</article>
    <article className="tp-contact-card tp-contact-wide"><span className="tp-contact-icon"><Info size={20} /></span><h3>Как попасть в мастерскую</h3><p>{publicContactConfig.entranceNote || 'Фото входа, особенности подъезда и парковки добавим после подтверждения фактической точки приёма.'}</p><span className="tp-contact-unavailable">{publicContactConfig.parkingNote || 'Данные о парковке уточняются.'}</span></article>
    <div className="tp-map-card">{publicContactConfig.mapEmbedUrl ? <iframe title="Карта проезда в ТОКОХОД" src={publicContactConfig.mapEmbedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="tp-map-placeholder"><MapPin size={26} /><strong>Карта появится после подтверждения адреса</strong><span>Не показываем случайную точку как адрес мастерской.</span></div>}</div>
  </div>;
}

function SafetyBlock({ onBook }: { onBook: () => void }) {
  return <section className="tp-safety-block"><div className="tp-safety-icon"><BatteryWarning size={26} /></div><div><span className="tp-eyebrow">БЕЗОПАСНОСТЬ</span><h2>Устройство намокло, перегревается или не заряжается?</h2><p>Не используйте и не заряжайте устройство до осмотра. Для точной оценки требуется проверка мастером ТОКОХОД.</p><small>Оставьте заявку, чтобы согласовать безопасную передачу устройства. Не вскрывайте и не ремонтируйте аккумулятор самостоятельно.</small></div><button className="tp-button tp-button-safety" type="button" onClick={onBook}>Получить консультацию <ArrowRight size={16} /></button></section>;
}

function PublicSite({ page = 'home' }: PublicSiteProps) {
  const navigate = useNavigate();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [contactNotice, setContactNotice] = useState('');
  const [qrId, setQrId] = useState('');
  const meta = pageMeta[page];

  useEffect(() => {
    document.title = meta.title;
    const frame = window.requestAnimationFrame(() => {
      const hash = window.location.hash.slice(1);
      if (hash) {
        try { document.getElementById(decodeURIComponent(hash))?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        catch { document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      } else window.scrollTo(0, 0);
    });
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.appendChild(description);
    }
    description.content = meta.description;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'index,follow';
    trackPublicEvent('pageview', { page });
    if (page === 'b2b') {
      trackPublicEvent('b2b_page_view');
      trackPublicEvent('form_open', { form: 'b2b', page });
    }
    if (page === 'booking') trackPublicEvent('form_open', { form: 'booking', page });
    if (page === 'services') trackPublicEvent('services_view');
    if (page === 'scooters' || page === 'ebikes' || page === 'monowheels') trackPublicEvent('service_view', { service: page });
    if (page === 'privacy' || page === 'warranty') trackPublicEvent('document_view', { document: page });
    return () => window.cancelAnimationFrame(frame);
  }, [meta.description, meta.title, page]);

  const openBooking = () => {
    trackPublicEvent('booking_opened', { page });
    trackPublicEvent('form_open', { form: 'booking', page });
    setContactNotice('');
    setBookingOpen(true);
  };
  const contactNoticeHandler = (message: string) => setContactNotice(message);

  const submitBooking = (values: BookingFormValues): SubmitResult => {
    trackPublicEvent('form_submit_attempt', { form: 'booking', deviceType: values.deviceType, page });
    if (values.honeypot) {
      trackPublicEvent('form_error', { form: 'booking', reason: 'spam_field', page });
      return { ok: false, message: 'Не удалось обработать форму. Попробуйте ещё раз.' };
    }
    if (!limitFormRate()) {
      trackPublicEvent('form_error', { form: 'booking', reason: 'rate_limited', page });
      return { ok: false, message: 'Подождите несколько секунд перед повторной отправкой.' };
    }
    if (normalizePhone(values.phone).length < 10) return { ok: false, message: 'Проверьте номер телефона.' };
    const orders = loadFromStorage<ServiceOrder[]>(ORDER_STORAGE_KEY, seedOrders);
    const previousClients = loadFromStorage<Client[]>(CLIENT_STORAGE_KEY, seedClients);
    const normalizedPhone = normalizePhone(values.phone);
    const existingClient = previousClients.find((client) => client.type === 'Частный клиент' && normalizePhone(client.phone) === normalizedPhone);
    const clientId = existingClient?.id ?? `client-web-${Date.now()}`;
    const now = new Date();
    const lastVisit = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).format(now).replace('.', '');
    const updatedClient: Client = existingClient
      ? { ...existingClient, name: values.name.trim(), phone: values.phone.trim(), email: values.email.trim() || existingClient.email, orders: existingClient.orders + 1, lastVisit, channel: 'Сайт' }
      : { id: clientId, name: values.name.trim(), type: 'Частный клиент', phone: values.phone.trim(), email: values.email.trim(), devices: 1, orders: 1, lastVisit, channel: 'Сайт' };
    const nextClients = existingClient
      ? previousClients.map((client) => client.id === existingClient.id ? updatedClient : client)
      : [updatedClient, ...previousClients];
    saveToStorage(CLIENT_STORAGE_KEY, nextClients);
    if (!loadFromStorage<Client[]>(CLIENT_STORAGE_KEY, []).some((client) => client.id === clientId)) {
      trackPublicEvent('form_error', { form: 'booking', reason: 'client_storage_failure', page });
      return { ok: false, message: 'Не удалось сохранить карточку клиента в браузере. Данные формы не отправлены.' };
    }
    const maxId = Math.max(2846, ...orders.map((order) => Number(order.id.replace(/\D/g, '')) || 0));
    const orderId = `ТО-${maxId + 1}`;
    const createdAt = now.toISOString();
    const historyEvent = createHistoryEvent('Публичная форма ТОКОХОД', 'Новая заявка с сайта', 'Согласие на обработку данных зафиксировано');
    const utm = currentUtmParams();
    const created: ServiceOrder = {
      id: orderId,
      clientId,
      submittedAt: createdAt,
      createdAt: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(now).replace('.', ''),
      clientName: values.name.trim(),
      phone: values.phone.trim(),
      ...(values.email.trim() ? { email: values.email.trim() } : {}),
      sourceUrl: sourcePath(),
      ...(safeReferrer() ? { referrerUrl: safeReferrer() } : {}),
      ...(utm.utmSource ? { utmSource: utm.utmSource } : {}),
      ...(utm.utmMedium ? { utmMedium: utm.utmMedium } : {}),
      ...(utm.utmCampaign ? { utmCampaign: utm.utmCampaign } : {}),
      ...(utm.utmTerm ? { utmTerm: utm.utmTerm } : {}),
      ...(utm.utmContent ? { utmContent: utm.utmContent } : {}),
      contactChannel: values.contactChannel,
      preferredDate: values.preferredDate || undefined,
      ...(values.comment.trim() ? { clientComment: values.comment.trim() } : {}),
      ...(values.promoCode.trim() ? { promoCode: values.promoCode.trim() } : {}),
      consentAcceptedAt: createdAt,
      consentVersion: CONSENT_VERSION,
      deviceType: values.deviceType,
      brand: values.brand.trim() || 'Не указана',
      model: values.model.trim() || 'Модель не указана',
      ...(values.serial.trim() ? { serial: values.serial.trim() } : {}),
      qrId: `TK-${new Date().getFullYear().toString().slice(-2)}-${String(maxId + 1).slice(-4)}`,
      issue: values.issue.trim(),
      status: 'Новая заявка',
      source: 'Сайт',
      master: '—',
      dueDate: 'Без срока',
      estimateVersion: 0,
      estimateLines: [],
      publicStatusEnabled: false,
      battery: { swelling: false, caseDamage: false, heatMarks: false, odor: false, moisture: false, insulation: false, decision: 'Не оценена' },
      accessories: [],
      defects: [],
      photos: [],
      photoFileNames: values.photoNames,
      reservedParts: [],
      history: [historyEvent],
    };
    saveToStorage(ORDER_STORAGE_KEY, [created, ...orders]);
    const persistedOrders = loadFromStorage<ServiceOrder[]>(ORDER_STORAGE_KEY, []);
    if (!persistedOrders.some((order) => order.id === orderId)) {
      saveToStorage(CLIENT_STORAGE_KEY, previousClients);
      trackPublicEvent('form_error', { form: 'booking', reason: 'storage_failure', page });
      return { ok: false, message: 'Не удалось сохранить заявку в браузере. Данные формы остались на странице; повторите попытку позже.' };
    }
    const audit = loadFromStorage<HistoryEvent[]>(AUDIT_STORAGE_KEY, []);
    saveToStorage(AUDIT_STORAGE_KEY, [historyEvent, ...audit].slice(0, 200));
    const consents = loadFromStorage<Array<{ orderId: string; acceptedAt: string; version: string }>>(CONSENT_STORAGE_KEY, []);
    saveToStorage(CONSENT_STORAGE_KEY, [{ orderId, acceptedAt: createdAt, version: CONSENT_VERSION }, ...consents]);
    trackPublicEvent('form_submitted', { form: 'booking', deviceType: values.deviceType, source: 'Сайт' });
    return { ok: true, id: orderId };
  };

  const submitB2B = (values: B2BFormValues): SubmitResult => {
    trackPublicEvent('form_submit_attempt', { form: 'b2b', deviceCount: Number(values.deviceCount) || 0 });
    if (values.honeypot) {
      trackPublicEvent('form_error', { form: 'b2b', reason: 'spam_field' });
      return { ok: false, message: 'Не удалось обработать форму. Попробуйте ещё раз.' };
    }
    if (!limitFormRate()) {
      trackPublicEvent('form_error', { form: 'b2b', reason: 'rate_limited' });
      return { ok: false, message: 'Подождите несколько секунд перед повторной отправкой.' };
    }
    const inquiries = loadFromStorage<PublicB2BInquiry[]>(PUBLIC_B2B_INQUIRIES_STORAGE_KEY, []);
    const submittedAt = new Date().toISOString();
    const utm = currentUtmParams();
    const id = `B2B-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const inquiry: PublicB2BInquiry = {
      id,
      submittedAt,
      status: 'Новая заявка',
      companyName: values.companyName.trim(),
      contactName: values.contactName.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      deviceCount: Number(values.deviceCount),
      transportTypes: values.transportTypes,
      comment: values.comment.trim(),
      source: 'Сайт',
      sourceUrl: sourcePath(),
      ...(safeReferrer() ? { referrerUrl: safeReferrer() } : {}),
      ...(utm.utmSource ? { utmSource: utm.utmSource } : {}),
      ...(utm.utmMedium ? { utmMedium: utm.utmMedium } : {}),
      ...(utm.utmCampaign ? { utmCampaign: utm.utmCampaign } : {}),
      ...(utm.utmTerm ? { utmTerm: utm.utmTerm } : {}),
      ...(utm.utmContent ? { utmContent: utm.utmContent } : {}),
      consentAcceptedAt: submittedAt,
      consentVersion: CONSENT_VERSION,
    };
    saveToStorage(PUBLIC_B2B_INQUIRIES_STORAGE_KEY, [inquiry, ...inquiries]);
    const persisted = loadFromStorage<PublicB2BInquiry[]>(PUBLIC_B2B_INQUIRIES_STORAGE_KEY, []);
    if (!persisted.some((item) => item.id === id)) {
      trackPublicEvent('form_error', { form: 'b2b', reason: 'storage_failure' });
      return { ok: false, message: 'Не удалось сохранить запрос в браузере. Проверьте хранилище и повторите попытку.' };
    }
    const auditEntry = createHistoryEvent('Публичная B2B-форма', 'Получен запрос на обслуживание парка', id);
    const audit = loadFromStorage<HistoryEvent[]>(AUDIT_STORAGE_KEY, []);
    saveToStorage(AUDIT_STORAGE_KEY, [auditEntry, ...audit].slice(0, 200));
    trackPublicEvent('form_submitted', { form: 'b2b', deviceCount: inquiry.deviceCount });
    return { ok: true, id };
  };

  const bookingDialog = <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
    <DialogContent className="tp-booking-dialog">
      <DialogHeader className="tp-dialog-heading"><span className="tp-eyebrow">ЗАПИСЬ В ТОКОХОД</span><DialogTitle>Расскажите об устройстве</DialogTitle><DialogDescription>Оставьте контакты — в рабочей версии оператор подтвердит доступное время и дальнейшие шаги.</DialogDescription></DialogHeader>
      <BookingForm onSubmit={submitBooking} sourcePage={page} />
    </DialogContent>
  </Dialog>;

  let content: ReactNode;
  if (page === 'home') {
    content = <>
      <section className="tp-hero"><div className="tp-shell tp-hero-grid"><div className="tp-hero-copy"><span className="tp-eyebrow tp-hero-eyebrow"><i />СЕРВИС ЭЛЕКТРОТРАНСПОРТА · ВЕЛИКИЙ НОВГОРОД</span><h1>Сервис электротранспорта <span>в Великом Новгороде</span></h1><p className="tp-hero-lead">Диагностика, обслуживание и ремонт электросамокатов, электровелосипедов и моноколёс. Понятная смета до начала работ и цифровой паспорт устройства.</p><div className="tp-hero-actions"><button className="tp-button tp-button-primary" type="button" onClick={openBooking}>Записаться на сервис <ArrowRight size={18} /></button><button className="tp-button tp-button-secondary" type="button" onClick={() => { trackPublicEvent('consultation_opened'); openBooking(); }}>Получить консультацию <MessageCircle size={17} /></button></div><div className="tp-hero-points"><span><CheckCircle2 size={16} />Фотофиксация при приёмке</span><span><FileCheck2 size={16} />Смета до ремонта</span><span><ShieldCheck size={16} />Условия — в документе заказа</span><span><Smartphone size={16} />Статус в клиентском кабинете</span></div></div><figure className="tp-hero-visual"><img src="/images/tokohod-workshop-illustration.jpg" alt="Нейтральная иллюстрация аккуратной мастерской электротранспорта" fetchPriority="high" /><figcaption>Иллюстративный визуал · не фотография фактической мастерской</figcaption><div className="tp-visual-badge"><span><ShieldCheck size={16} /></span><div><strong>Сначала согласование</strong><small>работы — после вашего ответа</small></div></div></figure></div><div className="tp-shell tp-hero-contact-note"><Info size={15} /><span>Адрес, график и прямые контакты появятся после подтверждения реальных данных сервиса.</span><button type="button" onClick={() => navigate('/contacts')}>Контакты <ArrowRight size={14} /></button></div></section>
      <section className="tp-trust-strip tp-shell" aria-label="Принципы сервиса">{[{ icon: Smartphone, title: 'Приёмка с фиксацией', text: 'Комплектация и видимые дефекты' }, { icon: FileCheck2, title: 'Смета до работ', text: 'Решение остаётся за владельцем' }, { icon: Clock3, title: 'Понятный статус', text: 'Этапы заказа в кабинете' }, { icon: ShieldCheck, title: 'Условия — в документе', text: 'Зависят от работ и заказа' }].map(({ icon: Icon, title, text }) => <article key={title}><span><Icon size={19} /></span><div><strong>{title}</strong><small>{text}</small></div></article>)}</section>
      <section className="tp-section tp-shell" id="services"><div className="tp-section-heading"><div><span className="tp-eyebrow">ЧЕМ ПОМОЖЕМ</span><h2>Услуги для электротранспорта</h2></div><p>Состав работ и стоимость подтверждаются после осмотра. Неподтверждённые цены не публикуем.</p></div><ServiceGrid onBook={openBooking} /><div className="tp-section-cta"><span>Не знаете, какая услуга нужна?</span><button className="tp-text-link" type="button" onClick={openBooking}>Опишите симптом оператору <ArrowRight size={15} /></button></div></section>
      <SafetyBlock onBook={openBooking} />
      <section className="tp-section tp-section-muted" id="process"><div className="tp-shell"><div className="tp-section-heading"><div><span className="tp-eyebrow">ПРОЗРАЧНЫЙ ПУТЬ</span><h2>Как проходит ремонт</h2></div><p>Ни одна работа не начинается без согласования сметы.</p></div><div className="tp-process-grid">{processSteps.map(({ number, title, text, icon: Icon }) => <article className="tp-process-step" key={number}><span className="tp-process-number">{number}</span><span className="tp-process-icon"><Icon size={21} /></span><h3>{title}</h3><p>{text}</p></article>)}</div></div></section>
      <section className="tp-section tp-shell tp-passport-section"><div className="tp-passport-visual"><div className="tp-passport-card-visual"><div className="tp-passport-code" aria-hidden="true"><span/><span/><span/><i/><b/><em/></div><div><span className="tp-eyebrow">QR · ЦИФРОВОЙ ПАСПОРТ</span><strong>История вашего устройства</strong><small>Статус · документы · гарантия</small></div></div><span className="tp-passport-orbit orbit-one"/><span className="tp-passport-orbit orbit-two"/></div><div className="tp-passport-copy"><span className="tp-eyebrow">ПОСЛЕ ОБСЛУЖИВАНИЯ</span><h2>У устройства будет цифровой паспорт</h2><p>QR-код ведёт на общедоступную страницу с безопасной информацией. Владелец после входа получает свои заказы, историю, документы и гарантийные сведения.</p><ul><li><Check size={16}/>Публичный QR не показывает личные данные</li><li><Check size={16}/>Клиентский кабинет отделён от внутренней CRM</li><li><Check size={16}/>История и документы доступны владельцу</li></ul><div className="tp-passport-actions"><Link className="tp-button tp-button-secondary" to="/qr/TK-24-0182" onClick={() => trackPublicEvent('qr_passport_open')}>Посмотреть пример паспорта <ArrowRight size={16}/></Link><QRLookup onNavigate={(id) => navigate(`/qr/${encodeURIComponent(id)}`)} value={qrId} onChange={setQrId}/></div></div></section>
      <section className="tp-section tp-section-blue"><div className="tp-shell"><div className="tp-section-heading"><div><span className="tp-eyebrow">ДЛЯ КОМПАНИЙ</span><h2>Сервис для корпоративных парков</h2></div><p>Параметры договора, SLA и отчётности нужно согласовать под конкретный парк.</p></div><div className="tp-b2b-teaser"><div className="tp-b2b-icon"><FileCheck2 size={26}/></div><div><h3>Один понятный процесс для парка</h3><p>QR-паспорта, история работ, согласование смет и обсуждение приоритетов обслуживания.</p></div><Link className="tp-button tp-button-primary" to="/b2b" onClick={() => trackPublicEvent('b2b_page_click')}>Обсудить обслуживание парка <ArrowRight size={16}/></Link></div></div></section>
      <section className="tp-section tp-shell"><div className="tp-section-heading"><div><span className="tp-eyebrow">ОТВЕТЫ</span><h2>Частые вопросы</h2></div><Link className="tp-text-link" to="/faq">Все вопросы <ArrowRight size={15}/></Link></div><FAQList compact/><div className="tp-note-banner"><Info size={17}/><span>Отзывы не публикуем без подтверждённого источника и согласия автора. Сейчас вместо отзывов показываем процесс и правила работы.</span></div></section>
      <section className="tp-section tp-section-muted" id="request"><div className="tp-shell tp-booking-section"><div className="tp-section-heading"><div><span className="tp-eyebrow">ЗАПИСЬ НА СЕРВИС</span><h2>Расскажите, что случилось</h2></div><p>Заполните форму — заявка сохранится в демо-профиле этого браузера.</p></div><BookingForm onSubmit={submitBooking} sourcePage={page}/></div></section>
      <section className="tp-section tp-shell tp-contact-preview"><div><span className="tp-eyebrow">МЫ В ВЕЛИКОМ НОВГОРОДЕ</span><h2>Контакты и маршрут</h2><p>Фактические адрес, телефон, Telegram и график пока не предоставлены для публикации.</p></div><Link className="tp-button tp-button-secondary" to="/contacts">Открыть контакты <ArrowRight size={16}/></Link></section>
    </>;
  } else if (page === 'services') {
    content = <><PageIntro eyebrow="УСЛУГИ ТОКОХОД" title="Обслуживание электротранспорта" lead="Принимаем электросамокаты, электровелосипеды и моноколёса. Перечень работ и стоимость сервис подтверждает после осмотра." onBook={openBooking}/><section className="tp-section tp-shell"><ServiceGrid onBook={openBooking}/><div className="tp-service-info-grid"><article id="brakes"><span className="tp-contact-icon"><CircleHelp size={20}/></span><h3>Тормоза и колёса</h3><p>Износ, повреждения и совместимость деталей оцениваются при приёмке. Не эксплуатируйте устройство, если торможение стало небезопасным.</p><button className="tp-text-link" type="button" onClick={openBooking}>Записаться <ArrowRight size={15}/></button></article><article id="electronics"><span className="tp-contact-icon"><Zap size={20}/></span><h3>Электроника</h3><p>Описание симптома помогает подготовить приёмку, но не заменяет диагностику мастером. Не вскрывайте батарейный отсек.</p><button className="tp-text-link" type="button" onClick={openBooking}>Описать симптом <ArrowRight size={15}/></button></article><article id="parts"><span className="tp-contact-icon"><Package size={20}/></span><h3>Запчасти</h3><p>Подбор, стоимость и наличие подтверждаются по модели и конкретной детали. Не обещаем наличие до проверки.</p><button className="tp-text-link" type="button" onClick={openBooking}>Уточнить по модели <ArrowRight size={15}/></button></article></div></section><SafetyBlock onBook={openBooking}/></>;
  } else if (serviceDetails[page]) {
    const detail = serviceDetails[page]!;
    content = <><PageIntro eyebrow="УСЛУГИ ТОКОХОД" title={detail.title} lead={detail.intro} onBook={openBooking}/><section className="tp-section tp-shell tp-detail-layout"><div><h2>Как помогаем</h2><ul className="tp-check-list">{detail.points.map((point) => <li key={point}><Check size={17}/>{point}</li>)}</ul><h2>С чем можно обратиться</h2><ul className="tp-check-list">{detail.suitableFor.map((point) => <li key={point}><CheckCircle2 size={17}/>{point}</li>)}</ul><div className="tp-detail-safety"><ShieldCheck size={18}/><span>Сначала диагностика и смета. Удалённый диагноз и неподтверждённые сроки не выдаём.</span></div></div><aside className="tp-detail-aside"><img src="/images/tokohod-workshop-illustration.jpg" alt="Иллюстративное изображение мастерской электротранспорта" loading="lazy"/><small>Нейтральная иллюстрация, не фактическое фото мастерской.</small><button className="tp-button tp-button-primary" type="button" onClick={openBooking}>Записаться на сервис <ArrowRight size={16}/></button></aside></section><SafetyBlock onBook={openBooking}/><section className="tp-section tp-shell"><div className="tp-section-heading"><div><span className="tp-eyebrow">ВОПРОСЫ</span><h2>Перед визитом</h2></div></div><FAQList compact/></section></>;
  } else if (page === 'b2b') {
    content = <><PageIntro eyebrow="B2B · ВЕЛИКИЙ НОВГОРОД" title="Сервис для корпоративных парков" lead="Обсудим обслуживание парка электротранспорта, порядок приёмки, отчётность и ожидаемые сроки. Договор и SLA формируются после уточнения задач компании." onBook={openBooking}/><section className="tp-section tp-shell"><div className="tp-b2b-features">{[{icon:Bike,title:'Обслуживание парка',text:'Состав парка и приоритеты фиксируются в согласованном плане.'},{icon:QrCode,title:'QR-паспорта устройств',text:'Идентификация техники и связь с историей обслуживания.'},{icon:Clock3,title:'SLA по договору',text:'Целевые сроки определяются отдельно и фиксируются документально.'},{icon:FileText,title:'Отчёты и история',text:'Отчёт формируется по согласованным данным; внутренняя маржа не включается.'},{icon:ArrowUpRight,title:'Приоритетные заявки',text:'Порядок приоритета обсуждается до заключения договора.'},{icon:Wrench,title:'Сезонная профилактика',text:'Объём и календарь работ согласуются после инвентаризации парка.'}].map(({icon:Icon,title,text})=><article key={title}><span><Icon size={20}/></span><h3>{title}</h3><p>{text}</p></article>)}</div></section><section className="tp-section tp-section-muted"><div className="tp-shell tp-booking-section"><div className="tp-section-heading"><div><span className="tp-eyebrow">ОБСУДИТЬ ПАРК</span><h2>Запрос для компании</h2></div><p>Запрос попадает в демо-панель на этом устройстве; внешнего уведомления нет.</p></div><B2BInquiryForm onSubmit={submitB2B}/></div></section><CTASection onBook={openBooking} title="Подготовить обслуживание парка" text="Расскажите о количестве и типах техники — обсудим вводные без обещаний неподтверждённых условий."/></>;
  } else if (page === 'faq') {
    content = <><PageIntro eyebrow="FAQ" title="Вопросы и ответы" lead="Коротко о записи, диагностике, смете, безопасности и QR-паспорте." onBook={openBooking}/><section className="tp-section tp-shell"><FAQList/><div className="tp-note-banner"><Info size={17}/><span>Если не нашли ответ — оставьте заявку. Диагностика и рекомендации по конкретной неисправности возможны только после проверки мастером.</span></div></section><SafetyBlock onBook={openBooking}/></>;
  } else if (page === 'contacts') {
    content = <><PageIntro eyebrow="КОНТАКТЫ" title="ТОКОХОД в Великом Новгороде" lead="Перед визитом дождитесь подтверждения времени и фактической точки приёма. Публичный адрес и график появятся после подтверждения владельцем сервиса." onBook={openBooking}/><section className="tp-section tp-shell"><ContactDetails onBook={openBooking} onContactNotice={contactNoticeHandler}/><div className="tp-contact-caveat"><Info size={17}/><span>В этом демо реальные телефон, Telegram, e-mail, адрес и карта не заданы — мы не показываем случайные контакты или координаты.</span></div></section></>;
  } else if (page === 'privacy') {
    content = <><PageIntro eyebrow="ПЕРСОНАЛЬНЫЕ ДАННЫЕ" title="Политика обработки данных" lead="Публичная страница содержит только демонстрационный черновик. Перед запуском требуется проверить сведения об операторе и юридические условия." onBook={openBooking}/><section className="tp-section tp-shell tp-legal-copy"><div className="tp-legal-warning"><Info size={20}/><span><strong>Черновик, не юридическое заключение.</strong> Реквизиты оператора, адрес, сроки хранения и каналы реализации прав нужно подтвердить и утвердить до публикации.</span></div><h2>Какие данные собирает форма</h2><p>Имя, телефон, тип и модель устройства, описание проблемы, выбранный способ связи и предпочтительное время. E-mail, серийный номер, комментарий, промокод и названия выбранных файлов являются дополнительными сведениями.</p><h2>Для чего нужны данные</h2><p>В рабочем процессе они нужны для регистрации обращения, связи с владельцем, приёмки устройства и подготовки заказа. Согласие обязательно до отправки формы.</p><h2>Демо-режим</h2><p>В демо заявки, карточки клиентов, согласия и ограниченная локальная аналитика хранятся в localStorage этого браузера до очистки его данных. Аналитика учитывает просмотры страниц, открытия и попытки/ошибки форм, нажатия на телефон, e-mail и Telegram, услуги, B2B, QR, кабинет, документы и построение маршрута; события не отправляются на внешний сервер. В путях QR, статуса и сметы ID заменяется шаблоном, а UTM-значения, похожие на телефон или e-mail, скрываются. В браузере хранятся последние 2000 событий. Имена выбранных фото сохраняются в заявке, но сами изображения не загружаются.</p><h2>Права пользователя и сроки хранения</h2><p>Порядок доступа, исправления, отзыва согласия и удаления, точные сроки хранения, реквизиты оператора и контакт для обращений должен заполнить и проверить ответственный за обработку данных до публичного запуска.</p><p className="tp-legal-version">Редакция интерфейсного черновика: октябрь 2026. До утверждения не размещать реальные данные клиентов.</p></section></>;
  } else if (page === 'warranty') {
    content = <><PageIntro eyebrow="ГАРАНТИЯ" title="Условия гарантии" lead="Фактические сроки и покрытие зависят от выполненных работ и должны быть указаны в документе к заказу." onBook={openBooking}/><section className="tp-section tp-shell tp-legal-copy"><div className="tp-legal-warning"><Info size={20}/><span><strong>Публичные гарантийные условия ТОКОХОД ещё не утверждены.</strong> Не считаем универсальный срок или покрытие подтверждённым правилом.</span></div><h2>Что проверить в документе</h2><ul className="tp-check-list"><li><Check size={17}/>Номер заказа и перечень выполненных работ</li><li><Check size={17}/>Срок гарантии, указанный именно для заказа</li><li><Check size={17}/>Условия и ограничения, выданные сервисом</li><li><Check size={17}/>Контакт для обращения по выполненной работе</li></ul><h2>Как обратиться</h2><p>Откройте клиентский кабинет и создайте обращение по связанному заказу. Сам факт обращения не означает автоматического признания случая гарантийным. В демо форма не отправляет уведомление сервису.</p><Link className="tp-button tp-button-secondary" to="/client">Клиентский кабинет <ArrowRight size={16}/></Link></section></>;
  } else {
    content = <><PageIntro eyebrow="ЗАПИСЬ НА СЕРВИС" title="Оставить заявку" lead="Заполните форму. В рабочей версии оператор свяжется с вами для подтверждения времени приёмки." onBook={openBooking}/><section className="tp-section tp-section-muted"><div className="tp-shell tp-booking-section"><BookingForm onSubmit={submitBooking} sourcePage={page}/></div></section></>;
  }

  return <div className="tokohod-public">
    <PublicHeader onBook={openBooking} onContactNotice={contactNoticeHandler}/>
    {contactNotice && <div className="tp-global-notice tp-shell" role="status"><Info size={16}/><span>{contactNotice}</span><button type="button" aria-label="Скрыть сообщение" onClick={() => setContactNotice('')}><X size={16}/></button></div>}
    <main>{content}</main>
    <PublicFooter onBook={openBooking} onContactNotice={contactNoticeHandler}/>
    {bookingDialog}
  </div>;
}

function PageIntro({ eyebrow, title, lead, onBook }: { eyebrow: string; title: string; lead: string; onBook: () => void }) {
  return <section className="tp-page-intro"><div className="tp-shell"><span className="tp-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{lead}</p><div><button className="tp-button tp-button-primary" type="button" onClick={onBook}>Записаться на сервис <ArrowRight size={17}/></button><Link className="tp-button tp-button-secondary" to="/contacts">Контакты <ArrowRight size={16}/></Link></div></div></section>;
}

function QRLookup({ value, onChange, onNavigate }: { value: string; onChange: (value: string) => void; onNavigate: (value: string) => void }) {
  const [error, setError] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = value.trim();
    if (!id) { setError('Введите QR-ID с наклейки устройства.'); return; }
    setError('');
    trackPublicEvent('qr_passport_check');
    onNavigate(id);
  };
  return <form className="tp-qr-lookup" onSubmit={submit}><label htmlFor="tp-qr-id">Проверить QR-паспорт</label><div><input id="tp-qr-id" value={value} onChange={(event) => { onChange(event.target.value); setError(''); }} placeholder="Введите QR-ID" /><button className="tp-button tp-button-primary" type="submit" aria-label="Найти QR-паспорт"><Search size={17}/><span>Проверить</span></button></div>{error && <span className="tp-form-error" role="alert">{error}</span>}</form>;
}

export default PublicSite;
