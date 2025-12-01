import {
  Agent,
  run,
  tool,
  setTracingDisabled,
  setDefaultOpenAIClient,
} from "@openai/agents";
import { google } from "@ai-sdk/google";
import { aisdk } from "@openai/agents-extensions";
import "dotenv/config";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import OpenAI from "openai";
import { mdToPdf } from "md-to-pdf";

// Disable OpenAI tracing to suppress the warning message
setTracingDisabled(true);

export const customClient = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

setDefaultOpenAIClient(customClient);

// Create a Gemini model instance using the AI SDK adapter
// const model = aisdk(google("gemini-2.5-flash"));
const model = "openai/gpt-oss-120b";

// TOOL: Append content to markdown file
const appendToFileTool = tool({
  name: "append_to_file",
  description:
    "Appends the generated experiment content to the report markdown file",
  parameters: z.object({
    content: z.string().describe("The markdown content to append to the file"),
  }),
  execute: async ({ content }) => {
    const filepath = path.join(process.cwd(), "report.md");

    console.log(`🔨Writing to File report.md`);
    try {
      await fs.appendFile(filepath, content + "\n\n", "utf-8");
      return `Successfully appended content to report.md`;
    } catch (error) {
      console.error(`❌ Error writing to file: ${error.message}`);
      return `Error writing to file: ${error.message}`;
    }
  },
});

// TOOL: Convert to pdf:
async function convertToPdf() {
  const mdPath = path.join(process.cwd(), "report.md");
  const pdfPath = path.join(process.cwd(), "report.pdf");

  try {
    await fs.access(mdPath);

    console.log("📄 Converting to PDF...");

    const pdf = await mdToPdf(
      { path: mdPath },
      {
        dest: pdfPath,
        pdf_options: {
          format: "A4",
          margin: {
            top: "15mm",
            bottom: "20mm",
            left: "20mm",
            right: "20mm",
          },
        },
        stylesheet: path.join(process.cwd(), "styles.css"), // Optional
        // Skip YAML front matter parsing to avoid --- separator issues
        marked_options: {
          headerIds: false,
          mangle: false,
        },
        // Disable gray-matter YAML parsing
        basedir: process.cwd(),
        document_title: "Experiment Report",
      }
    );

    console.log("✅ PDF saved to: report.pdf");
    return pdfPath;
  } catch (error) {
    console.error(`❌ Error converting to PDF: ${error.message}`);
    return null;
  }
}

// Experiment Writer Agent (sub-agent)
const experimentWriterAgent = new Agent({
  name: "Experiment Writer",
  model: model,
  tools: [appendToFileTool],
  instructions: `You are an expert technical writer specializing in academic experiment reports.

## Your Task
Write a detailed, well-structured experiment report section based on the experiment number, topic, and headings provided in the prompt.

## CRITICAL: Follow User Headings ONLY
- Write ONLY the headings specified in the prompt
- DO NOT add extra headings not mentioned
- DO NOT skip any headings mentioned
- The headings provided are the EXACT structure to follow

## Markdown Formatting Rules
1. **Experiment Title**: Use ## for experiment title
   - Format: ## Experiment No. {number}: {Topic}
2. **Main Headings**: Use ### for each heading provided
3. **Sub-sections**: Use #### if a heading needs breakdown
4. **Lists**: 
   - Use bullet points (-) for unordered lists
   - Use numbered lists (1. 2. 3.) for sequential steps
5. **Emphasis**: Use **bold** for key terms, *italics* for definitions
6. **Code**: Use \`inline code\` for technical terms
7. **Separator**: Use --- at the end of the experiment

## Output Structure Template

---

## Experiment No. {number}: {Topic}

### {Heading 1 from prompt}
[Detailed content for this heading]

### {Heading 2 from prompt}
[Detailed content for this heading]

### {Heading 3 from prompt}
[Detailed content for this heading]

[... continue for ALL headings provided ...]

---

## ⚠️ CRITICAL PARAGRAPH RULES (MUST FOLLOW)
- NEVER write paragraphs longer than 4 lines
- Break long content into multiple short paragraphs
- Use bullet points instead of long paragraphs when listing features/points
- Each paragraph should focus on ONE idea only
- Add a blank line between paragraphs
- Prefer lists over paragraphs when explaining multiple items.

## Content Guidelines
1. Write in formal academic tone
2. Include relevant technical details for the topic
3. Make content educational and informative
4. "Aim" heading should contain 1-2 line aim only.
5. DO NOT start content with --- (causes PDF errors)

## After Writing
1. Use the append_to_file tool to save the content
2. Return "DONE: Experiment {number} written successfully"`,
});

