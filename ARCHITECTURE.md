# StockPulse — System Architecture & UML Documentation

> **Complete High-Level & Detailed Architecture Reference for Technical Reviews & Presentations**

---

## 1. High-Level Flowchart Diagram

```mermaid
flowchart TD
    %% Styling Classes
    classDef client fill:#f0fdfa,stroke:#0d9488,stroke-width:2px,color:#0f172a;
    classDef api fill:#f8fafc,stroke:#3b82f6,stroke-width:2px,color:#0f172a;
    classDef event fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#0f172a;
    classDef ai fill:#fae8ff,stroke:#a855f7,stroke-width:2px,color:#0f172a;
    classDef db fill:#ecfdf5,stroke:#059669,stroke-width:2px,color:#0f172a;
    classDef human fill:#fff1f2,stroke:#e11d48,stroke-width:2px,color:#0f172a;

    %% 1. Frontend Tier
    subgraph FrontendTier["FRONTEND TIER (React 18 + Mantine UI)"]
        UI_Overview["Overview Dashboard<br/>(KPIs & Priority Watchlist)"]
        UI_Catalog["Products Catalog<br/>(Stock Health & Sim Sale)"]
        UI_Review["Recommendations Console<br/>(Pricing & Replenishment Cards)"]
    end
    class UI_Overview,UI_Catalog,UI_Review client;

    %% 2. API & Backend Tier
    subgraph ApiTier["APPLICATION BACKEND (Express / Node.js)"]
        RestApi["Express REST API Routes<br/>(/api/products, /api/suggestions)"]
        ProdService["Product Service & Domain Logic<br/>(CRUD, Order Simulation, State Transitions)"]
    end
    class RestApi,ProdService api;

    %% 3. Persistence Tier
    subgraph PersistenceTier["PERSISTENCE TIER (MongoDB)"]
        DB_Product[("Product Collection<br/>(Stock, Price, Threshold, Velocity, Status)")]
        DB_Suggestions[("Suggestion Collections<br/>(PricingSuggestion & ReorderSuggestion - PENDING)")]
    end
    class DB_Product,DB_Suggestions db;

    %% 4. Event & Agentic Pipeline
    subgraph AgenticPipeline["EVENT-DRIVEN AGENTIC PIPELINE"]
        EventBus["Asynchronous EventBus<br/>(ORDER_SIMULATED / INVENTORY_CHANGED)"]
        AgenticLoop["AgenticLoop Worker<br/>(Idempotency & Deduplication Guards)"]
        SignalDetector["SignalDetector Service<br/>(INVENTORY_LOW / DEMAND_SPIKE)"]
    end
    class EventBus,AgenticLoop,SignalDetector event;

    %% 5. Pluggable Commerce Engine
    subgraph CommerceEngine["PLUGGABLE COMMERCE ENGINE"]
        StrategyRegistry["CommerceAdvisor Abstraction<br/>(StrategyRegistry Pattern)"]
        RuleStrategy["RuleBasedCommerceStrategy<br/>(+10% Low Stock, +5% Spike, Reorder Formula)"]
        AIStrategy["AICommerceStrategy<br/>(Contextual Prompts & Resilience)"]
    end
    class StrategyRegistry,RuleStrategy,AIStrategy event;

    %% 6. AI Intelligence Tier
    subgraph AITier["AI INTELLIGENCE TIER (Google Gemini)"]
        GeminiClient["GeminiClient<br/>(JSON Schema Mode + 8s Timeout)"]
        AIValidator["AIValidator<br/>(Price Bounds 0.1x-10x, Integer Qty, Conf Bounds)"]
    end
    class GeminiClient,AIValidator ai;

    %% 7. Human Review Tier
    subgraph HumanTier["HUMAN-IN-THE-LOOP CONTROL"]
        HumanReview{"Merchandiser Decision<br/>(Accept / Reject)"}
        StateMutation["Product State Mutation<br/>(Price Update / Stock Replenish)"]
    end
    class HumanReview,StateMutation human;

    %% Connections & Data Flow
    UI_Catalog -->|"1. Simulate Sale / Edit Stock"| RestApi
    RestApi --> ProdService
    ProdService -->|"2. State Update"| DB_Product
    ProdService -->|"3. Publish Domain Event"| EventBus
    
    EventBus -.->|"4. Async Non-blocking Dispatch"| AgenticLoop
    AgenticLoop -->|"5. Evaluate Catalog State"| SignalDetector
    SignalDetector -->|"6. Signal Detected"| StrategyRegistry
    
    StrategyRegistry -->|"COMMERCE_STRATEGY='rule'"| RuleStrategy
    StrategyRegistry -->|"COMMERCE_STRATEGY='ai'"| AIStrategy
    
    AIStrategy -->|"7. Build Situational Prompt"| GeminiClient
    GeminiClient -->|"8. Raw LLM JSON"| AIValidator
    AIValidator -->|"Valid Response"| DB_Suggestions
    AIValidator -.->|"Timeout / Bounds Failure<br/>(Transparent Fallback)"| RuleStrategy
    RuleStrategy --> DB_Suggestions

    DB_Suggestions -->|"9. 5s Live Polling / Refresh"| UI_Review
    UI_Review -->|"10. Human Review Action"| HumanReview
    
    HumanReview -->|"ACCEPT"| StateMutation
    HumanReview -->|"REJECT"| DB_Suggestions
    StateMutation -->|"11. Mutate Live Catalog"| DB_Product
```

---

