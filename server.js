import express from "express";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import { generateReport } from "./agent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Generate report endpoint
app.post("/api/generate", async (req, res) => {
  const { subject, experiments, headings } = req.body;

  if (!subject || !experiments || !headings) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Build the user input string
    const userInput = `
Subject Name:- ${subject}

Generate a report for the following:

Headings to include:
${headings.map((h) => `- ${h}`).join("\n")}

Experiments:
${experiments.map((exp, i) => `${i + 1}. ${exp}`).join("\n")}
`;

    console.log("📥 Received request:", { subject, experiments, headings });

    // Generate the report (returns markdown directly from memory)
    const { markdown } = await generateReport(userInput);

    res.json({
      success: true,
      markdown: markdown,
      message: "Report generated successfully",
    });
  } catch (error) {
    console.error("❌ Error generating report:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get current markdown content
app.get("/api/markdown", async (req, res) => {
  try {
    const mdPath = path.join(process.cwd(), "report.md");
    const markdown = await fs.readFile(mdPath, "utf-8");
    res.json({ success: true, markdown });
  } catch (error) {
    res.json({ success: true, markdown: "" });
  }
});

// Stream markdown updates (for live preview)
app.get("/api/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const mdPath = path.join(process.cwd(), "report.md");
  let lastContent = "";

  const interval = setInterval(async () => {
    try {
      const content = await fs.readFile(mdPath, "utf-8");
      if (content !== lastContent) {
        lastContent = content;
        res.write(`data: ${JSON.stringify({ markdown: content })}\n\n`);
      }
    } catch {
      // File doesn't exist yet
    }
  }, 1000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running at http://localhost:${PORT}`);
  console.log(`📄 Open your browser to start generating reports\n`);
});
