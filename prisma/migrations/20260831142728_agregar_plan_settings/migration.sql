-- CreateTable
CREATE TABLE "PlanSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "incomeCents" INTEGER,
    "porcentajeEsencial" INTEGER NOT NULL DEFAULT 50,
    "porcentajeOcio" INTEGER NOT NULL DEFAULT 30,
    "porcentajeAhorro" INTEGER NOT NULL DEFAULT 20,
    "deudaPagoPlaneadoCents" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanSettings_userId_key" ON "PlanSettings"("userId");

-- AddForeignKey
ALTER TABLE "PlanSettings" ADD CONSTRAINT "PlanSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
