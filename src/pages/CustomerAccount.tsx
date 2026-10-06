import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomerPortal } from '@/components/CustomerPortal';
import {
  AUDIT_STORAGE_KEY,
  ORDER_STORAGE_KEY,
  createHistoryEvent,
  formatRuble,
  loadFromStorage,
  saveToStorage,
  seedOrders,
  type ServiceOrder,
} from '@/lib/tokoData';
import { trackPublicEvent } from '@/lib/publicSite';

const CustomerAccount = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ServiceOrder[]>(() => loadFromStorage(ORDER_STORAGE_KEY, seedOrders));

  useEffect(() => saveToStorage(ORDER_STORAGE_KEY, orders), [orders]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === ORDER_STORAGE_KEY) setOrders(loadFromStorage(ORDER_STORAGE_KEY, seedOrders));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => {
    document.title = 'Клиентский кабинет · демо — ТОКОХОД';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex,nofollow';
    trackPublicEvent('pageview', { page: 'client_portal' });
  }, []);

  const decideQuote = (orderId: string, decision: 'Согласована' | 'Отклонена') => {
    const order = orders.find((item) => item.id === orderId);
    if (!order || order.status !== 'Ожидает согласования' || !order.estimateVersion || order.quoteDecision) return;
    const at = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date()).replace('.', '');
    const total = order.amount ?? order.estimateLines.reduce((sum, line) => sum + line.quantity * line.price, 0);
    const snapshot = order.estimateHistory?.find((item) => item.version === order.estimateVersion) ?? {
      version: order.estimateVersion,
      createdAt: order.createdAt,
      lines: order.estimateLines,
      total,
      decision: 'Ожидает ответа' as const,
    };
    const event = createHistoryEvent('Клиент · демо', `Смета v${order.estimateVersion} ${decision.toLowerCase()}`, `${formatRuble(total)} · ${at}`);
    const updated = orders.map((item) => item.id !== orderId ? item : {
      ...item,
      quoteDecision: decision,
      quoteDecidedAt: at,
      estimateHistory: [
        ...(item.estimateHistory ?? []).filter((entry) => entry.version !== item.estimateVersion),
        { ...snapshot, decision, decidedAt: at },
      ].sort((a, b) => a.version - b.version),
      history: [event, ...item.history],
    });
    setOrders(updated);
    saveToStorage(ORDER_STORAGE_KEY, updated);
    const audit = loadFromStorage<typeof event[]>(AUDIT_STORAGE_KEY, []);
    saveToStorage(AUDIT_STORAGE_KEY, [event, ...audit].slice(0, 100));
  };

  return <CustomerPortal orders={orders} onQuoteDecision={decideQuote} onSwitchRole={() => navigate('/workshop')} homeHref="/client" />;
};

export default CustomerAccount;
