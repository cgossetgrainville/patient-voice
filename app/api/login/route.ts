import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import type { NextRequest } from "next/server";

const pool = new Pool({
  user: "avnadmin",
  host: "postgresql-4b3783ad-o5359142f.database.cloud.ovh.net",
  database: "DB_CD34",
  password: "14IYsxzW6e3LMmJVTq0j",
  port: 20184,
  ssl: { rejectUnauthorized: false },
});

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  try {
    const result = await pool.query("SELECT * FROM admin WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });

    res.cookies.set("admin_session", "true", {
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
    });

    res.cookies.set("admin_session_info", JSON.stringify({
      id: user.id,
      prenom: user.prenom,
      nom: user.nom,
    }), {
      httpOnly: false,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24,
    });

    return res;

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}