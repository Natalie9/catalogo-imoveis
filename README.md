# Catálogo de Imóveis

Painel das casas que a Natalie e a Jéssica estão avaliando para comprar em Goiânia/Aparecida.
Ele mostra preço, tamanho, bairro, distância até a UFG (Campus Samambaia), foto, piscina e
imobiliária de cada anúncio. Também guarda as notas (estrelas), os comentários e os descartes das duas.

- **Site (GitHub Pages):** `https://<usuario>.github.io/catalogo-imoveis/`
- **Planilha mestre:** `dados/Catalogo_de_imoveis.xlsx` (uma cópia dela fica no Google Drive como Planilha Google)
- **Lista para visitas (PDF):** `dados/Casas_para_visitar.pdf`

> ⚠️ O repositório é **público**. Ele inclui a planilha completa, os telefones e nomes de corretores
> e anunciantes, as fotos copiadas dos anúncios e as notas e comentários pessoais. Isso foi
> escolhido de propósito. Para fechar o acesso, torne o repositório privado (o GitHub Pages
> em repositório privado exige um plano pago).

## Como funciona

```
Documentos/
├── Catalogo_de_imoveis.xlsx      ← planilha de trabalho (o Claude adiciona as casas aqui)
├── Painel_imoveis/               ← pasta de trabalho: fotos, scripts, painéis locais
└── catalogo-imoveis/             ← ESTE repositório
    ├── site/                     ← o que vai para o GitHub Pages
    │   ├── index.html            ← gerado por scripts/gerar_site.py (não editar à mão)
    │   ├── config.js             ← URL do Apps Script (notas ao vivo)
    │   ├── ghdb.js               ← liga o painel à Planilha Google
    │   └── fotos/<ID>.webp       ← uma foto por casa
    ├── dados/
    │   ├── Catalogo_de_imoveis.xlsx
    │   ├── dados_painel.json     ← localização, distância e links de fotos por ID
    │   ├── avaliacoes.json       ← exportação das notas, comentários e descartes
    │   └── Casas_para_visitar.pdf
    ├── scripts/                  ← geradores (Python 3 + openpyxl)
    ├── apps_script/Code.gs       ← backend na Planilha Google
    ├── docs/                     ← documentação detalhada
    ├── .github/workflows/pages.yml
    └── publicar.bat              ← duplo clique: copia, gera, faz o commit e o push
```

1. **Casas** saem da planilha (`dados/Catalogo_de_imoveis.xlsx`, aba "Imóveis"). A coluna M é o ID do anúncio.
2. **Localização e fotos** vêm de `dados/dados_painel.json` e `site/fotos/`.
3. `scripts/gerar_site.py` junta tudo no `scripts/template.html` e grava `site/index.html`.
   O GitHub Actions roda esse script a cada push e publica a pasta `site/`.
4. **Notas, comentários e descartes** ficam numa Planilha Google, nas abas `notas`,
   `comentarios` e `descartes`, por meio de um Apps Script. O site lê essas abas a cada 20 s.
   Para gravar, ele pede a "senha do painel". Sem o Apps Script configurado, o site funciona
   só para leitura e mostra as notas da última sincronização da planilha (colunas N–Q).

## Tarefas comuns

| Quero… | Faço… |
|---|---|
| Publicar ou atualizar o site | Duplo clique em `publicar.bat` |
| Adicionar casas | Mande os links para o Claude. Ele atualiza `Documentos/Painel_imoveis`, e depois é só rodar `publicar.bat`. Veja [docs/ADICIONAR_CASAS.md](docs/ADICIONAR_CASAS.md) |
| Ligar notas e comentários ao vivo | [docs/PLANILHA_GOOGLE.md](docs/PLANILHA_GOOGLE.md) |
| Trazer as notas do site para a planilha .xlsx | `python scripts/sincronizar.py "<URL do Apps Script>"` |
| Gerar o PDF de visitas | `python scripts/pdf_visitas.py site/index.html <pasta_db> dados/Casas_para_visitar.pdf` |
| Ver o site no computador | `python -m http.server -d site 8000` e abrir http://localhost:8000 |

Documentação completa:

- [docs/ARQUITETURA.md](docs/ARQUITETURA.md): dados, colunas da planilha, modos do painel e marcadores dos comentários.
- [docs/DEPLOY.md](docs/DEPLOY.md): GitHub e GitHub Pages, passo a passo.
- [docs/PLANILHA_GOOGLE.md](docs/PLANILHA_GOOGLE.md): Google Drive e Apps Script.
- [docs/ADICIONAR_CASAS.md](docs/ADICIONAR_CASAS.md): como as casas entram, IDs e fontes de dados.
