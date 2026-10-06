import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { AlertTriangle, AudioLines, Check, CheckCircle2, ClipboardList, Copy, FileText, MessageSquareText, Mic, ShieldCheck, Sparkles } from 'lucide-react';
import { seedParts, type InventoryPart, type ServiceOrder } from '@/lib/tokoData';
import {
  AI_TEMPLATE_VERSION,
  DEMO_ACTOR_BY_ROLE,
  addAiLogEntry,
  createB2BReportDraft,
  createDraftCustomerMessage,
  draftRequestFromText,
  hasPassedCourse,
  isAiEnabled,
  redactPersonalData,
  setAiEnabled,
  updateAiLogEntry,
  type AppRole,
  type RequestDraft,
} from '@/lib/aiTools';

type WorkbenchTab = 'request' | 'diagnosis' | 'message' | 'report';

type DiagnosisDraft = {
  transcript: string;
  observations: string[];
  checklist: string[];
  suggestedWorks: string[];
  suggestedParts: InventoryPart[];
  customerExplanation: string;
  caution: string;
};

type AIWorkbenchProps = {
  role: AppRole;
  roleLabel: string;
  orders: ServiceOrder[];
  parts: InventoryPart[];
  onCreateRequest?: (draft: RequestDraft) => void;
  onConfirmDiagnosis?: (orderId: string, note: string) => void;
};

const messageTemplates = ['Заявка принята', 'Устройство принято', 'Нужно согласовать смету', 'Устройство готово', 'Перенос срока', 'Гарантийное обращение', 'Безопасность после влаги'];

function makeDiagnosisDraft(transcript: string, parts: InventoryPart[]): DiagnosisDraft {
  const text = transcript.trim();
  const lower = text.toLowerCase();
  const checklist: string[] = [];
  const suggestedWorks: string[] = [];
  const matchedParts: InventoryPart[] = [];

  if (/тормоз|колодк|диск/.test(lower)) {
    checklist.push('Осмотреть тормозной узел и зафиксировать износ по утверждённому чек-листу.');
    suggestedWorks.push('Проверка тормозной системы — объём и стоимость подтверждает мастер.');
    matchedParts.push(...parts.filter((part) => /тормоз|колодк|диск/i.test(part.name)).slice(0, 2));
  }
  if (/рулев|люфт|подшипник/.test(lower)) {
    checklist.push('Проверить рулевой узел и крепёж без предположения об окончательной причине.');
    suggestedWorks.push('Регулировка или замена узла — только после ручной проверки.');
    matchedParts.push(...parts.filter((part) => /подшипник|рулев/i.test(part.name)).slice(0, 2));
  }
  if (/не заря|заряд|батар|аккумулятор|вздут|нагрев|запах|влага|дожд/.test(lower)) {
    checklist.push('Отдельно заполнить чек-лист риска батареи; отсутствие внешних признаков не является подтверждением исправности.');
  }
  if (checklist.length === 0) checklist.push('Сверить наблюдения с утверждённым чек-листом диагностики и добавить недостающие проверки.');
  const uniqueParts = [...new Map(matchedParts.map((part) => [part.id, part])).values()];
  const hasBatteryRisk = /вздут|поврежд.{0,12}(батар|аккумулятор)|нагрев|перегрев|дым|запах|влаг|намок/i.test(lower);
  const caution = hasBatteryRisk
    ? 'Возможен признак риска батареи. Не заряжать, не вскрывать и не ремонтировать батарею. Передать решение ответственному мастеру.'
    : /батар|аккумулятор/.test(lower)
      ? 'Запись не подтверждает безопасность батареи. Нужен отдельный ручной чек-лист мастера.'
      : 'Это черновик наблюдений, а не окончательный технический диагноз.';
  const customerExplanation = hasBatteryRisk
    ? 'В описании отмечен признак, требующий безопасной проверки. Не подключайте устройство к зарядке; сервис уточнит следующий шаг после осмотра.'
    : 'Мы проверим указанные признаки и сообщим подтверждённый результат диагностики до начала работ.';
  return {
    transcript: text,
    observations: text ? [text] : [],
    checklist,
    suggestedWorks,
    suggestedParts: uniqueParts,
    customerExplanation,
    caution,
  };
}

