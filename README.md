# Catálogo de Imóveis

Painel das casas que Natalie e Jéssica avaliam em Goiânia/Aparecida.

- [Site](https://natalie9.github.io/catalogo-imoveis/)
- [Base no Google Sheets](https://docs.google.com/spreadsheets/d/1eWDkxo6Nlr5mf-y6eB73duTFmkoLQ_rvkKRZuuQEsX0/edit)

## Atualizar imóveis

Edite a aba **Imóveis** da planilha online. O site lê os dados ao abrir, ao voltar para a página e a cada 20 segundos enquanto estiver visível. **Atualizar agora** força outra consulta. O Google pode levar algum tempo para disponibilizar uma edição na exportação.

Adicionar, editar ou remover uma linha **não exige código, commit, computador ligado ou deploy**. ChatGPT, Claude e ferramentas com permissão de edição podem modificar a mesma planilha. O GitHub hospeda a interface; uma automação executada no GitHub também precisa de acesso autorizado ao Sheets para escrever dados.

Procure o ID/link antes de cadastrar, evitando duplicatas. Preserve o ID: ele liga a casa às avaliações, independentemente da posição da linha. Veja [como adicionar casas](docs/ADICIONAR_CASAS.md).

Fotos são **links** na coluna Fotos: uma URL, uma URL por linha ou um array JSON. Não baixe nem versione imagens novas. Fotos antigas sem link original usam URLs imutáveis de uma versão histórica do repositório; basta substituir o link na planilha para trocar a imagem.

## Fontes únicas

| Aba | Conteúdo |
| --- | --- |
| Imóveis | Anúncio, localização, distância, cidade e links de fotos |
| notas | Estrelas por ID da casa e pessoa |
| comentarios | Comentários por ID da casa |
| descartes | Casas descartadas no painel |

N–Q de Imóveis são registros históricos preservados. O site usa as três abas de avaliações, não esses campos antigos.

Não há Excel, CSV ou JSON de imóveis no repositório. O CSV online é processado em memória. O PDF de visitas em dados/ é um documento histórico, sem participação no site.

## Interface

- site/index.html: interface estática, sem catálogo embutido.
- site/sheets.js: leitura e normalização das linhas online.
- site/ghdb.js: avaliações pelo Apps Script existente.
- site/config.js: identificadores públicos e URL da API, sem credenciais.

O GitHub Actions testa e publica site/ quando muda o código em main. Não gera HTML a partir de dados e não lê planilhas durante o deploy. Só mudanças na interface precisam de publicação.

Para desenvolver com Node.js 24:

~~~sh
npm ci --ignore-scripts
npm test
npm run preview
~~~

Abra http://127.0.0.1:8000. O preview também lê dados online reais.

A planilha já permitia leitura pública, necessária para este site público. A senha do painel continua necessária para gravar avaliações pelo Apps Script e nunca deve ir para o GitHub. Links de imagens precisam permitir acesso público.

Documentação: [arquitetura](docs/ARQUITETURA.md), [planilha e backend](docs/PLANILHA_GOOGLE.md), [publicação da interface](docs/DEPLOY.md).
