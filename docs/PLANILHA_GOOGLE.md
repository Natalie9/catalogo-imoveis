# Planilha Google (Drive) e Apps Script

Objetivo: deixar a planilha no Google Drive e usar essa mesma planilha para guardar, ao vivo,
as notas, os comentários e os descartes que a Natalie e a Jéssica fazem no site.

## 1. A planilha no Drive

Ela já existe: [Catálogo de Imóveis](https://docs.google.com/spreadsheets/d/1eWDkxo6Nlr5mf-y6eB73duTFmkoLQ_rvkKRZuuQEsX0/edit),
criada pelo Claude. O conteúdo entra no passo 2: o script copia a aba "Imóveis" do `.xlsx` que está no GitHub.
Para recriar do zero, crie uma Planilha Google vazia e siga os passos abaixo.

## 2. Instalar o Apps Script

1. Na Planilha Google, abra **Extensões → Apps Script**.
2. Apague o conteúdo de `Código.gs` e cole o conteúdo de [`apps_script/Code.gs`](../apps_script/Code.gs).
3. (A constante `RAW` já aponta para `Natalie9/catalogo-imoveis`; ajuste se o repositório mudar.)
4. Em **⚙️ Configurações do projeto → Propriedades do script → Adicionar propriedade**, crie
   `CHAVE` com uma senha à sua escolha. É a "senha do painel" que o site pede na primeira gravação
   em cada navegador. Passe essa senha para a Jéssica.
5. Selecione a função `importarTudoDoGitHub` e clique em **Executar**. Na primeira vez, o Google pede
   autorização. Isso preenche a aba `Imóveis` (da planilha `dados/Catalogo_de_imoveis.xlsx` do repositório, com a formatação) e cria as abas
   `notas`, `comentarios` e `descartes` (de `dados/avaliacoes.json`). Depois, o menu **Catálogo** da
   planilha faz o mesmo.
6. Clique em **Implantar → Nova implantação → ⚙️ App da Web**, com:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
7. Copie a URL que termina em `/exec`.

## 3. Ligar o site

Em `site/config.js`:

```js
window.CATALOGO_CONFIG = { apiUrl: "https://script.google.com/macros/s/AKfy.../exec", atualizarSegundos: 20 };
```

Rode `publicar.bat`. A partir daí, o site mostra as estrelas e o campo de comentário habilitados.

> Se você mudar o `Code.gs`, use **Implantar → Gerenciar implantações → Editar → Nova versão**
> para a URL continuar a mesma.

## 4. Levar as notas para o .xlsx (opcional)

As colunas N–Q da planilha local recebem as notas pelo script de sincronização:

```bash
python scripts/sincronizar.py "https://script.google.com/macros/s/AKfy.../exec"
```

Ele também grava `avaliacoes.json` e regera os painéis.

## Segurança

- Quem tem a URL `/exec` consegue **ler** as notas. Como o repositório é público, elas já estão lá de qualquer forma.
- Para **gravar** é preciso a `CHAVE`. Se ela vazar, troque a propriedade no Apps Script. Na tentativa
  seguinte, o site pede a senha nova.
- O Apps Script só aceita as pessoas `natalie` e `jessica`, e comentários de até 2000 caracteres.
