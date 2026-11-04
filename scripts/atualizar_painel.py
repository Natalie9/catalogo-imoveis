"""Gera os painéis do Catálogo de Imóveis a partir da planilha.

Uso (na pasta Documentos/Painel_imoveis):
    python3 atualizar_painel.py

Lê:
  ../Catalogo_de_imoveis.xlsx   (aba "Imóveis"; coluna M = ID do anúncio)
  dados_painel.json             (localização, distância e links de fotos por ID)
  fotos/<ID>.webp               (foto salva de cada casa)
  template.html                 (layout do painel)
Gera:
  Painel_imoveis.html           (abre no navegador do computador, com mapa real)
  painel_publicar.html          (versão para o link do claude.ai, fotos embutidas)

Casas novas (ID sem entrada em dados_painel.json) aparecem sem pino e sem foto
até o Claude completar a localização e a foto delas.
"""
import base64, json, math, os, re, sys
import openpyxl

BASE = os.path.dirname(os.path.abspath(__file__))
TRIGGER = "trig_01HJTUpBHu4qKGsPZ5Cu9SEb"  # tarefa agendada "Sincronizar Catálogo de Imóveis"
XLSX = os.environ.get("CATALOGO_XLSX", os.path.join(BASE, "..", "Catalogo_de_imoveis.xlsx"))

SRC = {'go.olx.com.br': 'OLX', 'ghimoveis.net.br': 'GH Imóveis', 'quintoandar.com.br': 'QuintoAndar',
       'imovelweb.com.br': 'Imovelweb', 'zapimoveis.com.br': 'Zap Imóveis', 'minha.urbs.com.br': 'Urbs',
       'nonatoimoveis.com.br': 'Nonato Imóveis', 'adaoimoveis.com.br': 'Adão Imóveis', 'urbs.com.br': 'Urbs', 'imoveis.novovista.com.br': 'GH Imóveis (Novo Vista)'}


def ident(u):
    try:
        return _ident(u)
    except Exception:
        return None


def _ident(u):
    if 'novovista' in u:
        import base64, urllib.parse
        q = urllib.parse.parse_qs(urllib.parse.urlparse(u).query).get('v2', [''])[0]
        cod = urllib.parse.parse_qs(base64.b64decode(q + '==').decode())['cod'][0]
        return 'GH-' + cod
    if 'urbs.com.br/imoveis/comprar/' in u: return None  # código U- só aparece na página; preencher a coluna M
    if 'olx.com.br' in u: return 'OLX-' + re.search(r'-(\d{8,})(?:\?|$)', u).group(1)
    if 'ghimoveis' in u: return 'GH-' + u.rstrip('/').rsplit('-', 1)[1]
    if 'quintoandar' in u: return 'QA-' + re.search(r'/(?:classificado|imovel)/(\d+)', u).group(1)
    if 'imovelweb' in u: return 'IW-' + re.search(r'-(\d{8,})\.html', u).group(1)
    if 'zapimoveis' in u: return 'ZAP-' + re.search(r'id-(\d+)', u).group(1)
    if 'urbs' in u: return 'URBS-' + re.search(r'(U-\d+)', u).group(1)
    if 'nonato' in u: return 'NONATO-' + re.search(r'br/(\d+)/', u).group(1)
    if 'adaoimoveis' in u: return 'ADAO-' + re.search(r'/(\d+)-', u).group(1)
    return None


def pool_kind(com):
    """'sim' (tem piscina), 'cond' (piscina do condomínio), 'prev' (espaço/previsão) ou None."""
    kinds=set()
    for m in re.finditer(r'piscin', com or '', re.I):
        before=com[max(0,m.start()-45):m.start()].lower(); after=com[m.end():m.end()+25].lower()
        if 'a instalar' in after or re.search(r'espaço (disponível )?para|potencial para|dá para|lazer com piscina$|fazer piscina|espaço p/', before) or 'para piscina' in before[-14:]:
            kinds.add('prev')
        elif re.search(r'condomínio fechado|condomínio com|lazer do condomínio', before):
            kinds.add('cond')
        else: kinds.add('sim')
    for k in ('sim','cond','prev'):
        if k in kinds: return k
    return None


