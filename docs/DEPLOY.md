# Deploy no GitHub Pages

## Jeito rápido: `publicar.bat`

Pré-requisitos no Windows:

- [Git for Windows](https://git-scm.com/download/win);
- de preferência também o [GitHub CLI](https://cli.github.com/) (`winget install GitHub.cli`);
- Python 3 com `openpyxl` (`pip install openpyxl`), para regerar o site no computador.
  Sem Python, o GitHub Actions gera o site do mesmo jeito.

Dê um duplo clique em `publicar.bat`. Ele:

1. Usa o login do GitHub que já está no Windows. Sem login, abre o navegador uma vez (`gh auth login`).
2. Copia as novidades de `..\Painel_imoveis` e da planilha (`scripts/copiar_do_painel.py`) e regera `site/index.html`.
3. Faz `git add` e `commit`.
4. Na primeira vez, cria o repositório **público** `catalogo-imoveis`.
5. Faz o `push` para `main`.
6. Liga o GitHub Pages com a fonte "GitHub Actions".

O site fica em `https://<usuario>.github.io/catalogo-imoveis/` uns 1–2 minutos depois.
Acompanhe na aba **Actions** do repositório.

## Jeito manual

```bash
cd Documentos/catalogo-imoveis
git init -b main
git add -A && git commit -m "Primeira versão"
gh repo create catalogo-imoveis --public --source . --remote origin --push
# ou: crie o repositório vazio em github.com/new e
#     git remote add origin https://github.com/<usuario>/catalogo-imoveis.git && git push -u origin main
```

Depois, no GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## O workflow (`.github/workflows/pages.yml`)

Ele roda a cada push em `main`, ou à mão pelo botão "Run workflow":

1. Instala Python e `openpyxl`.
2. Roda `python scripts/gerar_site.py`: planilha + `dados_painel.json` + template → `site/index.html`.
3. Publica a pasta `site/` com `actions/upload-pages-artifact` e `actions/deploy-pages`.

Ou seja: para atualizar o site, basta commitar uma planilha ou fotos novas.

## Depois do primeiro deploy

1. Configure a Planilha Google e o Apps Script ([PLANILHA_GOOGLE.md](PLANILHA_GOOGLE.md)).
2. Cole a URL `/exec` em `site/config.js` (`apiUrl`).
3. Rode `publicar.bat` de novo.
