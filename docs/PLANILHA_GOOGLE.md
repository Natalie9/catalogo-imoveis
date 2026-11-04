# Google Sheets como base

A [planilha do catálogo](https://docs.google.com/spreadsheets/d/1eWDkxo6Nlr5mf-y6eB73duTFmkoLQ_rvkKRZuuQEsX0/edit) é a fonte exclusiva dos dados. Nenhum processo deve substituir Imóveis por uma cópia do GitHub.

## Leitura e edição

O navegador consulta a exportação CSV pública de Imóveis e itera sobre suas linhas. R–Z guardam os dados antes mantidos em JSON/fotos locais. Veja os campos em [ARQUITETURA.md](ARQUITETURA.md).

A leitura pública já estava habilitada. Se for desabilitada, o site indicará falha de acesso. Não amplie permissões de edição para permitir leitura: são permissões distintas.

Use o Sheets ou uma conexão autorizada de edição. ChatGPT/Claude alteram células e conferem o resultado. Automações no GitHub precisam de autenticação própria no Google Sheets, sem commit por mudança de dados.

## Avaliações

O editor da nova interface precisa dos dois arquivos Apps Script e de ativação
explícita; veja [EDITOR.md](EDITOR.md). Essa mudança de backend ainda não foi
implantada por esta entrega. Cadastro/edição direta no Sheets e avaliações antigas
continuam independentes. Não habilite edição pública da planilha para usar o editor.

O Apps Script configurado continua lendo/gravando notas, comentarios e descartes. A migração da listagem não exige mudar sua implantação. CHAVE, nas propriedades do script, é a senha do painel e nunca deve ser publicada.

apps_script/Code.gs contém uma versão compatível sem rotinas de importação que sobrescrevem dados. A instalação antiga pode ainda ter o menu **Importar tudo do GitHub**: não o use. Para substituir esse código antigo, abra Extensões → Apps Script, atualize o código e publique uma nova versão na implantação existente, preservando URL e CHAVE. Isso é manutenção do backend, não uma etapa para atualizar imóveis.

Em instalação nova: cole Code.gs no script vinculado à planilha, configure CHAVE e implante como app da Web (executar como proprietário, acesso público de leitura). A implementação valida a senha antes de gravar avaliações. Configure a URL /exec em site/config.js.

## Migração

As linhas/validações A–Q e as abas de avaliações são preservadas. R–Z recebem localização, distância, cidade e links de fotos. N–Q permanecem como histórico, sem uso pela interface.

Fotos com links originais usam esses links. As que só existiam no repositório usam URLs imutáveis de um commit histórico. Não há cópias de fotos na versão atual. Substituir a URL na planilha atualiza a imagem sem deploy.
