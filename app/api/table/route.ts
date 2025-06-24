// /Users/m.mur/Patient Voice/patient-voice-app/app/api/table/route.ts
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";


export async function POST(req: NextRequest) : Promise<Response> {
  const { text, patientName, adminPrenom, adminNom} = await req.json();
  const adminName = `${adminPrenom}-${adminNom}`.toLowerCase().replace(/\s+/g, "_") || "admin";

  if (!text) {
    return NextResponse.json({ error: "Aucun texte fourni" }, { status: 400 });
  }

  const trimmed = text.length > 8000 ? text.slice(0, 8000) : text;

  return new Promise((resolve) => {
    const safeName = (patientName || "default").replace(/\s*-\s*/g, "-").replace(/\s+/g, "_");
    const filename = `${safeName}-Tableau`;

    const table = spawn("python3", ["./scripts/table.py"], {
      env: { ...process.env, 
        PDF_FILENAME: filename,
        ADMIN_NAME: adminName,
        ADMIN_PRENOM: adminPrenom,
        ADMIN_NOM: adminNom, 
      }
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
        const endIndex = lines.findIndex(line => line.trim() === "===END_JSON===");
        const firstLine = lines[0];
        const pdfPathMatch = firstLine.match(/^(.+\.pdf)$/);
        const pdfPath = pdfPathMatch ? pdfPathMatch[1].trim() : null;

        if (!pdfPath) {
          resolve(NextResponse.json({ error: "PDF path not found in table output" }, { status: 500 }));
        } else {
          const jsonString = lines.slice(1, endIndex).join("\n");
          let rows = [];
          try {
            rows = JSON.parse(jsonString);
          } catch (e) {
            resolve(NextResponse.json({ error: "Impossible de parser les lignes JSON de table.py" }, { status: 500 }));
            return;
          }
          resolve(NextResponse.json({ pdfPath, rows }));
        }
      }
    });

    table.stdin.write(text);
    table.stdin.end();
  });
}