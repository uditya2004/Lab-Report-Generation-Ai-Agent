# 📄 Experiment Report Generator

An AI-powered web application that automatically generates professional academic experiment reports using multi-agent architecture. Built with OpenAI Agents framework and powered by Groq's LLM.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-ISC-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

## ✨ Features

- **AI-Powered Content Generation**: Leverages advanced LLMs to generate comprehensive experiment reports
- **Multi-Agent Architecture**: Orchestrator and Writer agents work together for optimal results
- **Live Markdown Preview**: Real-time rendering of generated content
- **Copy Markdown**: One-click copy complete markdown 
- **Customizable Headings**: Define your own report structure
- **Sequential Processing**: Ensures experiments are written one at a time with progress tracking
- **Minimalist UI**: Clean, professional interface without shadows
- **Streaming Updates**: See content appear in real-time as it's generated

## 🏗️ Architecture

### Agent-as-Manager Pattern

The application uses a hierarchical multi-agent system:

```
┌─────────────────────────────────────┐
│     Orchestrator Agent              │
│  (Report Orchestrator)              │
│  - Parses user input                │
│  - Manages workflow                 │
│  - Tracks progress                  │
└──────────────┬──────────────────────┘
               │
               │ Delegates via Tool
               ▼
┌─────────────────────────────────────┐
│     Writer Agent                    │
│  (Experiment Writer)                │
│  - Generates content                │
│  - Follows markdown rules           │
│  - Appends to file                  │
└─────────────────────────────────────┘
```

### Tech Stack

| Component | Technology |
|-----------|-----------|
| **Backend** | Node.js, Express.js |
| **AI Framework** | OpenAI Agents SDK |
| **LLM Provider** | Groq (gpt-oss-120b) |
| **Frontend** | HTML5, Vanilla JavaScript |
| **Markdown Rendering** | Marked.js |
| **Validation** | Zod |

## 📁 Project Structure

```
report-generator/
├── agent.js                 # AI agent logic & report generation
├── server.js                # Express server & API endpoints
├── public/
│   └── index.html          # Web UI
├── package.json            # Dependencies & scripts
├── .env                    # Environment variables
└── README.md              # Documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Groq API Key ([Get one here](https://console.groq.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd report-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:3000`

## 📖 Usage

### Web Interface

1. **Enter Subject Name**: e.g., "Software Engineering"
2. **Add Headings**: Type and press Enter to add custom headings (default: Aim, Theory, Functional Requirements, Non-Functional Requirements)
3. **List Experiments**: Enter one experiment per line
4. **Generate Report**: Click "Generate Report" and watch the magic happen

### Command Line (Direct Agent Execution)

```bash
npm run agent
```

Edit the `userInput` in `agent.js` to customize the report parameters.

## 🎨 Customization

### Styling

### Headings

Default headings can be changed in:
- **Web UI**: Remove default tags and add your own
- **Agent**: Update the default array in `agent.js`

### LLM Model

Switch models by updating the `model` variable in `agent.js`:

```javascript
const model = "openai/gpt-oss-120b"; // Current
// const model = "openai/llama-3.1-70b"; // Alternative
```

## 🔧 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serve web interface |
| `/api/generate` | POST | Generate experiment report |
| `/api/markdown` | GET | Get current markdown content |
| `/api/stream` | GET | Server-Sent Events for live updates |

### Example API Request

```javascript
POST /api/generate
Content-Type: application/json

{
  "subject": "Software Engineering",
  "experiments": [
    "Online Student Course Registration System",
    "Library Management System"
  ],
  "headings": [
    "Aim",
    "Theory",
    "Functional Requirements",
    "Non-Functional Requirements"
  ]
}
```

## 🧪 How It Works

### Report Generation Flow

1. **User Input Parsing**: Orchestrator agent extracts subject, experiments, and headings
2. **Sequential Processing**: Each experiment is processed one at a time
3. **Content Generation**: Writer agent creates detailed content following markdown rules
4. **File Appending**: Each experiment is appended to `report.md` incrementally
5. **Progress Tracking**: Real-time progress updates (e.g., 1/4, 2/4, 3/4, 4/4)

### Key Features

- **Paragraph Rules**: Maximum 4 lines per paragraph for readability
- **Structured Output**: Consistent markdown formatting with proper hierarchy
- **Error Handling**: Retry logic and graceful degradation
- **Rate Limit Management**: Configurable `maxTurns` to prevent excessive API calls

## 📋 Configuration

### Agent Settings

**Orchestrator Agent**:
- `maxTurns`: 50 (adjustable based on number of experiments)
- Tool: `write_experiment`

**Writer Agent**:
- `maxTurns`: 10 per experiment
- Tool: `append_to_file`

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Your Groq API key |

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Max turns exceeded"
- **Solution**: Increase `maxTurns` in `generateReport()` or reduce number of experiments

**Issue**: Rate limit errors
- **Solution**: Wait for rate limit reset or upgrade Groq tier

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**Uditya**

## 🙏 Acknowledgments

- [OpenAI Agents SDK](https://github.com/openai/agents-sdk) for the agent framework
- [Groq](https://groq.com/) for lightning-fast LLM inference
- [Marked.js](https://marked.js.org/) for markdown rendering

## 📊 Performance

- Average generation time: 30-60 seconds for 4 experiments
- Token efficiency: ~200k tokens for comprehensive reports
- Concurrent requests: Supported via Express.js

---

**Made with ❤️ using AI**
