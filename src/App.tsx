import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Aperture, BarChart3, Camera, Check, ChevronDown,
  ChevronLeft, ChevronRight, CircleHelp, Download, FileText, Filter, LayoutDashboard, Menu,
  Moon, MoreHorizontal, Plus, Search, Settings, Sparkles, Sun, Target, Trash2, TrendingUp,
  Wallet, X, type LucideIcon,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useLedger } from "./hooks/useLedger";
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, type Budget, type Goal, type Invoice, type LedgerData,
  type Page, type Transaction, type TransactionType,
} from "./types";
import { currency, dateString, isCurrentMonth, monthLabel, shortDate, todayString } from "./utils/format";
import { createDefaultData } from "./data/defaultData";
import { isLedgerData } from "./utils/storage";
import { BudgetLine, ChartTooltip, EmptyState, MetricCard, ProgressBar, SectionTitle, TransactionList } from "./components/Primitives";

type ModalState =
  | { kind: "transaction"; id?: string; type?: TransactionType }
  | { kind: "goal"; id?: string }
  | { kind: "budget"; id?: string }
  | { kind: "invoice"; id?: string }
  | { kind: "allocate"; goalId: string }
  | null;

const navigation: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "budgets", label: "Budgets", icon: Wallet },
  { id: "goals", label: "Savings goals", icon: Target },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "invoices", label: "Invoices", icon: FileText },
];

const pageTitles: Record<Page, string> = {
  dashboard: "Your money, in focus.",
  transactions: "Every little detail.",
  budgets: "Spend with intention.",
  goals: "Make room for what’s next.",
  reports: "The bigger picture.",
  invoices: "Good work, getting paid.",
  settings: "Make it yours.",
};
const chartColors = ["#d9b879", "#839b8b", "#9d8db4", "#d18d72", "#78a0a4", "#c2a15f", "#a37d72", "#7d91b5"];

