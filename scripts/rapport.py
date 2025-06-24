import sys
import os
import json
from utils.openai_utils import get_openai_client
from utils.s3_utils import upload_to_ovh_s3
# Imports pour la génération du PDF avec ReportLab
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors
import re


client = get_openai_client()

# Chargement du prompt depuis un fichier JSON
with open(os.path.join(os.path.dirname(__file__), "..", "data", "prompts.json"), "r", encoding="utf-8") as f:
    prompts = json.load(f)

rapport_prompt_template = prompts["rapport_prompt"]

def generate_report(raw_text: str) -> str:
    prompt = rapport_prompt_template.replace("{transcription}", raw_text.strip())

    # Envoie la requete au LLM pour generer le rapport structure
    response = client.chat.completions.create(
        model="Meta-Llama-3_3-70B-Instruct",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=2048
    )
    return response.choices[0].message.content.strip()



if __name__ == "__main__":
    raw_text = sys.stdin.read()
    report = generate_report(raw_text)

    # Définition du nom de fichier PDF à partir du nom du patient
    patient_name = os.getenv("PATIENT_NAME", "default").strip().replace(" ", "_")
    pdf_filename = f"{patient_name}-Rapport.pdf"
    pdf_path = f"/tmp/{pdf_filename}"

    # Print du chemin tmp du pdf pour que le route.ts puisse le resuperer
    print(pdf_path)
    print()
    print(report)
    
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

    body_style = ParagraphStyle(
        name='BodyStyle',
        parent=styles['Normal'],
        fontSize=10.5,
        leading=14,
        alignment=TA_LEFT
    )

    # Construction du contenu du PDF à partir du texte nettoyé
    elements = [Paragraph("Rapport de satisfaction patient", title_style), Spacer(1, 0.75 * cm)]

    table_state = {
        "mode": False,
        "data": [],
    }

    # Convertit les lignes de tableau markdown collectées en un tableau PDF stylisé, puis l’insère dans le document
    def flush_table():
        if table_state["mode"] and table_state["data"]:
            wrapped_data = [
                [Paragraph(cell, body_style) for cell in row]
                for row in table_state["data"]
            ]
            col_widths = [doc.width / len(wrapped_data[0])] * len(wrapped_data[0])
            tbl = Table(wrapped_data, colWidths=col_widths)
            tbl_style = [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), 
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 9.5),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("WORDWRAP", (0, 0), (-1, -1), "CJK"),
            ]
            for i in range(1, len(table_state["data"])):
                if i % 2 == 1:
                    tbl_style.append(("BACKGROUND", (0, i), (-1, i), colors.whitesmoke))
            tbl.setStyle(TableStyle(tbl_style))
            elements.append(Spacer(1, 0.5 * cm))
            elements.append(tbl)
            elements.append(Spacer(1, 0.5 * cm))
        table_state["mode"] = False
        table_state["data"] = []

    # Analyse ligne par ligne du rapport pour mise en forme dans le PDF
    for line in report.split("\n"):
        line = line.strip()

        # Ignore les lignes de séparation horizontales
        if line == "---":
            continue

        if not line:
            if table_state["mode"]:
                flush_table()
            elements.append(Spacer(1, 0.4 * cm))
            continue

        # Titres de section : 1. ... / 2. ... etc., affichés en plus grand et en gras
        m_section = re.match(r"^(\d+\.)\s*(.+)", line)
        if m_section:
            if table_state["mode"]:
                flush_table()
            section_title = f"<b><font size=13>{m_section.group(1)} {m_section.group(2)}</font></b>"
            elements.append(Spacer(1, 0.5 * cm))
            elements.append(Paragraph(section_title, body_style))
            continue

        # Remplace "●" par une puce
        if line.startswith("●"):
            if table_state["mode"]:
                flush_table()
            bullet = line.replace("●", "").strip()
            elements.append(Paragraph(f"<bullet>&bull;</bullet> {bullet}", body_style, bulletText=None))
            continue

        # Tableau markdown : | ... | ... |
        if line.startswith("|") and line.endswith("|"):
            # Ignore les séparateurs de tableaux markdown (|----|----|)
            if set(line.replace("|", "").replace("-", "")) == set():
                continue
            # Sépare et stocke les lignes du tableau
            if not table_state["mode"]:
                table_state["mode"] = True
                table_state["data"] = []
            row = [cell.strip() for cell in line.split("|")[1:-1]]
            table_state["data"].append(row)
            continue

        # Si on sort du mode tableau, le restituer dans le PDF
        if table_state["mode"]:
            flush_table()

        # Titres en gras : **...**
        # Supprime les astérisques sans appliquer de mise en forme markdown
        if "**" in line:
            line = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
        line = line.replace("*", "")  # supprime tous les astérisques restants
        line_rich = line

        elements.append(Paragraph(line_rich, body_style))

    # À la fin du fichier, insérer le tableau s'il est encore en attente
    if table_state["mode"]:
        flush_table()

    doc.build(elements)
    
    # Envoi du PDF généré vers le bucket S3 OVH
    upload_to_ovh_s3(pdf_path, pdf_filename)