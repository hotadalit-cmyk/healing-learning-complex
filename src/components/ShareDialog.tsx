import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { useToast } from '@/hooks/use-toast';

interface ShareDialogProps {
  children: React.ReactNode;
  url?: string;
  title?: string;
  description?: string;
}

const ShareDialog = ({ 
  children, 
  url = window.location.href,
  title = 'КОД ИСПЫТАНИЯ',
  description = 'Лечебно-Учебный Комплекс — книга о природе реальности'
}: ShareDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Ссылка скопирована',
        description: 'Ссылка успешно скопирована в буфер обмена',
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось скопировать ссылку',
        variant: 'destructive',
      });
    }
  };

  const shareLinks = [
    {
      name: 'Telegram',
      icon: 'Send',
      color: 'text-[#0088cc]',
      url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
    {
      name: 'WhatsApp',
      icon: 'MessageCircle',
      color: 'text-[#25D366]',
      url: `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
    },
    {
      name: 'VK',
      icon: 'Share2',
      color: 'text-[#0077FF]',
      url: `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    },
    {
      name: 'Twitter',
      icon: 'Twitter',
      color: 'text-[#1DA1F2]',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    },
  ];

  const handleShare = (shareUrl: string) => {
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share error:', error);
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-cyber-pink">Поделиться книгой</DialogTitle>
          <DialogDescription>
            Расскажите друзьям о «Коде Испытания»
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {shareLinks.map((link) => (
              <Button
                key={link.name}
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2 hover:border-cyber-pink/50 transition-all"
                onClick={() => handleShare(link.url)}
              >
                <Icon name={link.icon as any} className={`${link.color}`} size={24} />
                <span className="text-sm">{link.name}</span>
              </Button>
            ))}
          </div>

          {navigator.share && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleNativeShare}
            >
              <Icon name="Share" size={20} />
              Поделиться через...
            </Button>
          )}

          <div className="flex gap-2">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground truncate">
              {url}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2"
            >
              <Icon name="Copy" size={16} />
              Копировать
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
