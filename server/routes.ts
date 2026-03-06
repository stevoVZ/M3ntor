import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { aiAssist, getItemHint, generateProjectTasks, generateSubtasks, generateBriefing } from "./ai";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/ai/assist", async (req, res) => {
    try {
      const { prompt, country } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "prompt is required" });
      }
      const result = await aiAssist(prompt, country);
      return res.json(result);
    } catch (error) {
      console.error("AI assist route error:", error);
      return res.status(500).json({ error: "AI assist failed" });
    }
  });

  app.post("/api/ai/hint", async (req, res) => {
    try {
      const { kind, title } = req.body;
      if (!kind || !title) {
        return res.status(400).json({ error: "kind and title are required" });
      }
      const hint = await getItemHint(kind, title);
      return res.json({ hint });
    } catch (error) {
      console.error("AI hint route error:", error);
      return res.status(500).json({ error: "AI hint failed" });
    }
  });

  app.post("/api/ai/tasks", async (req, res) => {
    try {
      const { title, description } = req.body;
      if (!title) {
        return res.status(400).json({ error: "title is required" });
      }
      const tasks = await generateProjectTasks(title, description);
      return res.json({ tasks });
    } catch (error) {
      console.error("AI tasks route error:", error);
      return res.status(500).json({ error: "AI tasks failed" });
    }
  });

  app.post("/api/ai/subtasks", async (req, res) => {
    try {
      const { stepTitle, projectTitle } = req.body;
      if (!stepTitle || !projectTitle) {
        return res.status(400).json({ error: "stepTitle and projectTitle are required" });
      }
      const subtasks = await generateSubtasks(stepTitle, projectTitle);
      return res.json({ subtasks });
    } catch (error) {
      console.error("AI subtasks route error:", error);
      return res.status(500).json({ error: "AI subtasks failed" });
    }
  });

  app.post("/api/ai/briefing", async (req, res) => {
    try {
      const { journeyTitle, weekNum, dayNum, dayTitle, actionCount, streak } = req.body;
      const briefing = await generateBriefing({
        journeyTitle: journeyTitle || '',
        weekNum: weekNum || 1,
        dayNum: dayNum || 1,
        dayTitle: dayTitle || '',
        actionCount: actionCount || 0,
        streak: streak || 0,
      });
      return res.json({ briefing });
    } catch (error) {
      console.error("AI briefing route error:", error);
      return res.status(500).json({ error: "AI briefing failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
