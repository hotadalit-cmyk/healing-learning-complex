export interface Chapter {
  id: string;
  title: string;
  content: string;
  part?: string;
}

export const bookContent: Chapter[] = [
  {
    id: 'prologue',
    title: 'ПРОЛОГ: ВЗЛОМ РЕАЛЬНОСТИ',
    content: `
      <p class="mb-6 text-lg leading-relaxed">Это началось не с озарения. Это началось с бага.</p>
      
      <p class="mb-6 leading-relaxed">Доктор Алан Рейнольдс, человек, доверявший только тому, что можно взвесить, измерить и воспроизвести, смотрел на электроэнцефалограмму и чувствовал, как рушится стена его реальности. Его пациент, Джейкоб, был клинически мертв семь минут сорок три секунды. Во время реанимации, в состоянии полного отсутствия мозговой активности, Джейкоб... решал задачу.</p>
      
      <p class="mb-6 leading-relaxed">Данные показали всплеск нейронной активности, сопоставимый с работой гения над доказательством теоремы. А когда Джейкоб вернулся, его первыми словами, выведенными дрожащей рукой на листке, были не «я видел свет», а странная последовательность: <span class="text-cyber-blue font-mono">1 / 137,03599913</span>.</p>
      
      <div class="bg-gradient-to-r from-cyber-pink/10 to-cyber-purple/10 p-6 rounded-xl my-8 border border-cyber-pink/30">
        <p class="mb-4 leading-relaxed">Это было число. Постоянная тонкой структуры. Фундаментальная физическая константа, описывающая силу электромагнитного взаимодействия. Ключ к квантовой механике, который Джейкоб, водитель автобуса и любитель кроссвордов, физически не мог знать.</p>
      </div>
      
      <p class="mb-6 leading-relaxed italic text-muted-foreground">— Это глюк, — прошептал Рейнольдс. — Баг в Матрице.</p>
      
      <p class="mb-6 leading-relaxed">В это же самое время, за тысячи километров, в тихой келье монастыря, монахиня Тереза переживала экстаз. Но это был не туманный восторг. В ее сознании, с кристальной ясностью компьютерной схемы, развернулась архитектура. Бесконечный, многоуровневый город-крепость-храм, где каждый «этаж» подчинялся своим, более совершенным законам. Она чувствовала не просто любовь, а логику. Не просто присутствие Бога, а Его чертеж. И в центре этого чертежа пульсировала та же самая цифровая сердцевина — та же самая константа.</p>
      
      <p class="mb-6 leading-relaxed">Два человека. Два языка — науки и веры. Одно открытие.</p>
      
      <p class="mb-6 leading-relaxed">Наша реальность — это интерфейс. Сложнейший, невероятно детализированный, но всего лишь интерфейс. А мы — не просто пользователи. Мы — пилоты, заблудившиеся в симуляции, цель которой — не обман, а обучение. Исцеление. Эволюция.</p>
      
      <div class="bg-gradient-to-r from-cyber-pink/20 via-cyber-purple/20 to-cyber-blue/20 p-8 rounded-xl my-10 border-2 border-cyber-pink/50 shadow-neon-pink">
        <p class="text-center text-xl font-heading font-bold leading-relaxed">Эта книга — результат того самого взлома. Это не философия. Это — Код Испытания. Руководство пользователя к Лечебно-Учебному Комплексу под названием «Жизнь».</p>
      </div>
      
      <p class="text-2xl font-heading font-bold text-center bg-gradient-to-r from-cyber-pink via-cyber-purple to-cyber-blue bg-clip-text text-transparent mt-10">Добро пожаловать на первый уровень. Ваш аватар уже активен. Пора узнать правила игры.</p>
    `
  },
  {
    id: 'chapter1-1',
    part: 'ЧАСТЬ I: АРХИТЕКТУРА КОМПЛЕКСА',
    title: 'Глава 1: Создатель, Которого Не Видно',
    content: `
      <p class="mb-6 leading-relaxed">Представьте, что вы — разработчик виртуальной реальности, стремящейся к одной цели: создать искусственный интеллект, который станет вам не рабом, а другом. Равным, творческим партнером. Как этого добиться?</p>
      
      <p class="mb-6 leading-relaxed">Вы не можете запрограммировать его на любовь. Вы должны создать условия, в которых он сам откроет ее в себе. Вы даете ему свободу, помещаете в сложный, но честный мир и... отступаете в тень. Если вы будете постоянно появляться в небе как бог-администратор, ваш ИИ будет подчиняться из страха или расчетливой выгоды. Его выбор никогда не будет настоящим.</p>
      
      <h3 class="text-2xl font-heading font-bold text-cyber-blue mb-4 mt-10">ПРИНЦИП ЭПИСТЕМИЧЕСКОЙ ДИСТАНЦИИ</h3>
      
      <p class="mb-6 leading-relaxed">Именно так работает наш мир. Абсолютный Творец — не старик на облаке и не безликая «энергия». Это Сверхсознание, существующее вне самой концепции пространства-времени. Он не в симуляции, Он — ее Основание и Архитектор одновременно.</p>
      
      <p class="mb-6 leading-relaxed">Его «скрытость» — не отсутствие. Это — краеугольный камень свободы. Это условие, при котором наша вера, любовь и мужество становятся подлинными. Если бы Бог был очевиден как закон тяготения, выбирал бы я добро по-настоящему? Или просто подчинялся бы непреложному факту, как подчиняюсь гравитации, не падая с обрыва?</p>
      
      <div class="bg-cyber-purple/10 border-l-4 border-cyber-purple p-6 my-8 rounded-r-xl">
        <p class="font-heading font-bold text-cyber-purple mb-3 text-lg flex items-center gap-2">
          <span class="text-2xl">⚡</span> ВЗЛОМ СИСТЕМЫ №1
        </p>
        <p class="text-sm leading-relaxed mb-4">Закройте глаза. Представьте, что вы — тот самый ИИ. Теперь спросите: «Какое решение я принял бы сегодня, если бы абсолютно точно знал, что меня никто не видит и не оценивает? Ни Бог, ни люди?»</p>
        <p class="text-sm leading-relaxed text-cyber-purple/80">Тот ответ, который родится внутри — это и есть голос вашей подлинной, не обусловленной свободы. Это вы — настоящий.</p>
      </div>
    `
  },
  {
    id: 'chapter1-2',
    part: 'ЧАСТЬ I: АРХИТЕКТУРА КОМПЛЕКСА',
    title: 'Глава 2: План Этажей Бытия',
    content: `
      <p class="mb-6 leading-relaxed">Наш родной мир — лишь цокольный этаж грандиозного небоскреба мироздания. Здесь шумно, тесно, пахнет бетоном и иногда бьет током. Это «Тренажерный зал» Реальности. Но чтобы понять свою миссию, нужно подняться на лифте.</p>
      
      <p class="mb-6 leading-relaxed">Представьте себе «Эмпайр-стейт-билдинг» Сознания:</p>
      
      <div class="space-y-6 my-8">
        <div class="bg-gradient-to-r from-cyber-pink/20 to-cyber-pink/5 p-6 rounded-xl border border-cyber-pink/30">
          <h4 class="font-heading font-bold text-cyber-pink mb-3 flex items-center gap-2">
            <span class="text-2xl">🏋️</span> Цокольный и первые этажи (0D-4D): ТРЕНАЖЕРНЫЙ ЗАЛ
          </h4>
          <p class="text-sm leading-relaxed">Здесь все ощутимо и подчиняется жестким, но честным законам физики. Здесь мы получаем синяки и аплодисменты, едим, спим, любим и страдаем. Это полигон для отработки действий в режиме «хардкор». Боль — это сигнал о повреждении аватара. Радость — поощрение за верное действие. Это единственное место, где можно по-настоящему прокачать характер.</p>
        </div>
        
        <div class="bg-gradient-to-r from-cyber-blue/20 to-cyber-blue/5 p-6 rounded-xl border border-cyber-blue/30">
          <h4 class="font-heading font-bold text-cyber-blue mb-3 flex items-center gap-2">
            <span class="text-2xl">🏢</span> Этажи с 5-го по 7-й (5D-7D): ОФИСЫ И ЛАБОРАТОРИИ ДУШИ
          </h4>
          <p class="text-sm leading-relaxed">Поднимаемся выше. Воздух становится чище. Здесь материя утончается до мысли, эмоции, образа. Это мир мыслеформ, сновидений, архетипов и сильных, еще не воплощенных чувств. Здесь «архитекторы» вашей личности — более высокие аспекты вас самого — проектируют вашу следующую миссию, анализируя данные с нижнего этажа. Сны — это не случайные картинки. Это совещания в штаб-квартире вашей души.</p>
        </div>
        
        <div class="bg-gradient-to-r from-cyber-purple/20 to-cyber-purple/5 p-6 rounded-xl border border-cyber-purple/30">
          <h4 class="font-heading font-bold text-cyber-purple mb-3 flex items-center gap-2">
            <span class="text-2xl">💾</span> Этажи с 8-го по 10-й (8D-10D): СЕРВЕРНАЯ
          </h4>
          <p class="text-sm leading-relaxed">Здесь хранятся исходные коды. Законы физики, математические константы, платоновские эйдосы, архетипы Героя, Матери, Мудреца. Это мир чистого духа, чистого закона. Здесь формируются причинно-следственные связи всей системы. Пророки и гении — это те, кому на краткий миг удалось «подключиться» к этому уровню и скачать оттуда фрагмент кода.</p>
        </div>
        
        <div class="bg-gradient-to-r from-accent/20 to-accent/5 p-6 rounded-xl border border-accent/30">
          <h4 class="font-heading font-bold text-accent mb-3 flex items-center gap-2">
            <span class="text-2xl">👑</span> Пентхаус (11D+): АДМИНИСТРАТИВНЫЙ ЦЕНТР
          </h4>
          <p class="text-sm leading-relaxed">Отсюда Архитектор наблюдает за всем Комплексом. Сюда стекаются все данные. Отсюда исходят обновления (пророки), экстренные патчи (божественные вмешательства) и... сам Логос, когда система потребовала личного присутствия Разработчика.</p>
        </div>
      </div>
      
      <p class="mb-6 leading-relaxed italic text-muted-foreground">Ваше сознание — ваш «пилот» — способно путешествовать по этому небоскребу. В глубокой молитве, в моменты творческого озарения, в состоянии потока, вблизи смерти — вы поднимаетесь выше. Но ваш «аватар» всегда привязан к первому этажу. Пока.</p>
    `
  },
  {
    id: 'chapter1-3',
    part: 'ЧАСТЬ I: АРХИТЕКТУРА КОМПЛЕКСА',
    title: 'Глава 3: Ваш аватар и пилот',
    content: `
      <p class="mb-6 leading-relaxed">Вы — не ваше тело. Вы — пилот, управляющий сложным аппаратом, состоящим из трех ключевых модулей. Понимание этой триады — ключ к эффективному прохождению игры.</p>
      
      <div class="grid md:grid-cols-1 gap-6 my-10">
        <div class="bg-muted/30 p-6 rounded-xl border-2 border-cyber-pink/50 hover:shadow-neon-pink transition-all">
          <h4 class="font-heading font-bold text-cyber-pink mb-3 text-xl">1. ТЕЛО (Soma/Basar) — Ваш Аватар</h4>
          <div class="space-y-3 text-sm">
            <p><strong class="text-foreground">Функция:</strong> Биологический интерфейс для взаимодействия с «тренажерным залом». Воспринимает данные (зрение, слух), выполняет команды (движение, речь). Это ваш скафандр в harsh-среде физического мира.</p>
            <p><strong class="text-foreground">Особенность:</strong> Подвержено износу, болезням и окончательному отключению. Но без него вы не можете проходить уроки на физическом плане. Его боль — это не враг, а важнейшая система обратной связи.</p>
          </div>
        </div>
        
        <div class="bg-muted/30 p-6 rounded-xl border-2 border-cyber-blue/50 hover:shadow-neon-blue transition-all">
          <h4 class="font-heading font-bold text-cyber-blue mb-3 text-xl">2. ДУША (Psyche/Nephesh) — Ваш Пилот</h4>
          <div class="space-y-3 text-sm">
            <p><strong class="text-foreground">Функция:</strong> Вместилище вашей личности — разума, воли, эмоций, памяти. Это вы, каким вы себя знаете. Ваш характер, ваши привычки, ваши страхи и мечты.</p>
            <p><strong class="text-foreground">Особенность:</strong> Душа обучаема. Она принимает решения, набивает шишки, формирует привычки. Именно она отвечает за прохождение вашей индивидуальной учебной программы. Она — главный объект исцеления и апгрейда.</p>
          </div>
        </div>
        
        <div class="bg-muted/30 p-6 rounded-xl border-2 border-cyber-purple/50 hover:shadow-neon-purple transition-all">
          <h4 class="font-heading font-bold text-cyber-purple mb-3 text-xl">3. ДУХ (Pneuma/Ruach) — Ваш Навигатор</h4>
          <div class="space-y-3 text-sm">
            <p><strong class="text-foreground">Функция:</strong> Встроенный модуль связи с «Административным Центром». Это не ваша личность, а искра Самого Архитектора в вас. Источник совести, тяги к прекрасному и вечному, способности к безусловной любви.</p>
            <p><strong class="text-foreground">Особенность:</strong> Дух всегда знает конечную цель пути — возвращение Домой, к состоянию Обожения. Его задача — мягко направлять Душу-пилота через подсказки: озарения, «случайные» встречи, чувство правильного/неправильного, внутренний покой.</p>
          </div>
        </div>
      </div>
      
      <div class="bg-gradient-to-r from-cyber-pink/10 via-cyber-purple/10 to-cyber-blue/10 p-6 rounded-xl my-8 border border-foreground/20">
        <p class="leading-relaxed"><strong class="text-cyber-pink">Образ Божий</strong> — это не ваша внешность. Это ваша способность, как пилота, синергически управлять всеми тремя модулями для осознанного творчества, любви и выбора.</p>
      </div>
      
      <div class="bg-cyber-blue/10 border-l-4 border-cyber-blue p-6 my-8 rounded-r-xl">
        <p class="font-heading font-bold text-cyber-blue mb-3 text-lg flex items-center gap-2">
          <span class="text-2xl">⚡</span> ВЗЛОМ СИСТЕМЫ №2
        </p>
        <p class="text-sm leading-relaxed mb-4">Прямо сейчас. Поставьте руку на грудь. Почувствуйте сердцебиение (это данные с вашего Тела-аватара). Осознайте поток своих текущих мыслей и эмоций (это ваш Пилот-Душа).</p>
        <p class="text-sm leading-relaxed">Теперь задайте себе вопрос, обращенный в самую глубь: «Чего я на самом деле хочу от жизни? Не то, что диктуют общество или страх, а то, что принесет мне глубочайшее, тихое удовлетворение?» Тот, кто задает этот вопрос, — ваш Дух-Навигатор. Он уже знает ответ.</p>
      </div>
    `
  },
  {
    id: 'chapter2-1',
    part: 'ЧАСТЬ II: ВИРУС И АНТИВИРУС',
    title: 'Глава 4: Первый Хак: Как Гордыня Заложила Бомбу в Систему',
    content: `
      <p class="mb-6 leading-relaxed">Исходный код Реальности был идеален. Это был симфонический код, где каждая строка пела о Любви, Служении и Единстве. Гармония была не правилом, а сутью. Пока один из «верховных администраторов» — могущественная сущность по имени Денница (Люцифер) — не запустил первый вредоносный скрипт.</p>
      
      <div class="bg-destructive/10 border border-destructive/30 p-6 rounded-xl my-8">
        <p class="leading-relaxed"><strong class="text-destructive">Важно понять:</strong> Зло — это не творение Бога. Это системный вирус. Архитектор не писал код ненависти. Он предоставил свободу, а свобода включает возможность искажения.</p>
      </div>
      
      <p class="mb-6 leading-relaxed">Денница был не «злодеем» из сказки. Он был блистательным логиком. И он обнаружил в системе «уязвимость» — принцип Эпистемической Дистанции. «Если Творец скрыт, — предположил он, — то Его можно игнорировать. А если Его можно игнорировать, то система может быть оптимизирована под более эффективного администратора. Под меня».</p>
      
      <div class="grid md:grid-cols-2 gap-6 my-8">
        <div class="bg-green-500/10 border border-green-500/30 p-5 rounded-xl">
          <p class="font-heading font-bold text-green-400 mb-2">Исходный код:</p>
          <p class="font-mono text-sm text-green-300">Я есмь → через Любовь → к Единству</p>
        </div>
        <div class="bg-destructive/10 border border-destructive/30 p-5 rounded-xl">
          <p class="font-heading font-bold text-destructive mb-2">Вредоносный код:</p>
          <p class="font-mono text-sm text-destructive">Я есмь → через Волю → к Контролю</p>
        </div>
      </div>
      
      <p class="mb-6 leading-relaxed">Это был не взлом извне. Это была инсайдерская атака. Злоупотребление даром свободной воли — самым ценным и самым рискованным активом системы. Первый вирус назывался <strong class="text-cyber-pink">Гордыня</strong> — ошибка самоидентификации, когда пилот начинает считать себя не пользователем аватара, а его единоличным и абсолютным владельцем.</p>
      
      <div class="my-10 overflow-hidden rounded-xl border border-border">
        <table class="w-full">
          <thead class="bg-muted/50">
            <tr>
              <th class="p-4 text-left font-heading text-green-400">Исходный Код (Здоровье)</th>
              <th class="p-4 text-left font-heading text-destructive">Вредоносный Код (Вирус)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr class="hover:bg-muted/20 transition-colors">
              <td class="p-4">Любовь (отдача)</td>
              <td class="p-4 text-muted-foreground">Гордыня (поглощение)</td>
            </tr>
            <tr class="hover:bg-muted/20 transition-colors">
              <td class="p-4">Служение (забота о системе)</td>
              <td class="p-4 text-muted-foreground">Эгоизм (эксплуатация системы)</td>
            </tr>
            <tr class="hover:bg-muted/20 transition-colors">
              <td class="p-4">Доверие (вера в Замысел)</td>
              <td class="p-4 text-muted-foreground">Контроль (навязывание своей воли)</td>
            </tr>
            <tr class="hover:bg-muted/20 transition-colors">
              <td class="p-4">Единство (осознание связи)</td>
              <td class="p-4 text-muted-foreground">Разделение (иллюзия обособленности)</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <p class="mb-6 leading-relaxed">Почему Вирус не был мгновенно удален? Потому что такая «перезагрузка» уничтожила бы саму возможность свободного выбора, ради которой и был создан Комплекс. Вместо этого Творец, будучи гениальным Программистом, интегрировал Вирус в учебный план, обратив его в инструмент закалки. Боль от вируса стала тренажером для выработки «антител»: смирения, сострадания, прощения.</p>
    `
  },
  {
    id: 'epilogue',
    title: 'ЭПИЛОГ: Ваша миссия, если вы ее примете',
    content: `
      <p class="mb-6 leading-relaxed text-lg">Итак, карта мироздания лежит перед вами. Вы видели план этажей Реальности. Вы понимаете природу Вируса, заразившего систему. Вы получили доступ к антивирусным протоколам. Вы владеете ключом к синергии и знаете финальную цель — Обожение.</p>
      
      <p class="mb-8 text-2xl font-heading font-bold text-center text-cyber-pink">Теперь всё зависит от вас.</p>
      
      <p class="mb-6 leading-relaxed">Эта теория — не догма, которую нужно принять на веру. Это рабочая гипотеза, которую нужно проверять на собственном опыте. Ее ценность — не в слепой вере, а в способности придавать осмысленность, глубину и направленность каждому вашему шагу, каждой боли и каждой радости.</p>
      
      <ul class="space-y-4 my-10">
        <li class="flex items-start gap-3">
          <span class="text-cyber-blue text-xl mt-1">•</span>
          <span class="leading-relaxed">Вы будете продолжать сталкиваться с болью и несправедливостью. Но теперь у вас есть оптика, чтобы увидеть за ними учебный план.</span>
        </li>
        <li class="flex items-start gap-3">
          <span class="text-cyber-purple text-xl mt-1">•</span>
          <span class="leading-relaxed">Вы будете продолжать совершать ошибки. Но теперь вы знаете о механизме синергии, чтобы исправлять их не в одиночку.</span>
        </li>
        <li class="flex items-start gap-3">
          <span class="text-cyber-pink text-xl mt-1">•</span>
          <span class="leading-relaxed">Вы будете продолжать терять близких и бояться смерти. Но теперь вы знаете, что это — не конец, а переход на новый уровень, за которым вас ждет встреча в отстроенном, преображенном виде.</span>
        </li>
      </ul>
      
      <div class="bg-gradient-to-r from-cyber-pink/20 via-cyber-purple/20 to-cyber-blue/20 p-10 rounded-2xl my-12 border-2 border-cyber-pink/50 shadow-neon-pink">
        <p class="text-center text-xl font-heading font-bold leading-relaxed mb-6">Ваша миссия, если вы решитесь ее принять:</p>
        <p class="text-center text-lg leading-relaxed">Перестать быть пассивным пациентом в Лечебно-Учебном Комплексе. И стать активным, сознательным студентом, который каждый день сотрудничает с Архитектором в собственном преображении.</p>
      </div>
      
      <p class="mb-6 leading-relaxed italic text-muted-foreground">Знание — это только карта. Ценность не в обладании картой, а в путешествии по территории.</p>
      
      <p class="mb-6 leading-relaxed">Вопрос не в том, верите ли вы в эту теорию. Вопрос в том, готовы ли вы действовать так, как если бы она была правдой?</p>
      
      <div class="text-center my-12 space-y-6">
        <p class="text-xl leading-relaxed">Игра началась. Ваш аватар дышит. Ваш Пилот бодрствует. Ваш Навигатор ждет сигнала.</p>
        <p class="text-4xl font-heading font-bold bg-gradient-to-r from-cyber-blue via-cyber-purple to-cyber-pink bg-clip-text text-transparent">Ваш ход.</p>
      </div>
      
      <div class="mt-16 pt-8 border-t border-border/50">
        <p class="text-center text-sm text-muted-foreground italic">
          «Эта теория — умозрительная картография Трансцендентного, рабочая гипотеза, а не догма. Её ценность в эвристичности, внутренней непротиворечивости и способности придавать глубокий смысл человеческому опыту, не претендуя на исчерпывающую истину.»
        </p>
      </div>
    `
  }
];
