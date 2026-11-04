"""Gera o PDF de visitas: casas agrupadas pelas estrelas da Natalie (5 -> 1)."""
import base64, glob, io, json, re, sys
from datetime import datetime, timedelta
from PIL import Image
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
                                Image as RLImage, KeepTogether, PageBreak, CondPageBreak)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

SRC, DB, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
F = '/usr/share/fonts/truetype/dejavu/'
pdfmetrics.registerFont(TTFont('DV', F + 'DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DVB', F + 'DejaVuSans-Bold.ttf'))
pdfmetrics.registerFont(TTFont('DVC', F + 'DejaVuSansCondensed.ttf'))
pdfmetrics.registerFont(TTFont('DVCB', F + 'DejaVuSansCondensed-Bold.ttf'))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily('DVC', normal='DVC', bold='DVCB', italic='DVC', boldItalic='DVCB')

INK = colors.HexColor('#17201a'); MUTED = colors.HexColor('#5d685e'); LINE = colors.HexColor('#d9ded3')
ACC = colors.HexColor('#c98a0f'); CAMP = colors.HexColor('#2f6a3c'); BAD = colors.HexColor('#b2392a'); POOL = colors.HexColor('#0b5c99')
BG = colors.HexColor('#f6f7f2')

s = open(SRC, encoding='utf-8').read()
i = s.index('const DATA=') + 11
DATA, _ = json.JSONDecoder().raw_decode(s[i:])

notas, coms, desc = {}, {}, set()
for f in glob.glob(DB + '/notas/*.json'):
    n = json.load(open(f));
    if n.get('casa') and n.get('estrelas'): notas.setdefault(n['casa'], {})[n['pessoa']] = int(n['estrelas'])
for f in glob.glob(DB + '/comentarios/*.json'):
    c = json.load(open(f))
    if c.get('casa') and c.get('texto'): coms.setdefault(c['casa'], []).append(c)
for f in glob.glob(DB + '/descartes/*.json'):
    desc.add(json.load(open(f)).get('casa') or f.split('/')[-1][:-5])

ativos = [d for d in DATA if d.get('st') != 'Rejeitado' and d['id'] not in desc]
def nat(d): return notas.get(d['id'], {}).get('natalie', 0)
def jes(d): return notas.get(d['id'], {}).get('jessica', 0)

st = lambda name, **k: ParagraphStyle(name, fontName=k.pop('f', 'DVC'), fontSize=k.pop('s', 8.6), leading=k.pop('l', 11), textColor=k.pop('c', INK), **k)
P_PRICE = st('pr', f='DVB', s=15, l=17)
P_B = st('b', f='DVCB', s=10, l=12.5)
P = st('p'); P_M = st('m', c=MUTED, s=8, l=10); P_SM = st('sm', s=7.6, l=9.6)
P_Q = st('q', s=8.4, l=10.6, c=INK)
P_H = st('h', f='DVB', s=17, l=21, spaceBefore=4, spaceAfter=2)
P_HS = st('hs', c=MUTED, s=9, l=12, spaceAfter=6)

esc = lambda t: (str(t or '')).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
brl = lambda v: ('R$ ' + f'{v:,.0f}'.replace(',', '.')) if v else 'sem preço'
dbr = lambda q: (datetime.fromisoformat(q.replace('Z', '+00:00')) - timedelta(hours=3)).strftime('%d/%m') if q else ''
stars = lambda e: '★' * e + '☆' * (5 - e)

def imob(d):
    n = re.sub(r'\(.*?\)', '', d.get('i') or ''); n = re.sub(r'\bCRECI\b.*$', '', n, flags=re.I).strip(' -–·,')
    return n or 'Sem imobiliária'

