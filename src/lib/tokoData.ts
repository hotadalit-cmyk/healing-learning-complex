export type OrderStatus =
  | 'Новая заявка'
  | 'Ожидает приёмки'
  | 'Принято'
  | 'Диагностика'
  | 'Ожидает согласования'
  | 'В работе'
  | 'Готово к выдаче'
  | 'Выдано'
  | 'Гарантийное обращение'
  | 'Отказ / не ремонтируется';

export type HistoryEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
  note?: string;
};

export type EstimateLine = {
  title: string;
  kind: 'Работа' | 'Запчасть';
  quantity: number;
  price: number;
};

export type EstimateSnapshot = {
  version: number;
  createdAt: string;
  lines: EstimateLine[];
  total: number;
  decision: 'Ожидает ответа' | 'Согласована' | 'Отклонена';
  decidedAt?: string;
};

export type BatteryAssessment = {
  swelling: boolean;
  caseDamage: boolean;
  heatMarks: boolean;
  odor: boolean;
  moisture: boolean;
  insulation: boolean;
  decision: string;
  note?: string;
};

export type WarrantyInfo = {
  documentNumber: string;
  workUntil: string;
  partsUntil?: string;
  coveredWork: string[];
  coveredParts: string[];
  terms: string;
};

export type ServiceOrder = {
  id: string;
  clientId?: string;
  submittedAt?: string;
  createdAt: string;
  clientName: string;
  phone: string;
  email?: string;
  companyId?: string;
  sourceUrl?: string;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  contactChannel?: string;
  preferredDate?: string;
  clientComment?: string;
  promoCode?: string;
  consentAcceptedAt?: string;
  consentVersion?: string;
  deviceType: string;
  brand: string;
  model: string;
  color?: string;
  serial?: string;
  qrId: string;
  issue: string;
  status: OrderStatus;
  source: string;
  master: string;
  dueDate: string;
  amount?: number;
  estimateVersion: number;
  estimateLines: EstimateLine[];
  estimateHistory?: EstimateSnapshot[];
  publicStatusEnabled?: boolean;
  quoteDecision?: 'Согласована' | 'Отклонена';
  quoteDecidedAt?: string;
  warranty?: WarrantyInfo;
  battery: BatteryAssessment;
  accessories: string[];
  defects: string[];
  photos: string[];
  photoFileNames?: string[];
  reservedParts: { partId: string; quantity: number }[];
  history: HistoryEvent[];
};

export type InventoryPart = {
  id: string;
  name: string;
  sku: string;
  supplier: string;
  purchasePrice: number;
  retailPrice: number;
  stock: number;
  reserved: number;
  minStock: number;
  compatible: string[];
};

export type Client = {
  id: string;
  name: string;
  type: 'Частный клиент' | 'Компания';
  phone: string;
  email: string;
  devices: number;
  orders: number;
  lastVisit: string;
  channel: string;
};

export type FleetCompany = {
  id: string;
  name: string;
  inn: string;
  contact: string;
  phone: string;
  devices: number;
  activeOrders: number;
  sla: string;
  contract: string;
  color: string;
};

const history = (events: Array<[string, string, string, string?]>): HistoryEvent[] =>
  events.map(([at, actor, action, note], index) => ({
    id: `event-${index}-${at}`,
    at,
    actor,
    action,
    ...(note ? { note } : {}),
  }));

