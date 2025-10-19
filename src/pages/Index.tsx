import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { bookContent } from '@/data/bookContent';
import AuthDialog from '@/components/AuthDialog';
import DonationDialog from '@/components/DonationDialog';
import ReadingSettings from '@/components/ReadingSettings';
import ShareDialog from '@/components/ShareDialog';
import ExportDialog from '@/components/ExportDialog';

const Index = () => {
  const [currentChapter, setCurrentChapter] = useState(bookContent[0]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [fontSize, setFontSize] = useState(100);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
    
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) setTheme(savedTheme);
    
    const savedFontSize = localStorage.getItem('fontSize');
    if (savedFontSize) setFontSize(parseInt(savedFontSize));

    const savedChapterId = localStorage.getItem('lastChapterId');
    if (savedChapterId) {
      const savedChapter = bookContent.find(ch => ch.id === savedChapterId);
      if (savedChapter) {
        setCurrentChapter(savedChapter);
        const newProgress = ((bookContent.findIndex(ch => ch.id === savedChapterId) + 1) / bookContent.length) * 100;
        setProgress(newProgress);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('fontSize', fontSize.toString());
  }, [fontSize]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const currentIndex = bookContent.findIndex(ch => ch.id === currentChapter.id);

  const handleChapterChange = (chapter: typeof bookContent[0]) => {
    setCurrentChapter(chapter);
    setIsMenuOpen(false);
    const newProgress = ((bookContent.findIndex(ch => ch.id === chapter.id) + 1) / bookContent.length) * 100;
    setProgress(newProgress);
    localStorage.setItem('lastChapterId', chapter.id);
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
    if (currentIndex < bookContent.length - 1) {
      handleChapterChange(bookContent[currentIndex + 1]);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      handleChapterChange(bookContent[currentIndex - 1]);
    }
  };
  
  const groupedChapters = bookContent.reduce((acc, chapter) => {
    if (chapter.part) {
      if (!acc[chapter.part]) {
        acc[chapter.part] = [];
      }
      acc[chapter.part].push(chapter);
    } else {
      if (!acc['main']) {
        acc['main'] = [];
      }
      acc['main'].push(chapter);
    }
    return acc;
  }, {} as Record<string, typeof bookContent>);

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
                onClick={() => {
                  const lastChapterId = localStorage.getItem('lastChapterId');
                  const savedChapter = lastChapterId ? bookContent.find(ch => ch.id === lastChapterId) : null;
                  handleChapterChange(savedChapter || bookContent[0]);
                  document.getElementById('reading-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                <Icon name="BookOpen" className="mr-2" />
                {localStorage.getItem('lastChapterId') ? 'Продолжить чтение' : 'Начать чтение'}
              </Button>
              <DonationDialog>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-cyber-pink to-cyber-purple hover:opacity-90"
                >
                  <Icon name="Heart" className="mr-2" />
                  Поддержать
                </Button>
              </DonationDialog>
            </div>
          </div>
        </div>
      </section>

      <section id="reading-section" className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
            <div className="flex items-center gap-3">
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
                    <div className="space-y-6">
                      {Object.entries(groupedChapters).map(([part, chapters]) => (
                        <div key={part}>
                          {part !== 'main' && (
                            <Badge className="mb-3 bg-cyber-purple/20 text-cyber-purple border-cyber-purple/50">{part}</Badge>
                          )}
                          <div className="space-y-2">
                            {chapters.map((chapter) => (
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
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </SheetContent>
              </Sheet>
              
              <ReadingSettings
                theme={theme}
                fontSize={fontSize}
                onThemeChange={setTheme}
                onFontSizeChange={setFontSize}
              >
                <Button variant="outline" size="sm" className="gap-2">
                  <Icon name="Settings" size={20} />
                  Настройки
                </Button>
              </ReadingSettings>

              <ShareDialog>
                <Button variant="outline" size="sm" className="gap-2">
                  <Icon name="Share2" size={20} />
                  Поделиться
                </Button>
              </ShareDialog>

              <ExportDialog user={user}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Icon name="Download" size={20} />
                  Скачать
                </Button>
              </ExportDialog>
            </div>
            
            <div className="flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground hidden sm:inline">
                    {user.name}
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <Icon name="LogOut" size={16} />
                  </Button>
                </div>
              ) : (
                <AuthDialog onAuthSuccess={setUser}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Icon name="User" size={16} />
                    Войти
                  </Button>
                </AuthDialog>
              )}
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
            <div className="flex items-start justify-between mb-8">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyber-pink to-cyber-purple">
                {currentChapter.title}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBookmark}
                className={bookmarks.includes(currentChapter.id) ? 'text-cyber-blue' : ''}
              >
                <Icon name={bookmarks.includes(currentChapter.id) ? 'Bookmark' : 'BookmarkPlus'} size={20} />
              </Button>
            </div>
            <div 
              className="prose prose-invert prose-lg max-w-none"
              style={{ fontSize: `${fontSize}%` }}
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
              {currentIndex + 1} / {bookContent.length}
            </span>
            <Button
              variant="outline"
              onClick={goToNext}
              disabled={currentIndex === bookContent.length - 1}
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