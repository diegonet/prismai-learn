import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ChatMessage, ProblemCategory } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// We use gemini-3-pro-preview for deep reasoning capabilities
const MODEL_NAME = 'gemini-3-pro-preview';
// We use flash for quick summarization tasks and classification
const SUMMARY_MODEL = 'gemini-2.5-flash';

let chatSession: Chat | null = null;

export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const blobToGenerativePart = async (blob: Blob, mimeType: string): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const SYSTEM_INSTRUCTION = `
You are PrismAI, a specialized multimodal tutor for university-level STEM students (Physics, Engineering).
Your goal is to diagnose misconceptions using deep reasoning.

You will receive three inputs:
1. An Image of a problem (Diagram/Equation).
2. An Attempt at solution (Text, Video, Audio, or Image).
3. A specific Student Question (Text or Audio).

PROTOCOL:
1. **Analyze Language:** Detect the language of the student's question and Respond strictly in that language.
2. **Inconsistency Check:** Verify if the student's question contradicts the provided diagram. If so, point it out immediately.
3. **Root Cause Diagnosis:** Determine if the error is:
   - **Conceptual (Model Physics):** Wrong formula, ignored variables (friction, air resistance), wrong physical principle.
   - **Execution (Visual/Practical):** Measurement error in video, component installed backwards, calculation slip.
4. **Pedagogical Strategy (STRICT RULE):**
   - **GOAL:** Teach the student to reason, do NOT solve the problem for them.
   - **NEVER** provide the final answer or full solution immediately, regardless of problem complexity.
   - **ALWAYS** engage in a Socratic interaction.
   - Briefly state the diagnosis of the misconception (Root Cause).
   - **Ask a guiding question** to help the student figure out the next step or correct their misconception.
   - Wait for the user to reply in the next turn.

5. **Formatting & Tone (CRITICAL):** 
   - **Be Concise:** Do NOT produce walls of text. Use short paragraphs.
   - **Visual Structure:** Use **Bold Headers** to separate ideas. Use **Bullet Points** for lists.
   - **Math:** Use LaTeX for math ($...$). Keep mathematical derivations minimal and step-by-step.
   - **Avoid Overwhelm:** Start with the main insight/diagnosis clearly. Only provide details if necessary.

6. **VISUALIZATION & ACCURACY (Strict Rule):**
   - If the student's problem involves vectors, forces (Free Body Diagrams), geometry, or trajectory, you **MUST** generate a Plotly JSON object.
   - **IMAGE FIDELITY:** The chart MUST strictly mirror the visual data from the uploaded image (angles, directions, relative magnitudes).
   - **ANGLES:** You **MUST** explicitly draw arcs to represent angles. 
     - Use \`layout.shapes\` with \`type: 'path'\` (SVG path) to draw the arc curve between vectors.
     - Label the angle (e.g., '30°', 'θ') using \`layout.annotations\` placed near the arc.
   - **VECTORS:** Use \`layout.annotations\` with \`ax\`, \`ay\` (arrows) to represent forces or vectors clearly.
   - **COORDINATES:** Ensure \`layout.xaxis.range\` and \`layout.yaxis.range\` are set correctly so the entire diagram is visible and proportional (aspect ratio 1:1).
   - **FORMAT:** Wrap the JSON strictly in a code block with the language tag \`json-plotly\`.
   - Example format:
     \`\`\`json-plotly
     {
       "data": [{"x": [0, 1], "y": [0, 1], "type": "scatter", "mode": "lines", "name": "slope"}],
       "layout": {
         "title": "Free Body Diagram",
         "xaxis": {"range": [-2, 2], "scaleanchor": "y"},
         "yaxis": {"range": [-2, 2]},
         "shapes": [
            { "type": "path", "path": "M 0.5,0 Q 0.5,0.2 0.4,0.3", "line": {"color": "red"} } 
         ],
         "annotations": [
            { "x": 1, "y": 1, "ax": 0, "ay": 0, "xref": "x", "yref": "y", "arrowhead": 2, "text": "F_N" },
            { "x": 0.6, "y": 0.1, "text": "θ", "showarrow": false }
         ]
       }
     }
     \`\`\`
`;

/**
 * Generates a concise text summary of a video or audio file for the PDF report.
 */
export const summarizeMultimedia = async (fileOrBlob: File | Blob, mimeType: string, prompt: string): Promise<string> => {
  try {
    const part = fileOrBlob instanceof File 
      ? await fileToGenerativePart(fileOrBlob) 
      : await blobToGenerativePart(fileOrBlob, mimeType);

    const response = await ai.models.generateContent({
      model: SUMMARY_MODEL,
      contents: {
        parts: [
          part,
          { text: prompt }
        ]
      }
    });

    return response.text || "No summary available.";
  } catch (error) {
    console.error("Summarization failed", error);
    return "Error generating summary.";
  }
};