function sum(items: Transaction[], type?: TransactionType) {
  return items.filter((item) => !type || item.type === type).reduce((total, item) => total + item.amount, 0);
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function App() {
  const { data, setData, storageError } = useLedger();
  const [page, setPage] = useState<Page>("dashboard");
  const [modal, setModal] = useState<ModalState>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);
  const [transactionFilter, setTransactionFilter] = useState({ query: "", type: "all", category: "all", from: "", to: "" });
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (storageError) setToast("Changes couldn’t be saved to this browser.");
  }, [storageError]);

  const selectedMonth = useMemo(() => new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1), [monthOffset]);
  const selectedMonthTransactions = useMemo(() => data.transactions.filter((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    return date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear();
  }), [data.transactions, selectedMonth]);
  const income = sum(selectedMonthTransactions, "income");
  const expenses = sum(selectedMonthTransactions, "expense");
  const budgetRemaining = data.monthlyLimit - expenses;
  const monthContributions = data.contributions
    .filter((item) => {
      const date = new Date(`${item.date}T00:00:00`);
      return date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear();
    })
    .reduce((total, item) => total + item.amount, 0);
  const remaining = income - expenses - monthContributions;
  const expenseRatio = data.monthlyLimit > 0 ? expenses / data.monthlyLimit : expenses > 0 ? 1 : 0;
  const health = expenseRatio >= 1 ? "Overspending" : expenseRatio >= 0.78 ? "A little caution" : "On track";
  const filterCategories = [...new Set(data.transactions.map((item) => item.category))].sort();
  const showsMonthSelector = page === "dashboard" || page === "budgets" || page === "reports";
  const filteredTransactions = useMemo(() => data.transactions.filter((item) => {
    const queryMatch = !transactionFilter.query ||
      `${item.notes} ${item.category} ${item.tags.join(" ")}`.toLowerCase().includes(transactionFilter.query.toLowerCase());
    const typeMatch = transactionFilter.type === "all" || item.type === transactionFilter.type;
    const categoryMatch = transactionFilter.category === "all" || item.category === transactionFilter.category;
    return queryMatch && typeMatch && categoryMatch &&
      (!transactionFilter.from || item.date >= transactionFilter.from) &&
      (!transactionFilter.to || item.date <= transactionFilter.to);
  }).sort((a, b) => b.date.localeCompare(a.date)), [data.transactions, transactionFilter]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  function updateData(updater: (current: LedgerData) => LedgerData) {
    setData((current) => updater(current));
  }

  function toggleTheme() {
    updateData((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }));
  }

  function saveTransaction(transaction: Transaction) {
    updateData((current) => ({
      ...current,
      transactions: current.transactions.some((item) => item.id === transaction.id)
        ? current.transactions.map((item) => item.id === transaction.id ? transaction : item)
        : [transaction, ...current.transactions],
      invoices: current.invoices.map((invoice) => invoice.paidTransactionId === transaction.id
        ? { ...invoice, amount: transaction.amount, date: transaction.date }
        : invoice),
    }));
    setModal(null);
    notify(transaction.type === "income" ? "Income saved." : "Expense saved.");
  }

  function saveGoal(goal: Goal) {
    updateData((current) => ({
      ...current,
      goals: current.goals.some((item) => item.id === goal.id)
        ? current.goals.map((item) => item.id === goal.id ? goal : item)
        : [...current.goals, goal],
    }));
    setModal(null);
    notify("Savings goal saved.");
  }

  function saveBudget(budget: Budget) {
    updateData((current) => ({
      ...current,
      budgets: current.budgets.some((item) => item.id === budget.id)
        ? current.budgets.map((item) => item.id === budget.id ? budget : item)
        : [...current.budgets, budget],
    }));
    setModal(null);
    notify("Budget saved.");
  }

  function saveInvoice(invoice: Invoice) {
    updateData((current) => {
      const previous = current.invoices.find((item) => item.id === invoice.id);
      const transactions = previous?.status === "Paid" && previous.paidTransactionId
        ? current.transactions.map((item) => item.id === previous.paidTransactionId
          ? {
            ...item, amount: invoice.amount, date: invoice.date,
            notes: `Invoice paid · ${invoice.client} — ${invoice.description}`,
          }
          : item)
        : current.transactions;
      return {
        ...current,
        invoices: previous
          ? current.invoices.map((item) => item.id === invoice.id ? invoice : item)
          : [invoice, ...current.invoices],
        transactions,
      };
    });
    setModal(null);
    notify("Invoice saved.");
  }

  function markInvoicePaid(invoice: Invoice) {
    if (invoice.status === "Paid") return;
    const transactionId = makeId("tx");
    updateData((current) => ({
      ...current,
      invoices: current.invoices.map((item) => item.id === invoice.id
        ? { ...item, status: "Paid", paidTransactionId: transactionId }
        : item),
      transactions: [{
        id: transactionId, type: "income", category: "Other", amount: invoice.amount,
        date: todayString(), notes: `Invoice paid · ${invoice.client} — ${invoice.description}`, tags: ["invoice"],
      }, ...current.transactions],
    }));
    notify("Invoice marked paid and added to income.");
  }

  function deleteTransaction(transaction: Transaction) {
    if (!window.confirm(`Delete this ${transaction.type} of ${currency(transaction.amount)}? This can’t be undone.`)) return;
    updateData((current) => ({
      ...current,
      transactions: current.transactions.filter((item) => item.id !== transaction.id),
      invoices: current.invoices.map((invoice) => invoice.paidTransactionId === transaction.id
        ? { ...invoice, paidTransactionId: undefined, status: "Sent" }
        : invoice),
    }));
    notify("Transaction deleted.");
  }

  function deleteGoal(goal: Goal) {
    if (!window.confirm(`Delete “${goal.name}” and its contribution history? This can’t be undone.`)) return;
    updateData((current) => ({
      ...current,
      goals: current.goals.filter((item) => item.id !== goal.id),
      contributions: current.contributions.filter((item) => item.goalId !== goal.id),
    }));
    notify("Savings goal deleted.");
  }

  function allocateToGoal(goalId: string, amount: number) {
    updateData((current) => ({
      ...current,
      goals: current.goals.map((goal) => goal.id === goalId
        ? { ...goal, currentAmount: goal.currentAmount + amount }
        : goal),
      contributions: [...current.contributions, { id: makeId("allocation"), goalId, amount, date: todayString() }],
    }));
    setModal(null);
    notify("A little more toward your goal. Lovely.");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lensledger-backup-${todayString()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notify("Your backup is ready.");
  }

  async function importData(file?: File) {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isLedgerData(parsed)) throw new Error("This file doesn’t look like a LensLedger backup.");
      if (!window.confirm("Import this backup? It will replace the data currently saved on this device.")) return;
      setData(parsed);
      notify("Backup imported successfully.");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not read that backup file.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  }

  function resetData() {
    if (!window.confirm("Reset all LensLedger data on this device? This can’t be undone. Export a backup first if you’d like to keep a copy.")) return;
    setData(createDefaultData());
    notify("Sample data restored.");
  }

  function navigate(next: Page) {
    setPage(next);
    setMobileMenuOpen(false);
  }

  return (
    <div className={`app-shell theme-${data.theme}`}>
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <button className="brand" onClick={() => navigate("dashboard")} aria-label="LensLedger home">
          <span className="brand-mark"><Aperture size={20} strokeWidth={1.7} /></span>
          <span className="brand-name">lens<span>ledger</span></span>
        </button>
        <div className="workspace-label">YOUR STUDIO</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => navigate(id)} className={`nav-item ${page === id ? "active" : ""}`}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
              {id === "invoices" && data.invoices.some((invoice) => invoice.status === "Sent") && <i className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <span className="tip-icon"><Sparkles size={16} /></span>
            <p>A little clarity goes a long way.</p>
            <span>One frame at a time.</span>
          </div>
          <button onClick={() => navigate("settings")} className={`nav-item ${page === "settings" ? "active" : ""}`}>
            <Settings size={18} strokeWidth={1.8} /><span>Settings</span>
          </button>
          <div className="profile-row">
            <div className="avatar">A</div>
            <div><strong>Alex Morgan</strong><span>Independent photographer</span></div>
            <MoreHorizontal size={17} className="muted-icon" />
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu icon-button" onClick={() => setMobileMenuOpen((open) => !open)} aria-label="Toggle navigation">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="breadcrumb"><span>Studio</span><ChevronRight size={14} /><strong>{navigation.find((item) => item.id === page)?.label ?? "Settings"}</strong></div>
          <div className="topbar-actions">
            <span className="today-label">{new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date())}</span>
            <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${data.theme === "dark" ? "light" : "dark"} mode`} title={`Switch to ${data.theme === "dark" ? "light" : "dark"} mode`}>
              {data.theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="top-avatar" aria-label="Alex Morgan profile">A</button>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">{showsMonthSelector ? monthLabel(selectedMonth).toUpperCase() : "YOUR STUDIO"} <span className="eyebrow-dot">·</span> {showsMonthSelector ? "YOUR STUDIO" : "PERSONAL FINANCE"}</div>
              <h1>{pageTitles[page]}</h1>
              <p>{page === "dashboard" ? "A clearer view of where you are — and where you’re going." : page === "settings" ? "A few thoughtful touches for the way you work." : "Your creative work, and the money that makes it possible."}</p>
            </div>
            {showsMonthSelector && <div className="heading-actions">
              <button className="button button-quiet" onClick={() => setMonthOffset((offset) => offset - 1)} aria-label="Previous month"><ChevronLeft size={17} /></button>
              <button className="month-picker" onClick={() => setMonthOffset(0)}>{monthLabel(selectedMonth)} <ChevronDown size={14} /></button>
              <button className="button button-quiet" onClick={() => setMonthOffset((offset) => Math.min(offset + 1, 0))} aria-label="Next month" disabled={monthOffset === 0}><ChevronRight size={17} /></button>
            </div>}
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={page} className="page-body" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.2 }}>
              {page === "dashboard" && <Dashboard
                data={data} income={income} expenses={expenses} remaining={remaining} budgetRemaining={budgetRemaining} health={health} monthContributions={monthContributions}
                selectedMonth={selectedMonth} onAdd={(type) => setModal({ kind: "transaction", type })} onNavigate={navigate}
                onCreateInvoice={() => setModal({ kind: "invoice" })} onEditTransaction={(id) => setModal({ kind: "transaction", id })}
              />}
              {page === "transactions" && <TransactionsPage
                data={data} filtered={filteredTransactions} filter={transactionFilter} setFilter={setTransactionFilter}
                onAdd={(type) => setModal({ kind: "transaction", type })} onEdit={(id) => setModal({ kind: "transaction", id })}
                onDelete={deleteTransaction} categories={filterCategories}
              />}
              {page === "budgets" && <BudgetsPage data={data} selectedMonth={selectedMonth} onAdd={() => setModal({ kind: "budget" })} onEdit={(id) => setModal({ kind: "budget", id })} onDelete={(budget) => {
                if (!window.confirm(`Delete the ${budget.category} budget?`)) return;
                updateData((current) => ({ ...current, budgets: current.budgets.filter((item) => item.id !== budget.id) }));
                notify("Budget removed.");
              }} onSetOverall={(value) => updateData((current) => ({ ...current, monthlyLimit: value }))} />}
              {page === "goals" && <GoalsPage data={data} onAdd={() => setModal({ kind: "goal" })} onEdit={(id) => setModal({ kind: "goal", id })} onAllocate={(goalId) => setModal({ kind: "allocate", goalId })} onDelete={deleteGoal} />}
              {page === "reports" && <ReportsPage data={data} selectedMonth={selectedMonth} />}
              {page === "invoices" && <InvoicesPage data={data} onAdd={() => setModal({ kind: "invoice" })} onEdit={(id) => setModal({ kind: "invoice", id })} onMarkPaid={markInvoicePaid} onDelete={(invoice) => {
                if (!window.confirm(`Delete the invoice for ${invoice.client}?`)) return;
                updateData((current) => ({ ...current, invoices: current.invoices.filter((item) => item.id !== invoice.id) }));
                notify("Invoice deleted.");
              }} />}
              {page === "settings" && <SettingsPage data={data} onExport={exportData} onImport={() => importRef.current?.click()} onReset={resetData} onTheme={toggleTheme} />}
            </motion.div>
          </AnimatePresence>
          <footer className="page-footer"><span>Made for the ones behind the lens.</span><span>LensLedger <span className="footer-dot">·</span> Your studio, in balance.</span></footer>
        </div>
      </main>

      <input ref={importRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => void importData(event.target.files?.[0])} />
      <AnimatePresence>
        {modal && <Modal
          modal={modal} data={data} onClose={() => setModal(null)} onSaveTransaction={saveTransaction}
          onSaveGoal={saveGoal} onSaveBudget={saveBudget} onSaveInvoice={saveInvoice} onAllocate={allocateToGoal}
        />}
        {toast && <motion.div className={`toast ${storageError ? "toast-error" : ""}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>{storageError ? <AlertCircle size={16} /> : <Check size={16} />}{toast}</motion.div>}
      </AnimatePresence>
    </div>
  );
}

