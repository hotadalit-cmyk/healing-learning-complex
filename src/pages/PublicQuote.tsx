import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Clock3, FileCheck2, ShieldCheck, X } from 'lucide-react';
import { CustomerShell } from '@/components/CustomerShell';
import {
  AUDIT_STORAGE_KEY,
  ORDER_STORAGE_KEY,
  createHistoryEvent,
  formatRuble,
  loadFromStorage,
  saveToStorage,
  safeDecodeURIComponent,
  seedOrders,
  type EstimateSnapshot,
  type ServiceOrder,
} from '@/lib/tokoData';
import { trackPublicEvent } from '@/lib/publicSite';

type Decision = 'Согласована' | 'Отклонена';

const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

const PublicQuote = () => {
  const { orderId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const versionParam = Number(searchParams.get('v')) || 0;
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const orders = loadFromStorage<ServiceOrder[]>(ORDER_STORAGE_KEY, seedOrders);
  const order = orders.find((item) => item.id.toLowerCase() === safeDecodeURIComponent(orderId).toLowerCase());
  const selectedVersion = useMemo(() => {
    if (!order?.estimateVersion) return null;
    const requested = versionParam || order.estimateVersion;
    if (requested === order.estimateVersion) {
      const snapshot = order.estimateHistory?.find((item) => item.version === requested);
      return snapshot ?? {
        version: order.estimateVersion,
        createdAt: order.history.find((event) => event.action.toLowerCase().includes('смет'))?.at ?? order.createdAt,
        lines: order.estimateLines,
        total: order.amount ?? order.estimateLines.reduce((sum, line) => sum + line.price * line.quantity, 0),
        decision: order.quoteDecision ?? 'Ожидает ответа',
        decidedAt: order.quoteDecidedAt,
      } as EstimateSnapshot;
    }
    return order.estimateHistory?.find((item) => item.version === requested) ?? null;
  }, [order, versionParam]);
  const isCurrentVersion = !!order && selectedVersion?.version === order.estimateVersion;
  const authorized = !!order && normalizePhone(verifiedPhone) === normalizePhone(order.phone);

  useEffect(() => {
    document.title = 'Смета на обслуживание — ТОКОХОД';
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex,nofollow';
    trackPublicEvent('document_view', { document: 'estimate' });
  }, [order?.id, selectedVersion?.version]);

  const requestDemoCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (normalizePhone(phone).length !== 10) {
      setAuthError('Введите номер телефона полностью.');
      return;
    }
    setAuthError('');
    setOtpRequested(true);
  };

  const verifyDemoCode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp !== '0000' || !order || normalizePhone(phone) !== normalizePhone(order.phone)) {
      setAuthError('Не удалось подтвердить данные. Проверьте номер и код или свяжитесь с сервисом.');
      return;
    }
    setVerifiedPhone(phone);
    setAuthError('');
  };

  const respond = (response: Decision) => {
    if (!order || !selectedVersion || !isCurrentVersion) return;
    if (order.quoteDecision) {
      setDecision(order.quoteDecision);
      return;
    }
    const acceptedAt = new Date();
    const formattedAt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(acceptedAt).replace('.', '');
    const event = createHistoryEvent('Клиент по ссылке', `Смета v${selectedVersion.version} ${response.toLowerCase()}`, `${formatRuble(selectedVersion.total)} · ${formattedAt}`);
    const updated: ServiceOrder[] = orders.map((item) => item.id !== order.id ? item : {
      ...item,
      quoteDecision: response,
      quoteDecidedAt: formattedAt,
      estimateHistory: (item.estimateHistory?.length
        ? item.estimateHistory.map((snapshot) => snapshot.version === selectedVersion.version ? { ...snapshot, decision: response, decidedAt: formattedAt } : snapshot)
        : [{ ...selectedVersion, decision: response, decidedAt: formattedAt }]),
      history: [event, ...item.history],
    });
    saveToStorage(ORDER_STORAGE_KEY, updated);
    const persistedOrder = loadFromStorage<ServiceOrder[]>(ORDER_STORAGE_KEY, seedOrders).find((item) => item.id === order.id);
    if (persistedOrder?.quoteDecision !== response) {
      setError('Не удалось сохранить решение в браузере. Проверьте хранилище и повторите действие.');
      return;
    }
    const audit = loadFromStorage<ReturnType<typeof createHistoryEvent>[]>(AUDIT_STORAGE_KEY, []);
    saveToStorage(AUDIT_STORAGE_KEY, [event, ...audit]);
    setDecision(response);
    setError('');
  };

  const handleResponse = (response: Decision) => {
    if (!selectedVersion || !order) return;
    const deadline = order.dueDate && order.dueDate !== 'Без срока' ? order.dueDate : 'уточняется сервисом';
    const confirmation = response === 'Согласована'
      ? `Вы подтверждаете смету v${selectedVersion.version} на ${formatRuble(selectedVersion.total)}. Ориентировочный срок: ${deadline}. Подтвердить эту версию?`
      : `Вы отклоняете смету v${selectedVersion.version} на ${formatRuble(selectedVersion.total)}. Работы не начнутся до согласования. Сохранить демо-решение в этом браузере?`;
    if (!window.confirm(confirmation)) return;
    respond(response);
  };

  const displayedDecision = decision ?? (isCurrentVersion ? order?.quoteDecision : selectedVersion?.decision === 'Согласована' || selectedVersion?.decision === 'Отклонена' ? selectedVersion.decision : null);
  const homeHref = '/client';

  return (
    <div className="quote-page">
      <CustomerShell activeTab="service" homeHref={homeHref} backHref={authorized && order ? `/qr/${encodeURIComponent(order.qrId)}` : '/client'} hideNavigation={!authorized}>
        <main className="quote-public-main">
          {!order || !selectedVersion ? (
            <div className="quote-not-found">
              <div className="quote-not-found-icon"><FileCheck2 size={27} /></div>
              <span className="customer-eyebrow">СМЕТА НЕ НАЙДЕНА</span>
              <h1>Ссылка устарела<br />или недействительна.</h1>
              <p>Попросите сервис ТОКОХОД прислать актуальную ссылку на согласование.</p>
              <Link className="customer-primary-button" to="/booking">Связаться с сервисом <ArrowRight size={16} /></Link>
            </div>
          ) : !authorized ? (
            <section className="customer-auth-view quote-auth-view">
              <span className="customer-auth-icon"><ShieldCheck size={25} /></span>
              <span className="customer-eyebrow">ЗАЩИЩЁННОЕ СОГЛАСОВАНИЕ</span>
              <h1>Подтвердите телефон</h1>
              <p className="customer-auth-lead">Введите номер, указанный при оформлении заказа. Смета и сведения о заказе появятся после проверки кода.</p>
              {!otpRequested ? <form className="customer-form-card" onSubmit={requestDemoCode}>
                <label htmlFor="quote-phone">Номер телефона</label>
                <input id="quote-phone" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+7 900 000-00-00" />
                {authError && <p className="customer-form-error">{authError}</p>}
                <button className="customer-primary-button" type="submit">Продолжить <ArrowRight size={16} /></button>
              </form> : <form className="customer-form-card" onSubmit={verifyDemoCode}>
                <div className="customer-login-phone-line"><span>Код для {phone.replace(/\d(?=\d{2})/g, '•')}</span><button type="button" onClick={() => { setOtpRequested(false); setAuthError(''); }}>Изменить</button></div>
                <label htmlFor="quote-code">Код подтверждения</label>
                <input id="quote-code" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" />
                <p className="customer-demo-hint"><ShieldCheck size={15} />Демо-код 0000. SMS и серверная проверка личности не подключены.</p>
                {authError && <p className="customer-form-error">{authError}</p>}
                <button className="customer-primary-button" type="submit">Открыть смету <ArrowRight size={16} /></button>
              </form>}
              <div className="customer-auth-privacy"><ShieldCheck size={15} /><span>В рабочей версии доступ должен проверяться сервером. Локальный демо-код не защищает данные production-клиентов.</span></div>
            </section>
          ) : (
            <>
              <div className="quote-public-eyebrow">
                <span className="customer-eyebrow">СОГЛАСОВАНИЕ РАБОТ</span>
                <span className="quote-version-pill">СМЕТА v{selectedVersion.version}</span>
              </div>
              <section className="quote-public-card">
                <div className="quote-public-top">
                  <div className="quote-public-icon"><FileCheck2 size={22} /></div>
                  <div><h1>Согласование сметы</h1><p>Заказ {order.id} · {order.brand} {order.model}</p></div>
                  <span className="quote-lock"><ShieldCheck size={15} />Сумма зафиксирована</span>
                </div>
                {!isCurrentVersion && <div className="quote-outdated-banner"><Clock3 size={16} /><span><strong>Это предыдущая версия сметы.</strong><small>Она сохранена в истории и не может изменить решение по текущей версии.</small></span></div>}
                <div className="quote-client-greeting"><span className="quote-person-mark">{order.clientName.split(' ').slice(0, 2).map((word) => word[0]).join('')}</span><div><strong>Здравствуйте, {order.clientName.split(' ')[0]}!</strong><span>Проверьте состав работ, стоимость и срок.</span></div></div>
                <div className="quote-public-lines">
                  <div className="quote-public-line quote-public-head"><span>Что нужно сделать</span><span>Кол-во</span><span>Стоимость</span></div>
                  {selectedVersion.lines.map((line, index) => <div className="quote-public-line" key={`${line.title}-${index}`}><span><strong>{line.title}</strong><small>{line.kind}</small></span><span>{line.quantity}</span><strong>{formatRuble(line.price * line.quantity)}</strong></div>)}
                  <div className="quote-public-total"><span>Итого к оплате после выполнения работ</span><strong>{formatRuble(selectedVersion.total)}</strong></div>
                </div>
                <div className="quote-term-note"><Clock3 size={16} /><span>Ориентировочный срок по заказу: {order.dueDate || 'уточняется сервисом'}. Если объём или срок изменится, сервис создаст новую версию и запросит повторное подтверждение.</span></div>
                <div className="quote-public-disclaimer"><ShieldCheck size={15} /><span>Согласованная версия фиксируется в истории заказа. Любые изменения требуют новой сметы и повторного согласования.</span></div>
                {displayedDecision ? (
                  <div className={`quote-public-result ${displayedDecision === 'Согласована' ? 'approved' : 'declined'}`}>
                    <span>{displayedDecision === 'Согласована' ? <CheckCircle2 size={20} /> : <X size={19} />}</span>
                    <div><strong>Смета {displayedDecision.toLowerCase()}</strong><small>{displayedDecision === 'Согласована' ? `Версия v${selectedVersion.version} · ${formatRuble(selectedVersion.total)} · ${decision ? order.quoteDecidedAt ?? '' : selectedVersion.decidedAt ?? ''}. Решение сохранено локально в демо; сервис не уведомлён.` : `Версия v${selectedVersion.version} · ${decision ? order.quoteDecidedAt ?? '' : selectedVersion.decidedAt ?? ''}. Решение хранится только в этом браузере; сервис не уведомлён.`}</small></div>
                  </div>
                ) : isCurrentVersion && (
                  <div className="quote-public-actions">
                    <button className="quote-decline-button" onClick={() => handleResponse('Отклонена')}><X size={16} />Отказаться</button>
                    <button className="quote-approve-button" onClick={() => handleResponse('Согласована')}><Check size={17} />Согласовать</button>
                  </div>
                )}
                {error && <p className="form-error">{error}</p>}
                <div className="quote-public-footnote"><Clock3 size={13} />Ссылка доступна только для согласования версии v{selectedVersion.version}.</div>
              </section>
              <Link className="quote-contact-link" to="/contacts">Есть вопрос по смете? Связаться с сервисом <ArrowRight size={14} /></Link>
            </>
          )}
        </main>
      </CustomerShell>
    </div>
  );
};

export default PublicQuote;
