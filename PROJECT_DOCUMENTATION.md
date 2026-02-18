# Coder’s Gyan Ai Chatbot Documentation

This project is an AI-powered student support agent for **Coder’s Gyan**. It uses a Multi-Agent architecture built with **LangGraph**, **Groq (LLM)**, and **Pinecone (Vector Database)** to handle customer queries, retrieve information from a knowledge base (PDF), and provide course-related offers.

---

## 🏗 Project Architecture

The chatbot is organized as a state machine with multiple specialized nodes (representatives):

1.  **Front Desk Support**: The entry point. Categorizes the user query into "Conversation", "Marketing", or "Learning".
2.  **Marketing Support**: Handles questions about discounts, promo codes, and offers using a dedicated tool.
3.  **Learning Support**: Handles technical questions about courses, syllabus, and career doubts using RAG (Retrieval Augmented Generation) from the PDF.

### Tech Stack
-   **Runtime**: Node.js (with `tsx` for TypeScript support).
-   **Orchestration**: [LangGraph.js](https://langchain-ai.github.io/langgraphjs/)
-   **LLM**: Groq (Model: `llama3-70b` / `gpt-oss-120b`).
-   **Vector DB**: Pinecone (Serverless).
-   **Embeddings**: OpenAI (`text-embedding-3-small`).

---

## 📁 File Structure

- `src/graph.ts`: **Core Logic**. Defines the workflow, nodes, and conditional routing of the agent.
- `src/tools.ts`: Contains the tools the AI can use:
    - `getOffers`: Returns current discount codes.
    - `kbRetrieverTool`: Searches the Pinecone vector database.
- `src/indexDocs.ts`: Logic for PDF processing, text splitting, and uploading vectors to Pinecone.
- `src/model.ts`: Configuration for the Groq LLM.
- `src/state.ts`: Defines the shared data structure (Conversation history, routing state).
- `index_data.ts`: Utility script to trigger the PDF indexing process.
- `.env`: Secret keys (API Keys for Groq, Pinecone, OpenAI).

---

## 🚀 How to Setup & Run

### 1. Prerequisites
Ensure you have **Node.js v20+** installed.

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file and fill in your keys:
```env
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-proj-...
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=your-index-name
```

### 4. Index the Knowledge Base (IMPORTANT)
Before the chatbot can answer questions about courses, you must upload the PDF content to Pinecone:
```bash
npm run index-pdf
```
*This splits the `cg-knowledge-base.pdf` into chunks and saves them in your Pinecone index.*

### 5. Start the Chatbot
```bash
npm start
```

---

## 🧪 Testing the Chatbot

Once the project is running (`npm start`), it will simulate a user question:
*"Which language the GenAI course is in?"*

### To test different scenarios:
You can modify the `main()` function in `src/graph.ts` (lines 187-202) to change the user message:

- **Test Marketing**: Change message to *"Do you have any discount codes?"*
- **Test General**: Change message to *"Hello! How are you?"*
- **Test Learning**: Change message to *"What is covered in the Backend course?"*

---

## 🛠 Troubleshooting
- **Invalid API Key**: Double-check your `.env` file for typos or extra spaces.
- **Dimensions Mismatch**: Ensure your Pinecone index is created with **1536** dimensions.
- **Module not found**: Ensure you ran `npm install`.
