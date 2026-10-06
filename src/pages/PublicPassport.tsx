import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, QrCode, ShieldCheck, UserRound, Wrench } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { CustomerShell, DeviceIllustration } from '@/components/CustomerShell';
import { ORDER_STORAGE_KEY, loadFromStorage, safeDecodeURIComponent, seedOrders, type ServiceOrder } from '@/lib/tokoData';
import { trackPublicEvent } from '@/lib/publicSite';

const PublicPassport = () => {
  const { qrId = '' } = useParams();
  const decodedQrId = safeDecodeURIComponent(qrId);
  const orders = loadFromStorage<ServiceOrder[]>(ORDER_STORAGE_KEY, seedOrders);
  const order = orders.find((item) => item.qrId.toLowerCase() === decodedQrId.toLowerCase());
  const showServicePresence = !!order?.publicStatusEnabled && ['Принято', 'Диагностика', 'Ожидает согласования', 'В работе', 'Готово к выдаче', 'Гарантийное обращение'].includes(order.status);
  const passportId = order?.qrId ?? decodedQrId;
  const passportUrl = `${window.location.origin}/qr/${encodeURIComponent(passportId)}`;
  const homeHref = `/qr/${encodeURIComponent(passportId)}`;

  useEffect(() => {
    document.title = order ? `QR-паспорт устройства ${passportId} — ТОКОХОД` : 'QR-паспорт не найден — ТОКОХОД';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.appendChild(description);
    }
    description.content = 'Общедоступный QR-паспорт устройства ТОКОХОД. Личные данные и история ремонта не показываются.';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex,nofollow';
    trackPublicEvent('qr_view', { knownDevice: Boolean(order) });
  }, [decodedQrId, order, passportId]);

  return (
    <CustomerShell activeTab="home" homeHref={homeHref} statusHref="/contacts" statusText={showServicePresence ? 'Устройство находится в сервисе. Подробный этап и смета доступны владельцу в кабинете.' : 'Публичный QR-паспорт показывает только сведения об устройстве.'} statusLinkLabel="Связаться с сервисом" action="notifications">
      {!order ? (
        <section className="customer-empty-state">
          <span className="customer-empty-icon"><QrCode size={25} /></span>
          <span className="customer-eyebrow">QR-ПАСПОРТ УСТРОЙСТВА</span>
          <h1>Паспорт не найден</h1>
          <p>Проверьте QR-ID или обратитесь в сервис, чтобы получить актуальную ссылку.</p>
          <Link className="customer-primary-button" to="/booking">Оставить заявку <ArrowRight size={17} /></Link>
        </section>
      ) : (
        <>
          <section className="customer-device-hero">
            <div className="customer-device-hero-top">
              <div>
                <span className="customer-eyebrow customer-eyebrow-light">ОБЩЕДОСТУПНЫЙ QR-ПАСПОРТ</span>
                <h1>Паспорт техники</h1>
              </div>
              <span className="device-hero-arrow" aria-hidden="true"><ArrowRight size={19} /></span>
            </div>
            <DeviceIllustration deviceType={order.deviceType} />
            <div className="customer-device-info">
              <span>{order.deviceType}</span>
              <strong>{order.brand} {order.model}</strong>
              <small>QR-ID · {passportId}</small>
            </div>
          </section>

          <section className="customer-qr-card" aria-label="QR-паспорт">
            <div className="customer-qr-code">
              <QRCodeSVG value={passportUrl} size={124} level="M" includeMargin bgColor="#ffffff" fgColor="#10233f" />
            </div>
            <div className="customer-qr-copy">
              <span className="customer-section-label"><QrCode size={14} />ПАСПОРТ УСТРОЙСТВА</span>
              <h2>QR-паспорт</h2>
              <p>Покажите код при обращении в сервис. Он поможет быстро найти карточку устройства.</p>
              <span className="customer-qr-id">{passportId}</span>
            </div>
          </section>

          {showServicePresence ? (
            <div className="customer-public-service-note"><span className="customer-list-action-icon status-blue"><Wrench size={19} /></span><span><strong>Устройство находится в сервисе</strong><small>Подробный статус виден только владельцу после входа в кабинет.</small></span></div>
          ) : (
            <div className="customer-private-note"><ShieldCheck size={18} /><span><strong>Публичная информация ограничена</strong><small>Здесь нет владельца, телефона, стоимости, истории ремонта или внутренних заметок.</small></span></div>
          )}

          <div className="customer-public-safety-note"><ShieldCheck size={18} /><span><strong>Безопасность</strong><small>Не используйте и не заряжайте устройство до осмотра. Для точной оценки требуется проверка мастером ТОКОХОД.</small></span></div>
          <Link className="customer-list-action" to="/client">
            <span className="customer-list-action-icon"><UserRound size={19} /></span>
            <span><strong>Войти в клиентский кабинет</strong><small>Статус, сметы и документы владельца</small></span>
            <ArrowRight size={18} />
          </Link>
          <Link className="customer-list-action" to="/booking">
            <span className="customer-list-action-icon"><Wrench size={19} /></span>
            <span><strong>Записаться на сервис</strong><small>Опишите проблему — сервис свяжется с вами</small></span>
            <ArrowRight size={18} />
          </Link>
          <Link className="customer-list-action" to="/contacts">
            <span className="customer-list-action-icon customer-list-shield"><ShieldCheck size={19} /></span>
            <span><strong>Гарантия и поддержка</strong><small>Условия уточнит сервисная команда</small></span>
            <ArrowRight size={18} />
          </Link>

          <div className="customer-privacy-note"><CheckCircle2 size={15} /><span>QR-страница доступна публично. Здесь нет личных и финансовых данных.</span></div>
        </>
      )}
      <div className="customer-app-footer"><Clock3 size={13} />ТОКОХОД · сервис электротранспорта</div>
    </CustomerShell>
  );
};

export default PublicPassport;
