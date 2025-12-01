import { Agent, run, tool, setTracingDisabled, setDefaultOpenAIClient } from "@openai/agents";
import { google } from "@ai-sdk/google";
import { aisdk } from "@openai/agents-extensions";
import "dotenv/config";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import OpenAI from 'openai';


// Disable OpenAI tracing to suppress the warning message
setTracingDisabled(true);

export const customClient = new OpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
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

// Experiment Writer Agent (sub-agent)
const experimentWriterAgent = new Agent({
  name: "Experiment Writer",
  model: model,
  tools: [appendToFileTool],
  instructions: `You are an expert technical writer specializing in academic experiment reports.

## Your Task
Write a detailed, well-structured experiment report section based on the experiment number, topic, and headings provided.

## Markdown Formatting Rules
Follow these markdown conventions strictly:

1. **Main Title**: Use ## for experiment title
2. **Section Headings**: Use ### for main sections (Aim, Theory, etc.)
3. **Subsection Headings**: Use #### for subsections
4. **Lists**: 
   - Use bullet points (-) for unordered lists
   - Use numbered lists (1. 2. 3.) for sequential steps
5. **Emphasis**: Use **bold** for key terms, *italics* for definitions
6. **Code**: Use \`inline code\` for technical terms, code blocks for code snippets
7. **Horizontal Rule**: Use --- to separate experiments

## Output Structure Example

---

## Experiment No. {number}

### Aim
[Clear, concise objective statement]

### Theory
[Comprehensive theoretical background with:
- **Key Concepts**: Definitions and explanations
- **Principles**: Relevant laws and rules
- **Formulas**: Mathematical expressions if applicable]

### Problem Analysis & Planning

#### Functional Requirements
- Requirement 1
- Requirement 2
- Requirement 3

#### Non-Functional Requirements
- Performance criteria
- Security considerations
- Usability aspects

---

## Guidelines
1. Write in formal academic tone
2. Be thorough yet concise
3. Ensure proper markdown hierarchy
4. Include relevant technical details
5. Make content educational and informative

## After Writing
1. Use the append_to_file tool to save the content
2. Return "DONE: Experiment {number} written successfully" to confirm completion`,
});

// TOOL:- Delegate One experiment at a time to Experiment Writer Agent
const writeExperimentTool = tool({
  name: "write_experiment",
  description:
    "Delegates writing of a single experiment to the Experiment Writer agent with specific headings",
  parameters: z.object({
    experimentNumber: z.number().describe("The experiment number"),
    experimentTopic: z.string().describe("The topic of the experiment"),
    headings: z
      .array(z.string())
      .describe("List of headings to include(e.g., ['Aim', 'Theory'])"),
  }),
  execute: async function ({ experimentNumber, experimentTopic, headings }) {
    console.log(`TOOL:- 😎 Deligating "${experimentTopic}" to Writer Agent`);
    const prompt = `Write Experiment No. ${experimentNumber}: ${experimentTopic}
        
        Include the following headings in the report:
        ${headings
          .map((heading, index) => `${index + 1}. ${heading}`)
          .join("\n")}

        Write in proper markdown format and append to the file when done.`;

    const result = await run(experimentWriterAgent, prompt);
    return `Experiment ${experimentNumber} (${experimentTopic}) completed. Ready for next experiment.`;
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

  const result = await run(orchestratorAgent, userInput);

  console.log(`\n✅ Report generation complete!`);
  console.log("📄 Output saved to: report.md");

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
