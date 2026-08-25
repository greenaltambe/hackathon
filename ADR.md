# StockPulse — Architecture Decision Records (ADRs)

This document records the foundational architecture decisions for the **StockPulse** AI Inventory & Dynamic Pricing Engine, following the **Context → Options → Decision → Tradeoffs** structure specified in the StockPulse specification.

---

## ADR-1: Commerce Logic Placement

### Context
StockPulse requires dynamic pricing calculations, inventory replenishment rules, and LLM reasoning. We needed to decide where this commerce logic resides to prevent service classes or domain models from accumulating mixed responsibilities (persistence, HTTP transport, event dispatching, and pricing math).

### Options Considered
1. **Fat Domain Models / Active Record**: Embed pricing formulas and AI calls directly inside the `Product` Mongoose model.
2. **Service Layer Accumulation**: Place pricing calculations and AI calls inside `productService.js`.
3. **Dedicated Strategy/Advisor Component (Chosen)**: Encapsulate pricing and replenishment logic behind an abstract `CommerceAdvisor` component hierarchy (`src/services/commerce/`).

### Decision
We chose **Option 3: Dedicated Advisor Component**. All commerce logic is encapsulated behind the `CommerceAdvisor` contract. `RuleBasedCommerceStrategy` and `AICommerceStrategy` implement this interface independently. The `productService` handles domain orchestration and persistence, while `signalDetector` and `agenticLoop` consume `CommerceAdvisor` without knowledge of strategy internals.

### Tradeoffs
- *Cost*: Introduces additional files and interfaces (`commerceAdvisor.js`, `strategyRegistry.js`).
- *Benefit*: Clean single responsibility principle (SRP), 100% testability with deterministic mocks, and zero leakage of AI or rule algorithms into controllers or database models.

---

## ADR-2: Unified vs Split AI Advisor Contracts

### Context
StockPulse generates two distinct types of recommendations: dynamic pricing proposals and inventory replenishment purchase orders. We evaluated whether to execute a single unified prompt/call returning both recommendations or separate calls.

### Options Considered
1. **Single Unified LLM Call**: One prompt requesting both pricing recommendations and reorder quantities in a single JSON payload.
2. **Split LLM Calls (Chosen)**: Separate dedicated contracts (`generatePricingSuggestion`, `generateReorderSuggestion`) with distinct situational prompt engineering.

### Decision
We chose **Option 2: Split Dedicated Contracts with Situational Context**. Low-stock decisions and demand-spike pricing adjustments require different analytical lenses. A single low-stock prompt allows the LLM to evaluate price protection vs inventory movement without conflating reorder supplier lead times. Furthermore, separate methods allow **independent fallback**: if reorder validation fails, the pricing suggestion can still succeed without discarding the entire response.

### Tradeoffs
- *Cost*: Requires two modular method contracts and prompt definitions.
- *Benefit*: Granular error isolation, tailored situational prompting ("Two prompts, not one"), and independent retry/fallback mechanisms.

---

## ADR-3: Runtime Strategy Switching Mechanism

### Context
The commerce engine must support dynamic switching between `rule` and `ai` strategies at runtime via configuration (`COMMERCE_STRATEGY`), allowing Sprint 2 extensions (such as `CompetitorAwareStrategy`) to plug in seamlessly without code changes or restarts.

### Options Considered
1. **Hardcoded Conditionals / If-Else**: Inspect `process.env.COMMERCE_STRATEGY` inside controllers before every call.
2. **Strategy Registry Pattern (Chosen)**: Central `StrategyRegistry` mapping strategy keys to `CommerceAdvisor` instances.

### Decision
We chose **Option 2: StrategyRegistry**. `StrategyRegistry.getStrategy(name)` resolves strategy implementations dynamically. Callers across HTTP endpoints (`POST /suggest-pricing`) and asynchronous event workers (`AgenticLoop`) interact exclusively with the resolved `CommerceAdvisor` contract.

### Tradeoffs
- *Cost*: Requires upfront registry registration.
- *Benefit*: Adding a new strategy (e.g. `CompetitorAwareStrategy`) only requires implementing `CommerceAdvisor` and calling `StrategyRegistry.register('competitor', new CompetitorStrategy())`. Existing code remains untouched (Open/Closed Principle).

---

