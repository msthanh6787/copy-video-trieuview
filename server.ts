import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Khởi tạo Firebase Admin
const adminApp = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});
const adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

// Hàm làm sạch API Key để tránh lỗi copy-paste thừa chữ
const cleanApiKey = (key: string): string => {
  if (!key) return "";
  // Loại bỏ các ký tự điều khiển, khoảng trắng lạ ở hai đầu
  let cleaned = key.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  
  console.log(`[Server] Raw Key starts with: ${cleaned.substring(0, 10)}...`);

  // Tìm kiếm chuỗi bắt đầu bằng AIza (định dạng chuẩn của Gemini Key)
  const aizaMatch = cleaned.match(/AIza[0-9A-Za-z-_]{35,}/);
  if (aizaMatch) {
    console.log(`[Server] Found AIza pattern match.`);
    return aizaMatch[0];
  }

  // Nếu không tìm thấy AIza theo pattern chuẩn, thử xóa các tiền tố phổ biến
  cleaned = cleaned.replace(/^(Gemini API Key|Gemini Key|API Key|Key)[:\s-•]*/i, "");
  // Chỉ lấy các ký tự hợp lệ cho API Key (chữ cái, số, gạch ngang, gạch dưới)
  const validCharsMatch = cleaned.match(/[0-9A-Za-z-_]+/);
  if (validCharsMatch) {
    return validCharsMatch[0];
  }
  
  return cleaned;
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload size for video files
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // API Routes
  app.post("/api/analyze", async (req, res) => {
    try {
      const { fileData, mimeType, style, model, lastSceneId, systemInstruction, userPrompt } = req.body;
      const rawKey = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
      const apiKey = cleanApiKey(rawKey);

      console.log(`[Analyze] Key check: RawLength=${rawKey.length}, CleanedLength=${apiKey.length}, StartsWithAIza=${apiKey.startsWith("AIza")}, Prefix=${apiKey.substring(0, 6)}...`);

      if (!apiKey) {
        return res.status(500).json({ error: "Chưa cấu hình API Key trên Server. Vui lòng kiểm tra lại GOOGLE_API_KEY trong Secrets." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: model,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: mimeType, data: fileData } },
              { text: userPrompt }
            ]
          }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Server Analyze Error:", error);
      res.status(500).json({ 
        error: error.message || "Internal Server Error",
        details: error.stack,
        keyInfo: `RawLen: ${process.env.GOOGLE_API_KEY?.length || process.env.GEMINI_API_KEY?.length || 0}`
      });
    }
  });

  app.post("/api/transcribe", async (req, res) => {
    try {
      const { fileData, mimeType, model, prompt } = req.body;
      const rawKey = (process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || "").trim();
      const apiKey = cleanApiKey(rawKey);

      console.log(`[Transcribe] Key check: RawLength=${rawKey.length}, CleanedLength=${apiKey.length}, StartsWithAIza=${apiKey.startsWith("AIza")}`);

      if (!apiKey) {
        return res.status(500).json({ error: "Chưa cấu hình API Key trên Server." });
      }

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: model,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: mimeType, data: fileData } },
              { text: prompt }
            ]
          }
        ],
        config: { temperature: 0.1 }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Server Transcribe Error:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Chống Spam: Kiểm tra giới hạn IP cho việc nhận Credit
  app.post("/api/check-registration-limit", async (req, res) => {
    try {
      const { uid } = req.body;
      const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') as string;
      const cleanIp = ip.split(',')[0].trim();

      // Kiểm tra xem user này đã được đăng ký chưa (tránh gọi lại nhiều lần)
      const userDoc = await adminDb.collection('users').doc(uid).get();
      if (userDoc.exists && userDoc.data()?.registrationIp) {
        return res.json({ allowed: true, alreadyRegistered: true });
      }

      // Kiểm tra số lượng đăng ký từ IP này trong 24h qua
      const twentyFourHoursAgo = admin.firestore.Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const querySnapshot = await adminDb.collection('ip_registrations')
        .where('ip', '==', cleanIp)
        .where('timestamp', '>', twentyFourHoursAgo)
        .get();
      
      const registrationCount = querySnapshot.size;

      if (registrationCount >= 2) {
        console.log(`[Spam Block] IP ${cleanIp} exceeded limit (${registrationCount}).`);
        return res.json({ 
          allowed: false, 
          message: "Địa chỉ IP của bạn đã đạt giới hạn tạo tài khoản nhận Credit trong 24h. Vui lòng thử lại sau." 
        });
      }

      // Ghi nhận đăng ký mới cho IP này
      const regId = `${cleanIp}_${Date.now()}`;
      await adminDb.collection('ip_registrations').doc(regId).set({
        ip: cleanIp,
        uid: uid,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      res.json({ allowed: true });
    } catch (error: any) {
      console.error("Registration Limit Check Error:", error);
      res.status(500).json({ error: "Lỗi kiểm tra giới hạn đăng ký." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
