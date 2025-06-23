# /Users/m.mur/Patient Voice/patient-voice-app/scripts/clean.py

import os
import json
from openai import OpenAI

url = "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1"

client = OpenAI(
    base_url=url,
    api_key=os.getenv("OVH_API_KEY")
)

# Load prompts from data/prompts.json
with open(os.path.join(os.path.dirname(__file__), "..", "data", "prompts.json"), "r", encoding="utf-8") as f:
    prompts = json.load(f)

cleaning_prompt_template = prompts["cleaning_prompt"]

def clean_transcription(raw_text: str) -> str:
    prompt = (
        f"{cleaning_prompt_template}\n\n"
        f'Transcription : """{raw_text}"""'
    )

    response = client.chat.completions.create(
        model="Mistral-7B-Instruct-v0.3",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=2048
    )
    return response.choices[0].message.content.strip()

if __name__ == "__main__":
    import sys
    raw_text = sys.stdin.read()
    cleaned = clean_transcription(raw_text)

    from datetime import datetime
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    from reportlab.lib.enums import TA_CENTER, TA_LEFT

    patient_name = os.getenv("PATIENT_NAME", "default").strip().replace(" ", "_")
    pdf_filename = f"{patient_name}-Transcription.pdf"
    pdf_path = f"/tmp/{pdf_filename}"

    # Print path FIRST so route.ts can extract it
    print(pdf_path)
    print()  # ensures line separation
    print(cleaned)

    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        name='TitleStyle',
        parent=styles['Title'],
        alignment=TA_CENTER,
        fontSize=16,
        spaceAfter=18
    )

    dialogue_style = ParagraphStyle(
        name='DialogueStyle',
        parent=styles['Normal'],
        fontSize=11,
        leading=16,
        spaceAfter=8,
        alignment=TA_LEFT
    )

    elements = [Paragraph("Transcription de l’échange professionnel-patient", title_style), Spacer(1, 0.75 * cm)]

    for line in cleaned.split("\n"):
        if not line.strip():
            continue
        if ":" in line:
            speaker, text = line.split(":", 1)
            speaker_formatted = f"<b>{speaker.strip()} :</b><br/>{text.strip()}"
            elements.append(Paragraph(speaker_formatted, dialogue_style))
        else:
            elements.append(Paragraph(line.strip(), dialogue_style))

    doc.build(elements)

    import boto3

    s3_client = boto3.client(
        's3',
        endpoint_url="https://s3.eu-west-par.io.cloud.ovh.net/",
        aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
    )

    admin_prenom = os.getenv("ADMIN_PRENOM", "").strip()
    admin_nom = os.getenv("ADMIN_NOM", "").strip()
    admin_name = f"{admin_prenom}-{admin_nom}".lower().replace(" ", "_") or "admin"
    s3_key = f"{admin_name}/{pdf_filename}"    
    bucket_name = "patient-voice"

    s3_client.upload_file(
        pdf_path,
        bucket_name,
        s3_key,
        ExtraArgs={
            "ACL": "public-read",
            "ContentType": "application/pdf",
            "ContentDisposition": "inline"
        }
    )
    print(s3_key)