const AIWorkbench = ({ role, roleLabel, orders, parts, onCreateRequest, onConfirmDiagnosis }: AIWorkbenchProps) => {
  const [tab, setTab] = useState<WorkbenchTab>(() => role === 'b2b' ? 'report' : role === 'master' ? 'diagnosis' : 'request');
  const [requestText, setRequestText] = useState('');
  const [requestDraft, setRequestDraft] = useState<RequestDraft | null>(null);
  const [requestLogId, setRequestLogId] = useState('');
  const [requestError, setRequestError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? '');
  const [voiceName, setVoiceName] = useState('');
  const [diagnosisText, setDiagnosisText] = useState('');
  const [diagnosisDraft, setDiagnosisDraft] = useState<DiagnosisDraft | null>(null);
  const [diagnosisLogId, setDiagnosisLogId] = useState('');
  const [messageTemplate, setMessageTemplate] = useState(messageTemplates[0]);
  const [messageTone, setMessageTone] = useState<'Кратко' | 'Нейтрально' | 'Подробно'>('Нейтрально');
  const [messageText, setMessageText] = useState('');
  const [messageLogId, setMessageLogId] = useState('');
  const [reportText, setReportText] = useState('');
  const [reportLogId, setReportLogId] = useState('');
  const [notice, setNotice] = useState('');
  const [aiEnabled, setAiEnabledState] = useState(() => isAiEnabled(role));

  useEffect(() => {
    const sync = () => setAiEnabledState(isAiEnabled(role));
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('tokohod:ai-settings-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('tokohod:ai-settings-updated', sync);
    };
  }, [role]);

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? orders[0], [orders, selectedOrderId]);
  const effectiveParts = parts.length ? parts : seedParts;
  const allowedTabs = useMemo<WorkbenchTab[]>(() => {
    const tabs: WorkbenchTab[] = [];
    if (['owner', 'operator'].includes(role)) tabs.push('request');
    if (['owner', 'master'].includes(role)) tabs.push('diagnosis');
    if (['owner', 'operator', 'master'].includes(role)) tabs.push('message');
    if (['owner', 'operator', 'b2b'].includes(role)) tabs.push('report');
    return tabs;
  }, [role]);
  const canMakeRequest = allowedTabs.includes('request');
  const canMakeDiagnosis = allowedTabs.includes('diagnosis');
  const canMakeMessage = allowedTabs.includes('message');
  const canMakeReport = allowedTabs.includes('report');

  useEffect(() => {
    if (!allowedTabs.includes(tab)) setTab(allowedTabs[0] ?? 'request');
  }, [allowedTabs, tab]);

  const saveDraftLog = (action: string, source: string, input: string, output: string, orderId: string | null = selectedOrder?.id ?? null) => addAiLogEntry({
    actor: DEMO_ACTOR_BY_ROLE[role],
    role,
    action,
    ...(orderId ? { orderId } : {}),
    source,
    input: redactPersonalData(input),
    output: redactPersonalData(output),
    sourceVersion: AI_TEMPLATE_VERSION,
    status: 'Черновик ИИ',
  });

  const generateRequest = () => {
    if (!aiEnabled) return;
    if (!requestText.trim()) {
      setRequestError('Добавьте сообщение клиента или расшифровку заметки.');
      return;
    }
    const draft = draftRequestFromText(requestText);
    const log = saveDraftLog('Черновик заявки', 'Текст обращения · локальный демо-разбор', requestText, JSON.stringify(draft, null, 2), null);
    setRequestDraft(draft);
    setRequestLogId(log.id);
    setRequestError('');
    setNotice('Готов черновик. Проверьте каждое поле перед переносом в форму.');
  };

  const useRequestDraft = () => {
    if (!requestDraft || !requestLogId) return;
    const finalText = JSON.stringify(requestDraft, null, 2);
    updateAiLogEntry(requestLogId, { status: 'Подтверждено сотрудником', finalText });
    onCreateRequest?.(requestDraft);
    setRequestDraft(null);
    setRequestLogId('');
    setNotice('Черновик передан в форму заявки. Создание потребует отдельного подтверждения оператора.');
  };

  const generateDiagnosis = () => {
    if (!aiEnabled) return;
    if (!selectedOrder) {
      setNotice('Нет доступного заказа для создания диагностики.');
      return;
    }
    if (!diagnosisText.trim()) {
      setNotice('Добавьте расшифровку голосовой заметки для локального демо-разбора.');
      return;
    }
    const draft = makeDiagnosisDraft(diagnosisText, effectiveParts);
    const log = saveDraftLog('Черновик диагностики', voiceName ? 'Голосовая заметка · имя файла не записывается · расшифровка введена сотрудником' : 'Текстовая расшифровка заметки', diagnosisText, JSON.stringify(draft, null, 2));
    setDiagnosisDraft(draft);
    setDiagnosisLogId(log.id);
    setNotice('Черновик не меняет заказ. Проверьте наблюдения, чек-лист и рекомендации.');
  };

  const confirmDiagnosis = () => {
    if (!selectedOrder || !diagnosisDraft || !diagnosisLogId) return;
    const hasBatteryConcern = /вздут|поврежд.{0,12}(батар|аккумулятор)|нагрев|перегрев|дым|запах|влаг|намок/i.test(diagnosisText);
    const batteryTrainingPending = role === 'master' && hasBatteryConcern && !hasPassedCourse('master', 'battery-safety');
    const finalText = [
      `Наблюдения: ${diagnosisDraft.transcript}`,
      `Чек-лист: ${diagnosisDraft.checklist.join(' ')}`,
      `Клиентское объяснение: ${diagnosisDraft.customerExplanation}`,
      `Ограничение: ${diagnosisDraft.caution}`,
    ].join('\n');
    updateAiLogEntry(diagnosisLogId, { status: 'Подтверждено сотрудником', finalText });
    onConfirmDiagnosis?.(selectedOrder.id, finalText);
    setDiagnosisDraft(null);
    setDiagnosisLogId('');
    setNotice(batteryTrainingPending
      ? 'Наблюдения подтверждены и сохранены. Самостоятельная работа с батареей остаётся заблокированной до успешного курса; передайте решение ответственному мастеру.'
      : 'Диагностический черновик подтверждён сотрудником и добавлен в журнал заказа.');
  };

  const generateMessage = () => {
    if (!aiEnabled) return;
    if (!selectedOrder) {
      setNotice('Нет доступного заказа для сообщения.');
      return;
    }
    const message = createDraftCustomerMessage(selectedOrder, messageTemplate, messageTone);
    const log = saveDraftLog('Черновик сообщения клиенту', `Шаблон: ${messageTemplate} · тон: ${messageTone}`, selectedOrder.id, message);
    setMessageText(message);
    setMessageLogId(log.id);
    setNotice('Сообщение подготовлено, но не отправлено. Проверьте его и подтвердите текст.');
  };

  const confirmMessage = async () => {
    if (!messageText || !messageLogId) return;
    updateAiLogEntry(messageLogId, { status: 'Подтверждено сотрудником', finalText: messageText });
    setMessageLogId('');
    try {
      await navigator.clipboard.writeText(messageText);
      setNotice('Текст подтверждён и скопирован. Автоотправка отключена — отправьте его вручную по выбранному каналу.');
    } catch {
      setNotice('Текст подтверждён. Автоотправка отключена — скопируйте сообщение вручную.');
    }
  };

  const rejectMessage = () => {
    if (messageLogId) updateAiLogEntry(messageLogId, { status: 'Отклонено сотрудником', finalText: messageText });
    setMessageLogId('');
    setMessageText('');
    setNotice('Сообщение отклонено и сохранено в журнале.');
  };

  const generateReport = () => {
    if (!aiEnabled) return;
    const text = createB2BReportDraft(orders);
    const log = saveDraftLog('Черновик B2B-отчёта', 'Только заявки выбранной компании; закупочные цены исключены', `${orders.length} записей`, text, null);
    setReportText(text);
    setReportLogId(log.id);
    setNotice('Подготовлен черновик без маржи и закупочных цен. Перед выгрузкой подтвердите его.');
  };

  const confirmReport = () => {
    if (!reportText || !reportLogId) return;
    updateAiLogEntry(reportLogId, { status: 'Подтверждено сотрудником', finalText: reportText });
    setReportLogId('');
    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tokohod-b2b-otchet-draft.txt';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Черновик отчёта подтверждён и скачан. Проверьте его перед отправкой клиенту.');
  };

  const handleAudioSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setVoiceName(file.name);
    event.target.value = '';
  };

  const toggleAi = () => {
    const next = !aiEnabled;
    setAiEnabled(role, next);
    setAiEnabledState(next);
    addAiLogEntry({
      actor: DEMO_ACTOR_BY_ROLE[role],
      role,
      action: next ? 'Демо-помощник включён для роли' : 'Демо-помощник выключен для роли',
      source: 'Настройка роли · локальное демо',
      input: next ? 'Пользователь включил подсказки' : 'Пользователь отключил подсказки',
      output: `Демо-режим ИИ ${next ? 'включён' : 'выключен'} для роли «${roleLabel}».`,
      finalText: `Настройка переключена сотрудником: ${next ? 'включено' : 'выключено'}.`,
      sourceVersion: AI_TEMPLATE_VERSION,
      status: 'Подтверждено сотрудником',
    });
    setNotice(next ? 'Демо-помощник включён для текущей роли.' : 'Демо-помощник выключен для текущей роли.');
  };

  return (
    <div className="ai-workbench">
      <div className="ai-safety-banner"><ShieldCheck size={18} /><div><strong>ИИ создаёт только черновики</strong><span>Здесь нет подключения к внешней модели. Подсказки строятся локально по шаблонам и утверждённым материалам; фото не анализируются, аудио не загружается и не расшифровывается.</span></div><span className="ai-demo-pill">ДЕМО</span><button className="ai-toggle-button" aria-pressed={aiEnabled} onClick={toggleAi}>{aiEnabled ? 'Выключить ИИ' : 'Включить ИИ'}</button></div>
      {aiEnabled ? <>
      <div className="ai-tabs" role="tablist" aria-label="Инструменты ИИ">
        {canMakeRequest && <button className={tab === 'request' ? 'active' : ''} onClick={() => setTab('request')}><ClipboardList size={16} />Черновик заявки</button>}
        {canMakeDiagnosis && <button className={tab === 'diagnosis' ? 'active' : ''} onClick={() => setTab('diagnosis')}><Mic size={16} />Заметка мастера</button>}
        {canMakeMessage && <button className={tab === 'message' ? 'active' : ''} onClick={() => setTab('message')}><MessageSquareText size={16} />Сообщение</button>}
        {canMakeReport && <button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}><FileText size={16} />B2B-отчёт</button>}
      </div>

      {canMakeRequest && tab === 'request' && <section className="panel ai-tool-panel">
        <div className="ai-tool-heading"><span className="ai-tool-icon"><Sparkles size={19} /></span><div><h2>Заявка из сообщения</h2><p>Вставьте текст обращения или уже полученную расшифровку. Результат — черновик, не заказ.</p></div></div>
        <label className="field-label">Сообщение клиента<textarea rows={5} value={requestText} onChange={(event) => setRequestText(event.target.value)} placeholder="Например: Ninebot Max G2 после дождя не включается, появился запах. Телефон клиента вводить не нужно — контакт оператор добавит отдельно." /></label>
        <div className="ai-privacy-note"><ShieldCheck size={15} />В демо текст не отправляется внешнему ИИ. Перед будущим подключением персональные данные должны удаляться из запроса.</div>
        {requestError && <div className="ai-inline-error" role="alert">{requestError}</div>}
        <button className="ai-primary-button" onClick={generateRequest}><Sparkles size={16} />Создать черновик</button>
        {requestDraft && <div className="ai-result-card">
          <div className="ai-result-heading"><span><Sparkles size={15} />Черновик ИИ · требуется проверка</span><button onClick={() => { if (requestDraft && requestLogId) updateAiLogEntry(requestLogId, { status: 'Отклонено сотрудником' }); setRequestDraft(null); setRequestLogId(''); setNotice('Черновик отклонён и сохранён в журнале.'); }}>Отклонить</button></div>
          <div className="ai-draft-fields"><div><small>Тип устройства</small><strong>{requestDraft.deviceType}</strong></div><div><small>Бренд</small><strong>{requestDraft.brand}</strong></div><div><small>Модель</small><strong>{requestDraft.model}</strong></div><div><small>Категория · не диагноз</small><strong>{requestDraft.possibleCategory}</strong></div><div><small>Приоритет</small><strong>{requestDraft.priority}</strong></div></div>
          <div className="ai-draft-block"><small>Описание из обращения</small><p>{requestDraft.issue}</p></div>
          <div className={`ai-risk-note ${requestDraft.priority === 'Требует внимания' ? 'risk' : ''}`}><AlertTriangle size={16} /><span>{requestDraft.risk}</span></div>
          <div className="ai-draft-block"><small>Что уточнить</small>{requestDraft.questions.length ? <ul>{requestDraft.questions.map((question) => <li key={question}>{question}</li>)}</ul> : <p>Данных достаточно для черновика; подтвердите их при приёмке.</p>}</div>
          {requestDraft.missing.length > 0 && <div className="ai-missing-data"><strong>Не хватает данных</strong><span>{requestDraft.missing.join(' · ')}</span></div>}
          <div className="ai-missing-data"><strong>Контакты и согласие</strong><span>Номер телефона/email не переносятся автоматически; оператор заполняет их в полях контакта и подтверждает согласие отдельно.</span></div>
          <div className="ai-draft-block"><small>Следующий шаг</small><p>{requestDraft.nextStep}</p></div>
          <button className="ai-primary-button" onClick={useRequestDraft}><Check size={16} />Проверил — перенести в форму</button>
          <p className="ai-review-footnote">Перенос не создаёт заказ: оператор проверяет контактные данные, согласие и форму, затем отдельно сохраняет заявку.</p>
        </div>}
      </section>}

      {canMakeDiagnosis && tab === 'diagnosis' && <section className="panel ai-tool-panel">
        <div className="ai-tool-heading"><span className="ai-tool-icon"><AudioLines size={19} /></span><div><h2>Голосовая заметка мастера</h2><p>В демо вставьте расшифровку вручную. Аудиофайл остаётся в браузере и не расшифровывается сервером.</p></div></div>
        <div className="ai-form-row"><label className="field-label">Заказ<select value={selectedOrder?.id ?? ''} onChange={(event) => setSelectedOrderId(event.target.value)}>{orders.map((order) => <option value={order.id} key={order.id}>{order.id} · {order.brand} {order.model}</option>)}</select></label><label className="field-label ai-audio-upload"><span>Голосовая заметка · необязательно</span><input type="file" accept="audio/*" onChange={handleAudioSelect} /><span className="ai-upload-cta"><Mic size={15} />{voiceName || 'Выбрать аудиофайл'}</span></label></div>
        {voiceName && <div className="ai-privacy-note"><ShieldCheck size={15} />Файл «{voiceName}» не загружен. Для транскрибации потребуется защищённый speech-to-text контур.</div>}
        <label className="field-label">Расшифровка наблюдений<textarea rows={5} value={diagnosisText} onChange={(event) => setDiagnosisText(event.target.value)} placeholder="Например: люфт рулевой, тормозной диск изношен. Батарею не вскрывали; признаков перегрева при внешнем осмотре не замечено." /></label>
        <button className="ai-primary-button" onClick={generateDiagnosis}><Sparkles size={16} />Собрать черновик диагностики</button>
        {diagnosisDraft && <div className="ai-result-card">
          <div className="ai-result-heading"><span><Sparkles size={15} />Черновик диагностики · не заключение</span><button onClick={() => { if (diagnosisLogId) updateAiLogEntry(diagnosisLogId, { status: 'Отклонено сотрудником' }); setDiagnosisDraft(null); setNotice('Диагностический черновик отклонён.'); }}>Отклонить</button></div>
          <div className="ai-draft-block"><small>Факты из заметки</small>{diagnosisDraft.observations.map((observation) => <p key={observation}>{observation}</p>)}</div>
          <div className="ai-draft-block"><small>Проверить вручную</small><ul>{diagnosisDraft.checklist.map((item) => <li key={item}>{item}</li>)}</ul></div>
          {diagnosisDraft.suggestedWorks.length > 0 && <div className="ai-draft-block"><small>Возможные работы · проверить перед сметой</small><ul>{diagnosisDraft.suggestedWorks.map((item) => <li key={item}>{item}</li>)}</ul></div>}
          <div className="ai-draft-block"><small>Кандидаты из справочника запчастей · без резерва и цены</small>{diagnosisDraft.suggestedParts.length ? <ul>{diagnosisDraft.suggestedParts.map((part) => <li key={part.id}>{part.name} · {part.sku}</li>)}</ul> : <p>Совпадений в каталоге не найдено. Подберите позицию вручную.</p>}</div>
          <div className="ai-draft-block"><small>Объяснение для клиента</small><p>{diagnosisDraft.customerExplanation}</p></div>
          <div className="ai-risk-note risk"><AlertTriangle size={16} /><span>{diagnosisDraft.caution}</span></div>
          <button className="ai-primary-button" onClick={confirmDiagnosis}><Check size={16} />Подтвердить и добавить запись</button>
          {role === 'master' && !hasPassedCourse('master', 'battery-safety') && <p className="ai-review-footnote">Для самостоятельной работы с батареей нужно сначала пройти курс «Безопасность батарей» и набрать не менее 80%.</p>}
        </div>}
      </section>}

      {canMakeMessage && tab === 'message' && <section className="panel ai-tool-panel">
        <div className="ai-tool-heading"><span className="ai-tool-icon"><MessageSquareText size={19} /></span><div><h2>Редактор сообщений</h2><p>Выберите заказ и шаблон. ИИ не меняет цену, статус или срок и не отправляет текст.</p></div></div>
        <div className="ai-form-row"><label className="field-label">Заказ<select value={selectedOrder?.id ?? ''} onChange={(event) => setSelectedOrderId(event.target.value)}>{orders.map((order) => <option value={order.id} key={order.id}>{order.id} · {order.brand} {order.model}</option>)}</select></label><label className="field-label">Шаблон<select value={messageTemplate} onChange={(event) => setMessageTemplate(event.target.value)}>{messageTemplates.map((template) => <option key={template}>{template}</option>)}</select></label><label className="field-label">Тон<select value={messageTone} onChange={(event) => setMessageTone(event.target.value as typeof messageTone)}><option>Кратко</option><option>Нейтрально</option><option>Подробно</option></select></label></div>
        <button className="ai-primary-button" onClick={generateMessage}><Sparkles size={16} />Подготовить текст</button>
        {messageText && <div className="ai-result-card"><div className="ai-result-heading"><span><Sparkles size={15} />Черновик сообщения · не отправлено</span><span className="ai-source-version">{AI_TEMPLATE_VERSION}</span></div><textarea rows={5} value={messageText} readOnly={!messageLogId} onChange={(event) => setMessageText(event.target.value)} /><div className="ai-result-actions"><button className="ai-secondary-button" onClick={rejectMessage}>Отклонить</button><button className="ai-primary-button" disabled={!messageLogId} onClick={confirmMessage}><Copy size={15} />Подтвердить текст и скопировать</button></div><p className="ai-review-footnote">Отправка клиенту вручную, отдельным действием. Цифры сметы в тексте подставлены из заказа без изменений.</p></div>}
      </section>}

      {tab === 'report' && canMakeReport && <section className="panel ai-tool-panel">
        <div className="ai-tool-heading"><span className="ai-tool-icon"><FileText size={19} /></span><div><h2>Черновик B2B-отчёта</h2><p>Сводка статусов и сроков. Закупочные цены и внутренняя маржа не включаются.</p></div></div>
        <button className="ai-primary-button" onClick={generateReport}><Sparkles size={16} />Сформировать черновик</button>
        {reportText && <div className="ai-result-card"><div className="ai-result-heading"><span><Sparkles size={15} />Черновик ИИ · требуется проверка</span><span className="ai-source-version">{AI_TEMPLATE_VERSION}</span></div><textarea rows={10} value={reportText} readOnly={!reportLogId} onChange={(event) => setReportText(event.target.value)} /><button className="ai-primary-button" disabled={!reportLogId} onClick={confirmReport}><Check size={16} />Подтвердить и скачать</button><p className="ai-review-footnote">Проверьте состав отчёта и период перед передачей B2B-клиенту.</p></div>}
      </section>}
      </> : <section className="panel ai-disabled-panel"><span className="ai-tool-icon"><ShieldCheck size={20} /></span><div><h2>ИИ-помощник отключён</h2><p>Для роли «{roleLabel}» генерация демо-черновиков выключена. Поиск по утверждённой базе и Академия остаются доступны.</p><button className="ai-primary-button" onClick={toggleAi}>Включить демо-помощник</button></div></section>}

      {notice && <div className="ai-toast" role="status"><CheckCircle2 size={16} />{notice}<button aria-label="Закрыть" onClick={() => setNotice('')}>×</button></div>}
      <div className="ai-footer-note"><ShieldCheck size={14} />ИИ не меняет заказ, смету, цену, срок, SLA, статус и склад. Любой результат требует подтверждения человеком.</div>
    </div>
  );
};

export default AIWorkbench;
