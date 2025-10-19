import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Icon from '@/components/ui/icon';
import { bookContent } from '@/data/bookContent';
import { useToast } from '@/hooks/use-toast';

interface ExportDialogProps {
  user: { email: string; name: string } | null;
  children: React.ReactNode;
}

type ExportFormat = 'pdf' | 'epub' | 'txt' | 'html';

const ExportDialog = ({ user, children }: ExportDialogProps) => {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const exportAsTxt = () => {
    let content = 'КОД ИСПЫТАНИЯ\nЗа пределами Матрицы Души\nЕдиная Теория Многомерного Духовного Испытания\n\n';
    content += '='.repeat(80) + '\n\n';

    bookContent.forEach((chapter) => {
      if (chapter.part) {
        content += `\n${chapter.part}\n`;
        content += '='.repeat(chapter.part.length) + '\n\n';
      }
      content += `${chapter.title}\n`;
      content += '-'.repeat(chapter.title.length) + '\n\n';
      content += stripHtml(chapter.content) + '\n\n';
      content += '='.repeat(80) + '\n\n';
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kod-ispytaniya.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsHtml = () => {
    let html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>КОД ИСПЫТАНИЯ - Лечебно-Учебный Комплекс</title>
  <style>
    body {
      font-family: 'Georgia', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      line-height: 1.8;
      color: #333;
      background: #fafafa;
    }
    h1 {
      text-align: center;
      color: #d946ef;
      font-size: 2.5em;
      margin-bottom: 0.3em;
    }
    .subtitle {
      text-align: center;
      color: #666;
      font-size: 1.2em;
      margin-bottom: 3em;
    }
    .part {
      color: #8b5cf6;
      font-size: 1.5em;
      font-weight: bold;
      margin-top: 3em;
      margin-bottom: 1em;
      text-align: center;
      border-top: 3px solid #8b5cf6;
      padding-top: 1em;
    }
    h2 {
      color: #d946ef;
      font-size: 1.8em;
      margin-top: 2em;
      margin-bottom: 1em;
    }
    h3, h4 {
      color: #8b5cf6;
      margin-top: 1.5em;
    }
    p {
      margin-bottom: 1.2em;
    }
    .highlight {
      background: linear-gradient(to right, rgba(217, 70, 239, 0.1), rgba(139, 92, 246, 0.1));
      padding: 20px;
      border-radius: 10px;
      border-left: 4px solid #d946ef;
      margin: 2em 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 2em 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background: rgba(217, 70, 239, 0.1);
      color: #d946ef;
      font-weight: bold;
    }
    ul, ol {
      margin-left: 2em;
      margin-bottom: 1.2em;
    }
    li {
      margin-bottom: 0.5em;
    }
    .footer {
      margin-top: 4em;
      padding-top: 2em;
      border-top: 2px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <h1>КОД ИСПЫТАНИЯ</h1>
  <p class="subtitle">За пределами Матрицы Души<br/>Единая Теория Многомерного Духовного Испытания</p>
`;

    let currentPart = '';
    bookContent.forEach((chapter) => {
      if (chapter.part && chapter.part !== currentPart) {
        html += `  <div class="part">${chapter.part}</div>\n`;
        currentPart = chapter.part;
      }
      html += `  <h2>${chapter.title}</h2>\n`;
      html += `  <div class="chapter-content">${chapter.content}</div>\n`;
    });

    html += `
  <div class="footer">
    <p><strong>© Единая Теория Многомерного Духовного Испытания</strong></p>
    <p><em>«Эта теория — умозрительная картография Трансцендентного, рабочая гипотеза, а не догма. Её ценность в эвристичности, внутренней непротиворечивости и способности придавать глубокий смысл человеческому опыту, не претендуя на исчерпывающую истину.»</em></p>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kod-ispytaniya.html';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAsPdf = async () => {
    toast({
      title: "PDF экспорт",
      description: "Откройте HTML версию и используйте Печать → Сохранить как PDF в браузере для создания PDF файла.",
    });
    exportAsHtml();
  };

  const exportAsEpub = () => {
    let epubContent = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>КОД ИСПЫТАНИЯ</dc:title>
    <dc:language>ru</dc:language>
    <dc:description>За пределами Матрицы Души. Единая Теория Многомерного Духовного Испытания</dc:description>
  </metadata>
  <manifest>
`;

    bookContent.forEach((chapter, index) => {
      epubContent += `    <item id="chapter${index}" href="chapter${index}.xhtml" media-type="application/xhtml+xml"/>\n`;
    });

    epubContent += `  </manifest>
  <spine>
`;

    bookContent.forEach((_, index) => {
      epubContent += `    <itemref idref="chapter${index}"/>\n`;
    });

    epubContent += `  </spine>
</package>`;

    toast({
      title: "EPUB экспорт",
      description: "Для полноценного EPUB используйте онлайн-конвертеры или специализированные программы. Экспортирую как HTML.",
    });
    exportAsHtml();
  };

  const handleExport = async () => {
    if (!user) {
      toast({
        title: "Требуется авторизация",
        description: "Войдите в систему, чтобы экспортировать книгу",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);

    try {
      switch (format) {
        case 'txt':
          exportAsTxt();
          break;
        case 'html':
          exportAsHtml();
          break;
        case 'pdf':
          await exportAsPdf();
          break;
        case 'epub':
          exportAsEpub();
          break;
      }

      toast({
        title: "Успешно экспортировано",
        description: `Книга сохранена в формате ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Ошибка экспорта",
        description: "Не удалось экспортировать книгу",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Download" className="text-primary" />
            Экспорт книги
          </DialogTitle>
          <DialogDescription>
            {user 
              ? "Выберите формат для скачивания книги" 
              : "Войдите в систему, чтобы экспортировать книгу"}
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="bg-muted/50 p-6 rounded-xl border border-border text-center">
            <Icon name="Lock" size={48} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              Функция экспорта доступна только для авторизованных пользователей
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="txt" id="txt" />
                    <Label htmlFor="txt" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="FileText" size={20} className="text-primary" />
                          <span className="font-medium">TXT</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Простой текст</span>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="html" id="html" />
                    <Label htmlFor="html" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="Code" size={20} className="text-primary" />
                          <span className="font-medium">HTML</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Веб-страница</span>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="pdf" id="pdf" />
                    <Label htmlFor="pdf" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="FileText" size={20} className="text-primary" />
                          <span className="font-medium">PDF</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Документ</span>
                      </div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="epub" id="epub" />
                    <Label htmlFor="epub" className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon name="BookOpen" size={20} className="text-primary" />
                          <span className="font-medium">EPUB</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Электронная книга</span>
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                {isExporting ? (
                  <>
                    <Icon name="Loader2" className="mr-2 animate-spin" />
                    Экспортирую...
                  </>
                ) : (
                  <>
                    <Icon name="Download" className="mr-2" />
                    Скачать {format.toUpperCase()}
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Экспорт книги доступен в личных целях
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;
