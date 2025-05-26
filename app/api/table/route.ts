// /Users/m.mur/Patient Voice/patient-voice-app/app/api/table/route.ts
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(req: NextRequest) : Promise<Response> {
  const { text, patientName } = await req.json();
  
  if (!text) {
    return NextResponse.json({ error: "Aucun texte fourni" }, { status: 400 });
  }

  const trimmed = text.length > 8000 ? text.slice(0, 8000) : text;

  // Étape 1 : Appeler clean.py
  const cleanedText = await new Promise<string>((resolve, reject) => {
    const clean = spawn("python3", ["./scripts/clean.py"], {
      env: { ...process.env, PATIENT_NAME: patientName }
    });
    let output = "";
    let error = "";

    clean.stdout.on("data", (data) => {
      output += data.toString();
    });

    clean.stderr.on("data", (data) => {
      error += data.toString();
      console.error("Erreur clean.py:", data.toString());
    });

    clean.on("close", (code) => {
      if (code !== 0) {
        reject(`Erreur dans clean.py : ${error}`);
      } else {
        resolve(output.trim());
      }
    });

    clean.stdin.write(trimmed);
    clean.stdin.end();
  }).catch((err) => {
    console.error(err);
    return null;
  });

  if (!cleanedText) {
    return NextResponse.json({ error: "Erreur dans clean.py" }, { status: 500 });
  }

  // Étape 2 : Appeler table.py avec le texte nettoyé
  return new Promise((resolve) => {
    const safeName = (patientName || "default").replace(/\s*-\s*/g, "-").replace(/\s+/g, "_");
    const filename = `public/uploads/${safeName}-Tableau`;

    const table = spawn("python3", ["./scripts/table.py"], {
      env: { ...process.env, PDF_FILENAME: filename }
    });
    let output = "";
    let error = "";

    table.stdout.on("data", (data) => {
      output += data.toString();
    });

    table.stderr.on("data", (data) => {
      error += data.toString();
      console.error("Erreur table.py:", data.toString());
    });

    table.on("close", (code) => {
      if (code !== 0) {
        resolve(NextResponse.json({ error: "Erreur dans table.py", details: error }, { status: 500 }));
      } else {
        // On suppose que la première ligne de output est le chemin du PDF, le reste est le JSON
        const lines = output.trim().split("\n");
        const pdfLine = lines[0] || "";
        const pdfPathMatch = pdfLine.match(/([^\s]+\.pdf)$/i);
        const pdfPath = pdfPathMatch ? pdfPathMatch[1].trim() : "";
        let rows = [];
        try {
          if (lines.length > 1) {
            rows = JSON.parse(lines.slice(1).join("\n"));
          }
        } catch (e) {
          rows = [];
        }
        resolve(NextResponse.json({ pdfPath, rows }));
      }
    });

    table.stdin.write(cleanedText);
    table.stdin.end();
  });
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}