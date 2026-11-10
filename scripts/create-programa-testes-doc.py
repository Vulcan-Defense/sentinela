from pathlib import Path

from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor


OUT = Path(r"C:\Users\rafae\Documents\boticario\sentinela\docs\programa-aberto-testes-vulcan-protect.docx")
DOWNLOAD_URL = "https://play.google.com/store/apps/details?id=com.sec.vulcan_protect"


def shade(cell, color):
    props = cell._tc.get_or_add_tcPr()
    fill = OxmlElement("w:shd")
    fill.set(qn("w:fill"), color)
    props.append(fill)


def set_cell_border(cell, color="D9E2EA"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = "w:" + edge
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), "6")
        element.set(qn("w:color"), color)


def set_margins(cell, top=120, start=140, bottom=120, end=140):
    tc_pr = cell._tc.get_or_add_tcPr()
    mar = tc_pr.first_child_found_in("w:tcMar")
    if mar is None:
        mar = OxmlElement("w:tcMar")
        tc_pr.append(mar)
    for side, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = mar.find(qn("w:" + side))
        if node is None:
            node = OxmlElement("w:" + side)
            mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def style_run(run, size=None, bold=None, color=None):
    run.font.name = "Aptos"
    run._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
    run._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
    if size:
        run.font.size = Pt(size)
    if bold is not None:
        run.bold = bold
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def add_heading(doc, text, level=1):
    p = doc.add_paragraph(style=f"Heading {level}")
    p.paragraph_format.space_before = Pt(16 if level == 1 else 10)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    style_run(run, 15 if level == 1 else 11, True, "000000")
    return p


def add_body(doc, text, bold_lead=None):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(7)
    p.paragraph_format.line_spacing = 1.18
    if bold_lead:
        lead = p.add_run(bold_lead)
        style_run(lead, 10.5, True, "000000")
    run = p.add_run(text)
    style_run(run, 10.5, False, "1D2935")
    return p


def add_bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.12
    run = p.add_run(text)
    style_run(run, 10.5, False, "1D2935")
    return p


def add_link(paragraph, text, url):
    hyperlink = OxmlElement("w:hyperlink")
    rel_id = paragraph.part.relate_to(url, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", is_external=True)
    hyperlink.set(qn("r:id"), rel_id)
    new_run = OxmlElement("w:r")
    r_pr = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), "007FA3")
    r_pr.append(color)
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    r_pr.append(underline)
    new_run.append(r_pr)
    text_el = OxmlElement("w:t")
    text_el.text = text
    new_run.append(text_el)
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)


doc = Document()
section = doc.sections[0]
section.top_margin = Inches(0.72)
section.bottom_margin = Inches(0.7)
section.left_margin = Inches(0.78)
section.right_margin = Inches(0.78)

styles = doc.styles
styles["Normal"].font.name = "Aptos"
styles["Normal"]._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
styles["Normal"]._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")

title = doc.add_paragraph(style="Title")
title.paragraph_format.space_after = Pt(6)
title_run = title.add_run("Programa aberto de testes do app Vulcan Protect")
style_run(title_run, 24, True, "000000")

subtitle = doc.add_paragraph()
subtitle.paragraph_format.space_after = Pt(18)
subtitle_run = subtitle.add_run("Orientações de participação, monitoramento e privacidade")
style_run(subtitle_run, 12, False, "3D5164")

add_body(doc, "Este programa convida pessoas a instalar e usar o app Vulcan Protect em condições reais. O objetivo é aprimorar a experiência, acompanhar o funcionamento do monitoramento e receber sugestões sobre a interface antes de novas evoluções.")

add_heading(doc, "Como participar")
steps = doc.add_table(rows=1, cols=2)
steps.autofit = False
steps.columns[0].width = Inches(0.55)
steps.columns[1].width = Inches(5.9)
for cell in steps.rows[0].cells:
    shade(cell, "0B2638")
    set_cell_border(cell, "0B2638")
    set_margins(cell)
headers = ["Etapa", "O que fazer"]
for cell, text in zip(steps.rows[0].cells, headers):
    p = cell.paragraphs[0]
    run = p.add_run(text)
    style_run(run, 10, True, "FFFFFF")
    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER

