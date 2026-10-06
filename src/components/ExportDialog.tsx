import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Icon from '@/components/ui/icon';
import { bookContent } from '@/data/bookContent';
import { useToast } from '@/hooks/use-toast';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, BorderStyle, Packer } from 'docx';
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
          case 'h4': {
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
          }

          case 'p': {
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
          }

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
                    },
                    indent: { left: 720 },
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
    const sections: Paragraph[] = [];
    const year = new Date().getFullYear();
    
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
              size: 32,
              color: 'D946EF',
              font: 'Georgia',
            })
          ],
          heading: HeadingLevel.HEADING_1,
          spacing: {
            before: 400,
            after: 300,
          },
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
            text: `© ${year} Единая Теория Многомерного Духовного Испытания`,
            bold: true,
            size: 24,
            color: '666666',
            font: 'Georgia',
          })
        ],
        alignment: AlignmentType.CENTER,
        spacing: {
          before: 400,
          after: 300,
        },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: '«Эта теория — умозрительная картография Трансцендентного, рабочая гипотеза, а не догма. Её ценность в эвристичности, внутренней непротиворечивости и способности придавать глубокий смысл человеческому опыту, не претендуя на исчерпывающую истину.»',
            italics: true,
            size: 20,
            color: '888888',
            font: 'Georgia',
          })
        ],
        alignment: AlignmentType.CENTER,
      })
    );

    const doc = new Document({
      sections: [{
        properties: {},
        children: sections,
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'kod-ispytaniya.docx');
    
    toast({
      title: "DOCX готов!",
      description: "Профессиональный документ с форматированием сохранён",
    });
  };

  const exportAsHtml = () => {
    const year = new Date().getFullYear();
    let html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Единая Теория Многомерного Духовного Испытания - За пределами Матрицы Души">
  <meta name="author" content="Код Испытания">
  <meta property="og:title" content="Код Испытания">
  <meta property="og:description" content="Единая Теория Многомерного Духовного Испытания">
  <meta property="og:type" content="book">
  <title>Код Испытания - Единая Теория Многомерного Духовного Испытания</title>
  <style>
    @media print {
      body { margin: 0; padding: 1.5cm; }
      .no-print { display: none; }
      .page-break { page-break-before: always; }
      h1, h2 { page-break-after: avoid; }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      line-height: 1.8;
      color: #1a1a1a;
      background: #ffffff;
      padding: 2rem;
      max-width: 850px;
      margin: 0 auto;
    }
    .toolbar {
      position: sticky;
      top: 0;
      background: #ffffff;
      padding: 1rem;
      border-bottom: 2px solid #D946EF;
      margin: -2rem -2rem 2rem -2rem;
      display: flex;
      gap: 1rem;
      justify-content: center;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .toolbar button {
      padding: 0.5rem 1.5rem;
      background: #D946EF;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.3s;
    }
    .toolbar button:hover {
      background: #8B5CF6;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(217, 70, 239, 0.3);
    }
    h1 {
      font-size: 3.5rem;
      color: #D946EF;
      text-align: center;
      margin: 4rem 0 1.5rem;
      font-weight: bold;
      letter-spacing: 2px;
      text-shadow: 2px 2px 4px rgba(217, 70, 239, 0.2);
    }
    .subtitle {
      text-align: center;
      font-size: 1.6rem;
      color: #666;
      font-style: italic;
      margin-bottom: 0.8rem;
      line-height: 1.6;
    }
    .toc {
      background: #f9fafb;
      padding: 2rem;
      border-radius: 12px;
      margin: 3rem 0;
      border-left: 4px solid #D946EF;
    }
    .toc h2 {
      color: #8B5CF6;
      margin-bottom: 1.5rem;
      font-size: 2rem;
    }
    .toc-part {
      margin: 1.5rem 0;
    }
    .toc-part-title {
      color: #8B5CF6;
      font-weight: bold;
      font-size: 1.2rem;
      margin-bottom: 0.5rem;
    }
    .toc-item {
      padding: 0.5rem 0;
      border-bottom: 1px dotted #ddd;
      display: flex;
      justify-content: space-between;
    }
    .toc-item:last-child { border-bottom: none; }
    .toc-item a {
      color: #1a1a1a;
      text-decoration: none;
      flex: 1;
    }
    .toc-item a:hover {
      color: #D946EF;
    }
    .part-title {
      font-size: 2.2rem;
      color: #8B5CF6;
      text-align: center;
      margin: 4rem 0 2rem;
      padding: 1rem 0 0.8rem;
      border-bottom: 3px solid #8B5CF6;
      font-weight: bold;
      letter-spacing: 1px;
      background: linear-gradient(to bottom, transparent, #f3e8ff);
    }
    .chapter {
      margin: 3rem 0;
      padding: 2.5rem;
      background: #fafafa;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .chapter-title {
      font-size: 2rem;
      color: #D946EF;
      margin-bottom: 1.5rem;
      font-weight: bold;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid rgba(217, 70, 239, 0.2);
    }
    .chapter-content p {
      margin: 1.2rem 0;
      text-align: justify;
      text-indent: 2em;
    }
    .chapter-content p:first-of-type {
      text-indent: 0;
    }
    footer {
      margin-top: 5rem;
      padding: 3rem 2rem;
      border-top: 3px solid #D946EF;
      text-align: center;
      color: #666;
      font-size: 0.95rem;
      background: linear-gradient(to top, #f9fafb, transparent);
    }
    footer strong {
      color: #D946EF;
      font-size: 1.1rem;
    }
    .disclaimer {
      max-width: 700px;
      margin: 1.5rem auto;
      font-style: italic;
      color: #888;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <button onclick="window.print()">🖨️ Печать / Сохранить как PDF</button>
    <button onclick="document.body.style.fontSize = (parseFloat(getComputedStyle(document.body).fontSize) + 2) + 'px'">🔍 A+</button>
    <button onclick="document.body.style.fontSize = (parseFloat(getComputedStyle(document.body).fontSize) - 2) + 'px'">🔍 A-</button>
  </div>
  
  <h1>КОД ИСПЫТАНИЯ</h1>
  <div class="subtitle">За пределами Матрицы Души</div>
  <div class="subtitle">Единая Теория Многомерного Духовного Испытания</div>
  
  <div class="toc">
    <h2>📚 Оглавление</h2>
`;

    let currentPartForToc = '';
    let chapterNum = 1;
    bookContent.forEach((chapter) => {
      if (chapter.part && chapter.part !== currentPartForToc) {
        currentPartForToc = chapter.part;
        html += `    <div class="toc-part">
      <div class="toc-part-title">${chapter.part}</div>
`;
      }
      html += `      <div class="toc-item">
        <a href="#chapter-${chapter.id}">${chapterNum}. ${chapter.title}</a>
      </div>
`;
      chapterNum++;
      if (chapter.part && (bookContent.indexOf(chapter) === bookContent.length - 1 || bookContent[bookContent.indexOf(chapter) + 1].part !== chapter.part)) {
        html += `    </div>
`;
      }
    });
    html += `  </div>

  <div class="page-break"></div>
`;

    let currentPart = '';
    chapterNum = 1;
    bookContent.forEach((chapter, idx) => {
      if (chapter.part && chapter.part !== currentPart) {
        currentPart = chapter.part;
        if (idx > 0) html += `  <div class="page-break"></div>\n`;
        html += `  <div class="part-title">${chapter.part}</div>\n`;
      }
      
      html += `  <div class="chapter page-break" id="chapter-${chapter.id}">
    <div class="chapter-title">${chapterNum}. ${chapter.title}</div>
    <div class="chapter-content">${chapter.content}</div>
  </div>
`;
      chapterNum++;
    });

    html += `
  <div class="page-break"></div>
  <footer>
    <p><strong>© ${year} Единая Теория Многомерного Духовного Испытания</strong></p>
    <p class="disclaimer">«Эта теория — умозрительная картография Трансцендентного, рабочая гипотеза, а не догма. Её ценность в эвристичности, внутренней непротиворечивости и способности придавать глубокий смысл человеческому опыту, не претендуя на исчерпывающую истину.»</p>
    <p style="margin-top: 1.5rem; color: #888;">Создано на <strong style="color: #D946EF;">poehali.dev</strong></p>
  </footer>
  
  <script>
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  </script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'kod-ispytaniya.html';
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "HTML готов!",
      description: "Файл содержит оглавление, навигацию и оптимизирован для печати в PDF",
    });
  };

  const exportAsPdf = async () => {
    toast({
      title: "Генерируем PDF",
      description: "Создаём профессиональный PDF с оглавлением и разбивкой по страницам...",
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
    let pageNumber = 1;

    const addPageNumber = () => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(136, 136, 136);
      pdf.text(`${pageNumber}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      pageNumber++;
    };

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(32);
    pdf.setTextColor(217, 70, 239);
    
    yPosition = pageHeight / 2 - 40;
    
    const title = 'КОД ИСПЫТАНИЯ';
    const titleWidth = pdf.getTextWidth(title);
    pdf.text(title, (pageWidth - titleWidth) / 2, yPosition);
    yPosition += 20;

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(16);
    pdf.setTextColor(102, 102, 102);
    
    const subtitle1 = 'За пределами Матрицы Души';
    const subtitle1Width = pdf.getTextWidth(subtitle1);
    pdf.text(subtitle1, (pageWidth - subtitle1Width) / 2, yPosition);
    yPosition += 10;

    const subtitle2 = 'Единая Теория Многомерного Духовного Испытания';
    const subtitle2Width = pdf.getTextWidth(subtitle2);
    pdf.text(subtitle2, (pageWidth - subtitle2Width) / 2, yPosition);
    
    yPosition = pageHeight - 40;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(136, 136, 136);
    const year = new Date().getFullYear();
    const copyrightText = `© ${year} Все права защищены`;
    const copyrightWidth = pdf.getTextWidth(copyrightText);
    pdf.text(copyrightText, (pageWidth - copyrightWidth) / 2, yPosition);

    pdf.addPage();
    yPosition = margin;
    pageNumber = 2;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor(139, 92, 246);
    pdf.text('Оглавление', margin, yPosition);
    yPosition += 15;
    
    pdf.setDrawColor(139, 92, 246);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(51, 51, 51);
    
    let lastPart = '';
    
    bookContent.forEach((chapter, idx) => {
      if (yPosition > pageHeight - margin - 15) {
        addPageNumber();
        pdf.addPage();
        yPosition = margin;
      }
      
      if (chapter.part && chapter.part !== lastPart) {
        lastPart = chapter.part;
        yPosition += 5;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(139, 92, 246);
        const partLines = pdf.splitTextToSize(chapter.part, maxWidth - 20);
        partLines.forEach((line: string) => {
          if (yPosition > pageHeight - margin - 15) {
            addPageNumber();
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin + 5, yPosition);
          yPosition += 6;
        });
        yPosition += 3;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(51, 51, 51);
      }
      
      const chapterTitle = `${idx + 1}. ${chapter.title}`;
      const titleLines = pdf.splitTextToSize(chapterTitle, maxWidth - 30);
      titleLines.forEach((line: string) => {
        if (yPosition > pageHeight - margin - 15) {
          addPageNumber();
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin + 10, yPosition);
        yPosition += 5;
      });
    });
    
    addPageNumber();

    let currentPart = '';
    
    for (let i = 0; i < bookContent.length; i++) {
      const chapter = bookContent[i];
      
      pdf.addPage();
      yPosition = margin;
      pageNumber++;

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
        if (yPosition > pageHeight - margin - 25) {
          addPageNumber();
          pdf.addPage();
          yPosition = margin;
          pageNumber++;
        }

        const lines = pdf.splitTextToSize(paragraph.trim(), maxWidth);
        
        for (const line of lines) {
          if (yPosition > pageHeight - margin - 15) {
            addPageNumber();
            pdf.addPage();
            yPosition = margin;
            pageNumber++;
          }
          
          pdf.text(line, margin, yPosition);
          yPosition += 6;
        }
        
        yPosition += 4;
      }
      
      addPageNumber();
    }

    pdf.addPage();
    pageNumber++;
    yPosition = pageHeight / 2 - 40;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(102, 102, 102);
    const copyright = `© ${year} Единая Теория Многомерного Духовного Испытания`;
    const copyrightWidth2 = pdf.getTextWidth(copyright);
    pdf.text(copyright, (pageWidth - copyrightWidth2) / 2, yPosition);
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
    
    yPosition = pageHeight - 30;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const website = 'poehali.dev';
    const websiteWidth = pdf.getTextWidth(website);
    pdf.text(website, (pageWidth - websiteWidth) / 2, yPosition);
    
    addPageNumber();

    pdf.save('kod-ispytaniya.pdf');
    
    toast({
      title: "PDF готов!",
      description: `Создан профессиональный PDF с оглавлением на ${pageNumber} страниц`,
    });
  };

  const exportAsTxt = () => {
    let text = '═'.repeat(70) + '\n';
    text += ' '.repeat(15) + 'КОД ИСПЫТАНИЯ\n';
    text += '═'.repeat(70) + '\n\n';
    text += ' '.repeat(10) + 'За пределами Матрицы Души\n';
    text += ' '.repeat(5) + 'Единая Теория Многомерного Духовного Испытания\n\n';
    text += '═'.repeat(70) + '\n\n';
    text += 'ОГЛАВЛЕНИЕ\n';
    text += '─'.repeat(70) + '\n\n';
    
    let currentPartForToc = '';
    let chapterNum = 1;
    bookContent.forEach((chapter) => {
      if (chapter.part && chapter.part !== currentPartForToc) {
        currentPartForToc = chapter.part;
        text += `\n${chapter.part.toUpperCase()}\n`;
      }
      text += `  ${chapterNum}. ${chapter.title}\n`;
      chapterNum++;
    });
    text += '\n' + '═'.repeat(70) + '\n\n';

    let currentPart = '';
    chapterNum = 1;
    bookContent.forEach((chapter) => {
      if (chapter.part && chapter.part !== currentPart) {
        currentPart = chapter.part;
        text += '\n\n' + '═'.repeat(70) + '\n';
        text += ' '.repeat(10) + chapter.part.toUpperCase() + '\n';
        text += '═'.repeat(70) + '\n\n';
      }
      
      text += `\n[Глава ${chapterNum}]\n`;
      text += chapter.title + '\n';
      text += '─'.repeat(70) + '\n\n';
      
      const content = stripHtml(chapter.content);
      const paragraphs = content.split('\n\n').filter(p => p.trim());
      paragraphs.forEach(p => {
        const wrapped = p.match(/.{1,75}(\s|$)/g) || [p];
        text += wrapped.join('\n') + '\n\n';
      });
      
      chapterNum++;
    });

    const year = new Date().getFullYear();
    text += '\n\n' + '═'.repeat(70) + '\n';
    text += ' '.repeat(10) + `© ${year} Единая Теория Многомерного Духовного Испытания\n`;
    text += '═'.repeat(70) + '\n\n';
    const disclaimer = '«Эта теория — умозрительная картография Трансцендентного, рабочая гипотеза, а не догма. Её ценность в эвристичности, внутренней непротиворечивости и способности придавать глубокий смысл человеческому опыту, не претендуя на исчерпывающую истину.»';
    const disclaimerWrapped = disclaimer.match(/.{1,75}(\s|$)/g) || [disclaimer];
    text += disclaimerWrapped.join('\n') + '\n\n';
    text += ' '.repeat(25) + 'Создано на poehali.dev\n';

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, 'kod-ispytaniya.txt');
    
    toast({
      title: "TXT готов!",
      description: "Текстовый файл с оглавлением и форматированием сохранён",
    });
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
        case 'pdf':
          await exportAsPdf();
          break;
        case 'txt':
          exportAsTxt();
          break;
        case 'html':
          exportAsHtml();
          break;
      }
    } catch (error) {
      toast({
        title: "Ошибка экспорта",
        description: "Не удалось создать файл. Попробуйте другой формат.",
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Download" size={24} />
            Экспорт книги
          </DialogTitle>
          <DialogDescription>
            Скачайте книгу в удобном формате для чтения оффлайн или печати
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Выберите формат экспорта:
            </Label>
            <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="docx" id="docx" />
                  <Label htmlFor="docx" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Icon name="FileText" size={20} className="text-blue-600" />
                      <div>
                        <div className="font-medium">DOCX (Word)</div>
                        <div className="text-sm text-muted-foreground">Профессиональное форматирование для Word</div>
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
                        <div className="text-sm text-muted-foreground">Профессиональный с оглавлением и номерами страниц</div>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                  <RadioGroupItem value="html" id="html" />
                  <Label htmlFor="html" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Icon name="Code" size={20} className="text-orange-500" />
                      <div>
                        <div className="font-medium">HTML</div>
                        <div className="text-sm text-muted-foreground">С оглавлением, навигацией и SEO-мета тегами</div>
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
                        <div className="text-sm text-muted-foreground">С оглавлением и красивым форматированием</div>
                      </div>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <Button 
            onClick={handleExport} 
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-600 hover:to-violet-600"
            size="lg"
          >
            {isExporting ? (
              <>
                <Icon name="Loader2" size={20} className="mr-2 animate-spin" />
                Создаём файл...
              </>
            ) : (
              <>
                <Icon name="Download" size={20} className="mr-2" />
                Скачать книгу
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportDialog;