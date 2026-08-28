"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { formatMoney } from "@/lib/money";

type Rebanada = { name: string; color: string; amountCents: number };

export function CategoryPieChart({ data }: { data: Rebanada[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-[240px] items-center justify-center text-sm text-muted">
        Todavia no hay gastos este mes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="h-[200px] w-full shrink-0 sm:w-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amountCents"
              nameKey="name"
              innerRadius="60%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {data.map((rebanada) => (
                <Cell key={rebanada.name} fill={rebanada.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatMoney(Number(value))}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {data.map((rebanada) => (
          <li key={rebanada.name} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: rebanada.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate">{rebanada.name}</span>
            <span className="shrink-0 tabular-nums text-muted">
              {formatMoney(rebanada.amountCents)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