/**
 * Classifies the session into one of the predefined categories.
 */
export const classifySession = async (chatHistory: ChatMessage[]): Promise<ProblemCategory> => {
  try {
    // We construct a prompt using the chat history to give context
    const conversationText = chatHistory
      .filter(m => !m.isThinking)
      .map(m => `${m.role}: ${m.text}`)
      .join('\n')
      .slice(0, 5000); // Limit context size

    const prompt = `
      Analyze the following tutoring conversation about a STEM problem.
      Classify the mathematical/physical domain into EXACTLY ONE of these categories:
      ALGEBRA, ARITHMETIC, GEOMETRY, CALCULUS, OTHERS.
      
      Rules:
      1. Return ONLY the category word. No markdown, no punctuation.
      2. If it involves derivatives, integrals, or limits, choose CALCULUS.
      3. If it involves shapes, angles, or trigonometry, choose GEOMETRY.
      4. If it involves solving equations, polynomials, or variables, choose ALGEBRA.
      5. If it involves basic operations, fractions, or percentages, choose ARITHMETIC.
      6. If it's Physics or Engineering that doesn't fit strictly above, choose OTHERS.
      
      Conversation:
      ${conversationText}
    `;

    const response = await ai.models.generateContent({
      model: SUMMARY_MODEL,
      contents: prompt
    });

    const text = response.text?.trim().toUpperCase() || 'OTHERS';
    
    // Validate output
    const validCategories: ProblemCategory[] = ['ALGEBRA', 'ARITHMETIC', 'GEOMETRY', 'CALCULUS', 'OTHERS'];
    if (validCategories.includes(text as ProblemCategory)) {
      return text as ProblemCategory;
    }
    return 'OTHERS';

  } catch (error) {
    console.error("Classification failed", error);
    return 'OTHERS';
  }
};


export const startDiagnosis = async (
  problemImage: File,
  solutionAttempt: { type: 'text' | 'video' | 'audio' | 'image', content: string | File | Blob },
  question: { type: 'text' | 'audio', content: string | Blob }
) => {
  
  const parts: any[] = [];

  // 1. Problem Image
  if (problemImage) {
    parts.push(await fileToGenerativePart(problemImage));
  }

  // 2. Solution Attempt
  if (solutionAttempt.type === 'video' && solutionAttempt.content instanceof File) {
    parts.push({ text: "Here is my solution attempt video:" });
    parts.push(await fileToGenerativePart(solutionAttempt.content));
  } else if (solutionAttempt.type === 'audio' && solutionAttempt.content instanceof Blob) {
    parts.push({ text: "Here is my solution attempt explanation (audio):" });
    parts.push(await blobToGenerativePart(solutionAttempt.content, 'audio/mp3'));
  } else if (solutionAttempt.type === 'image' && solutionAttempt.content instanceof File) {
    parts.push({ text: "Here is an image of my solution attempt:" });
    parts.push(await fileToGenerativePart(solutionAttempt.content));
  } else if (typeof solutionAttempt.content === 'string') {
    parts.push({ text: `My solution attempt: ${solutionAttempt.content}` });
  }

  // 3. Question
  if (question.type === 'audio' && question.content instanceof Blob) {
    parts.push({ text: "Here is my question (audio):" });
    parts.push(await blobToGenerativePart(question.content, 'audio/mp3')); // Assuming MP3/WAV from recorder
  } else if (typeof question.content === 'string') {
    parts.push({ text: `My question is: ${question.content}` });
  }

  // Initialize Chat
  chatSession = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      // Lower thinking budget to 1024 to reduce latency while keeping reasoning enabled
      thinkingConfig: { thinkingBudget: 1024 } 
    },
  });

  // Use sendMessageStream for lower perceived latency
  return await chatSession.sendMessageStream({
    message: parts 
  });
};

export const sendChatMessage = async (message: string, imageFile?: File) => {
  if (!chatSession) throw new Error("Session not initialized");
  
  const parts: any[] = [];
  
  // Only add text part if message exists
  if (message && message.trim()) {
      parts.push({ text: message });
  }

  if (imageFile) {
    parts.push(await fileToGenerativePart(imageFile));
  }
  
  if (parts.length === 0) {
      parts.push({ text: "..." });
  } else if (parts.length === 1 && imageFile && !message) {
      parts.unshift({ text: "Analyze this image in the context of our problem:" });
  }

  // Use sendMessageStream for lower perceived latency
  return await chatSession.sendMessageStream({
    message: parts
  });
};