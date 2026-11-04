"""Sincroniza o Catálogo de Imóveis: painel online -> planilha -> painéis.

Uso (na pasta Documentos/Painel_imoveis):
    python3 sincronizar.py avaliacoes.json
    python3 sincronizar.py https://script.google.com/macros/s/.../exec   (Planilha Google / GitHub Pages)

avaliacoes.json = exportação do banco do painel online, no formato
    {"notas": [ {casa, pessoa, estrelas, quando}, ... ],
     "comentarios": [ {casa, pessoa, texto, quando}, ... ],
     "descartes": [ {casa, pessoa, quando}, ... ]}

O que faz:
  1. Grava nas colunas N-Q da planilha (por ID do anúncio, coluna M):
     N Nota Natalie · O Nota Jéssica · P Comentários do painel · Q Descartada no painel.
     Essas colunas vêm do painel e são reescritas a cada sincronização.
  2. Regera Painel_imoveis.html e painel_publicar.html (atualizar_painel.py).
"""
import copy, json, os, sys
import openpyxl

BASE = os.path.dirname(os.path.abspath(__file__))
XLSX = os.environ.get("CATALOGO_XLSX", os.path.join(BASE, "..", "Catalogo_de_imoveis.xlsx"))
NOMES = {"natalie": "Natalie", "jessica": "Jéssica"}
HEAD = {14: "Nota Natalie (painel)", 15: "Nota Jéssica (painel)", 16: "Comentários do painel", 17: "Descartada no painel"}


def dbr(iso):
    try:
        return f"{iso[8:10]}/{iso[5:7]}/{iso[0:4]}"
    except Exception:
        return ""


def main(path):
    lock = os.path.join(os.path.dirname(XLSX), "~$" + os.path.basename(XLSX))
    if os.path.exists(lock):
        print("ERRO: planilha aberta no Excel; feche e sincronize de novo.")
        sys.exit(2)
    if path.startswith("http"):
        import urllib.request
        av = json.loads(urllib.request.urlopen(path + ("&" if "?" in path else "?") + "op=all", timeout=60).read().decode("utf-8"))
        av = {k: av.get(k, []) for k in ("notas", "comentarios", "descartes")}
        json.dump(av, open(os.path.join(BASE, "avaliacoes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    else:
        av = json.load(open(path, encoding="utf-8"))
    notas, coms, desc = {}, {}, {}
    for n in av.get("notas", []):
        if n.get("casa") and n.get("pessoa") in NOMES and n.get("estrelas"):
            notas.setdefault(n["casa"], {})[n["pessoa"]] = int(n["estrelas"])
    for c in sorted(av.get("comentarios", []), key=lambda c: c.get("quando", "")):
        if c.get("casa") and c.get("texto"):
            coms.setdefault(c["casa"], []).append(f"{NOMES.get(c.get('pessoa'), c.get('pessoa', '?'))} ({dbr(c.get('quando', ''))}): {c['texto']}")
    for d in av.get("descartes", []):
        if d.get("casa"):
            desc[d["casa"]] = f"Sim — {NOMES.get(d.get('pessoa'), 'alguém')}, {dbr(d.get('quando', ''))}"

    wb = openpyxl.load_workbook(XLSX)
    ws = wb["Imóveis"]
    for col, h in HEAD.items():
        c = ws.cell(1, col)
        c.value = h
        c._style = copy.copy(ws.cell(1, 12)._style)
        ws.column_dimensions[openpyxl.utils.get_column_letter(col)].width = 40 if col == 16 else 16
    last = max(r for r in range(2, ws.max_row + 1) if ws.cell(r, 1).value)
    vistos = set()
    for r in range(2, last + 1):
        _id = ws.cell(r, 13).value
        vistos.add(_id)
        vals = {14: notas.get(_id, {}).get("natalie"), 15: notas.get(_id, {}).get("jessica"),
                16: " | ".join(coms.get(_id, [])) or None, 17: desc.get(_id)}
        for col, v in vals.items():
            c = ws.cell(r, col)
            c.value = v
            c._style = copy.copy(ws.cell(r, 12)._style)
    ws.auto_filter.ref = "A1:Q1000"
    wb.save(XLSX)
    orfas = sorted((set(notas) | set(coms) | set(desc)) - vistos)
    print(f"Planilha: {sum(len(v) for v in notas.values())} notas, {sum(len(v) for v in coms.values())} comentários, {len(desc)} descartes gravados.")
    if orfas:
        print("IDs do painel que não estão na planilha:", ", ".join(orfas))

    sys.path.insert(0, BASE)
    import atualizar_painel
    atualizar_painel.main()


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE, "avaliacoes.json"))
