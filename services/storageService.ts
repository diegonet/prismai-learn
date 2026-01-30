import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, orderBy, limit, startAfter, where, QueryDocumentSnapshot, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth, signInAnonymously, Auth } from "firebase/auth";
import { ChatMessage, StoredSession, LanguageCode, ProblemCategory, FormData as AppFormData } from "../types";

// --- CONFIGURACIÓN DE FIREBASE (WEB CONFIG) ---
const firebaseConfig = {
  
};

let storage: any = null;
let db: any = null;
let auth: Auth | null = null;
let isMockMode = false;

// Initialize Firebase
try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "TU_API_KEY_WEB_AQUI") {
    const app = initializeApp(firebaseConfig);
    storage = getStorage(app);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Enable offline persistence if possible
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
            console.warn('Persistence not available in this browser');
        }
    });

    console.log("Firebase services initialized.");
  } else {
    console.warn("Using Mock Mode: API Key not configured.");
    isMockMode = true;
  }
} catch (error) {
  console.error("Error initializing Firebase services:", error);
  isMockMode = true;
}

// Mock Data Generator
const getMockSessions = (): StoredSession[] => {
    return [
        {
            id: 'mock-1',
            sessionId: 'mock_session_1',
            createdAt: { toDate: () => new Date() },
            language: 'es',
            category: 'CALCULUS',
            status: 'COMPLETED',
            fileUrls: {
                problemImage: 'https://placehold.co/600x400/e2e8f0/1e293b?text=Calculus+Problem'
            },
            historical: [
                { id: '1', role: 'user', text: 'Cómo resuelvo esta integral?' },
                { id: '2', role: 'model', text: 'Para resolver esta integral, primero identifiquemos el método de sustitución...' }
            ]
        },
        {
            id: 'mock-2',
            sessionId: 'mock_session_2',
            createdAt: { toDate: () => new Date(Date.now() - 86400000) }, // Yesterday
            language: 'en',
            category: 'PHYSICS' as any, // Using 'OTHERS' mapped to Physics context conceptually
            status: 'COMPLETED',
            fileUrls: {
                problemImage: 'https://placehold.co/600x400/e2e8f0/1e293b?text=Physics+Diagram'
            },
            historical: [
                { id: '1', role: 'user', text: 'I don\'t understand the forces here.' },
                { id: '2', role: 'model', text: 'Let\'s break down the Free Body Diagram.' }
            ]
        }
    ];
};

const ensureAppAuthentication = async (): Promise<boolean> => {
  if (isMockMode) return false;
  if (!auth) {
      isMockMode = true;
      return false;
  }
  
  if (auth.currentUser) return true;

  try {
    // Race authentication with a timeout to prevent hanging on network issues
    // Increased timeout to 15s
    const authPromise = signInAnonymously(auth);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth timeout")), 15000));
    
    await Promise.race([authPromise, timeoutPromise]);
    console.log("Authenticated anonymously");
    return true;
  } catch (e: any) {
    console.error("Authentication failed or timed out:", e);
    isMockMode = true; 
    return false;
  }
};

const uploadFileToGCS = async (file: File | Blob, path: string): Promise<string | null> => {
  if (isMockMode || !storage) return null;

  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error("File upload failed:", error);
    // If upload fails, we don't necessarily switch to full mock mode for everything,
    // but we return null so the flow continues.
    if (error.code === 'storage/unauthorized' || error.message.includes('network')) {
       // Optional: isMockMode = true; 
    }
    return null;
  }
};

const mockSaveProcess = async () => {
    console.warn("Mock Save: Data is NOT being saved to Firestore (Simulated).");
    await new Promise(resolve => setTimeout(resolve, 800)); // Quicker mock save
    return true;
};

