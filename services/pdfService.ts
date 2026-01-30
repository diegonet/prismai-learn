import jsPDF from "jspdf";
import { ChatMessage, LanguageCode } from "../types";

export interface ReportData {
  problemImage: File | string | null;
  solutionAttemptType: 'text' | 'video' | 'audio' | 'image';
  solutionText: string;
  solutionImage: File | null;
  generatedVideoSummary?: string;
  questionType: 'text' | 'audio';
  questionText: string;
}

// Helper to convert File or URL to Base64 for PDF embedding
const imageToBase64 = async (input: File | string): Promise<string> => {
  if (typeof input === 'string') {
     // Handle URL (fetch blob then convert)
     try {
         const response = await fetch(input);
         const blob = await response.blob();
         return new Promise((resolve, reject) => {
             const reader = new FileReader();
             reader.onload = () => resolve(reader.result as string);
             reader.onerror = reject;
             reader.readAsDataURL(blob);
         });
     } catch (e) {
         console.error("Failed to fetch image from URL for PDF", e);
         throw e;
     }
  } else {
     // Handle File object
     return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(input);
     });
  }
};

// Helper to generate a Base64 image from Plotly JSON data
const generatePlotlyImage = async (jsonString: string): Promise<string | null> => {
  try {
    const graphData = JSON.parse(jsonString);
    // @ts-ignore - Plotly is loaded via CDN in index.html
    if (window.Plotly) {
      // Create a static image from the data without mounting to DOM
      // @ts-ignore
      const base64Url = await window.Plotly.toImage(graphData, {
        format: 'png',
        width: 600,
        height: 400
      });
      return base64Url;
    }
    return null;
  } catch (e) {
    console.error("Error generating chart image for PDF", e);
    return null;
  }
};

// Helper to replace LaTeX commands with readable ASCII text (safer for standard PDF fonts)
const cleanLatex = (text: string): string => {
  let cleaned = text;

  // 1. Handle complex structures like underbrace: \underbrace{a}_{b} -> a (b)
  const underbraceRegex = /\\underbrace\{([^}]+)\}_\{([^}]+)\}/g;
  while (underbraceRegex.test(cleaned)) {
    cleaned = cleaned.replace(underbraceRegex, '$1 ($2)');
  }

  // 2. Handle Fractions: \frac{a}{b} -> (a)/(b)
  const fracRegex = /\\frac\{([^}]+)\}\{([^}]+)\}/g;
  cleaned = cleaned.replace(fracRegex, '($1)/($2)');

  // 3. Handle Square Root: \sqrt{a} -> sqrt(a)
  const sqrtRegex = /\\sqrt\{([^}]+)\}/g;
  cleaned = cleaned.replace(sqrtRegex, 'sqrt($1)');
  
  // 4. Handle text styling: \text{...} -> ...
  const textRegex = /\\text\{([^}]+)\}/g;
  cleaned = cleaned.replace(textRegex, '$1');

  // 5. Common Symbols & Functions Map - USING ASCII TO PREVENT GARBAGE CHARACTERS
  const replacements: Record<string, string> = {
    '\\alpha': 'alpha', '\\beta': 'beta', '\\gamma': 'gamma', '\\theta': 'theta',
    '\\pi': 'pi', '\\Delta': 'Delta', '\\sigma': 'sigma', '\\omega': 'omega',
    '\\phi': 'phi', '\\mu': 'mu', '\\lambda': 'lambda', '\\rho': 'rho',
    '\\epsilon': 'epsilon', '\\tau': 'tau', '\\infty': 'infinity',
    '\\pm': '+/-', '\\approx': '~', '\\neq': '!=', '\\le': '<=',
    '\\ge': '>=', '\\times': '*', '\\cdot': '.', '\\circ': 'deg',
    '\\rightarrow': '->', '\\Rightarrow': '=>', '\\implies': '=>',
    '\\degree': 'deg',
    '\\sin': 'sin', '\\cos': 'cos', '\\tan': 'tan', 
    '\\log': 'log', '\\ln': 'ln'
  };

  for (const [key, value] of Object.entries(replacements)) {
    // Escape backslash for regex
    const regex = new RegExp(key.replace(/\\/g, '\\\\'), 'g');
    cleaned = cleaned.replace(regex, ` ${value} `); // Add spacing for readability
  }

  // Clean up double spaces created by replacements
  return cleaned.replace(/\s+/g, ' ');
};

