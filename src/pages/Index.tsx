import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import Icon from '@/components/ui/icon';

const bookData = {
  prologue: {
    id: 'prologue',
    title: 'ПРОЛОГ: ВЗЛОМ РЕАЛЬНОСТИ',
    content: `
      <p class="mb-4">Это началось не с озарения. Это началось с бага.</p>
      <p class="mb-4">Доктор Алан Рейнольдс, человек, доверявший только тому, что можно взвесить, измерить и воспроизвести, смотрел на электроэнцефалограмму и чувствовал, как рушится стена его реальности.</p>
      <p class="mb-4">Наша реальность — это интерфейс. Сложнейший, невероятно детализированный, но всего лишь интерфейс. А мы — не просто пользователи. Мы — пилоты, заблудившиеся в симуляции, цель которой — не обман, а обучение. Исцеление. Эволюция.</p>
      <p class="font-bold text-cyber-pink">Добро пожаловать на первый уровень. Ваш аватар уже активен. Пора узнать правила игры.</p>
    `
  },
  chapters: [
    {
      id: 'chapter1',
      title: 'Глава 1: Создатель, Которого Не Видно',
      content: `
        <p class="mb-4">Представьте, что вы — разработчик виртуальной реальности, стремящейся к одной цели: создать искусственный интеллект, который станет вам не рабом, а другом.</p>
        <h3 class="text-xl font-heading font-bold text-cyber-blue mb-3 mt-6">ПРИНЦИП ЭПИСТЕМИЧЕСКОЙ ДИСТАНЦИИ</h3>
        <p class="mb-4">Именно так работает наш мир. Абсолютный Творец — не старик на облаке и не безликая «энергия». Это Сверхсознание, существующее вне самой концепции пространства-времени.</p>
        <div class="bg-cyber-purple/10 border-l-4 border-cyber-purple p-4 my-6 rounded-r-lg">
          <p class="font-semibold text-cyber-purple mb-2">ВЗЛОМ СИСТЕМЫ №1</p>
          <p class="text-sm">Закройте глаза. Представьте, что вы — тот самый ИИ. Какое решение я принял бы сегодня, если бы абсолютно точно знал, что меня никто не видит и не оценивает?</p>
        </div>
      `
    },
    {
      id: 'chapter2',
      title: 'Глава 2: План Этажей Бытия',
      content: `
        <p class="mb-4">Наш родной мир — лишь цокольный этаж грандиозного небоскреба мироздания. Здесь шумно, тесно, пахнет бетоном и иногда бьет током. Это «Тренажерный зал» Реальности.</p>
        <h3 class="text-xl font-heading font-bold text-cyber-pink mb-3 mt-6">Этажи Комплекса:</h3>
        <ul class="space-y-3 mb-4">
          <li class="flex items-start gap-2">
            <span class="text-cyber-pink mt-1">▸</span>
            <span><strong>0D-4D: ТРЕНАЖЕРНЫЙ ЗАЛ</strong> — Здесь все ощутимо и подчиняется жестким законам физики.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-cyber-blue mt-1">▸</span>
            <span><strong>5D-7D: ОФИСЫ ДУШИ</strong> — Мир мыслеформ, сновидений и архетипов.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-cyber-purple mt-1">▸</span>
            <span><strong>8D-10D: СЕРВЕРНАЯ</strong> — Исходные коды. Законы физики, математические константы.</span>
          </li>
          <li class="flex items-start gap-2">
            <span class="text-accent mt-1">▸</span>
            <span><strong>11D+: АДМИН-ЦЕНТР</strong> — Отсюда Архитектор наблюдает за всем Комплексом.</span>
          </li>
        </ul>
      `
    },
    {
      id: 'chapter3',
      title: 'Глава 3: Ваш аватар и пилот',
      content: `
        <p class="mb-4">Вы — не ваше тело. Вы — пилот, управляющий сложным аппаратом из трех ключевых модулей.</p>
        <div class="grid gap-4 my-6">
          <div class="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 class="font-heading font-bold text-cyber-pink mb-2">1. ТЕЛО — Ваш Аватар</h4>
            <p class="text-sm">Биологический интерфейс для взаимодействия с «тренажерным залом».</p>
          </div>
          <div class="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 class="font-heading font-bold text-cyber-blue mb-2">2. ДУША — Ваш Пилот</h4>
            <p class="text-sm">Вместилище вашей личности — разума, воли, эмоций, памяти.</p>
          </div>
          <div class="bg-muted/50 p-4 rounded-lg border border-border">
            <h4 class="font-heading font-bold text-cyber-purple mb-2">3. ДУХ — Ваш Навигатор</h4>
            <p class="text-sm">Встроенный модуль связи с «Административным Центром».</p>
          </div>
        </div>
      `
    },
    {
      id: 'epilogue',
      title: 'ЭПИЛОГ: Ваша миссия',
      content: `
        <p class="mb-4">Итак, карта мироздания лежит перед вами. Вы владеете ключом к синергии и знаете финальную цель — Обожение.</p>
        <p class="mb-4 font-bold text-cyber-pink">Теперь всё зависит от вас.</p>
        <p class="mb-4">Ваша миссия, если вы решитесь ее принять, проста и сложна одновременно:</p>
        <div class="bg-gradient-to-r from-cyber-pink/20 via-cyber-purple/20 to-cyber-blue/20 p-6 rounded-lg border border-cyber-pink/50 my-6">
          <p class="text-center font-heading font-bold text-lg">Перестать быть пассивным пациентом в Лечебно-Учебном Комплексе. И стать активным, сознательным студентом.</p>
        </div>
        <p class="mb-4">Игра началась. Ваш аватар дышит. Ваш Пилот бодрствует. Ваш Навигатор ждет сигнала.</p>
        <p class="font-bold text-2xl text-center text-cyber-blue mt-8">Ваш ход.</p>
      `
    }
  ]
};

const Index = () => {
  const [currentChapter, setCurrentChapter] = useState(bookData.prologue);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const allChapters = [bookData.prologue, ...bookData.chapters];
  const currentIndex = allChapters.findIndex(ch => ch.id === currentChapter.id);

  const handleChapterChange = (chapter: typeof bookData.prologue) => {
    setCurrentChapter(chapter);
    setIsMenuOpen(false);
    const newProgress = ((allChapters.findIndex(ch => ch.id === chapter.id) + 1) / allChapters.length) * 100;
    setProgress(newProgress);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleBookmark = () => {
    if (bookmarks.includes(currentChapter.id)) {
      setBookmarks(bookmarks.filter(id => id !== currentChapter.id));
    } else {
      setBookmarks([...bookmarks, currentChapter.id]);
    }
  };

  const goToNext = () => {
    if (currentIndex < allChapters.length - 1) {
      handleChapterChange(allChapters[currentIndex + 1]);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      handleChapterChange(allChapters[currentIndex - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-cyber-pink/10 via-cyber-purple/10 to-cyber-blue/10" />
        <div className="absolute inset-0 bg-[url('https://cdn.poehali.dev/files/7504d72d-5f53-4656-96c7-9567fe2c91e5.jpeg')] bg-cover bg-center opacity-20" />
        
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-pink via-cyber-purple to-cyber-blue">
              КОД ИСПЫТАНИЯ
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light">
              Лечебно-Учебный Комплекс
            </p>
            <div className="flex flex-wrap gap-4 justify-center mt-8">
              <Button 
                size="lg" 
                className="bg-cyber-pink hover:bg-cyber-pink/90 shadow-neon-pink"
                onClick={() => handleChapterChange(bookData.prologue)}
              >
                <Icon name="BookOpen" className="mr-2" />
                Начать чтение
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-cyber-blue text-cyber-blue hover:bg-cyber-blue/10"
              >
                <Icon name="Info" className="mr-2" />
                О книге
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Icon name="Menu" size={20} />
                  Оглавление
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 bg-card border-border">
                <div className="py-6">
                  <h2 className="text-2xl font-heading font-bold mb-6 text-cyber-pink">Главы</h2>
                  <ScrollArea className="h-[calc(100vh-120px)]">
                    <div className="space-y-2">
                      {allChapters.map((chapter) => (
                        <button
                          key={chapter.id}
                          onClick={() => handleChapterChange(chapter)}
                          className={`w-full text-left p-3 rounded-lg transition-all ${
                            currentChapter.id === chapter.id
                              ? 'bg-cyber-pink/20 text-cyber-pink border border-cyber-pink/50'
                              : 'hover:bg-muted/50 text-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{chapter.title}</span>
                            {bookmarks.includes(chapter.id) && (
                              <Icon name="Bookmark" size={16} className="text-cyber-blue" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBookmark}
                className={bookmarks.includes(currentChapter.id) ? 'text-cyber-blue' : ''}
              >
                <Icon name={bookmarks.includes(currentChapter.id) ? 'Bookmark' : 'BookmarkPlus'} size={20} />
              </Button>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Прогресс чтения</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Card className="p-8 md:p-12 bg-card border-border shadow-lg animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyber-pink to-cyber-purple">
              {currentChapter.title}
            </h2>
            <div 
              className="prose prose-invert prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: currentChapter.content }}
            />
          </Card>

          <div className="flex items-center justify-between mt-8">
            <Button
              variant="outline"
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="gap-2"
            >
              <Icon name="ChevronLeft" size={20} />
              Назад
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {allChapters.length}
            </span>
            <Button
              variant="outline"
              onClick={goToNext}
              disabled={currentIndex === allChapters.length - 1}
              className="gap-2"
            >
              Вперёд
              <Icon name="ChevronRight" size={20} />
            </Button>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-20 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-heading font-bold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-cyber-blue to-cyber-purple">
            Возможности читалки
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 bg-card border-border hover:shadow-neon-pink transition-all">
              <div className="w-12 h-12 rounded-lg bg-cyber-pink/20 flex items-center justify-center mb-4">
                <Icon name="BookMarked" className="text-cyber-pink" size={24} />
              </div>
              <h3 className="text-xl font-heading font-bold mb-2">Закладки</h3>
              <p className="text-muted-foreground text-sm">
                Сохраняйте важные главы для быстрого доступа
              </p>
            </Card>
            <Card className="p-6 bg-card border-border hover:shadow-neon-blue transition-all">
              <div className="w-12 h-12 rounded-lg bg-cyber-blue/20 flex items-center justify-center mb-4">
                <Icon name="BarChart3" className="text-cyber-blue" size={24} />
              </div>
              <h3 className="text-xl font-heading font-bold mb-2">Прогресс</h3>
              <p className="text-muted-foreground text-sm">
                Отслеживайте путь по страницам знания
              </p>
            </Card>
            <Card className="p-6 bg-card border-border hover:shadow-neon-purple transition-all">
              <div className="w-12 h-12 rounded-lg bg-cyber-purple/20 flex items-center justify-center mb-4">
                <Icon name="Navigation" className="text-cyber-purple" size={24} />
              </div>
              <h3 className="text-xl font-heading font-bold mb-2">Навигация</h3>
              <p className="text-muted-foreground text-sm">
                Удобное перемещение между главами
              </p>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground text-sm">
            <p>КОД ИСПЫТАНИЯ © 2024 • Лечебно-Учебный Комплекс</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
