export const currency = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

export const shortDate = (date: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(`${date}T00:00:00`));

export const monthLabel = (date = new Date()) =>
  new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);

export const dateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const todayString = () => dateString(new Date());

export const isCurrentMonth = (date: string, now = new Date()) => {
  const parsed = new Date(`${date}T00:00:00`);
  return parsed.getMonth() === now.getMonth() && parsed.getFullYear() === now.getFullYear();
};
