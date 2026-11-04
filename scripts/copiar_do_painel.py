"""Copia o trabalho do dia (pasta Documentos/Painel_imoveis) para o repositório e regera o site.

A pasta de trabalho continua sendo Documentos/Painel_imoveis + Documentos/Catalogo_de_imoveis.xlsx
(é onde o Claude adiciona casas). Este script traz as mudanças para cá:

    python scripts/copiar_do_painel.py [caminho/da/pasta/Documentos]

Depois: git add -A && git commit -m "Atualiza catálogo" && git push   (ou rode publicar.bat)
"""
import os, shutil, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(RAIZ)
PAINEL = os.path.join(DOCS, 'Painel_imoveis')

COPIAS = [
    (os.path.join(DOCS, 'Catalogo_de_imoveis.xlsx'), 'dados/Catalogo_de_imoveis.xlsx'),
    (os.path.join(PAINEL, 'dados_painel.json'), 'dados/dados_painel.json'),
    (os.path.join(PAINEL, 'avaliacoes.json'), 'dados/avaliacoes.json'),
    (os.path.join(PAINEL, 'Casas_para_visitar.pdf'), 'dados/Casas_para_visitar.pdf'),
    (os.path.join(PAINEL, 'atualizar_painel.py'), 'scripts/atualizar_painel.py'),
    (os.path.join(PAINEL, 'sincronizar.py'), 'scripts/sincronizar.py'),
    (os.path.join(PAINEL, 'pdf_visitas.py'), 'scripts/pdf_visitas.py'),
    (os.path.join(PAINEL, 'template.html'), 'scripts/template.html'),
]


def main():
    if not os.path.isdir(PAINEL):
        sys.exit(f"Pasta não encontrada: {PAINEL}")
    for src, dst in COPIAS:
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(RAIZ, dst))
    fd, fo = os.path.join(PAINEL, 'fotos'), os.path.join(RAIZ, 'site', 'fotos')
    os.makedirs(fo, exist_ok=True)
    n = 0
    for f in os.listdir(fd):
        a, b = os.path.join(fd, f), os.path.join(fo, f)
        if not os.path.exists(b) or os.path.getsize(a) != os.path.getsize(b):
            shutil.copy2(a, b); n += 1
    print(f"Copiado. {n} foto(s) nova(s)/alterada(s).")
    sys.path.insert(0, os.path.join(RAIZ, 'scripts'))
    import gerar_site
    gerar_site.main()


if __name__ == '__main__':
    main()
