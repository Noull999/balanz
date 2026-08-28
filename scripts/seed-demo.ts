/**
 * Carga 4 meses de movimientos y presupuestos realistas en la cuenta de
 * prueba, pensados para que las 4 reglas del motor de recomendaciones
 * disparen al abrir el dashboard. Se puede correr las veces que haga falta:
 * primero borra los movimientos y presupuestos existentes de esa cuenta.
 *
 *   npm run db:seed-demo
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const EMAIL = "prueba@balanz.test";
const ANIO = 2026;
const MESES = [5, 6, 7, 8] as const; // mayo a agosto, agosto queda parcial (hasta hoy)

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

function dia(mes: number, d: number): Date {
  return new Date(Date.UTC(ANIO, mes - 1, d));
}

function centavos(pesos: number): number {
  return Math.round(pesos * 100);
}

function esFinde(fecha: Date): boolean {
  const dow = fecha.getUTCDay();
  return dow === 0 || dow === 6;
}

function diasDelMes(mes: number, tipo: "finde" | "semana"): number[] {
  const total = new Date(Date.UTC(ANIO, mes, 0)).getUTCDate();
  const dias: number[] = [];
  for (let d = 1; d <= total; d++) {
    const finde = esFinde(dia(mes, d));
    if ((tipo === "finde") === finde) dias.push(d);
  }
  return dias;
}

type NuevoMovimiento = {
  amountCents: number;
  type: "INCOME" | "EXPENSE";
  description: string;
  date: Date;
  categoryName: string;
};

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
  if (!user) {
    throw new Error(`No existe la cuenta ${EMAIL}. Registrala primero en la app.`);
  }

  const categorias = await prisma.category.findMany({
    where: { userId: user.id },
    select: { id: true, name: true },
  });

  const idPorNombre = new Map(categorias.map((c) => [c.name, c.id]));
  function categoryId(nombre: string): string {
    const id = idPorNombre.get(nombre);
    if (!id) throw new Error(`Falta la categoria "${nombre}" en la cuenta de prueba`);
    return id;
  }

  const movimientos: NuevoMovimiento[] = [];
  const push = (
    mes: number,
    d: number,
    pesos: number,
    type: "INCOME" | "EXPENSE",
    description: string,
    categoryName: string,
  ) => {
    movimientos.push({
      amountCents: centavos(pesos),
      type,
      description,
      date: dia(mes, d),
      categoryName,
    });
  };

  for (const mes of MESES) {
    // Ingresos
    push(mes, 1, 450_000, "INCOME", "Sueldo", "Sueldo");
    if (mes === 6) push(mes, 15, 90_000, "INCOME", "Proyecto freelance", "Freelance");
    if (mes === 8) push(mes, 15, 120_000, "INCOME", "Proyecto freelance", "Freelance");

    // Fijos que se repiten mes a mes (para que la regla de suscripciones los detecte)
    push(mes, 5, 95_000, "EXPENSE", "Alquiler", "Alquiler");
    push(mes, 12, 14_200, "EXPENSE", "Luz, gas e internet", "Servicios");
    push(mes, 28, 7_900, "EXPENSE", "Netflix", "Suscripciones");
    push(mes, 28, 4_300, "EXPENSE", "Spotify", "Suscripciones");

    // Cuasi-recurrentes, no siempre el mismo dia ni el mismo monto
    push(mes, mes % 2 === 0 ? 9 : 12, 9_200 + mes * 100, "EXPENSE", "Veterinaria y alimento", "Mascota");
    if (mes !== 7) push(mes, 18, 10_500, "EXPENSE", "Farmacia", "Salud");
    if (mes !== 6) push(mes, 22, 5_400, "EXPENSE", "Varios", "Otros gastos");

    // Supermercado: 4 compras/mes en fechas fijas
    const montosSuper = [15_500, 17_200, 14_800, 18_900];
    [3, 10, 17, 24].forEach((d, i) => push(mes, d, montosSuper[i], "EXPENSE", "Supermercado", "Supermercado"));

    // Transporte: recargas chicas y frecuentes entre semana
    const diasSemana = diasDelMes(mes, "semana");
    const montosTransporte = [2_800, 3_100, 2_500, 3_400, 2_900, 3_200, 2_600, 3_000];
    montosTransporte.forEach((monto, i) => {
      const d = diasSemana[Math.floor((i / montosTransporte.length) * diasSemana.length)];
      push(mes, d, monto, "EXPENSE", "Sube", "Transporte");
    });

    // Delivery: mas caro y mas frecuente el fin de semana (para la regla de fin de semana)
    const diasFinde = diasDelMes(mes, "finde");
    const montosDeliveryFinde = [14_500, 16_800, 13_200, 18_100, 15_500];
    diasFinde.forEach((d, i) => {
      if (i % 2 === 0) {
        push(mes, d, montosDeliveryFinde[i % montosDeliveryFinde.length], "EXPENSE", "Pedidos Ya", "Delivery");
      }
    });
    push(mes, diasSemana[3], 4_500, "EXPENSE", "Pedidos Ya", "Delivery");
    push(mes, diasSemana[diasSemana.length - 4], 6_200, "EXPENSE", "Rappi", "Delivery");

    // Ocio: normal en mayo/junio/julio, se dispara en agosto (regla de aumento de categoria)
    const ocioFinde = mes === 8 ? diasFinde.slice(0, 4) : diasFinde.slice(0, 2);
    const montosOcio = mes === 8 ? [17_500, 19_200, 16_800, 20_500] : [11_500, 12_800];
    ocioFinde.forEach((d, i) => push(mes, d, montosOcio[i], "EXPENSE", "Salida", "Ocio"));
  }

  console.log(`Borrando movimientos y presupuestos previos de ${EMAIL}...`);
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.budget.deleteMany({ where: { userId: user.id } });

  console.log(`Creando ${movimientos.length} movimientos...`);
  await prisma.transaction.createMany({
    data: movimientos.map((m) => ({
      userId: user.id,
      amountCents: m.amountCents,
      type: m.type,
      description: m.description,
      date: m.date,
      categoryId: categoryId(m.categoryName),
    })),
  });

  const presupuestos: [string, number][] = [
    ["Supermercado", 70_000],
    ["Ocio", 30_000],
    ["Transporte", 30_000],
    ["Delivery", 60_000],
  ];

  console.log(`Creando ${presupuestos.length} presupuestos...`);
  for (const [nombre, limitePesos] of presupuestos) {
    await prisma.budget.create({
      data: { userId: user.id, categoryId: categoryId(nombre), monthlyLimitCents: centavos(limitePesos) },
    });
  }

  console.log("Listo.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
