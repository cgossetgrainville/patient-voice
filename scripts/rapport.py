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

rapport_prompt_template = prompts["rapport_prompt"]

def generate_report(raw_text: str) -> str:
    prompt = rapport_prompt_template.replace("{transcription}", raw_text.strip())

    response = client.chat.completions.create(
        model="Meta-Llama-3_3-70B-Instruct",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=2048
    )
    return response.choices[0].message.content.strip()

if __name__ == "__main__":
    import sys
    raw_text = sys.stdin.read()
    report = generate_report(raw_text)

    from datetime import datetime
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.platypus import Table, TableStyle
    from reportlab.lib import colors

    patient_name = os.getenv("PATIENT_NAME", "default").strip().replace(" ", "_")
    pdf_filename = f"{patient_name}-Rapport.pdf"
    pdf_path = os.path.join("public", "uploads", pdf_filename)

    # Print path FIRST so route.ts can extract it
    print(pdf_path)
    print()  # ensures line separation
    print(report)

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

    elements = [Paragraph("Rapport de satisfaction patient", title_style), Spacer(1, 0.75 * cm)]

    table_state = {
        "mode": False,
        "data": [],
    }

    def flush_table():
        if table_state["mode"] and table_state["data"]:
            from reportlab.platypus import Paragraph
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

    import re
    for line in report.split("\n"):
        line = line.strip()

        # Ignore horizontal rule lines
        if line == "---":
            continue

        if not line:
            # If table is open, flush it before adding space
            if table_state["mode"]:
                flush_table()
            elements.append(Spacer(1, 0.4 * cm))
            continue

        # Section titles: 1. ... / 2. ... etc, render larger & bold
        m_section = re.match(r"^(\d+\.)\s*(.+)", line)
        if m_section:
            if table_state["mode"]:
                flush_table()
            section_title = f"<b><font size=13>{m_section.group(1)} {m_section.group(2)}</font></b>"
            elements.append(Spacer(1, 0.5 * cm))
            elements.append(Paragraph(section_title, body_style))
            continue

        # Bulleted list: replace "●" with bullet, format as list
        if line.startswith("●"):
            if table_state["mode"]:
                flush_table()
            bullet = line.replace("●", "").strip()
            elements.append(Paragraph(f"<bullet>&bull;</bullet> {bullet}", body_style, bulletText=None))
            continue

        # Markdown table: | ... | ... |
        if line.startswith("|") and line.endswith("|"):
            # Ignore markdown table separators (|----|----|)
            if set(line.replace("|", "").replace("-", "")) == set():
                continue
            # Split and store table rows
            if not table_state["mode"]:
                table_state["mode"] = True
                table_state["data"] = []
            row = [cell.strip() for cell in line.split("|")[1:-1]]
            table_state["data"].append(row)
            continue

        # If leaving table mode, flush the table
        if table_state["mode"]:
            flush_table()

        # Bold titles: **...**
        # Remove the asterisks without applying Markdown markup
        if "**" in line:
            line = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
        line = line.replace("*", "")  # supprime tous les astérisques restants
        line_rich = line

        elements.append(Paragraph(line_rich, body_style))

    # At EOF, flush table if open
    if table_state["mode"]:
        flush_table()

    doc.build(elements)