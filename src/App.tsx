import React, { useState, useRef, useEffect } from 'react';
import { AppStage, ChatMessage, FormData as AppFormData, LanguageCode, StoredSession, ProblemCategory } from './types';
import * as GeminiService from './services/geminiService';
import * as StorageService from './services/storageService';
import * as PdfService from './services/pdfService';
import AudioRecorder from './components/AudioRecorder';
import Logo from './components/Logo';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// --- Translations ---
const TRANSLATIONS: Record<LanguageCode, any> = {
  es: {
    title: "¿Cómo puedo ayudarte hoy?",
    subtitle: "Sube tu problema, intento y pregunta para un análisis profundo.",
    step1: "1. Imagen del Problema (Diagrama/Ecuación)",
    step2: "2. Intento de Solución",
    step3: "3. Tu Pregunta",
    clickUpload: "Click para subir",
    dragDrop: "o arrastra y suelta",
    textBtn: "Texto",
    videoBtn: "Video",
    audioBtn: "Audio",
    solutionPlaceholder: "Describe qué intentaste...",
    questionPlaceholder: "¿Dónde te atascaste?",
    startBtn: "Iniciar Diagnóstico",
    thinking: "Pensando...",
    analyzing: "Analizando tus datos vía razonamiento multimodal Gemini 3...",
    errorGeneric: "Error analizando datos. Por favor intenta de nuevo.",
    connectionError: "Error de conexión.",
    satisfactionQ: "¿Fue útil esta solución?",
    yesBtn: "Sí, entiendo ahora",
    noBtn: "No, tengo más preguntas",
    saving: "Clasificando y guardando sesión...",
    resolvedLink: "Marcar conversación como resuelta",
    sessionSaved: "**Sesión Guardada.**",
    startNewBtn: "Iniciar Nuevo Diagnóstico",
    typeQuestion: "Escribe tu pregunta de seguimiento...",
    videoSummaryPrompt: "Describe las acciones, componentes o escritura mostrados en este video en 3 oraciones.",
    alertImage: "Por favor sube una imagen del problema.",
    alertSolution: "Por favor describe tu intento de solución.",
    alertVideo: "Por favor sube un video de tu intento.",
    alertAudioSol: "Por favor graba tu explicación de la solución.",
    alertQuestion: "Por favor haz una pregunta.",
    alertAudioQue: "Por favor graba tu pregunta.",
    recordBtn: "Grabar",
    stopBtn: "Detener",
    clearBtn: "Borrar",
    audioRecorded: "Audio Grabado",
    historyBtn: "Galería de soluciones",
    historyTitle: "Galería de soluciones",
    noSessions: "No hay soluciones guardadas aún.",
    backToHistory: "Volver a la Galería",
    viewDetails: "Ver Detalle",
    dateLabel: "Fecha:",
    filterLang: "Filtrar por idioma:",
    filterCat: "Categoría:",
    allLangs: "Todos los idiomas",
    allCats: "Todas las categorías",
    catAlgebra: "Álgebra",
    catArithmetic: "Aritmética",
    catGeometry: "Geometría",
    catCalculus: "Cálculo",
    catOthers: "Otros",
    loadMore: "Cargar más soluciones",
    loading: "Cargando...",
    downloadPdf: "Descargar Reporte PDF"
  },
  en: {
    title: "How can I help you today?",
    subtitle: "Upload your problem, attempt, and question for deep reasoning analysis.",
    step1: "1. Problem Image (Diagram/Equation)",
    step2: "2. Solution Attempt",
    step3: "3. Your Question",
    clickUpload: "Click to upload",
    dragDrop: "or drag and drop",
    textBtn: "Text",
    videoBtn: "Video",
    audioBtn: "Audio",
    solutionPlaceholder: "Describe what you tried...",
    questionPlaceholder: "Where are you stuck?",
    startBtn: "Start Diagnosis",
    thinking: "Thinking...",
    analyzing: "Analyzing your inputs via Gemini 3 Multimodal reasoning...",
    errorGeneric: "Error analyzing data. Please try again.",
    connectionError: "Connection error.",
    satisfactionQ: "Was this solution helpful?",
    yesBtn: "Yes, I understand now",
    noBtn: "No, I have more questions",
    saving: "Classifying and saving session...",
    resolvedLink: "Mark conversation as resolved",
    sessionSaved: "**Session Saved.**",
    startNewBtn: "Start New Diagnosis",
    typeQuestion: "Type your follow-up question...",
    videoSummaryPrompt: "Describe the actions, components, or writing shown in this video in 3 sentences.",
    alertImage: "Please upload an image of the problem.",
    alertSolution: "Please describe your solution attempt.",
    alertVideo: "Please upload a video of your attempt.",
    alertAudioSol: "Please record your solution explanation.",
    alertQuestion: "Please ask a question.",
    alertAudioQue: "Please record your question.",
    recordBtn: "Record",
    stopBtn: "Stop Recording",
    clearBtn: "Clear",
    audioRecorded: "Audio Recorded",
    historyBtn: "Solution Gallery",
    historyTitle: "Solution Gallery",
    noSessions: "No saved sessions yet.",
    backToHistory: "Back to Gallery",
    viewDetails: "View Details",
    dateLabel: "Date:",
    filterLang: "Filter by language:",
    filterCat: "Category:",
    allLangs: "All Languages",
    allCats: "All Categories",
    catAlgebra: "Algebra",
    catArithmetic: "Arithmetic",
    catGeometry: "Geometry",
    catCalculus: "Calculus",
    catOthers: "Others",
    loadMore: "Load more solutions",
    loading: "Loading...",
    downloadPdf: "Download PDF Report"
  },
  pt: {
    title: "Como posso ajudar você hoje?",
    subtitle: "Envie seu problema, tentativa e pergunta para análise profunda.",
    step1: "1. Imagem do Problema",
    step2: "2. Tentativa de Solução",
    step3: "3. Sua Pergunta",
    clickUpload: "Clique para enviar",
    dragDrop: "ou arraste e solte",
    textBtn: "Texto",
    videoBtn: "Vídeo",
    audioBtn: "Áudio",
    solutionPlaceholder: "Descreva o que você tentou...",
    questionPlaceholder: "Onde você travou?",
    startBtn: "Iniciar Diagnóstico",
    thinking: "Pensando...",
    analyzing: "Analisando seus dados via raciocínio multimodal Gemini 3...",
    errorGeneric: "Erro ao analisar dados. Tente novamente.",
    connectionError: "Erro de conexão.",
    satisfactionQ: "Esta solução foi útil?",
    yesBtn: "Sim, entendi agora",
    noBtn: "Não, tenho mais dúvidas",
    saving: "Classificando e salvando sessão...",
    resolvedLink: "Marcar conversa como resolvida",
    sessionSaved: "**Sessão Salva.**",
    startNewBtn: "Iniciar Novo Diagnóstico",
    typeQuestion: "Digite sua pergunta de acompanhamento...",
    videoSummaryPrompt: "Descreva as ações, componentes ou escrita mostrados neste vídeo em 3 frases.",
    alertImage: "Por favor, envie uma imagem do problema.",
    alertSolution: "Por favor, descreva sua tentativa de solução.",
    alertVideo: "Por favor, envie um vídeo da sua tentativa.",
    alertAudioSol: "Por favor, grave sua explicação da solução.",
    alertQuestion: "Por favor, faça uma pergunta.",
    alertAudioQue: "Por favor, grave sua pergunta.",
    recordBtn: "Gravar",
    stopBtn: "Parar",
    clearBtn: "Limpar",
    audioRecorded: "Áudio Gravado",
    historyBtn: "Galeria de Soluções",
    historyTitle: "Galeria de Soluções",
    noSessions: "Nenhuma sessão salva ainda.",
    backToHistory: "Voltar à Galeria",
    viewDetails: "Ver Detalhes",
    dateLabel: "Data:",
    filterLang: "Filtrar por idioma:",
    filterCat: "Categoria:",
    allLangs: "Todos os idiomas",
    allCats: "Todas as categorias",
    catAlgebra: "Álgebra",
    catArithmetic: "Aritmética",
    catGeometry: "Geometria",
    catCalculus: "Cálculo",
    catOthers: "Outros",
    loadMore: "Carregar mais soluções",
    loading: "Carregando...",
    downloadPdf: "Baixar Relatório PDF"
  },
  fr: {
    title: "Comment puis-je vous aider aujourd'hui ?",
    subtitle: "Téléchargez votre problème, tentative et question pour analyse.",
    step1: "1. Image du Problème",
    step2: "2. Tentative de Solution",
    step3: "3. Votre Question",
    clickUpload: "Cliquer pour télécharger",
    dragDrop: "ou glisser-déposer",
    textBtn: "Texte",
    videoBtn: "Vidéo",
    audioBtn: "Audio",
    solutionPlaceholder: "Décrivez ce que vous avez essayé...",
    questionPlaceholder: "Où êtes-vous bloqué ?",
    startBtn: "Démarrer le Diagnostic",
    thinking: "Réflexion...",
    analyzing: "Analyse des données via Gemini 3...",
    errorGeneric: "Erreur d'analyse. Veuillez réessayer.",
    connectionError: "Erreur de connexion.",
    satisfactionQ: "Cette solution a-t-elle été utile ?",
    yesBtn: "Oui, je comprends maintenant",
    noBtn: "Non, j'ai d'autres questions",
    saving: "Classification et sauvegarde...",
    resolvedLink: "Marquer la conversation comme résolue",
    sessionSaved: "**Session Enregistrée.**",
    startNewBtn: "Démarrer un Nouveau Diagnostic",
    typeQuestion: "Posez votre question de suivi...",
    videoSummaryPrompt: "Décrivez les actions dans cette vidéo en 3 phrases.",
    alertImage: "Veuillez télécharger une image du problème.",
    alertSolution: "Veuillez décrire votre tentative.",
    alertVideo: "Veuillez télécharger une vidéo.",
    alertAudioSol: "Veuillez enregistrer votre explication.",
    alertQuestion: "Veuillez poser une question.",
    alertAudioQue: "Veuillez enregistrer votre question.",
    recordBtn: "Enregistrer",
    stopBtn: "Arrêter",
    clearBtn: "Effacer",
    audioRecorded: "Audio Enregistré",
    historyBtn: "Galerie de Solutions",
    historyTitle: "Galerie de Solutions",
    noSessions: "Aucune session enregistrée.",
    backToHistory: "Retour à la Galerie",
    viewDetails: "Voir les détails",
    dateLabel: "Date :",
    filterLang: "Filtrer par langue:",
    filterCat: "Catégorie:",
    allLangs: "Toutes les langues",
    allCats: "Toutes les catégories",
    catAlgebra: "Algèbre",
    catArithmetic: "Arithmétique",
    catGeometry: "Géométrie",
    catCalculus: "Calcul",
    catOthers: "Autres",
    loadMore: "Charger plus de solutions",
    loading: "Chargement...",
    downloadPdf: "Télécharger le rapport PDF"
  },
  de: {
    title: "Wie kann ich Ihnen heute helfen?",
    subtitle: "Laden Sie Problem, Versuch und Frage zur Analyse hoch.",
    step1: "1. Problembild",
    step2: "2. Lösungsversuch",
    step3: "3. Ihre Frage",
    clickUpload: "Klicken zum Hochladen",
    dragDrop: "oder ziehen und ablegen",
    textBtn: "Text",
    videoBtn: "Video",
    audioBtn: "Audio",
    solutionPlaceholder: "Beschreiben Sie Ihren Versuch...",
    questionPlaceholder: "Wo hängen Sie fest?",
    startBtn: "Diagnose Starten",
    thinking: "Nachdenken...",
    analyzing: "Daten werden analysiert...",
    errorGeneric: "Fehler bei der Analyse.",
    connectionError: "Verbindungsfehler.",
    satisfactionQ: "War diese Lösung hilfreich?",
    yesBtn: "Ja, ich verstehe jetzt",
    noBtn: "Nein, ich habe noch Fragen",
    saving: "Klassifizierung und Speicherung...",
    resolvedLink: "Unterhaltung als gelöst markieren",
    sessionSaved: "**Sitzung gespeichert.**",
    startNewBtn: "Neue Diagnose starten",
    typeQuestion: "Geben Sie Ihre Folgefrage ein...",
    videoSummaryPrompt: "Beschreiben Sie die Aktionen im Video in 3 Sätzen.",
    alertImage: "Bitte laden Sie ein Bild hoch.",
    alertSolution: "Bitte beschreiben Sie Ihren Versuch.",
    alertVideo: "Bitte laden Sie ein Video hoch.",
    alertAudioSol: "Bitte nehmen Sie Ihre Erklärung auf.",
    alertQuestion: "Bitte stellen Sie eine Frage.",
    alertAudioQue: "Bitte nehmen Sie Ihre Frage auf.",
    recordBtn: "Aufnehmen",
    stopBtn: "Stoppen",
    clearBtn: "Löschen",
    audioRecorded: "Audio aufgenommen",
    historyBtn: "Lösungsgalerie",
    historyTitle: "Lösungsgalerie",
    noSessions: "Noch keine Sitzungen gespeichert.",
    backToHistory: "Zurück zur Galerie",
    viewDetails: "Details anzeigen",
    dateLabel: "Datum:",
    filterLang: "Nach Sprache filtern:",
    filterCat: "Kategorie:",
    allLangs: "Alle Sprachen",
    allCats: "Alle Kategorien",
    catAlgebra: "Algebra",
    catArithmetic: "Arithmetik",
    catGeometry: "Geometrie",
    catCalculus: "Analysis",
    catOthers: "Andere",
    loadMore: "Weitere Lösungen laden",
    loading: "Laden...",
    downloadPdf: "PDF-Bericht herunterladen"
  },
  zh: {
    title: "今天我能为您提供什么帮助？",
    subtitle: "上传您的问题、尝试和疑问以进行深度分析。",
    step1: "1. 问题图片 (图表/公式)",
    step2: "2. 尝试的解决方案",
    step3: "3. 您的疑问",
    clickUpload: "点击上传",
    dragDrop: "或拖放文件",
    textBtn: "文本",
    videoBtn: "视频",
    audioBtn: "音频",
    solutionPlaceholder: "描述您尝试过的方法...",
    questionPlaceholder: "您哪里被卡住了？",
    startBtn: "开始诊断",
    thinking: "思考中...",
    analyzing: "正在通过 Gemini 3 分析您的数据...",
    errorGeneric: "数据分析错误，请重试。",
    connectionError: "连接错误。",
    satisfactionQ: "这个解决方案有帮助吗？",
    yesBtn: "是的，我现在明白了",
    noBtn: "不，我还有问题",
    saving: "分类并保存会话...",
    resolvedLink: "标记对话为已解决",
    sessionSaved: "**会话已保存。**",
    startNewBtn: "开始新诊断",
    typeQuestion: "输入您的后续问题...",
    videoSummaryPrompt: "用3句话描述视频中显示的操作或内容。",
    alertImage: "请上传问题图片。",
    alertSolution: "请描述您的尝试。",
    alertVideo: "请上传视频。",
    alertAudioSol: "请录制您的解释。",
    alertQuestion: "请提出问题。",
    alertAudioQue: "请录制您的问题。",
    recordBtn: "录音",
    stopBtn: "停止",
    clearBtn: "清除",
    audioRecorded: "音频已录制",
    historyBtn: "解决方案库",
    historyTitle: "解决方案库",
    noSessions: "暂无保存的会话。",
    backToHistory: "返回库",
    viewDetails: "查看详情",
    dateLabel: "日期:",
    filterLang: "按语言筛选:",
    filterCat: "类别:",
    allLangs: "所有语言",
    allCats: "所有类别",
    catAlgebra: "代数",
    catArithmetic: "算术",
    catGeometry: "几何",
    catCalculus: "微积分",
    catOthers: "其他",
    loadMore: "加载更多解决方案",
    loading: "加载中...",
    downloadPdf: "下载 PDF 报告"
  },
  ja: {
    title: "今日はどのようなお手伝いができますか？",
    subtitle: "問題、試行、質問をアップロードして分析します。",
    step1: "1. 問題の画像",
    step2: "2. 解決の試み",
    step3: "3. あなたの質問",
    clickUpload: "クリックしてアップロード",
    dragDrop: "またはドラッグ＆ドロップ",
    textBtn: "テキスト",
    videoBtn: "ビデオ",
    audioBtn: "音声",
    solutionPlaceholder: "試したことを説明してください...",
    questionPlaceholder: "どこでつまづいていますか？",
    startBtn: "診断を開始",
    thinking: "考え中...",
    analyzing: "Gemini 3 でデータを分析中...",
    errorGeneric: "分析エラー。再試行してください。",
    connectionError: "接続エラー。",
    satisfactionQ: "この解決策は役に立ちましたか？",
    yesBtn: "はい、理解しました",
    noBtn: "いいえ、まだ質問があります",
    saving: "分類してセッションを保存中...",
    resolvedLink: "会話を解決済みにする",
    sessionSaved: "**セッションが保存されました。**",
    startNewBtn: "新しい診断を開始",
    typeQuestion: "次の質問を入力...",
    videoSummaryPrompt: "ビデオの内容を3文で説明してください。",
    alertImage: "画像をアップロードしてください。",
    alertSolution: "試行内容を説明してください。",
    alertVideo: "ビデオをアップロードしてください。",
    alertAudioSol: "説明を録音してください。",
    alertQuestion: "質問をしてください。",
    alertAudioQue: "質問を録音してください。",
    recordBtn: "録音",
    stopBtn: "停止",
    clearBtn: "クリア",
    audioRecorded: "録音完了",
    historyBtn: "解決策ギャラリー",
    historyTitle: "解決策ギャラリー",
    noSessions: "保存されたセッションはありません。",
    backToHistory: "ギャラリーに戻る",
    viewDetails: "詳細を見る",
    dateLabel: "日付:",
    filterLang: "言語でフィルタリング:",
    filterCat: "カテゴリ:",
    allLangs: "すべての言語",
    allCats: "すべてのカテゴリ",
    catAlgebra: "代数",
    catArithmetic: "算術",
    catGeometry: "幾何学",
    catCalculus: "微積分",
    catOthers: "その他",
    loadMore: "さらに読み込む",
    loading: "読み込み中...",
    downloadPdf: "PDFレポートをダウンロード"
  },
  ru: {
    title: "Чем я могу помочь вам сегодня?",
    subtitle: "Загрузите проблему, попытку решения и вопрос.",
    step1: "1. Изображение проблемы",
    step2: "2. Попытка решения",
    step3: "3. Ваш вопрос",
    clickUpload: "Нажмите для загрузки",
    dragDrop: "или перетащите",
    textBtn: "Текст",
    videoBtn: "Видео",
    audioBtn: "Аудио",
    solutionPlaceholder: "Опишите, что вы пробовали...",
    questionPlaceholder: "Где вы застряли?",
    startBtn: "Начать диагностику",
    thinking: "Думаю...",
    analyzing: "Анализ данных через Gemini 3...",
    errorGeneric: "Ошибка анализа. Повторите попытку.",
    connectionError: "Ошибка соединения.",
    satisfactionQ: "Это решение помогло?",
    yesBtn: "Да, теперь понятно",
    noBtn: "Нет, есть вопросы",
    saving: "Классификация и сохранение...",
    resolvedLink: "Отметить как решенное",
    sessionSaved: "**Сессия сохранена.**",
    startNewBtn: "Начать новую диагностику",
    typeQuestion: "Введите следующий вопрос...",
    videoSummaryPrompt: "Опишите действия на видео в 3 предложениях.",
    alertImage: "Загрузите изображение.",
    alertSolution: "Опишите вашу попытку.",
    alertVideo: "Загрузите видео.",
    alertAudioSol: "Запишите объяснение.",
    alertQuestion: "Задайте вопрос.",
    alertAudioQue: "Запишите вопрос.",
    recordBtn: "Запись",
    stopBtn: "Стоп",
    clearBtn: "Очистить",
    audioRecorded: "Записано",
    historyBtn: "Галерея решений",
    historyTitle: "Галерея решений",
    noSessions: "Сессий пока нет.",
    backToHistory: "Назад в галерею",
    viewDetails: "Подробнее",
    dateLabel: "Дата:",
    filterLang: "Фильтр по языку:",
    filterCat: "Категория:",
    allLangs: "Все языки",
    allCats: "Все категории",
    catAlgebra: "Алгебра",
    catArithmetic: "Арифметика",
    catGeometry: "Геометрия",
    catCalculus: "Мат. анализ",
    catOthers: "Другое",
    loadMore: "Загрузить больше",
    loading: "Загрузка...",
    downloadPdf: "Скачать PDF отчет"
  },
  ar: {
    title: "كيف يمكنني مساعدتك اليوم؟",
    subtitle: "قم بتحميل مشكلتك، ومحاولتك، وسؤالك للتحليل.",
    step1: "1. صورة المشكلة",
    step2: "2. محاولة الحل",
    step3: "3. سؤالك",
    clickUpload: "اضغط للتحميل",
    dragDrop: "أو اسحب وأفلت",
    textBtn: "نص",
    videoBtn: "فيديو",
    audioBtn: "صوت",
    solutionPlaceholder: "اشرح ماذا حاولت...",
    questionPlaceholder: "أين توقفت؟",
    startBtn: "بدء التشخيص",
    thinking: "جاري التفكير...",
    analyzing: "جاري تحليل بياناتك...",
    errorGeneric: "خطأ في التحليل. حاول مرة أخرى.",
    connectionError: "خطأ في الاتصال.",
    satisfactionQ: "هل كان هذا الحل مفيداً؟",
    yesBtn: "نعم، فهمت الآن",
    noBtn: "لا، لدي أسئلة أخرى",
    saving: "تصنيف وحفظ الجلسة...",
    resolvedLink: "تحديد المحادثة كمحلولة",
    sessionSaved: "**تم حفظ الجلسة.**",
    startNewBtn: "بدء تشخيص جديد",
    typeQuestion: "اكتب سؤال المتابعة...",
    videoSummaryPrompt: "صف الإجراءات في الفيديو في 3 جمل.",
    alertImage: "يرجى تحميل صورة المشكلة.",
    alertSolution: "يرجى وصف محاولتك.",
    alertVideo: "يرجى تحميل فيديو.",
    alertAudioSol: "يرجى تسجيل شرحك.",
    alertQuestion: "يرجى طرح سؤال.",
    alertAudioQue: "يرجى تسجيل سؤالك.",
    recordBtn: "تسجيل",
    stopBtn: "توقف",
    clearBtn: "مسح",
    audioRecorded: "تم التسجيل",
    historyBtn: "معرض الحلول",
    historyTitle: "معرض الحلول",
    noSessions: "لا توجد جلسات محفوظة.",
    backToHistory: "العودة إلى المعرض",
    viewDetails: "عرض التفاصيل",
    dateLabel: "التاريخ:",
    filterLang: "تصفية حسب اللغة:",
    filterCat: "الفئة:",
    allLangs: "جميع اللغات",
    allCats: "جميع الفئات",
    catAlgebra: "الجبر",
    catArithmetic: "الحساب",
    catGeometry: "الهندسة",
    catCalculus: "التفاضل والتكامل",
    catOthers: "أخرى",
    loadMore: "تحميل المزيد",
    loading: "جاري التحميل...",
    downloadPdf: "تحميل تقرير PDF"
  },
  hi: {
    title: "आज मैं आपकी क्या मदद कर सकता हूँ?",
    subtitle: "विश्लेषण के लिए अपनी समस्या, प्रयास और प्रश्न अपलोड करें।",
    step1: "1. समस्या की छवि",
    step2: "2. समाधान का प्रयास",
    step3: "3. आपका प्रश्न",
    clickUpload: "अपलोड करने के लिए क्लिक करें",
    dragDrop: "या ड्रैग एंड ड्रॉप करें",
    textBtn: "टेक्स्ट",
    videoBtn: "वीडियो",
    audioBtn: "ऑडियो",
    solutionPlaceholder: "बताएं कि आपने क्या कोशिश की...",
    questionPlaceholder: "आप कहाँ अटके हैं?",
    startBtn: "निदान शुरू करें",
    thinking: "सोच रहा हूँ...",
    analyzing: "जेमिनी 3 के माध्यम से विश्लेषण किया जा रहा है...",
    errorGeneric: "विश्लेषण त्रुटि। पुनः प्रयास करें।",
    connectionError: "कनेक्शन त्रुटि।",
    satisfactionQ: "क्या यह समाधान मददगार था?",
    yesBtn: "हाँ, अब मुझे समझ आ गया",
    noBtn: "नहीं, मेरे पास और प्रश्न हैं",
    saving: "वर्गीकृत और सहेजा जा रहा है...",
    resolvedLink: "बातचीत को हल किया गया चिह्नित करें",
    sessionSaved: "**सत्र सहेजा गया।**",
    startNewBtn: "नया निदान शुरू करें",
    typeQuestion: "अपना अगला प्रश्न टाइप करें...",
    videoSummaryPrompt: "वीडियो में दिखाई गई क्रियाओं को 3 वाक्यों में वर्णित करें।",
    alertImage: "कृपया समस्या की छवि अपलोड करें।",
    alertSolution: "कृपया अपने प्रयास का वर्णन करें।",
    alertVideo: "कृपया प्रयास का वीडियो अपलोड करें।",
    alertAudioSol: "कृपया अपना स्पष्टीकरण रिकॉर्ड करें।",
    alertQuestion: "कृपया एक प्रश्न पूछें।",
    alertAudioQue: "कृपया अपना प्रश्न रिकॉर्ड करें।",
    recordBtn: "रिकॉर्ड",
    stopBtn: "रोकें",
    clearBtn: "साफ़ करें",
    audioRecorded: "ऑडियो रिकॉर्ड किया गया",
    historyBtn: "समाधान गैलरी",
    historyTitle: "समाधान गैलरी",
    noSessions: "अभी तक कोई सत्र नहीं।",
    backToHistory: "गैलरी पर वापस जाएं",
    viewDetails: "विवरण देखें",
    dateLabel: "तारीख:",
    filterLang: "भाषा के अनुसार फ़िल्टर करें:",
    filterCat: "श्रेणी:",
    allLangs: "सभी भाषाएँ",
    allCats: "सभी श्रेणियाँ",
    catAlgebra: "बीजगणित",
    catArithmetic: "अंकगणित",
    catGeometry: "ज्यामिति",
    catCalculus: "कलन",
    catOthers: "अन्य",
    loadMore: "और समाधान लोड करें",
    loading: "लोड हो रहा है...",
    downloadPdf: "पीडीएफ रिपोर्ट डाउनलोड करें"
  }
};