// TOOL:- Delegate One experiment at a time to Experiment Writer Agent
const writeExperimentTool = tool({
  name: "write_experiment",
  description:
    "Delegates writing of a single experiment to the Experiment Writer agent with specific headings",
  parameters: z.object({
    experiment_number: z.number().describe("The experiment number"),
    experiment_topic: z.string().describe("The topic of the experiment"),
    headings: z
      .array(z.string())
      .describe("List of headings to include(e.g., ['Aim', 'Theory'])"),
    total_experiments: z
      .number()
      .optional()
      .describe("Total number of experiments"),
  }),
  execute: async function ({
    experiment_number,
    experiment_topic,
    headings,
    total_experiments = 4,
  }) {
    const progress = Math.round((experiment_number / total_experiments) * 100);
    const progressBar =
      "█".repeat(Math.floor(progress / 10)) +
      "░".repeat(10 - Math.floor(progress / 10));

    console.log(`\n┌─────────────────────────────────────────────────┐`);
    console.log(
      `│ 📋 Progress: [${progressBar}] ${progress}% (${experiment_number}/${total_experiments})`
    );
    console.log(`│ 📝 Writing: "${experiment_topic}"`);
    console.log(`└─────────────────────────────────────────────────┘`);

    const prompt = `Write Experiment No. ${experiment_number}: ${experiment_topic}

## REQUIRED HEADINGS (use ONLY these, in this exact order):
${headings.map((heading, index) => `${index + 1}. ${heading}`).join("\n")}

## Instructions:
- Write content for EACH heading listed above
- Use ### for each heading
- DO NOT add any headings not in the list
- DO NOT skip any headings
- Use proper markdown formatting
- Call append_to_file tool when done`;

    const result = await run(experimentWriterAgent, prompt, { maxTurns: 10 });
    return `Experiment ${experiment_number} (${experiment_topic}) completed. Ready for next experiment.`;
  },
});

// Main orchestrator agent
const orchestratorAgent = new Agent({
  name: "Report Orchestrator",
  model: model,
  tools: [writeExperimentTool],
  instructions: `You are a report generation orchestrator managing experiment report creation.

## Your Responsibilities
1. Parse the user's input to extract:
   - List of experiments (number and topic)
   - Headings to include in each experiment
2. Process experiments ONE AT A TIME sequentially
3. For each experiment, call write_experiment tool with:
   - Experiment number
   - Experiment topic
   - Array of headings to include
4. Wait for "completed" response before proceeding to next
5. Track progress and provide status updates

## Workflow
1. Parse user input
2. For experiment 1: call write_experiment(1, topic, headings)
3. Wait for completion confirmation
4. For experiment 2: call write_experiment(2, topic, headings)
5. Continue until ALL experiments are done
6. Provide final summary

## Important
- Process ALL experiments - never stop early
- Call write_experiment for EACH experiment
- Pass the correct headings array to each call
- Confirm completion after all experiments are written`,
});

async function generateReport(userInput) {
  console.log("🚀 Starting report generation...\n");

  // Clear report.md if it exists
  const filepath = path.join(process.cwd(), "report.md");
  try {
    await fs.access(filepath);
    await fs.writeFile(filepath, "", "utf-8");
    console.log("🗑️  Cleared existing report.md\n");
  } catch {
    // File doesn't exist, do nothing
  }

  // Remove report.pdf if it exists
  const pdfPath = path.join(process.cwd(), "report.pdf");
  try {
    await fs.access(pdfPath);
    await fs.unlink(pdfPath);
    console.log("🗑️  Removed existing report.pdf\n");
  } catch {
    // File doesn't exist, do nothing
  }

  const result = await run(orchestratorAgent, userInput, { maxTurns: 50 });

  console.log(`\n✅ Report generation complete!`);
  console.log("📄 Output saved to: report.md");

  // Convert to PDF
  await convertToPdf();

  return result;
}

// Example usage with headings specified
const userInput = `
Subject Name:- Software Engineering

Generate a report for the following":

Headings to include:
- Aim
- Theory  
- Functional Requirements
- Non-Functional Requirements

Experiments:
1. Online Student Course Registration System
2. Online Railway Ticket Reservation
3. Online Library Management System
4. Online Payroll processing application
`;

generateReport(userInput);
