import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { cookies } from "next/headers";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const { transcription, patientName } = await req.json();

    if (!transcription || !patientName) {
      return NextResponse.json({ success: false, error: "Paramètres manquants" }, { status: 400 });
    }

    const [prenom, nom] = patientName.split("-").map((s: string) => s.trim());
    const cookieStore = await cookies();
    const sessionInfo = cookieStore.get("admin_session_info")?.value;
    let adminPrenom = "admin";
    let adminNom = "default";
    if (sessionInfo) {
      try {
        const parsed = JSON.parse(sessionInfo);
        adminPrenom = parsed.prenom || adminPrenom;
        adminNom = parsed.nom || adminNom;
      } catch (e) {
        console.warn("⚠️ Cookie admin_session_info illisible :", e);
      }
    }

    const cleanRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/clean`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: transcription, prenom, nom, adminPrenom, adminNom }),
      });
    const cleanData = await cleanRes.json();

    const [rapportRes, tableRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/rapport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcription, prenom, nom, adminPrenom, adminNom }),
      }),
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/table`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: transcription, patientName, adminPrenom, adminNom }),
      }),
    ]);

    const [rapportData, tableJson] = await Promise.all([
      rapportRes.json(),
      tableRes.json(),
    ]);

    const s3TablePath = tableJson.pdfPath;

    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: req.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        nom,
        prenom,
        duree: null,
        transcription,
        commentaire_pro: "",
        transcription_corrigee: cleanData.text,
        pdf_transcription: cleanData.pdfPath,
        pdf_tableau: s3TablePath,
        pdf_rapport: rapportData.pdfPath,
        tableau: JSON.stringify(tableJson.rows || []),
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur dans /api/save-task :", error);
    return NextResponse.json({ success: false, error: "Erreur lors de la sauvegarde." }, { status: 500 });
  }
}