import type { LedgerData } from "../types";
import { dateString } from "../utils/format";

const today = new Date();
const monthDate = (day: number) => dateString(new Date(today.getFullYear(), today.getMonth(), Math.min(day, today.getDate())));
const offsetMonthDate = (offset: number, day: number) => dateString(new Date(today.getFullYear(), today.getMonth() + offset, day));

export function createDefaultData(): LedgerData {
  const goalId = "goal-camera";
  return {
    version: 1,
    theme: "dark",
    monthlyLimit: 5500,
    transactions: [
      { id: "tx-1", type: "income", category: "Weddings", amount: 2850, date: monthDate(3), notes: "Miller wedding · final payment", tags: ["wedding", "client"] },
      { id: "tx-2", type: "income", category: "Client Sessions", amount: 680, date: monthDate(7), notes: "Spring portrait sessions", tags: ["portraits"] },
      { id: "tx-3", type: "expense", category: "Gear", amount: 1240, date: monthDate(9), notes: "85mm lens rental & filters", tags: ["equipment"] },
      { id: "tx-4", type: "income", category: "Commercial", amount: 1750, date: monthDate(12), notes: "Studio campaign · Northline", tags: ["commercial"] },
      { id: "tx-5", type: "expense", category: "Software", amount: 88, date: monthDate(14), notes: "Editing suite subscription", tags: ["recurring"] },
      { id: "tx-6", type: "expense", category: "Travel", amount: 325, date: monthDate(16), notes: "Coastal shoot mileage & stay", tags: ["travel"] },
      { id: "tx-7", type: "income", category: "Prints", amount: 420, date: monthDate(18), notes: "Gallery print orders", tags: ["prints"] },
      { id: "tx-8", type: "expense", category: "Studio", amount: 540, date: monthDate(19), notes: "Shared studio rent", tags: ["monthly"] },
    ],
    budgets: [
      { id: "budget-gear", category: "Gear", limit: 1500 },
      { id: "budget-software", category: "Software", limit: 250 },
      { id: "budget-travel", category: "Travel", limit: 650 },
      { id: "budget-marketing", category: "Marketing", limit: 400 },
      { id: "budget-studio", category: "Studio", limit: 700 },
    ],
    goals: [
      { id: goalId, name: "A new camera body", targetAmount: 4200, currentAmount: 1680, targetDate: dateString(new Date(today.getFullYear(), today.getMonth() + 4, 1)) },
      { id: "goal-calm", name: "The calm fund", targetAmount: 8000, currentAmount: 3200, targetDate: dateString(new Date(today.getFullYear(), today.getMonth() + 8, 1)) },
      { id: "goal-road", name: "A little time away", targetAmount: 2400, currentAmount: 720, targetDate: dateString(new Date(today.getFullYear(), today.getMonth() + 6, 1)) },
    ],
    contributions: [
      { id: "save-camera-1", goalId, amount: 400, date: offsetMonthDate(-5, 8) },
      { id: "save-camera-2", goalId, amount: 440, date: offsetMonthDate(-4, 12) },
      { id: "save-camera-3", goalId, amount: 420, date: offsetMonthDate(-3, 10) },
      { id: "save-camera-4", goalId, amount: 420, date: offsetMonthDate(-2, 14) },
      { id: "save-calm-1", goalId: "goal-calm", amount: 800, date: offsetMonthDate(-5, 8) },
      { id: "save-calm-2", goalId: "goal-calm", amount: 800, date: offsetMonthDate(-4, 12) },
      { id: "save-calm-3", goalId: "goal-calm", amount: 800, date: offsetMonthDate(-3, 10) },
      { id: "save-calm-4", goalId: "goal-calm", amount: 800, date: offsetMonthDate(-2, 14) },
      { id: "save-road-1", goalId: "goal-road", amount: 160, date: offsetMonthDate(-4, 12) },
      { id: "save-road-2", goalId: "goal-road", amount: 200, date: offsetMonthDate(-3, 10) },
      { id: "save-road-3", goalId: "goal-road", amount: 180, date: offsetMonthDate(-2, 14) },
      { id: "save-road-4", goalId: "goal-road", amount: 180, date: offsetMonthDate(-1, 10) },
    ],
    invoices: [
      { id: "invoice-1", client: "Northline Studio", description: "Autumn campaign photography", amount: 1750, date: monthDate(12), status: "Paid", paidTransactionId: "tx-4" },
      { id: "invoice-2", client: "Olivia & James", description: "Wedding day · remaining balance", amount: 1450, date: monthDate(22), status: "Sent" },
      { id: "invoice-3", client: "Fieldnotes Journal", description: "Editorial portrait feature", amount: 850, date: monthDate(25), status: "Draft" },
    ],
  };
}
