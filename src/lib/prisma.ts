import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 se conecta a traves de un driver adapter. Usamos node-postgres contra
// la connection string *pooled* de Neon (la que tiene "-pooler" en el host).
function crearCliente() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("Falta DATABASE_URL. Copiala de Neon a tu archivo .env");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// En dev, Next recarga los modulos en cada cambio: sin este cache se abriria una
// conexion nueva por recarga hasta agotar el pool.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getCliente(): PrismaClient {
  globalForPrisma.prisma ??= crearCliente();
  return globalForPrisma.prisma;
}

/**
 * El cliente se crea en la primera consulta, no al importar este archivo.
 * Importa porque `next build` importa todos los modulos para analizarlos: si el
 * cliente se creara aca arriba, compilar sin DATABASE_URL en el entorno
 * romperia el build entero.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const cliente = getCliente();
    const valor = Reflect.get(cliente, prop) as unknown;
    return typeof valor === "function" ? valor.bind(cliente) : valor;
  },
});
