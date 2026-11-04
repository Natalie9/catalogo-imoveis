# Evolução do catálogo — diagnóstico e execução

## Ponto de partida

Base inspecionada: `ebfe4e3` (alinhada a origin/main). Em 04/11/2026,
`npm ci --ignore-scripts` terminou sem vulnerabilidades e os 10 testes iniciais passaram.

O HTML concentra CSS, estado S/DATA, filtros e renderização `card`/`renderList`.
`sheets.js` normaliza CSV por cabeçalho; `ghdb.js` adapta as três coleções ao Apps Script.
Imóveis são lidos a cada 20s; consultas concorrentes são evitadas e comentários em
digitação suspendem substituições. Preferências ficam no navegador. O workflow
testa e publica apenas site/. IDs ligam imóveis e avaliações.

Problemas confirmados no código: preço ausente passa por faixa ativa; limites de
sliders são fixos; filtro “comentário meu” aceita comentários de qualquer autora;
cidade ausente recebe Goiânia sem evidência; áreas de natureza diferente se misturam;
galeria usa div clicável sem teclado; comentários e formulários tornam cards longos.
A senha atual fica em localStorage. O servidor autoriza por senha compartilhada,
sem identidade autenticada. Não há operação de edição nem histórico de correções.

## Intervenção incremental

1. Corrigir filtros/valores ausentes, preservar preferências e testar.
2. Reorganizar cabeçalho/filtros/cards; adicionar detalhes e comparação acessíveis.
3. Acrescentar editor independente, contrato autorizado com versão, histórico e
   escrita pontual por ID. Preservar APIs de avaliações.
4. Ampliar testes com dados sintéticos, documentar implantação e limitações.

Frontend não exige mudança na planilha. Novos campos são opcionais: só podem ser
editados se o cabeçalho existir. Implantação do Apps Script, habilitação da API
avançada Sheets e revisão das permissões são externas; não serão feitas em produção
nesta entrega. Nenhum teste deve escrever na planilha real.

## Riscos e controles

- Exportação CSV pode atrasar: após gravação, manter resposta confirmada em memória
  e conferir pelo backend antes de aceitar uma versão pública divergente.
- LockService serializa escritores deste script, não edições manuais na planilha.
  Conferência de versão detecta mudanças anteriores ao envio; evitar ordenar/editar
  manualmente durante gravações. A API Sheets aplica células e histórico em lote.
- Senha compartilhada autoriza operações, mas autoria é declarada. Não expor segredo
  no código/URL. Editor pede senha por operação; armazenamento persistente legado
  será removido, preservando a mesma CHAVE no servidor.
- A publicação pública da base não deve conceder edição pública. Revisar compartilhamento
  antes de habilitar o editor. Histórico de correções será lido com autorização.
- Não criar colunas nem mudar dados de produção automaticamente; preparar expansão
  e procedimento de recuperação documentados.

## Resultado implementado

- Filtros principais e avançados, indicação de filtros ativos, entradas brasileiras
  sem faixas fixas, busca com acentos normalizados, autoria explícita para “meu”.
- Preço/área ausentes excluídos de intervalos definidos; lote/construída separados;
  cidade ausente aparece como não informada; valores opcionais não viram zero.
- Cabeçalho orientado à busca, estatísticas dos resultados, cards com ações nomeadas,
  comentários recolhidos, fotos em botão de teclado, temas claro/escuro e foco visível.
- Detalhes com dados completos, opiniões, alertas inferidos identificados e histórico
  autorizado. Comparação de 2–4 imóveis, diferenças em relação à primeira coluna e
  áreas comparáveis, sem pontuação automática de preferência.
- Editor com alterações destacadas, validação, cancelamento, estados de erro,
  proteção contra envio duplicado, conflitos com revisão e atraso do CSV tratado.
- Apps Script com autorização, versão, busca única por ID, lista de campos,
  trava, escrita pontual e histórico atômico. Colunas novas apenas se existentes.
