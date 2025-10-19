import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Icon from '@/components/ui/icon';
import { bookContent } from '@/data/bookContent';
import { useToast } from '@/hooks/use-toast';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, BorderStyle, Table, TableCell, TableRow, WidthType } from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

interface ExportDialogProps {
  user: { email: string; name: string } | null;
  children: React.ReactNode;
}

type ExportFormat = 'docx' | 'pdf' | 'txt' | 'html';

const ExportDialog = ({ user, children }: ExportDialogProps) => {
  const [format, setFormat] = useState<ExportFormat>('docx');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const parseHtmlToDocxElements = (html: string): Paragraph[] => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const paragraphs: Paragraph[] = [];
    
    const processNode = (node: Node): void => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: text,
                  size: 24,
                  font: 'Georgia',
                })
              ],
              spacing: {
                after: 200,
                line: 360,
              },
              alignment: AlignmentType.JUSTIFIED,
            })
          );
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();

        switch (tagName) {
          case 'h3':
          case 'h4':
            const headingText = element.textContent?.trim();
            if (headingText) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: headingText,
                      bold: true,
                      size: tagName === 'h3' ? 28 : 26,
                      color: '8B5CF6',
                      font: 'Georgia',
                    })
                  ],
                  heading: tagName === 'h3' ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4,
                  spacing: {
                    before: 400,
                    after: 200,
                  },
                  alignment: AlignmentType.LEFT,
                })
              );
            }
            break;

          case 'p':
            const pText = element.textContent?.trim();
            if (pText) {
              const runs: TextRun[] = [];
              
              element.childNodes.forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                  const text = child.textContent?.trim();
                  if (text) {
                    runs.push(new TextRun({
                      text: text,
                      size: 24,
                      font: 'Georgia',
                    }));
                  }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                  const childElement = child as HTMLElement;
                  const childText = childElement.textContent?.trim();
                  if (childText) {
                    runs.push(new TextRun({
                      text: childText,
                      bold: childElement.tagName === 'STRONG' || childElement.tagName === 'B',
                      italics: childElement.tagName === 'EM' || childElement.tagName === 'I',
                      size: 24,
                      font: 'Georgia',
                    }));
                  }
                }
              });

              if (runs.length > 0) {
                paragraphs.push(
                  new Paragraph({
                    children: runs,
                    spacing: {
                      after: 200,
                      line: 360,
                    },
                    alignment: AlignmentType.JUSTIFIED,
                  })
                );
              }
            }
            break;

          case 'ul':
          case 'ol':
            element.querySelectorAll('li').forEach((li, index) => {
              const liText = li.textContent?.trim();
              if (liText) {
                paragraphs.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: tagName === 'ol' ? `${index + 1}. ${liText}` : `• ${liText}`,
                        size: 24,
                        font: 'Georgia',
                      })
                    ],
                    spacing: {
                      after: 150,
                      line: 360,
                      left: 720,
                    },
                    alignment: AlignmentType.LEFT,
                  })
                );
              }
            });
            break;

          case 'div':
          case 'section':
            Array.from(element.childNodes).forEach(processNode);
            break;

          default:
            if (element.textContent?.trim()) {
              paragraphs.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: element.textContent.trim(),
                      size: 24,
                      font: 'Georgia',
                    })
                  ],
                  spacing: {
                    after: 200,
                    line: 360,
                  },
                  alignment: AlignmentType.JUSTIFIED,
                })
              );
            }
        }
      }
    };

    Array.from(tmp.childNodes).forEach(processNode);
    return paragraphs;
  };

  const exportAsDocx = async () => {
    const sections: any[] = [];
    
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'КОД ИСПЫТАНИЯ',
            bold: true,
            size: 56,
            color: 'D946EF',
            font: 'Georgia',
          })
        ],
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 300,
        },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'За пределами Матрицы Души',
            size: 28,
            italics: true,
            color: '666666',
            font: 'Georgia',
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 100,
        },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Единая Теория Многомерного Духовного Испытания',
            size: 28,
            italics: true,
            color: '666666',
            font: 'Georgia',
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 600,
        },
      }),
      new Paragraph({
        children: [new PageBreak()],
      })
    );

    let currentPart = '';
    bookContent.forEach((chapter, index) => {
      if (chapter.part && chapter.part !== currentPart) {
        currentPart = chapter.part;
        
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: chapter.part,
                bold: true,
                size: 40,
                color: '8B5CF6',
                font: 'Georgia',
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              before: 400,
              after: 400,
            },
            border: {
              top: {
                color: '8B5CF6',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 24,
              },
              bottom: {
                color: '8B5CF6',
                space: 1,
                style: BorderStyle.SINGLE,
                size: 24,
              },
            },
          })
        );
      }

      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: chapter.title,
              bold: true,
              size: 36,
              color: 'D946EF',
              font: 'Georgia',
            })
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: {
            before: 400,
            after: 300,
          },
          alignment: AlignmentType.LEFT,
        })
      );

      const contentParagraphs = parseHtmlToDocxElements(chapter.content);
      sections.push(...contentParagraphs);

      if (index < bookContent.length - 1) {
        sections.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
      }
    });

    sections.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: '© Единая Теория Многомерного Духовного Испытания',
            bold: true,
            size: 24,
            color: '666666',
            font: 'Georgia',
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 400,
          after: 200,
        },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: '«Эта теория — умозрительная картография Трансцендентного, рабочая гипотеза, а не догма. Её ценность в эвристичности, внутренней непротиворечивости и способности придавать глубокий смысл человеческому опыту, не претендуя на исчерпывающую истину.»',
            italics: true,
            size: 22,
            color: '888888',
            font: 'Georgia',
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          after: 200,
        },
      })
    );

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: sections,
      }],
    });

    const blob = await require('docx').Packer.toBlob(doc);
    saveAs(blob, 'kod-ispytaniya.docx');
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
      page-break-before: always;
    }
    h2 {
      color: #d946ef;
      font-size: 1.8em;
      margin-top: 2em;
      margin-bottom: 1em;
      page-break-after: avoid;
    }
    h3, h4 {
      color: #8b5cf6;
      margin-top: 1.5em;
      page-break-after: avoid;
    }
    p {
      margin-bottom: 1.2em;
      text-align: justify;
    }
    .chapter {
      page-break-after: always;
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
      page-break-before: always;
    }
    @media print {
      body {
        background: white;
      }
      .part, h2 {
        page-break-after: avoid;
      }
      .chapter {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <h1>КОД ИСПЫТАНИЯ</h1>
  <p class="subtitle">За пределами Матрицы Души<br/>Единая Теория Многомерного Духовного Испытания</p>
`;

    let currentPart = '';
    bookContent.forEach((chapter, index) => {
      if (chapter.part && chapter.part !== currentPart) {
        html += `  <div class="part">${chapter.part}</div>\n`;
        currentPart = chapter.part;
      }
      html += `  <div class="chapter">\n`;
      html += `    <h2>${chapter.title}</h2>\n`;
      html += `    <div class="chapter-content">${chapter.content}</div>\n`;
      html += `  </div>\n`;
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
      title: "Генерируем PDF",
      description: "Создаём PDF с разбивкой по страницам. Это может занять несколько минут...",
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPosition = margin;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor(217, 70, 239);
    
    const title = 'КОД ИСПЫТАНИЯ';
    const titleWidth = pdf.getTextWidth(title);
    pdf.text(title, (pageWidth - titleWidth) / 2, yPosition);
    yPosition += 15;

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(14);
    pdf.setTextColor(102, 102, 102);
    
    const subtitle1 = 'За пределами Матрицы Души';
    const subtitle1Width = pdf.getTextWidth(subtitle1);
    pdf.text(subtitle1, (pageWidth - subtitle1Width) / 2, yPosition);
    yPosition += 8;

    const subtitle2 = 'Единая Теория Многомерного Духовного Испытания';
    const subtitle2Width = pdf.getTextWidth(subtitle2);
    pdf.text(subtitle2, (pageWidth - subtitle2Width) / 2, yPosition);

    let currentPart = '';
    
    for (let i = 0; i < bookContent.length; i++) {
      const chapter = bookContent[i];
      
      pdf.addPage();
      yPosition = margin;

      if (chapter.part && chapter.part !== currentPart) {
        currentPart = chapter.part;
        
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(139, 92, 246);
        
        const partLines = pdf.splitTextToSize(chapter.part, maxWidth);
        partLines.forEach((line: string) => {
          const lineWidth = pdf.getTextWidth(line);
          pdf.text(line, (pageWidth - lineWidth) / 2, yPosition);
          yPosition += 10;
        });
        
        pdf.setDrawColor(139, 92, 246);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 15;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(217, 70, 239);
      
      const titleLines = pdf.splitTextToSize(chapter.title, maxWidth);
      titleLines.forEach((line: string) => {
        pdf.text(line, margin, yPosition);
        yPosition += 10;
      });
      yPosition += 5;

      const contentText = stripHtml(chapter.content);
      const paragraphs = contentText.split('\n\n').filter(p => p.trim());
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(51, 51, 51);

      for (const paragraph of paragraphs) {
        if (yPosition > pageHeight - margin - 20) {
          pdf.addPage();
          yPosition = margin;
        }

        const lines = pdf.splitTextToSize(paragraph.trim(), maxWidth);
        
        for (const line of lines) {
          if (yPosition > pageHeight - margin - 10) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.text(line, margin, yPosition);
          yPosition += 6;
        }
        
        yPosition += 4;
      }
    }

    pdf.addPage();
    yPosition = pageHeight / 2 - 30;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(102, 102, 102);
    const copyright = '© Единая Теория Многомерного Духовного Испытания';
    const copyrightWidth = pdf.getTextWidth(copyright);
    pdf.text(copyright, (pageWidth - copyrightWidth) / 2, yPosition);
    yPosition += 15;

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10);
    pdf.setTextColor(136, 136, 136);
    const disclaimer = '«Эта теория — умозрительная картография Трансцендентного, рабочая гипотеза, а не догма. Её ценность в эвристичности, внутренней непротиворечивости и способности придавать глубокий смысл человеческому опыту, не претендуя на исчерпывающую истину.»';
    const disclaimerLines = pdf.splitTextToSize(disclaimer, maxWidth - 40);
    disclaimerLines.forEach((line: string) => {
      const lineWidth = pdf.getTextWidth(line);
      pdf.text(line, (pageWidth - lineWidth) / 2, yPosition);
      yPosition += 6;
    });

    pdf.save('kod-ispytaniya.pdf');
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
        case 'docx':
          await exportAsDocx();
          break;
        case 'txt':
          exportAsTxt();
          break;
        case 'html':
          exportAsHtml();
          break;
        case 'pdf':
          await exportAsPdf();
          break;
      }

      toast({
        title: "Успешно экспортировано",
        description: `Книга сохранена в формате ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Export error:', error);
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
              <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="docx" id="docx" />
                  <Label htmlFor="docx" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Icon name="FileText" size={20} className="text-blue-500" />
                      <div>
                        <div className="font-medium">DOCX (Word)</div>
                        <div className="text-sm text-muted-foreground">Красивое форматирование, разбивка по страницам</div>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Icon name="FileText" size={20} className="text-red-500" />
                      <div>
                        <div className="font-medium">PDF</div>
                        <div className="text-sm text-muted-foreground">С разбивкой по страницам как на сайте</div>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="html" id="html" />
                  <Label htmlFor="html" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Icon name="Globe" size={20} className="text-orange-500" />
                      <div>
                        <div className="font-medium">HTML</div>
                        <div className="text-sm text-muted-foreground">Веб-страница со стилями</div>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="txt" id="txt" />
                  <Label htmlFor="txt" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Icon name="FileText" size={20} className="text-gray-500" />
                      <div>
                        <div className="font-medium">TXT</div>
                        <div className="text-sm text-muted-foreground">Простой текст без форматирования</div>
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="gap-2"
              >
                {isExporting ? (
                  <>
                    <Icon name="Loader2" className="animate-spin" size={16} />
                    Экспортируем...
                  </>
                ) : (
                  <>
                    <Icon name="Download" size={16} />
                    Скачать {format.toUpperCase()}
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;