function Dashboard({ data, income, expenses, remaining, budgetRemaining, health, monthContributions, selectedMonth, onAdd, onNavigate, onCreateInvoice, onEditTransaction }: {
  data: LedgerData; income: number; expenses: number; remaining: number; budgetRemaining: number; health: string; monthContributions: number; selectedMonth: Date;
  onAdd: (type: TransactionType) => void; onNavigate: (page: Page) => void; onCreateInvoice: () => void; onEditTransaction: (id: string) => void;
}) {
  const monthTx = data.transactions.filter((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    return date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear();
  });
  const categorySpending = data.budgets.map((budget) => ({
    ...budget, spent: sum(monthTx.filter((item) => item.category === budget.category), "expense"),
  }));
  const outstanding = data.invoices.filter((invoice) => invoice.status === "Sent").reduce((total, invoice) => total + invoice.amount, 0);
  const goalTotal = data.goals.reduce((total, goal) => total + goal.currentAmount, 0);
  const goalTarget = data.goals.reduce((total, goal) => total + goal.targetAmount, 0);
  const expenseRatio = data.monthlyLimit > 0 ? expenses / data.monthlyLimit : expenses > 0 ? 1 : 0;
  const recent = [...monthTx].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const chartData = buildMonthlyData(data.transactions, 6, selectedMonth);
  const healthTone = health === "Overspending" ? "danger" : health === "A little caution" ? "warning" : "good";
  return <div className="dashboard-layout">
    <section className="welcome-strip">
      <div className="welcome-copy">
        <div className="welcome-kicker"><span className="live-dot" /> YOUR MONTH, AT A GLANCE</div>
        <h2>Doing good work.<br /><em>Making it work for you.</em></h2>
        <p>Every thoughtful choice adds up. Here’s how this month is coming into focus.</p>
        <div className="welcome-actions">
          <button className="button button-gold" onClick={() => onAdd("income")}><Plus size={16} /> Add income</button>
          <button className="button button-outline" onClick={() => onAdd("expense")}><Plus size={16} /> Add expense</button>
          <button className="button button-text" onClick={onCreateInvoice}><FileText size={16} /> New invoice</button>
        </div>
      </div>
      <div className="welcome-photo" aria-label="Photographer working outdoors">
        <div className="photo-glow" />
        <span className="photo-caption"><Camera size={14} /> A little perspective</span>
      </div>
      <div className="health-chip"><span className={`health-dot ${healthTone}`} /><div><span>MONEY HEALTH</span><strong>{health}</strong></div><ChevronRight size={15} /></div>
    </section>

    <section className="metrics-grid">
      <MetricCard label="Income" value={currency(income)} note="Money earned this month" icon={ArrowDownLeft} tone="icon-green" change="↗ In focus" />
      <MetricCard label="Expenses" value={currency(expenses)} note="Spent with intention" icon={ArrowUpRight} tone="icon-rose" />
      <MetricCard label="Budget left" value={currency(budgetRemaining)} note="Within this month’s spending limit" icon={Wallet} tone="icon-gold" />
      <MetricCard label="In savings" value={currency(goalTotal)} note={`${Math.round(goalTarget ? goalTotal / goalTarget * 100 : 0)}% of your goals`} icon={Target} tone="icon-lilac" />
    </section>

    <section className="dashboard-grid">
      <div className="panel flow-panel">
        <SectionTitle title="Your cash flow" detail="Income and expenses over the last six months" action={<button className="text-link" onClick={() => onNavigate("reports")}>See reports <ChevronRight size={14} /></button>} />
        <div className="chart-legend"><span><i className="legend-dot income-dot" /> Income</span><span><i className="legend-dot expense-dot" /> Expenses</span></div>
        <div className="flow-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--text-soft)", fontSize: 11 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-soft)", fontSize: 10 }} tickFormatter={(value: number) => value === 0 ? "$0" : `$${value / 1000}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="income" name="Income" fill="#d9b879" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="expenses" name="Expenses" fill="#81978b" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-summary"><span><i className="summary-icon up"><TrendingUp size={14} /></i> You earned <b>{currency(income)}</b> this month</span><span>Net available <b>{currency(remaining)}</b></span></div>
      </div>
      <div className="panel budget-panel">
        <SectionTitle title="Spending plan" detail="A little structure, a lot of breathing room" action={<button className="icon-link" onClick={() => onNavigate("budgets")} aria-label="View all budgets"><ChevronRight size={18} /></button>} />
        <div className="overall-spend">
          <div><span>Monthly limit</span><strong>{currency(expenses)} <small>of {currency(data.monthlyLimit)}</small></strong></div>
          <span className={`budget-percent ${expenseRatio >= 1 ? "over" : expenseRatio >= .78 ? "near" : ""}`}>{Math.round(expenseRatio * 100)}%</span>
        </div>
        <ProgressBar value={expenses} limit={data.monthlyLimit} />
        <div className="budget-list">
          {categorySpending.slice(0, 4).map((budget) => <BudgetLine key={budget.id} name={budget.category} spent={budget.spent} limit={budget.limit} />)}
        </div>
        <button className="panel-bottom-link" onClick={() => onNavigate("budgets")}>View your spending plan <ChevronRight size={15} /></button>
      </div>
    </section>

    <section className="dashboard-grid lower-grid">
      <div className="panel recent-panel">
        <SectionTitle title="Recent activity" detail="The latest from your studio" action={<button className="text-link" onClick={() => onNavigate("transactions")}>All activity <ChevronRight size={14} /></button>} />
        <TransactionList items={recent} onEdit={onEditTransaction} />
        {recent.length === 0 && <EmptyState title="A fresh page." message="Your transactions will find a home here." />}
      </div>
      <div className="panel goals-panel">
        <SectionTitle title="Little by little" detail="Your savings, taking shape" action={<button className="icon-link" onClick={() => onNavigate("goals")} aria-label="View savings goals"><ChevronRight size={18} /></button>} />
        <div className="goal-total-row"><strong>{currency(goalTotal)}</strong><span>of {currency(goalTarget)}</span></div>
        <ProgressBar value={goalTotal} limit={goalTarget} />
        <div className="mini-goals">
          {data.goals.slice(0, 2).map((goal) => <div className="mini-goal" key={goal.id}><span className="mini-goal-icon"><Target size={15} /></span><div><strong>{goal.name}</strong><span>{currency(goal.currentAmount)} <i>of</i> {currency(goal.targetAmount)}</span></div><span className="mini-goal-percent">{Math.round(goal.currentAmount / goal.targetAmount * 100)}%</span></div>)}
        </div>
        <button className="panel-bottom-link" onClick={() => onNavigate("goals")}>Visit your goals <ChevronRight size={15} /></button>
      </div>
    </section>
    <div className="dashboard-footnote"><Sparkles size={15} /><span>{outstanding > 0 ? `${currency(outstanding)} is on its way from ${data.invoices.filter((invoice) => invoice.status === "Sent").length} sent invoice${data.invoices.filter((invoice) => invoice.status === "Sent").length === 1 ? "" : "s"}.` : "You’ve got a clear view of your finances. Keep going."}</span><span className="saving-note">{currency(monthContributions)} tucked away this month</span></div>
  </div>;
}

