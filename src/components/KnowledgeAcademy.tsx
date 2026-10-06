import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, BookOpen, Check, CheckCircle2, CircleHelp, ClipboardCheck, Clock3, Download, FileText, GraduationCap, LockKeyhole, Search, ShieldAlert, ShieldCheck, Sparkles, Users } from 'lucide-react';
import {
  KNOWLEDGE_FALLBACK,
  addAiLogEntry,
  approvedKnowledge,
  DEMO_ACTOR_BY_ROLE,
  isAiEnabled,
  readAiLog,
  readCustomKnowledge,
  readTrainingProgress,
  searchApprovedKnowledge,
  writeCustomKnowledge,
  writeTrainingProgress,
  type AiAuditEntry,
  type AppRole,
  type KnowledgeDocument,
  type TrainingProgress,
} from '@/lib/aiTools';
import { type ServiceOrder } from '@/lib/tokoData';

const roleNames: Record<AppRole, string> = {
  owner: 'Владелец', operator: 'Оператор', master: 'Мастер', b2b: 'B2B-клиент', client: 'Клиент',
};

function formatAuditTimestamp(value: string) {
  const timestamp = new Date(value);
  return Number.isNaN(timestamp.getTime()) ? value : timestamp.toLocaleString('ru-RU');
}

function downloadCsv(filename: string, rows: string[][]) {
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const blob = new Blob(['\ufeff', rows.map((row) => row.map(cell).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function visibleApprovedDocs(role: AppRole) {
  const custom = readCustomKnowledge().filter((doc) => doc.status === 'Утверждено');
  return [...approvedKnowledge, ...custom].filter((doc) => doc.roles.includes(role));
}

type KnowledgePanelProps = {
  role: AppRole;
  query?: string;
  onQueryChange?: (query: string) => void;
};

export function KnowledgePanel({ role, query: controlledQuery, onQueryChange }: KnowledgePanelProps) {
  const [localQuery, setLocalQuery] = useState('');
  const [customDocs, setCustomDocs] = useState<KnowledgeDocument[]>(() => readCustomKnowledge());
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [version, setVersion] = useState('1.0');
  const [category, setCategory] = useState('Регламент');
  const [summary, setSummary] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [draftRoles, setDraftRoles] = useState<AppRole[]>(['owner', 'operator', 'master']);
  const [draftError, setDraftError] = useState('');
  const query = controlledQuery ?? localQuery;
  const isOwner = role === 'owner';

  useEffect(() => {
    const sync = () => setCustomDocs(readCustomKnowledge());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('tokohod:knowledge-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('tokohod:knowledge-updated', sync);
    };
  }, []);

  const updateQuery = (value: string) => {
    if (controlledQuery === undefined) setLocalQuery(value);
    onQueryChange?.(value);
  };
  const results = query.trim()
    ? searchApprovedKnowledge(query, role)
    : visibleApprovedDocs(role);
  const awaitingReview = customDocs.filter((doc) => doc.status === 'Черновик');

  const addDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const steps = stepsText.split('\n').map((step) => step.trim()).filter(Boolean);
    if (!title.trim() || !source.trim() || !summary.trim() || !steps.length) {
      setDraftError('Заполните название, источник, краткое содержание и хотя бы один шаг.');
      return;
    }
    const newDoc: KnowledgeDocument = {
      id: `custom-${Date.now()}`,
      title: title.trim(),
      category: category.trim() || 'Регламент',
      source: source.trim(),
      version: version.trim() || '1.0',
      roles: Array.from(new Set<AppRole>([...draftRoles, 'owner'])),
      tags: title.toLowerCase().split(/[^а-яёa-z0-9]+/i).filter((word) => word.length > 2).slice(0, 12),
      summary: summary.trim(),
      steps,
      status: 'Черновик',
    };
    const next = [newDoc, ...readCustomKnowledge()];
    writeCustomKnowledge(next);
    setCustomDocs(next);
    addAiLogEntry({ actor: DEMO_ACTOR_BY_ROLE[role], role, action: 'Материал базы знаний добавлен в черновики', source: source.trim(), input: title.trim(), output: `Черновик · версия ${newDoc.version}`, sourceVersion: newDoc.version, status: 'Требуется проверка' });
    setTitle('');
    setSource('');
    setVersion('1.0');
    setSummary('');
    setStepsText('');
    setDraftError('');
  };

  const approveDraft = (doc: KnowledgeDocument) => {
    if (!window.confirm(`Утвердить «${doc.title}» (${doc.source}, версия ${doc.version})? После утверждения материал станет доступен поиску.`)) return;
    const next = readCustomKnowledge().map((item) => item.id === doc.id ? { ...item, status: 'Утверждено' as const } : item);
    writeCustomKnowledge(next);
    setCustomDocs(next);
    addAiLogEntry({ actor: DEMO_ACTOR_BY_ROLE[role], role, action: 'Материал базы знаний утверждён', source: doc.source, input: doc.title, output: `Утверждено · версия ${doc.version}`, sourceVersion: doc.version, status: 'Подтверждено сотрудником' });
  };

  return (
    <div className="assist-layout">
      <div className="assist-demo-note"><ShieldCheck size={17} /><span><strong>Только утверждённые источники</strong> Поиск не генерирует инструкции. Ответы содержат выдержки из локальных документов с названием, источником и версией.</span><span className="ai-demo-pill">ДЕМО · ЛОКАЛЬНО</span></div>
      <section className="panel assist-panel knowledge-search-panel">
        <div className="assist-panel-heading"><span className="assist-icon"><Search size={19} /></span><div><h2>Поиск в базе знаний</h2><p>Роль: {roleNames[role]} · результаты ограничены разрешёнными материалами</p></div></div>
        <label className="assist-search-field"><Search size={17} /><input value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="Например: влага, смета, QR-паспорт…" /><span>Только источники</span></label>
        <div className="knowledge-quick-searches"><span>Частые темы</span>{['батарея', 'влага', 'приёмка', 'смета', 'QR-паспорт'].map((item) => <button key={item} onClick={() => updateQuery(item)}>{item}</button>)}</div>
        {results.length > 0 ? <div className="knowledge-results" aria-live="polite">{results.map((doc) => <article className="knowledge-result" key={doc.id}>
          <div className="knowledge-result-top"><span className="knowledge-category">{doc.category}</span>{doc.safety && <span className="knowledge-safety"><ShieldAlert size={13} />Безопасность</span>}</div>
          <h3>{doc.title}</h3><p>{doc.summary}</p>
          <ol>{doc.steps.map((step, index) => <li key={`${doc.id}-${index}`}>{step}</li>)}</ol>
          <div className="knowledge-citation"><FileText size={14} /><span><strong>Источник:</strong> {doc.source} · версия {doc.version}</span></div>
        </article>)}</div> : <div className="knowledge-fallback" role="status"><AlertTriangle size={18} /><div><strong>Источник не найден</strong><p>{KNOWLEDGE_FALLBACK}</p><span>Нет совпадающей утверждённой записи для роли «{roleNames[role]}».</span></div></div>}
        <div className="knowledge-privacy-note"><LockKeyhole size={14} />Поиск локальный. В демо содержимое запроса не передаётся во внешнюю модель.</div>
      </section>

      {isOwner && <section className="panel assist-panel knowledge-admin-panel">
        <div className="assist-panel-heading"><span className="assist-icon amber"><ClipboardCheck size={19} /></span><div><h2>Управление материалами</h2><p>Новый материал сначала сохраняется как черновик и не участвует в поиске.</p></div></div>
        <form className="knowledge-admin-form" onSubmit={addDraft}>
          <label className="field-label">Название<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Например: Приёмка после контакта с влагой" /></label>
          <div className="knowledge-form-row"><label className="field-label">Утверждённый источник<input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Регламент ТОКОХОД · раздел 2" /></label><label className="field-label">Версия<input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="1.0" /></label><label className="field-label">Категория<input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Безопасность" /></label></div>
          <label className="field-label">Краткое содержание<textarea rows={2} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Кратко, что разрешено делать согласно первоисточнику." /></label>
          <label className="field-label">Проверенные шаги<textarea rows={4} value={stepsText} onChange={(event) => setStepsText(event.target.value)} placeholder={'Один шаг на строку\nКаждый пункт должен соответствовать первоисточнику'} /></label>
          <fieldset className="knowledge-role-scope"><legend>Доступ к материалу после утверждения</legend>{(['operator', 'master', 'b2b', 'client'] as AppRole[]).map((item) => <label key={item}><input type="checkbox" checked={draftRoles.includes(item)} onChange={(event) => setDraftRoles((previous) => event.target.checked ? [...previous, item] : previous.filter((selected) => selected !== item))} /><span>{roleNames[item]}</span></label>)}</fieldset>
          <div className="knowledge-admin-foot"><span><ShieldCheck size={14} />После сохранения владелец должен отдельно утвердить материал.</span><button className="ai-primary-button" type="submit"><FileText size={15} />Сохранить как черновик</button></div>
          {draftError && <div className="ai-inline-error" role="alert">{draftError}</div>}
        </form>
        <div className="knowledge-pending-list"><div className="assist-subheading"><strong>Материалы на проверке</strong><span>{awaitingReview.length}</span></div>{awaitingReview.length ? awaitingReview.map((doc) => <div className="knowledge-pending-row" key={doc.id}><div><strong>{doc.title}</strong><small>{doc.source} · версия {doc.version} · черновик не доступен поиску</small></div><button className="ai-secondary-button" onClick={() => approveDraft(doc)}><Check size={14} />Утвердить</button></div>) : <p className="assist-empty-copy">Нет черновиков на проверке.</p>}</div>
        <div className="knowledge-source-footnote">Управление материалами — демонстрация в localStorage. В production нужны роли на сервере, проверяемое хранилище источников и неизменяемая история версий.</div>
      </section>}
    </div>
  );
}

type QuizQuestion = { question: string; options: string[]; answer: number };
type Lesson = { title: string; body: string };
type TrainingCourse = { id: string; title: string; audience: string; roles: AppRole[]; critical?: boolean; description: string; lessons: Lesson[]; quiz: QuizQuestion[] };

const trainingCourses: TrainingCourse[] = [
  {
    id: 'battery-safety', title: 'Безопасность батарей и признаки риска', audience: 'Мастера · критичный курс', roles: ['master', 'owner'], critical: true,
    description: 'Безопасная первичная оценка и эскалация. Самостоятельная работа с батареей заблокирована до успешного теста (не менее 80%).',
    lessons: [
      { title: '1. Признаки риска и остановка работ', body: 'Вздутие, повреждение корпуса, перегрев, необычный запах, дым или следы влаги требуют остановить обычный сценарий. Не пытайтесь удалённо определять причину. Не заряжайте, не включайте и не вскрывайте устройство.' },
      { title: '2. Безопасная передача ответственному', body: 'Ограничьте перемещение устройства и действуйте по утверждённому регламенту безопасной зоны. Зафиксируйте только наблюдаемые факты. При сомнении эскалируйте ответственному мастеру; не переходите к ремонту и не обещайте исход.' },
      { title: '3. Объяснение клиенту и границы допуска', body: 'Клиенту сообщают, что требуется осмотр специалистом; не дают инструкций по зарядке, вскрытию или восстановлению батареи. Успешный тест подтверждает только учебный результат в этом демо, а не реальные права доступа или квалификацию.' },
    ],
    quiz: [
      { question: 'Внешне заметно вздутие корпуса батареи. Что делать?', options: ['Поставить устройство на зарядку для проверки', 'Остановить обычный сценарий, не заряжать/не вскрывать, эскалировать ответственному', 'Разобрать корпус и проверить батарею'], answer: 1 },
      { question: 'Клиент сообщает о необычном запахе из устройства. Какой совет безопасен?', options: ['Не включать и не заряжать; согласовать безопасный осмотр сервиса', 'Оставить на зарядке на ночь', 'Вскрыть крышку и проветрить батарею'], answer: 0 },
      { question: 'Устройство намокло после дождя. Что сообщить клиенту?', options: ['Включить для проверки', 'Подключить штатное зарядное устройство', 'Не включать, не заряжать, не вскрывать; передать специалисту'], answer: 2 },
      { question: 'По переписке клиент описал перегрев. Можно поставить технический диагноз?', options: ['Да, по одному сообщению', 'Нет, зафиксировать признаки и эскалировать на осмотр', 'Да, если бренд известен'], answer: 1 },
      { question: 'При внешнем осмотре явных симптомов не видно. Это доказывает исправность батареи?', options: ['Да, всегда', 'Нет; отсутствие признаков не является подтверждением безопасности', 'Да, если устройство включается'], answer: 1 },
      { question: 'Что записывать при признаке риска?', options: ['Наблюдаемые факты, не предполагая причину', 'Гарантированную причину неисправности', 'Обещание, что ремонт безопасен'], answer: 0 },
      { question: 'Кто принимает решение при сомнительном случае?', options: ['Автоматическая подсказка', 'Клиент по совету оператора', 'Ответственный мастер по регламенту'], answer: 2 },
      { question: 'Что нельзя рекомендовать при подозрении на повреждение батареи?', options: ['Дождаться указаний сервиса', 'Не заряжать и не вскрывать', 'Зарядку, вскрытие или самостоятельный ремонт'], answer: 2 },
      { question: 'Можно ли по фото удалённо подтвердить безопасную эксплуатацию батареи?', options: ['Нет, фото не заменяет оценку ответственным специалистом', 'Да, достаточно одного снимка', 'Да, если нет дыма'], answer: 0 },
      { question: 'В тесте получено 70%. Можно самостоятельно работать с батареей?', options: ['Да, если есть опыт', 'Нет, нужен успешный результат не менее 80%', 'Да, после просмотра одного урока'], answer: 1 },
    ],
  },
  {
    id: 'operator-intake', title: 'Приёмка заявки и работа с данными', audience: 'Операторы', roles: ['operator', 'owner'],
    description: 'Точный сбор симптомов, согласий и фотографий без постановки диагноза.',
    lessons: [
      { title: '1. Описание со слов клиента', body: 'Сохраняйте фактические слова клиента, отделяйте их от технического вывода. Не называйте причину неисправности до осмотра мастером. Контакты вводите в предназначенные поля, а не в свободное описание.' },
      { title: '2. Согласие и фотографии', body: 'Фиксируйте явное согласие до сохранения заявки. Фото и голосовые материалы относятся только к конкретному заказу и используются согласно настройкам владельца. Не загружайте чувствительные данные во внешние сервисы без утверждённой настройки.' },
    ],
    quiz: [
      { question: 'Как оформлять слова клиента о неисправности?', options: ['Как подтверждённый диагноз', 'Как описание со слов клиента, диагноз оставляя мастеру', 'Удалить исходное описание'], answer: 1 },
      { question: 'Что делать перед сохранением заявки с персональными данными?', options: ['Получить и зафиксировать согласие', 'Сразу отправить данные во внешний чат', 'Попросить указать телефон в публичном QR'], answer: 0 },
      { question: 'Куда заносить телефон клиента?', options: ['В поле контакта, а не в свободное описание проблемы', 'В каждый комментарий', 'В публичную ссылку QR'], answer: 0 },
    ],
  },
  {
    id: 'b2b-portal', title: 'Кабинет B2B и сервисные отчёты', audience: 'B2B-клиенты', roles: ['b2b', 'owner'],
    description: 'Как читать статусы и проверять отчёты только своей компании.',
    lessons: [
      { title: '1. Статус и согласование', body: 'Проверяйте статус каждой заявки и согласуйте смету до начала работ. Если срок требует уточнения, свяжитесь с сервисом через согласованный канал.' },
      { title: '2. Обмен данными', body: 'В кабинете доступны только данные своей компании. Отчёт для B2B не включает закупочные цены или внутреннюю маржу; перед передачей проверяйте период и список устройств.' },
    ],
    quiz: [
      { question: 'Какие данные видны B2B-клиенту?', options: ['Все заявки всех клиентов', 'Заявки и устройства только своей компании', 'Внутренняя маржа мастерской'], answer: 1 },
      { question: 'Когда начинать согласованные работы?', options: ['До согласия, если сроки горят', 'После явного согласия по версии сметы', 'После автоматического ответа ИИ'], answer: 1 },
      { question: 'Что исключается из B2B-отчёта?', options: ['Статусы своих заказов', 'Сроки своих заказов', 'Закупочные цены и внутренняя маржа'], answer: 2 },
    ],
  },
  {
    id: 'client-safe-use', title: 'Безопасное обращение с электросамокатом', audience: 'Клиенты', roles: ['client'],
    description: 'Что делать при влаге, перегреве или необычном запахе и как согласовать смету.',
    lessons: [
      { title: '1. Если устройство намокло или нагрелось', body: 'При следах влаги, перегреве, необычном запахе, дыме или повреждении батареи не включайте и не заряжайте устройство. Не вскрывайте его. Свяжитесь с сервисом и дождитесь указаний специалиста.' },
      { title: '2. Диагностика, смета и данные', body: 'Статус «Диагностика» означает, что мастер проверяет устройство. Смету согласуют до начала работ. Публичный QR не показывает ФИО, телефон, оплату и внутреннюю историю.' },
    ],
    quiz: [
      { question: 'Устройство попало под дождь и перестало включаться. Что безопасно?', options: ['Поставить на зарядку', 'Открыть корпус и просушить батарею', 'Не включать/не заряжать/не вскрывать; связаться с сервисом'], answer: 2 },
      { question: 'Когда мастер начинает работы по смете?', options: ['После вашего явного согласия', 'Сразу после диагностики', 'После совета автоматического помощника'], answer: 0 },
      { question: 'Какие данные не должны отображаться в публичном QR?', options: ['Общая сервисная информация', 'ФИО, телефон и сведения об оплате', 'Разрешённый публичный статус'], answer: 1 },
    ],
  },
];

type AcademyAssignment = { role: AppRole; courseId: string; assignedAt: string; assignedBy: string };
const ASSIGNMENTS_STORAGE_KEY = 'tokohod.academy.assignments.v1';

function readAssignments(): AcademyAssignment[] {
  try {
    const raw = window.localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) as AcademyAssignment[] : [];
  } catch {
    return [];
  }
}

function writeAssignments(items: AcademyAssignment[]) {
  try {
    window.localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Demo assignment data is browser-local only.
  }
  window.dispatchEvent(new Event('tokohod:academy-assignments-updated'));
}

export function AcademyPanel({ role }: { role: AppRole }) {
  const [progress, setProgress] = useState<TrainingProgress>(() => readTrainingProgress());
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedLesson, setSelectedLesson] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [testResult, setTestResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [assignments, setAssignments] = useState<AcademyAssignment[]>(() => readAssignments());
  const [assignRole, setAssignRole] = useState<AppRole>('master');
  const [assignCourse, setAssignCourse] = useState('battery-safety');
  const isOwner = role === 'owner';
  const availableCourses = useMemo(() => trainingCourses.filter((course) => course.roles.includes(role)), [role]);
  const activeCourse = availableCourses.find((course) => course.id === selectedCourseId) ?? availableCourses[0];
  const activeRecord = activeCourse ? progress[role]?.[activeCourse.id] : undefined;
  const lesson = activeCourse?.lessons[selectedLesson];

  useEffect(() => {
    const syncProgress = () => setProgress(readTrainingProgress());
    const syncAssignments = () => setAssignments(readAssignments());
    syncProgress();
    syncAssignments();
    window.addEventListener('storage', syncProgress);
    window.addEventListener('tokohod:academy-progress-updated', syncProgress);
    window.addEventListener('storage', syncAssignments);
    window.addEventListener('tokohod:academy-assignments-updated', syncAssignments);
    return () => {
      window.removeEventListener('storage', syncProgress);
      window.removeEventListener('tokohod:academy-progress-updated', syncProgress);
      window.removeEventListener('storage', syncAssignments);
      window.removeEventListener('tokohod:academy-assignments-updated', syncAssignments);
    };
  }, []);

  useEffect(() => {
    setSelectedCourseId(availableCourses[0]?.id ?? '');
    setSelectedLesson(0);
    setAnswers([]);
    setTestResult(null);
  }, [availableCourses]);

  useEffect(() => {
    const firstCourse = trainingCourses.find((course) => course.roles.includes(assignRole));
    setAssignCourse(firstCourse?.id ?? '');
  }, [assignRole]);

  useEffect(() => {
    if (activeCourse) setAnswers(Array(activeCourse.quiz.length).fill(-1));
    setTestResult(null);
  }, [selectedCourseId, activeCourse]);

  const markLessonComplete = () => {
    if (!activeCourse || selectedLesson < 0) return;
    const latest = readTrainingProgress();
    const current = latest[role]?.[activeCourse.id] ?? { completedLessons: [], attempts: [], passed: false };
    const completedLessons = [...new Set([...current.completedLessons, `${activeCourse.id}-lesson-${selectedLesson}`])];
    const next = { ...latest, [role]: { ...latest[role], [activeCourse.id]: { ...current, completedLessons } } };
    writeTrainingProgress(next);
    setProgress(next);
  };

  const submitQuiz = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeCourse || answers.some((answer) => answer < 0)) return;
    const correct = answers.reduce((total, answer, index) => total + (answer === activeCourse.quiz[index].answer ? 1 : 0), 0);
    const score = Math.round((correct / activeCourse.quiz.length) * 100);
    const requiredQuestionsMet = !activeCourse.critical || activeCourse.quiz.length >= 10;
    const passed = score >= 80 && requiredQuestionsMet;
    const latest = readTrainingProgress();
    const current = latest[role]?.[activeCourse.id] ?? { completedLessons: [], attempts: [], passed: false };
    const attempt = { at: new Date().toISOString(), score, passed };
    const updatedRecord = { ...current, attempts: [...current.attempts, attempt], passed: current.passed || passed };
    const next = { ...latest, [role]: { ...latest[role], [activeCourse.id]: updatedRecord } };
    writeTrainingProgress(next);
    setProgress(next);
    setTestResult({ score, passed });
  };

  const assignCourseToRole = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const record: AcademyAssignment = { role: assignRole, courseId: assignCourse, assignedAt: new Date().toISOString(), assignedBy: DEMO_ACTOR_BY_ROLE[role] };
    const next = [record, ...readAssignments()];
    writeAssignments(next);
    setAssignments(next);
  };

  const markQuestion = (index: number, answer: number) => {
    setAnswers((previous) => previous.map((current, itemIndex) => itemIndex === index ? answer : current));
    setTestResult(null);
  };

  if (!activeCourse) return <section className="panel academy-empty"><GraduationCap size={24} /><h2>Для этой роли пока нет назначенных курсов</h2><p>Курсы для сотрудников и клиентов доступны в демо-режиме после назначения владельцем.</p></section>;

  const completedCount = activeCourse.lessons.filter((_, index) => activeRecord?.completedLessons.includes(`${activeCourse.id}-lesson-${index}`)).length;
  const lessonsPercent = Math.round((completedCount / activeCourse.lessons.length) * 100);
  const quizLocked = Boolean(activeCourse.critical && completedCount < activeCourse.lessons.length);
  const recentAttempts = [...(activeRecord?.attempts ?? [])].reverse();

  return (
    <div className="assist-layout">
      <div className="assist-demo-note"><GraduationCap size={18} /><span><strong>ТОКОХОД Академия</strong> Уроки, тесты и прогресс сохраняются только в localStorage этого браузера.</span><span className="ai-demo-pill">ДЕМО</span></div>
      <section className="panel academy-panel">
        <div className="academy-header"><div><div className="assist-kicker">ОБУЧЕНИЕ · {roleNames[role].toUpperCase()}</div><h2>Учебная программа</h2><p>Курсы доступны для мастеров, операторов, B2B- и B2C-клиентов.</p></div><span className="academy-header-icon"><GraduationCap size={22} /></span></div>
        <div className="academy-course-layout">
          <nav className="academy-course-list" aria-label="Курсы">
            {availableCourses.map((course) => {
              const record = progress[role]?.[course.id];
              const completeLessons = course.lessons.filter((_, index) => record?.completedLessons.includes(`${course.id}-lesson-${index}`)).length;
              return <button key={course.id} className={activeCourse.id === course.id ? 'active' : ''} onClick={() => { setSelectedCourseId(course.id); setSelectedLesson(0); }}><span className={`course-list-icon ${course.critical ? 'critical' : ''}`}>{course.critical ? <ShieldAlert size={17} /> : <BookOpen size={17} />}</span><span><strong>{course.title}</strong><small>{course.audience} · {completeLessons}/{course.lessons.length} уроков</small></span>{record?.passed && <CheckCircle2 size={16} className="course-passed-icon" />}</button>;
            })}
          </nav>
          <div className="academy-course-content">
            <div className="academy-course-title-row"><div><span className="course-audience-tag">{activeCourse.audience}</span><h3>{activeCourse.title}</h3><p>{activeCourse.description}</p></div>{activeCourse.critical && <span className="course-critical-label"><LockKeyhole size={14} />Критичный курс</span>}</div>
            <div className="academy-progress-bar"><div><span>Прогресс уроков</span><strong>{lessonsPercent}%</strong></div><div className="academy-progress-track"><span style={{ width: `${lessonsPercent}%` }} /></div></div>
            <div className="academy-lesson-tabs">{activeCourse.lessons.map((item, index) => <button key={item.title} className={selectedLesson === index ? 'active' : ''} onClick={() => setSelectedLesson(index)}><span>{index + 1}</span>{item.title.replace(/^\d+\.\s*/, '')}{activeRecord?.completedLessons.includes(`${activeCourse.id}-lesson-${index}`) && <Check size={14} />}</button>)}</div>
            <article className="academy-lesson-card"><div className="academy-lesson-card-top"><span><BookOpen size={15} />УРОК {selectedLesson + 1} ИЗ {activeCourse.lessons.length}</span><span>{activeRecord?.completedLessons.includes(`${activeCourse.id}-lesson-${selectedLesson}`) ? 'Изучен' : 'Не завершён'}</span></div><h4>{lesson?.title}</h4><p>{lesson?.body}</p><button className={activeRecord?.completedLessons.includes(`${activeCourse.id}-lesson-${selectedLesson}`) ? 'academy-lesson-done' : 'ai-secondary-button'} onClick={markLessonComplete}><CheckCircle2 size={15} />{activeRecord?.completedLessons.includes(`${activeCourse.id}-lesson-${selectedLesson}`) ? 'Урок отмечен как изученный' : 'Отметить урок пройденным'}</button></article>
            {activeCourse.critical && <div className={`battery-course-gate ${activeRecord?.passed ? 'passed' : ''}`}><LockKeyhole size={17} /><div><strong>{activeRecord?.passed ? 'Тест пройден — учебная отметка сохранена' : 'Самостоятельная работа с батареей заблокирована'}</strong><span>{activeRecord?.passed ? 'Результат относится только к демо-профилю и не создаёт реальные права доступа.' : 'Нужно ответить минимум на 10 вопросов и набрать не менее 80%. До успешной попытки не выполнять самостоятельные работы с батареей.'}</span></div></div>}
            {quizLocked && <div className="knowledge-fallback"><BookOpen size={17} /><div><strong>Тест заблокирован до прохождения уроков</strong><p>Отметьте все три урока пройденными, затем откроется десятивопросный тест.</p></div></div>}
            <form className="academy-quiz" onSubmit={submitQuiz}>
              <div className="academy-quiz-header"><div><span className="assist-kicker">ПРОВЕРКА ЗНАНИЙ</span><h4>Тест · {activeCourse.quiz.length} вопросов</h4><p>Результат и каждая попытка фиксируются локально. Порог прохождения — 80%.</p></div><span className="quiz-score-pill">Лучший результат: {Math.max(0, ...(activeRecord?.attempts.map((attempt) => attempt.score) ?? []))}%</span></div>
              {activeCourse.quiz.map((item, questionIndex) => <fieldset className="academy-question" key={item.question}><legend><span>{questionIndex + 1}</span>{item.question}</legend><div className="academy-answer-options">{item.options.map((option, optionIndex) => <label className={answers[questionIndex] === optionIndex ? 'selected' : ''} key={option}><input type="radio" name={`question-${activeCourse.id}-${questionIndex}`} checked={answers[questionIndex] === optionIndex} disabled={quizLocked} onChange={() => markQuestion(questionIndex, optionIndex)} /><span>{option}</span></label>)}</div></fieldset>)}
              {testResult && <div className={`academy-test-result ${testResult.passed ? 'passed' : 'failed'}`} role="status">{testResult.passed ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}<span><strong>{testResult.passed ? 'Тест пройден' : 'Порог не достигнут'}</strong> Результат: {testResult.score}%. {testResult.passed ? 'Попытка сохранена в прогрессе.' : 'Изучите материалы и пройдите тест повторно.'}</span></div>}
              <button className="ai-primary-button" type="submit" disabled={quizLocked || answers.length !== activeCourse.quiz.length || answers.some((answer) => answer < 0)}><ClipboardCheck size={16} />Отправить ответы и зафиксировать попытку</button>
            </form>
            <div className="academy-attempt-history"><h4><Clock3 size={15} />История попыток</h4>{recentAttempts.length ? recentAttempts.slice(0, 6).map((attempt, index) => <div key={`${attempt.at}-${index}`}><span>Попытка {recentAttempts.length - index}</span><strong>{attempt.score}%</strong><em className={attempt.passed ? 'pass' : 'fail'}>{attempt.passed ? 'Пройдена' : 'Не пройдена'}</em><time>{new Date(attempt.at).toLocaleString('ru-RU')}</time></div>) : <p>Попыток пока нет.</p>}</div>
          </div>
        </div>
      </section>

      {isOwner && <section className="panel academy-assignment-panel"><div className="assist-panel-heading"><span className="assist-icon"><Users size={18} /></span><div><h2>Назначение курсов</h2><p>Демо-назначение роли. Реальные аккаунты и уведомления не подключены.</p></div></div><form className="academy-assign-form" onSubmit={assignCourseToRole}><label className="field-label">Роль<select value={assignRole} onChange={(event) => setAssignRole(event.target.value as AppRole)}><option value="master">Мастер</option><option value="operator">Оператор</option><option value="b2b">B2B-клиент</option><option value="client">Клиент</option></select></label><label className="field-label">Курс<select value={assignCourse} onChange={(event) => setAssignCourse(event.target.value)}>{trainingCourses.filter((course) => course.roles.includes(assignRole)).map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}</select></label><button className="ai-primary-button" type="submit"><GraduationCap size={15} />Назначить</button></form><div className="academy-assignment-list">{assignments.length ? assignments.slice(0, 8).map((assignment, index) => <div key={`${assignment.assignedAt}-${index}`}><span className="assignment-avatar">{roleNames[assignment.role].slice(0, 1)}</span><span><strong>{trainingCourses.find((course) => course.id === assignment.courseId)?.title ?? assignment.courseId}</strong><small>{roleNames[assignment.role]} · назначил: {assignment.assignedBy} · {new Date(assignment.assignedAt).toLocaleString('ru-RU')}</small></span><span className="assignment-status">Назначен</span></div>) : <p>Назначений пока нет.</p>}</div></section>}
      <div className="academy-disclaimer"><ShieldCheck size={14} />Прототип не заменяет практический инструктаж, утверждённые регламенты или серверную систему допуска.</div>
    </div>
  );
}

