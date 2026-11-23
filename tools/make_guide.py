"""Create the editable English operator guide. Rendering is a separate release gate."""
from pathlib import Path
import json
from docx import Document
from docx.shared import Inches,Pt,RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.text import WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT,WD_CELL_VERTICAL_ALIGNMENT
R=Path(__file__).resolve().parents[1];pages=json.loads((R/'tools/guide_content.json').read_text());d=Document();sec=d.sections[0];sec.page_width=Inches(8.5);sec.page_height=Inches(11);sec.top_margin=Inches(.67);sec.bottom_margin=Inches(.65);sec.left_margin=sec.right_margin=Inches(.72)
normal=d.styles['Normal'];normal.font.name='Calibri';normal.font.size=Pt(11);normal.font.color.rgb=RGBColor.from_string('29382C');normal.paragraph_format.space_after=Pt(7);normal.paragraph_format.line_spacing=1.12
for n,sz in [('Title',32),('Heading 1',24),('Heading 2',14)]:
 s=d.styles[n];s.font.name='Calibri';s.font.size=Pt(sz);s.font.bold=n!='Title';s.font.color.rgb=RGBColor.from_string('334632');s.paragraph_format.space_after=Pt(9);s.paragraph_format.space_before=Pt(10 if n=='Heading 2' else 0)
# Small utility footer, not a decorative header.
p=sec.footer.paragraphs[0];p.alignment=2;rr=p.add_run('RETROBOOTH  /  v0.8  /  ');rr.font.size=Pt(8);rr.font.color.rgb=RGBColor.from_string('777D70');f=OxmlElement('w:fldSimple');f.set(qn('w:instr'),'PAGE');p._p.append(f)
for i,(title,subtitle,blocks) in enumerate(pages):
 if i:d.add_page_break()
 p=d.add_paragraph('LUCE STUDIO  /  OPERATOR GUIDE' if i==0 else 'SETUP & RUNNING',style='Subtitle');p.runs[0].font.size=Pt(9);p.runs[0].font.color.rgb=RGBColor.from_string('747E6D')
 d.add_paragraph(title,style='Title' if i==0 else 'Heading 1');p=d.add_paragraph(subtitle);p.runs[0].bold=True;p.paragraph_format.space_after=Pt(16)
 for kind,value in blocks:
  if kind=='h':d.add_paragraph(value,style='Heading 2')
  elif kind=='p':d.add_paragraph(value)
  elif kind=='code':
   for line in value.splitlines():
    p=d.add_paragraph();p.paragraph_format.space_after=Pt(1);p.paragraph_format.line_spacing=1.05;run=p.add_run(line);run.font.name='Consolas';run.font.size=Pt(9.5)
   d.add_paragraph().paragraph_format.space_after=Pt(0)
  elif kind=='steps':
   for j,line in enumerate(value):
    p=d.add_paragraph();p.paragraph_format.left_indent=Inches(.22);p.paragraph_format.first_line_indent=Inches(-.22);r=p.add_run(str(j+1)+'.  ');r.bold=True;p.add_run(line)
  elif kind=='table':
   t=d.add_table(rows=0,cols=len(value[0]));t.alignment=WD_TABLE_ALIGNMENT.CENTER;t.autofit=False
   widths=[2.0,5.06] if i in [0,8] else [1.85,5.21]
   for col,width in zip(t.columns,widths):col.width=Inches(width*.94)
   for ri,row in enumerate(value):
    cells=t.add_row().cells
    for ci,text in enumerate(row):
     cell=cells[ci];cell.width=t.columns[ci].width;cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER;p=cell.paragraphs[0];p.paragraph_format.space_after=Pt(5);p.paragraph_format.space_before=Pt(5);p.paragraph_format.line_spacing=1.03;r=p.add_run(text);r.font.size=Pt(10.3);r.bold=ri==0
     tcPr=cell._tc.get_or_add_tcPr();mar=OxmlElement('w:tcMar')
     for tag in ['top','left','bottom','right']:
      e=OxmlElement('w:'+tag);e.set(qn('w:w'),'90');e.set(qn('w:type'),'dxa');mar.append(e)
     tcPr.append(mar)
     if ri==0:
      shade=OxmlElement('w:shd');shade.set(qn('w:fill'),'E3E8D8');tcPr.append(shade)
    if ri==0:
     rep=OxmlElement('w:tblHeader');t.rows[0]._tr.get_or_add_trPr().append(rep)
   d.add_paragraph().paragraph_format.space_after=Pt(0)
# Remove inherited title/header rules from the environment's base template.
for root in [d.element,d.styles.element]:
 for border in root.xpath('.//w:pBdr'):
  border.getparent().remove(border)
d.core_properties.title='RetroBooth v0.8 - Setup and running guide';d.core_properties.author='Luce Studio';d.core_properties.subject='Private cloud delivery alpha - operation and build guide'
out=R/'docs/RetroBooth_v0.8_Setup_and_Running_Guide.docx';d.save(out);print(out)