function buildMonthlyData(transactions: Transaction[], count: number, anchor = new Date()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(anchor.getFullYear(), anchor.getMonth() - (count - index - 1), 1);
    const inMonth = transactions.filter((item) => {
      const txDate = new Date(`${item.date}T00:00:00`);
      return txDate.getMonth() === date.getMonth() && txDate.getFullYear() === date.getFullYear();
    });
    return { label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date), income: sum(inMonth, "income"), expenses: sum(inMonth, "expense") };
  });
}

function buildCategoryTrendData(transactions: Transaction[], anchor = new Date()) {
  const months = buildMonthlyData(transactions, 6, anchor);
  const dates = Array.from({ length: 6 }, (_, index) => new Date(anchor.getFullYear(), anchor.getMonth() - (5 - index), 1));
  const categories = [...new Set(transactions.filter((item) => item.type === "expense").map((item) => item.category))]
    .map((category) => ({
      category,
      total: sum(transactions.filter((item) => item.category === category && item.type === "expense" && dates.some((date) => {
        const txDate = new Date(`${item.date}T00:00:00`);
        return txDate.getMonth() === date.getMonth() && txDate.getFullYear() === date.getFullYear();
      }))),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)
    .map((item) => item.category);
  return months.map((month, index) => {
    const date = dates[index];
    const categoryAmounts = Object.fromEntries(categories.map((category) => [
      category,
      sum(transactions.filter((item) => {
        const txDate = new Date(`${item.date}T00:00:00`);
        return item.type === "expense" && item.category === category &&
          txDate.getMonth() === date.getMonth() && txDate.getFullYear() === date.getFullYear();
      })),
    ]));
    return { label: month.label, ...categoryAmounts };
  });
}

function buildSavingsTrendData(data: LedgerData, anchor = new Date()) {
  const contributionsByGoal = new Map<string, number>();
  data.contributions.forEach((item) => contributionsByGoal.set(item.goalId, (contributionsByGoal.get(item.goalId) ?? 0) + item.amount));
  const baseline = data.goals.reduce((total, goal) => total + Math.max(goal.currentAmount - (contributionsByGoal.get(goal.id) ?? 0), 0), 0);
  return Array.from({ length: 6 }, (_, index) => {
    const month = new Date(anchor.getFullYear(), anchor.getMonth() - (5 - index), 1);
    const cutoff = dateString(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    const contributed = data.contributions.filter((item) => item.date <= cutoff && data.goals.some((goal) => goal.id === item.goalId))
      .reduce((total, item) => total + item.amount, 0);
    return {
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(month),
      saved: baseline + contributed,
    };
  });
}

function TransactionsPage({ data, filtered, filter, setFilter, onAdd, onEdit, onDelete, categories }: {
  data: LedgerData; filtered: Transaction[]; filter: { query: string; type: string; category: string; from: string; to: string };
  setFilter: (filter: { query: string; type: string; category: string; from: string; to: string }) => void;
  onAdd: (type: TransactionType) => void; onEdit: (id: string) => void; onDelete: (item: Transaction) => void; categories: string[];
}) {
  const activeMonth = data.transactions.filter((item) => isCurrentMonth(item.date));
  const set = (key: keyof typeof filter, value: string) => setFilter({ ...filter, [key]: value });
  return <div className="content-stack">
    <div className="inline-metrics">
      <div className="inline-metric"><span>Income this month</span><strong className="positive">{currency(sum(activeMonth, "income"))}</strong></div>
      <div className="inline-metric"><span>Expenses this month</span><strong>{currency(sum(activeMonth, "expense"))}</strong></div>
      <div className="inline-metric"><span>All transactions</span><strong>{data.transactions.length}</strong></div>
    </div>
    <section className="panel data-panel">
      <SectionTitle title="Your transactions" detail="Every session, subscription and small studio expense." action={<div className="button-pair"><button className="button button-outline" onClick={() => onAdd("expense")}><Plus size={15} /> Expense</button><button className="button button-gold" onClick={() => onAdd("income")}><Plus size={15} /> Income</button></div>} />
      <div className="filter-toolbar">
        <label className="search-field"><Search size={16} /><input placeholder="Search notes or tags" value={filter.query} onChange={(event) => set("query", event.target.value)} /></label>
        <label className="select-field"><Filter size={15} /><select value={filter.type} onChange={(event) => set("type", event.target.value)}><option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select></label>
        <select className="plain-select" value={filter.category} onChange={(event) => set("category", event.target.value)}><option value="all">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
        <div className="date-filter"><input aria-label="From date" type="date" value={filter.from} onChange={(event) => set("from", event.target.value)} /><span>to</span><input aria-label="To date" type="date" value={filter.to} onChange={(event) => set("to", event.target.value)} /></div>
      </div>
      {filtered.length ? <div className="table-wrap">
        <div className="table-header"><span>TRANSACTION</span><span>CATEGORY</span><span>DATE</span><span>TYPE</span><span>AMOUNT</span><span /></div>
        {filtered.map((item) => <div className="table-row" key={item.id}>
          <div className="table-name"><span className={`transaction-type-icon ${item.type}`}>{item.type === "income" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><div><strong>{item.notes || item.category}</strong><span>{item.tags.length ? item.tags.map((tag) => `#${tag}`).join(" ") : "—"}</span></div></div>
          <span className="table-category">{item.category}</span><span className="table-date">{shortDate(item.date)}</span>
          <span><i className={`type-pill ${item.type}`}>{item.type}</i></span>
          <strong className={`table-amount ${item.type}`}>{item.type === "income" ? "+" : "−"}{currency(item.amount)}</strong>
          <div className="table-actions"><button className="row-icon-button" onClick={() => onEdit(item.id)} aria-label="Edit transaction"><MoreHorizontal size={17} /></button><button className="row-icon-button delete-row-button" onClick={() => onDelete(item)} aria-label="Delete transaction"><Trash2 size={15} /></button></div>
        </div>)}
      </div> : <EmptyState title="Nothing in this frame." message={data.transactions.length ? "Try changing the filters or search terms." : "Add a transaction to start bringing your finances into focus."} action={!data.transactions.length && <button className="button button-gold" onClick={() => onAdd("income")}><Plus size={15} /> Add your first transaction</button>} />}
    </section>
  </div>;
}

function BudgetsPage({ data, selectedMonth, onAdd, onEdit, onDelete, onSetOverall }: {
  data: LedgerData; selectedMonth: Date; onAdd: () => void; onEdit: (id: string) => void;
  onDelete: (budget: Budget) => void; onSetOverall: (value: number) => void;
}) {
  const [editingOverall, setEditingOverall] = useState(false);
  const [limit, setLimit] = useState(String(data.monthlyLimit));
  const monthTx = data.transactions.filter((item) => {
    const date = new Date(`${item.date}T00:00:00`);
    return date.getMonth() === selectedMonth.getMonth() && date.getFullYear() === selectedMonth.getFullYear();
  });
  const expenseTotal = sum(monthTx, "expense");
  const spentCategories = data.budgets.map((budget) => ({
    ...budget, spent: sum(monthTx.filter((item) => item.category === budget.category), "expense"),
  }));
  const unbudgeted = [...new Set(monthTx.filter((item) => item.type === "expense").map((item) => item.category))]
    .filter((category) => !data.budgets.some((budget) => budget.category === category));
  return <div className="content-stack">
    <section className="overall-budget-card">
      <div className="overall-budget-copy"><span className="eyebrow">YOUR MONTHLY GUARDRAIL</span><h2>A plan that leaves room to breathe.</h2><p>Keep your spending aligned with what matters most.</p></div>
      <div className="overall-budget-numbers"><span>Spent so far</span><strong>{currency(expenseTotal)} <small>of {currency(data.monthlyLimit)}</small></strong><ProgressBar value={expenseTotal} limit={data.monthlyLimit} /></div>
      {editingOverall ? <form className="limit-editor" onSubmit={(event) => { event.preventDefault(); const amount = Number(limit); if (amount > 0) onSetOverall(amount); setEditingOverall(false); }}><label className="sr-label" htmlFor="overall-limit">Monthly limit</label><span>$</span><input id="overall-limit" type="number" min="1" step="50" value={limit} onChange={(event) => setLimit(event.target.value)} required /><button className="button button-gold button-small" type="submit">Save</button></form>
        : <button className="button button-outline button-small" onClick={() => { setLimit(String(data.monthlyLimit)); setEditingOverall(true); }}>Adjust limit</button>}
    </section>
    <section className="panel data-panel">
      <SectionTitle title="Category budgets" detail="Simple guardrails for the things your studio spends on." action={<button className="button button-gold" onClick={onAdd}><Plus size={16} /> Add a budget</button>} />
      {spentCategories.length ? <div className="budget-card-grid">
        {spentCategories.map((budget) => {
          const ratio = budget.limit ? budget.spent / budget.limit : 0;
          const tone = ratio >= 1 ? "budget-status-danger" : ratio >= .78 ? "budget-status-warning" : "budget-status-good";
          return <div className="budget-category-card" key={budget.id}>
            <div className="category-card-top"><span className="category-art"><Camera size={17} /></span><button className="row-icon-button" aria-label={`Edit ${budget.category} budget`} onClick={() => onEdit(budget.id)}><MoreHorizontal size={18} /></button></div>
            <h3>{budget.category}</h3><div className="budget-amount-row"><strong>{currency(budget.spent)}</strong><span>of {currency(budget.limit)}</span></div>
            <ProgressBar value={budget.spent} limit={budget.limit} />
            <div className="budget-card-bottom"><span className={tone}>{ratio >= 1 ? "Limit reached" : ratio >= .78 ? "Almost there" : "Looking good"}</span><button onClick={() => onDelete(budget)} aria-label={`Delete ${budget.category} budget`}><Trash2 size={14} /></button></div>
          </div>;
        })}
        {unbudgeted.map((category) => <div className="budget-category-card unbudgeted-card" key={category}><div className="category-card-top"><span className="category-art"><CircleHelp size={17} /></span></div><h3>{category}</h3><div className="budget-amount-row"><strong>{currency(sum(monthTx.filter((item) => item.category === category), "expense"))}</strong><span>unbudgeted</span></div><p className="unbudgeted-note">Add a limit to keep this one in view.</p><button className="text-link" onClick={onAdd}>Set a budget <ChevronRight size={14} /></button></div>)}
        <button className="add-budget-card" onClick={onAdd}><span><Plus size={19} /></span><strong>Give a category a limit</strong><small>Build a spending plan that fits you.</small></button>
      </div> : <EmptyState title="Start with a little structure." message="Set category limits that make sense for your studio." action={<button className="button button-gold" onClick={onAdd}><Plus size={15} /> Create your first budget</button>} />}
    </section>
    <div className="soft-note"><Sparkles size={16} /><span>Budgets are gentle guardrails, not rules. Adjust them whenever your work changes.</span></div>
  </div>;
}

function GoalsPage({ data, onAdd, onEdit, onAllocate, onDelete }: {
  data: LedgerData; onAdd: () => void; onEdit: (id: string) => void; onAllocate: (id: string) => void; onDelete: (goal: Goal) => void;
}) {
  const totalSaved = data.goals.reduce((total, goal) => total + goal.currentAmount, 0);
  const totalTarget = data.goals.reduce((total, goal) => total + goal.targetAmount, 0);
  const progress = totalTarget ? Math.min(totalSaved / totalTarget * 100, 100) : 0;
  return <div className="content-stack">
    <section className="goals-hero">
      <div className="goals-hero-icon"><Target size={23} /></div>
      <div className="goals-hero-copy"><span className="eyebrow">THE FUTURE LOOKS GOOD</span><h2>Every little bit is a beginning.</h2><p>You’ve set aside {currency(totalSaved)} across {data.goals.length} thoughtful goal{data.goals.length === 1 ? "" : "s"}.</p></div>
      <div className="goal-hero-progress"><span className="goal-ring" style={{ "--progress": `${progress}%` } as React.CSSProperties}><strong>{Math.round(progress)}<small>%</small></strong></span><span>{currency(totalSaved)} saved</span></div>
    </section>
    <section className="panel data-panel">
      <SectionTitle title="Things you’re looking forward to" detail="Big dreams, broken into smaller, lovely steps." action={<button className="button button-gold" onClick={onAdd}><Plus size={16} /> New goal</button>} />
      {data.goals.length ? <div className="goal-card-grid">
        {data.goals.map((goal, index) => {
          const percent = goal.targetAmount ? Math.min(goal.currentAmount / goal.targetAmount * 100, 100) : 0;
          const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);
          const due = new Date(`${goal.targetDate}T00:00:00`);
          return <motion.article className="goal-card" key={goal.id} whileHover={{ y: -3 }} transition={{ duration: .18 }}>
            <div className="goal-card-head"><span className={`goal-art goal-art-${index % 4}`}><Target size={18} /></span><button className="row-icon-button" onClick={() => onEdit(goal.id)} aria-label={`Edit ${goal.name}`}><MoreHorizontal size={18} /></button></div>
            <span className="goal-due">AIMING FOR {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(due).toUpperCase()}</span>
            <h3>{goal.name}</h3>
            <div className="goal-progress-copy"><strong>{currency(goal.currentAmount)}</strong><span>{Math.round(percent)}% there</span></div>
            <ProgressBar value={goal.currentAmount} limit={goal.targetAmount} className="goal-progress" />
            <div className="goal-remaining">{currency(remaining)} <span>left to go</span></div>
            <div className="goal-card-actions"><button className="button button-gold button-small" onClick={() => onAllocate(goal.id)}><Plus size={14} /> Add to goal</button><button className="row-icon-button delete-row-button" onClick={() => onDelete(goal)} aria-label={`Delete ${goal.name}`}><Trash2 size={15} /></button></div>
          </motion.article>;
        })}
        <button className="add-goal-card" onClick={onAdd}><span className="add-goal-orb"><Plus size={20} /></span><strong>Dream up another goal</strong><small>You can get there, one step at a time.</small></button>
      </div> : <EmptyState title="What are you working toward?" message="Give your next big idea a name, a number and a little momentum." action={<button className="button button-gold" onClick={onAdd}><Plus size={15} /> Create a savings goal</button>} />}
    </section>
    {data.contributions.length > 0 && <section className="panel contribution-panel"><SectionTitle title="Recent progress" detail="Every contribution deserves a little credit." /><div className="contribution-list">{[...data.contributions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((item) => <div key={item.id}><span className="contribution-check"><Check size={14} /></span><span>{data.goals.find((goal) => goal.id === item.goalId)?.name ?? "Savings goal"}</span><small>{shortDate(item.date)}</small><strong>+{currency(item.amount)}</strong></div>)}</div></section>}
  </div>;
}

function ReportsPage({ data, selectedMonth }: { data: LedgerData; selectedMonth: Date }) {
  const monthly = buildMonthlyData(data.transactions, 6, selectedMonth);
  const categoryTrend = buildCategoryTrendData(data.transactions, selectedMonth);
  const categoryTrendNames = Object.keys(categoryTrend[0] ?? {}).filter((key) => key !== "label");
  const savingsTrend = buildSavingsTrendData(data, selectedMonth);
  const isSelectedMonth = (date: string) => {
    const parsed = new Date(`${date}T00:00:00`);
    return parsed.getMonth() === selectedMonth.getMonth() && parsed.getFullYear() === selectedMonth.getFullYear();
  };
  const categoryData = [...new Set(data.transactions.filter((item) => item.type === "expense" && isSelectedMonth(item.date)).map((item) => item.category))]
    .map((category) => ({ name: category, value: sum(data.transactions.filter((item) => item.category === category && isSelectedMonth(item.date)), "expense") }))
    .sort((a, b) => b.value - a.value);
  const monthIncome = sum(data.transactions.filter((item) => isSelectedMonth(item.date)), "income");
  const monthExpense = sum(data.transactions.filter((item) => isSelectedMonth(item.date)), "expense");
  return <div className="content-stack">
    <div className="report-summary">
      <MetricCard label="Income this month" value={currency(monthIncome)} note="Across all your work" icon={ArrowDownLeft} tone="icon-green" />
      <MetricCard label="Expenses this month" value={currency(monthExpense)} note="Across every category" icon={ArrowUpRight} tone="icon-rose" />
      <MetricCard label="Net this month" value={currency(monthIncome - monthExpense)} note="Before savings goals" icon={TrendingUp} tone="icon-gold" />
    </div>
    <div className="reports-grid">
      <section className="panel report-panel wide-report"><SectionTitle title="Income & expenses" detail="A six-month view of your studio’s rhythm." />
        <div className="report-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={monthly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--text-soft)", fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-soft)", fontSize: 10 }} tickFormatter={(value: number) => `$${value / 1000}k`} /><Tooltip content={<ChartTooltip />} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} /><Bar dataKey="income" name="Income" fill="#d9b879" radius={[4, 4, 0, 0]} maxBarSize={27} /><Bar dataKey="expenses" name="Expenses" fill="#81978b" radius={[4, 4, 0, 0]} maxBarSize={27} /></BarChart></ResponsiveContainer></div>
      </section>
      <section className="panel report-panel"><SectionTitle title="Where it goes" detail="This month’s expenses, by category." />
        {categoryData.length ? <><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="88%" paddingAngle={4} stroke="none">{categoryData.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip content={<ChartTooltip />} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{currency(monthExpense)}</strong><span>spent</span></div></div><div className="category-legend">{categoryData.slice(0, 5).map((item, index) => <div key={item.name}><span><i style={{ background: chartColors[index % chartColors.length] }} />{item.name}</span><strong>{currency(item.value)}</strong></div>)}</div></> : <EmptyState title="It starts with one." message="Your spending breakdown will appear here." />}
      </section>
      <section className="panel report-panel wide-report"><SectionTitle title="Category spending trends" detail="See how the things your studio spends on change over time." />
        {categoryTrendNames.length ? <div className="report-chart report-chart-short"><ResponsiveContainer width="100%" height="100%"><LineChart data={categoryTrend} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--text-soft)", fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-soft)", fontSize: 10 }} tickFormatter={(value: number) => `$${value / 1000}k`} /><Tooltip content={<ChartTooltip />} /><Legend iconType="circle" wrapperStyle={{ fontSize: 10, color: "var(--text-muted)" }} />{categoryTrendNames.map((category, index) => <Line key={category} type="monotone" dataKey={category} stroke={chartColors[index % chartColors.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />)}</LineChart></ResponsiveContainer></div>
          : <EmptyState title="A pattern takes time." message="Add some expenses and your category trends will take shape." />}
      </section>
      <section className="panel report-panel wide-report"><SectionTitle title="Savings, over time" detail="Every little contribution, adding up month by month." />
        {data.goals.length ? <div className="report-chart report-chart-short"><ResponsiveContainer width="100%" height="100%"><AreaChart data={savingsTrend} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}><defs><linearGradient id="savingsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a1b29d" stopOpacity={.3} /><stop offset="95%" stopColor="#a1b29d" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--text-soft)", fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--text-soft)", fontSize: 10 }} tickFormatter={(value: number) => `$${value / 1000}k`} /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="saved" name="Savings" stroke="#91a88f" strokeWidth={2} fill="url(#savingsFill)" /></AreaChart></ResponsiveContainer></div>
          : <EmptyState title="Your goals are waiting." message="Start a savings goal to see your progress here." />}
      </section>
    </div>
  </div>;
}

