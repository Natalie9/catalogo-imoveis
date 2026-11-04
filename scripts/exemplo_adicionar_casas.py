"""MODELO do script que o Claude usa para incluir casas novas na planilha (cópia de _novas25).

Cada item de `rows` é:
  [url, bairro, rua, preço, E(lote ou área), quartos, quintal, financia, contato, imobiliária, comentário, ID, lat, lng]
Rode a partir da pasta Documentos (onde fica Catalogo_de_imoveis.xlsx) e depois atualizar_painel.py.
"""
import openpyxl, copy, json, os, shutil, math
os.chdir(os.environ.get('DOCUMENTOS', os.path.expanduser('~/Documents')))
f='Catalogo_de_imoveis.xlsx'; wb=openpyxl.load_workbook(f); ws=wb['Imóveis']
S=' Sem comentário da Natalie ainda.'
UFG=(-16.6045,-49.2625)
def km(a,b):
    R=6371;p1,p2=math.radians(UFG[0]),math.radians(a);dp=p2-p1;dl=math.radians(b-UFG[1])
    x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2;return round(2*R*math.asin(math.sqrt(x)),1)
O='https://go.olx.com.br/grande-goiania-e-anapolis/imoveis/'
CH='Chat da OLX'
M=lambda d: f'Coluna E com a área do anúncio (tipo não especificado), não o lote (lote não informado; preenchido em {d}). '
rows=[
[O+'casa-na-vila-bela-4-quartos-1-suite-192m-privativos-1546732149','Vila Bela','CEP 74310-360, perto da Av. T-9',435000,192,4,None,'A confirmar',CH+' (Alfa Center Imóveis)','Alfa Center Imóveis (CRECI 4877)',
 M('29/10/2026')+'192 m² de área privativa. 4 quartos (1 suíte), 2 banheiros, 2 vagas; SEMIMOBILIADA; aceita pet. IPTU R$ 92. Região sudoeste, perto da Av. T-9, longe da UFG. Anúncio de 23/10/2026. Código CA1804 (OLX 1546732149).'+S,'OLX-1546732149',-16.709861,-49.298594],
[O+'casa-4-quartos-parque-atheneu-goiania-1504904574','Parque Atheneu','Rua 3 (CEP 74893-160), rua asfaltada',365000,220,4,'Sim','A confirmar','Corretor Washington Luiz — (62) 99304-3004','Washington Luiz (corretor)',
 'Terreno de 220 m² e 180 m² construídos. 4 quartos (1 suíte), 2 banheiros, sala ampla, ambientes integrados, cozinha grande, área de serviço, quarto de serviço, varanda, quintal, 3 vagas; acessibilidade, cabeamento estruturado, isolamento acústico e térmico, reservatório de água; murada, aceita pet. IPTU R$ 400. Região sudeste, longe da UFG. Não é a casa da linha 199 (mesmo bairro, Rua 201, R$ 385 mil). Anúncio de 25/10/2026. Código OLX 1504904574.'+S,'OLX-1504904574',-16.740612,-49.190125],
[O+'novo-horizonte-aprovada-para-financiar-1522252054','Setor Novo Horizonte','Rua D19 (CEP 74363-600), atrás do centro comercial da Av. César Lattes',375000,244,4,None,'Sim (já aprovada na Caixa)','Corretor Kleber Barbosa (CRECI 18660) — (62) 99112-2342','Barbosa Imóveis',
 'Preço reduzido de R$ 390.000 para R$ 375.000. Casa JÁ AVALIADA PELA CAIXA em R$ 480 mil — financiando 80% da avaliação, a entrada pode ficar em torno de R$ 6 mil (depende da aprovação do comprador; confirmar). '+M('29/10/2026')+'Ficha com 244 m². Sala ampla de 3 ambientes, 3 quartos na casa (1 suíte) + 1 suíte nos fundos (quarto de serviço/visita), 3 banheiros, varanda gourmet nos fundos, área de serviço, 4 vagas. A 100 m de supermercado, padaria e drogaria. Região sudoeste, longe da UFG. Anúncio de 25/08/2026. Código OLX 1522252054.'+S,'OLX-1522252054',-16.719920,-49.321948],
]
ids=' '.join(str(ws.cell(r,13).value) for r in range(2,1001))
last=max(r for r in range(2,1001) if ws.cell(r,1).value)
side={}
for v in rows:
    lat,lng=v[-2:]; v=v[:-2]
    assert v[-1] not in ids, v[-1]
    n=last+1
    for c,x in enumerate(v[:11]+['Em avaliação',v[11]],1):
        src=ws.cell(last,c); dst=ws.cell(n,c); dst.value=x
        if src.has_style: dst._style=copy.copy(src._style)
    for c in range(14,18): ws.cell(n,c)._style=copy.copy(ws.cell(last,c)._style)
    ws.row_dimensions[n].height=ws.row_dimensions[last].height
    side[v[-1]]=dict(lat=lat,lng=lng,geo='CEP (OLX)',km=km(lat,lng),cidade='Goiânia',img=[],fora_do_ar=False)
    print(n,v[-1],side[v[-1]]['km']); last=n
wb.save(f)
p='Painel_imoveis/dados_painel.json'; d=json.load(open(p,encoding='utf-8')); d.update(side)
json.dump(d,open(p,'w',encoding='utf-8'),ensure_ascii=False,indent=1)
for k in side: shutil.copy(f'Painel_imoveis/_novas25/{k}.webp',f'Painel_imoveis/fotos/{k}.webp')
print('ok',len(d))
