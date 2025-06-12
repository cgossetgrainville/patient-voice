import sys
import os
import json
from openai import OpenAI

url = "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1"

client = OpenAI(
    base_url=url,
    api_key=os.getenv("OVH_API_KEY")
)

with open(os.path.join("data", "prompts.json"), "r", encoding="utf-8") as f:
    prompts = json.load(f)

prompt_template = prompts["table_prompt"]

def generate_patient_table(verbatim: str) -> str:
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

    from reportlab.lib.pagesizes import landscape, A4
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import cm
    from reportlab.platypus import Table, TableStyle
    from reportlab.platypus import Paragraph
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors

    lines = table.strip().split("\n")
    lines = [line for line in lines if not line.strip().startswith("```")]  # remove ```csv

    csv_lines = lines
        
    import tempfile
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

    styles = getSampleStyleSheet()
    custom_style = ParagraphStyle(
        "Custom",
        parent=styles["BodyText"],
        wordWrap="CJK",
        splitLongWords=False,
        fontName="Helvetica",
        fontSize=7,
        leading=9,
    )

    import csv, io
    csv_content = "\n".join(csv_lines)
    reader = csv.reader(io.StringIO(csv_content), strict=True)
    csv_data = []
    for row in reader:
        wrapped_row = [Paragraph(cell.strip(), custom_style) for cell in row]
        csv_data.append(wrapped_row)

    col_widths = [3.5*cm, 2.0*cm, 4.5*cm, 3.0*cm, 2.0*cm, 2.0*cm, 2.0*cm, 2.0*cm, 2.5*cm]
    table_obj = Table(csv_data, colWidths=col_widths, repeatRows=1)

    table_obj.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("WORDWRAP", (0, 0), (-1, -1), True),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
    ]))

    table_obj.wrapOn(c, width - 4 * cm, height)
    table_obj.drawOn(c, x, y - table_obj._height)

    c.save()

    # Relecture CSV pour extraction structurée
    import logging
    logging.basicConfig(level=logging.INFO)

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

    # Impression du chemin PDF suivi des données JSON
    import json
    # S'assurer que le chemin est bien imprimé avec .pdf
    if not pdf_path.endswith(".pdf"):
        pdf_path += ".pdf"
    print(pdf_path)
    print(json.dumps(parsed_rows, ensure_ascii=False))
    print("===END_JSON===")

# --- Téléversement du PDF sur S3 ---
import boto3
import sys
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

if not os.path.isfile(pdf_path):
    logging.error(f"PDF non trouvé : {pdf_path}")
    sys.exit(1)
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
logging.info(f"PDF uploadé avec succès sur S3 : {s3_key}")
print(s3_key)