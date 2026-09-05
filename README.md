# RecoverAI – AI Revenue Recovery Command Center

RecoverAI is an enterprise-grade AI-powered payment revenue recovery platform designed for fintechs, payment gateways, and high-volume merchants. Built with the design and operational rigor suitable for a **Razorpay AI Builder** submission, RecoverAI autonomously evaluates failed digital transactions, determines decline root causes, computes recovery probabilities, chooses optimal recovery strategies, and executes controlled recoveries within strict merchant guardrails.

---

## The Problem

Payment declines represent billions of dollars in lost annual GMV across Indian and global payment ecosystems:
- **Blind automated retries** irritate customers, spike interchange dispute rates, and risk duplicate debits or merchant account lockouts.
- **Generic decline handling** treats transient infrastructure timeouts (such as UPI PSP delays or bank switch lag) the same as permanent instruments failures (such as expired cards or wrong CVVs).
- **Fintech operations and risk teams** lack granular, real-time command visibility into which failed transactions are legitimately recoverable versus those requiring cardholder intervention.

---

## The RecoverAI Solution

RecoverAI transforms brute-force payment retries into an intelligent, closed-loop revenue recovery pipeline:
1. **Root Cause Analysis**: Classifies decline subcodes, payment rail idiosyncrasies (UPI, Cards, Net Banking, Wallets), and previous attempt counts.
2. **Predictive Recovery Scoring**: Computes dynamic recovery probability (0–100%) and Expected Recovery Value (`Amount x Probability / 100`).
3. **Strategic Action Dispatching**: Determines the mathematically optimal next step (`RETRY_NOW`, `WAIT_AND_RETRY`, `CONTACT_CUSTOMER`, `ALTERNATE_PAYMENT_METHOD`, or `STOP_RECOVERY`).
4. **Autonomous Policy & Guardrail Enforcement**: Halts retries when threshold limits are met, locks out terminal failures, and pauses high-value transactions according to merchant policy.
5. **Controlled Execution & Batch Simulation**: Simulates automated captures or batches recoveries with full audit traceability.
6. **Centralized State Machine**: Guarantees complete post-recovery state consistency across the entire user experience. Once a payment is captured, risk is permanently `RESOLVED`, probability is `100%`, and duplicate retries are strictly locked out.

---

## 5-Section Command Center Architecture

RecoverAI features a clean, responsive fintech Command Center organized into 5 operational sections:

### 1. Command Center (Executive Overview)
- **Top-Level KPI Cards**: Tracks Total Transactions, Revenue at Risk, Potentially Recoverable, Recovered Revenue, and Net Recovery Rate.
- **Revenue Recovery Breakdown Bar**: Visual proportion comparing total revenue at risk, expected recovery volume, and captured revenue.
- **Baseline vs RecoverAI Performance Comparison**: Demonstrates incremental revenue gain and percentage lift over standard naive retry models.
- **Priority Recovery Queue**: Instant view of the highest expected-value transactions awaiting intelligent recovery action.

### 2. Recovery Queue (Operational Workbench)
- **Granular Filter Chips**: Filter instantly by `All`, `High Probability (>=75%)`, `Medium Probability (40-74%)`, `Low Probability (<40%)`, `Needs Intervention`, `Blocked by Guardrail`, and `Recovered`.
- **Search & Multi-Column Sorting**: Search across Customer, Transaction ID, Failure Reason, or Rail, and sort by Amount, Recovery Probability, Expected Value, or Attempts.
- **Slide-Over Transaction Drawer**: Deep-dive inspection showing:
  - Payment Overview & Expected Value
  - Live Recovery Guard Meter & Status
  - AI Recovery Intelligence & Reasoning
  - One-Click Customer Notification Dispatcher with clipboard copy
  - Historical Analysis Audit Timeline

### 3. Recovery Analytics (BI & Observability)
- **Revenue at Risk vs Recovered**: Compares at-risk capital against successful captures and incremental lift.
- **Decline Reason Breakdown**: Recovery rates and volume captured across each distinct failure mode.
- **Payment Method Recovery Rates**: Benchmark performance across UPI, Credit Cards, Debit Cards, Net Banking, and Wallets.
- **Outcomes Distribution Grid**: Real-time counter of Recovered, Guard-Blocked, Intervention Required, and Pending Retry.
- **Recovery Success by Attempt Number**: Analysis demonstrating capture diminishing returns across retry attempts.

