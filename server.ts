import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Set up rate limiting for APIs
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { error: "Too many requests from this IP, please try again after 15 minutes." }
  });

  // Apply rate limiting to all API routes
  app.use("/api/", apiLimiter);

  // API routes FIRST
  app.post("/api/gemini/synthesize", async (req, res) => {
    try {
      const { staffName, staffRole, quarter, year, baseSummary, coachEvaluations } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API key is not configured in environment variables." });
      }
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Prepare prompt
      const prompt = `
  You are an expert leadership performance evaluator. You are tasked with compiling a Consolidated 1-Page Synthesized Consensus Review for a staff member based on their own self-evaluation (Quarterly Summary) and multiple team leaders/coaches' evaluations.

  Staff Details:
  - Name: ${staffName}
  - Role: ${staffRole}
  - Quarter: ${quarter} (${year})

  --- STAFF SELF-EVALUATION DETAILS ---
  ${baseSummary ? JSON.stringify(baseSummary, null, 2) : "No self-evaluation summary draft available."}

  --- COACHES/TEAM LEADERS EVALUATIONS ---
  ${JSON.stringify(coachEvaluations, null, 2)}

  --- INSTRUCTIONS ---
  Please write a professional, balanced, and constructive synthesis. The synthesis must incorporate:
  1. A clear "Consensus Rating & Verdict" summarizing the overall level of effectiveness based on the inputs (Outstanding, Satisfactory, Ineffective, etc.).
  2. "Key Strengths" - A synthesis of the most salient positive themes highlighted by the coaches and the staff member.
  3. "Development & Growth Areas" - Core areas where the staff member needs focus, aligning supervisor observations.
  4. "Consensus Action Items" - 3-4 specific, actionable, and concrete next steps for development/ministry improvement.

  Make sure the output is written in clean, elegant Markdown. Use bold styling, lists, and a professional, encouraging tone. Keep it highly readable and ready for the admin/leadership team.
  `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      res.json({ synthesis: response.text });
    } catch (error: any) {
      console.error("Gemini synthesis error:", error);
      res.status(500).json({ error: error.message || "Failed to generate AI synthesis." });
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
