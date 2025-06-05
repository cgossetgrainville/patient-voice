import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);

export async function POST(req: Request) {
  try {
    const { transcription, patientName } = await req.json();

    if (!transcription || !patientName) {
      return NextResponse.json({ success: false, error: "Paramètres manquants" }, { status: 400 });
    }

    const [prenom, nom] = patientName.split("-").map((s: string) => s.trim());

    const cleanRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/clean`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: transcription, prenom, nom }),
    });
    const cleanData = await cleanRes.json();

    const rapportRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/rapport`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: transcription, prenom, nom }),
    });
    const rapportData = await rapportRes.json();

    const tableRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/table`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: transcription, patientName }),
    });
    const tableData = await tableRes.blob();

    const formData = new FormData();
    const tableBuffer = Buffer.from(await tableData.arrayBuffer());
    const tablePath = `public/uploads/${prenom}-${nom}-Tableau.pdf`;
    fs.writeFileSync(tablePath, tableBuffer);

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
        pdf_tableau: `/uploads/${prenom}-${nom}-Tableau.pdf`,
        pdf_rapport: rapportData.pdfPath,
        tableau: cleanData.csv,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur dans /api/save-task :", error);
    return NextResponse.json({ success: false, error: "Erreur lors de la sauvegarde." }, { status: 500 });
  }
}