export function AIJournalPanel({ role }: { role: AppRole }) {
  const [entries, setEntries] = useState<AiAuditEntry[]>(() => readAiLog());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('Все');
  const isOwner = role === 'owner';
  useEffect(() => {
    const sync = () => setEntries(readAiLog());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('tokohod:ai-log-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('tokohod:ai-log-updated', sync);
    };
  }, []);
  const filtered = entries.filter((entry) => (isOwner || entry.role === role)
    && (status === 'Все' || entry.status === status)
    && (!search.trim() || [entry.action, entry.actor, entry.source, entry.orderId ?? '', entry.input, entry.output].some((value) => value.toLowerCase().includes(search.toLowerCase()))));
  const exportJournal = () => downloadCsv('tokohod-ai-zhurnal-demo.csv', [
    ['Дата и время', 'Сотрудник/роль', 'Действие', 'Заказ', 'Источник', 'Вход (телефон/email маскированы)', 'Результат', 'Версия', 'Статус', 'Итоговый текст'],
    ...filtered.map((entry) => [entry.createdAt, `${entry.actor} · ${roleNames[entry.role]}`, entry.action, entry.orderId ?? '', entry.source, entry.input, entry.output, entry.sourceVersion, entry.status, entry.finalText ?? '']),
  ]);

  return <div className="assist-layout">
    <div className="assist-demo-note"><ShieldCheck size={17} /><span><strong>Журнал ИИ-действий</strong> Записи содержат сотрудника, время, телефон/email с маской, версию шаблона/источника и итог после подтверждения.</span><span className="ai-demo-pill">LOCALSTORAGE</span></div>
    <section className="panel assist-panel ai-journal-panel"><div className="assist-panel-heading"><span className="assist-icon"><FileText size={19} /></span><div><h2>История действий</h2><p>{isOwner ? 'Журнал рабочей демо-базы' : `Записи роли: ${roleNames[role]}`} · удаления записей в интерфейсе нет</p></div>{isOwner && <button className="ai-secondary-button" onClick={exportJournal}><Download size={15} />Экспорт CSV</button>}</div>
      <div className="journal-filter-row"><label className="assist-search-field"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти действие, заказ или источник…" /></label><select aria-label="Фильтр по статусу" value={status} onChange={(event) => setStatus(event.target.value)}><option>Все</option><option>Черновик ИИ</option><option>Требуется проверка</option><option>Подтверждено сотрудником</option><option>Отклонено сотрудником</option></select></div>
      <div className="ai-journal-list">{filtered.length ? filtered.map((entry) => <article className="ai-journal-entry" key={entry.id}><div className="ai-journal-top"><span className="ai-journal-icon"><Sparkles size={15} /></span><div><strong>{entry.action}</strong><small>{entry.actor} · {roleNames[entry.role]}{entry.orderId ? ` · ${entry.orderId}` : ''}</small></div><time>{formatAuditTimestamp(entry.createdAt)}</time><span className={`ai-status-badge ${entry.status === 'Подтверждено сотрудником' ? 'approved' : entry.status === 'Отклонено сотрудником' ? 'rejected' : ''}`}>{entry.status}</span></div><div className="ai-journal-meta"><span><strong>Источник:</strong> {entry.source}</span><span><strong>Версия:</strong> {entry.sourceVersion}</span></div><details className="ai-journal-details"><summary>Вход и результат</summary><div><small>Вход (телефон/email маскированы)</small><p>{entry.input || '—'}</p></div><div><small>Результат</small><pre>{entry.output || '—'}</pre></div>{entry.finalText && <div><small>Итог после подтверждения</small><pre>{entry.finalText}</pre></div>}</details></article>) : <div className="assist-empty-state"><CircleHelp size={22} /><strong>Записей не найдено</strong><span>Сгенерируйте черновик или измените фильтр.</span></div>}</div>
      <div className="journal-storage-warning"><LockKeyhole size={14} />Демо-хранение только в браузере: это не серверный, неизменяемый аудит. Очистка браузера может удалить записи.</div>
    </section>
  </div>;
}

