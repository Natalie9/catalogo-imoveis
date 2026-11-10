# Arquitetura

Editores humanos, ChatGPT, Claude e automações autorizadas gravam no Google Sheets. O navegador lê a aba Imóveis pela exportação CSV pública; lê e grava as avaliações pelo Apps Script. O GitHub Pages entrega somente a interface estática.

Não existe catálogo embutido, cópia offline persistente, geração de HTML por imóvel ou sincronização com arquivos locais.

## Aba Imóveis

Os campos são identificados pelo cabeçalho, permitindo reordenar colunas. Não renomeie cabeçalhos sem atualizar o leitor. Linhas sem link HTTP(S), com ID ausente/inválido ou repetido geram aviso e são ignoradas.

| Coluna | Cabeçalho | Conteúdo |
| --- | --- | --- |
| A | Link original | URL do anúncio, obrigatória |
| B | Bairro | Texto |
| C | Rua / endereço aproximado | Texto |
| D | Preço (R$) | Número |
| E | Área do lote (m²) | Número; somente lote |
| F | Quartos | Número ou texto iniciado com número |
| G | Quintal | Texto |
| H | Financia? | Texto |
| I | Contato do vendedor | Texto |
| J | Imobiliária | Texto |
| K | Comentários | Observações sobre o anúncio |
| L | Status | Em avaliação ou Rejeitado |
| M | ID do anúncio | Obrigatório, único e estável; letras, números, hífen e sublinhado |
| N–Q | Campos antigos do painel | Fórmulas de resumo por ID; não usadas pela interface |
| R | Latitude | Número decimal, opcional |
| S | Longitude | Número decimal, opcional |
| T | Distância UFG (km) | Número; calculado a partir de R/S se vazio |
| U | Precisão da localização | bairro, CEP, endereço, aproximada etc. |
| V | Cidade | Texto; vazio = não informado |
| W | Fotos | URL, URLs separadas por quebras de linha ou array JSON |
| X | Fora do ar | Sim ou Não |
| Y | Piscina | sim, cond, prev, não; vazio infere pelos comentários |
| Z | Tipo de área | lote, construida ou a confirmar |
| AA | Área construída (m²) | Número, somente construção |
| AB | Área informada (m²) | Metragem original; não participa dos filtros |
| AC | Situação do financiamento | Detalhes preservados; H é a opção normalizada |
| AD | Pendências | Informações a confirmar |

Campos ausentes não viram zero. Números com formatação brasileira são aceitos. Links são restritos a HTTP(S) e textos são escapados antes da inserção no HTML. Distâncias são em linha reta até o Campus Samambaia da UFG.

Na base normalizada, a presença de AB ativa a leitura estrita: lote vem somente de E, construção de AA, e AB é apenas referência. O filtro de financiamento usa H.

Compatibilidade com bases antigas sem AB: área do lote (`lot`) e construída (`built`) são separadas no leitor. Se Z indica
construída, E não é tratado como lote; a coluna opcional Área construída (m²)
prevalece quando informada. Tipo de área explícito prevalece sobre inferências
legadas dos comentários. Filtros e diferenças comparam somente a mesma natureza
de área. Faixa de preço ativa exclui registros sem preço. Limites vazios não impõem
cortes. As estatísticas dizem respeito aos resultados filtrados, e notas indisponíveis
aparecem como desconhecidas.

## Detalhes e comparação

`catalogo.js` conserva os contratos globais existentes e o ciclo de atualização;
`decision.js` acrescenta painéis nativos dialog e comparação por ID.
Carregamento: config → sheets → ghdb → catalogo → decision. A seleção de comparação
fica somente na memória da página. Rascunhos de comentário também ficam na sessão e
são restaurados ao alterar filtros. Não há edição pelo site: correções são feitas
na planilha.

O botão Editar na planilha carrega uma nova leitura CSV e resolve o ID estável
diretamente nas linhas recebidas. Exige cabeçalho único e exatamente uma ocorrência
do ID, incluindo linhas que seriam ignoradas pela listagem por outros erros.
Só então navega para a célula do ID. A posição em DATA e o link antigo do modal
não são usados para determinar o destino. Não há escrita nem nova API nesse fluxo.

## Avaliações

- notas: id, casa, pessoa, estrelas, quando. ID usual: ID-da-casa__pessoa.
- comentarios: id, casa, pessoa, texto, quando. Cada comentário tem ID próprio.
- descartes: id, casa, pessoa, quando. ID usual: ID da casa.

Pessoas: natalie e jessica. Não reutilize um ID para outra casa. As avaliações se ligam ao ID e sobrevivem à reordenação de linhas. Não é preciso republicar o backend para editar dados nas abas.

## Atualização e falhas

Imóveis e avaliações são consultados independentemente. Falha nas avaliações não impede a listagem. Se a consulta de imóveis falhar, a leitura anterior nesta sessão é preservada e sua hora aparece no aviso. Há recuperação automática, inclusive após falha inicial, e timeout nas consultas.

Não há consultas sobrepostas. O site pausa a checagem periódica quando está oculto e retoma ao voltar. Filtros são preservados. Atualizações aguardam o fim de comentários em edição; leituras idênticas não reconstroem os cards.

As fotos são carregadas de W. Se uma imagem falhar, tenta-se a próxima URL; se todas falharem, aparece Foto indisponível. Disponibilidade depende da hospedagem de origem.

O workflow testa e publica site/ sem build de dados. As fotos antigas sem link original são acessadas por URLs de um commit anterior; não há arquivos de fotos na versão atual.
