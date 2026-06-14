<div align="center">

<img width="96" height="96" alt="icon1" src="https://github.com/user-attachments/assets/6d960d79-5d39-469d-99ab-395e70246a63" />
<img width="200" height="45" alt="high-resolution-color-logo (2)" src="https://github.com/user-attachments/assets/6c1af047-8f64-4d8e-8814-d95827b72709" />

# 🎩 Alfred

**A full-stack AI assistant built as a product — not a prototype.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-blue?style=flat-square)](https://langchain-ai.github.io/langgraph)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini)
[![Pinecone](https://img.shields.io/badge/Pinecone-Vector%20Search-6C47FF?style=flat-square)](https://pinecone.io)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Features](#features) · [Architecture](#architecture) · [Tech Stack](#tech-stack) · [Getting Started](#getting-started) · [Roadmap](#roadmap)

</div>

---

## What is Alfred?

Alfred is an AI assistant designed from the ground up to work **as a personal ai agent** 

Most agents are easy to build. A few API calls, a prompt, a tool or two. Alfred is built around the harder problems: streaming that doesn't drop, a RAG pipeline that retrieves the right thing on follow-up questions, response times that stay consistent, and a state machine that handles complex multi-step reasoning without breaking.

The architecture was designed before a single line was written — validated against real engineering approaches from production systems, not just tutorials.

---

## Features

| Capability | Description |
|---|---|
| 🔍 **RAG Pipeline** | Upload any file. Ask anything about it. Retrieves accurate context even across follow-up questions. |
| 🌐 **Live Web Search** | Real-time answers via Tavily. Alfred decides autonomously when to search vs answer from context. |
| 🖼️ **Image Recognition** | Drop a screenshot, diagram, or photo. Alfred understands and responds to visual content. |
| 📊 **Chart Generation** | Describe data or ask for a visualization — gets a rendered Chart.js graph inline. |
| 🔀 **Flowchart Generation** | Ask for a diagram — Alfred generates and renders Mermaid diagrams inside the chat. |
| ⚡ **SSE Streaming** | Token-by-token streaming with full abort support. No polling, no WebSocket overhead. |
| 📁 **Drag & Drop Upload** | File upload with drag-and-drop UI, supporting documents, images, and more. |
| 🛠️ **Live Tool Display** | Real-time visibility into which tools Alfred is using as it reasons. |

---

## Architecture

### System Overview

```mermaid
graph TD
    User(["👤 User"])

    subgraph Frontend ["Frontend — Next.js"]
        UI["Chat UI<br/>(Zustand · Tailwind · Framer Motion)"]
        DND["Drag & Drop<br/>File Upload"]
        TOOLBAR["ToolBar<br/>Live Tool Display"]
        MD["Markdown Renderer<br/>(Mermaid · Chart.js)"]
    end

    subgraph Backend ["Backend — FastAPI"]
        SSE["SSE Streaming<br/>StreamingResponse"]
        AUTH["Auth Layer"]
        ABORT["Abort Registry<br/>asyncio.Event"]
    end

    subgraph Agent ["Agent — LangGraph"]
        ROUTER["router_node<br/>Intent Detection"]
        RETRIEVAL["retrieval_node<br/>RAG"]
        SEARCH["search_node<br/>Web Search"]
        GENERATE["generate_node<br/>LLM Response"]
    end

    subgraph External ["External Services"]
        GEMINI["Gemini 2.5 Flash<br/>LLM + Vision"]
        EMBED["Gemini Embeddings<br/>text-embedding-004"]
        PINECONE[("Pinecone<br/>Vector Store")]
        TAVILY["Tavily<br/>Web Search"]
        MONGO[("MongoDB<br/>Checkpointer")]
    end

    User -->|"message / file"| UI
    DND --> UI
    UI -->|"fetchEventSource SSE"| SSE
    SSE --> AUTH
    AUTH --> ROUTER
    ROUTER -->|"needs docs"| RETRIEVAL
    ROUTER -->|"needs web"| SEARCH
    ROUTER -->|"direct"| GENERATE
    RETRIEVAL --> GENERATE
    SEARCH --> GENERATE
    GENERATE -->|"stream tokens"| SSE
    SSE -->|"token chunks"| UI
    UI --> TOOLBAR
    UI --> MD

    RETRIEVAL <-->|"similarity search"| PINECONE
    RETRIEVAL <-->|"embed query"| EMBED
    SEARCH <-->|"live results"| TAVILY
    GENERATE <-->|"inference"| GEMINI
    Agent <-->|"checkpointer / history"| MONGO

    style Frontend fill:#f8f7ff,stroke:#7F77DD,color:#26215C
    style Backend fill:#f0fdf4,stroke:#1D9E75,color:#04342C
    style Agent fill:#fff7ed,stroke:#BA7517,color:#412402
    style External fill:#f1f5f9,stroke:#888780,color:#2C2C2A
```

---

### RAG Pipeline

```mermaid
flowchart TD
    subgraph Ingest ["📥 Document Ingestion"]
        UPLOAD["File Upload<br/>(PDF / TXT / DOCX)"]
        PARSE["Parse & Clean<br/>(Markdown conversion)"]
        CHUNK["Chunk Document<br/>(fixed-size + overlap)"]
        EMBED_IN["Embed Chunks<br/>(Gemini text-embedding-004)"]
        STORE["Store Vectors<br/>(Pinecone)"]

        UPLOAD --> PARSE --> CHUNK --> EMBED_IN --> STORE
    end

    subgraph Query ["🔎 Query Time"]
        Q["User Question"]
        EMBED_Q["Embed Query<br/>(Gemini text-embedding-004)"]
        SEARCH_P["Cosine Similarity Search<br/>(Pinecone Top-K)"]
        RERANK["Retrieve Chunks<br/>(Top-K results)"]
        CONTEXT["Build Context Window<br/>(chunks + chat history)"]
        LLM["Generate Answer<br/>(Gemini 2.5 Flash)"]
        STREAM["Stream Response<br/>(SSE)"]

        Q --> EMBED_Q --> SEARCH_P --> RERANK --> CONTEXT --> LLM --> STREAM
    end

    STORE -.->|"indexed vectors"| SEARCH_P

    style Ingest fill:#f8f7ff,stroke:#7F77DD,color:#26215C
    style Query fill:#f0fdf4,stroke:#1D9E75,color:#04342C
```

---

### LangGraph State Machine

```mermaid
stateDiagram-v2
    [*] --> router_node

    router_node --> retrieval_node : has uploaded file\nor doc query
    router_node --> search_node : needs real-time\nor web info
    router_node --> generate_node : direct answer

    retrieval_node --> generate_node : retrieved context
    search_node --> generate_node : search results

    generate_node --> [*] : streamed response

    note right of router_node
        smart_tools_condition
        two-layer intent guard:
        1. classify query type
        2. check tool availability
    end note

    note right of generate_node
        streams token-by-token
        via SSE with abort support
    end note
```

---

## Tech Stack

### Frontend
| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| State Management | Zustand + Immer |
| Styling | Tailwind CSS + shadcn/ui |
| Animations | Framer Motion |
| Streaming | `@microsoft/fetch-event-source` |
| Rendering | react-markdown · react-syntax-highlighter · Mermaid · Chart.js |

### Backend
| Layer | Technology |
|---|---|
| Framework | FastAPI |
| Agent Orchestration | LangGraph (state machine) |
| LLM | Gemini 2.5 Flash (inference + vision) |
| Embeddings | Gemini `text-embedding-004` |
| Vector Store | Pinecone |
| Web Search | Tavily |
| Database | MongoDB |
| Checkpointer | `AsyncMongoDBSaver` (LangGraph) |
| Streaming | `StreamingResponse` (SSE) |

---



## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- Pinecone account
- MongoDB instance
- Google AI API key (Gemini)
- Tavily API key

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# copy and fill in your keys
cp .env.example .env

uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Environment Variables

```env
# backend/.env
GOOGLE_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX_NAME=
TAVILY_API_KEY=
MONGODB_URI=                    # MongoDB connection string

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Roadmap

- [x] RAG pipeline with follow-up query support
- [x] Live web search with autonomous routing
- [x] Image recognition (Gemini Vision)
- [x] Mermaid diagram generation
- [x] Chart.js graph generation
- [x] SSE streaming with abort support
- [x] Two-layer memory architecture
- [x] Drag & drop file upload
- [ ] GitHub integration (PR review, repo Q&A)
- [ ] Multi-model switching
- [ ] VS Code extension
- [ ] Google Suite via MCP connectors
- [ ] Voice input (Whisper fine-tuned on Haryanvi dialect)

---

## Why Alfred is Different

Most AI assistants are built to demo well. Alfred is built to work well.

The architecture was designed before any code was written — structure first, implementation second. Approaches were validated against production engineering patterns, not just quickstart guides. Every architectural decision (SSE over WebSockets, Pinecone over Atlas Vector Search, LangGraph state machine over simple chains) has a reason behind it.

AI was used as a tool in this process — to validate thinking, challenge approaches, and accelerate implementation. The decisions were made by a human who understood the tradeoffs.

---

<div align="center">

Built by [Shivansh Sharma](https://github.com/Shivanshxsharma) · NSUT Delhi

⭐ Star this repo if you find it useful

</div>