function InvoicesPage({ data, onAdd, onEdit, onMarkPaid, onDelete }: {
  data: LedgerData; onAdd: () => void; onEdit: (id: string) => void; onMarkPaid: (invoice: Invoice) => void; onDelete: (invoice: Invoice) => void;
}) {
  const pending = data.invoices.filter((invoice) => invoice.status !== "Paid").reduce((total, invoice) => total + invoice.amount, 0);
  const paid = data.invoices.filter((invoice) => invoice.status === "Paid").reduce((total, invoice) => total + invoice.amount, 0);
  return <div className="content-stack">
    <div className="inline-metrics"><div className="inline-metric"><span>On its way</span><strong className="gold-text">{currency(pending)}</strong></div><div className="inline-metric"><span>Already paid</span><strong className="positive">{currency(paid)}</strong></div><div className="inline-metric"><span>Invoices</span><strong>{data.invoices.length}</strong></div></div>
    <section className="panel data-panel">
      <SectionTitle title="Your invoices" detail="A clear, kind nudge toward getting paid." action={<button className="button button-gold" onClick={onAdd}><Plus size={16} /> Create invoice</button>} />
      {data.invoices.length ? <div className="invoice-list">
        {[...data.invoices].sort((a, b) => b.date.localeCompare(a.date)).map((invoice) => <article className="invoice-row" key={invoice.id}>
          <div className="invoice-icon"><FileText size={18} /></div>
          <div className="invoice-client"><strong>{invoice.client}</strong><span>{invoice.description}</span></div>
          <span className={`invoice-status ${invoice.status.toLowerCase()}`}><i />{invoice.status}</span>
          <span className="invoice-date">{shortDate(invoice.date)}</span><strong className="invoice-amount">{currency(invoice.amount)}</strong>
          <div className="invoice-actions">{invoice.status !== "Paid" && <button className="button button-small button-soft" onClick={() => onMarkPaid(invoice)}><Check size={14} /> Mark paid</button>}<button className="row-icon-button" onClick={() => onEdit(invoice.id)} aria-label={`Edit invoice for ${invoice.client}`}><MoreHorizontal size={17} /></button><button className="row-icon-button delete-row-button" onClick={() => onDelete(invoice)} aria-label={`Delete invoice for ${invoice.client}`}><Trash2 size={15} /></button></div>
        </article>)}
      </div> : <EmptyState title="A good day’s work deserves a good invoice." message="Create a simple invoice and keep track of the work you’ve sent out." action={<button className="button button-gold" onClick={onAdd}><Plus size={15} /> Create your first invoice</button>} />}
    </section>
    <div className="soft-note"><CircleHelp size={16} /><span>When you mark an invoice as paid, it’s automatically added to your income transactions.</span></div>
  </div>;
}

