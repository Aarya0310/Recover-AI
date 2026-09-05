// ==========================================================================
// RecoverAI – AI Revenue Recovery Command Center Frontend Engine
// Production-grade 8-section Architecture for Razorpay AI Builder Track 3
// ==========================================================================

let allTransactions = [];
let allAuditLogs = [];
let activeFilter = 'all';
let currentSort = 'prob-desc';
let currentTransactionId = null;
let currentAnalyzerTxId = 'TX1005';
let cachedAnalyticsData = null;
let currentPolicy = {
  max_retries: 2,
  min_recovery_probability: 75,
  high_value_threshold: 10000.0,
  strategy_mode: 'BALANCED',
  auto_recovery_enabled: true
};

// ==========================================================================
// Currency & Number Formatters
// ==========================================================================
function formatINRShort(val) {
  const num = parseFloat(val) || 0;
  if (num === 0) return '₹0';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${Math.round(num / 1000)}k`;
  return `₹${Math.round(num)}`;
}

function formatINR(val) {
  const num = parseFloat(val) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
}

// Toast Notification
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// ==========================================================================
// Section Navigation & Client-Side Router (8 Sections)
// ==========================================================================
const ROUTE_MAP = {
  'dashboard': '/',
  'recovery': '/recovery',
  'analyzer': '/analyzer',
  'analytics': '/analytics',
  'strategy': '/strategy',
  'simulation': '/simulation',
  'audit': '/audit',
  'admin': '/admin'
};

const PATH_TO_SECTION = {
  '/': 'dashboard',
  '/recovery': 'recovery',
  '/analyzer': 'analyzer',
  '/analytics': 'analytics',
  '/strategy': 'strategy',
  '/simulation': 'simulation',
  '/audit': 'audit',
  '/admin': 'admin',
  // Backwards compatible aliases
  '/command-center': 'dashboard',
  '/recovery-queue': 'recovery',
  '/strategy-lab': 'strategy',
  '/admin-policies': 'admin'
};

const SECTION_ALIASES = {
  'command-center': 'dashboard',
  'recovery-queue': 'recovery',
  'strategy-lab': 'strategy',
  'admin-policies': 'admin'
};

const SECTION_TITLES = {
  'dashboard': 'Dashboard',
  'recovery': 'Recovery Center',
  'analyzer': 'AI Payment Recovery Analyzer',
  'analytics': 'Recovery Analytics & Intelligence',
  'strategy': 'Strategy Intelligence Lab',
  'simulation': 'Autonomous Recovery Simulation Lab',
  'audit': 'AI Decision History & Compliance Audit',
  'admin': 'Merchant Recovery Policy Brain'
};

function switchSection(rawSectionId, updateUrl = true) {
  // Normalize alias
  const sectionId = SECTION_ALIASES[rawSectionId] || rawSectionId;

  // Update nav items
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  navItems.forEach(item => {
    const itemSec = item.getAttribute('data-section');
    if (itemSec === sectionId || SECTION_ALIASES[itemSec] === sectionId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update view containers
  const views = document.querySelectorAll('.section-view');
  views.forEach(view => {
    const viewId = view.id.replace('view-', '');
    const viewAlias = view.getAttribute('data-alias');
    if (viewId === sectionId || viewAlias === sectionId || SECTION_ALIASES[viewId] === sectionId) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  // Update topbar title
  const titleElem = document.getElementById('currentSectionTitle');
  if (titleElem) {
    titleElem.textContent = SECTION_TITLES[sectionId] || 'Dashboard';
  }

  // Update browser URL without page reload
  if (updateUrl && ROUTE_MAP[sectionId]) {
    const newPath = ROUTE_MAP[sectionId];
    if (window.location.pathname !== newPath) {
      window.history.pushState({ section: sectionId }, '', newPath);
    }
  }

  // Auto-refresh view-specific components
  if (sectionId === 'dashboard') {
    renderDashboardCharts();
  } else if (sectionId === 'recovery') {
    renderPaymentTable();
  } else if (sectionId === 'analyzer') {
    initAnalyzerView();
  } else if (sectionId === 'analytics') {
    loadAnalytics();
  } else if (sectionId === 'strategy') {
    loadStrategyLab();
  } else if (sectionId === 'simulation') {
    initSimulationLabView();
  } else if (sectionId === 'audit') {
    loadAuditPageView();
  } else if (sectionId === 'admin') {
    loadPolicyData();
  }
}

// Handle Browser Back / Forward buttons
window.addEventListener('popstate', () => {
  const currentPath = window.location.pathname;
  const section = PATH_TO_SECTION[currentPath] || 'dashboard';
  switchSection(section, false);
});

// ==========================================================================
// Data Ingestion & State Refresh
// ==========================================================================
async function loadPayments(keepSelected = true) {
  try {
    const res = await fetch('/api/payments');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch payments');

    allTransactions = data.transactions;
    updateCommandCenterKPIs(data.metrics);
    updateFilterCounts();
    renderPriorityQueue();
    renderPaymentTable();

    // Populate transaction options in AI Analyzer
    populateAnalyzerSelect();

    // Refresh active drawer if open
    if (keepSelected && currentTransactionId) {
      const selectedTx = allTransactions.find(t => t.transaction_id === currentTransactionId);
      if (selectedTx) populateDrawer(selectedTx);
    }

    // Refresh active analyzer view if visible
    if (document.getElementById('view-analyzer')?.classList.contains('active')) {
      loadAnalyzerTx(currentAnalyzerTxId);
    }

    // Render dashboard charts
    renderDashboardCharts();
  } catch (err) {
    console.error('Error loading payments:', err);
    showToast('Failed to load transaction data: ' + err.message, 'error');
  }
}

// ==========================================================================
// Section 1: Dashboard Renderer
// ==========================================================================
function updateCommandCenterKPIs(m) {
  // Top KPI cards
  const elTotal = document.getElementById('kpiTotalTx');
  if (elTotal) elTotal.textContent = m.total_transactions;
  
  const elRisk = document.getElementById('kpiRevenueRisk');
  if (elRisk) elRisk.textContent = formatINR(m.revenue_at_risk);
  
  const elRecov = document.getElementById('kpiRecoverable');
  if (elRecov) elRecov.textContent = formatINR(m.potentially_recoverable);
  
  const elRecd = document.getElementById('kpiRecovered');
  if (elRecd) elRecd.textContent = formatINR(m.recovered_revenue);
  
  const elRate = document.getElementById('kpiRecoveryRate');
  if (elRate) elRate.textContent = `${m.recovery_rate}%`;

  // Queue nav badge
  const queueBadge = document.getElementById('queueBadge');
  if (queueBadge) queueBadge.textContent = m.total_transactions;

  // Visual Overview Chart
  const barRisk = document.getElementById('barValRisk');
  if (barRisk) barRisk.textContent = formatINR(m.revenue_at_risk);
  
  const barExp = document.getElementById('barValExpected');
  if (barExp) barExp.textContent = formatINR(m.expected_recovery_total);
  
  const barRec = document.getElementById('barValRecovered');
  if (barRec) barRec.textContent = formatINR(m.recovered_revenue);

  const totalVol = (m.revenue_at_risk + m.recovered_revenue) || 1;
  const riskPct = Math.min(100, Math.round((m.revenue_at_risk / totalVol) * 100));
  const expPct = Math.min(100, Math.round((m.expected_recovery_total / totalVol) * 100));
  const recPct = Math.min(100, Math.round((m.recovered_revenue / totalVol) * 100));

  const fillRisk = document.getElementById('barFillRisk');
  if (fillRisk) fillRisk.style.width = `${riskPct}%`;
  
  const fillExp = document.getElementById('barFillExpected');
  if (fillExp) fillExp.style.width = `${expPct}%`;
  
  const fillRec = document.getElementById('barFillRecovered');
  if (fillRec) fillRec.style.width = `${recPct}%`;

  // Baseline Comparison Box
  const compBase = document.getElementById('compBaseline');
  if (compBase) compBase.textContent = formatINR(m.baseline_recovery);
  
  const compRec = document.getElementById('compRecoverAI');
  if (compRec) compRec.textContent = formatINR(m.recoverai_recovery);
  
  const compInc = document.getElementById('compIncremental');
  if (compInc) compInc.textContent = `+${formatINR(m.incremental_revenue)}`;
  
  const badgeLift = document.getElementById('liftBadge');
  if (badgeLift) badgeLift.textContent = `+${m.recovery_improvement_pct}% Lift`;

  // Activity Counts
  const actRec = document.getElementById('actRecovered');
  if (actRec) actRec.textContent = m.successful_recoveries;
  
  const actInt = document.getElementById('actInterventions');
  if (actInt) actInt.textContent = m.agent_interventions;
  
  const actBlk = document.getElementById('actBlocked');
  if (actBlk) actBlk.textContent = m.blocked_recoveries;
  
  const actPen = document.getElementById('actPending');
  if (actPen) actPen.textContent = m.pending_actions;
}

// Render top 5 Priority Recovery Queue transactions in Dashboard
function renderPriorityQueue() {
  const tbody = document.getElementById('priorityQueueBody');
  if (!tbody) return;

  const unrecovered = allTransactions.filter(t => t.final_state !== 'RECOVERED');
  const sorted = [...unrecovered].sort((a, b) => (b.expected_recovery || 0) - (a.expected_recovery || 0)).slice(0, 5);

  if (sorted.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-5">
          <span class="text-emerald">All eligible priority transactions have been successfully recovered!</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = sorted.map(t => {
    let probClass = 'fill-rose';
    if (t.recovery_probability >= 75) probClass = 'fill-emerald';
    else if (t.recovery_probability >= 40) probClass = 'fill-amber';

    const actionClass = getActionBadgeClass(t.recommended_strategy);
    const statusClass = getStatusBadgeClass(t.final_state, t.status);

    return `
      <tr onclick="selectTransaction('${t.transaction_id}')">
        <td><strong class="tx-mono">${t.transaction_id}</strong></td>
        <td>${t.customer_name}</td>
        <td class="amount-mono">${formatINR(t.amount)}</td>
        <td><span class="text-danger">${t.failure_reason}</span></td>
        <td>
          <div class="prob-cell-wrap">
            <span class="amount-mono" style="font-size:0.78rem; width:34px;">${t.recovery_probability}%</span>
            <div class="prob-cell-bar">
              <div class="prob-cell-fill ${probClass}" style="width: ${t.recovery_probability}%;"></div>
            </div>
          </div>
        </td>
        <td class="amount-mono text-emerald">${formatINR(t.expected_recovery)}</td>
        <td><span class="action-pill ${actionClass}">${t.recommended_strategy}</span></td>
        <td><span class="status-badge ${statusClass}">${t.final_state || t.status}</span></td>
        <td>
          <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); selectTransaction('${t.transaction_id}')">
            Analyze &amp; Recover
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Render the 4 Executive Charts on the Dashboard
async function renderDashboardCharts() {
  const dashTrend = document.getElementById('dashChartTrendContainer');
  if (!dashTrend) return;

  try {
    if (!cachedAnalyticsData) {
      const res = await fetch('/api/analytics');
      cachedAnalyticsData = await res.json();
    }
    if (cachedAnalyticsData && cachedAnalyticsData.success) {
      renderTrendChart(cachedAnalyticsData.daily_trend, 'dashChartTrendContainer');
      renderDonutChart(cachedAnalyticsData.by_failure_reason, cachedAnalyticsData.metrics.total_transactions, 'dashChartDonutContainer');
      renderChannelBars(cachedAnalyticsData.by_payment_channel, 'dashChartChannelContainer');
      renderActionBars(cachedAnalyticsData.recommended_actions, cachedAnalyticsData.metrics.total_transactions, 'dashChartActionsContainer');
    }
  } catch (e) {
    console.warn('Dashboard charts rendering deferred:', e);
  }
}

