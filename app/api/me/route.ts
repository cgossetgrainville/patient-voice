import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  const info = cookieStore.get("admin_session_info");

  if (!session || session.value !== "true" || !info?.value) {
    return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  }

  try {
    const parsed = JSON.parse(info.value);
    return NextResponse.json({ prenom: parsed.prenom, nom: parsed.nom });
  } catch {
    return NextResponse.json({ error: "Erreur de session" }, { status: 400 });
  }
}