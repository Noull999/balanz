-- CreateEnum
CREATE TYPE "PlanBucket" AS ENUM ('ESENCIAL', 'OCIO');

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "planBucket" "PlanBucket";