- Senha compartilhada preservada no servidor; cópia persistente legada removida do
  navegador. Novas sessões guardam a senha somente em memória.
- Rascunhos de comentários preservados nos filtros; atualizações aguardam o editor.
  CI de PR separado da publicação de produção.

## Arquivos

| Responsabilidade | Arquivos alterados/adicionados |
| --- | --- |
| Estrutura/estilos/estado | site/index.html, site/catalogo.css, site/catalogo.js, site/decision.css |
| Detalhes/comparação/editor | site/decision.js |
| Leitura de dados/avaliações | site/sheets.js, site/ghdb.js |
| Backend | apps_script/Code.gs, apps_script/Properties.gs |
| Testes | tests/backend.test.cjs, tests/decision.test.cjs, tests/site.test.cjs |
| Ambiente/CI | package.json, package-lock.json, scripts/preview.cjs, .github/workflows/tests.yml |
| Documentação | README.md, docs/ADICIONAR_CASAS.md, docs/ARQUITETURA.md, docs/DEPLOY.md, docs/PLANILHA_GOOGLE.md, docs/EDITOR.md, docs/EVOLUCAO.md |

## Validação executada

- `npm ci --ignore-scripts`: 47 pacotes auditados, zero vulnerabilidades informadas.
- `npm test`: **37 testes passaram**, incluindo os 10 casos anteriores. Testes de
  escrita usam mocks em memória, sem credenciais nem acesso de escrita real.
- `npm run preview`: servidor iniciado e navegado com leitura real do Sheets e
  avaliações. 209 registros carregados; 124 ativos após regras de descarte nessa leitura.
  Contagens são observações da sessão, não valores embutidos na interface.
- Revisão visual em 320px (painel estreito), 390px, 768px, 1024px e 1440px, com
  iframe de viewport fixo no servidor local. Temas claro e escuro inspecionados.
- Abertura real de detalhes e comparação; dados ausentes e foto indisponível
  observados. Tab alcança Fechar; Escape fecha e devolve foco ao card.
- Axe em jsdom nos estados catálogo, detalhes, comparação e editor: nenhuma
  violação nas regras executadas. Contraste e regiões foram excluídos desse teste,
  pois não equivalem a uma análise visual em navegador. Canvas não é renderizado.
- Sintaxe dos scripts frontend/preview e backend verificada (backend também
  executado em VM nos testes). `git diff --check` sem erros de whitespace.

## Verificações não executadas e dependências

Não foi executada implantação nem escrita em Apps Script/Sheets de produção.
Não foi criada planilha de homologação nem feito teste ponta a ponta de gravação
num serviço Google real. Autorização/escopos/API avançada devem ser homologados
conforme [EDITOR.md](EDITOR.md) antes de ativar a edição.

Não foi executada certificação WCAG, teste com leitor de tela, bateria em aparelhos
físicos nem verificação completa em Safari/Firefox. O teste automatizado de
acessibilidade é parcial e complementa a inspeção de teclado, não a substitui.

Notas/comentários/descartes foram lidos no preview; gravações reais dessas coleções
não foram feitas, para preservar os dados. A suite testa a recuperação da API e
a integridade dessas coleções ao editar características.

## Próximos passos de implantação

1. Revisar o PR e homologar backend e interface com uma planilha sintética.
2. Conferir/restringir a edição pública da planilha real, sem retirar a leitura pública.
3. Após autorização, instalar os dois arquivos Apps Script, habilitar Sheets API e
   ativar EDITOR_ENABLED. Publicar o frontend aprovado pela main.
4. Acrescentar somente as colunas opcionais efetivamente necessárias, sem migrar
   valores presumidos nem modificar A–Z/N–Q.

Riscos restantes: senha compartilhada não autentica autoria; locks não coordenam
edições manuais/integrações externas; imagens dependem do host original; publicações
CSV podem atrasar. Esses limites e o procedimento de recuperação estão em EDITOR.md.
