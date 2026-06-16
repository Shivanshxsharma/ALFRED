<div align="center">

<div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
  <img width="240" height="60" alt="Alfred Logo" src="https://github.com/user-attachments/assets/6c1af047-8f64-4d8e-8814-d95827b72709" />
</div>


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

Alfred is an AI assistant designed from the ground up to work **as a personal AI agent.**

Most agents are easy to build. A few API calls, a prompt, a tool or two. Alfred is built around the harder problems: streaming that doesn't drop, a RAG pipeline that retrieves the right thing on follow-up questions, and a long-term memory system that actually remembers who you are.

The architecture was designed before a single line was written — validated against real engineering approaches from production systems, not just tutorials.

---

## Features

| Capability | Description |
|---|---|
| 🔍 **RAG Pipeline** | Upload any file. Ask anything about it. Structure-aware chunking via Microsoft MarkItDown preserves document semantics. Two-layer retrieval decides whether to use chat context or run vector search. |
| 🧠 **Long-Term Memory** | LLM Wiki-based global memory system. Alfred remembers your projects, preferences, and decisions across all sessions — with relevancy decay and automated pruning. |
| 🌐 **Live Web Search** | Real-time answers via Tavily. Alfred decides autonomously when to search vs answer from context. |
| 🖼️ **Image Recognition** | Drop a screenshot, diagram, or photo. Alfred understands and responds to visual content. |
| 📊 **Chart Generation** | Describe data or ask for a visualization — get a rendered Chart.js graph inline. |
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
        MONGO[("MongoDB<br/>Checkpointer + Wiki")]
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

Alfred's RAG pipeline has two layers of intelligence — one for parsing, one for retrieval.

#### Layer 1 — Structure-Aware Chunking (Microsoft MarkItDown)

Files are not split by character count. They are first converted to clean Markdown using **Microsoft MarkItDown**, which preserves document structure — headings, tables, lists, and code blocks stay intact. Chunks are then split along semantic boundaries (sections, paragraphs) rather than arbitrary token limits. This means a chunk always contains a complete idea, not half a sentence.

#### Layer 2 — Two-Memory Retrieval

When a user asks about an uploaded document, Alfred doesn't blindly run vector search every time. It uses a **two-layer retrieval decision**:

```
User asks about a document
        │
        ▼
Is the answer already in chat history?
        │
   Yes ─┘── Use chat context directly (no vector search, zero latency)
        │
   No ──┘── Is it a RAG file (large doc, needs_rag=True)?
                │
           Yes ─┘── Run vector_search via Pinecone (top-k chunks)
                │
           No ──┘── Fetch full text directly from DB (small file)
```

This means Alfred never wastes a Pinecone query when the answer is already sitting in the conversation. Vector search only fires when it genuinely needs to.

```mermaid
flowchart TD
    subgraph Ingest ["📥 Document Ingestion"]
        UPLOAD["File Upload<br/>(PDF / TXT / DOCX)"]
        MARKITDOWN["Microsoft MarkItDown<br/>Structure-Aware Parsing"]
        CHUNK["Semantic Chunking<br/>(section + paragraph boundaries)"]
        EMBED_IN["Embed Chunks<br/>(Gemini text-embedding-004)"]
        STORE["Store Vectors<br/>(Pinecone)"]

        UPLOAD --> MARKITDOWN --> CHUNK --> EMBED_IN --> STORE
    end

    subgraph Query ["🔎 Query Time — Two-Layer Retrieval"]
        Q["User Question"]
        CHECK["Answer in chat history?"]
        DIRECT["Use chat context<br/>(zero latency)"]
        RAGCHECK["Is it a RAG file?"]
        VECTOR["vector_search via Pinecone<br/>(Top-K chunks)"]
        FULLTEXT["Fetch full text<br/>(small file, from DB)"]
        CONTEXT["Build Context Window"]
        LLM["Generate Answer<br/>(Gemini 2.5 Flash)"]
        STREAM["Stream Response (SSE)"]

        Q --> CHECK
        CHECK -->|"Yes"| DIRECT
        CHECK -->|"No"| RAGCHECK
        RAGCHECK -->|"Yes — large doc"| VECTOR
        RAGCHECK -->|"No — small file"| FULLTEXT
        DIRECT --> CONTEXT
        VECTOR --> CONTEXT
        FULLTEXT --> CONTEXT
        CONTEXT --> LLM --> STREAM
    end

    STORE -.->|"indexed vectors"| VECTOR

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

### 🧠 Global Memory — LLM Wiki Based

> Inspired by **Andrej Karpathy's LLM Wiki** idea (OpenAI co-founder, former Tesla AI Director) — extended into a per-user, multi-page, dynamic long-term memory system.

Alfred remembers who you are across every session. Not just the current conversation — your projects, preferences, tech stack, and past decisions, permanently.

#### Architectures Considered

| Architecture | Accuracy | Token Efficiency | Latency | Decision |
|---|---|---|---|---|
| Full context injection | ⭐⭐⭐ | ⭐ | ⭐⭐⭐⭐⭐ | ❌ Rejected |
| Vector RAG (Pinecone) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ❌ Rejected |
| **LLM Wiki (current)** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ Chosen |

**Full context injection** — dumps everything into the system prompt every turn. Zero latency, but completely unscalable. 20 wiki pages = 5000+ tokens wasted on every single message, even "what's the weather?"

**Vector RAG** — embeddings + cosine similarity on every turn. Accurate, but adds an API call and vector search to every message. Overkill for small memory sets. Karpathy himself noted this is unnecessary at lower scale. Also risks surfacing semantically similar but contextually irrelevant old memories.

**LLM Wiki** — chosen because it only loads what's needed, retrieval is a fast DB query with no embeddings, and the LLM selects the exact page to read from a structured wiki map injected into its context.

> Vector search is planned as a future upgrade when a user's memory grows beyond 20+ pages. The current architecture is designed to swap the retrieval backend without changing the LLM interface.

#### How Memory Flows

![Alfred Memory Flow](./docs/alfred_memory_flow.svg)

```mermaid
flowchart TD
    subgraph INGEST ["📥 Ingest"]
        A([Session ends]) --> B[Summarizer LLM\nCompresses conversation]
        B --> C{Page exists?}
        C -- No --> D[Create page\nscore = 0]
        C -- Yes --> E[Update page\nreset score]
        D --> F[(MongoDB wiki\nPersistent store)]
        E --> F
    end

    subgraph READ ["🔎 Read"]
        G([User message]) --> H[Router node\nIntent detection]
        H --> I[Wiki map injected\nInto system prompt]
        I --> J[LLM reads map\nPicks exact slug]
        J --> K["wiki_read(slug)\nExact DB lookup"]
        K --> L[Fast DB query\nNo embeddings]
        L --> M[Page returned\nScore → 0]
        M --> N([LLM responds])
    end

    subgraph PRUNE ["🗑️ Prune"]
        O([Background job\n3 AM cron]) --> P[Fetch all pages\nFor this user]
        P --> Q[Compute score\ntoday − last_accessed]
        Q --> R{Score > 30 days?}
        R -- Yes --> S[Delete page]
        R -- No --> T[Keep active]
    end

    style INGEST fill:#EEEDFE,stroke:#534AB7,color:#26215C
    style READ fill:#E1F5EE,stroke:#0F6E56,color:#04342C
    style PRUNE fill:#FAEEDA,stroke:#854F0B,color:#412402
    style K fill:#FAC775,stroke:#633806,color:#412402