def photo(d, w, h):
    if not d.get('ph'): return Spacer(w, h)
    im = Image.open(io.BytesIO(base64.b64decode(d['ph']))).convert('RGB')
    r = w / h; iw, ih = im.size
    if iw / ih > r: nw = int(ih * r); im = im.crop(((iw - nw) // 2, 0, (iw - nw) // 2 + nw, ih))
    else: nh = int(iw / r); im = im.crop((0, (ih - nh) // 2, iw, (ih - nh) // 2 + nh))
    im = im.resize((int(w / mm * 12), int(h / mm * 12)))
    b = io.BytesIO(); im.save(b, 'JPEG', quality=78); b.seek(0)
    return RLImage(b, w, h)

def qr(url, size):
    q = qrcode.QRCode(border=1, box_size=4, error_correction=qrcode.constants.ERROR_CORRECT_L); q.add_data(url); q.make(fit=True)
    b = io.BytesIO(); q.make_image(fill_color='black', back_color='white').save(b, 'PNG'); b.seek(0)
    return RLImage(b, size, size)

def short(t, n):
    t = re.sub(r'\s+', ' ', t or '').strip()
    return t if len(t) <= n else t[:n].rsplit(' ', 1)[0] + '…'

def card(d):
    W = A4[0] - 30 * mm
    PW, PH = 54 * mm, 40.5 * mm
    facts = []
    if d.get('q') is not None: facts.append(f"<b>{d['q']}</b> quartos")
    if d.get('l'): facts.append(f"{'área' if d.get('lc') else 'lote'} <b>{str(d['l']).replace('.', ',')} m²</b>{'*' if d.get('lc') else ''}")
    if d.get('qt'): facts.append(f"quintal {esc(d['qt'].lower())}")
    if d.get('f'): facts.append(f"financia {esc(d['f'].lower())}")
    tags = []
    if d.get('km') is not None: tags.append(f"<font color='#2f6a3c'><b>{str(d['km']).replace('.', ',')} km da UFG</b></font>")
    if d.get('pool') in ('sim', 'cond'): tags.append("<font color='#0b5c99'><b>Piscina" + (' do condomínio' if d['pool'] == 'cond' else '') + "</b></font>")
    elif d.get('pool') == 'prev': tags.append("<font color='#0b5c99'>Espaço p/ piscina</font>")
    for t in d.get('tags', []):
        if t[0] in ('pool', 'poolp'): continue
        tags.append(f"<font color='{'#b2392a' if t[0] == 'bad' else '#8a5a00' if t[0] == 'warn' else '#2c5d86'}'><b>{esc(t[1])}</b></font>")
    j = jes(d)
    right = [Paragraph(brl(d.get('p')), P_PRICE), Paragraph(esc(d['b']), P_B)]
    if d.get('rua'): right.append(Paragraph(esc(short(d['rua'], 90)), P_M))
    right.append(Spacer(1, 2)); right.append(Paragraph(' · '.join(facts), P))
    if tags: right.append(Paragraph(' · '.join(tags), P_SM))
    right.append(Paragraph(f"<font color='#c98a0f'>{stars(j)}</font> Jéssica" if j else "<font color='#5d685e'>Jéssica ainda sem nota</font>", P_SM))
    lines = []
    if d.get('nat'): lines.append(f"<i>“{esc(short(d['nat'], 160))}”</i>")
    for c in sorted(coms.get(d['id'], []), key=lambda c: c.get('quando', ''))[-3:]:
        who = 'Natalie' if c.get('pessoa') == 'natalie' else 'Jéssica'
        lines.append(f"<b>{who}</b> ({dbr(c.get('quando'))}): {esc(short(c['texto'], 170))}")
    if lines: right.append(Spacer(1, 2)); right += [Paragraph(x, P_Q) for x in lines]
    contato = esc(short(d.get('c') or '', 70))
    foot = Paragraph(f"<b>{esc(imob(d))}</b>{(' — ' + contato) if contato else ''}<br/><font color='#5d685e'>{esc(d['s'])} · {esc(d['id'])} · linha {d['r']}</font>", P_SM)
    QS = 17 * mm
    bottom = Table([[foot, qr(d['u'], QS)]], colWidths=[W - PW - 6 * mm - QS - 2 * mm, QS + 2 * mm])
    bottom.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'BOTTOM'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0), ('ALIGN', (1, 0), (1, 0), 'RIGHT')]))
    link = Paragraph(f"<link href='{esc(d['u'])}' color='#0b5c99'><u>Abrir anúncio</u></link>", P_SM)
    leftcol = [photo(d, PW, PH), Spacer(1, 3), link]
    t = Table([[leftcol, right + [Spacer(1, 3), bottom]]], colWidths=[PW + 6 * mm, W - PW - 6 * mm])
    t.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
                           ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5), ('LINEBELOW', (0, 0), (-1, -1), 0.6, LINE)]))
    return KeepTogether([t])

def on_page(c, doc):
    c.saveState(); c.setFont('DVC', 7.5); c.setFillColor(MUTED)
    c.drawString(15 * mm, 9 * mm, 'Catálogo de Imóveis · casas para visitar · ordem pelas estrelas da Natalie')
    c.drawRightString(A4[0] - 15 * mm, 9 * mm, f'página {doc.page}'); c.restoreState()

