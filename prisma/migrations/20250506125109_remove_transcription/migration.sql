-- CreateTable
CREATE TABLE "Patient" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "date_naissance" TIMESTAMP(3),
    "email" TEXT,
    "numero_dossier" TEXT,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "transcription" TEXT NOT NULL,
    "transcription_corrigee" TEXT,
    "duree" DOUBLE PRECISION,
    "score_satisfaction" DOUBLE PRECISION,
    "label_satisfaction" TEXT,
    "date_heure" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "audio_filename" TEXT,
    "source" TEXT,
    "nombre_mots" INTEGER,
    "nombre_locuteurs" INTEGER,
    "commentaire_pro" TEXT,
    "patientId" INTEGER,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_numero_dossier_key" ON "Patient"("numero_dossier");

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
