# StockPulse — AI Inventory & Dynamic Pricing Engine

StockPulse is an autonomous, reactive commerce operations platform that monitors real-time inventory levels and sales velocity, generates AI-powered dynamic pricing proposals and replenishment purchase orders, and empowers merchandisers to review and approve recommendations with human-in-the-loop controls.

---

## ⚡ Quick Start (< 5 Minutes)

### Prerequisites
- **Node.js**: v18+ or v20+
- **MongoDB**: Local MongoDB instance running on `localhost:27017` (or MongoDB Atlas URI)

### 1. Clone & Configure Backend
```bash
cd backend
npm install
cp .env.example .env
# Optional: add GEMINI_API_KEY in backend/.env for AI recommendations
```

### 2. Seed Database (8 Addendum A Products)
```bash
npm run seed:clean
```

### 3. Run Automated Test Suite
```bash
npm test
```
*Executes all 163 backend automated tests across Domain Models, Product APIs, Commerce Engine, AI Advisor, and Agentic Loop.*

### 4. Start Backend Server (Port 5000)
```bash
npm run dev
```

### 5. Start Merchandising Console (Port 3000 / 3001)
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:3000`** (or `http://localhost:3001`) in your browser.

---

## 🏗️ Architecture Overview

```text
Product State Mutation (Stock Update / Order Simulation)
        ↓
MongoDB Persistence
        ↓
EventBus (In-Process Asynchronous setImmediate)
        ↓
AgenticLoop Worker
        ↓
SignalDetector (INVENTORY_LOW / DEMAND_SPIKE)
        ↓
Deduplication Check (Skip if PENDING exists)
        ↓
CommerceAdvisor Abstraction (StrategyRegistry)
        ├── RuleBasedCommerceStrategy
        └── AICommerceStrategy
                ├── PromptBuilder (Situational Context: Low Stock vs Demand Spike)
                ├── GeminiClient (Structured JSON Schema Mode + 8s Timeout Guard)
                ├── AIValidator (Price Bounds 0.1x-10x, Integer Quantities)
                └── Transparent Fallback to Rule Strategy on Error
        ↓
Persistence (PricingSuggestion / ReorderSuggestion as PENDING)
        ↓
React + Mantine Merchandising Console (Live 5s Polling & Instant Refresh)
        ↓
Human Review (Accept / Reject Confirmation Modal)
        ↓
Backend Domain State Transition (Price Update / Stock Replenishment)
```

---

## 📂 Project Structure

```
.
├── ADR.md                     # Architecture Decision Records (ADR-1 through ADR-6)
├── stockpulse-brief 1.html    # Authoritative Hackathon Specification
├── backend/
│   ├── index.js               # Express server entry point
│   ├── .env.example           # Environment variable template
│   ├── tests/
│   │   └── products.rest      # REST Client test suite (30+ scenarios)
│   └── src/
│       ├── config/            # Database and environment configuration
│       ├── data/              # Addendum A seed products
│       ├── events/            # In-process asynchronous EventBus
│       ├── models/            # Mongoose schemas (Product, PricingSuggestion, ReorderSuggestion)
│       ├── routes/            # Express REST routes
│       ├── controllers/       # HTTP request handlers
│       ├── services/
│       │   ├── productService.js          # Domain logic & approval side-effects
│       │   ├── commerce/                  # Pluggable Commerce Engine
│       │   │   ├── commerceAdvisor.js     # Abstract base strategy contract
│       │   │   ├── strategyRegistry.js    # Runtime strategy selector
│       │   │   ├── ruleBasedStrategy.js   # Deterministic percentage rules
│       │   │   └── aiCommerceStrategy.js  # Gemini AI with transparent fallback
│       │   ├── ai/                        # Server-side Gemini integration & validation
│       │   └── agentic/                   # Signal detection & recommendation loop
│       ├── testModels.js      # 21 Model unit tests
│       ├── testApi.js         # 36 REST API unit tests
│       ├── testCommerceEngine.js # 37 Commerce Engine tests
│       ├── testAiAdvisor.js   # 33 AI Advisor & Fallback tests
│       └── testAgenticLoop.js # 36 Agentic Loop & Human Approval tests
└── frontend/
    ├── index.html             # HTML entry point with Outfit/Inter typography
    ├── vite.config.js         # Vite proxy configuration to backend
    └── src/
        ├── theme.js           # Mantine v7 Light Theme configuration
        ├── api/client.js      # API client communicating with backend
        ├── components/
        │   └── Header.jsx     # Header with live polling and navigation
        └── views/
            ├── OverviewView.jsx         # KPI dashboard & priority watchlist
            ├── ProductsView.jsx         # Catalog table, filters & simulated sales
            └── RecommendationsView.jsx  # Price delta cards & human approval modals
```

---

## 🎯 Demo Walkthrough Script (5 Minutes)

1. **Overview Dashboard**: Observe catalog health KPIs and the Priority Watchlist table.
2. **Catalog & Inventory Health**: View on-hand stock vs threshold targets and demand velocities.
3. **Simulate Purchase Order**: Click **Simulate Sale** on `PRD-005` (Ceramic Pour-Over Set) to reduce stock below threshold (10 units).
4. **Agentic Recommendation Loop**: The background event loop detects `INVENTORY_LOW`, executes the AI/Rule strategy, and queues proposals in `PENDING` status.
5. **Recommendations Console**: Inspect the generated **Dynamic Pricing Proposal** (highlighting line-through current price $\rightarrow$ proposed price and AI reasoning) and **Inventory Replenishment Order** (+23 units).
6. **Human Approval**: Click **Accept Price Update** or **Accept & Replenish Stock** $\rightarrow$ Confirm modal $\rightarrow$ Observe live product price update and stock increment in the console.

---

## 🧪 Automated Testing

```bash
cd backend
npm test
```
**Results**: **163 / 163 Tests Passed (0 Failures)** across all 5 test suites.