def tags_for(com, side):
    t = []
    pk = pool_kind(com)
    if pk: t.append(['pool' if pk != 'prev' else 'poolp', {'sim': 'Piscina', 'cond': 'Piscina do condomínio', 'prev': 'Espaço p/ piscina'}[pk]])
    if side.get('fora_do_ar'): t.append(['off', 'Fora do ar'])
    if re.search(r'ÁGIO|\bágio\b', com): t.append(['bad', 'Ágio'])
    elif 'ALERTA' in com: t.append(['bad', 'Alerta'])
    if 'DIVERG' in com: t.append(['warn', 'Dados divergentes'])
    if 'Comprar já alugado' in com: t.append(['warn', 'Já alugada'])
    c2 = re.sub(r'[Nn]ão é a mesma casa|[Nn]ão é a casa', '', com)
    if re.search(r'mesma casa|mesmo imóvel|duplicat|Também anunciada', c2, re.I): t.append(['info', 'Anunciada em 2 lugares'])
    if re.search(r'desatualizado|\bparado\b', com): t.append(['warn', 'Anúncio antigo'])
    return t


def carregar(xlsx=None, side_path=None):
    """Lê a planilha + dados_painel.json e devolve a lista de casas usada pelo template."""
    side = json.load(open(side_path or os.path.join(BASE, 'dados_painel.json'), encoding='utf-8'))
    ws = openpyxl.load_workbook(xlsx or XLSX, read_only=True, data_only=True)['Imóveis']
    rows = []
    for r, v in enumerate(ws.iter_rows(min_row=2, max_col=17, values_only=True), start=2):
        if not v[0]: continue
        url = str(v[0]); _id = v[12] or ident(url)
        sd = side.get(_id, {})
        com = v[10] or ''
        m = re.search(r'Comentário da Natalie:\s*[“"]([^”"]+)[”"]', com)
        q = v[5]
        if isinstance(q, str):
            mm = re.match(r'\d+', q); q = int(mm.group()) if mm else None
        dom = re.match(r'https?://(?:www\.)?([^/]+)', url).group(1)
        rows.append(dict(r=r, id=_id, u=url, s=SRC.get(dom, dom), b=v[1] or '', rua=v[2], p=v[3], l=v[4], q=q,
                         qt=v[6], f=v[7], c=v[8], i=v[9], com=com, st=v[11] or 'Em avaliação',
                         lat=sd.get('lat'), lng=sd.get('lng'), gp=sd.get('geo', 'sem localização'), km=sd.get('km'),
                         cid=sd.get('cidade', 'Goiânia'), img=sd.get('img', []), nat=m.group(1).strip() if m else None,
                         tags=tags_for(com, sd), novo=_id not in side,
                         nn=v[13] if len(v) > 13 else None, nj=v[14] if len(v) > 14 else None,
                         pc=v[15] if len(v) > 15 else None, lc='Coluna E com a área' in com, pool=pool_kind(com)))
    return rows


def pagina(tpl, mode, rows_, extra=''):
    """Preenche o template.html. mode: local | pub | gh."""
    data = json.dumps(rows_, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    return tpl.replace('/*__DATA__*/', data).replace('/*__MODE__*/', mode).replace('/*__HEADEXTRA__*/', extra).replace('/*__TRIGGER__*/', TRIGGER)


def main():
    rows = carregar()
    tpl = open(os.path.join(BASE, 'template.html'), encoding='utf-8').read()

    def page(mode, rows_):
        return pagina(tpl, mode, rows_)

    loc = []
    pub = []
    for x in rows:
        f = os.path.join(BASE, 'fotos', f"{x['id']}.webp")
        a = dict(x, foto=os.path.exists(f)); loc.append(a)
        b = dict(x)
        if os.path.exists(f): b['ph'] = base64.b64encode(open(f, 'rb').read()).decode()
        pub.append(b)
    html = page('local', loc)
    html = ('<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + html.replace('<div class="wrap">', '</head>\n<body>\n<div class="wrap">', 1) + '\n</body>\n</html>\n')
    open(os.path.join(BASE, 'Painel_imoveis.html'), 'w', encoding='utf-8').write(html)
    open(os.path.join(BASE, 'painel_publicar.html'), 'w', encoding='utf-8').write(page('pub', pub))
    novos = [x['id'] for x in rows if x['novo']]
    print(f"{len(rows)} casas; {len(novos)} sem localização/foto salvas: {', '.join(novos) or 'nenhuma'}")


if __name__ == '__main__':
    main()
