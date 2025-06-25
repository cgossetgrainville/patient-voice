import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "eu-west-par",
  endpoint: "https://s3.eu-west-par.io.cloud.ovh.net",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const prenom = req.headers.get("x-admin-prenom")?.trim().toLowerCase().replace(" ", "_") || "admin";
    const nom = req.headers.get("x-admin-nom")?.trim().toLowerCase().replace(" ", "_") || "admin";
    const adminKey = `${prenom}-${nom}/prompts.json`;

    await s3.send(
      new PutObjectCommand({
        Bucket: "patient-voice",
        Key: adminKey,
        ACL: "public-read",
        ContentType: "application/json",
        Body: JSON.stringify(body, null, 2),
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur d’actualisation des prompts :", error);
    return NextResponse.json({ error: "Erreur d’actualisation des prompts" }, { status: 500 });
  }
}