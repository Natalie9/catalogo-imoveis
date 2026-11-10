# Google Sheets como base

A [planilha do catálogo](https://docs.google.com/spreadsheets/d/1TaUluQulubmyRxq2qgPJEYHAmfKsZtX_VQOCmdqpq2I/edit) é a fonte exclusiva dos dados. Nenhum processo deve substituir Imóveis por uma cópia do GitHub.

## Leitura e edição

O navegador consulta a exportação CSV pública de Imóveis e itera sobre suas linhas. R–Z guardam os dados antes mantidos em JSON/fotos locais. Veja os campos em [ARQUITETURA.md](ARQUITETURA.md).

A leitura pública já estava habilitada. Se for desabilitada, o site indicará falha de acesso. Não amplie permissões de edição para permitir leitura: são permissões distintas.

Use o Sheets ou uma conexão autorizada de edição. ChatGPT/Claude alteram células e conferem o resultado. Automações no GitHub precisam de autenticação própria no Google Sheets, sem commit por mudança de dados.

## Avaliações

A troca de planilha exige atualizar também o Apps Script. A versão deste repositório abre explicitamente a nova planilha por ID, identifica esse ID na resposta e rejeita gravações destinadas a outra base. O cliente confere o destino antes de gravar.

apps_script/Code.gs contém uma versão compatível sem rotinas de importação que sobrescrevem dados. A instalação antiga pode ainda ter o menu **Importar tudo do GitHub**: não o use. Para substituir esse código antigo, abra Extensões → Apps Script, atualize o código e publique uma nova versão na implantação existente, preservando a URL. Isso é manutenção do backend, não uma etapa para atualizar imóveis.

Em instalação nova: cole Code.gs no script vinculado à planilha e implante como app da Web (executar como proprietário, acesso: qualquer pessoa). Não há senha: quem tiver a URL da API pode gravar avaliações. Configure a URL /exec em site/config.js.

## Migração

As linhas/validações A–Q e as abas de avaliações são preservadas. R–Z recebem localização, distância, cidade e links de fotos. N–Q agora são fórmulas de resumo por ID, sem uso pela interface. AA–AD separam construção, metragem original, detalhes de financiamento e pendências.

Fotos com links originais usam esses links. As que só existiam no repositório usam URLs imutáveis de um commit histórico. Não há cópias de fotos na versão atual. Substituir a URL na planilha atualiza a imagem sem deploy.

## Ativação da nova base

1. Atualize o projeto Apps Script que atende a URL de site/config.js com apps_script/Code.gs.
2. Publique uma nova versão na implantação existente, preservando a URL e as permissões atuais.
3. Confira que GET retorna spreadsheetId igual a 1TaUluQulubmyRxq2qgPJEYHAmfKsZtX_VQOCmdqpq2I.
4. Reconcilie novas avaliações recebidas na base antiga durante a migração antes da troca.
5. Publique o catálogo somente depois dessa verificação. Se usar outra implantação, atualize apiUrl.

Não basta trocar spreadsheetId no frontend: o Apps Script antigo continuaria gravando na base anterior.