// Helper to strip Markdown (basic) for cleaner PDF text
const cleanText = (text: string): string => {
  // First clean LaTeX to readable text
  let processed = cleanLatex(text);

  return processed
    .replace(/\*\*/g, "") // Bold
    .replace(/\*/g, "")   // Italic
    .replace(/#/g, "")    // Headers
    .replace(/`/g, "")    // Code ticks
    .replace(/\$/g, "");  // Math delimiters (keep content)
};

// PDF Translations
const PDF_I18N: Record<LanguageCode, any> = {
  es: {
    header: "PrismAI Learn - Reporte de Sesión",
    date: "Fecha:",
    sec1: "1. Contexto del Problema",
    sec2: "2. Entradas del Estudiante",
    attempt: "Intento de Solución:",
    question: "Pregunta:",
    sec3: "3. Transcripción de la Sesión",
    student: "Estudiante:",
    tutor: "Tutor PrismAI:",
    videoSub: "[Archivo de Video Enviado]",
    audioSub: "[Archivo de Audio Enviado]",
    audioQue: "[Pregunta de Audio Enviada]",
    errorImg: "[Error cargando imagen]",
    chartErr: "[Error generando gráfico]",
    page: "Página",
    of: "de"
  },
  en: {
    header: "PrismAI Learn - Session Report",
    date: "Date:",
    sec1: "1. Problem Context",
    sec2: "2. Student Inputs",
    attempt: "Solution Attempt:",
    question: "Question:",
    sec3: "3. Session Transcript",
    student: "Student:",
    tutor: "PrismAI Tutor:",
    videoSub: "[Video File Submitted]",
    audioSub: "[Audio File Submitted]",
    audioQue: "[Audio Question Submitted]",
    errorImg: "[Error loading image]",
    chartErr: "[Chart Generation Failed]",
    page: "Page",
    of: "of"
  },
  pt: {
    header: "PrismAI Learn - Relatório da Sessão",
    date: "Data:",
    sec1: "1. Contexto do Problema",
    sec2: "2. Entradas do Estudante",
    attempt: "Tentativa de Solução:",
    question: "Pergunta:",
    sec3: "3. Transcrição da Sessão",
    student: "Estudante:",
    tutor: "Tutor PrismAI:",
    videoSub: "[Arquivo de Vídeo Enviado]",
    audioSub: "[Arquivo de Áudio Enviado]",
    audioQue: "[Pergunta de Áudio Enviada]",
    errorImg: "[Erro ao carregar imagem]",
    chartErr: "[Erro ao gerar gráfico]",
    page: "Página",
    of: "de"
  },
  fr: {
    header: "PrismAI Learn - Rapport de Session",
    date: "Date :",
    sec1: "1. Contexte du Problème",
    sec2: "2. Entrées de l'Étudiant",
    attempt: "Tentative de Solution :",
    question: "Question :",
    sec3: "3. Transcription de la Session",
    student: "Étudiant :",
    tutor: "Tuteur PrismAI :",
    videoSub: "[Fichier Vidéo Soumis]",
    audioSub: "[Fichier Audio Soumis]",
    audioQue: "[Question Audio Soumise]",
    errorImg: "[Erreur de chargement d'image]",
    chartErr: "[Échec de génération du graphique]",
    page: "Page",
    of: "sur"
  },
  de: {
    header: "PrismAI Learn - Sitzungsbericht",
    date: "Datum:",
    sec1: "1. Problemkontext",
    sec2: "2. Eingaben des Studenten",
    attempt: "Lösungsversuch:",
    question: "Frage:",
    sec3: "3. Sitzungsprotokoll",
    student: "Student:",
    tutor: "PrismAI Tutor:",
    videoSub: "[Videodatei gesendet]",
    audioSub: "[Audiodatei gesendet]",
    audioQue: "[Audiofrage gesendet]",
    errorImg: "[Fehler beim Laden des Bildes]",
    chartErr: "[Diagrammerstellung fehlgeschlagen]",
    page: "Seite",
    of: "von"
  },
  zh: {
    header: "PrismAI Learn - 会话报告",
    date: "日期:",
    sec1: "1. 问题背景",
    sec2: "2. 学生输入",
    attempt: "尝试解决方案:",
    question: "问题:",
    sec3: "3. 会话记录",
    student: "学生:",
    tutor: "PrismAI 导师:",
    videoSub: "[已提交视频文件]",
    audioSub: "[已提交音频文件]",
    audioQue: "[已提交音频问题]",
    errorImg: "[加载图片错误]",
    chartErr: "[图表生成失败]",
    page: "页",
    of: "共"
  },
  ja: {
    header: "PrismAI Learn - セッションレポート",
    date: "日付:",
    sec1: "1. 問題の背景",
    sec2: "2. 学生の入力",
    attempt: "解決の試み:",
    question: "質問:",
    sec3: "3. セッション記録",
    student: "学生:",
    tutor: "PrismAI チューター:",
    videoSub: "[ビデオファイル提出済み]",
    audioSub: "[音声ファイル提出済み]",
    audioQue: "[音声質問提出済み]",
    errorImg: "[画像読み込みエラー]",
    chartErr: "[チャート生成失敗]",
    page: "ページ",
    of: "/"
  },
  ru: {
    header: "PrismAI Learn - Отчет о сессии",
    date: "Дата:",
    sec1: "1. Контекст проблемы",
    sec2: "2. Ввод студента",
    attempt: "Попытка решения:",
    question: "Вопрос:",
    sec3: "3. Стенограмма сессии",
    student: "Студент:",
    tutor: "Тьютор PrismAI:",
    videoSub: "[Видео отправлено]",
    audioSub: "[Аудио отправлено]",
    audioQue: "[Аудио-вопрос отправлен]",
    errorImg: "[Ошибка загрузки изображения]",
    chartErr: "[Ошибка генерации графика]",
    page: "Страница",
    of: "из"
  },
  ar: {
    header: "PrismAI Learn - تقرير الجلسة",
    date: "التاريخ:",
    sec1: "1. سياق المشكلة",
    sec2: "2. مدخلات الطالب",
    attempt: "محاولة الحل:",
    question: "السؤال:",
    sec3: "3. نص الجلسة",
    student: "الطالب:",
    tutor: "المعلم PrismAI:",
    videoSub: "[تم إرسال ملف الفيديو]",
    audioSub: "[تم إرسال ملف الصوت]",
    audioQue: "[تم إرسال سؤال صوتي]",
    errorImg: "[خطأ في تحميل الصورة]",
    chartErr: "[فشل إنشاء المخطط]",
    page: "صفحة",
    of: "من"
  },
  hi: {
    header: "PrismAI Learn - सत्र रिपोर्ट",
    date: "दिनांक:",
    sec1: "1. समस्या संदर्भ",
    sec2: "2. छात्र इनपुट",
    attempt: "समाधान का प्रयास:",
    question: "प्रश्न:",
    sec3: "3. सत्र प्रतिलेख",
    student: "छात्र:",
    tutor: "PrismAI ट्यूटर:",
    videoSub: "[वीडियो फ़ाइल प्रस्तुत की गई]",
    audioSub: "[ऑडियो फ़ाइल प्रस्तुत की गई]",
    audioQue: "[ऑडियो प्रश्न प्रस्तुत किया गया]",
    errorImg: "[छवि लोड करने में त्रुटि]",
    chartErr: "[चार्ट निर्माण विफल]",
    page: "पृष्ठ",
    of: "का"
  }
};

export const generateSessionPDF = async (
  data: ReportData, 
  chatHistory: ChatMessage[], 
  language: LanguageCode = 'en'
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const bottomMargin = 20;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 5;
  let cursorY = 20;

  const strings = PDF_I18N[language] || PDF_I18N['en'];

  // Helper for checking page break
  const checkPageBreak = (heightNeeded: number) => {
    if (cursorY + heightNeeded > pageHeight - bottomMargin) {
      doc.addPage();
      cursorY = 20;
      return true;
    }
    return false;
  };

  // --- Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(2, 132, 199); // PrismAI Blue
  doc.text(strings.header, margin, cursorY);
  
  cursorY += 10;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont("helvetica", "normal");
  doc.text(`${strings.date} ${new Date().toLocaleString(language)}`, margin, cursorY);
  cursorY += 10;

  // --- Line Separator ---
  doc.setDrawColor(200);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 10;

  // --- Section 1: Problem Image ---
  if (data.problemImage) {
    checkPageBreak(15);
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(strings.sec1, margin, cursorY);
    cursorY += 8;

    try {
      const imgData = await imageToBase64(data.problemImage);
      const imgProps = doc.getImageProperties(imgData);
      const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
      
      const displayHeight = Math.min(imgHeight, 100); 
      checkPageBreak(displayHeight + 10);
      
      doc.addImage(imgData, "JPEG", margin, cursorY, contentWidth, displayHeight);
      cursorY += displayHeight + 10;
    } catch (e) {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(strings.errorImg, margin, cursorY);
      cursorY += 10;
    }
  }

  // --- Section 2: Inputs ---
  checkPageBreak(20);
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(strings.sec2, margin, cursorY);
  cursorY += 8;

  // Solution Attempt
  checkPageBreak(15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(strings.attempt, margin, cursorY);
  cursorY += 6;
  doc.setFont("helvetica", "normal");
  
  if (data.solutionAttemptType === 'text') {
      const splitAttempt = doc.splitTextToSize(data.solutionText, contentWidth);
      for (let i = 0; i < splitAttempt.length; i++) {
        checkPageBreak(lineHeight);
        doc.text(splitAttempt[i], margin, cursorY);
        cursorY += lineHeight;
      }
  } else if (data.solutionAttemptType === 'image' && data.solutionImage) {
      try {
        const imgData = await imageToBase64(data.solutionImage);
        const imgProps = doc.getImageProperties(imgData);
        const imgHeight = (imgProps.height * contentWidth) / imgProps.width;
        
        const displayHeight = Math.min(imgHeight, 100); 
        checkPageBreak(displayHeight + 5);
        
        doc.addImage(imgData, "JPEG", margin, cursorY, contentWidth, displayHeight);
        cursorY += displayHeight + 5;
      } catch (e) {
        doc.text(strings.errorImg, margin, cursorY);
        cursorY += lineHeight;
      }
  } else if (data.solutionAttemptType === 'video') {
      const attemptText = data.generatedVideoSummary 
        ? `[Video Summary]: ${data.generatedVideoSummary}`
        : strings.videoSub;
      const splitAttempt = doc.splitTextToSize(attemptText, contentWidth);
      for (let i = 0; i < splitAttempt.length; i++) {
        checkPageBreak(lineHeight);
        doc.text(splitAttempt[i], margin, cursorY);
        cursorY += lineHeight;
      }
  } else if (data.solutionAttemptType === 'audio') {
      const attemptText = strings.audioSub;
      doc.text(attemptText, margin, cursorY);
      cursorY += lineHeight;
  }
  
  cursorY += 4; 

  // Question
  checkPageBreak(15);
  doc.setFont("helvetica", "bold");
  doc.text(strings.question, margin, cursorY);
  cursorY += 6;
  doc.setFont("helvetica", "normal");

  let questionText = "";
  if (data.questionType === 'text') questionText = data.questionText;
  else if (data.questionType === 'audio') questionText = strings.audioQue;

  const splitQuestion = doc.splitTextToSize(questionText, contentWidth);
  for (let i = 0; i < splitQuestion.length; i++) {
    checkPageBreak(lineHeight);
    doc.text(splitQuestion[i], margin, cursorY);
    cursorY += lineHeight;
  }
  cursorY += 10;

  // --- Line Separator ---
  checkPageBreak(10);
  doc.setDrawColor(200);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 10;

  // --- Section 3: Chat Transcript ---
  checkPageBreak(15);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(strings.sec3, margin, cursorY);
  cursorY += 10;

  const plotlyRegex = /```json-plotly([\s\S]*?)```/g;

  for (const msg of chatHistory) {
    if (msg.isThinking) continue; 

    checkPageBreak(10);

    const isUser = msg.role === 'user';
    const roleTitle = isUser ? strings.student : strings.tutor;
    
    // Role Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(isUser ? 0 : 2, isUser ? 0 : 132, isUser ? 150 : 199); 
    doc.text(roleTitle, margin, cursorY);
    cursorY += 5;

    // Reset Font for Body
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(20);

    // Parse Text
    const parts = [];
    let lastIndex = 0;
    let match;

    plotlyRegex.lastIndex = 0;

    while ((match = plotlyRegex.exec(msg.text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: msg.text.substring(lastIndex, match.index) });
      }
      parts.push({ type: 'chart', content: match[1] });
      lastIndex = plotlyRegex.lastIndex;
    }
    if (lastIndex < msg.text.length) {
      parts.push({ type: 'text', content: msg.text.substring(lastIndex) });
    }

    // Process parts
    for (const part of parts) {
      if (part.type === 'text') {
        const cleanedContent = cleanText(part.content);
        // Split by newlines to respect paragraphs roughly
        const paragraphs = cleanedContent.split('\n');

        for (const para of paragraphs) {
            if (!para.trim()) {
                // Empty line, add small spacing
                cursorY += 2;
                continue;
            }
            const splitBody = doc.splitTextToSize(para, contentWidth);
            for (let i = 0; i < splitBody.length; i++) {
                if (cursorY + lineHeight > pageHeight - bottomMargin) {
                    doc.addPage();
                    cursorY = 20;
                    // Re-apply font styles after new page
                    doc.setFont("helvetica", "normal");
                    doc.setFontSize(10);
                    doc.setTextColor(20);
                }
                doc.text(splitBody[i], margin, cursorY);
                cursorY += lineHeight;
            }
        }

      } else if (part.type === 'chart') {
        const chartImage = await generatePlotlyImage(part.content);
        if (chartImage) {
          const chartHeight = 80; 
          checkPageBreak(chartHeight + 5);
          try {
            doc.addImage(chartImage, "PNG", margin, cursorY, contentWidth, chartHeight);
            cursorY += chartHeight + 5;
          } catch (err) {
            doc.text(strings.chartErr, margin, cursorY);
            cursorY += lineHeight;
          }
        } else {
           doc.text(strings.chartErr, margin, cursorY);
           cursorY += lineHeight;
        }
      }
    }
    
    cursorY += 8; // Spacing between messages
  }

  // --- Footer ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${strings.page} ${i} ${strings.of} ${pageCount}`, pageWidth - 30, pageHeight - 10);
  }

  doc.save(`PrismAI_Learn_Session_${language}.pdf`);
};