# Script principal pour générer un tableau structuré à partir d'un verbatim patient :
# 1. Appelle un LLM via l'API OVH pour transformer le texte libre en tableau structuré.
# 2. Génère un PDF avec ce tableau.
# 3. Parse les données pour obtenir un JSON structuré.
# 4. Téléverse le PDF généré dans un bucket S3 (OVH).
import sys
import os
import json
from utils.openai_utils import get_openai_client
from utils.s3_utils import upload_to_ovh_s3
from utils.s3_utils import download_prompts_from_s3
from utils.pdf_utils import create_pdf_table, get_custom_style
# Imports pour la génération du PDF avec ReportLab
from reportlab.lib.pagesizes import landscape, A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import cm
from reportlab.platypus import Table, TableStyle
from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import tempfile


client = get_openai_client()


prompts = download_prompts_from_s3()

# Préparation du prompt à envoyer au LLM
prompt_template = prompts["table_prompt"]

# Fonction pour interroger le LLM et obtenir un tableau structuré au format texte
def generate_patient_table(verbatim: str) -> str:
    # Envoie la requete au LLM pour generer le rapport structure
    response = client.chat.completions.create(
        model="Meta-Llama-3_3-70B-Instruct",
        messages=[
            {"role": "system", "content": "Tu es un assistant médical spécialisé dans l’analyse de la satisfaction patient."},
            {"role": "user", "content": prompt_template.format(etapes=prompts["etapes_prompt"], verbatim=verbatim)}
        ],
        temperature=0.3,
        max_tokens=1800
    )
    return response.choices[0].message.content.strip()

if __name__ == "__main__":
    verbatim = sys.stdin.read()
    table = generate_patient_table(verbatim)

    lines = table.strip().split("\n")
    # Nettoyage des lignes CSV générées par le LLM (suppression des balises markdown éventuelles)
    lines = [line for line in lines if not line.strip().startswith("```")]  # remove ```csv

    csv_lines = lines
        
    patient_name = os.getenv("PATIENT_NAME", "default").strip().replace(" ", "_")
    pdf_filename = os.getenv("PDF_FILENAME", f"{patient_name}-Tableau.pdf").strip()
    if not pdf_filename.endswith(".pdf"):
        pdf_filename += ".pdf"
    pdf_path = os.path.join(tempfile.gettempdir(), pdf_filename)
    
    c = canvas.Canvas(pdf_path, pagesize=landscape(A4))
    width, height = landscape(A4)
    
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, height - 1.5 * cm, "Analyse de la satisfaction patient")
    x, y = 2 * cm, height - 2.5 * cm
    line_height = 0.6 * cm
    max_width = width - 4 * cm

    import csv, io
    csv_content = "\n".join(csv_lines)
    reader = csv.reader(io.StringIO(csv_content), strict=True)
    csv_data = [row for row in reader]
    table_obj = create_pdf_table(csv_data)
    table_obj.wrapOn(c, width - 4 * cm, height)
    table_obj.drawOn(c, x, y - table_obj._height)

    c.save()

    # Relecture CSV pour extraction structurée
    import logging
    logging.basicConfig(level=logging.INFO)

    # Relecture du CSV pour extraire les données sous forme de dictionnaires (pour JSON)
    reader = csv.reader(io.StringIO(csv_content), strict=True)
    headers = next(reader)  # skip headers
    parsed_rows = []
    line_index = 1
    for row in reader:
        if len(row) == 9:
            try:
                parsed_rows.append({
                    "etape_parcours": row[0].strip(),
                    "score_satisfaction": int(row[1].strip().replace('"', '')),
                    "resume_verbatim": row[2].strip(),
                    "sentiment": row[3].strip(),
                    "recommandation": row[4].strip(),
                    "score_impact": int(row[5].strip().replace('"', '')),
                    "score_faisabilite": int(row[6].strip().replace('"', '')),
                    "indice_priorite": row[7].strip().replace('"', ''),
                    "etat_action": row[8].strip(),
                })
            except Exception as e:
                logging.warning(f"[Ligne {line_index}] Erreur de parsing: {e} - Ligne ignorée: {row}")
            finally:
                line_index += 1

    # S'assurer que le chemin est bien imprimé avec .pdf
    if not pdf_path.endswith(".pdf"):
        pdf_path += ".pdf"
    print(pdf_path)
    print(json.dumps(parsed_rows, ensure_ascii=False))
    print("===END_JSON===")



    # Envoi du PDF généré vers le bucket S3 OVH
    upload_to_ovh_s3(pdf_path, pdf_filename)