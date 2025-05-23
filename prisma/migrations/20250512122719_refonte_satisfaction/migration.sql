/*
  Warnings:

  - You are about to drop the column `date_naissance` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the column `numero_dossier` on the `Patient` table. All the data in the column will be lost.
  - You are about to drop the `Consultation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Consultation" DROP CONSTRAINT "Consultation_patientId_fkey";

-- DropIndex
DROP INDEX "Patient_numero_dossier_key";

-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "date_naissance",
DROP COLUMN "email",
DROP COLUMN "numero_dossier";

-- DropTable
DROP TABLE "Consultation";

-- CreateTable
CREATE TABLE "EnqueteDeSatisfaction" (
    "id" SERIAL NOT NULL,
    "transcription" TEXT NOT NULL,
    "tableau" TEXT,
    "pdf_transcription" TEXT,
    "pdf_tableau" TEXT,
    "mp3_audio" TEXT,
    "duree" DOUBLE PRECISION,
    "date_heure" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score_satisfaction_global" DOUBLE PRECISION,
    "label_satisfaction_global" TEXT,
    "source" TEXT,
    "nombre_mots" INTEGER,
    "commentaire_pro" TEXT,
    "patientId" INTEGER,

    CONSTRAINT "EnqueteDeSatisfaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetailSatisfaction" (
    "id" SERIAL NOT NULL,
    "etape_parcours" TEXT NOT NULL,
    "score_satisfaction" INTEGER NOT NULL,
    "resume_verbatim" TEXT NOT NULL,
    "sentiment" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "score_impact" INTEGER NOT NULL,
    "score_faisabilite" INTEGER NOT NULL,
    "indice_priorite" INTEGER NOT NULL,
    "etat_action" TEXT NOT NULL,
    "recommandation" TEXT NOT NULL,
    "enqueteId" INTEGER NOT NULL,

    CONSTRAINT "DetailSatisfaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EnqueteDeSatisfaction" ADD CONSTRAINT "EnqueteDeSatisfaction_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetailSatisfaction" ADD CONSTRAINT "DetailSatisfaction_enqueteId_fkey" FOREIGN KEY ("enqueteId") REFERENCES "EnqueteDeSatisfaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
