

import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const promptsPath = path.join(process.cwd(), "data", "prompts.json");

export async function GET() {
  try {
    const data = fs.readFileSync(promptsPath, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch (err) {
    return NextResponse.json({ error: "Impossible de lire les prompts." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    fs.writeFileSync(promptsPath, JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Impossible d’écrire les prompts." }, { status: 500 });
  }
}