function SettingsPage({ data, onExport, onImport, onReset, onTheme }: {
  data: LedgerData; onExport: () => void; onImport: () => void; onReset: () => void; onTheme: () => void;
}) {
  return <div className="settings-layout">
    <section className="panel settings-panel"><SectionTitle title="The way it looks" detail="A workspace that feels like yours." />
      <div className="setting-row"><div className="setting-icon"><Sun size={18} /></div><div className="setting-copy"><strong>Appearance</strong><span>Choose a little more light or a little more shade.</span></div><button className={`theme-switch ${data.theme === "light" ? "switch-light" : ""}`} onClick={onTheme} role="switch" aria-checked={data.theme === "light"} aria-label="Toggle light mode"><span>{data.theme === "dark" ? <Moon size={13} /> : <Sun size={13} />}</span></button><span className="theme-state">{data.theme === "dark" ? "Dark" : "Light"}</span></div>
    </section>
    <section className="panel settings-panel"><SectionTitle title="Your data, always yours." detail="Everything stays on this device unless you choose to take it with you." />
      <div className="setting-row"><div className="setting-icon"><Download size={18} /></div><div className="setting-copy"><strong>Export a backup</strong><span>Download a copy of your transactions, goals and invoices.</span></div><button className="button button-outline button-small" onClick={onExport}><Download size={14} /> Export JSON</button></div>
      <div className="setting-row"><div className="setting-icon"><ArrowDownLeft size={18} /></div><div className="setting-copy"><strong>Restore a backup</strong><span>Bring your LensLedger JSON backup back to this device.</span></div><button className="button button-outline button-small" onClick={onImport}>Choose file</button></div>
      <div className="setting-row danger-setting"><div className="setting-icon"><Trash2 size={18} /></div><div className="setting-copy"><strong>Reset all data</strong><span>Restore the sample workspace and clear your saved changes.</span></div><button className="button button-danger-outline button-small" onClick={onReset}>Reset data</button></div>
    </section>
    <div className="privacy-note"><span className="privacy-lock"><Settings size={16} /></span><div><strong>Private by design</strong><p>LensLedger stores your financial information in this browser’s local storage. There’s no account or finance backend — your studio’s numbers stay on this device.</p></div></div>
    <div className="settings-version">LENSLedger <span>·</span> VERSION 1.0 <span>·</span> MADE FOR THE ONES BEHIND THE LENS</div>
  </div>;
}

