# Arquitetura

## Fontes de dados

### Planilha `Catalogo_de_imoveis.xlsx`, aba "Imóveis"

| Col. | Conteúdo | Observações |
|---|---|---|
| A | Link do anúncio | obrigatório; define a fonte (OLX, Zap, Imovelweb, QuintoAndar, GH, Urbs, Nonato, Adão…) |
| B | Bairro | |
| C | Rua / referência | |
| D | Preço (R$) | número |
| E | Tamanho do lote (m²) | se só houver área construída, ela entra aqui e o comentário (K) diz "Coluna E com a área" → o card mostra "área …m²*" |
| F | Quartos | |
| G | Quintal | texto livre |
| H | Financia? | |
| I | Contato | corretor ou anunciante e telefone |
| J | Imobiliária | vira etiqueta no card e filtro |
| K | Comentário | texto livre; alguns trechos viram etiquetas (veja abaixo) |
| L | Status | `Em avaliação` (padrão) ou `Rejeitado` |
| M | **ID** | chave de tudo: `OLX-<n>`, `ZAP-<n>`, `IW-<n>`, `QA-<n>`, `GH-<cod>`, `URBS-U-<n>`, `NONATO-<n>`, `ADAO-<n>` |
| N–Q | Nota Natalie · Nota Jéssica · Comentários do painel · Descartada no painel | **reescritas** pelo `sincronizar.py`; não editar à mão |

### Marcadores lidos no comentário (coluna K)

`atualizar_painel.py` → `tags_for()` / `pool_kind()`:

| Texto no comentário | Efeito |
|---|---|
| "piscina" | etiqueta **Piscina**; "lazer do condomínio com piscina" → **Piscina do condomínio**; "espaço para piscina" / "piscina a instalar" → **Espaço p/ piscina** |
| "ÁGIO" / "ágio" | etiqueta vermelha **Ágio** |
| "ALERTA" | etiqueta **Alerta** |
| "DIVERG" | **Dados divergentes** |
| "Possivelmente a mesma casa", "Também anunciada", "mesmo imóvel" | **Anunciada em 2 lugares** |
| "desatualizado", "parado" | **Anúncio antigo** |
| "Comentário da Natalie: “…”" | aparece em destaque no card |
| "Coluna E com a área" | tamanho marcado com * |

Evite escrever "sem piscina", porque o classificador entende isso como piscina.

### `dados_painel.json`

Objeto `{ID: {lat, lng, km, geo, cidade, img:[urls], fora_do_ar?}}`. Ele é preenchido quando a casa
é cadastrada: o geocódigo vem do Nominatim, pelo bairro, e `km` é a distância em linha reta até a
UFG em (-16.6045, -49.2625). Se um ID ainda não está aqui, a casa aparece sem pino e sem foto.

### `site/fotos/<ID>.webp`

Uma foto por casa, copiada do anúncio e convertida para WebP.

### `avaliacoes.json`

`{notas:[{casa,pessoa,estrelas,quando}], comentarios:[{casa,pessoa,texto,quando}], descartes:[{casa,pessoa,quando}]}`
é o formato de troca usado por `sincronizar.py` e por `importarDoGitHub()` no Apps Script.

## O painel (`scripts/template.html`)

Um único arquivo HTML, CSS e JS, sem dependências. Os marcadores são substituídos pelo gerador:

| Marcador | Valor |
|---|---|
| `/*__DATA__*/` | JSON com a lista de casas |
| `/*__MODE__*/` | `local`, `pub` ou `gh` |
| `/*__HEADEXTRA__*/` | tags extras no `<head>` (no `gh`: `config.js` + `ghdb.js`) |
| `/*__TRIGGER__*/` | ID da tarefa agendada do Claude (só `pub`) |

| Modo | Onde | Fotos | Notas e comentários |
|---|---|---|---|
| `local` | `Painel_imoveis/Painel_imoveis.html` | `fotos/<ID>.webp` | só leitura (colunas N–Q) |
| `pub` | link do claude.ai | embutidas em base64 | banco do claude.ai |
| `gh` | GitHub Pages | `fotos/<ID>.webp` | Planilha Google via `ghdb.js` (ou só leitura sem `apiUrl`) |

Recursos do painel:

- filtros por imobiliária, bairro, faixa de preço (dois cursores), faixa de tamanho e piscina;
- busca por texto;
- ordenação por preço, tamanho e nota, nos dois sentidos;
- agrupamento por imobiliária, bairro, faixa de preço, faixa de tamanho e estrelas da Natalie ou da Jéssica;
- estrelas e comentários por pessoa e descarte com confirmação.

### `ghdb.js`

Ele imita a parte do banco do claude.ai que o painel usa
(`collection().onSnapshot`, `doc().set/delete`, `add`):

- **Leitura:** um `GET <apiUrl>?op=all` a cada 20 s, que gera os eventos `added`, `modified` e `removed`.
- **Gravação:** um `POST` com `Content-Type: text/plain` (para evitar o preflight de CORS) e o corpo
  `{op, col, id, data, chave}`. A senha fica em `localStorage["cat-chave"]`, só naquele navegador.

## Scripts

| Script | O que faz |
|---|---|
| `scripts/atualizar_painel.py` | Lê a planilha e gera `Painel_imoveis.html` (local) e `painel_publicar.html` (claude.ai). Também oferece `carregar()` e `pagina()` para outros scripts |
| `scripts/gerar_site.py` | Gera `site/index.html` (modo `gh`) com os dados do repositório |
| `scripts/copiar_do_painel.py` | Copia planilha, JSONs, fotos e scripts de `Documentos/Painel_imoveis` para o repositório e roda `gerar_site.py` |
| `scripts/sincronizar.py` | Recebe um `avaliacoes.json` ou a URL do Apps Script, grava as colunas N–Q da planilha e regera os painéis |
| `scripts/pdf_visitas.py` | Gera o PDF "Casas para visitar", agrupado pelas estrelas da Natalie e ordenado do menor preço para o maior |
| `scripts/exemplo_adicionar_casas.py` | Modelo do script que o Claude usa para incluir linhas novas na planilha |
