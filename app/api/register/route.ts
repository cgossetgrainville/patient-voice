import { NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Connexion à PostgreSQL (utilise .env si possible)
const pool = new Pool({
  user: "avnadmin",
  host: "postgresql-4b3783ad-o5359142f.database.cloud.ovh.net",
  database: "DB_CD34",
  password: "14IYsxzW6e3LMmJVTq0j",
  port: 20184,
  ssl: { rejectUnauthorized: false }
});

export async function POST(req: Request) {
  const body = await req.json();
  const { nom, prenom, email, password } = body;

  if (!nom || !prenom || !email || !password) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await pool.connect();

    const result = await client.query(
      "INSERT INTO admin (nom, prenom, email, password) VALUES ($1, $2, $3, $4) RETURNING id",
      [nom, prenom, email, hashedPassword]
    );
    const userId = result.rows[0].id;
    
    const newDbName = `db_00${userId}`;
    await client.query(`CREATE DATABASE ${newDbName}`);

    const waitForDb = async () => {
      const testPool = new Pool({
        user: "avnadmin",
        host: "postgresql-4b3783ad-o5359142f.database.cloud.ovh.net",
        database: newDbName,
        password: "14IYsxzW6e3LMmJVTq0j",
        port: 20184,
        ssl: { rejectUnauthorized: false }
      });

      for (let i = 0; i < 10; i++) {
        try {
          await testPool.query("SELECT 1");
          await testPool.end();
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      throw new Error("La base nouvellement créée ne répond pas.");
    };

    await waitForDb();

    // Initialisation de la base nouvellement créée avec init_db.py
    await new Promise<void>((resolve, reject) => {
      exec(`PATIENT_USER_ID=${userId} python3 ./init_db.py`, (error, stdout, stderr) => {
        if (error) {
          console.error("Erreur init_db.py:", stderr);
          reject(error);
        } else {
          console.log("init_db.py OK:", stdout);
          resolve();
        }
      });
    });

    const s3 = new S3Client({
      region: "eu-west-par",
      endpoint: "https://s3.eu-west-par.io.cloud.ovh.net",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "",
        secretAccessKey: process.env.S3_SECRET_KEY || "",
      },
    });

    const promptsPath = path.join(process.cwd(), "data", "prompts.json");
    const promptsContent = fs.readFileSync(promptsPath);

    const s3Key = `${prenom}-${nom}/prompts.json`;

    await s3.send(
      new PutObjectCommand({
        Bucket: "patient-voice",
        Key: s3Key,
        Body: promptsContent,
        ContentType: "application/json",
      })
    );

    client.release();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur lors de l'inscription :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}