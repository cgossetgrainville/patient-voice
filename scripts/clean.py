# /Users/m.mur/Patient Voice/patient-voice-app/scripts/clean.py

import os
from openai import OpenAI

url = "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1"

client = OpenAI(
    base_url=url,
    api_key=os.getenv("OVH_API_KEY")
)

def clean_transcription(raw_text: str) -> str:
    prompt = (
        "Voici une transcription brute d’un échange audio entre un professionnel et un patient. "
        "Corrige toutes les fautes et structure le dialogue pour qu’il soit fluide et naturel, sans changer le fond. "
        "Supprime tous les mots parasites et hésitations (comme 'euh', 'hum', les répétitions inutiles, etc.). "
        "Uniformise la ponctuation et réécris si besoin certaines phrases pour une meilleure compréhension, sans jamais dénaturer le propos. "
        "Assure-toi que chaque intervenant est bien identifié (Professionnel ou Patient), comme ceci :\n\n"
        "Professionnel : Bonjour, merci de prendre un peu de temps pour revenir avec nous sur votre hospitalisation...\n"
        "Patient : Alors, globalement, l’accueil était plutôt bon... \n\n"
        "N’ajoute rien, ne résume pas, et n’omets aucune information importante.\n\n"
        f'Transcription : """{raw_text}"""'
    )

    response = client.chat.completions.create(
        model="Meta-Llama-3_3-70B-Instruct",
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
    pdf_path = os.path.join("public", "uploads", pdf_filename)

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