export const seedOrders: ServiceOrder[] = [
  {
    id: 'ТО-2846',
    createdAt: '06 окт, 10:42',
    clientName: 'Сергей Иванов',
    phone: '+7 921 730-48-12',
    email: 'ivanov.s@mail.ru',
    deviceType: 'Электросамокат',
    brand: 'Xiaomi',
    model: 'Mi Electric Scooter 4 Pro',
    color: 'Чёрный',
    serial: 'SN-XM4P-09831',
    qrId: 'TK-24-0182',
    publicStatusEnabled: true,
    issue: 'Самокат выключается на ходу, ошибка 21 на дисплее.',
    status: 'Диагностика',
    source: 'QR-код',
    master: 'Илья К.',
    dueDate: 'Сегодня, 17:00',
    amount: 0,
    estimateVersion: 0,
    estimateLines: [],
    battery: { swelling: false, caseDamage: false, heatMarks: false, odor: false, moisture: false, insulation: false, decision: 'Не оценена' },
    accessories: ['Зарядное устройство'],
    defects: ['Потёртость на правой ручке'],
    photos: ['Фото приёмки 1', 'Фото серийного номера'],
    reservedParts: [],
    history: history([
      ['06 окт, 10:42', 'Алексей М.', 'Создана заявка', 'Источник: QR-код'],
      ['06 окт, 11:10', 'Ольга С.', 'Устройство принято', 'Зафиксировано 2 фото, зарядное устройство'],
      ['06 окт, 11:35', 'Илья К.', 'Начата диагностика'],
    ]),
  },
  {
    id: 'ТО-2845',
    createdAt: '06 окт, 09:18',
    clientName: 'Алина Смирнова',
    phone: '+7 911 602-11-38',
    email: 'alina.smirnova@mail.ru',
    deviceType: 'Электросамокат',
    brand: 'Segway-Ninebot',
    model: 'Max G2',
    color: 'Серый',
    serial: 'SN-NB2-74215',
    qrId: 'TK-24-0179',
    publicStatusEnabled: true,
    issue: 'Люфт рулевой колонки, скрип передней подвески.',
    status: 'Ожидает согласования',
    source: 'Сайт',
    master: 'Денис П.',
    dueDate: 'Сегодня, 18:00',
    amount: 8420,
    estimateVersion: 2,
    estimateLines: [
      { title: 'Регулировка рулевой колонки', kind: 'Работа', quantity: 1, price: 1800 },
      { title: 'Замена подшипника рулевой', kind: 'Работа', quantity: 1, price: 1200 },
      { title: 'Подшипник рулевой 6802-2RS', kind: 'Запчасть', quantity: 2, price: 2710 },
    ],
    estimateHistory: [
      {
        version: 1,
        createdAt: '05 окт, 15:35',
        lines: [
          { title: 'Регулировка рулевой колонки', kind: 'Работа', quantity: 1, price: 1800 },
          { title: 'Замена подшипника рулевой', kind: 'Работа', quantity: 1, price: 1200 },
          { title: 'Подшипник рулевой 6802-2RS', kind: 'Запчасть', quantity: 2, price: 2500 },
        ],
        total: 8000,
        decision: 'Отклонена',
        decidedAt: '05 окт, 18:10',
      },
      {
        version: 2,
        createdAt: '06 окт, 09:18',
        lines: [
          { title: 'Регулировка рулевой колонки', kind: 'Работа', quantity: 1, price: 1800 },
          { title: 'Замена подшипника рулевой', kind: 'Работа', quantity: 1, price: 1200 },
          { title: 'Подшипник рулевой 6802-2RS', kind: 'Запчасть', quantity: 2, price: 2710 },
        ],
        total: 8420,
        decision: 'Ожидает ответа',
      },
    ],
    battery: { swelling: false, caseDamage: false, heatMarks: false, odor: false, moisture: false, insulation: false, decision: 'Риск не выявлен' },
    accessories: ['Ключ от замка'],
    defects: ['Скол на деке, левая сторона'],
    photos: ['Приёмка — общий вид', 'Приёмка — дека'],
    reservedParts: [{ partId: 'part-bearing', quantity: 2 }],
    history: history([
      ['05 окт, 14:05', 'Ольга С.', 'Устройство принято'],
      ['05 окт, 15:20', 'Денис П.', 'Диагностика завершена'],
      ['06 окт, 09:18', 'Денис П.', 'Смета v2 отправлена клиенту', '8 420 ₽ · ожидает ответа'],
    ]),
  },
  {
    id: 'ТО-2844',
    createdAt: '06 окт, 08:52',
    clientName: 'ЭкоЛогистика',
    phone: '+7 8162 55-20-10',
    companyId: 'fleet-eco',
    deviceType: 'Электровелосипед',
    brand: 'Volteco',
    model: 'Flex 500W · VN-014',
    color: 'Зелёный',
    serial: 'VL-F500-014',
    qrId: 'B2B-ECO-0014',
    issue: 'Плановое ТО: проверка тормозов и трансмиссии.',
    status: 'В работе',
    source: 'B2B-парк',
    master: 'Илья К.',
    dueDate: 'Сегодня, 16:00',
    amount: 6800,
    estimateVersion: 1,
    estimateLines: [
      { title: 'Комплексное ТО электровелосипеда', kind: 'Работа', quantity: 1, price: 4200 },
      { title: 'Колодки дискового тормоза', kind: 'Запчасть', quantity: 1, price: 2600 },
    ],
    quoteDecision: 'Согласована',
    quoteDecidedAt: '06 окт, 09:06',
    battery: { swelling: false, caseDamage: false, heatMarks: false, odor: false, moisture: false, insulation: false, decision: 'Риск не выявлен' },
    accessories: ['Ключи от батареи'],
    defects: [],
    photos: ['Приёмка — общий вид'],
    reservedParts: [{ partId: 'part-brake', quantity: 1 }],
    history: history([
      ['06 окт, 08:52', 'B2B-кабинет', 'Заявка создана', 'SLA: реакция до 10:52'],
      ['06 окт, 09:06', 'Анна, ЭкоЛогистика', 'Смета v1 согласована', '6 800 ₽'],
      ['06 окт, 09:18', 'Илья К.', 'Заказ взят в работу'],
    ]),
  },
  {
    id: 'ТО-2843',
    createdAt: '05 окт, 17:34',
    clientName: 'Мария Петрова',
    phone: '+7 921 196-23-04',
    deviceType: 'Электросамокат',
    brand: 'Kugoo',
    model: 'Kirin M4 Pro',
    color: 'Чёрный',
    serial: 'KG-M4-19072',
    qrId: 'TK-24-0175',
    issue: 'Замена камеры заднего колеса, прокол.',
    status: 'Готово к выдаче',
    source: 'Рекомендация',
    master: 'Денис П.',
    dueDate: 'Просрочен на 1 ч',
    amount: 3450,
    estimateVersion: 1,
    estimateLines: [
      { title: 'Замена камеры заднего колеса', kind: 'Работа', quantity: 1, price: 1400 },
      { title: 'Камера 10×2.5', kind: 'Запчасть', quantity: 1, price: 2050 },
    ],
    quoteDecision: 'Согласована',
    quoteDecidedAt: '05 окт, 18:04',
    battery: { swelling: false, caseDamage: false, heatMarks: false, odor: false, moisture: false, insulation: false, decision: 'Риск не выявлен' },
    accessories: [],
    defects: ['Царапины на заднем крыле'],
    photos: ['Приёмка — колесо', 'После ремонта'],
    reservedParts: [],
    history: history([
      ['05 окт, 17:34', 'Ольга С.', 'Устройство принято'],
      ['05 окт, 18:04', 'Мария Петрова', 'Смета v1 согласована', '3 450 ₽'],
      ['06 окт, 11:15', 'Денис П.', 'Ремонт завершён', 'Ожидает выдачи'],
    ]),
  },
  {
    id: 'ТО-2842',
    createdAt: '05 окт, 16:21',
    clientName: 'Денис Орлов',
    phone: '+7 905 290-32-40',
    deviceType: 'Электросамокат',
    brand: 'Kugoo',
    model: 'Kirin G2 Pro',
    color: 'Чёрный',
    serial: 'KG-G2-34804',
    qrId: 'TK-24-0171',
    issue: 'Не заряжается. На корпусе батареи есть вмятина после удара.',
    status: 'Ожидает приёмки',
    source: 'Телефон',
    master: '—',
    dueDate: 'Завтра, 12:00',
    amount: undefined,
    estimateVersion: 0,
    estimateLines: [],
    battery: { swelling: false, caseDamage: true, heatMarks: false, odor: false, moisture: false, insulation: false, decision: 'Передать мастеру для оценки до приёмки', note: 'Не подключать к зарядке до осмотра.' },
    accessories: [],
    defects: ['Со слов клиента: вмятина на батарейном отсеке'],
    photos: [],
    reservedParts: [],
    history: history([
      ['05 окт, 16:21', 'Ольга С.', 'Назначено время приёмки', '06 окт, 12:00'],
    ]),
  },
  {
    id: 'ТО-2841',
    createdAt: '05 окт, 15:50',
    clientName: 'Анна Кузнецова',
    phone: '+7 921 815-06-24',
    deviceType: 'Электровелосипед',
    brand: 'Xiaomi',
    model: 'Himo C26',
    color: 'Белый',
    serial: 'HM-C26-53284',
    qrId: 'TK-24-0167',
    issue: 'Перестал работать датчик ассистирования, нужна диагностика.',
    status: 'Новая заявка',
    source: 'Сайт',
    master: '—',
    dueDate: 'Без срока',
    amount: undefined,
    estimateVersion: 0,
    estimateLines: [],
    battery: { swelling: false, caseDamage: false, heatMarks: false, odor: false, moisture: false, insulation: false, decision: 'Не оценена' },
    accessories: [],
    defects: [],
    photos: ['Фото от клиента'],
    reservedParts: [],
    history: history([['05 окт, 15:50', 'Форма сайта', 'Получена новая заявка']]),
  },
  {
    id: 'ТО-2840',
    createdAt: '05 окт, 13:12',
    clientName: 'ИП Петров · Курьерская служба',
    phone: '+7 8162 61-10-04',
    companyId: 'fleet-delivery',
    deviceType: 'Электросамокат',
    brand: 'Segway-Ninebot',
    model: 'Max G30 · DP-021',
    color: 'Чёрный',
    serial: 'NB-G30-0021',
    qrId: 'B2B-DP-0021',
    issue: 'Не работает задний стоп-сигнал, проверка проводки.',
    status: 'В работе',
    source: 'B2B-парк',
    master: 'Денис П.',
    dueDate: 'Завтра, 14:00',
    amount: 4900,
    estimateVersion: 1,
    estimateLines: [
      { title: 'Диагностика электрики', kind: 'Работа', quantity: 1, price: 1900 },
      { title: 'Замена заднего фонаря', kind: 'Работа', quantity: 1, price: 1200 },
      { title: 'Фонарь задний Max G30', kind: 'Запчасть', quantity: 1, price: 1800 },
    ],
    quoteDecision: 'Согласована',
    quoteDecidedAt: '05 окт, 14:04',
    battery: { swelling: false, caseDamage: false, heatMarks: false, odor: false, moisture: false, insulation: false, decision: 'Риск не выявлен' },
    accessories: [],
    defects: [],
    photos: ['Приёмка — заднее колесо'],
    reservedParts: [],
    history: history([
      ['05 окт, 13:12', 'B2B-кабинет', 'Заявка создана'],
      ['05 окт, 14:04', 'ИП Петров', 'Смета v1 согласована', '4 900 ₽'],
      ['05 окт, 14:25', 'Денис П.', 'Заказ взят в работу'],
    ]),
  },
  {
    id: 'ТО-2839',
    createdAt: '04 окт, 12:06',
    clientName: 'Олег Фёдоров',
    phone: '+7 911 632-90-77',
    deviceType: 'Моноколесо',
    brand: 'KingSong',
    model: '16X',
    color: 'Чёрный',
    serial: 'KS-16X-18820',
    qrId: 'TK-24-0161',
    issue: 'Повторное обращение: ошибка контроллера после недавнего ремонта.',
    status: 'Гарантийное обращение',
    source: 'Повторный клиент',
    master: 'Илья К.',
    dueDate: 'Сегодня, 19:00',
    amount: 0,
    estimateVersion: 0,
    estimateLines: [],
    battery: { swelling: false, caseDamage: false, heatMarks: false, odor: false, moisture: false, insulation: false, decision: 'Не оценена' },
    accessories: ['Ручка для переноски'],
    defects: [],
    photos: ['Фото корпуса'],
    reservedParts: [],
    history: history([
      ['04 окт, 12:06', 'Ольга С.', 'Зарегистрировано гарантийное обращение'],
      ['04 окт, 12:20', 'Илья К.', 'Назначена повторная диагностика'],
    ]),
  },
  {
    id: 'ТО-2838',
    createdAt: '22 сен, 11:25',
    clientName: 'Алина Смирнова',
    phone: '+7 911 602-11-38',
    email: 'alina.smirnova@mail.ru',
    deviceType: 'Электровелосипед',
    brand: 'Himo',
    model: 'C26',
    color: 'Белый',
    serial: 'H26-54821',
    qrId: 'TK-24-0158',
    issue: 'Плановое техническое обслуживание.',
    status: 'Выдано',
    source: 'Клиент ТОКОХОД',
    master: 'Илья К.',
    dueDate: 'Выдано 22 сен',
    amount: 4850,
    estimateVersion: 1,
    estimateLines: [
      { title: 'Техническое обслуживание', kind: 'Работа', quantity: 1, price: 3500 },
      { title: 'Колодки тормозные', kind: 'Запчасть', quantity: 1, price: 1350 },
    ],
    estimateHistory: [{
      version: 1,
      createdAt: '22 сен, 12:10',
      lines: [
        { title: 'Техническое обслуживание', kind: 'Работа', quantity: 1, price: 3500 },
        { title: 'Колодки тормозные', kind: 'Запчасть', quantity: 1, price: 1350 },
      ],
      total: 4850,
      decision: 'Согласована',
      decidedAt: '22 сен, 12:24',
    }],
    quoteDecision: 'Согласована',
    quoteDecidedAt: '22 сен, 12:24',
    warranty: {
      documentNumber: 'Г-2838',
      workUntil: '2026-12-21',
      partsUntil: '2026-10-22',
      coveredWork: ['Техническое обслуживание'],
      coveredParts: ['Колодки тормозные'],
      terms: 'Демо-карточка для интерфейса. Фактические сроки и условия гарантии должны подтверждаться выданным сервисом документом.',
    },
    battery: { swelling: false, caseDamage: false, heatMarks: false, odor: false, moisture: false, insulation: false, decision: 'Риск не выявлен' },
    accessories: [],
    defects: [],
    photos: [],
    reservedParts: [],
    history: history([
      ['22 сен, 11:25', 'Ольга С.', 'Устройство принято'],
      ['22 сен, 12:10', 'Илья К.', 'Смета v1 создана'],
      ['22 сен, 12:24', 'Алина Смирнова', 'Смета v1 согласована'],
      ['22 сен, 15:30', 'Илья К.', 'Работы завершены'],
      ['22 сен, 16:05', 'Ольга С.', 'Устройство выдано'],
    ]),
  },
];

