// Centralisation des appels aux APIs (transcription et sauvegarde)
import { TranscriptionPayload } from "../types";

export async function transcribeAudio(formData: FormData) {
  const res = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
  });

  return res.json();
}

export async function saveSatisfaction(payload: TranscriptionPayload) {
  const [prenomPart, nomPart] = payload.patientName.split("-").map((s) => s.trim());

  const res = await fetch("/api/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nom: nomPart || "Nom inconnu",
      prenom: prenomPart || "Prénom inconnu",
      duree: payload.audioDuration,
      transcription: payload.transcription,
      commentaire_pro: payload.commentaire,
      transcription_corrigee: payload.cleanData.text,
      pdf_transcription: payload.cleanData.pdfPath,
      pdf_tableau: payload.tableData.pdfPath,
      tableau: payload.cleanData.csv,
    }),
  });

  return res.json();
}