```

#### Relevancy Decay

Every wiki page has a score: `score = today − date of last access (days)`

| Score | Status | Action |
|---|---|---|
| 0 | Just accessed | Highest priority in wiki map |
| 1–14 | Active | Included normally |
| 15–29 | Aging | Flagged for compression (planned) |
| 30+ | Stale | Pruned at 3 AM cleanup |

When the LLM reads a page, score resets to `0`. When topics are ambiguous, the LLM picks the page with the **lowest score** — most recently relevant wins.

#### The wiki_read Tool

The LLM selects what to read using a **wiki map** injected into its context at the start of every session. The map lists every page with its slug, category, and a one-line summary:

```
Category: PROJECT
  - metro-mate: Metro Mate is a project that uses dialect training for LLMs to address language variations in a metropolitan context.
Category: USER
  - shivansh: Contains user details — key facts about Shivansh, including his identity, education, and career aspirations.
```

The LLM reads this map, picks the exact slug it needs, and calls `wiki_read` directly:

```python
# LLM calls:
wiki_read("metro-mate")
wiki_read("shivansh")

# Python fetches the page by exact slug from MongoDB
# Resets page score → 0 on access
```

**Why wiki map + exact slug?** The wiki map gives the LLM full visibility into what memory exists before it decides what to retrieve. Since slugs are shown explicitly in the map, the LLM selects from a known list rather than generating a guess — eliminating slug hallucination entirely. No embeddings, no fuzzy matching, just a fast DB lookup by slug.

#### Memory Stack

| Layer | Storage | What it holds | Scope |
|---|---|---|---|
| **Wiki** | MongoDB | Long-term personal facts, projects, preferences | Permanent (with decay) |
| **RAG** | Pinecone | Uploaded file content | Per-file |
| **Checkpointer** | MongoDB | Live conversation history | Per-thread |

#### Roadmap for Memory

- [x] Wiki store with slug + category + content
- [x] `wiki_read` with wiki map slug selection
- [x] Relevancy score decay system
- [x] Summarizer layer on session end
- [ ] 3 AM pruning cron job (APScheduler)
- [ ] Two-tier decay — compress at 15 days, delete at 30
- [ ] Redis inactivity trigger for auto-summarizer
- [ ] Semantic search via Pinecone when memory exceeds 20+ pages

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
| Document Parsing | Microsoft MarkItDown (structure-aware) |
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

- [x] RAG pipeline with structure-aware chunking (MarkItDown)
- [x] Two-layer retrieval (chat context → vector search fallback)
- [x] Live web search with autonomous routing
- [x] Image recognition (Gemini Vision)
- [x] Mermaid diagram generation
- [x] Chart.js graph generation
- [x] SSE streaming with abort support
- [x] LLM Wiki global memory with relevancy decay
- [x] Drag & drop file upload
- [ ] 3 AM memory pruning cron job
- [ ] Redis inactivity trigger for auto-summarizer
- [ ] Semantic memory search via Pinecone (20+ pages)
- [ ] GitHub integration (PR review, repo Q&A)
- [ ] Multi-model switching
- [ ] VS Code extension
- [ ] Google Suite via MCP connectors
- [ ] Voice input (Whisper fine-tuned on Haryanvi dialect)

---

## Why Alfred is Different

Most AI assistants are built to demo well. Alfred is built to work well.

The architecture was designed before any code was written — structure first, implementation second. Approaches were validated against production engineering patterns, not just quickstart guides.

AI was used as a tool in this process — to validate thinking, challenge approaches, and accelerate implementation. The decisions were made by a human who understood the tradeoffs.

---

<div align="center">

</div>
