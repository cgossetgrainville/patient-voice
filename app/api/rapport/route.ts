

import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export async function POST(req: NextRequest): Promise<Response> {
  const { text, prenom, nom } = await req.json();
  const patientName = `${prenom}-${nom}`;

  if (!text) {
    return NextResponse.json({ error: "Aucun texte fourni" }, { status: 400 });
  }

  return new Promise((resolve) => {
    const python = spawn("python3", ["./scripts/rapport.py"], {
      env: {
        ...process.env,
        PATIENT_NAME: patientName,
      },
    });

    let output = "";
    let error = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      error += data.toString();
      console.error("Erreur rapport.py:", data.toString());
    });

    python.on("close", (code) => {
      if (code !== 0) {
        resolve(NextResponse.json({ error: "Erreur dans rapport.py", details: error }, { status: 500 }));
      } else {
        const lines = output.trim().split("\n");
        const pdfPath = lines[0];
        const reportText = lines.slice(1).join("\n");
        resolve(NextResponse.json({ report: reportText, pdfPath }));
      }
    });

    const trimmed = text.length > 8000 ? text.slice(0, 8000) : text;
    python.stdin.write(trimmed);
    python.stdin.end();
  });
}