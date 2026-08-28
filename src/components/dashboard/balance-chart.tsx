"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "@/lib/money";

type Punto = { mes: string; incomeCents: number; expenseCents: number; balanceCents: number };

const NOMBRES: Record<string, string> = {
  incomeCents: "Ingresos",
  expenseCents: "Gastos",
  balanceCents: "Balance",
};

export function BalanceChart({ data }: { data: Punto[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ left: 8, right: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="mes"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={{ stroke: "var(--border)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatMoney(Number(value))}
            width={80}
          />
          <Tooltip
            formatter={(value, name) => [formatMoney(Number(value)), NOMBRES[String(name)] ?? String(name)]}
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 13,
            }}
          />
          <Legend formatter={(name) => NOMBRES[String(name)] ?? String(name)} />
          <Bar dataKey="incomeCents" fill="var(--positive)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expenseCents" fill="var(--negative)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Line
            dataKey="balanceCents"
            stroke="var(--brand)"
            strokeWidth={2}
            dot={{ r: 3, fill: "var(--brand)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
