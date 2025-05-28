import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcrypt";

// Connexion à PostgreSQL (utilise .env si possible)
const pool = new Pool({
  user: "avnadmin",
  host: "postgresql-4b3783ad-o5359142f.database.cloud.ovh.net",
  database: "DB_CD34",
  password: "14IYsxzW6e3LMmJVTq0j",
  port: 20184,
  ssl: { rejectUnauthorized: false }
});

export async function POST(req: Request) {
  const body = await req.json();
  const { nom, prenom, email, password } = body;

  if (!nom || !prenom || !email || !password) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await pool.connect();

    await client.query(
      "INSERT INTO admin (nom, prenom, email, password) VALUES ($1, $2, $3, $4)",
      [nom, prenom, email, hashedPassword]
    );

    client.release();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur lors de l'inscription :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}