import type { ReactNode } from "react";
import { Aperture, ArrowDownLeft, ArrowUpRight, MoreHorizontal, Trash2, type LucideIcon } from "lucide-react";
import type { Transaction } from "../types";
import { shortDate } from "../utils/format";
import { useMoney } from "../context/CurrencyContext";

export function SectionTitle({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="section-title"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>;
}

export function MetricCard({ label, value, note, icon: Icon, tone, change }: {
  label: string; value: string; note: string; icon: LucideIcon; tone: string; change?: string;
}) {
  return <div className="metric-card">
    <div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={17} /></span></div>
    <strong className="metric-value">{value}</strong>
    <div className="metric-foot"><span>{note}</span>{change && <span className="metric-change">{change}</span>}</div>
  </div>;
}

export function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { color?: string; name?: string; value?: number }[]; label?: string;
}) {
  const { format } = useMoney();
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><strong>{label}</strong>{payload.map((item, index) => <span key={`${item.name}-${index}`} style={{ color: item.color }}>{item.name} <b>{format(item.value ?? 0)}</b></span>)}</div>;
}

export function ProgressBar({ value, limit, className = "" }: { value: number; limit: number; className?: string }) {
  const percent = limit > 0 ? Math.min(value / limit * 100, 100) : value > 0 ? 100 : 0;
  const tone = percent >= 100 ? "progress-danger" : percent >= 78 ? "progress-warning" : "progress-good";
  return <div className={`progress-track ${className}`} role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}><span className={tone} style={{ width: `${percent}%` }} /></div>;
}

export function BudgetLine({ name, spent, limit }: { name: string; spent: number; limit: number }) {
  const { format } = useMoney();
  return <div className="budget-line"><div className="budget-line-head"><span>{name}</span><span className={spent > limit ? "text-danger" : ""}>{format(spent)} <i>/ {format(limit)}</i></span></div><ProgressBar value={spent} limit={limit} /></div>;
}

export function TransactionList({ items, onEdit, onDelete }: {
  items: Transaction[]; onEdit: (id: string) => void; onDelete?: (item: Transaction) => void;
}) {
  const { format } = useMoney();
  return <div className="transaction-list">{items.map((item) => <div className="transaction-row" key={item.id}>
    <div className={`transaction-type-icon ${item.type}`} aria-hidden="true">{item.type === "income" ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</div>
    <div className="transaction-description"><strong>{item.category}</strong><span>{item.notes || "No notes"} <i>·</i> {shortDate(item.date)}</span></div>
    <div className={`transaction-amount ${item.type}`}>{item.type === "income" ? "+" : "−"}{format(item.amount)}</div>
    <button className="row-icon-button" onClick={() => onEdit(item.id)} aria-label={`Edit ${item.category} transaction`}><MoreHorizontal size={17} /></button>
    {onDelete && <button className="row-icon-button delete-row-button" onClick={() => onDelete(item)} aria-label={`Delete ${item.category} transaction`}><Trash2 size={15} /></button>}
  </div>)}</div>;
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><Aperture size={22} /></span><strong>{title}</strong><p>{message}</p>{action}</div>;
}
