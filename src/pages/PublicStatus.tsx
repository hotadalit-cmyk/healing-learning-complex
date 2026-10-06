import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Wrench } from 'lucide-react';
import { CustomerShell } from '@/components/CustomerShell';
import { ORDER_STORAGE_KEY, loadFromStorage, safeDecodeURIComponent, seedOrders, type ServiceOrder } from '@/lib/tokoData';
import { trackPublicEvent } from '@/lib/publicSite';

const PublicStatus = () => {
  const { orderId = '' } = useParams();
  const decodedId = safeDecodeURIComponent(orderId).toLowerCase();
  const orders = loadFromStorage<ServiceOrder[]>(ORDER_STORAGE_KEY, seedOrders);
  const order = orders.find((item) => item.id.toLowerCase() === decodedId || item.qrId.toLowerCase() === decodedId);
  const mayShowServicePresence = !!order?.publicStatusEnabled && ['Принято', 'Диагностика', 'Ожидает согласования', 'В работе', 'Готово к выдаче', 'Гарантийное обращение'].includes(order.status);

  useEffect(() => {
    document.title = 'Статус устройства — ТОКОХОД';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex,nofollow';
    trackPublicEvent('pageview', { page: 'public_status' });
  }, [decodedId, order?.id]);

  return (
    <CustomerShell activeTab="service" homeHref="/client" backHref={order ? `/qr/${encodeURIComponent(order.qrId)}` : '/client'}>
      {mayShowServicePresence ? (
        <section className="customer-public-status-minimal">
          <span className="customer-empty-icon"><Wrench size={24} /></span>
          <span className="customer-eyebrow">ПУБЛИЧНАЯ ИНФОРМАЦИЯ</span>
          <h1>Устройство находится в сервисе</h1>
          <p>Подробный этап работ, смета, документы и история доступны владельцу в клиентском кабинете после подтверждения номера телефона.</p>
          <Link className="customer-primary-button" to="/client">Войти в клиентский кабинет <ArrowRight size={17} /></Link>
          <div className="customer-privacy-note"><ShieldCheck size={15} /><span>Публичная страница не раскрывает владельца, телефон, стоимость, сроки, историю или внутренние комментарии.</span></div>
        </section>
      ) : (
        <section className="customer-empty-state">
          <span className="customer-empty-icon"><ShieldCheck size={25} /></span>
          <span className="customer-eyebrow">СТАТУС УСТРОЙСТВА</span>
          <h1>Публичная информация недоступна</h1>
          <p>По этой ссылке нельзя посмотреть заказ. Войдите в клиентский кабинет для получения персональной информации.</p>
          <Link className="customer-primary-button" to="/client">Открыть клиентский кабинет <ArrowRight size={17} /></Link>
        </section>
      )}
    </CustomerShell>
  );
};

export default PublicStatus;