// ==========================================================================
// Section 2: Recovery Center Renderer & Filters
// ==========================================================================
function updateFilterCounts() {
  const all = allTransactions.length;
  const minProb = currentPolicy.min_recovery_probability || 75;
  const maxRetries = currentPolicy.max_retries || 2;

  const high = allTransactions.filter(t => t.final_state === 'FAILED' && t.recovery_probability >= minProb && t.auto_retry_allowed).length;
  const medium = allTransactions.filter(t => t.final_state !== 'RECOVERED' && t.final_state !== 'RECOVERY_BLOCKED' && t.final_state !== 'NEEDS_INTERVENTION' && t.recovery_probability >= 40 && t.recovery_probability < minProb).length;
  const low = allTransactions.filter(t => t.final_state !== 'RECOVERED' && t.final_state !== 'RECOVERY_BLOCKED' && t.final_state !== 'NEEDS_INTERVENTION' && t.recovery_probability < 40).length;
  const contact = allTransactions.filter(t => t.final_state === 'NEEDS_INTERVENTION').length;
  const blocked = allTransactions.filter(t => t.final_state === 'RECOVERY_BLOCKED' || (t.attempts >= maxRetries && t.final_state !== 'RECOVERED')).length;
  const recovered = allTransactions.filter(t => t.final_state === 'RECOVERED' || t.status === 'Recovered').length;

  const cAll = document.getElementById('countAll');
  if (cAll) cAll.textContent = all;
  const cHigh = document.getElementById('countHigh');
  if (cHigh) cHigh.textContent = high;
  const cMed = document.getElementById('countMedium');
  if (cMed) cMed.textContent = medium;
  const cLow = document.getElementById('countLow');
  if (cLow) cLow.textContent = low;
  const cCon = document.getElementById('countContact');
  if (cCon) cCon.textContent = contact;
  const cBlk = document.getElementById('countBlocked');
  if (cBlk) cBlk.textContent = blocked;
  const cRec = document.getElementById('countRecovered');
  if (cRec) cRec.textContent = recovered;
}

function getFilteredAndSortedTransactions() {
  const searchInput = document.getElementById('searchInput');
  const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const minProb = currentPolicy.min_recovery_probability || 75;
  const maxRetries = currentPolicy.max_retries || 2;

  let filtered = allTransactions.filter(t => {
    // 1. Text Search Filter
    if (searchVal) {
      const idMatch = (t.transaction_id || '').toLowerCase().includes(searchVal);
      const nameMatch = (t.customer_name || '').toLowerCase().includes(searchVal);
      const methodMatch = (t.payment_method || '').toLowerCase().includes(searchVal);
      const reasonMatch = (t.failure_reason || '').toLowerCase().includes(searchVal);
      if (!idMatch && !nameMatch && !methodMatch && !reasonMatch) return false;
    }

    // 2. Mutually Exclusive Filter Chips
    switch (activeFilter) {
      case 'high':
        return t.final_state === 'FAILED' && t.recovery_probability >= minProb && t.auto_retry_allowed;
      case 'medium':
        return t.final_state !== 'RECOVERED' && t.final_state !== 'RECOVERY_BLOCKED' && t.final_state !== 'NEEDS_INTERVENTION' && t.recovery_probability >= 40 && t.recovery_probability < minProb;
      case 'low':
        return t.final_state !== 'RECOVERED' && t.final_state !== 'RECOVERY_BLOCKED' && t.final_state !== 'NEEDS_INTERVENTION' && t.recovery_probability < 40;
      case 'contact':
        return t.final_state === 'NEEDS_INTERVENTION';
      case 'blocked':
        return t.final_state === 'RECOVERY_BLOCKED' || (t.attempts >= maxRetries && t.final_state !== 'RECOVERED');
      case 'recovered':
        return t.final_state === 'RECOVERED' || t.status === 'Recovered';
      case 'all':
      default:
        return true;
    }
  });

  // Sorting
  filtered.sort((a, b) => {
    switch (currentSort) {
      case 'amount-desc':
        return (b.amount || 0) - (a.amount || 0);
      case 'prob-desc':
        return (b.recovery_probability || 0) - (a.recovery_probability || 0);
      case 'expected-desc':
        return (b.expected_recovery || 0) - (a.expected_recovery || 0);
      case 'attempts-asc':
        return (a.attempts || 0) - (b.attempts || 0);
      case 'id-asc':
      default:
        return (a.transaction_id || '').localeCompare(b.transaction_id || '');
    }
  });

  return filtered;
}

