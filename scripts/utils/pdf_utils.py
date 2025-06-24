from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import cm

def get_custom_style():
    return ParagraphStyle(
        "Custom",
        fontName="Helvetica",
        fontSize=7,
        leading=9,
        wordWrap="CJK",
        splitLongWords=False,
    )

def create_pdf_table(data, style=None):
    if style is None:
        style = get_custom_style()
    formatted_data = [[Paragraph(cell.strip(), style) for cell in row] for row in data]
    col_widths = [3.5*cm, 2.0*cm, 4.5*cm, 3.0*cm, 2.0*cm, 2.0*cm, 2.0*cm, 2.0*cm, 2.5*cm]
    table = Table(formatted_data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("WORDWRAP", (0, 0), (-1, -1), True),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
    ]))
    return table