"""Gera o site do GitHub Pages (site/index.html) a partir dos dados do repositório.

Uso (na raiz do repositório):
    python scripts/gerar_site.py

Lê:   dados/Catalogo_de_imoveis.xlsx, dados/dados_painel.json, scripts/template.html, site/fotos/
Gera: site/index.html  (modo "gh": fotos em arquivos, notas/comentários pela Planilha Google)

O GitHub Actions (.github/workflows/pages.yml) roda este script a cada push,
então basta atualizar a planilha/fotos e fazer commit.
"""
import csv, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, 'scripts'))
import atualizar_painel as ap  # noqa: E402

XLSX = os.path.join(RAIZ, 'dados', 'Catalogo_de_imoveis.xlsx')
SIDE = os.path.join(RAIZ, 'dados', 'dados_painel.json')
SITE = os.path.join(RAIZ, 'site')
EXTRA = '<script src="config.js"></script>\n<script src="ghdb.js"></script>'


def main():
    rows = ap.carregar(XLSX, SIDE)
    for x in rows:
        x['foto'] = os.path.exists(os.path.join(SITE, 'fotos', f"{x['id']}.webp"))
    tpl = open(os.path.join(RAIZ, 'scripts', 'template.html'), encoding='utf-8').read()
    html = ap.pagina(tpl, 'gh', rows, EXTRA)
    html = ('<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<meta name="robots" content="noindex">\n'
            + html.replace('<div class="wrap">', '</head>\n<body>\n<div class="wrap">', 1) + '\n</body>\n</html>\n')
    open(os.path.join(SITE, 'index.html'), 'w', encoding='utf-8').write(html)
    # cópia em CSV da aba "Imóveis" (lida pelo Apps Script para montar a Planilha Google)
    import openpyxl
    ws = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)['Imóveis']
    with open(os.path.join(RAIZ, 'dados', 'Catalogo_de_imoveis.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        for r in ws.iter_rows(values_only=True):
            if any(v is not None for v in r):
                w.writerow(['' if v is None else v for v in r])
    sem = [x['id'] for x in rows if not x['foto']]
    print(f"site/index.html: {len(rows)} casas; {len(sem)} sem foto salva")


if __name__ == '__main__':
    main()