export const seedParts: InventoryPart[] = [
  { id: 'part-bearing', name: 'Подшипник рулевой 6802-2RS', sku: 'BR-6802', supplier: 'ВелоСклад', purchasePrice: 830, retailPrice: 1355, stock: 7, reserved: 2, minStock: 4, compatible: ['Ninebot Max G2', 'Xiaomi 4 Pro'] },
  { id: 'part-brake', name: 'Колодки дискового тормоза', sku: 'BR-PAD-14', supplier: 'ЭлектроПрофи', purchasePrice: 1420, retailPrice: 2600, stock: 3, reserved: 1, minStock: 5, compatible: ['Volteco Flex', 'Kugoo Kirin'] },
  { id: 'part-tube', name: 'Камера 10×2.5 усиленная', sku: 'TU-1025', supplier: 'СамокатМаркет', purchasePrice: 990, retailPrice: 2050, stock: 11, reserved: 0, minStock: 6, compatible: ['Kugoo M4 Pro', 'Ninebot Max G30'] },
  { id: 'part-light', name: 'Фонарь задний Max G30', sku: 'LT-G30-R', supplier: 'ВелоСклад', purchasePrice: 870, retailPrice: 1800, stock: 2, reserved: 0, minStock: 3, compatible: ['Segway-Ninebot Max G30'] },
  { id: 'part-cable', name: 'Кабель датчика PAS', sku: 'CB-PAS-01', supplier: 'ЭлектроПрофи', purchasePrice: 510, retailPrice: 1150, stock: 14, reserved: 0, minStock: 5, compatible: ['Xiaomi Himo C26', 'Himo C20'] },
];