export const uploadSessionData = async (
    formData: AppFormData,
    chatHistory: ChatMessage[],
    language: LanguageCode,
    category: ProblemCategory
  ): Promise<boolean> => {
    
    await ensureAppAuthentication();

    if (isMockMode) {
        return mockSaveProcess();
    }

    try {
      const sessionId = `session_${Date.now()}`;
      const uploads: Record<string, string> = {};

      // Helper for uploads
      const uploadSafely = async (file: File | Blob | null, name: string, key: string) => {
          if (!file) return;
          const url = await uploadFileToGCS(file, `prism_ai_uploads/${sessionId}/${name}`);
          if (url) uploads[key] = url;
      }

      await Promise.all([
          uploadSafely(formData.problemImage, `problem_${formData.problemImage?.name || 'img'}`, 'problemImage'),
          uploadSafely(formData.solutionVideo, `video_${formData.solutionVideo?.name || 'vid'}`, 'solutionVideo'),
          uploadSafely(formData.solutionAudioBlob, 'solution_audio.mp3', 'solutionAudio'),
          uploadSafely(formData.solutionImage, `solution_${formData.solutionImage?.name || 'img'}`, 'solutionImage'),
          uploadSafely(formData.questionAudioBlob, 'question_audio.mp3', 'questionAudio')
      ]);

      if (db) {
        // Sanitize and upload pending chat images
        const sanitizedHistory = await Promise.all(chatHistory
            .filter(m => !m.isThinking)
            .map(async m => {
                let imageUrl = m.image;
                
                // If we have a stored file object from App.tsx, upload it now
                if (m.file) {
                    const url = await uploadFileToGCS(m.file, `prism_ai_uploads/${sessionId}/chat/${m.id}_img`);
                    if (url) imageUrl = url;
                } 
                // Fallback: If we don't have the file object but have a blob URL (unlikely given App.tsx update), 
                // we try to fetch it. This helps if the browser hasn't refreshed.
                else if (imageUrl && imageUrl.startsWith('blob:')) {
                     try {
                         const blob = await fetch(imageUrl).then(r => r.blob());
                         const url = await uploadFileToGCS(blob, `prism_ai_uploads/${sessionId}/chat/${m.id}_img`);
                         if (url) imageUrl = url;
                     } catch(e) {
                         console.warn("Could not upload blob image", e);
                         imageUrl = null; // Do not save invalid local blob URL to DB
                     }
                }

                return { 
                    id: m.id, 
                    role: m.role, 
                    text: m.text || "", 
                    image: imageUrl || null 
                };
            }));

        // Race the write operation
        // Increased timeout to 20s
        const writeOp = addDoc(collection(db, 'sessions'), {
          sessionId,
          createdAt: serverTimestamp(),
          language: language || 'es',
          category: category || 'OTHERS',
          fileUrls: uploads,
          historical: sanitizedHistory, 
          status: 'COMPLETED',
          userAgent: navigator.userAgent,
          applicationId: 'PrismAI-Web-Client',
          userId: auth?.currentUser?.uid || 'anonymous'
        });

        const timeoutOp = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore write timeout")), 20000));
        
        await Promise.race([writeOp, timeoutOp]);
        console.log("Session saved to Firestore successfully.");
      }

      return true;

    } catch (error) {
      console.error("🔥 Network/Firestore Error. Falling back to Mock Save.", error);
      isMockMode = true; // Switch to mock mode for future actions
      return mockSaveProcess();
    }
  };

export interface PaginatedResult {
    sessions: StoredSession[];
    lastDoc: any; 
}

export const getStoredSessions = async (
    lastDoc: any = null,
    language: string = 'ALL',
    category: string = 'ALL'
): Promise<PaginatedResult> => {
  
  if (isMockMode || !db) {
    // Return mock data for demonstration purposes if backend is unavailable
    return { sessions: getMockSessions(), lastDoc: null };
  }

  try {
    await ensureAppAuthentication();
    
    const sessionsRef = collection(db, 'sessions');
    
    let constraints: any[] = [orderBy('createdAt', 'desc')];

    if (lastDoc) {
        constraints.push(startAfter(lastDoc));
    }

    constraints.push(limit(50));

    const q = query(sessionsRef, ...constraints);
    
    // Race the read operation
    // Increased timeout to 15s
    const readOp = getDocs(q);
    const timeoutOp = new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore read timeout")), 15000));

    const querySnapshot = await Promise.race([readOp, timeoutOp]) as any;
    
    let sessions: StoredSession[] = [];
    
    querySnapshot.forEach((doc: any) => {
      const data = doc.data();
      sessions.push({
        id: doc.id,
        sessionId: data.sessionId,
        createdAt: data.createdAt,
        language: data.language,
        category: data.category,
        fileUrls: data.fileUrls || {},
        historical: data.historical || [],
        status: data.status
      });
    });

    // Client-side filtering
    if (language !== 'ALL') {
        sessions = sessions.filter(s => s.language === language);
    }

    if (category !== 'ALL') {
        sessions = sessions.filter(s => s.category === category);
    }

    const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
    
    return { sessions, lastDoc: lastVisible || null };

  } catch (error) {
    console.error("Error fetching sessions (Switching to Mock Mode):", error);
    isMockMode = true;
    return { sessions: getMockSessions(), lastDoc: null };
  }
}

export { db, storage, auth };