### 4. Strategy Intelligence Lab
- **Synthetic Historical Benchmark Matrix**: Comprehensive empirical dataset comparing recovery strategies across 8 failure categories (UPI Timeout, Bank Timeout, Network Error, 3DS Failure, Insufficient Funds, Expired Card, Invalid CVV, Payment Limit Exceeded).
- **Empirical Win-Rates**: Shows why specific strategies (e.g. `WAIT_AND_RETRY` vs `RETRY_NOW`) are chosen for specific failure codes.

### 5. Admin & Policy Brain
- **Configurable Merchant Policies**:
  - `Max Retries Allowed` (Default: 2)
  - `Minimum Recovery Probability Threshold` (Default: 75%)
  - `High-Value Intervention Threshold` (e.g. 10,000)
  - `Recovery Strategy Mode` (`BALANCED`, `AGGRESSIVE`, `CONSERVATIVE`, `FAST`)
  - `Automated Recovery Engine Toggle`
- **Instant System Status**: Live monitoring of active AI engine (`Gemini 2.5 Flash` or `Deterministic Fallback Engine`).

---

## Batch Simulation Engine

RecoverAI features an automated Batch Recovery simulator (`POST /api/simulate-batch`). Accessible via the header bar or the Recovery Queue:
- Scans all pending failed transactions in the ledger.
- Executes controlled recoveries on eligible, high-probability transactions.
- Enforces guardrails on capped transactions and flags non-recoverable cards for customer contact.
- Returns an executive summary of recovered capital, blocked transactions, and intervention volume.

---

## Dual-Engine Intelligence: Gemini AI + Deterministic Fallback

RecoverAI operates with zero external dependencies out of the box while seamlessly leveraging Google's Gemini models when configured:

1. **Deterministic Rule Engine (Built-in)**:
   - Always available offline.
   - Evaluates decline codes, attempt counts, and payment rails using industry-standard recovery heuristics.
2. **Gemini AI Engine (`gemini-2.5-flash`)**:
   - Activated automatically when `GEMINI_API_KEY` is present.
   - Provides deep, contextual reasoning for merchant teams and generates empathetic, brand-aligned customer notification copy.
   - Uses the official `google-genai` SDK.

---

## Quick Demo Scenarios (Ready for Judging)

The dataset comes pre-seeded with 5 targeted hackathon scenarios accessible directly from the Recovery Queue:

- **Scenario 1 (TX1001)**: UPI Bank Timeout (1 attempt) -> `WAIT_AND_RETRY`. High probability (88%). Retry succeeds.
- **Scenario 2 (TX1002)**: Credit Card Insufficient Funds (1 attempt) -> `CONTACT_CUSTOMER`. Machine retry paused to prevent cardholder fees.
- **Scenario 3 (TX1003)**: Debit Card Expired Card (1 attempt) -> `ALTERNATE_PAYMENT_METHOD`. Terminal decline.
- **Scenario 4 (TX1004)**: Net Banking Bank Timeout (2 attempts) -> `STOP_RECOVERY`. **Guardrail enforced!** Capped at 2 retries. Button locked.
- **Scenario 5 (TX1005)**: UPI Timeout (1 attempt) -> Execute Recovery -> Demonstrates state consistency: status becomes `RECOVERED`, probability becomes 100%, risk becomes `RESOLVED`, button permanently locks.

---

## Tech Stack

- **Backend**: Python 3.10+, Flask 3.x, Pandas
- **AI / LLM**: Google Gemini API (`gemini-2.5-flash`) via `google-genai` SDK with deterministic fallback
- **Frontend**: Semantic HTML5, Custom Fintech CSS3 Design System, Modern Vanilla JavaScript (ES6+)
- **Testing & Verification**: Playwright E2E browser automation, custom Python test suites
- **Data Layer**: In-memory Pandas DataFrame persisted to synthetic CSV

---

## Installation & Setup

1. **Prerequisites**: Python 3.10 or higher.
2. **Install Dependencies**: `pip install -r requirements.txt`
3. **Configure Gemini (Optional)**: Set `GEMINI_API_KEY` in `.env` if desired.
4. **Launch Server**: `python app.py`
5. **Open Dashboard**: `http://127.0.0.1:5000`

---

## Disclaimers & Limitations

- **Synthetic Data**: All transaction identifiers, customer details, and bank decline responses are synthetic mock data generated for testing and demonstration.
- **Simulation Environment**: Recovery execution is simulated within the application environment and does not connect to live banking networks or debit real accounts.
