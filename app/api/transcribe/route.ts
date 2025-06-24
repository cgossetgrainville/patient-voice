// app/api/transcribe/route.ts

export const runtime = 'nodejs';

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import axios from "axios";
import FormData from "form-data";
import ffmpeg from "fluent-ffmpeg";


const OVH_API_KEY = process.env.OVH_API_KEY ; // Mets ta clé dans .env

export async function POST(req: Request) {
  const formData = await req.formData();
  const langue = formData.get("langue")?.toString() || "fr";
  let langue2 = langue === "en" ? "us" : langue;
  const OVH_ASR_URL = `https://nvr-asr-${langue}-${langue2}.endpoints.kepler.ai.cloud.ovh.net/api/v1/asr/recognize`;
  const patientName = formData.get("patientName")?.toString() || "Anonyme";
  const file = formData.get("audio") as File;

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const tempDir = os.tmpdir();
  const originalPath = path.join(tempDir, file.name);
  fs.writeFileSync(originalPath, buffer);

  const ext = path.extname(file.name).toLowerCase();

  if (ext === ".txt") {
    const text = fs.readFileSync(originalPath, "utf-8");
    fs.unlinkSync(originalPath);
    return NextResponse.json({ patientName, text });
  }

  if (ext === ".docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ path: originalPath });
    fs.unlinkSync(originalPath);
    return NextResponse.json({ patientName, text: result.value });
  }

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

  // Ajout des options de diarisation et de word boosting
  const speechContext = {
    boost: 20.0,
    phrases: [
      "douleur", "infirmier", "prise en charge", "antalgique", "médecin", "accueil", "repas",
      "hôpital", "sortie", "transfert", "confort", "satisfaction", "soins", "examens", "patient"
    ]
  };

  const config = {
    enable_word_time_offsets: false,
    enable_speaker_diarization: true,
    speech_contexts: [speechContext]
  };

  ovhForm.append("config", Buffer.from(JSON.stringify(config)), {
    filename: "config.json",
    contentType: "application/json",
  });

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
    return NextResponse.json({ error: "Erreur ASR OVH", details: error?.message || error }, { status: 500 });
  }

  if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
  if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

  return NextResponse.json({ patientName, text: transcription });
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "100mb",
    },
  },
};