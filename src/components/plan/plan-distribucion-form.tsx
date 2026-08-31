"use client";

import { Loader, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { CategoryIcon } from "@/components/categories/category-icon";
import { explicarPlanDistribucion } from "@/lib/actions/ai";
import { aplicarPlanDistribucion } from "@/lib/actions/plan";
import { centsToInput, formatMoney, inputToCents } from "@/lib/money";
import { calcularPlan, PORCENTAJES_DEFECTO, type Bucket, type CategoriaPlan } from "@/lib/plan-distribucion";

type CategoriaInicial = CategoriaPlan & { color: string; icon: string };

export function PlanDistribucionForm({
  categoriasIniciales,
  ingresoInicialCents,
}: {
  categoriasIniciales: CategoriaInicial[];
  ingresoInicialCents: number;
}) {
  const [income, setIncome] = useState(ingresoInicialCents > 0 ? centsToInput(ingresoInicialCents) : "");
  const [porcentajes, setPorcentajes] = useState(PORCENTAJES_DEFECTO);
  const [buckets, setBuckets] = useState<Record<string, Bucket>>(() =>
    Object.fromEntries(categoriasIniciales.map((c) => [c.categoryId, c.bucket])),
  );
  // Montos editados a mano por el usuario, por categoria. Se limpian cada vez
  // que cambia el ingreso, los porcentajes o el balde de una categoria, para
  // no dejar un monto viejo pisando una sugerencia nueva.
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [explicacion, setExplicacion] = useState<{ texto: string; esError: boolean } | null>(null);
  const [aplicado, setAplicado] = useState<{ mensaje: string; esError: boolean } | null>(null);
  const [pendingIA, startIA] = useTransition();
  const [pendingAplicar, startAplicar] = useTransition();

  const incomeCents = inputToCents(income) ?? 0;
  const sumaPorcentajes = porcentajes.esencial + porcentajes.ocio + porcentajes.ahorro;
  const porcentajesValidos = sumaPorcentajes === 100;

  const categoriasConBucket: CategoriaPlan[] = useMemo(
    () =>
      categoriasIniciales.map((c) => ({
        categoryId: c.categoryId,
        name: c.name,
        bucket: buckets[c.categoryId] ?? c.bucket,
        promedioCents: c.promedioCents,
      })),
    [categoriasIniciales, buckets],
  );

  const plan = useMemo(
    () => calcularPlan(incomeCents, categoriasConBucket, porcentajes),
    [incomeCents, categoriasConBucket, porcentajes],
  );

  const sugeridoPorCategoria = useMemo(
    () => new Map(plan.asignaciones.map((a) => [a.categoryId, a.monthlyLimitCents])),
    [plan],
  );

  function montoMostrado(categoryId: string, sugeridoCents: number): string {
    return overrides[categoryId] ?? centsToInput(sugeridoCents);
  }

  function montoFinal(categoryId: string, sugeridoCents: number): number {
    const cents = inputToCents(overrides[categoryId] ?? "");
    return cents ?? sugeridoCents;
  }

  function actualizarPorcentaje(campo: keyof typeof porcentajes, valor: string) {
    const numero = Number(valor);
    setPorcentajes((prev) => ({ ...prev, [campo]: Number.isFinite(numero) ? numero : 0 }));
    setOverrides({});
  }

  function actualizarIncome(valor: string) {
    setIncome(valor);
    setOverrides({});
  }

  function actualizarBucket(categoryId: string, bucket: Bucket) {
    setBuckets((prev) => ({ ...prev, [categoryId]: bucket }));
    setOverrides({});
  }

  function pedirExplicacion() {
    setExplicacion(null);
    startIA(async () => {
      const resultado = await explicarPlanDistribucion({
        ...plan,
        asignaciones: plan.asignaciones.map((a) => ({
          ...a,
          monthlyLimitCents: montoFinal(a.categoryId, a.monthlyLimitCents),
        })),
      });
      setExplicacion(
        resultado.ok ? { texto: resultado.texto, esError: false } : { texto: resultado.error, esError: true },
      );
    });
  }

  function aplicar() {
    setAplicado(null);
    startAplicar(async () => {
      const asignaciones = plan.asignaciones.map((a) => ({
        categoryId: a.categoryId,
        monthlyLimitCents: montoFinal(a.categoryId, a.monthlyLimitCents),
      }));
      const resultado = await aplicarPlanDistribucion(asignaciones);
      setAplicado(
        resultado.ok
          ? { mensaje: "Listo, se actualizaron tus presupuestos.", esError: false }
          : { mensaje: resultado.error, esError: true },
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 rounded-xl border border-border bg-surface p-6 sm:grid-cols-2">
        <div>
          <label htmlFor="income" className="block text-sm font-medium">
            Ingreso mensual
          </label>
          <input
            id="income"
            value={income}
            onChange={(e) => actualizarIncome(e.target.value)}
            placeholder="Por ejemplo 800000"
            className="mt-1.5 block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40"
          />
          <p className="mt-1.5 text-sm text-muted">
            Se precarga con tus ingresos de este mes. Cambialo si esperas ganar otra cosa.
          </p>
        </div>

        <div>
          <span className="block text-sm font-medium">Como repartir el 100%</span>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            <PorcentajeInput
              label="Esencial"
              valor={porcentajes.esencial}
              onChange={(v) => actualizarPorcentaje("esencial", v)}
            />
            <PorcentajeInput label="Ocio" valor={porcentajes.ocio} onChange={(v) => actualizarPorcentaje("ocio", v)} />
            <PorcentajeInput
              label="Ahorro"
              valor={porcentajes.ahorro}
              onChange={(v) => actualizarPorcentaje("ahorro", v)}
            />
          </div>
          {!porcentajesValidos && (
            <p className="mt-1.5 text-sm text-negative">
              Los tres porcentajes tienen que sumar 100 (van {sumaPorcentajes}).
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ResumenTile label="Esencial" cents={plan.esencialCents} tono="default" />
        <ResumenTile label="Ocio" cents={plan.ocioCents} tono="default" />
        <ResumenTile label="Ahorro" cents={plan.ahorroCents} tono="positive" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <ul className="divide-y divide-border">
          {categoriasIniciales.map((categoria) => {
            const bucket = buckets[categoria.categoryId] ?? categoria.bucket;
            const sugeridoCents = sugeridoPorCategoria.get(categoria.categoryId) ?? 0;
            return (
              <li key={categoria.categoryId} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${categoria.color}1a`, color: categoria.color }}
                >
                  <CategoryIcon name={categoria.icon} className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{categoria.name}</p>
                  <p className="text-xs text-muted">Promedio ultimos meses: {formatMoney(categoria.promedioCents)}</p>
                </div>

                <div className="flex shrink-0 overflow-hidden rounded-lg border border-border text-xs">
                  {(["ESENCIAL", "OCIO"] as const).map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => actualizarBucket(categoria.categoryId, opcion)}
                      className={`px-2.5 py-1.5 font-medium transition ${
                        bucket === opcion ? "bg-brand text-white" : "bg-background text-muted hover:text-foreground"
                      }`}
                    >
                      {opcion === "ESENCIAL" ? "Esencial" : "Ocio"}
                    </button>
                  ))}
                </div>

                <input
                  aria-label={`Limite sugerido para ${categoria.name}`}
                  value={montoMostrado(categoria.categoryId, sugeridoCents)}
                  onChange={(e) =>
                    setOverrides((prev) => ({ ...prev, [categoria.categoryId]: e.target.value }))
                  }
                  className="w-28 shrink-0 rounded-lg border border-border bg-background px-2.5 py-1.5 text-right text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40"
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-xl border border-brand/30 bg-brand/5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-medium text-brand">
              <Sparkles className="size-4" aria-hidden />
              Que opina la IA de este plan
            </h2>
            <p className="mt-1 text-sm text-muted">Gemini redacta el porque de este reparto, no cambia ningun numero.</p>
          </div>
          <button
            type="button"
            onClick={pedirExplicacion}
            disabled={pendingIA || incomeCents <= 0}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand/40 px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-brand/10 disabled:opacity-60"
          >
            {pendingIA && <Loader className="size-3.5 animate-spin" aria-hidden />}
            Explicar con IA
          </button>
        </div>

        {explicacion && (
          <p className={`mt-3 text-sm text-pretty ${explicacion.esError ? "text-negative" : ""}`}>
            {explicacion.texto}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={aplicar}
          disabled={pendingAplicar || incomeCents <= 0 || !porcentajesValidos}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-strong disabled:opacity-60"
        >
          {pendingAplicar && <Loader className="size-4 animate-spin" aria-hidden />}
          <Wand2 className="size-4" aria-hidden />
          Aplicar a mis presupuestos
        </button>
        <p className="text-sm text-muted">
          Tambien podes dejar los montos como estan y ajustarlos despues, uno por uno, en Presupuestos.
        </p>
      </div>

      {aplicado && <p className={`text-sm ${aplicado.esError ? "text-negative" : "text-positive"}`}>{aplicado.mensaje}</p>}
    </div>
  );
}

function PorcentajeInput({
  label,
  valor,
  onChange,
}: {
  label: string;
  valor: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-center">
      <span className="block text-xs text-muted">{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-center text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/40"
      />
    </label>
  );
}

function ResumenTile({ label, cents, tono }: { label: string; cents: number; tono: "default" | "positive" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${tono === "positive" ? "text-positive" : ""}`}>
        {formatMoney(cents)}
      </p>
    </div>
  );
}
