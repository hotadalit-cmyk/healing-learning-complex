import type { ServiceOrder } from '@/lib/tokoData';

export type AiResultStatus = 'Черновик ИИ' | 'Требуется проверка' | 'Подтверждено сотрудником' | 'Отклонено сотрудником';
export type AppRole = 'owner' | 'operator' | 'master' | 'b2b' | 'client';
export const DEMO_ACTOR_BY_ROLE: Record<AppRole, string> = {
  owner: 'Алексей Михайлов',
  operator: 'Ольга Смирнова',
  master: 'Илья Кузнецов',
  b2b: 'ЭкоЛогистика · пользователь',
  client: 'Клиентский профиль · демо',
};

export type AiAuditEntry = {
  id: string;
  actor: string;
  role: AppRole;
  action: string;
  orderId?: string;
  source: string;
  input: string;
  output: string;
  finalText?: string;
  sourceVersion: string;
  status: AiResultStatus;
  createdAt: string;
};

export const AI_LOG_STORAGE_KEY = 'tokohod.ai-log.v1';
export const KNOWLEDGE_CUSTOM_STORAGE_KEY = 'tokohod.knowledge.custom.v1';
export const ACADEMY_PROGRESS_STORAGE_KEY = 'tokohod.academy.progress.v1';
export const AI_SETTINGS_STORAGE_KEY = 'tokohod.ai-settings.v1';
export const AI_TEMPLATE_VERSION = 'ai-templates-1.1-demo';

function notifyLocalChange(eventName: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(eventName));
}

export type AiSettings = Partial<Record<AppRole, boolean>>;

export function readAiSettings(): AiSettings {
  try {
    const value = window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY);
    return value ? (JSON.parse(value) as AiSettings) : {};
  } catch {
    return {};
  }
}

export function isAiEnabled(role: AppRole) {
  return readAiSettings()[role] !== false;
}

export function setAiEnabled(role: AppRole, enabled: boolean) {
  const settings = readAiSettings();
  try {
    window.localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify({ ...settings, [role]: enabled }));
  } catch {
    // The UI remains available if browser storage is disabled.
  }
  notifyLocalChange('tokohod:ai-settings-updated');
}

export type TrainingAttempt = { at: string; score: number; passed: boolean };
export type TrainingRecord = { completedLessons: string[]; attempts: TrainingAttempt[]; passed: boolean };
export type TrainingProgress = Partial<Record<AppRole, Record<string, TrainingRecord>>>;

export function readAiLog(): AiAuditEntry[] {
  try {
    const value = window.localStorage.getItem(AI_LOG_STORAGE_KEY);
    return value ? (JSON.parse(value) as AiAuditEntry[]) : [];
  } catch {
    return [];
  }
}

