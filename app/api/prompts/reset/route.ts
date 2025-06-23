import { NextResponse } from "next/server";
import { S3Client, CopyObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "eu-west-par",
  endpoint: "https://s3.eu-west-par.io.cloud.ovh.net",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
});

export async function POST(req: Request) {
  const prenom = req.headers.get("x-admin-prenom")?.trim().replace(" ", "_") || "admin";
  const nom = req.headers.get("x-admin-nom")?.trim().replace(" ", "_") || "admin";
  const adminKey = `${prenom}-${nom}/prompts.json`;

  try {
    await s3.send(
      new CopyObjectCommand({
        Bucket: "patient-voice",
        CopySource: "patient-voice/prompts.json",
        Key: adminKey,
        ACL: "public-read",
        ContentType: "application/json",
      })
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur de copie du fichier prompts.json :", error);
    return NextResponse.json({ error: "Erreur de copie" }, { status: 500 });
  }
}