## ADR-4: LLM Failure Handling & Resilience

### Context
External LLM APIs (e.g., Google Gemini) are subject to network timeouts, rate limit quotas, JSON parsing failures, and hallucinated out-of-bounds numbers (e.g. $0 or $1,000,000). The recommendation loop must never fail silently or drop recommendations.

### Options Considered
1. **Fail-Fast / Error Propagation**: Throw an HTTP 500 error or abort the asynchronous loop if the LLM fails.
2. **Transparent Rule-Based Fallback with Input Validation (Chosen)**: Wrap LLM execution in timeout guards, validate all outputs against strict sanity bounds, and automatically fall back to `RuleBasedCommerceStrategy` on any failure.

### Decision
We chose **Option 2: Transparent Fallback with AIValidator**:
1. **Timeout Guard**: 8000ms timeout using `Promise.race()`.
2. **Schema & Sanity Bounds**: `aiValidator.js` enforces positive numbers, price bounds ($0.1\times \le \text{price} \le 10\times$), integer reorder quantities, and valid confidence ($0.0 \le c \le 1.0$).
3. **Graceful Degradation**: On any catch (timeout, quota, malformed JSON, validation error), log a sanitized diagnostic and delegate directly to `RuleBasedCommerceStrategy`.

### Tradeoffs
- *Cost*: Fallback recommendations use deterministic percentage rules (+10% / +5%) rather than deep LLM reasoning.
- *Benefit*: Zero silent drops, 100% uptime for recommendation generation, and total protection against invalid data entering MongoDB.

---

## ADR-5: Agentic Loop Decoupling & Idempotency

### Context
Inventory signals (stock updates and order simulations) must trigger recommendation generation automatically without blocking customer-facing HTTP requests. Repeated triggers must not create duplicate pending recommendations.

### Options Considered
1. **Scheduled Polling Worker / Cron**: A periodic timer checking MongoDB every N minutes.
2. **Synchronous Execution**: Running AI/rule recommendation directly within `POST /orders`.
3. **Decoupled Asynchronous EventBus with Deduplication (Chosen)**: Non-blocking in-process `EventBus` using `setImmediate()`, dedicated `SignalDetector`, and pending suggestion deduplication.

### Decision
We chose **Option 3**:
1. **Non-blocking EventBus**: `orderService` publishes `ORDER_SIMULATED` or `INVENTORY_CHANGED` and immediately returns HTTP 200/201 to the client.
2. **Signal Detection**: `SignalDetector` evaluates `INVENTORY_LOW` (stock < threshold) and `DEMAND_SPIKE` (velocity > 2× category average).
3. **Deduplication**: `AgenticLoop` queries MongoDB for existing `PENDING` suggestions matching the same product, trigger reason, and suggestion type. If found, duplicate creation is skipped.

### Tradeoffs
- *Cost*: In-process event emitter is suitable for single-node / demonstration environments; multi-node clustering would use Redis/RabbitMQ.
- *Benefit*: Customer orders complete in <15ms without waiting for AI generation; merchandisers receive exactly one actionable pending recommendation per alert.

---

## ADR-6: Extensibility & Sprint 2/3 Seams

### Context
The application must be designed with Sprint 2 (competitor pricing, margin floors, supplier catalogs) and Sprint 3 (automated purchase orders, bundle pricing) in mind.

### Options Considered
1. **Minimal Surface**: Only implement fields strictly used in Phase 1.
2. **Explicit Architectural Seams (Chosen)**: Add extension placeholders and architectural seams across models, services, and strategies.

### Decision
We chose **Option 2**:
1. **Product Schema Seams**: Added nullable extension fields `costPrice`, `marginFloor`, and `supplierId` to `Product.js`.
2. **Strategy Extension Seam**: `StrategyRegistry` allows adding `CompetitorAwareStrategy` without modifying `productService` or `agenticLoop`.
3. **Deliberate Exclusions**: Autonomous auto-publishing of prices (Sprint 3) and direct competitor scraping (Sprint 2) are intentionally deferred to protect the core human-in-the-loop approval workflow.

### Tradeoffs
- *Cost*: Schema includes fields not actively populated in Phase 1 seed data.
- *Benefit*: Upgrading to Sprint 2 requires zero schema migrations or breaking changes to existing models.