function Modal({ modal, data, onClose, onSaveTransaction, onSaveGoal, onSaveBudget, onSaveInvoice, onAllocate }: {
  modal: Exclude<ModalState, null>; data: LedgerData; onClose: () => void;
  onSaveTransaction: (transaction: Transaction) => void; onSaveGoal: (goal: Goal) => void;
  onSaveBudget: (budget: Budget) => void; onSaveInvoice: (invoice: Invoice) => void;
  onAllocate: (goalId: string, amount: number) => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const transaction = modal.kind === "transaction" ? data.transactions.find((item) => item.id === modal.id) : undefined;
  const goal = modal.kind === "goal" ? data.goals.find((item) => item.id === modal.id) : undefined;
  const budget = modal.kind === "budget" ? data.budgets.find((item) => item.id === modal.id) : undefined;
  const invoice = modal.kind === "invoice" ? data.invoices.find((item) => item.id === modal.id) : undefined;
  const goalToFund = modal.kind === "allocate" ? data.goals.find((item) => item.id === modal.goalId) : undefined;
  const [type, setType] = useState<TransactionType>(transaction?.type ?? (modal.kind === "transaction" ? modal.type ?? "expense" : "expense"));
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [customCategory, setCustomCategory] = useState(transaction && !((transaction.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).includes(transaction.category)) ? transaction.category : "");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : budget ? String(budget.limit) : invoice ? String(invoice.amount) : "");
  const [date, setDate] = useState(transaction?.date ?? todayString());
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [tags, setTags] = useState(transaction?.tags.join(", ") ?? "");
  const [name, setName] = useState(goal?.name ?? "");
  const [targetAmount, setTargetAmount] = useState(goal ? String(goal.targetAmount) : "");
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? "");
  const [budgetCategory, setBudgetCategory] = useState(budget?.category ?? "");
  const [budgetCustom, setBudgetCustom] = useState("");
  const [client, setClient] = useState(invoice?.client ?? "");
  const [description, setDescription] = useState(invoice?.description ?? "");
  const [invoiceStatus, setInvoiceStatus] = useState(invoice?.status ?? "Draft");
  const [customBudgetMode, setCustomBudgetMode] = useState(false);
  const [customCategoryMode, setCustomCategoryMode] = useState(Boolean(transaction && !((transaction.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).includes(transaction.category))));
  const [allocation, setAllocation] = useState("");

  useEffect(() => {
    modalRef.current?.querySelector<HTMLElement>("form input, form select")?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const titles: Record<"transaction" | "goal" | "budget" | "invoice" | "allocate", string> = {
    transaction: transaction ? "Edit transaction" : modal.kind === "transaction" && modal.type === "income" ? "Add income" : "Add expense",
    goal: goal ? "A little more detail" : "A new goal to grow toward",
    budget: budget ? "Adjust your budget" : "Set a spending limit",
    invoice: invoice ? "Edit invoice" : "Create an invoice",
    allocate: "Put a little aside",
  };
  const title = titles[modal.kind];

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (modal.kind === "transaction" && numericAmount > 0) {
      const selectedCategory = customCategoryMode ? customCategory.trim() : category;
      if (!selectedCategory) return;
      onSaveTransaction({
        id: transaction?.id ?? makeId("tx"), type, category: selectedCategory, amount: numericAmount, date,
        notes: notes.trim(), tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
    } else if (modal.kind === "goal" && Number(targetAmount) > 0) {
      onSaveGoal({ id: goal?.id ?? makeId("goal"), name: name.trim(), targetAmount: Number(targetAmount), currentAmount: goal?.currentAmount ?? 0, targetDate });
    } else if (modal.kind === "budget" && numericAmount > 0) {
      const selectedCategory = customBudgetMode ? budgetCustom.trim() : budgetCategory;
      if (!selectedCategory) return;
      onSaveBudget({ id: budget?.id ?? makeId("budget"), category: selectedCategory, limit: numericAmount });
    } else if (modal.kind === "invoice" && numericAmount > 0) {
      onSaveInvoice({
        id: invoice?.id ?? makeId("invoice"), client: client.trim(), description: description.trim(), amount: numericAmount, date,
        status: invoice?.status === "Paid" ? "Paid" : invoiceStatus as Invoice["status"],
        paidTransactionId: invoice?.paidTransactionId,
      });
    } else if (modal.kind === "allocate" && Number(allocation) > 0 && goalToFund) {
      onAllocate(goalToFund.id, Number(allocation));
    }
  }

  const categoryChoices = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const existingCategories = data.budgets.map((item) => item.category);
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <motion.div ref={modalRef} className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title" initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }} transition={{ duration: .18 }}>
      <div className="modal-heading"><div><span className="eyebrow">A THOUGHTFUL LITTLE UPDATE</span><h2 id="modal-title">{title}</h2></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
      <form className="modal-form" onSubmit={submit}>
        {modal.kind === "transaction" && <>
          {!transaction && <div className="segmented-control"><button type="button" className={type === "expense" ? "selected" : ""} onClick={() => { setType("expense"); setCategory(""); setCustomCategoryMode(false); }}>Expense</button><button type="button" className={type === "income" ? "selected" : ""} onClick={() => { setType("income"); setCategory(""); setCustomCategoryMode(false); }}>Income</button></div>}
          <label className="form-field"><span>Category</span><select value={customCategoryMode ? "__custom" : category} onChange={(event) => { if (event.target.value === "__custom") { setCustomCategoryMode(true); setCategory(""); } else { setCustomCategoryMode(false); setCategory(event.target.value); } }} required={!customCategoryMode}><option value="">Choose a category</option>{categoryChoices.map((item) => <option key={item}>{item}</option>)}{transaction && !categoryChoices.includes(transaction.category) && <option>{transaction.category}</option>}<option value="__custom">+ Custom category</option></select></label>
          {customCategoryMode && <label className="form-field"><span>Your category</span><input value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} placeholder="e.g. Albums" required autoFocus /></label>}
          <label className="form-field"><span>Amount</span><div className="input-prefix"><span>$</span><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" required /></div></label>
          <label className="form-field"><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <label className="form-field"><span>Notes <small>OPTIONAL</small></span><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What was this for?" /></label>
          <label className="form-field"><span>Tags <small>SEPARATE WITH COMMAS</small></span><input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="wedding, travel" /></label>
        </>}
        {modal.kind === "goal" && <>
          <label className="form-field"><span>Give your goal a name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. A new camera" required /></label>
          <label className="form-field"><span>Target amount</span><div className="input-prefix"><span>$</span><input type="number" min="1" step="1" value={targetAmount} onChange={(event) => setTargetAmount(event.target.value)} placeholder="0" required /></div></label>
          <label className="form-field"><span>When would you like to get there?</span><input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} required /></label>
          {goal && <p className="form-hint">Your current progress of {currency(goal.currentAmount)} will stay right where it is.</p>}
        </>}
        {modal.kind === "budget" && <>
          <label className="form-field"><span>Category</span><select value={customBudgetMode ? "__custom" : budgetCategory} onChange={(event) => { if (event.target.value === "__custom") { setCustomBudgetMode(true); setBudgetCategory(""); } else { setCustomBudgetMode(false); setBudgetCategory(event.target.value); } }} required={!customBudgetMode}><option value="">Choose a category</option>{[...new Set([...EXPENSE_CATEGORIES, ...existingCategories])].map((item) => <option key={item}>{item}</option>)}<option value="__custom">+ Custom category</option></select></label>
          {customBudgetMode && <label className="form-field"><span>Your category</span><input value={budgetCustom} onChange={(event) => setBudgetCustom(event.target.value)} placeholder="e.g. Albums" required /></label>}
          <label className="form-field"><span>Monthly limit</span><div className="input-prefix"><span>$</span><input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" required /></div></label>
          <p className="form-hint">This gentle guardrail resets at the beginning of each month.</p>
        </>}
        {modal.kind === "invoice" && <>
          <label className="form-field"><span>Client name</span><input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Who’s the invoice for?" required /></label>
          <label className="form-field"><span>Description</span><input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What did you create for them?" required /></label>
          <label className="form-field"><span>Amount</span><div className="input-prefix"><span>$</span><input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" required /></div></label>
          <label className="form-field"><span>Invoice date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <label className="form-field"><span>Status</span><select value={invoiceStatus} onChange={(event) => setInvoiceStatus(event.target.value as Invoice["status"])} disabled={invoice?.status === "Paid"}><option>Draft</option><option>Sent</option>{invoice?.status === "Paid" && <option>Paid</option>}</select></label>
          {invoice?.status === "Paid" && <p className="form-hint">This invoice is paid. Its income transaction is already recorded.</p>}
        </>}
        {modal.kind === "allocate" && goalToFund && <>
          <div className="allocation-intro"><span className="goal-art goal-art-1"><Target size={19} /></span><div><span>ADDING TO</span><strong>{goalToFund.name}</strong></div></div>
          <label className="form-field"><span>Amount to set aside</span><div className="input-prefix"><span>$</span><input type="number" min="0.01" step="0.01" value={allocation} onChange={(event) => setAllocation(event.target.value)} placeholder="0.00" autoFocus required /></div></label>
          <p className="form-hint">This will update your savings progress for {goalToFund.name}.</p>
        </>}
        <div className="modal-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button type="submit" className="button button-gold">{modal.kind === "allocate" ? "Set aside" : transaction || goal || budget || invoice ? "Save changes" : "Save to LensLedger"} <ChevronRight size={15} /></button></div>
      </form>
    </motion.div>
  </motion.div>;
}

export default App;
