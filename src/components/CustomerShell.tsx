import { useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bell, Bike, CircleDot, Home, MessageCircle, UserRound, Wrench, Zap, type LucideProps } from 'lucide-react';

type CustomerNavItem = {
  id: string;
  label: string;
  icon: ComponentType<LucideProps>;
  to?: string;
};

type CustomerShellProps = {
  children: ReactNode;
  activeTab?: string;
  homeHref?: string;
  backHref?: string;
  statusHref?: string;
  statusText?: string;
  statusLinkLabel?: string;
  action?: 'notifications' | 'contact';
  navItems?: CustomerNavItem[];
  onNavigate?: (id: string) => void;
  onNotificationClick?: () => void;
  hideNavigation?: boolean;
  wide?: boolean;
};

export function CustomerShell({
  children,
  activeTab = 'service',
  homeHref = '/qr/TK-24-0182',
  backHref,
  statusHref = '/status/TK-24-0182',
  statusText = 'Посмотрите текущий этап обслуживания.',
  statusLinkLabel = 'Открыть статус',
  action = 'contact',
  navItems: suppliedNavItems,
  onNavigate,
  onNotificationClick,
  hideNavigation = false,
  wide = false,
}: CustomerShellProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navItems = suppliedNavItems ?? [
    { id: 'home', label: 'Главная', icon: Home, to: homeHref },
    { id: 'service', label: 'Сервис', icon: Wrench, to: '/booking' },
    { id: 'devices', label: 'Устройства', icon: Bike, to: homeHref },
    { id: 'profile', label: 'Профиль', icon: UserRound, to: '/contacts' },
  ];

  return (
    <div className={`customer-app${wide ? ' customer-app-wide' : ''}`}>
      <header className="customer-header">
        {backHref ? <Link className="customer-header-side" to={backHref} aria-label="Назад"><ArrowLeft size={21} /></Link> : <span className="customer-header-side" aria-hidden="true" />}
        <Link className="customer-brand" to={homeHref} aria-label="ТОКОХОД — главная">
          <span><Zap size={16} fill="currentColor" /></span>
          <strong>ТОКОХОД</strong>
        </Link>
        {action === 'notifications' ? (
          <div className="customer-notification-wrap">
            <button className="customer-header-side customer-header-action" onClick={() => onNotificationClick ? onNotificationClick() : setNotificationsOpen((open) => !open)} aria-label="Уведомления" aria-expanded={notificationsOpen}><Bell size={20} /></button>
            {notificationsOpen && <div className="customer-notification-popover"><strong>{statusText}</strong><Link to={statusHref}>{statusLinkLabel} <span>→</span></Link></div>}
          </div>
        ) : (
          <Link className="customer-header-side customer-header-action" to="/contacts" aria-label="Связаться с сервисом"><MessageCircle size={20} /></Link>
        )}
      </header>

      <main className="customer-main">{children}</main>

      {!hideNavigation && <nav className="customer-bottom-nav" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }} aria-label="Навигация клиента">
        {navItems.map(({ id, label, icon: Icon, to }) => onNavigate ? (
          <button key={id} type="button" className={activeTab === id ? 'active' : ''} onClick={() => onNavigate(id)} aria-current={activeTab === id ? 'page' : undefined}>
            <Icon size={20} strokeWidth={activeTab === id ? 2.3 : 1.8} />
            <span>{label}</span>
          </button>
        ) : (
          <Link key={id} className={activeTab === id ? 'active' : ''} to={to ?? homeHref} aria-current={activeTab === id ? 'page' : undefined}>
            <Icon size={20} strokeWidth={activeTab === id ? 2.3 : 1.8} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>}
    </div>
  );
}

export function DeviceIllustration({ deviceType }: { deviceType: string }) {
  if (/электровел|велосипед/i.test(deviceType)) return <Bike className="customer-bicycle-illustration" size={48} strokeWidth={1.5} aria-label="Электровелосипед" />;
  if (/моноколес/i.test(deviceType)) return <span className="customer-monowheel-illustration" role="img" aria-label="Моноколесо"><CircleDot size={52} strokeWidth={1.5} /><Zap size={17} fill="currentColor" /></span>;
  return <ScooterIllustration />;
}

export function ScooterIllustration() {
  return (
    <svg className="scooter-illustration" viewBox="0 0 420 270" role="img" aria-label="Электросамокат">
      <defs>
        <linearGradient id="scooter-metal" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#7f91a7" />
          <stop offset=".45" stopColor="#e8eef5" />
          <stop offset="1" stopColor="#7c8ea4" />
        </linearGradient>
        <linearGradient id="scooter-deck" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#344b66" />
          <stop offset="1" stopColor="#101e30" />
        </linearGradient>
      </defs>
      <ellipse cx="208" cy="238" rx="146" ry="13" fill="#07182c" opacity=".26" />
      <circle cx="104" cy="210" r="36" fill="#0c1725" stroke="#53657a" strokeWidth="7" />
      <circle cx="104" cy="210" r="18" fill="#2f80ed" stroke="#a9c8f7" strokeWidth="4" />
      <circle cx="329" cy="210" r="36" fill="#0c1725" stroke="#53657a" strokeWidth="7" />
      <circle cx="329" cy="210" r="18" fill="#2f80ed" stroke="#a9c8f7" strokeWidth="4" />
      <path d="M100 175 118 191 287 192 316 204 321 218 283 217 266 208 143 207 121 224 92 224 84 214Z" fill="url(#scooter-deck)" stroke="#a9b8c9" strokeWidth="3" />
      <path d="m270 192 31-148" fill="none" stroke="#121e2b" strokeWidth="19" strokeLinecap="round" />
      <path d="m270 192 31-148" fill="none" stroke="url(#scooter-metal)" strokeWidth="8" strokeLinecap="round" />
      <path d="m279 44 60 1" fill="none" stroke="#111e2d" strokeWidth="15" strokeLinecap="round" />
      <path d="m279 44 60 1" fill="none" stroke="url(#scooter-metal)" strokeWidth="7" strokeLinecap="round" />
      <path d="m301 88-13 25" fill="none" stroke="#8395aa" strokeWidth="5" strokeLinecap="round" />
      <rect x="300" y="173" width="25" height="9" rx="4" fill="#e8f4ff" />
      <path d="M340 42h12" stroke="#dbeafe" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}