const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'zh', label: '中文 (Chinese)' },
  { code: 'ja', label: '日本語 (Japanese)' },
  { code: 'ru', label: 'Русский (Russian)' },
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
];

const CATEGORIES: { code: ProblemCategory; labelKey: string }[] = [
    { code: 'ALGEBRA', labelKey: 'catAlgebra' },
    { code: 'ARITHMETIC', labelKey: 'catArithmetic' },
    { code: 'GEOMETRY', labelKey: 'catGeometry' },
    { code: 'CALCULUS', labelKey: 'catCalculus' },
    { code: 'OTHERS', labelKey: 'catOthers' }
];

// Simple wrapper for Plotly since we are using CDN
const PlotlyChart = ({ chartData, darkMode }: { chartData: string, darkMode: boolean }) => {
  const plotRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plotRef.current) return;
    try {
      // @ts-ignore
      if (!window.Plotly) {
        setError("Plotly library not loaded");
        return;
      }

      const parsed = JSON.parse(chartData);
      const { data, layout } = parsed;

      const themeColor = darkMode ? '#e5e7eb' : '#1f2937';
      const gridColor = darkMode ? '#374151' : '#e5e7eb';
      const bgColor = darkMode ? '#1f2937' : '#ffffff'; // Match container bg

      const finalLayout = {
        ...layout,
        autosize: true,
        height: 320, // Explicit height for Plotly layout calculation
        margin: { l: 40, r: 20, t: 40, b: 40 },
        paper_bgcolor: bgColor, // Set explicit background to cover any underlying PRE tag styling
        plot_bgcolor: bgColor,
        font: { color: themeColor },
        xaxis: { 
          ...layout?.xaxis, 
          gridcolor: gridColor, 
          zerolinecolor: gridColor,
          color: themeColor
        },
        yaxis: { 
          ...layout?.yaxis, 
          gridcolor: gridColor, 
          zerolinecolor: gridColor,
          color: themeColor
        }
      };

      // Enable the modebar so users can reset zoom/pan
      const config = { 
        responsive: true, 
        displayModeBar: true, 
        displaylogo: false,
        modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'lasso2d', 'select2d']
      };

      // @ts-ignore
      window.Plotly.newPlot(plotRef.current, data, finalLayout, config);

    } catch (e) {
      console.error("Plotly Error", e);
      setError("Failed to render chart.");
    }
  }, [chartData, darkMode]);

  if (error) return <div className="p-4 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>;

  return (
    <div 
      ref={plotRef} 
      className="w-full h-80 min-h-[320px] my-6 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-normal overflow-hidden relative z-10" 
    />
  );
};

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>('es');
  const [stage, setStage] = useState<AppStage>(AppStage.INPUT);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [chatImage, setChatImage] = useState<File | null>(null);
  
  // Navigation State
  const [viewMode, setViewMode] = useState<'app' | 'history'>('app');
  const [historySessions, setHistorySessions] = useState<StoredSession[]>([]);
  const [selectedHistorySession, setSelectedHistorySession] = useState<StoredSession | null>(null);
  
  // Pagination & Filtering State
  const [historyFilter, setHistoryFilter] = useState<LanguageCode | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<ProblemCategory | 'ALL'>('ALL');
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to get text
  const t = (key: string) => TRANSLATIONS[language][key] || key;

  // Form State
  const [formData, setFormData] = useState<AppFormData>({
    problemImage: null,
    solutionAttemptType: 'text',
    solutionText: '',
    solutionVideo: null,
    solutionAudioBlob: null,
    questionType: 'text',
    questionText: '',
    questionAudioBlob: null
  });

  // Toggle Theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Scroll logic
  useEffect(() => {
    const lastMessage = chatHistory[chatHistory.length - 1];
    if (lastMessage?.role === 'user' || lastMessage?.isThinking) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [chatHistory, stage, viewMode]);

  // Fetch History Logic
  const fetchHistory = async (isReset: boolean = false) => {
    if (isLoadingHistory) return;
    setIsLoadingHistory(true);

    try {
        const startAfterDoc = isReset ? null : lastDoc;
        const result = await StorageService.getStoredSessions(startAfterDoc, historyFilter, categoryFilter);
        
        if (isReset) {
            setHistorySessions(result.sessions);
        } else {
            setHistorySessions(prev => [...prev, ...result.sessions]);
        }
        
        setLastDoc(result.lastDoc);
        setHasMore(result.sessions.length === 20); // If we got 20, assume there might be more.
    } catch (e) {
        console.error("Failed to load history", e);
    } finally {
        setIsLoadingHistory(false);
    }
  };

  // Trigger Fetch on View/Filter Change
  useEffect(() => {
    if (viewMode === 'history') {
        fetchHistory(true);
    }
  }, [viewMode, historyFilter, categoryFilter]);

  const resetApp = () => {
    setFormData({
      problemImage: null,
      solutionAttemptType: 'text',
      solutionText: '',
      solutionVideo: null,
      solutionAudioBlob: null,
      questionType: 'text',
      questionText: '',
      questionAudioBlob: null
    });
    setChatHistory([]);
    setStage(AppStage.INPUT);
    setViewMode('app');
    setSelectedHistorySession(null);
    setChatImage(null);
  };

  const handleInputChange = (field: keyof AppFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateInput = (): boolean => {
    if (!formData.problemImage) {
      alert(t('alertImage'));
      return false;
    }
    
    // Solution Attempt Validation
    if (formData.solutionAttemptType === 'text' && !formData.solutionText.trim()) {
      alert(t('alertSolution'));
      return false;
    }
    if (formData.solutionAttemptType === 'video' && !formData.solutionVideo) {
      alert(t('alertVideo'));
      return false;
    }
    if (formData.solutionAttemptType === 'audio' && !formData.solutionAudioBlob) {
      alert(t('alertAudioSol'));
      return false;
    }

    // Question Validation
    if (formData.questionType === 'text' && !formData.questionText.trim()) {
      alert(t('alertQuestion'));
      return false;
    }
    if (formData.questionType === 'audio' && !formData.questionAudioBlob) {
      alert(t('alertAudioQue'));
      return false;
    }
    return true;
  };

  const startAnalysis = async () => {
    if (!validateInput()) return;

    setStage(AppStage.ANALYZING);
    setChatHistory([{ id: 'init', role: 'model', text: t('analyzing'), isThinking: true }]);

    try {
      // Pre-process video summarization for PDF if needed
      let videoSummary = '';
      if (formData.solutionAttemptType === 'video' && formData.solutionVideo) {
          // Fire and await video summary generation
          videoSummary = await GeminiService.summarizeMultimedia(
              formData.solutionVideo, 
              formData.solutionVideo.type,
              t('videoSummaryPrompt')
          );
          setFormData(prev => ({ ...prev, generatedVideoSummary: videoSummary }));
      }

      // Determine content for solution attempt
      let solutionContent: string | File | Blob = '';
      if (formData.solutionAttemptType === 'text') solutionContent = formData.solutionText;
      else if (formData.solutionAttemptType === 'video') solutionContent = formData.solutionVideo!;
      else if (formData.solutionAttemptType === 'audio') solutionContent = formData.solutionAudioBlob!;

      const questionContent = formData.questionType === 'text'
        ? formData.questionText
        : formData.questionAudioBlob!;

      const response = await GeminiService.startDiagnosis(
        formData.problemImage!,
        { type: formData.solutionAttemptType, content: solutionContent },
        { type: formData.questionType, content: questionContent }
      );

      setChatHistory(prev => [
        ...prev.filter(m => !m.isThinking), // Remove thinking
        { id: Date.now().toString(), role: 'model', text: response }
      ]);
      setStage(AppStage.INTERACTING);

    } catch (error) {
      console.error(error);
      setChatHistory(prev => [
        ...prev, 
        { id: 'err', role: 'model', text: t('errorGeneric') }
      ]);
      setStage(AppStage.INPUT);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() && !chatImage) return;

    // Create a local URL for the image to display immediately
    const imageUrl = chatImage ? URL.createObjectURL(chatImage) : undefined;

    const newMsg: ChatMessage = { 
        id: Date.now().toString(), 
        role: 'user', 
        text: userInput,
        image: imageUrl
    };
    
    setChatHistory(prev => [...prev, newMsg]);
    setUserInput('');
    setChatImage(null); // Clear image selection
    setChatHistory(prev => [...prev, { id: 'thinking', role: 'model', text: t('thinking'), isThinking: true }]);

    try {
      // Pass the actual File object to the service
      const response = await GeminiService.sendChatMessage(newMsg.text, chatImage || undefined);
      setChatHistory(prev => [
        ...prev.filter(m => !m.isThinking),
        { id: Date.now().toString(), role: 'model', text: response }
      ]);
    } catch (error) {
      setChatHistory(prev => [
        ...prev.filter(m => !m.isThinking),
        { id: 'err', role: 'model', text: t('connectionError') }
      ]);
    }
  };

  const handleSatisfaction = async (satisfied: boolean) => {
    if (satisfied) {
        setStage(AppStage.SAVING);
        try {
            // Classify session first
            console.log("Classifying session...");
            const category = await GeminiService.classifySession(chatHistory);

            // Re-enabled automatic PDF Generation
            await PdfService.generateSessionPDF(formData, chatHistory, language);

            await StorageService.uploadSessionData(
                formData,
                chatHistory,
                language,
                category
            );
            
            setStage(AppStage.COMPLETED);
            setChatHistory(prev => [...prev, {
                id: 'completed',
                role: 'model',
                text: t('sessionSaved')
            }]);

        } catch (e) {
            console.error("Save failed", e);
            alert("Failed to save session, but continuing.");
            setStage(AppStage.COMPLETED);
        }
    } else {
        // Continue interacting
        setStage(AppStage.INTERACTING);
    }
  };

  // --- Render Components ---

  const renderMarkdownMessage = (text: string) => (
    <ReactMarkdown 
        remarkPlugins={[remarkMath]} 
        rehypePlugins={[rehypeKatex]}
        components={{
            pre: (props: any) => {
                const {children, ...rest} = props;
                return <div className="not-prose my-4" {...rest}>{children}</div>
            },
            code(props) {
                const {children, className, node, ...rest} = props;
                const match = /language-([\w-]+)/.exec(className || '');
                const lang = match ? match[1] : '';
                const content = String(children).replace(/\n$/, '');
                
                let isPlotly = lang === 'json-plotly';
                if (!isPlotly && lang === 'json') {
                    if (content.includes('"data"') && content.includes('"layout"')) {
                        isPlotly = true;
                    }
                }

                if (isPlotly) {
                    try {
                        const parsed = JSON.parse(content);
                        if (parsed && (parsed.data || parsed.layout)) {
                            return <PlotlyChart chartData={content} darkMode={darkMode} />;
                        }
                    } catch (e) {}
                }

                return <code className={`block bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-x-auto ${className}`} {...rest}>{children}</code>;
            }
        }}
    >
        {text}
    </ReactMarkdown>
  );

  const renderInputScreen = () => (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">{t('title')}</h2>
        <p className="text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Step 1: Problem Image */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('step1')} <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center justify-center w-full">
            <label className={`flex flex-col items-center justify-center w-full ${formData.problemImage ? 'h-64' : 'h-48'} border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-900 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 transition-all duration-300 relative overflow-hidden`}>
                {formData.problemImage ? (
                    <>
                        <img 
                            src={URL.createObjectURL(formData.problemImage)} 
                            alt="Preview" 
                            className="w-full h-full object-contain p-2 z-10"
                        />
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity z-20">
                             <svg className="w-8 h-8 text-white mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                             <p className="text-white font-medium text-sm">{t('clickUpload')}</p>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                        <p className="text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">{t('clickUpload')}</span> {t('dragDrop')}</p>
                    </div>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleInputChange('problemImage', e.target.files?.[0] || null)} />
            </label>
          </div>
        </div>

        {/* Step 2: Solution Attempt */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t('step2')} <span className="text-red-500">*</span>
            </label>
            <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                <button 
                    onClick={() => handleInputChange('solutionAttemptType', 'text')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${formData.solutionAttemptType === 'text' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
                >{t('textBtn')}</button>
                <button 
                    onClick={() => handleInputChange('solutionAttemptType', 'video')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${formData.solutionAttemptType === 'video' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
                >{t('videoBtn')}</button>
                <button 
                    onClick={() => handleInputChange('solutionAttemptType', 'audio')}
                    className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${formData.solutionAttemptType === 'audio' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
                >{t('audioBtn')}</button>
            </div>
          </div>
          
          {formData.solutionAttemptType === 'text' && (
              <textarea 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                rows={3}
                placeholder={t('solutionPlaceholder')}
                value={formData.solutionText}
                onChange={(e) => handleInputChange('solutionText', e.target.value)}
              />
          )}
          
          {formData.solutionAttemptType === 'video' && (
            <input 
                type="file" 
                accept="video/*" 
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-gray-300"
                onChange={(e) => handleInputChange('solutionVideo', e.target.files?.[0] || null)}
            />
          )}

          {formData.solutionAttemptType === 'audio' && (
            <div className="mt-2">
                <AudioRecorder 
                    onAudioReady={(blob) => handleInputChange('solutionAudioBlob', blob)}
                    onClear={() => handleInputChange('solutionAudioBlob', null)}
                    labels={{
                      record: t('recordBtn'),
                      stop: t('stopBtn'),
                      clear: t('clearBtn'),
                      recorded: t('audioRecorded')
                    }}
                />
            </div>
          )}
        </div>

        {/* Step 3: Question */}
        <div className="p-6">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {t('step3')} <span className="text-red-500">*</span>
                </label>
                <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                    <button 
                        onClick={() => handleInputChange('questionType', 'text')}
                        className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${formData.questionType === 'text' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
                    >{t('textBtn')}</button>
                    <button 
                        onClick={() => handleInputChange('questionType', 'audio')}
                        className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${formData.questionType === 'audio' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500'}`}
                    >{t('audioBtn')}</button>
                </div>
            </div>

            {formData.questionType === 'text' ? (
                <textarea 
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                    rows={2}
                    placeholder={t('questionPlaceholder')}
                    value={formData.questionText}
                    onChange={(e) => handleInputChange('questionText', e.target.value)}
                />
            ) : (
                <AudioRecorder 
                    onAudioReady={(blob) => handleInputChange('questionAudioBlob', blob)}
                    onClear={() => handleInputChange('questionAudioBlob', null)}
                    labels={{
                      record: t('recordBtn'),
                      stop: t('stopBtn'),
                      clear: t('clearBtn'),
                      recorded: t('audioRecorded')
                    }}
                />
            )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
            onClick={startAnalysis}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-lg shadow-lg transform transition hover:-translate-y-0.5"
        >
            {t('startBtn')}
        </button>
      </div>
    </div>
  );

  const renderChatScreen = (messages: ChatMessage[], readOnly: boolean = false) => (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        
        {/* Read Only Header (For History) */}
        {readOnly && selectedHistorySession?.fileUrls.problemImage && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                     <img 
                        src={selectedHistorySession.fileUrls.problemImage} 
                        alt="Problem" 
                        className="w-16 h-16 object-cover rounded-md border border-gray-300 dark:border-gray-600"
                     />
                     <div>
                         <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t('dateLabel')} {selectedHistorySession.createdAt?.toDate ? selectedHistorySession.createdAt.toDate().toLocaleDateString() : 'N/A'}
                         </p>
                         <div className="flex gap-2 mt-1">
                            {selectedHistorySession.language && (
                                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                                    {LANGUAGES.find(l => l.code === selectedHistorySession.language)?.label || selectedHistorySession.language}
                                </span>
                            )}
                            {selectedHistorySession.category && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded text-blue-800 dark:text-blue-200 font-medium">
                                    {t(CATEGORIES.find(c => c.code === selectedHistorySession.category)?.labelKey || '')}
                                </span>
                            )}
                         </div>
                     </div>
                 </div>
                 <div className="flex items-center gap-4">
                     <button 
                        onClick={() => setSelectedHistorySession(null)}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                     >
                        {t('backToHistory')}
                     </button>
                 </div>
            </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50 dark:bg-gray-900">
            {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-5 shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-white dark:bg-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 rounded-bl-none'
                    }`}>
                        {/* Display User Image if present */}
                        {msg.image && (
                            <div className="mb-3">
                                <img src={msg.image} alt="User attachment" className="rounded-lg max-h-60 object-contain bg-black/20" />
                            </div>
                        )}
                        
                        {msg.isThinking ? (
                            <div className="flex items-center gap-2 text-sm opacity-75">
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                {t('thinking')}
                            </div>
                        ) : (
                            <div className="prose prose-lg dark:prose-invert max-w-none prose-p:my-2 prose-headings:mb-3 prose-headings:mt-4 prose-ul:my-2 prose-li:my-0">
                                {renderMarkdownMessage(msg.text)}
                            </div>
                        )}
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>

        {/* Interaction Controls (Only if NOT readOnly) */}
        {!readOnly && (
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                {stage === AppStage.SATISFACTION_CHECK && (
                    <div className="flex flex-col items-center gap-3 p-4 bg-blue-50 dark:bg-gray-900/50 rounded-lg border border-blue-100 dark:border-blue-900/30 mb-2">
                        <p className="font-semibold text-gray-700 dark:text-gray-200">{t('satisfactionQ')}</p>
                        <div className="flex gap-4">
                            <button onClick={() => handleSatisfaction(true)} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors">
                                {t('yesBtn')}
                            </button>
                            <button onClick={() => handleSatisfaction(false)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md font-medium transition-colors">
                                {t('noBtn')}
                            </button>
                        </div>
                    </div>
                )}

                {stage === AppStage.SAVING && (
                    <div className="text-center p-4 text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                        {t('saving')}
                    </div>
                )}

                {stage === AppStage.INTERACTING && (
                    <div className="flex flex-col gap-2">
                        {/* Image Preview */}
                        {chatImage && (
                            <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg w-fit">
                                <img src={URL.createObjectURL(chatImage)} alt="Preview" className="h-12 w-12 object-cover rounded" />
                                <span className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-[150px]">{chatImage.name}</span>
                                <button 
                                    onClick={() => setChatImage(null)}
                                    className="ml-2 text-gray-500 hover:text-red-500"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            {/* File Upload Button */}
                            <label className="p-3 text-gray-500 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                            setChatImage(e.target.files[0]);
                                        }
                                    }}
                                />
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                            </label>

                            <input 
                                type="text" 
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={t('typeQuestion')}
                                className="flex-1 p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!userInput.trim() && !chatImage}
                                className={`p-3 rounded-lg transition-colors ${
                                    !userInput.trim() && !chatImage 
                                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                            </button>
                        </div>
                    </div>
                )}

                {stage === AppStage.COMPLETED && (
                    <div className="flex justify-center p-4">
                        <button onClick={resetApp} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-colors">
                            {t('startNewBtn')}
                        </button>
                    </div>
                )}
                
                {stage === AppStage.INTERACTING && chatHistory.length > 2 && (
                    <div className="flex justify-center mt-2">
                        <button onClick={() => setStage(AppStage.SATISFACTION_CHECK)} className="text-xs text-gray-400 hover:text-blue-500 underline">
                            {t('resolvedLink')}
                        </button>
                    </div>
                )}
            </div>
        )}
    </div>
  );

  const renderHistoryScreen = () => (
    <div className="max-w-6xl mx-auto animate-fade-in">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                {t('historyTitle')}
            </h2>
            
            <div className="flex gap-3">
                <select 
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value as LanguageCode | 'ALL')}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="ALL">{t('allLangs')}</option>
                    {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>

                <select 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as ProblemCategory | 'ALL')}
                    className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="ALL">{t('allCats')}</option>
                    {CATEGORIES.map(c => <option key={c.code} value={c.code}>{t(c.labelKey)}</option>)}
                </select>
            </div>
        </div>

        {selectedHistorySession ? (
             renderChatScreen(selectedHistorySession.historical, true)
        ) : (
            <>
                {historySessions.length === 0 && !isLoadingHistory ? (
                    <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{t('noSessions')}</h3>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {historySessions.map(session => (
                            <div 
                                key={session.id} 
                                onClick={() => setSelectedHistorySession(session)}
                                className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer transition-all duration-200 transform hover:-translate-y-1"
                            >
                                <div className="aspect-video bg-gray-100 dark:bg-gray-900 relative">
                                    {session.fileUrls?.problemImage ? (
                                        <img 
                                            src={session.fileUrls.problemImage} 
                                            alt="Problem" 
                                            className="w-full h-full object-cover" 
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd"></path></svg>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </div>
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex flex-wrap gap-1">
                                            {session.category && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    {t(CATEGORIES.find(c => c.code === session.category)?.labelKey || '')}
                                                </span>
                                            )}
                                            {session.language && (
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                    {session.language.toUpperCase()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-2">
                                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        {session.createdAt?.toDate ? session.createdAt.toDate().toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {hasMore && (
                    <div className="flex justify-center mt-12">
                        <button 
                            onClick={() => fetchHistory(false)}
                            disabled={isLoadingHistory}
                            className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            {isLoadingHistory && (
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isLoadingHistory ? t('loading') : t('loadMore')}
                        </button>
                    </div>
                )}
            </>
        )}
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <nav className="border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
                        <Logo darkMode={darkMode} />
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <select 
                            value={language} 
                            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                            className="bg-transparent text-sm font-medium text-gray-600 dark:text-gray-300 focus:outline-none cursor-pointer border-none focus:ring-0"
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code}>{lang.label}</option>
                            ))}
                        </select>

                        <button 
                            onClick={() => setViewMode(viewMode === 'app' ? 'history' : 'app')}
                            className={`p-2 rounded-lg transition-colors ${viewMode === 'history' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400'}`}
                            title={t('historyBtn')}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        </button>

                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            {darkMode ? (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <main className="container mx-auto px-4 py-8">
            {viewMode === 'history' ? (
                renderHistoryScreen() 
            ) : (
                stage === AppStage.INPUT ? renderInputScreen() : renderChatScreen(chatHistory)
            )}
        </main>
    </div>
  );
};

export default App;