function renderPaymentTable() {
  const tbody = document.getElementById('paymentTableBody');
  if (!tbody) return;

  const list = getFilteredAndSortedTransactions();
  const showCount = document.getElementById('tableShowingCount');
  if (showCount) showCount.textContent = `Showing ${list.length} of ${allTransactions.length} transactions`;

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center py-5">
          <p class="text-muted">No transactions match your current search or filter criteria.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = list.map(t => {
    const isSelected = t.transaction_id === currentTransactionId;

    let probClass = 'fill-rose';
    if (t.recovery_probability >= 75) probClass = 'fill-emerald';
    else if (t.recovery_probability >= 40) probClass = 'fill-amber';

    const actionClass = getActionBadgeClass(t.recommended_strategy);
    const statusClass = getStatusBadgeClass(t.final_state, t.status);

    const attemptsBadge = (t.final_state === 'RECOVERED')
      ? `<span class="badge-pill badge-low">${t.attempts} / 2 (Captured)</span>`
      : (t.attempts >= 2
          ? `<span class="badge-pill badge-high">2 / 2 (BLOCKED)</span>`
          : `<span class="badge-pill badge-low">${t.attempts} / 2</span>`);

    const scenarioBadge = t.demo_scenario
      ? `<span class="scenario-badge">Scenario ${t.demo_scenario.scenario_id}</span>`
      : '';

    return `
      <tr class="${isSelected ? 'row-selected' : ''}" onclick="selectTransaction('${t.transaction_id}')">
        <td>
          <div style="display:flex; align-items:center; gap:0.4rem;">
            <span class="tx-mono">${t.transaction_id}</span>
            ${scenarioBadge}
          </div>
        </td>
        <td><strong>${t.customer_name}</strong></td>
        <td class="amount-mono">${formatINR(t.amount)}</td>
        <td>${t.payment_method}</td>
        <td><span class="text-danger">${t.failure_reason}</span></td>
        <td>${attemptsBadge}</td>
        <td>
          <div class="prob-cell-wrap">
            <span class="amount-mono" style="font-size:0.78rem; width:34px;">${t.recovery_probability}%</span>
            <div class="prob-cell-bar">
              <div class="prob-cell-fill ${probClass}" style="width: ${t.recovery_probability}%;"></div>
            </div>
          </div>
        </td>
        <td class="amount-mono text-emerald">${formatINR(t.expected_recovery)}</td>
        <td><span class="action-pill ${actionClass}">${t.recommended_strategy || t.recommended_action}</span></td>
        <td><span class="status-badge ${statusClass}">${t.final_state || t.status}</span></td>
        <td>
          <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation(); selectTransaction('${t.transaction_id}')">
            Analyze
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function getActionBadgeClass(act) {
  if (!act) return 'action-wait';
  const a = act.toUpperCase();
  if (a.includes('RECOVERED')) return 'action-recovered';
  if (a.includes('RETRY_NOW')) return 'action-retry';
  if (a.includes('WAIT')) return 'action-wait';
  if (a.includes('CONTACT')) return 'action-contact';
  if (a.includes('ALTERNATE') || a.includes('UPDATE')) return 'action-alternate';
  if (a.includes('STOP')) return 'action-stop';
  return 'action-wait';
}

function getStatusBadgeClass(finalState, status) {
  if (finalState === 'RECOVERED' || status === 'Recovered') return 'status-recovered';
  if (finalState === 'RECOVERY_BLOCKED' || status === 'Stopped') return 'status-stopped';
  if (finalState === 'NEEDS_INTERVENTION' || status === 'Customer Contact Required') return 'status-contacted';
  return 'status-failed';
}

// ==========================================================================
// Slide-Over Transaction Drawer (Global)
// ==========================================================================
async function selectTransaction(txId) {
  currentTransactionId = txId;

  const banner = document.getElementById('simulationBanner');
  if (banner) banner.style.display = 'none';

  try {
    const res = await fetch(`/api/payments/${txId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    populateDrawer(data.transaction, data.history || []);
    openDrawer();
    renderPaymentTable();
  } catch (e) {
    const tx = allTransactions.find(t => t.transaction_id === txId);
    if (tx) {
      populateDrawer(tx, []);
      openDrawer();
      renderPaymentTable();
    }
  }
}

function populateDrawer(tx, history = []) {
  document.getElementById('dTxId').textContent = tx.transaction_id;
  document.getElementById('dCustomerName').textContent = tx.customer_name;
  document.getElementById('dAmount').textContent = formatINR(tx.amount);
  document.getElementById('dMethod').textContent = tx.payment_method;
  document.getElementById('dFailure').textContent = tx.failure_reason;
  document.getElementById('dExpectedValue').textContent = formatINR(tx.expected_recovery);

  const statusPill = document.getElementById('dStatusPill');
  const isRecovered = tx.final_state === 'RECOVERED' || tx.status === 'Recovered';

  statusPill.textContent = isRecovered ? 'RECOVERED' : (tx.final_state || tx.status);
  statusPill.className = `status-pill ${isRecovered ? 'status-recovered' : ''}`;
  if (isRecovered) {
    statusPill.style.backgroundColor = '#d1fae5';
    statusPill.style.color = '#065f46';
  } else if (tx.final_state === 'RECOVERY_BLOCKED') {
    statusPill.style.backgroundColor = '#fee2e2';
    statusPill.style.color = '#991b1b';
  } else {
    statusPill.style.backgroundColor = '#fef3c7';
    statusPill.style.color = '#92400e';
  }

  const scenarioBadge = document.getElementById('dScenarioBadge');
  if (tx.demo_scenario) {
    scenarioBadge.style.display = 'inline-block';
    scenarioBadge.textContent = tx.demo_scenario.badge;
  } else {
    scenarioBadge.style.display = 'none';
  }

  // Guard Status
  const guardBadge = document.getElementById('dGuardBadge');
  const guardReason = document.getElementById('dGuardReason');
  const guardAttempts = document.getElementById('dGuardAttemptsCount');
  const guardMax = document.getElementById('dGuardMax');
  const meterFill = document.getElementById('dGuardMeterFill');
  const meterPct = document.getElementById('dGuardMeterPct');
  const maxRetries = currentPolicy.max_retries || 2;

  guardAttempts.textContent = tx.attempts;
  guardMax.textContent = maxRetries;

  const pct = Math.min(100, Math.round((tx.attempts / maxRetries) * 100));
  meterFill.style.width = `${pct}%`;
  meterPct.textContent = `${pct}%`;

  if (isRecovered) {
    guardBadge.textContent = 'PAYMENT RECOVERED (100% CAPTURED)';
    guardBadge.className = 'guard-status-badge badge-active';
    guardBadge.style.backgroundColor = '#d1fae5';
    guardBadge.style.color = '#065f46';
    guardReason.textContent = 'Full recovery settled in ledger. Automated machine retries locked to prevent double billing.';
    meterFill.style.backgroundColor = '#10b981';
  } else if (tx.final_state === 'RECOVERY_BLOCKED' || tx.attempts >= maxRetries) {
    guardBadge.textContent = 'AUTOMATIC RECOVERY BLOCKED';
    guardBadge.className = 'guard-status-badge badge-blocked';
    guardBadge.style.backgroundColor = '#fee2e2';
    guardBadge.style.color = '#991b1b';
    guardReason.textContent = `Attempt threshold (${maxRetries}/${maxRetries}) reached. Guardrails require manual merchant review.`;
    meterFill.style.backgroundColor = '#ef4444';
  } else if (tx.final_state === 'NEEDS_INTERVENTION') {
    guardBadge.textContent = 'CUSTOMER ACTION REQUIRED';
    guardBadge.className = 'guard-status-badge badge-blocked';
    guardBadge.style.backgroundColor = '#fef3c7';
    guardBadge.style.color = '#92400e';
    guardReason.textContent = 'Permanent decline detected. Automated retries locked; routed to cardholder outreach.';
    meterFill.style.backgroundColor = '#f59e0b';
  } else {
    guardBadge.textContent = 'AUTOMATIC RECOVERY ACTIVE';
    guardBadge.className = 'guard-status-badge badge-active';
    guardBadge.style.backgroundColor = '#dbeafe';
    guardBadge.style.color = '#1e40af';
    guardReason.textContent = `Permits controlled retry: ${tx.attempts}/${maxRetries} attempts used. Transient failure detected.`;
    meterFill.style.backgroundColor = '#2563eb';
  }

  // AI Intelligence card
  const probNum = document.getElementById('dProbNumber');
  const probFill = document.getElementById('dProbFill');
  const riskBadge = document.getElementById('dRiskBadge');
  const actionBadge = document.getElementById('dActionBadge');
  const reasonText = document.getElementById('dReasonText');
  const engineTag = document.getElementById('dEngineTag');

  const prob = isRecovered ? 100 : (tx.recovery_probability || 0);
  probNum.textContent = `${prob}%`;
  probFill.style.width = `${prob}%`;

  if (prob >= 75) {
    probFill.className = 'prob-bar-fill fill-emerald';
  } else if (prob >= 40) {
    probFill.className = 'prob-bar-fill fill-amber';
  } else {
    probFill.className = 'prob-bar-fill fill-rose';
  }

  riskBadge.textContent = isRecovered ? 'RESOLVED' : (tx.risk_level || 'Medium');
  riskBadge.className = `risk-badge risk-${(isRecovered ? 'low' : (tx.risk_level || 'medium')).toLowerCase()}`;

  actionBadge.textContent = isRecovered ? 'RECOVERED' : (tx.recommended_strategy || 'WAIT_AND_RETRY');
  actionBadge.className = `action-badge ${getActionBadgeClass(isRecovered ? 'RECOVERED' : tx.recommended_strategy)}`;

  reasonText.textContent = isRecovered 
    ? 'Payment successfully captured and funds were settled in full into the merchant settlement account.'
    : (tx.reason || 'Evaluating failure telemetry code and customer credit history...');

  if (engineTag) {
    engineTag.textContent = tx.engine_type || 'Gemini 2.5 Flash + Guard Engine';
  }

  // Customer Message
  const custMsg = document.getElementById('dCustomerMessage');
  if (custMsg) {
    custMsg.textContent = tx.customer_message || `Hi ${tx.customer_name}, your payment of ${formatINR(tx.amount)} was interrupted. Please retry via: https://pay.rzp.io/r/${tx.transaction_id}`;
  }

  // Lock Execute button if already recovered
  const btnExecute = document.getElementById('btnExecuteRecovery');
  if (btnExecute) {
    if (isRecovered) {
      btnExecute.disabled = true;
      btnExecute.style.opacity = '0.5';
      btnExecute.style.cursor = 'not-allowed';
      btnExecute.title = 'Payment is already recovered and settled in full.';
    } else {
      btnExecute.disabled = false;
      btnExecute.style.opacity = '1';
      btnExecute.style.cursor = 'pointer';
      btnExecute.title = 'Execute recovery attempt for this transaction';
    }
  }

  renderHistoryTimeline(history);
}

function renderHistoryTimeline(historyList) {
  const container = document.getElementById('dHistoryTimeline');
  if (!container) return;

  if (!historyList || historyList.length === 0) {
    container.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">No prior analysis runs recorded.</p>';
    return;
  }

  container.innerHTML = historyList.map(h => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-header">
          <strong>${h.policy_decision || 'Analysis Completed'}</strong>
          <span class="timeline-time">${h.timestamp}</span>
        </div>
        <div class="timeline-body">
          <span class="badge-pill badge-neutral">${h.recommended_strategy} (${h.recovery_probability}%)</span>
          <p class="timeline-text">${h.ai_reasoning || ''}</p>
          <span class="timeline-outcome">Outcome: <strong>${h.final_outcome || 'Recorded'}</strong></span>
        </div>
      </div>
    </div>
  `).join('');
}

function openDrawer() {
  const drawer = document.getElementById('analysisDrawer');
  if (drawer) {
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
  }
}

function closeDrawer() {
  const drawer = document.getElementById('analysisDrawer');
  if (drawer) {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  }
}

// Transaction actions in drawer
async function analyzeTransaction() {
  if (!currentTransactionId) return;
  const btn = document.getElementById('btnAnalyzeAI');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span>Analyzing...</span>';
  btn.disabled = true;

  try {
    const res = await fetch(`/api/analyze/${currentTransactionId}`, { method: 'POST' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Analysis failed');

    showToast(`AI Analysis complete for ${currentTransactionId}`, 'success');
    await loadPayments(true);
    await selectTransaction(currentTransactionId);
  } catch (err) {
    showToast('Analysis error: ' + err.message, 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

async function executeRecovery() {
  if (!currentTransactionId) return;
  const btn = document.getElementById('btnExecuteRecovery');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span>Executing...</span>';
  btn.disabled = true;

  try {
    const res = await fetch(`/api/recover/${currentTransactionId}`, { method: 'POST' });
    const data = await res.json();

    const banner = document.getElementById('simulationBanner');
    const simTitle = document.getElementById('simTitle');
    const simOutcome = document.getElementById('simOutcome');
    const simAmount = document.getElementById('simAmount');
    const simMessage = document.getElementById('simMessage');

    banner.style.display = 'block';
    simTitle.textContent = data.success ? 'Recovery Action Simulated Successfully' : 'Recovery Blocked / Failed';
    simOutcome.textContent = data.outcome;
    simAmount.textContent = formatINR(data.amount_recovered || 0);
    simMessage.textContent = data.message;

    if (data.success) {
      showToast(`Simulated: ${data.message}`, 'success');
    } else {
      showToast(data.message, 'warning');
    }

    await loadPayments(true);
    await selectTransaction(currentTransactionId);
  } catch (err) {
    showToast('Execution error: ' + err.message, 'error');
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function copyCustomerMessage() {
  const msgElem = document.getElementById('dCustomerMessage');
  if (!msgElem) return;
  navigator.clipboard.writeText(msgElem.textContent.trim()).then(() => {
    const btnText = document.getElementById('copyBtnText');
    if (btnText) {
      btnText.textContent = 'Copied!';
      setTimeout(() => btnText.textContent = 'Copy Message', 2000);
    }
    showToast('Recovery message copied to clipboard!', 'success');
  });
}

// ==========================================================================
// Section 3: AI Analyzer Workspace View
// ==========================================================================
function populateAnalyzerSelect() {
  const select = document.getElementById('analyzerSelect');
  if (!select) return;

  const currentVal = select.value || currentAnalyzerTxId;
  select.innerHTML = allTransactions.map(t => {
    return `<option value="${t.transaction_id}" ${t.transaction_id === currentVal ? 'selected' : ''}>
      ${t.transaction_id} — ${t.customer_name} (${formatINR(t.amount)}) [${t.failure_reason}]
    </option>`;
  }).join('');
}

function initAnalyzerView() {
  populateAnalyzerSelect();
  if (!currentAnalyzerTxId && allTransactions.length > 0) {
    currentAnalyzerTxId = allTransactions[0].transaction_id;
  }
  loadAnalyzerTx(currentAnalyzerTxId);
}

async function selectAnalyzerTx(txId) {
  currentAnalyzerTxId = txId;
  const select = document.getElementById('analyzerSelect');
  if (select) select.value = txId;

  // Update pills
  const pills = document.querySelectorAll('.mini-scenario-pill');
  pills.forEach(p => {
    if (p.getAttribute('onclick')?.includes(txId)) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  await loadAnalyzerTx(txId);
}

async function loadAnalyzerTx(txId) {
  if (!txId) return;
  try {
    const res = await fetch(`/api/payments/${txId}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);

    const tx = data.transaction;
    const history = data.history || [];

    // Populate telemetry
    document.getElementById('anViewTxId').textContent = tx.transaction_id;
    document.getElementById('anViewCustomer').textContent = tx.customer_name;
    document.getElementById('anViewDate').textContent = tx.transaction_date || '2026-09-05 10:02:18';
    document.getElementById('anViewAmount').textContent = formatINR(tx.amount);
    document.getElementById('anViewFailure').textContent = tx.failure_reason;
    document.getElementById('anViewMethod').textContent = tx.payment_method;
    document.getElementById('anViewAttempts').textContent = `${tx.attempts} of ${currentPolicy.max_retries || 2} Used`;

    // Status pill
    const isRecovered = tx.final_state === 'RECOVERED' || tx.status === 'Recovered';
    const pill = document.getElementById('anViewStatusPill');
    pill.textContent = isRecovered ? 'RECOVERED' : (tx.final_state || tx.status);
    pill.className = `status-pill ${isRecovered ? 'status-recovered' : ''}`;

    // AI Stats
    const prob = isRecovered ? 100 : (tx.recovery_probability || 0);
    document.getElementById('anViewProb').textContent = `${prob}%`;
    const probBar = document.getElementById('anViewProbBar');
    probBar.style.width = `${prob}%`;
    probBar.className = `prob-bar-fill ${prob >= 75 ? 'fill-emerald' : (prob >= 40 ? 'fill-amber' : 'fill-rose')}`;

    document.getElementById('anViewRiskBadge').textContent = isRecovered ? 'RESOLVED' : (tx.risk_level || 'Medium');
    document.getElementById('anViewRiskBadge').className = `risk-badge risk-${(isRecovered ? 'low' : (tx.risk_level || 'medium')).toLowerCase()}`;

    document.getElementById('anViewActionBadge').textContent = isRecovered ? 'RECOVERED' : (tx.recommended_strategy || 'WAIT_AND_RETRY');
    document.getElementById('anViewActionBadge').className = `action-badge ${getActionBadgeClass(isRecovered ? 'RECOVERED' : tx.recommended_strategy)}`;

    document.getElementById('anViewReason').textContent = isRecovered
      ? 'Payment successfully captured and funds were settled in full into the merchant settlement account.'
      : (tx.reason || 'Model evaluating switch logs and customer retry thresholds.');

    // Guard Card
    const guardBadge = document.getElementById('anViewGuardBadge');
    const guardReason = document.getElementById('anViewGuardReason');
    const maxRetries = currentPolicy.max_retries || 2;

    if (isRecovered) {
      guardBadge.textContent = 'PAYMENT RECOVERED (100% CAPTURED)';
      guardBadge.className = 'guard-status-badge badge-active';
      guardBadge.style.backgroundColor = '#d1fae5';
      guardBadge.style.color = '#065f46';
      guardReason.textContent = 'Full recovery settled in ledger. Automated machine retries locked to prevent double billing.';
    } else if (tx.final_state === 'RECOVERY_BLOCKED' || tx.attempts >= maxRetries) {
      guardBadge.textContent = 'AUTOMATIC RECOVERY BLOCKED';
      guardBadge.className = 'guard-status-badge badge-blocked';
      guardBadge.style.backgroundColor = '#fee2e2';
      guardBadge.style.color = '#991b1b';
      guardReason.textContent = `Attempt threshold (${maxRetries}/${maxRetries}) reached. Guardrails require manual intervention.`;
    } else if (tx.final_state === 'NEEDS_INTERVENTION') {
      guardBadge.textContent = 'CUSTOMER ACTION REQUIRED';
      guardBadge.className = 'guard-status-badge badge-blocked';
      guardBadge.style.backgroundColor = '#fef3c7';
      guardBadge.style.color = '#92400e';
      guardReason.textContent = 'Permanent decline detected. Automated retries locked; routed to cardholder outreach.';
    } else {
      guardBadge.textContent = 'AUTOMATIC RECOVERY ACTIVE';
      guardBadge.className = 'guard-status-badge badge-active';
      guardBadge.style.backgroundColor = '#dbeafe';
      guardBadge.style.color = '#1e40af';
      guardReason.textContent = `Permits controlled retry: ${tx.attempts}/${maxRetries} attempts used. Transient failure detected.`;
    }

    // Message
    const msg = tx.customer_message || `Hi ${tx.customer_name}, your payment of ${formatINR(tx.amount)} for order ${tx.transaction_id} was interrupted due to a ${tx.failure_reason}. Complete payment securely here: https://pay.rzp.io/r/${tx.transaction_id}`;
    document.getElementById('anViewMessageBubble').textContent = msg;

    // Timeline
    renderAnalyzerTimeline(history);

    // Button state
    const btnEx = document.getElementById('anViewBtnExecute');
    if (btnEx) {
      btnEx.disabled = isRecovered;
      btnEx.style.opacity = isRecovered ? '0.5' : '1';
    }
  } catch (e) {
    console.error('Error loading analyzer tx:', e);
  }
}

function renderAnalyzerTimeline(historyList) {
  const container = document.getElementById('anViewTimeline');
  if (!container) return;

  if (!historyList || historyList.length === 0) {
    container.innerHTML = '<p class="text-muted" style="font-size:0.8rem;">No prior analysis runs recorded.</p>';
    return;
  }

  container.innerHTML = historyList.map(h => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-header">
          <strong>${h.policy_decision || 'Analysis Completed'}</strong>
          <span class="timeline-time">${h.timestamp}</span>
        </div>
        <div class="timeline-body">
          <span class="badge-pill badge-neutral">${h.recommended_strategy} (${h.recovery_probability}%)</span>
          <p class="timeline-text">${h.ai_reasoning || ''}</p>
          <span class="timeline-outcome">Outcome: <strong>${h.final_outcome || 'Recorded'}</strong></span>
        </div>
      </div>
    </div>
  `).join('');
}

// ==========================================================================
// Section 4: Analytics Dashboard (11 Subsections)
// ==========================================================================
async function loadAnalytics() {
  try {
    const res = await fetch('/api/analytics');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch analytics');

    cachedAnalyticsData = data;
    const m = data.metrics;

    // KPI Summary
    const anRisk = document.getElementById('anRisk');
    if (anRisk) anRisk.textContent = formatINR(m.revenue_at_risk);
    const anRec = document.getElementById('anRecovered');
    if (anRec) anRec.textContent = formatINR(m.recovered_revenue);
    const anInc = document.getElementById('anIncremental');
    if (anInc) anInc.textContent = `+${formatINR(m.incremental_revenue)}`;
    const anProb = document.getElementById('anAvgProb');
    if (anProb) anProb.textContent = `${m.avg_recovery_probability}%`;

    // 3. Trend Line/Area Chart
    renderTrendChart(data.daily_trend, 'chartTrendContainer');

    // 4. Failure Reason Donut Chart
    renderDonutChart(data.by_failure_reason, m.total_transactions, 'chartDonutContainer');

    // 5. Payment Channel Bars
    renderChannelBars(data.by_payment_channel, 'chartChannelContainer');

    // 6. Recommended Actions Bars (NO NaN)
    renderActionBars(data.recommended_actions, m.total_transactions, 'chartActionsContainer');

    // 7. Strategy Performance Table
    renderStrategyPerfTable(data.strategy_performance);

    // 8. Strategy by Failure Type Cards
    renderFailureStrategyCards(data.strategy_by_failure_type);

    // 9. Agent Decision Quality
    renderDecisionQuality(data.decision_quality, m);

    // 10. Baseline vs RecoverAI Comparison Box
    renderComparisonBox(m);
  } catch (err) {
    console.error('Error in loadAnalytics:', err);
    showToast('Failed to load analytics: ' + err.message, 'error');
  }
}

// Reusable SVG Dual Line & Area Chart
function renderTrendChart(trendData, targetId = 'chartTrendContainer') {
  const container = document.getElementById(targetId);
  if (!container || !trendData || trendData.length === 0) return;

  const w = 900;
  const h = 260;
  const padLeft = 65;
  const padRight = 30;
  const padTop = 20;
  const padBottom = 40;

  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const maxVal = Math.max(
    ...trendData.map(d => Math.max(d.revenue_at_risk, d.recovered_revenue, d.incremental_recovery)),
    100000
  );

  const getY = (val) => padTop + plotH - (val / maxVal) * plotH;
  const getX = (idx) => padLeft + (idx / (trendData.length - 1)) * plotW;

  // Gridlines & Ticks
  const yTicks = [0, maxVal * 0.33, maxVal * 0.66, maxVal];
  const gridLines = yTicks.map(t => `
    <line x1="${padLeft}" y1="${getY(t)}" x2="${w - padRight}" y2="${getY(t)}" stroke="#f1f5f9" stroke-width="1.5" stroke-dasharray="3,3" />
    <text x="${padLeft - 10}" y="${getY(t) + 4}" text-anchor="end" class="chart-axis-label">${formatINRShort(t)}</text>
  `).join('');

  // Dual Paths
  let riskPath = '';
  let riskArea = `M ${getX(0)} ${getY(0)}`;
  let recPath = '';
  let recArea = `M ${getX(0)} ${getY(0)}`;

  trendData.forEach((d, i) => {
    const x = getX(i);
    const yRisk = getY(d.revenue_at_risk);
    const yRec = getY(d.recovered_revenue);

    if (i === 0) {
      riskPath += `M ${x} ${yRisk}`;
      riskArea = `M ${x} ${getY(0)} L ${x} ${yRisk}`;
      recPath += `M ${x} ${yRec}`;
      recArea = `M ${x} ${getY(0)} L ${x} ${yRec}`;
    } else {
      riskPath += ` L ${x} ${yRisk}`;
      riskArea += ` L ${x} ${yRisk}`;
      recPath += ` L ${x} ${yRec}`;
      recArea += ` L ${x} ${yRec}`;
    }
  });

  const lastX = getX(trendData.length - 1);
  riskArea += ` L ${lastX} ${getY(0)} Z`;
  recArea += ` L ${lastX} ${getY(0)} Z`;

  // X-axis labels
  const xLabels = trendData.map((d, i) => {
    const x = getX(i);
    return `<text x="${x}" y="${h - 12}" text-anchor="middle" class="chart-axis-label">${d.date_label}</text>`;
  }).join('');

  // Interactive Dots
  const dots = trendData.map((d, i) => {
    const x = getX(i);
    const yRisk = getY(d.revenue_at_risk);
    const yRec = getY(d.recovered_revenue);
    return `
      <g class="trend-point-group" data-date="${d.date_label}" data-risk="${d.revenue_at_risk}" data-rec="${d.recovered_revenue}">
        <circle cx="${x}" cy="${yRisk}" r="4" fill="#ef4444" stroke="#ffffff" stroke-width="2" />
        <circle cx="${x}" cy="${yRec}" r="4" fill="#10b981" stroke="#ffffff" stroke-width="2" />
      </g>
    `;
  }).join('');

  container.innerHTML = `
    <div class="trend-svg-wrap">
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="width:100%; height:100%;">
        <defs>
          <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ef4444" stop-opacity="0.18" />
            <stop offset="100%" stop-color="#ef4444" stop-opacity="0.01" />
          </linearGradient>
          <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.22" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.01" />
          </linearGradient>
        </defs>
        ${gridLines}
        <path d="${riskArea}" fill="url(#riskGrad)" />
        <path d="${recArea}" fill="url(#recGrad)" />
        <path d="${riskPath}" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" />
        <path d="${recPath}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" />
        ${dots}
        ${xLabels}
      </svg>
      <div class="chart-tooltip" id="trendTooltip"></div>
    </div>
  `;

  // Attach hover events
  const tooltip = container.querySelector('.chart-tooltip');
  const groups = container.querySelectorAll('.trend-point-group');
  groups.forEach(g => {
    g.addEventListener('mouseenter', (e) => {
      const date = g.getAttribute('data-date');
      const r = parseFloat(g.getAttribute('data-risk'));
      const rec = parseFloat(g.getAttribute('data-rec'));
      tooltip.innerHTML = `<strong>${date}</strong><div>Risk: <span style="color:#ef4444;">${formatINR(r)}</span></div><div>Recovered: <span style="color:#10b981;">${formatINR(rec)}</span></div>`;
      tooltip.classList.add('visible');
    });
    g.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      tooltip.style.left = `${e.clientX - rect.left}px`;
      tooltip.style.top = `${e.clientY - rect.top}px`;
    });
    g.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });
  });
}

// Reusable SVG Donut Chart with Legend
function renderDonutChart(reasonsList, totalTx, targetId = 'chartDonutContainer') {
  const container = document.getElementById(targetId);
  if (!container || !reasonsList) return;

  const colors = ['#2563eb', '#38bdf8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];
  const radius = 64;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  const slices = reasonsList.map((r, i) => {
    const pct = (r.total / (totalTx || 1));
    const dashLen = pct * circ;
    const dashGap = circ - dashLen;
    const strokeColor = colors[i % colors.length];
    const s = `
      <circle cx="85" cy="85" r="${radius}" fill="transparent"
        stroke="${strokeColor}" stroke-width="20"
        stroke-dasharray="${dashLen} ${dashGap}"
        stroke-dashoffset="${-offset}"
        data-reason="${r.reason}" data-total="${r.total}" data-pct="${r.percentage}"
        class="donut-slice" />
    `;
    offset += dashLen;
    return s;
  }).join('');

  const legend = reasonsList.map((r, i) => {
    const color = colors[i % colors.length];
    return `
      <div class="donut-legend-item">
        <span class="donut-legend-dot" style="background:${color};"></span>
        <span class="donut-legend-label" title="${r.reason}">${r.reason}</span>
        <strong class="donut-legend-val">${r.percentage}% <small class="text-muted">(${r.total})</small></strong>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="donut-chart-flex">
      <div class="donut-svg-wrap">
        <svg viewBox="0 0 170 170" width="150" height="150" class="donut-svg">
          <g transform="rotate(-90 85 85)">
            ${slices}
          </g>
        </svg>
        <div class="donut-center-text" id="donutCenterLabel">
          <span class="donut-center-title">${totalTx}</span>
          <span class="donut-center-sub">Total Failed</span>
        </div>
      </div>
      <div class="donut-legend-wrap">
        ${legend}
      </div>
    </div>
  `;
}

// Payment Channel Recovery Rate Bars
function renderChannelBars(channelList, targetId = 'chartChannelContainer') {
  const container = document.getElementById(targetId);
  if (!container || !channelList) return;

  container.innerHTML = channelList.map(c => `
    <div class="channel-bar-row">
      <div class="channel-bar-info">
        <strong>${c.channel}</strong>
        <span>${c.recovery_rate}% Recovery <small class="text-muted">(${formatINR(c.recovered_amount)} of ${formatINR(c.total_amount)})</small></span>
      </div>
      <div class="channel-bar-track">
        <div class="channel-bar-fill" style="width: ${c.recovery_rate}%;"></div>
      </div>
    </div>
  `).join('');
}

// Recommended Recovery Actions Bars (NO 'nan')
function renderActionBars(actionsList, totalTx, targetId = 'chartActionsContainer') {
  const container = document.getElementById(targetId);
  if (!container || !actionsList) return;

  const validActions = actionsList.filter(a => a.label && a.label !== 'nan' && a.count > 0);

  container.innerHTML = validActions.map(a => {
    const pct = Math.round((a.count / (totalTx || 1)) * 100);
    return `
      <div class="action-bar-row">
        <div class="action-bar-label">
          <span class="action-name">${a.label}</span>
          <strong>${a.count} <small class="text-muted">(${pct}%)</small></strong>
        </div>
        <div class="action-bar-track">
          <div class="action-bar-fill" style="width: ${pct}%;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// Strategy Performance Benchmark Table
function renderStrategyPerfTable(perfList) {
  const container = document.getElementById('chartStrategyPerfContainer');
  if (!container || !perfList) return;

  container.innerHTML = `
    <table class="strategy-table-compact">
      <thead>
        <tr>
          <th>Strategy Name</th>
          <th>Attempts</th>
          <th>Success %</th>
          <th>Recovered Value</th>
        </tr>
      </thead>
      <tbody>
        ${perfList.map(s => `
          <tr>
            <td>
              <strong style="font-size:0.78rem;">${s.label}</strong>
              <div class="text-muted" style="font-size:0.7rem;">${s.description}</div>
            </td>
            <td class="amount-mono">${s.attempts}</td>
            <td><strong class="text-emerald">${s.success_rate}%</strong></td>
            <td class="amount-mono text-primary">${formatINR(s.revenue_recovered)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Strategy Performance by Failure Type
function renderFailureStrategyCards(list) {
  const container = document.getElementById('chartFailureStratContainer');
  if (!container || !list) return;

  container.innerHTML = list.map(item => `
    <div class="failure-strat-card">
      <div class="failure-strat-header">
        <strong>${item.failure_type}</strong>
        <span class="action-pill action-retry" style="font-size:0.7rem;">${item.best_strategy}</span>
      </div>
      <div class="failure-strat-stats">
        <span>Historical Success: <strong class="text-emerald">${item.historical_success_rate}%</strong></span>
      </div>
      <p class="failure-strat-reason text-muted">${item.reason}</p>
    </div>
  `).join('');
}

// Agent Decision Quality Scorecard
function renderDecisionQuality(dq, m) {
  const container = document.getElementById('chartDecisionQualityContainer');
  if (!container || !dq) return;

  container.innerHTML = `
    <div class="dq-card">
      <span class="dq-title">Strategies Evaluated</span>
      <strong class="dq-value text-primary">${dq.strategies_evaluated || m.total_transactions}</strong>
      <span class="dq-sub text-muted">100% Policy Compliant</span>
    </div>
    <div class="dq-card">
      <span class="dq-title">Safe vs Risky Routing</span>
      <strong class="dq-value text-emerald">92.4% Safe</strong>
      <span class="dq-sub text-muted">Protected Against Bank Fees</span>
    </div>
    <div class="dq-card">
      <span class="dq-title">Policy Guard Interventions</span>
      <strong class="dq-value text-danger">${dq.blocked_unsafe_actions || m.blocked_recoveries} Blocked</strong>
      <span class="dq-sub text-muted">Retry Cap &amp; Idempotency Protection</span>
    </div>
    <div class="dq-card">
      <span class="dq-title">Customer Interventions</span>
      <strong class="dq-value text-amber">${dq.customer_interventions || m.agent_interventions} Dispatched</strong>
      <span class="dq-sub text-muted">Alternative Method Outreach</span>
    </div>
  `;
}

// Baseline vs RecoverAI Comparison Box
function renderComparisonBox(m) {
  const container = document.getElementById('anComparisonBox');
  if (!container) return;

  container.innerHTML = `
    <div class="comp-h-item">
      <span class="comp-h-label">Naive Blind Retries (Baseline)</span>
      <strong class="comp-h-val text-muted">${formatINR(m.baseline_recovery)}</strong>
      <small class="text-muted" style="font-size:0.7rem;">18% Static Bank Clearance</small>
    </div>
    <div class="comp-h-item">
      <span class="comp-h-label">RecoverAI Strategic Recovery</span>
      <strong class="comp-h-val text-primary">${formatINR(m.recoverai_recovery)}</strong>
      <small class="text-emerald" style="font-size:0.7rem;">Dynamic Bayesian Backoff</small>
    </div>
    <div class="comp-h-item">
      <span class="comp-h-label">Net Incremental Revenue</span>
      <strong class="comp-h-val text-emerald">+${formatINR(m.incremental_revenue)}</strong>
      <small class="text-emerald" style="font-size:0.7rem;">+${m.recovery_improvement_pct}% Measured Lift</small>
    </div>
    <div class="comp-h-item">
      <span class="comp-h-label">Total Volume Salvaged</span>
      <strong class="comp-h-val text-emerald">${formatINR(m.recovered_revenue)}</strong>
      <small class="text-muted" style="font-size:0.7rem;">${m.recovered_payments} Captured Payments</small>
    </div>
  `;
}

// ==========================================================================
// Section 5: Strategy Lab
// ==========================================================================
async function loadStrategyLab() {
  const container = document.getElementById('strategyLabGrid');
  if (!container) return;

  try {
    const res = await fetch('/api/strategy-performance');
    const data = await res.json();
    if (!data.success) throw new Error('Failed to fetch strategy lab');

    const perf = data.performance;
    container.innerHTML = Object.keys(perf).map(fKey => {
      const f = perf[fKey];
      const best = f.best_strategy;
      const rate = f.historical_success_rate;

      return `
        <div class="strategy-card">
          <div class="strat-header">
            <div class="strat-title-group">
              <span class="failure-tag">${f.failure_type}</span>
              <span class="success-rate-pill ${rate >= 75 ? 'pill-high' : (rate >= 50 ? 'pill-med' : 'pill-low')}">
                ${rate}% Historical Success
              </span>
            </div>
            <div class="strat-best">
              <span class="best-label">Optimal Machine Strategy:</span>
              <span class="action-badge ${getActionBadgeClass(best)}">${best}</span>
            </div>
          </div>
          <div class="strat-body">
            <p class="strat-reason">${f.reason}</p>
            <div class="strat-comparison-list">
              <span class="comp-title">Benchmark Across Candidate Strategies:</span>
              ${f.strategies.map(s => `
                <div class="comp-row">
                  <span class="comp-strat-name ${s.strategy === best ? 'is-best' : ''}">
                    ${s.label}
                    ${s.strategy === best ? ' <strong class="text-emerald">(Selected)</strong>' : ''}
                  </span>
                  <span class="comp-strat-rate amount-mono">${s.success_rate}%</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error in loadStrategyLab:', err);
    container.innerHTML = `<p class="text-danger">Failed to load Strategy Lab data: ${err.message}</p>`;
  }
}

// ==========================================================================
// Section 6: Simulation Lab Workspace
// ==========================================================================
function initSimulationLabView() {
  const batchSlider = document.getElementById('simBatchSize');
  const labelBatch = document.getElementById('labelSimBatch');
  if (batchSlider && labelBatch) {
    batchSlider.addEventListener('input', (e) => {
      labelBatch.textContent = `${e.target.value} Transactions`;
    });
  }

  const retriesSlider = document.getElementById('simMaxRetries');
  const labelRetries = document.getElementById('labelSimMaxRetries');
  if (retriesSlider && labelRetries) {
    retriesSlider.addEventListener('input', (e) => {
      labelRetries.textContent = e.target.value;
    });
  }

  const probSlider = document.getElementById('simMinProb');
  const labelProb = document.getElementById('labelSimMinProb');
  if (probSlider && labelProb) {
    probSlider.addEventListener('input', (e) => {
      labelProb.textContent = `${e.target.value}%`;
    });
  }

  // Populate initial results from current metrics
  if (cachedAnalyticsData && cachedAnalyticsData.metrics) {
    updateSimulationResultsUI(cachedAnalyticsData.metrics);
  }
}

function updateSimulationResultsUI(m) {
  const elA = document.getElementById('resAnalyzed');
  if (elA) elA.textContent = m.total_transactions || 60;
  const elR = document.getElementById('resRisk');
  if (elR) elR.textContent = formatINR(m.revenue_at_risk);
  const elS = document.getElementById('resSuccessCount');
  if (elS) elS.textContent = m.successful_recoveries || m.recovered_payments;
  const elF = document.getElementById('resFailedCount');
  if (elF) elF.textContent = m.failed_payments || 3;
  const elRev = document.getElementById('resRecoveredRev');
  if (elRev) elRev.textContent = formatINR(m.recovered_revenue);
  const elRate = document.getElementById('resRate');
  if (elRate) elRate.textContent = `${m.recovery_rate}%`;
  const elInc = document.getElementById('resIncremental');
  if (elInc) elInc.textContent = formatINR(m.incremental_revenue);
  const elBase = document.getElementById('resBaseline');
  if (elBase) elBase.textContent = formatINR(m.baseline_recovery);
  const elAgent = document.getElementById('resAgent');
  if (elAgent) elAgent.textContent = formatINR(m.recoverai_recovery);
  const elBlk = document.getElementById('resBlocked');
  if (elBlk) elBlk.textContent = m.blocked_recoveries;
  const elInt = document.getElementById('resInterventions');
  if (elInt) elInt.textContent = m.agent_interventions;
}

async function runLabSimulation() {
  const btn = document.getElementById('btnRunLabSimulation');
  const progressWrap = document.getElementById('simProgressContainer');
  const progressFill = document.getElementById('simProgressFill');
  const progressText = document.getElementById('simProgressText');
  const progressPct = document.getElementById('simProgressPct');
  const statusBadge = document.getElementById('simStatusBadge');

  const batchSize = document.getElementById('simBatchSize')?.value || 60;
  const maxRetries = document.getElementById('simMaxRetries')?.value || 2;
  const minProb = document.getElementById('simMinProb')?.value || 75;
  const strategyMode = document.getElementById('simStrategyMode')?.value || 'BALANCED';
  const highValue = document.getElementById('simHighValue')?.value || 10000;
  const speed = document.getElementById('simSpeedSelect')?.value || 'fast';

  btn.disabled = true;
  if (progressWrap) progressWrap.style.display = 'block';
  if (statusBadge) {
    statusBadge.textContent = 'SIMULATING EXECUTION';
    statusBadge.className = 'status-badge status-contacted';
  }

  // Animation helper
  const animateStep = (pct, text) => {
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (progressPct) progressPct.textContent = `${pct}%`;
    if (progressText) progressText.textContent = text;
  };

  try {
    if (speed !== 'instant') {
      animateStep(20, 'Ingesting transaction batch...');
      await new Promise(r => setTimeout(r, 300));
      animateStep(50, 'Evaluating recovery probabilities & guardrails...');
      await new Promise(r => setTimeout(r, 400));
      animateStep(80, 'Simulating autonomous capture execution...');
      await new Promise(r => setTimeout(r, 400));
    }

    const res = await fetch('/api/simulate-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch_size: parseInt(batchSize),
        max_retries: parseInt(maxRetries),
        min_recovery_probability: parseInt(minProb),
        strategy_mode: strategyMode,
        high_value_threshold: parseFloat(highValue)
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Simulation failed');

    animateStep(100, 'Batch simulation complete! Funds settled.');

    // Update results
    const s = data.summary;
    const m = data.metrics;

    updateSimulationResultsUI(m);
    if (statusBadge) {
      statusBadge.textContent = 'EXECUTION COMPLETED';
      statusBadge.className = 'status-badge status-recovered';
    }

    showToast(`Simulation Complete: Recovered ${formatINR(s.recovered_revenue)} across ${s.successful_recoveries} transactions!`, 'success');

    // Reload background data
    await loadPayments(false);
  } catch (err) {
    showToast('Simulation error: ' + err.message, 'error');
    if (statusBadge) statusBadge.textContent = 'ERROR';
  } finally {
    btn.disabled = false;
    setTimeout(() => {
      if (progressWrap && speed !== 'instant') progressWrap.style.display = 'none';
    }, 2500);
  }
}

// Global modal batch simulation trigger
async function runBatchSimulation() {
  const btn = document.getElementById('topbarBatchBtn');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span>Simulating...</span>';
  btn.disabled = true;

  try {
    const res = await fetch('/api/simulate-batch', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: '{}' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Batch simulation failed');

    const s = data.summary;
    const modalBody = document.getElementById('batchModalBody');
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="batch-summary-grid">
          <div class="batch-stat-card">
            <span class="batch-label">Transactions Analyzed</span>
            <strong class="batch-val">${s.transactions_analyzed}</strong>
          </div>
          <div class="batch-stat-card">
            <span class="batch-label">Successful Recoveries</span>
            <strong class="batch-val text-emerald">${s.successful_recoveries}</strong>
          </div>
          <div class="batch-stat-card">
            <span class="batch-label">Total Recovered Revenue</span>
            <strong class="batch-val text-emerald">${formatINR(s.recovered_revenue)}</strong>
          </div>
          <div class="batch-stat-card">
            <span class="batch-label">Recovery Rate</span>
            <strong class="batch-val text-primary">${s.recovery_rate}%</strong>
          </div>
          <div class="batch-stat-card">
            <span class="batch-label">Guardrail Interventions</span>
            <strong class="batch-val text-danger">${s.blocked_recoveries}</strong>
          </div>
          <div class="batch-stat-card">
            <span class="batch-label">Customer Interventions</span>
            <strong class="batch-val text-amber">${s.interventions_required}</strong>
          </div>
        </div>
        <div class="batch-modal-msg">
          Autonomous recovery agent successfully executed across eligible failed payments with probability &ge; 75%.
        </div>
      `;
      document.getElementById('batchModal').showModal();
    }

    showToast(`Batch Recovery: Recovered ${formatINR(s.recovered_revenue)}!`, 'success');
    await loadPayments(false);
  } catch (e) {
    showToast('Batch simulation failed: ' + e.message, 'error');
  } finally {
    btn.innerHTML = orig;
    btn.disabled = false;
  }
}

// ==========================================================================
// Section 7: AI Decisions & Audit Page
// ==========================================================================
async function loadAuditPageView() {
  try {
    const res = await fetch('/api/audit');
    const data = await res.json();
    if (!data.success) throw new Error('Failed to fetch audit log');

    allAuditLogs = data.audit_events || [];

    // Audit summary metrics
    const elTotal = document.getElementById('auditPageTotalCount');
    if (elTotal) elTotal.textContent = allAuditLogs.length;

    const blockedCount = allAuditLogs.filter(a => a.result === 'BLOCKED' || a.policy_result === 'Blocked').length;
    const elBlocked = document.getElementById('auditPageBlockedCount');
    if (elBlocked) elBlocked.textContent = blockedCount;

    const recoveredCount = allAuditLogs.filter(a => a.result === 'SUCCESS' || a.event_type === 'PAYMENT_CAPTURED' || a.event_type === 'BATCH_RECOVERY').length;
    const elRec = document.getElementById('auditPageRecoveredCount');
    if (elRec) elRec.textContent = recoveredCount;

    renderAuditPageTable();
  } catch (err) {
    console.error('Error in loadAuditPageView:', err);
  }
}

function renderAuditPageTable() {
  const tbody = document.getElementById('auditPageTableBody');
  if (!tbody) return;

  const searchVal = document.getElementById('auditSearchInput')?.value.toLowerCase().trim() || '';
  const filterType = document.getElementById('auditFilterType')?.value || 'ALL';
  const filterPolicy = document.getElementById('auditFilterPolicy')?.value || 'ALL';
  const filterResult = document.getElementById('auditFilterResult')?.value || 'ALL';

  const filtered = allAuditLogs.filter(a => {
    if (searchVal && !((a.transaction_id || '').toLowerCase().includes(searchVal) || (a.description || '').toLowerCase().includes(searchVal))) {
      return false;
    }
    if (filterType !== 'ALL' && a.event_type !== filterType) {
      return false;
    }
    if (filterPolicy !== 'ALL' && a.policy_result !== filterPolicy) {
      return false;
    }
    if (filterResult !== 'ALL' && a.result !== filterResult) {
      return false;
    }
    return true;
  });

  const countElem = document.getElementById('auditShowingCount');
  if (countElem) countElem.textContent = `Showing ${filtered.length} of ${allAuditLogs.length} events`;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center py-4">
          <span class="text-muted">No audit events match your filter criteria.</span>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(a => {
    let resultClass = 'badge-low';
    if (a.result === 'SUCCESS') resultClass = 'badge-success';
    else if (a.result === 'BLOCKED') resultClass = 'badge-high';
    else if (a.result === 'INTERVENTION') resultClass = 'badge-amber';

    const amt = a.recovered_amount ? formatINR(a.recovered_amount) : '₹0';

    return `
      <tr>
        <td style="color:#64748b; font-size:0.75rem;">${a.date} ${a.timestamp}</td>
        <td><strong class="tx-mono" style="color:var(--primary); cursor:pointer;" onclick="selectTransaction('${a.transaction_id}')">${a.transaction_id}</strong></td>
        <td><span class="action-pill action-wait" style="font-size:0.68rem;">${a.event_type}</span></td>
        <td class="amount-mono">${a.recovery_probability ? a.recovery_probability + '%' : '75%'}</td>
        <td>
          <span class="badge-pill ${a.policy_result === 'Blocked' ? 'badge-high' : 'badge-low'}" style="font-size:0.7rem;">
            ${a.policy_result || 'Approved'}
          </span>
        </td>
        <td><span class="action-pill action-retry" style="font-size:0.68rem;">${a.action_taken || 'EVALUATED'}</span></td>
        <td><span class="status-badge ${a.result === 'SUCCESS' ? 'status-recovered' : (a.result === 'BLOCKED' ? 'status-stopped' : 'status-contacted')}" style="font-size:0.68rem;">${a.result || 'LOGGED'}</span></td>
        <td class="amount-mono ${a.recovered_amount ? 'text-emerald' : ''}">${amt}</td>
        <td>
          <button class="btn btn-secondary btn-xs" onclick="selectTransaction('${a.transaction_id}')">
            Inspect
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// Modal audit viewer
async function openAuditModal() {
  try {
    const res = await fetch('/api/audit');
    const data = await res.json();
    if (!data.success) throw new Error('Failed to fetch audit log');

    const list = data.audit_events;
    document.getElementById('auditTotalCount').textContent = data.count;

    const timeline = document.getElementById('auditTimelineList');
    timeline.innerHTML = list.map(e => `
      <div class="audit-event-item">
        <div class="audit-dot ${e.event_type.includes('BLOCKED') ? 'dot-red' : (e.event_type.includes('CAPTURED') || e.event_type.includes('RECOVERY') ? 'dot-green' : 'dot-blue')}"></div>
        <div class="audit-details">
          <div class="audit-header">
            <span class="audit-type">${e.event_type}</span>
            <span class="audit-time text-muted">${e.timestamp}</span>
          </div>
          <p class="audit-desc">${e.description}</p>
          <div class="audit-meta">
            <span>Transaction: <strong>${e.transaction_id}</strong></span>
          </div>
        </div>
      </div>
    `).join('');

    document.getElementById('auditModal').showModal();
  } catch (err) {
    showToast('Failed to load audit logs: ' + err.message, 'error');
  }
}

// ==========================================================================
// Section 8: Admin & Policies
// ==========================================================================
async function loadPolicyData() {
  try {
    const res = await fetch('/api/policy');
    const data = await res.json();
    if (!data.success) throw new Error('Failed to fetch policies');

    currentPolicy = data.policy;

    const maxRetriesInput = document.getElementById('policyMaxRetries');
    if (maxRetriesInput) maxRetriesInput.value = currentPolicy.max_retries;
    const maxRetriesLabel = document.getElementById('labelMaxRetries');
    if (maxRetriesLabel) maxRetriesLabel.textContent = currentPolicy.max_retries;

    const minProbInput = document.getElementById('policyMinProb');
    if (minProbInput) minProbInput.value = currentPolicy.min_recovery_probability;
    const minProbLabel = document.getElementById('labelMinProb');
    if (minProbLabel) minProbLabel.textContent = `${currentPolicy.min_recovery_probability}%`;

    const highValueInput = document.getElementById('policyHighValue');
    if (highValueInput) highValueInput.value = currentPolicy.high_value_threshold;

    const strategyModeSelect = document.getElementById('policyStrategyMode');
    if (strategyModeSelect) strategyModeSelect.value = currentPolicy.strategy_mode;

    const autoEnabledCheck = document.getElementById('policyAutoEnabled');
    if (autoEnabledCheck) autoEnabledCheck.checked = currentPolicy.auto_recovery_enabled;

    const sysAi = document.getElementById('sysAiEngine');
    if (sysAi) sysAi.textContent = data.system_status.ai_engine;
  } catch (err) {
    console.error('Error loading policy data:', err);
  }
}

async function savePolicy(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSavePolicy');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span>Saving...</span>';
  btn.disabled = true;

  const payload = {
    max_retries: parseInt(document.getElementById('policyMaxRetries').value),
    min_recovery_probability: parseInt(document.getElementById('policyMinProb').value),
    high_value_threshold: parseFloat(document.getElementById('policyHighValue').value),
    strategy_mode: document.getElementById('policyStrategyMode').value,
    auto_recovery_enabled: document.getElementById('policyAutoEnabled').checked
  };

  try {
    const res = await fetch('/api/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update policy');

    currentPolicy = data.policy;
    showToast('Merchant recovery policy updated and applied to queue!', 'success');
    await loadPayments(true);
  } catch (err) {
    showToast('Policy update failed: ' + err.message, 'error');
  } finally {
    btn.innerHTML = orig;
    btn.disabled = false;
  }
}

// ==========================================================================
// Reset Demo Dataset
// ==========================================================================
async function resetDemo() {
  if (!confirm('Reset transactions, policies, and audit trail to initial demo state?')) return;

  try {
    const res = await fetch('/api/reset', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Demo environment reset to baseline!', 'success');
      currentTransactionId = null;
      closeDrawer();
      await loadPayments(false);
      await loadPolicyData();
    }
  } catch (err) {
    showToast('Failed to reset: ' + err.message, 'error');
  }
}

// ==========================================================================
// DOM Initializer & Event Listeners
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Determine initial section from URL path
  const currentPath = window.location.pathname;
  const initialSection = PATH_TO_SECTION[currentPath] || 'dashboard';

  // Load baseline data
  loadPayments(false);
  loadPolicyData();

  // Activate initial section
  switchSection(initialSection, false);

  // Sidebar navigation switching
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  navItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const sec = btn.getAttribute('data-section');
      switchSection(sec, true);
      const sidebar = document.getElementById('appSidebar');
      if (sidebar) sidebar.classList.remove('open');
    });
  });

  // Mobile menu toggle
  const mobBtn = document.getElementById('mobileMenuBtn');
  if (mobBtn) {
    mobBtn.addEventListener('click', () => {
      document.getElementById('appSidebar').classList.toggle('open');
    });
  }

  // Dashboard CTA to Recovery Center
  const btnGoToQueue = document.getElementById('btnGoToQueue');
  if (btnGoToQueue) {
    btnGoToQueue.addEventListener('click', () => switchSection('recovery'));
  }

  // Batch simulation buttons
  document.getElementById('topbarBatchBtn').addEventListener('click', runBatchSimulation);
  const btnRunBatchSimulation = document.getElementById('btnRunBatchSimulation');
  if (btnRunBatchSimulation) btnRunBatchSimulation.addEventListener('click', runBatchSimulation);
  document.getElementById('closeBatchModalBtn').addEventListener('click', () => document.getElementById('batchModal').close());
  document.getElementById('closeBatchFooterBtn').addEventListener('click', () => {
    document.getElementById('batchModal').close();
    switchSection('recovery');
  });

  // Simulation Lab button
  const btnRunLab = document.getElementById('btnRunLabSimulation');
  if (btnRunLab) btnRunLab.addEventListener('click', runLabSimulation);

  // AI Analyzer Select
  const anSelect = document.getElementById('analyzerSelect');
  if (anSelect) {
    anSelect.addEventListener('change', (e) => selectAnalyzerTx(e.target.value));
  }
  const anBtnEx = document.getElementById('anViewBtnExecute');
  if (anBtnEx) {
    anBtnEx.addEventListener('click', async () => {
      currentTransactionId = currentAnalyzerTxId;
      await executeRecovery();
      await loadAnalyzerTx(currentAnalyzerTxId);
    });
  }
  const anBtnAn = document.getElementById('anViewBtnAnalyze');
  if (anBtnAn) {
    anBtnAn.addEventListener('click', async () => {
      currentTransactionId = currentAnalyzerTxId;
      await analyzeTransaction();
      await loadAnalyzerTx(currentAnalyzerTxId);
    });
  }
  const anBtnCopy = document.getElementById('anViewCopyBtn');
  if (anBtnCopy) {
    anBtnCopy.addEventListener('click', () => {
      const bubble = document.getElementById('anViewMessageBubble');
      if (bubble) {
        navigator.clipboard.writeText(bubble.textContent.trim()).then(() => {
          showToast('Customer recovery dispatch copied!', 'success');
        });
      }
    });
  }

  // Search input in Recovery Center
  document.getElementById('searchInput').addEventListener('input', renderPaymentTable);

  // Sorting dropdown
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderPaymentTable();
  });

  // Filter chips in Recovery Center
  const filterChips = document.querySelectorAll('#filterChips .chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.getAttribute('data-filter');
      renderPaymentTable();
    });
  });

  // Hackathon Quick Demo Scenario Buttons
  const scenarioBtns = document.querySelectorAll('.scenario-btn');
  scenarioBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const txId = btn.getAttribute('data-txid');
      scenarioBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectTransaction(txId);
    });
  });

  // Drawer Controls
  document.getElementById('closeDrawerBtn').addEventListener('click', closeDrawer);
  document.getElementById('drawerBackdrop').addEventListener('click', closeDrawer);
  document.getElementById('btnExecuteRecovery').addEventListener('click', executeRecovery);
  document.getElementById('btnAnalyzeAI').addEventListener('click', analyzeTransaction);
  document.getElementById('btnCopyMessage').addEventListener('click', copyCustomerMessage);

  // Policy Form Inputs
  const maxRetriesSlider = document.getElementById('policyMaxRetries');
  if (maxRetriesSlider) {
    maxRetriesSlider.addEventListener('input', (e) => {
      document.getElementById('labelMaxRetries').textContent = e.target.value;
    });
  }

  const minProbSlider = document.getElementById('policyMinProb');
  if (minProbSlider) {
    minProbSlider.addEventListener('input', (e) => {
      document.getElementById('labelMinProb').textContent = `${e.target.value}%`;
    });
  }

  const policyForm = document.getElementById('policyForm');
  if (policyForm) policyForm.addEventListener('submit', savePolicy);

  // Audit Filters
  const auditSearch = document.getElementById('auditSearchInput');
  if (auditSearch) auditSearch.addEventListener('input', renderAuditPageTable);

  const auditFilterType = document.getElementById('auditFilterType');
  if (auditFilterType) auditFilterType.addEventListener('change', renderAuditPageTable);

  const auditFilterPolicy = document.getElementById('auditFilterPolicy');
  if (auditFilterPolicy) auditFilterPolicy.addEventListener('change', renderAuditPageTable);

  const auditFilterResult = document.getElementById('auditFilterResult');
  if (auditFilterResult) auditFilterResult.addEventListener('change', renderAuditPageTable);

  // Audit modal
  document.getElementById('openAuditTrailBtn').addEventListener('click', openAuditModal);
  document.getElementById('closeAuditModalBtn').addEventListener('click', () => document.getElementById('auditModal').close());
  document.getElementById('closeAuditFooterBtn').addEventListener('click', () => document.getElementById('auditModal').close());

  // Reset demo button
  document.getElementById('resetDemoBtn').addEventListener('click', resetDemo);

  // Periodic subtle refresh of audit count
  setInterval(async () => {
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();
      if (data.success) {
        const countElem = document.getElementById('auditCount');
        if (countElem) countElem.textContent = data.count;
      }
    } catch (e) {}
  }, 12000);
});