export const seedClients: Client[] = [
  { id: 'client-1', name: 'Алина Смирнова', type: 'Частный клиент', phone: '+7 911 602-11-38', email: 'alina.smirnova@mail.ru', devices: 2, orders: 5, lastVisit: 'Сегодня', channel: 'Сайт' },
  { id: 'client-2', name: 'Сергей Иванов', type: 'Частный клиент', phone: '+7 921 730-48-12', email: 'ivanov.s@mail.ru', devices: 1, orders: 2, lastVisit: 'Сегодня', channel: 'QR-код' },
  { id: 'client-3', name: 'Мария Петрова', type: 'Частный клиент', phone: '+7 921 196-23-04', email: '—', devices: 1, orders: 3, lastVisit: 'Вчера', channel: 'Рекомендация' },
  { id: 'client-4', name: 'ЭкоЛогистика', type: 'Компания', phone: '+7 8162 55-20-10', email: 'service@ecolog-nov.ru', devices: 24, orders: 18, lastVisit: 'Сегодня', channel: 'B2B-парк' },
  { id: 'client-5', name: 'ИП Петров · Курьерская служба', type: 'Компания', phone: '+7 8162 61-10-04', email: 'fleet@petrov-delivery.ru', devices: 12, orders: 9, lastVisit: 'Сегодня', channel: 'B2B-парк' },
  { id: 'client-6', name: 'Денис Орлов', type: 'Частный клиент', phone: '+7 905 290-32-40', email: 'denis.orlov@mail.ru', devices: 1, orders: 1, lastVisit: 'Вчера', channel: 'Телефон' },
];

