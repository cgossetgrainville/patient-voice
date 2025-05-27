// /app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

// Crée une connexion à la base via la variable d'environnement DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
console.log("DB URL utilisée :", process.env.DATABASE_URL);

// Helper pour exécuter une requête SQL
async function query(text: string, params: any[] = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } finally {
    client.release();
  }
}

export async function GET() {
  // 1. Sentiment moyen global
  const sentimentRes = await query(
    `SELECT AVG(score_satisfaction_global)::float AS sentiment_moyen FROM enquete_de_satisfaction`
  );
  const sentimentMoyen = sentimentRes[0]?.sentiment_moyen ?? 0;

  // 2. Nombre total de verbatims
  const totalVerbatimsRes = await query(
    `SELECT COUNT(*)::int AS total FROM enquete_de_satisfaction`
  );
  const totalVerbatims = totalVerbatimsRes[0]?.total ?? 0;

  // 3. Group by thématique
  const themes = await query(
    `SELECT etape_parcours AS label, COUNT(*) AS count, AVG(score_satisfaction)::float AS sentiment
     FROM detail_satisfaction
     GROUP BY etape_parcours`
  );

  // 4. Problèmes concrets prioritaires
  const problems = await query(
    `SELECT id, etape_parcours, resume_verbatim, indice_priorite, recommandation, etat_action
     FROM detail_satisfaction
     WHERE sentiment = 'NÉGATIF'
     ORDER BY indice_priorite DESC
     LIMIT 10`
  );

  // 5. Historique des enquêtes (avec patient)
  const enquetes = await query(
    `SELECT e.*, json_build_object('id', p.id, 'prenom', p.prenom, 'nom', p.nom) AS patient
     FROM enquete_de_satisfaction e
     LEFT JOIN patient p ON e.patient_id = p.id
     ORDER BY score_satisfaction_global DESC
     LIMIT 20`
  );

  // 6. Calcul de la moyenne des scores de satisfaction globale par jour
  const parJour = await query(
    `SELECT date_trunc('day', date_heure) AS date, AVG(score_satisfaction_global)::float AS moyenne
     FROM enquete_de_satisfaction
     GROUP BY date
     ORDER BY date ASC`
  );
  // Reformate la date pour l'affichage (YYYY-MM-DD)
  const satisfactionParJour = parJour.map((row) => ({
    date: row.date.toISOString().substring(0, 10),
    moyenne: row.moyenne,
  }));

  return NextResponse.json({
    sentimentMoyen,
    totalVerbatims,
    themes,
    problems,
    enquetes,
    satisfactionParJour,
  });
}