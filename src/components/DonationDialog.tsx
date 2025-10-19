import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface DonationDialogProps {
  children: React.ReactNode;
}

const donationOptions = [
  { amount: 100, label: '100 ₽', description: 'Спасибо за поддержку!' },
  { amount: 300, label: '300 ₽', description: 'Поможет написать главу', popular: true },
  { amount: 500, label: '500 ₽', description: 'Поможет создать иллюстрации' },
  { amount: 1000, label: '1000 ₽', description: 'Ускорит выпуск книги' },
];

export default function DonationDialog({ children }: DonationDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  const handleDonate = () => {
    const amount = selectedAmount || parseInt(customAmount);
    if (amount) {
      alert(`Спасибо за поддержку! Сумма: ${amount} ₽\n\nФункция оплаты будет добавлена при интеграции платежной системы.`);
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading text-transparent bg-clip-text bg-gradient-to-r from-cyber-pink to-cyber-purple">
            Поддержать создание полной книги
          </DialogTitle>
          <DialogDescription>
            Ваша поддержка поможет завершить работу над книгой и выпустить полную версию
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="bg-muted/50 p-4 rounded-lg border border-cyber-blue/30">
            <div className="flex items-start gap-3">
              <Icon name="BookHeart" className="text-cyber-pink mt-1" size={24} />
              <div>
                <h3 className="font-semibold mb-2">Зачем нужна поддержка?</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✨ Завершение написания всех глав</li>
                  <li>🎨 Создание профессиональных иллюстраций</li>
                  <li>📚 Редактура и корректура текста</li>
                  <li>🚀 Публикация в электронном и печатном виде</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {donationOptions.map((option) => (
              <Card
                key={option.amount}
                className={`p-4 cursor-pointer transition-all hover:scale-105 ${
                  selectedAmount === option.amount
                    ? 'border-cyber-pink bg-cyber-pink/10'
                    : 'hover:border-cyber-blue/50'
                } ${option.popular ? 'ring-2 ring-cyber-purple' : ''}`}
                onClick={() => {
                  setSelectedAmount(option.amount);
                  setCustomAmount('');
                }}
              >
                {option.popular && (
                  <Badge className="mb-2 bg-cyber-purple/20 text-cyber-purple border-cyber-purple/50">
                    Популярно
                  </Badge>
                )}
                <div className="text-2xl font-bold text-cyber-pink mb-1">
                  {option.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {option.description}
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Своя сумма</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Введите сумму"
                className="flex-1 px-3 py-2 rounded-md border border-input bg-background"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                min="1"
              />
              <span className="flex items-center text-muted-foreground">₽</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleDonate}
              disabled={!selectedAmount && !customAmount}
              className="flex-1 bg-gradient-to-r from-cyber-pink to-cyber-purple hover:opacity-90"
            >
              <Icon name="Heart" className="mr-2" size={16} />
              Поддержать
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Позже
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Все средства идут на создание и публикацию полной версии книги
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
