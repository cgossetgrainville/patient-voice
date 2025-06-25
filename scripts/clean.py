import os
import json
from utils.openai_utils import get_openai_client
from utils.s3_utils import upload_to_ovh_s3
# Imports pour la génération du PDF avec ReportLab
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from reportlab.lib.enums import TA_CENTER, TA_LEFT


client = get_openai_client()

from utils.s3_utils import download_prompts_from_s3
prompts = download_prompts_from_s3()

cleaning_prompt_template = prompts["cleaning_prompt"]

# Appel au LLM pour nettoyer la transcription brute
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


    # Définition du nom de fichier PDF à partir du nom du patient
    patient_name = os.getenv("PATIENT_NAME", "default").strip().replace(" ", "_")
    pdf_filename = f"{patient_name}-Transcription.pdf"
    pdf_path = f"/tmp/{pdf_filename}"

    # Print du chemin tmp du pdf pour que le route.ts puisse le resuperer
    print(pdf_path)
    print()  
    print(cleaned)

    # Création du document PDF avec mise en page
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

    # Construction du contenu du PDF à partir du texte nettoyé
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


    # Envoi du PDF généré vers le bucket S3 OVH
    upload_to_ovh_s3(pdf_path, pdf_filename)