for number, text in [
    ("1", "Baixe o app pelo Google Play."),
    ("2", "Mantenha o app instalado durante o período de testes."),
    ("3", "Acompanhe as informações do app sobre o monitoramento."),
    ("4", "Envie feedback sobre a interface, clareza das telas e facilidade de uso."),
]:
    row = steps.add_row().cells
    for cell in row:
        shade(cell, "F5F9FC")
        set_cell_border(cell)
        set_margins(cell)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
    p0 = row[0].paragraphs[0]
    p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run0 = p0.add_run(number)
    style_run(run0, 11, True, "007FA3")
    run1 = row[1].paragraphs[0].add_run(text)
    style_run(run1, 10.5, False, "1D2935")

download = doc.add_paragraph()
download.paragraph_format.space_before = Pt(10)
download.paragraph_format.space_after = Pt(8)
lead = download.add_run("Link para download: ")
style_run(lead, 10.5, True, "000000")
add_link(download, "Google Play - Vulcan Protect", DOWNLOAD_URL)

add_heading(doc, "O que o programa coleta")
add_body(doc, "A coleta é limitada ao que é necessário para acompanhar o funcionamento do app e melhorar sua experiência. Durante o programa, podem ser usados os seguintes tipos de informação:")
for item in [
    "Informações técnicas do aparelho e do app, como modelo do dispositivo, versão do Android e versão instalada do aplicativo.",
    "Dados de funcionamento do app, como status do monitoramento, eventos técnicos, falhas, desempenho e registros necessários para investigar erros.",
    "Informações enviadas voluntariamente no feedback, incluindo relatos sobre telas, navegação, textos, recursos e dificuldades de uso.",
]:
    add_bullet(doc, item)

add_heading(doc, "Dados que não fazem parte do programa")
add_body(doc, "O programa não solicita o conteúdo de mensagens, fotos, arquivos pessoais, contatos, senhas, dados bancários ou o conteúdo de outros aplicativos. O foco é o comportamento do próprio Vulcan Protect e o feedback fornecido pelo participante.")

add_heading(doc, "O que não será compartilhado com clientes")
add_body(doc, "Dados pessoais, identificadores individuais do dispositivo, registros técnicos vinculados a uma pessoa e feedback identificável não serão compartilhados com clientes. Esses dados são usados apenas para operar e melhorar o programa de testes.")
add_body(doc, "Informações de monitoramento não serão apresentadas a clientes como relatórios individuais de participantes. Quando houver análise de melhoria, ela deve ser tratada internamente e sem expor a identidade de quem participou.")

add_heading(doc, "Comunicações e feedback")
add_body(doc, "Enquanto o app estiver instalado, o participante poderá receber informações relacionadas ao monitoramento e à evolução do programa. A participação também inclui a possibilidade de enviar feedback sobre a interface: o que ficou claro, o que causou dúvida, o que pareceu lento ou o que poderia ser mais fácil de encontrar.")

add_heading(doc, "Sua escolha")
add_body(doc, "A participação é voluntária. Você pode deixar o programa ao desinstalar o app e interromper o envio de feedback. Para dúvidas sobre o programa ou privacidade, entre em contato com a equipe responsável antes de participar.")

note = doc.add_paragraph()
note.paragraph_format.space_before = Pt(14)
note.paragraph_format.space_after = Pt(0)
note_run = note.add_run("Este documento apresenta as regras do programa aberto de testes e deve ser disponibilizado junto ao link de instalação.")
style_run(note_run, 9, False, "526779")

footer = section.footer.paragraphs[0]
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
footer_run = footer.add_run("Vulcan Protect | Programa aberto de testes")
style_run(footer_run, 8.5, False, "526779")

OUT.parent.mkdir(parents=True, exist_ok=True)
doc.core_properties.title = "Programa aberto de testes do app Vulcan Protect"
doc.core_properties.author = "Vulcan Defense"
doc.core_properties.subject = "Orientações de participação, monitoramento e privacidade"
doc.save(OUT)
print(OUT)
