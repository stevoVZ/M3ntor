import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { aiAssist } from "./ai";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/ai/assist", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "prompt is required" });
      }
      const result = await aiAssist(prompt);
      return res.json(result);
    } catch (error) {
      console.error("AI assist route error:", error);
      return res.status(500).json({ error: "AI assist failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