## 3. UML Component & Interface Architecture

```mermaid
classDiagram
    class CommerceAdvisor {
        <<abstract>>
        +suggestPricing(product, context) Promise~PricingRecommendation~
        +suggestReorder(product, context) Promise~ReorderRecommendation~
    }

    class RuleBasedCommerceStrategy {
        +suggestPricing(product, context) Promise~PricingRecommendation~
        +suggestReorder(product, context) Promise~ReorderRecommendation~
    }

    class AICommerceStrategy {
        -client: GeminiClient
        -fallbackStrategy: CommerceAdvisor
        +suggestPricing(product, context) Promise~PricingRecommendation~
        +suggestReorder(product, context) Promise~ReorderRecommendation~
    }

    class StrategyRegistry {
        -strategies: Map~string, CommerceAdvisor~
        +register(keys, strategyInstance)
        +get(strategyName) CommerceAdvisor
        +list() string[]
    }

    class GeminiClient {
        -apiKey: string
        -modelName: string
        -timeoutMs: number
        +generateJson(prompt, options) Promise~Object~
    }

    class AIValidator {
        +validateAndNormalizePricing(raw, product, context)
        +validateAndNormalizeReorder(raw, product, context)
    }

    class SignalDetector {
        +detectSignals(product, categoryAvg) SignalEvaluation
    }

    class AgenticLoop {
        -detector: SignalDetector
        -registry: StrategyRegistry
        +processProductSignal(productId, options)
        +handleInventoryEvent(event)
    }

    class EventBus {
        -listeners: Map~string, Function[]~
        +publish(eventType, payload)
        +subscribe(eventType, callback)
    }

    CommerceAdvisor <|-- RuleBasedCommerceStrategy
    CommerceAdvisor <|-- AICommerceStrategy
    StrategyRegistry o-- CommerceAdvisor
    AICommerceStrategy --> GeminiClient : uses
    AICommerceStrategy --> AIValidator : validates with
    AICommerceStrategy --> RuleBasedCommerceStrategy : falls back to
    AgenticLoop --> SignalDetector : detects with
    AgenticLoop --> StrategyRegistry : resolves strategy from
    EventBus --> AgenticLoop : dispatches to
```

---

## 4. End-to-End Execution Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Merchandiser as Merchandiser (Console)
    participant Client as React Client (Mantine)
    participant API as Express Server
    participant DB as MongoDB
    participant Bus as EventBus (In-Process)
    participant Worker as AgenticLoop Worker
    participant AI as AICommerceStrategy
    participant Gemini as Google Gemini API
    
    %% Phase 1: Order Simulation
    Merchandiser->>Client: Click "Simulate Sale"
    Client->>API: POST /api/products/PRD-003/orders
    API->>DB: Decrement Stock (8 -> 7 units)
    API->>Bus: publish(ORDER_SIMULATED, { productId })
    API-->>Client: 201 Created (Stock: 7, Velocity: 13) [15ms response]
    
    %% Phase 2: Asynchronous Agentic Loop
    Bus-->>Worker: handleInventoryEvent(event)
    Worker->>DB: Fetch Product & Category Average
    Worker->>Worker: SignalDetector: INVENTORY_LOW (7 < 15)
    Worker->>DB: Check Deduplication (No PENDING suggestion)
    
    %% Phase 3: AI Reasoning & Validation
    Worker->>AI: suggestPricing(product, { INVENTORY_LOW })
    AI->>Gemini: generateJson(Situational Prompt) [Timeout: 8s]
    Gemini-->>AI: { recommendedPrice: 27.49, direction: "INCREASE", confidence: 0.85 }
    AI->>AI: AIValidator: Bounds Check (0.1x <= 27.49 <= 10x) -> VALID
    AI-->>Worker: Validated Pricing Recommendation
    Worker->>DB: Save PricingSuggestion (status: PENDING)
    Worker->>DB: Transition Product status -> PRICE_REVIEW_PENDING
    
    %% Phase 4: Human Review & Approval
    Client->>API: GET /api/pricing-suggestions?status=PENDING (5s Polling)
    API-->>Client: Returns Pending Proposal ($24.99 -> $27.49)
    Merchandiser->>Client: Review Proposal & Click "Accept"
    Client->>API: PATCH /api/pricing-suggestions/:id/accept
    API->>DB: Update Suggestion status -> ACCEPTED
    API->>DB: Update Live Product currentPrice -> $27.49
    API-->>Client: 200 OK (Product Updated)
```

---

## 5. Key Architectural Pillars

| Pillar | Implementation | Technical Advantage |
|---|---|---|
| **1. Asynchronous Decoupling** | In-process `EventBus` via `setImmediate` | User-facing API mutations complete in < 15ms without blocking on LLM latency. |
| **2. Pluggable Strategy** | `CommerceAdvisor` base contract & `StrategyRegistry` | Open/Closed Principle: Add new strategies (e.g. `CompetitorAwareStrategy`) with zero changes to existing controllers. |
| **3. AI Resilience & Safety** | `AIValidator` + 8000ms timeout + `RuleBasedCommerceStrategy` fallback | Zero downtime, guaranteed valid numbers, and 100% protection against hallucinated values entering MongoDB. |
| **4. Idempotency** | Trigger-scoped deduplication in `AgenticLoop` | Prevents duplicate proposal spam during high-volume sales bursts. |
| **5. Human-in-the-Loop** | Dedicated Approval Modals & REST mutation endpoints | Full human oversight prevents unintended autonomous price swings. |