export function writeAiLog(entries: AiAuditEntry[]) {
  try {
    window.localStorage.setItem(AI_LOG_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // The demo remains usable when browser storage is unavailable.
  }
  notifyLocalChange('tokohod:ai-log-updated');
}

export function addAiLogEntry(entry: Omit<AiAuditEntry, 'id' | 'createdAt'>) {
  const record: AiAuditEntry = {
    ...entry,
    source: redactPersonalData(entry.source),
    input: redactPersonalData(entry.input),
    output: redactPersonalData(entry.output),
    ...(entry.finalText ? { finalText: redactPersonalData(entry.finalText) } : {}),
    id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  writeAiLog([record, ...readAiLog()]);
  return record;
}

export function updateAiLogEntry(id: string, patch: Partial<Pick<AiAuditEntry, 'status' | 'finalText'>>) {
  const safePatch = patch.finalText === undefined ? patch : { ...patch, finalText: redactPersonalData(patch.finalText) };
  writeAiLog(readAiLog().map((entry) => entry.id === id ? { ...entry, ...safePatch } : entry));
}

export function readTrainingProgress(): TrainingProgress {
  try {
    const value = window.localStorage.getItem(ACADEMY_PROGRESS_STORAGE_KEY);
    return value ? (JSON.parse(value) as TrainingProgress) : {};
  } catch {
    return {};
  }
}

export function writeTrainingProgress(value: TrainingProgress) {
  try {
    window.localStorage.setItem(ACADEMY_PROGRESS_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // The training prototype keeps running if storage is disabled.
  }
  notifyLocalChange('tokohod:academy-progress-updated');
}

export function hasPassedCourse(role: AppRole, courseId: string) {
  return readTrainingProgress()[role]?.[courseId]?.passed === true;
}

/** Redact identifiers before data is logged or a future server model is called. */
export function redactPersonalData(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email скрыт]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[телефон скрыт]');
}

export type RequestDraft = {
  deviceType: string;
  brand: string;
  model: string;
  issue: string;
  possibleCategory: string;
  priority: 'Обычная' | 'Требует внимания';
  risk: string;
  missing: string[];
  questions: string[];
  nextStep: string;
};

export function draftRequestFromText(rawText: string): RequestDraft {
  const input = rawText.trim();
  const text = input.toLowerCase();
  const deviceType = /моноколес|гироскутер/.test(text)
    ? 'Моноколесо'
    : /электровел|e-bike|велосипед/.test(text)
      ? 'Электровелосипед'
      : /самокат|scooter/.test(text)
        ? 'Электросамокат'
        : 'Не указано';
  const brands = ['Ninebot', 'Segway', 'Xiaomi', 'Kugoo', 'Volteco', 'KingSong', 'Inmotion', 'HIMO'];
  const brand = brands.find((item) => text.includes(item.toLowerCase())) ?? 'Не указана';
  const modelMatch = input.match(/\b(?:mi\s?\w*|max\s?g?\d?|m\d+|s\d+|v\d+|4\s?pro|flex\s?\d+w?)\b/i);
  const model = modelMatch?.[0] ?? 'Уточнить у клиента';
  const riskPattern = /вздут|дым|запах|нагрев|горяч|перегрев|влага|намок|дожд|искрит|поврежд.{0,12}батар|поврежд.{0,12}аккумулятор/i;
  const possibleRisk = riskPattern.test(text);
  const possibleCategory = /не заряжа|зарядк|зарядн/.test(text)
    ? 'Питание или зарядка — требует проверки мастером'
    : /тормоз|колодк|диск/.test(text)
      ? 'Тормозная система — требуется осмотр'
      : /рулев|люфт|скрип/.test(text)
        ? 'Рулевая часть или механика — требуется осмотр'
        : /не включ|выключ|ошибк|диспле/.test(text)
          ? 'Электрика или управление — требуется проверка'
          : 'Категория не определена — уточнить при приёмке';
  const missing = [
    ...(deviceType === 'Не указано' ? ['тип устройства'] : []),
    ...(brand === 'Не указана' ? ['бренд'] : []),
    ...(!modelMatch ? ['модель'] : []),
    ...(!/\+?\d[\d\s().-]{7,}\d/.test(input) ? ['телефон для связи'] : []),
  ];
  const questions = [
    ...(deviceType === 'Не указано' ? ['Какой это тип устройства?'] : []),
    ...(brand === 'Не указана' || !modelMatch ? ['Уточните бренд и точную модель устройства.'] : []),
    ...(possibleRisk ? ['Есть ли нагрев, запах, следы влаги или повреждение корпуса батареи?'] : []),
    ...(/не заря|зарядк/i.test(input) ? ['Когда устройство заряжалось в последний раз и использовалось ли после попадания влаги?'] : []),
  ].slice(0, 4);
  return {
    deviceType,
    brand,
    model,
    issue: input || 'Описание не указано — попросить клиента уточнить неисправность.',
    possibleCategory,
    priority: possibleRisk ? 'Требует внимания' : 'Обычная',
    risk: possibleRisk
      ? 'Возможны признаки риска. Не заряжать и не вскрывать устройство до оценки мастером.'
      : 'Оценка риска не выполнена. Мастер проверяет батарею при приёмке; отсутствие слов о риске не означает безопасность.',
    missing,
    questions,
    nextStep: possibleRisk
      ? 'Передать оператору предупреждение и согласовать безопасную приёмку; не обещать ремонт или зарядку.'
      : 'Уточнить недостающие данные и предложить приёмку для диагностики.',
  };
}

export type KnowledgeDocument = {
  id: string;
  title: string;
  category: string;
  source: string;
  version: string;
  roles: AppRole[];
  tags: string[];
  summary: string;
  steps: string[];
  safety?: boolean;
  status?: 'Утверждено' | 'Черновик';
};

export function readCustomKnowledge(): KnowledgeDocument[] {
  try {
    const value = window.localStorage.getItem(KNOWLEDGE_CUSTOM_STORAGE_KEY);
    return value ? (JSON.parse(value) as KnowledgeDocument[]) : [];
  } catch {
    return [];
  }
}

export function writeCustomKnowledge(docs: KnowledgeDocument[]) {
  try {
    window.localStorage.setItem(KNOWLEDGE_CUSTOM_STORAGE_KEY, JSON.stringify(docs));
  } catch {
    // Local prototype only; a server knowledge store is required for production.
  }
  notifyLocalChange('tokohod:knowledge-updated');
}

export const approvedKnowledge: KnowledgeDocument[] = [
  {
    id: 'battery-risk', title: 'Безопасность батарей и зона риска', category: 'Безопасность', source: 'Регламент ТОКОХОД по рискам батарей', version: '1.1', roles: ['owner', 'operator', 'master'], tags: ['аккумулятор', 'батарея', 'вздутие', 'влага', 'нагрев', 'запах', 'дым', 'зарядка'], safety: true,
    summary: 'При признаках вздутия, повреждения корпуса, перегрева, необычного запаха или следах влаги остановите обычный приёмочный сценарий и привлеките ответственного мастера.',
    steps: ['Не подключать к зарядке и не включать устройство.', 'Не вскрывать, не разбирать и не пытаться восстановить батарею.', 'Ограничить перемещение устройства и действовать по внутреннему регламенту безопасной зоны.', 'Зафиксировать наблюдаемые признаки без предположения о причине.', 'Передать решение ответственному мастеру; при сомнении не принимать батарею в ремонт.'],
  },
  {
    id: 'water-exposure', title: 'Устройство после дождя или попадания влаги', category: 'Безопасность', source: 'Чек-лист первичного обращения · раздел «Влага»', version: '1.0', roles: ['owner', 'operator', 'master', 'client'], tags: ['дождь', 'вода', 'влага', 'намок', 'мокрый', 'зарядка'], safety: true,
    summary: 'После контакта с влагой не предлагайте клиенту включать или заряжать устройство. Передайте случай на осмотр специалисту.',
    steps: ['Не подключать устройство к зарядному устройству.', 'Не включать его для проверки и не вскрывать корпус.', 'Уточнить обстоятельства попадания влаги и видимые признаки, не делать технический вывод по переписке.', 'Организовать безопасную приёмку и осмотр ответственным мастером.'],
  },
  {
    id: 'intake-checklist', title: 'Чек-лист приёмки электротранспорта', category: 'Приёмка', source: 'Стандарт приёмки ТОКОХОД', version: '1.2', roles: ['owner', 'operator', 'master'], tags: ['приёмка', 'фото', 'комплектация', 'серийный номер', 'заявка'],
    summary: 'Зафиксируйте устройство и его состояние до начала диагностики.',
    steps: ['Сверить тип, бренд, модель и серийный номер.', 'Записать со слов клиента описание проблемы, не трактуя его как диагноз.', 'Перечислить переданные аксессуары.', 'Сфотографировать общий вид, серийный номер и внешние дефекты.', 'Отдельно пройти чек-лист визуальных признаков риска батареи.', 'Создать заказ и подтвердить данные оператором или мастером.'],
  },
  {
    id: 'estimate-versions', title: 'Версии смет и согласование', category: 'Заказы', source: 'Регламент работы со сметой', version: '1.0', roles: ['owner', 'operator', 'master', 'b2b', 'client'], tags: ['смета', 'стоимость', 'согласование', 'версия', 'отказ'],
    summary: 'После изменения состава или стоимости работ создайте новую версию сметы. Подтверждённая версия остаётся в истории.',
    steps: ['Проверить позиции, количество и цену по заказу.', 'Сформировать новую версию, не перезаписывая предыдущую.', 'Объяснить клиенту только подтверждённые мастером работы и сроки.', 'Дождаться явного согласия клиента перед началом работ.', 'Зафиксировать решение и номер версии в истории заказа.'],
  },
  {
    id: 'battery-risk-client', title: 'Безопасность устройства и батареи', category: 'Безопасность', source: 'Памятка клиенту ТОКОХОД · безопасный ответ', version: '1.0', roles: ['client'], tags: ['батарея', 'аккумулятор', 'дым', 'запах', 'нагрев', 'вздутие', 'безопасность', 'зарядка'], safety: true,
    summary: 'Не используйте и не заряжайте устройство до осмотра. Для точной оценки требуется проверка мастером ТОКОХОД.',
    steps: ['Не используйте и не заряжайте устройство до осмотра.', 'Не вскрывайте, не разбирайте и не пытайтесь ремонтировать батарею.', 'Свяжитесь с сервисом, чтобы согласовать безопасную передачу устройства.'],
  },
  {
    id: 'client-preparing-service', title: 'Как подготовиться к визиту в сервис', category: 'Клиентам', source: 'Памятка клиенту ТОКОХОД', version: '1.0', roles: ['client'], tags: ['визит', 'сервис', 'приёмка', 'комплектация', 'подготовка'],
    summary: 'Перед визитом подготовьте QR-паспорт устройства и расскажите сотруднику, что именно заметили. Не пытайтесь заранее разбирать или ремонтировать технику.',
    steps: ['Покажите QR-паспорт или сообщите номер заказа.', 'Кратко опишите симптомы и когда они появились.', 'Возьмите только те аксессуары, которые связаны с обращением, и перечислите их сотруднику.', 'Дождитесь осмотра мастером до использования или зарядки при признаках риска.'],
  },
  {
    id: 'client-care', title: 'Уход за устройством', category: 'Клиентам', source: 'Памятка клиенту ТОКОХОД', version: '1.0', roles: ['client'], tags: ['уход', 'хранение', 'тормоза', 'колёса', 'проверка'],
    summary: 'Следуйте инструкции производителя и регулярно осматривайте устройство. При необычном звуке, ухудшении торможения или повреждении прекратите поездку и обратитесь в сервис.',
    steps: ['Храните устройство в сухом месте и ориентируйтесь на руководство производителя.', 'Перед поездкой визуально проверьте, что нет заметных повреждений и посторонних предметов.', 'Не вскрывайте электрические компоненты и не выполняйте ремонт батареи самостоятельно.', 'При запахе, нагреве, дыме, вздутии или следах влаги не используйте и не заряжайте устройство до осмотра мастером.'],
  },
  {
    id: 'client-warranty', title: 'Гарантия и обращение', category: 'Клиентам', source: 'Памятка клиенту ТОКОХОД', version: '1.0', roles: ['client'], tags: ['гарантия', 'обращение', 'талон', 'условия'],
    summary: 'Сроки и условия указаны в гарантийном документе к конкретному заказу. Если возник вопрос по выполненной работе, создайте обращение в кабинете.',
    steps: ['Откройте гарантийный документ в кабинете и проверьте срок.', 'Выберите связанный заказ и кратко опишите проблему.', 'Дождитесь подтверждения сервисной команды; обращение не означает автоматического признания случая гарантийным.'],
  },
  {
    id: 'status-for-client', title: 'Как читать статусы ремонта', category: 'Клиентам', source: 'Памятка клиенту ТОКОХОД', version: '1.0', roles: ['owner', 'operator', 'b2b', 'client'], tags: ['статус', 'ремонт', 'клиент', 'готово', 'согласование'],
    summary: 'Статусы показывают этап сервиса. Если требуется действие, откройте блок «Что нужно сделать» и используйте ссылку на смету.',
    steps: ['«Диагностика» — мастер проверяет устройство.', '«Ожидает согласования» — нужно проверить и подтвердить смету.', '«В работе» — работы начаты после согласования.', '«Готово к выдаче» — сервис сообщит, как согласовать время получения.'],
  },
  {
    id: 'b2b-sla', title: 'B2B: заявка и SLA', category: 'B2B', source: 'Приложение к договору обслуживания · демо-правило', version: '1.0', roles: ['owner', 'operator', 'b2b'], tags: ['b2b', 'sla', 'срок', 'парк', 'заявка'],
    summary: 'Отчёт для компании содержит только её заявки, сроки и согласованные работы. Закупочные цены и маржа не включаются.',
    steps: ['Проверить идентификатор устройства в парке.', 'Указать приоритет согласно договору.', 'Фиксировать время получения и реакции.', 'Эскалировать приближение к SLA владельцу или ответственному оператору.', 'Перед выгрузкой отчёта проверить, что в нём нет внутренних закупочных цен.'],
  },
  {
    id: 'client-data', title: 'Персональные данные в QR-паспорте', category: 'Конфиденциальность', source: 'Правила публикации ТОКОХОД', version: '1.0', roles: ['owner', 'operator', 'b2b', 'client'], tags: ['qr', 'паспорт', 'персональные данные', 'конфиденциальность'],
    summary: 'Публичный QR-паспорт не показывает ФИО, телефон, оплату, внутренние заметки или историю работ.',
    steps: ['Показывать только сведения об устройстве и разрешённый сервисный статус.', 'Для клиентской истории использовать авторизованный кабинет.', 'Не вставлять контакты, договоры и внутренние комментарии в публичные ссылки.'],
  },
  {
    id: 'ai-limitations', title: 'Границы ИИ-подсказок', category: 'ИИ', source: 'Политика использования ИИ ТОКОХОД', version: AI_TEMPLATE_VERSION, roles: ['owner', 'operator', 'master', 'b2b', 'client'], tags: ['ии', 'помощник', 'черновик', 'цена', 'статус'],
    summary: 'ИИ создаёт только черновики. Он не меняет цену, срок, статус, SLA, склад и решение по безопасности вместо сотрудника.',
    steps: ['Проверить результат по источнику или заказу.', 'Исправить неточности до подтверждения.', 'Подтверждение фиксируется в журнале.', 'Если утверждённого источника нет, не выполнять действие на основании предположения.'],
  },
];

export const KNOWLEDGE_FALLBACK = 'В утверждённой базе ТОКОХОД нет достаточной инструкции. Не выполняйте действие без согласования со старшим мастером.';

export function searchApprovedKnowledge(query: string, role: AppRole) {
  const words = query.toLowerCase().split(/[^а-яёa-z0-9]+/i).filter((word) => word.length > 2);
  if (words.length === 0) return [];
  const searchable = [...approvedKnowledge, ...readCustomKnowledge().filter((doc) => doc.status === 'Утверждено')];
  return searchable
    .filter((doc) => doc.roles.includes(role))
    .map((doc) => ({ doc, score: words.reduce((score, word) => score + ([doc.title, doc.category, doc.summary, ...doc.tags, ...doc.steps].join(' ').toLowerCase().includes(word) ? 1 : 0), 0) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ doc }) => doc);
}

export function createDraftCustomerMessage(order: ServiceOrder, template: string, tone: 'Кратко' | 'Нейтрально' | 'Подробно') {
  const device = `${order.brand} ${order.model}`;
  const greeting = `Здравствуйте! По вашему заказу ${order.id} (${device}).`;
  const body = template === 'Заявка принята'
    ? 'Заявка принята. Мы уточним удобное время приёмки и свяжемся с вами.'
    : template === 'Устройство принято'
      ? 'Устройство принято в сервис. После первичного осмотра мы сообщим следующий шаг.'
      : template === 'Нужно согласовать смету'
        ? order.estimateVersion > 0 && order.estimateLines.length > 0
          ? `Подготовлена смета v${order.estimateVersion}:\n${order.estimateLines.map((line) => `• ${line.title} — ${line.quantity} × ${new Intl.NumberFormat('ru-RU').format(line.price)} ₽`).join('\n')}\nИтого: ${new Intl.NumberFormat('ru-RU').format(order.amount ?? 0)} ₽. Работы начнутся только после вашего явного согласия.`
          : 'Смета ещё не сформирована. Мы сообщим состав и стоимость работ до их начала.'
        : template === 'Устройство готово'
          ? 'Работы завершены, устройство готово к выдаче. Пожалуйста, согласуйте с сервисом удобное время получения.'
          : template === 'Перенос срока'
            ? 'Срок выполнения изменился. Оператор свяжется с вами, объяснит причину и согласует новое ожидание.'
            : template === 'Гарантийное обращение'
              ? 'Мы зарегистрировали гарантийное обращение. Оператор уточнит данные и согласует приёмку.'
              : 'Чтобы безопасно проверить устройство, нужно провести осмотр в сервисе. Не ставьте его на зарядку до оценки мастером.';
  if (tone === 'Кратко') return `${greeting} ${body}`;
  if (tone === 'Подробно') return `${greeting}\n\n${body}\n\nЕсли у вас есть уточнения, ответьте на это сообщение или свяжитесь с сервисом через кабинет.`;
  return `${greeting}\n\n${body}`;
}

export function createB2BReportDraft(orders: ServiceOrder[]) {
  const companyOrders = orders.filter((order) => !!order.companyId);
  const done = companyOrders.filter((order) => ['Выдано', 'Готово к выдаче'].includes(order.status)).length;
  const overdue = companyOrders.filter((order) => order.dueDate.toLowerCase().includes('просрочен')).length;
  const open = companyOrders.filter((order) => !['Выдано', 'Отказ / не ремонтируется'].includes(order.status)).length;
  const deviceLines = companyOrders.map((order) => `• ${order.brand} ${order.model}: ${order.status}; срок — ${order.dueDate}.`);
  return [
    `Черновик отчёта ТОКОХОД · ${new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(new Date())}`,
    `Заявок за период: ${companyOrders.length}. Активных: ${open}. Готово к выдаче/выдано: ${done}. Просрочек по демо-данным: ${overdue}.`,
    '',
    'Статусы парка:',
    ...(deviceLines.length ? deviceLines : ['• За выбранный период заявок нет.']),
    '',
    'Рекомендация: согласовать список устройств для планового осмотра и проверить ближайшие сроки SLA.',
  ].join('\n');
}
