import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import Icon from '@/components/ui/icon';

interface ReadingSettingsProps {
  children: React.ReactNode;
  theme: 'light' | 'dark';
  fontSize: number;
  onThemeChange: (theme: 'light' | 'dark') => void;
  onFontSizeChange: (size: number) => void;
}

export default function ReadingSettings({ 
  children, 
  theme, 
  fontSize, 
  onThemeChange, 
  onFontSizeChange 
}: ReadingSettingsProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading text-transparent bg-clip-text bg-gradient-to-r from-cyber-pink to-cyber-purple">
            Настройки чтения
          </DialogTitle>
          <DialogDescription>
            Настройте комфортный режим для чтения книги
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label className="text-base font-semibold">Тема оформления</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                onClick={() => onThemeChange('light')}
                className={theme === 'light' ? 'bg-cyber-pink hover:bg-cyber-pink/90' : ''}
              >
                <Icon name="Sun" className="mr-2" size={16} />
                Светлая
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                onClick={() => onThemeChange('dark')}
                className={theme === 'dark' ? 'bg-cyber-purple hover:bg-cyber-purple/90' : ''}
              >
                <Icon name="Moon" className="mr-2" size={16} />
                Тёмная
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Размер шрифта</Label>
              <span className="text-sm text-muted-foreground">{fontSize}%</span>
            </div>
            <Slider
              value={[fontSize]}
              onValueChange={(value) => onFontSizeChange(value[0])}
              min={80}
              max={150}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Мелкий</span>
              <span>Средний</span>
              <span>Крупный</span>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg border">
            <p className="text-sm" style={{ fontSize: `${fontSize}%` }}>
              Пример текста: В 2024 году мир изменился. Искусственный интеллект перестал быть просто технологией и стал настоящей революцией.
            </p>
          </div>

          <div className="flex items-start gap-2 p-3 bg-cyber-blue/10 border border-cyber-blue/30 rounded-lg">
            <Icon name="Info" className="text-cyber-blue mt-0.5" size={16} />
            <p className="text-xs text-muted-foreground">
              Настройки сохраняются автоматически и применяются ко всем главам книги
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
