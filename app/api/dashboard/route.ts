// /app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { Pool } from "pg";
import dotenv from "dotenv";
import { cookies } from "next/headers";
dotenv.config();

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session_info");

  if (!session?.value) {
    return NextResponse.json({ error: "Session invalide (cookie manquant)" }, { status: 401 });
  }

  let adminId: string;
  try {
    const parsed = JSON.parse(session.value);
    if (!parsed?.id) {
      return NextResponse.json({ error: "ID manquant dans la session" }, { status: 401 });
    }
    adminId = parsed.id.toString();
  } catch (e) {
    console.error("Erreur parsing cookie admin_session_info:", e);
    return NextResponse.json({ error: "Session invalide (parse)" }, { status: 401 });
  }

  const dbName = `db_00${adminId}`;

  const pool = new Pool({
    user: "avnadmin",
    host: "postgresql-4b3783ad-o5359142f.database.cloud.ovh.net",
    database: dbName,
    password: "14IYsxzW6e3LMmJVTq0j",
    port: 20184,
    ssl: { rejectUnauthorized: false }
  });

  async function query(text: string, params: any[] = []) {
    const client = await pool.connect();
    try {
      const res = await client.query(text, params);
      return res.rows;
    } finally {
      client.release();
    }
  }

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
     WHERE etape_parcours != 'Expérience globale'
     GROUP BY etape_parcours`
  );

  // 4. Problèmes concrets prioritaires
  const problems = await query(
    `SELECT id, etape_parcours, resume_verbatim, indice_priorite, recommandation, etat_action
     FROM detail_satisfaction
     WHERE sentiment = 'NÉGATIF' AND etape_parcours != 'Expérience globale'
     ORDER BY indice_priorite DESC`
  );

  // 5. Historique des enquêtes (avec patient)
  const enquetes = await query(
    `SELECT e.*, json_build_object('id', p.id, 'prenom', p.prenom, 'nom', p.nom) AS patient
     FROM enquete_de_satisfaction e
     LEFT JOIN patient p ON e.patient_id = p.id
     ORDER BY score_satisfaction_global DESC`
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
export async function PATCH(req: Request) {
  const rawCookie = req.headers.get("cookie");
  if (!rawCookie) return NextResponse.json({ error: "Cookies manquants" }, { status: 401 });

  const parsedCookies = require("cookie").parse(rawCookie);
  const sessionRaw = parsedCookies["admin_session_info"];
  if (!sessionRaw) return NextResponse.json({ error: "Session absente" }, { status: 401 });

  let adminId;
  try {
    const parsed = JSON.parse(sessionRaw);
    if (!parsed?.id) throw new Error();
    adminId = parsed.id.toString();
  } catch {
    return NextResponse.json({ error: "Cookie invalide" }, { status: 401 });
  }

  const dbName = `db_00${adminId}`;
  const pool = new Pool({
    user: "avnadmin",
    host: "postgresql-4b3783ad-o5359142f.database.cloud.ovh.net",
    database: dbName,
    password: "14IYsxzW6e3LMmJVTq0j",
    port: 20184,
    ssl: { rejectUnauthorized: false }
  });

  const { id, etat_action } = await req.json();
  if (!id || !etat_action) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  try {
    const client = await pool.connect();
    await client.query(
      "UPDATE detail_satisfaction SET etat_action = $1 WHERE id = $2",
      [etat_action, id]
    );
    client.release();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur UPDATE :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}