doc = BaseDocTemplate(OUT, pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=13 * mm, bottomMargin=15 * mm,
                      title='Casas para visitar', author='Natalie')
doc.addPageTemplates([PageTemplate(frames=[Frame(15 * mm, 15 * mm, A4[0] - 30 * mm, A4[1] - 28 * mm, 0, 0, 0, 0)], onPage=on_page)])

story = []
hoje = (datetime.now() - timedelta(hours=3)).strftime('%d/%m/%Y')
grupos = {e: sorted([d for d in ativos if nat(d) == e], key=lambda d: (d.get('p') or 9e9, d['r'])) for e in range(5, 0, -1)}
sem = sorted([d for d in ativos if not nat(d)], key=lambda d: (d.get('p') or 9e9, d['r']))
story.append(Paragraph('Casas para visitar', st('t', f='DVB', s=24, l=28)))
resumo = ' · '.join(f"{stars(e)} {len(g)}" for e, g in grupos.items() if g)
story.append(Paragraph(f"Gerado em {hoje}. {sum(len(g) for g in grupos.values())} casas com nota da Natalie, da maior para a menor intenção de compra: {resumo}. "
                       f"Dentro de cada grupo, da mais barata para a mais cara. Descartadas e rejeitadas ficam de fora. "
                       f"No fim, {len(sem)} casas ainda sem nota sua. O QR code de cada casa abre o anúncio no celular. "
                       f"“área*” = área construída ou do anúncio, porque o lote não foi informado.", P_HS))
for e, g in grupos.items():
    if not g: continue
    story.append(CondPageBreak(70 * mm))
    ps = sorted(x['p'] for x in g if x.get('p'))
    story.append(Paragraph(f"<font color='#c98a0f'>{stars(e)}</font>  {e} estrela{'s' if e > 1 else ''}", P_H))
    story.append(Paragraph(f"{len(g)} casa{'s' if len(g) > 1 else ''}" + (f" · R$ {ps[0]//1000:.0f} mil a R$ {ps[-1]//1000:.0f} mil" if ps else ''), P_HS))
    story += [card(d) for d in g]

if sem:
    story.append(PageBreak())
    story.append(Paragraph('Ainda sem nota da Natalie', P_H))
    story.append(Paragraph(f"{len(sem)} casas em avaliação. Da mais barata para a mais cara.", P_HS))
    rows = [[Paragraph('<b>Linha</b>', P_SM), Paragraph('<b>Bairro</b>', P_SM), Paragraph('<b>Preço</b>', P_SM), Paragraph('<b>Tamanho</b>', P_SM), Paragraph('<b>UFG</b>', P_SM), Paragraph('<b>Jéssica</b>', P_SM), Paragraph('<b>Anúncio</b>', P_SM)]]
    for d in sem:
        rows.append([Paragraph(str(d['r']), P_SM), Paragraph(esc(short(d['b'], 48)) + (" <font color='#0b5c99'>· piscina</font>" if d.get('pool') in ('sim', 'cond') else ''), P_SM),
                     Paragraph(brl(d.get('p')), P_SM), Paragraph((f"{str(d['l']).replace('.', ',')} m²" + ('*' if d.get('lc') else '')) if d.get('l') else '–', P_SM),
                     Paragraph((str(d['km']).replace('.', ',') + ' km') if d.get('km') is not None else '–', P_SM),
                     Paragraph(f"<font color='#c98a0f'>{stars(jes(d))}</font>" if jes(d) else '–', P_SM),
                     Paragraph(f"<link href='{esc(d['u'])}' color='#0b5c99'><u>{esc(d['s'])}</u></link>", P_SM)])
    W = A4[0] - 30 * mm
    t = Table(rows, colWidths=[12 * mm, W - 12 * mm - 24 * mm - 18 * mm - 15 * mm - 20 * mm - 22 * mm, 24 * mm, 18 * mm, 15 * mm, 20 * mm, 22 * mm], repeatRows=1)
    t.setStyle(TableStyle([('LINEBELOW', (0, 0), (-1, -1), 0.4, LINE), ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'), ('BACKGROUND', (0, 0), (-1, 0), BG),
                           ('TOPPADDING', (0, 0), (-1, -1), 3), ('BOTTOMPADDING', (0, 0), (-1, -1), 3)]))
    story.append(t)

doc.build(story)
print('ok', {e: len(g) for e, g in grupos.items()}, 'sem nota', len(sem))
