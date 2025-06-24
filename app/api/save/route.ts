import { NextResponse } from "next/server";
import { Pool } from "pg";
import * as cookie from "cookie";

async function query(text: string, params: any[] = [], pool: Pool) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const rawCookie = req.headers.get("cookie");
  if (!rawCookie) {
    return NextResponse.json({ error: "Cookies manquants" }, { status: 401 });
  }

  const parsedCookies = cookie.parse(rawCookie);
  const sessionRaw = parsedCookies["admin_session_info"];

  if (!sessionRaw) {
    return NextResponse.json({ error: "Session absente" }, { status: 401 });
  }

  let adminId;
  try {
    const parsed = JSON.parse(sessionRaw);
    if (!parsed?.id) {
      console.error("ID manquant dans le cookie :", parsed);
      return NextResponse.json({ error: "ID manquant dans le cookie" }, { status: 401 });
    }
    adminId = parsed.id.toString();
  } catch {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
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

  try {
    const body = await req.json();
    const { nom, prenom, transcription, duree, commentaire_pro, tableau } = body;

    let [patient] = await query(
      "SELECT * FROM patient WHERE nom=$1 AND prenom=$2 LIMIT 1",
      [nom, prenom],
      pool
    );

    if (!patient) {
      [patient] = await query(
        "INSERT INTO patient (nom, prenom) VALUES ($1, $2) RETURNING *",
        [nom, prenom],
        pool
      );
    }

    const patientName = `${prenom}-${nom}`.replace(/\s+/g, "_");

    const cleanedText = body.transcription_corrigee;
    const pdfPath = body.pdf_transcription;
    // Remplacement: on récupère le chemin du PDF tableau et les lignes depuis le body
    const pdfTablePath = body.pdf_tableau;
    const rows = JSON.parse(body.tableau || "[]");

    const detailsToInsert = (rows || []).map((row: any) => ({
      etape_parcours: row.etape_parcours,
      score_satisfaction: row.score_satisfaction,
      resume_verbatim: row.resume_verbatim,
      sentiment: row.sentiment,
      score_impact: row.score_impact,
      score_faisabilite: row.score_faisabilite,
      indice_priorite: Math.round(row.indice_priorite),
      etat_action: row.etat_action,
      recommandation: row.recommandation || ""
    }));
    const scores = detailsToInsert.map((r: { score_satisfaction: number }) => r.score_satisfaction);
    const moyenne = scores.length > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : null;
    const label = moyenne !== null
      ? moyenne >= 8
        ? "Très satisfait"
        : moyenne >= 6
        ? "Satisfait"
        : moyenne >= 4
        ? "Peu satisfait"
        : "Insatisfait"
      : null;

    const result = await query(
      `INSERT INTO enquete_de_satisfaction (
        transcription, tableau, pdf_transcription, pdf_tableau, pdf_rapport, duree, source, score_satisfaction_global,
        label_satisfaction_global, nombre_mots, commentaire_pro, patient_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [
        cleanedText, tableau, pdfPath, pdfTablePath, body.pdf_rapport, duree, "interface",
        moyenne, label, cleanedText.split(" ").length, commentaire_pro, patient.id
      ],
      pool
    );
    const enqueteId = result[0].id;

    for (const detail of detailsToInsert) {
      await query(
        `INSERT INTO detail_satisfaction (
          etape_parcours, score_satisfaction, resume_verbatim, sentiment, score_impact, score_faisabilite,
          indice_priorite, etat_action, recommandation, enquete_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          detail.etape_parcours,
          detail.score_satisfaction,
          detail.resume_verbatim,
          detail.sentiment,
          detail.score_impact,
          detail.score_faisabilite,
          detail.indice_priorite,
          detail.etat_action,
          detail.recommandation,
          enqueteId
        ],
        pool
      );
    }

    return NextResponse.json({ success: true, id: enqueteId });
  } catch (error) {
    console.error("Erreur dans /api/save :", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  } finally {
    await pool.end();
  }
}
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, etat_action } = body;

    if (
      !id ||
      !etat_action ||
      !["À faire", "En cours", "Résolu"].includes(etat_action)
    ) {
      return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
    }

    // For PATCH, no dynamic pool is created, so fallback to original connectionString pool
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });

    const [updated] = await query(
      "UPDATE detail_satisfaction SET etat_action=$1 WHERE id=$2 RETURNING *",
      [etat_action, id],
      pool
    );

    await pool.end();

    return NextResponse.json({ success: true, detail: updated });
  } catch (error) {
    console.error("Erreur PATCH /api/save :", error);
    return NextResponse.json({ success: false, error: "Erreur serveur" }, { status: 500 });
  }
}