import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "eu-west-par",
  endpoint: "https://s3.eu-west-par.io.cloud.ovh.net",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
});
const bucketName = "patient-voice";

export async function GET(req: NextRequest) {
  const prenom = req.headers.get("x-admin-prenom")?.trim().toLowerCase().replace(" ", "_");
  const nom = req.headers.get("x-admin-nom")?.trim().toLowerCase().replace(" ", "_");
  const key = `${prenom}-${nom}/prompts.json`;

  try {
    const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
    const response = await s3.send(command);
    const stream = response.Body as NodeJS.ReadableStream;
    const data = await new Promise<string>((resolve, reject) => {
      let body = "";
      stream.on("data", chunk => body += chunk);
      stream.on("end", () => resolve(body));
      stream.on("error", reject);
    });
    return NextResponse.json(JSON.parse(data));
  } catch (err) {
    return NextResponse.json({ error: "Impossible de lire les prompts sur S3." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const prenom = req.headers.get("x-admin-prenom")?.trim().toLowerCase().replace(" ", "_");
  const nom = req.headers.get("x-admin-nom")?.trim().toLowerCase().replace(" ", "_");
  const key = `${prenom}-${nom}/prompts.json`;

  try {
    const body = await req.json();
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(body, null, 2),
      ContentType: "application/json",
      ACL: "public-read",
    });
    await s3.send(putCommand);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Impossible d’écrire les prompts sur S3." }, { status: 500 });
  }
}