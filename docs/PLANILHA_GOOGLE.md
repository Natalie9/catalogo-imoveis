# Planilha Google (Drive) e Apps Script

Objetivo: deixar a planilha no Google Drive e usar essa mesma planilha para guardar, ao vivo,
as notas, os comentários e os descartes que a Natalie e a Jéssica fazem no site.

## 1. Subir a planilha para o Drive

1. Abra o [drive.google.com](https://drive.google.com) e clique em **Novo → Upload de arquivo**.
   Escolha `dados/Catalogo_de_imoveis.xlsx`.
2. Abra o arquivo e use **Arquivo → Salvar como Planilhas Google**. O Apps Script só funciona em
   Planilha Google, não em .xlsx.
3. Compartilhe a planilha com a Jéssica, se quiser. Ela pode editar a aba "Imóveis" direto.

## 2. Instalar o Apps Script

1. Na Planilha Google, abra **Extensões → Apps Script**.
2. Apague o conteúdo de `Código.gs` e cole o conteúdo de [`apps_script/Code.gs`](../apps_script/Code.gs).
3. Na linha `URL_AVALIACOES`, troque `USUARIO_GITHUB` pelo seu usuário do GitHub.
4. Em **⚙️ Configurações do projeto → Propriedades do script → Adicionar propriedade**, crie
   `CHAVE` com uma senha à sua escolha. É a "senha do painel" que o site pede na primeira gravação
   em cada navegador. Passe essa senha para a Jéssica.
5. Selecione a função `importarDoGitHub` e clique em **Executar**. Na primeira vez, o Google pede
   autorização. Isso cria as abas `notas`, `comentarios` e `descartes` com o conteúdo de
   `dados/avaliacoes.json`.
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
