// app/api/transcribe/route.ts

export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import FormData from "form-data";
import ffmpeg from "fluent-ffmpeg";

const OVH_ASR_URL = "https://nvr-asr-fr-fr.endpoints.kepler.ai.cloud.ovh.net/api/v1/asr/recognize";
const OVH_API_KEY = "eyJhbGciOiJFZERTQSIsImtpZCI6IjgzMkFGNUE5ODg3MzFCMDNGM0EzMTRFMDJFRUJFRjBGNDE5MUY0Q0YiLCJraW5kIjoicGF0IiwidHlwIjoiSldUIn0.eyJ0b2tlbiI6InlKR0NEVGtnSGRINUdTOSswTnlzWGdyZzRsU1I5ZHlENFhERG9aN0RmMXc9In0.5Wf8B9zb8N9OjTOYYX8hzzK-xgDWgKyIM4ilKHcudOIR4rDydMMHfeUerPcsEQlMzA3V6GJIq1xP7wGw_yt_Ag";

export async function POST(req: Request) {
  const formData = await req.formData();
  const patientName = formData.get("patientName")?.toString() || "Anonyme";
  const file = formData.get("audio") as File;

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }

  // On sauvegarde temporairement le fichier
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const tempDir = os.tmpdir();
  const originalPath = path.join(tempDir, file.name);
  fs.writeFileSync(originalPath, buffer);

  // Toujours utiliser un nom distinct pour le wav
  const wavPath = originalPath + ".converted.wav";

  const convertToWav = () =>
    new Promise((resolve, reject) => {
      ffmpeg(originalPath)
        .audioChannels(1)
        .audioFrequency(16000)
        .toFormat("wav")
        .on("end", () => resolve(true))
        .on("error", reject)
        .save(wavPath);
    });

  await convertToWav();

  // Prépare l'appel à OVH ASR AVEC LE WAV
  const ovhForm = new FormData();
  ovhForm.append("audio", fs.createReadStream(wavPath), path.basename(wavPath));

  let transcription = "";
  try {
    const response = await axios.post(OVH_ASR_URL, ovhForm, {
      headers: {
        ...ovhForm.getHeaders(),
        "Authorization": `Bearer ${OVH_API_KEY}`,
        "accept": "application/json"
      },
      maxBodyLength: Infinity,
    });

    // OVH retourne un tableau de résultats (un par segment)
    if (response.status === 200) {
      // La réponse est un tableau, chaque item a .alternatives[0].transcript
      let resp = '';
      for (const alternative of response.data) {
        if (alternative.alternatives && alternative.alternatives[0]) {
          resp += alternative.alternatives[0].transcript + " ";
        }
      }
      transcription = resp.trim();
    } else {
      return NextResponse.json({ error: "Erreur OVH ASR", details: response.data }, { status: 500 });
    }

  } catch (error: any) {
    if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
    console.error("Erreur ASR OVH :", error?.message || error);
    return NextResponse.json({ error: "Erreur ASR OVH (catch)", details: error?.message || error }, { status: 500 });
  }

  if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
  if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

  return NextResponse.json({ patientName, text: transcription });
}