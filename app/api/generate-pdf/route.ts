import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse, NextRequest } from "next/server";

// Fonction pour couper le texte en lignes de 90 caractères max
function splitTextIntoLines(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + word).length > maxCharsPerLine) {
      lines.push(currentLine.trim());
      currentLine = word + " ";
    } else {
      currentLine += word + " ";
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

export async function POST(req: NextRequest) {
  const { patientName, transcription, commentaire } = await req.json();

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 12;

  const margin = 50;
  let y = height - margin;

  const lines = [
    `Compte-rendu de consultation - ${patientName}`,
    "",
    `Transcription :`,
    ...splitTextIntoLines(transcription, 90),
    "",
    ...(commentaire ? [`Commentaire du médecin :`, ...splitTextIntoLines(commentaire, 90)] : [])
  ];

  for (const line of lines) {
    if (y < margin) break;
    page.drawText(line, {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 18;
  }

  const pdfBytes = await pdfDoc.save();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(pdfBytes));
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${patientName}-transcription.pdf"`,
    },
  });
}