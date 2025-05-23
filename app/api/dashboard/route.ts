// /app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  // Sentiment moyen global
  const sentiment = await prisma.enqueteDeSatisfaction.aggregate({
    _avg: { score_satisfaction_global: true },
  });

  // Nombre total de verbatims
  const totalVerbatims = await prisma.enqueteDeSatisfaction.count();

  // Regrouper par thématique
  const themes = await prisma.detailSatisfaction.groupBy({
    by: ["etape_parcours"],
    _count: { etape_parcours: true },
    _avg: { score_satisfaction: true },
  });

  // Problèmes concrets prioritaires
  const problems = await prisma.detailSatisfaction.findMany({
    where: { sentiment: "NÉGATIF" },
    orderBy: { indice_priorite: "desc" },
    select: {
      id: true,
      etape_parcours: true,
      resume_verbatim: true,
      indice_priorite: true,
      recommandation: true,
      etat_action: true,
    },
  });

  const enquetes = await prisma.enqueteDeSatisfaction.findMany({
    include: { patient: true },
    orderBy: { score_satisfaction_global: "desc" },
    take: 20,
  });

  // Calcul de la moyenne des scores de satisfaction globale par jour à partir de date_heure
  const rawParJour = await prisma.enqueteDeSatisfaction.findMany({
    select: {
      date_heure: true,
      score_satisfaction_global: true,
    },
    orderBy: { date_heure: "asc" }
  });

  // On regroupe par date (en ignorant l'heure)
  const grouped: Record<string, number[]> = {};
  rawParJour.forEach((e) => {
    const dateStr = e.date_heure.toISOString().substring(0, 10); // yyyy-mm-dd
    if (!grouped[dateStr]) grouped[dateStr] = [];
    if (typeof e.score_satisfaction_global === 'number') {
      grouped[dateStr].push(e.score_satisfaction_global);
    }
  });
  const satisfactionParJour = Object.entries(grouped).map(([date, scores]) => ({
    date,
    moyenne: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
  }));

  return NextResponse.json({
    sentimentMoyen: sentiment._avg.score_satisfaction_global ?? 0,
    totalVerbatims,
    themes: themes.map((t) => ({
      label: t.etape_parcours,
      count: t._count.etape_parcours,
      sentiment: t._avg.score_satisfaction,
    })),
    problems,
    enquetes,
    satisfactionParJour,
  });
}