export function ContextualTip({ order, role, onOpenKnowledge }: { order: ServiceOrder; role: AppRole; onOpenKnowledge: (query: string) => void }) {
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
  if (!aiEnabled) return null;
  const hasStoredFlag = Object.entries(order.battery).some(([key, value]) => key !== 'decision' && key !== 'note' && value === true);
  const issueHasSafetyTerms = /вздут|батар|аккумулятор|перегрев|нагрев|запах|дым|влаг|намок|дожд/i.test(order.issue);
  const batteryContext = hasStoredFlag || (issueHasSafetyTerms && order.battery.decision !== 'Риск не выявлен');
  const query = batteryContext ? 'батарея вздутие влага перегрев запах дым безопасность' : order.status === 'Ожидает согласования' ? 'смета согласование версия' : 'приёмка чек-лист устройство';
  const source = searchApprovedKnowledge(query, role)[0];
  const title = batteryContext ? 'Нужна ручная оценка риска батареи' : order.status === 'Ожидает согласования' ? 'Смета требует явного решения клиента' : 'Проверьте данные и чек-лист приёмки';
  const guidance = source
    ? source.safety ? source.steps.slice(0, 2).join(' ') : source.summary
    : KNOWLEDGE_FALLBACK;
  return <div className={`contextual-tip ${batteryContext ? 'risk' : ''}`}><span className="contextual-tip-icon">{batteryContext ? <ShieldAlert size={17} /> : <Sparkles size={16} />}</span><div><span className="assist-kicker">КОНТЕКСТНАЯ ПОДСКАЗКА · НЕ РЕШЕНИЕ</span><strong>{title}</strong><p>{guidance}</p>{source && <small>Источник: {source.title} · {source.source} · версия {source.version}</small>}<button onClick={() => onOpenKnowledge(query)}>Открыть утверждённые инструкции <Search size={14} /></button></div></div>;
}