export const seedFleets: FleetCompany[] = [
  { id: 'fleet-eco', name: 'ЭкоЛогистика', inn: '5321184200', contact: 'Анна Морозова', phone: '+7 8162 55-20-10', devices: 24, activeOrders: 5, sla: '94%', contract: 'до 31.12.2026', color: '#d9ef83' },
  { id: 'fleet-delivery', name: 'Курьерская служба Петрова', inn: '532116809312', contact: 'Игорь Петров', phone: '+7 8162 61-10-04', devices: 12, activeOrders: 3, sla: '88%', contract: 'до 30.06.2027', color: '#cce6dc' },
  { id: 'fleet-city', name: 'СитиФуд Новгород', inn: '5321142309', contact: 'Оксана Белова', phone: '+7 8162 77-18-20', devices: 8, activeOrders: 2, sla: '100%', contract: 'до 15.03.2027', color: '#f1ddc9' },
];

export const ORDER_STORAGE_KEY = 'tokohod.orders.v1';
export const CLIENT_STORAGE_KEY = 'tokohod.clients.v1';
export const PARTS_STORAGE_KEY = 'tokohod.parts.v1';
export const AUDIT_STORAGE_KEY = 'tokohod.audit.v1';
export const CONSENT_STORAGE_KEY = 'tokohod.consents.v1';

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Demo mode keeps working if local storage is unavailable or full.
  }
}

export function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function formatRuble(value: number | undefined | null) {
  if (value === undefined || value === null) return '—';
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value) + ' ₽';
}

export function createHistoryEvent(actor: string, action: string, note?: string): HistoryEvent {
  const now = new Date();
  const at = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(now).replace('.', '');
  return {
    id: `event-${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`,
    at,
    actor,
    action,
    ...(note ? { note } : {}),
  };
}

export function currentTimestamp() {
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date());
}

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const next: Partial<Record<OrderStatus, OrderStatus>> = {
    'Новая заявка': 'Ожидает приёмки',
    'Ожидает приёмки': 'Принято',
    'Принято': 'Диагностика',
    'Диагностика': 'Ожидает согласования',
    'Ожидает согласования': 'В работе',
    'В работе': 'Готово к выдаче',
    'Готово к выдаче': 'Выдано',
  };
  return next[status] ?? null;
}

export const orderStatuses: OrderStatus[] = [
  'Новая заявка',
  'Ожидает приёмки',
  'Принято',
  'Диагностика',
  'Ожидает согласования',
  'В работе',
  'Готово к выдаче',
  'Выдано',
  'Гарантийное обращение',
  'Отказ / не ремонтируется',
];
