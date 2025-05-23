import sys
import os
from openai import OpenAI

url = "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1"

client = OpenAI(
    base_url=url,
    api_key=os.getenv("OVH_API_KEY")
)

prompt_template = """
Tu es un expert en analyse de verbatim patient.

À partir du verbatim ci-dessous, construis un tableau structuré **au format CSV** avec les colonnes suivantes, dans cet ordre exact. Pour la colonne "Étape du parcours", choisis uniquement parmi cette liste standardisée de catégories : Accueil, Prise en charge médicale, Information sur étapes suivantes, Gestion de la douleur et confort, Repas, Environnement et hygiène, Sortie, Relation équipe soignante, Expérience globale.

Étape du parcours, Score satisfaction (0-10), Résumé verbatim, Sentiment, Recommandations, Score Impact, Score Faisabilité, Indice Priorité, État d’action.

**Contraintes obligatoires :**
- Réponds uniquement sous forme de tableau CSV (en-têtes + lignes), une ligne = une entrée.
- N’ajoute aucun commentaire, aucune phrase d’introduction, ni résumé.
- Ne saute aucune colonne. Chaque valeur doit être à sa place, et chaque ligne doit avoir **exactement 9 colonnes**.
- Pour la colonne “Sentiment”, la valeur doit être exactement et exclusivement : POSITIF, NEUTRE, NÉGATIF. Aucun autre mot, aucune variation n’est acceptée.
- Pour la colonne "Recommandation", sois le plus concis possible, en quelques mots, propose une amélioration ou une innovation concrète qui pourrait répondre au problème décrit, mais uniquement si le “Sentiment” est NÉGATIF. Sinon, laisse le champ vide.
- Score Impact et Score Faisabilité sont des entiers entre 1 et 10.
- **Calcule un Indice Priorité de 0 à 100** : plus la situation est critique/urgente, plus la note doit être élevée (0 = non prioritaire, 100 = priorité absolue). Sois cohérent avec l’ensemble du verbatim.
- L’État d’action est toujours "À faire".
- Utilise une seule ligne par entrée. Si un champ dépasse la largeur de colonne, fais des retours à la ligne automatiques dans le PDF, mais ne modifie pas le CSV.
- Sois **extrêmement concis** dans les champs Résumé verbatim, Sentiment, Recommandation.
- Si une cellule contient une virgule, elle doit obligatoirement être entourée de guillemets (exemple : "texte avec, une virgule").
- Tous les champs texte doivent être encadrés de guillemets, même s’ils sont vides.
- Le fichier doit être un CSV bien formé, chaque ligne contenant exactement 9 valeurs, séparées par des commas.

Voici le verbatim à analyser :
\"\"\"{verbatim}\"\"\"

N’oublie pas de suivre **strictement** toutes les contraintes ci-dessus. Ne modifie jamais l’ordre des colonnes.
"""

def generate_patient_table(verbatim: str) -> str:
    response = client.chat.completions.create(
        model="Meta-Llama-3_3-70B-Instruct",
        messages=[
            {"role": "system", "content": "Tu es un assistant médical spécialisé dans l’analyse de la satisfaction patient."},
            {"role": "user", "content": prompt_template.format(verbatim=verbatim)}
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
        
    patient_name = os.getenv("PATIENT_NAME", "default").strip().replace(" ", "_")
    filename = os.getenv("PDF_FILENAME", f"{patient_name}-Tableau")
    pdf_filename = f"{filename}.pdf"
    pdf_path = os.path.join("public", "uploads", pdf_filename)
    
    c = canvas.Canvas(pdf_filename, pagesize=landscape(A4))
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
    reader = csv.reader(io.StringIO(csv_content), strict=True)
    headers = next(reader)  # skip headers
    parsed_rows = []
    for row in reader:
        if len(row) == 9:
            parsed_rows.append({
                "etape_parcours": row[0].strip(),
                "score_satisfaction": int(row[1].strip()),
                "resume_verbatim": row[2].strip(),
                "sentiment": row[3].strip(),
                "recommandation": row[4].strip(),
                "score_impact": int(row[5].strip()),
                "score_faisabilite": int(row[6].strip()),
                "indice_priorite": row[7].strip(),
                "etat_action": row[8].strip(),
            })

    # Impression du chemin PDF suivi des données JSON
    import json
    print(pdf_path)
    print(json.dumps(parsed_rows, ensure_ascii=False))