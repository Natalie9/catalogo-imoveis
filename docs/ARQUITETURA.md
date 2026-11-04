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
| E | Área do lote (m²) | Número; se construída, indicar em Z |
| F | Quartos | Número ou texto iniciado com número |
| G | Quintal | Texto |
| H | Financia? | Texto |
| I | Contato do vendedor | Texto |
| J | Imobiliária | Texto |
| K | Comentários | Observações sobre o anúncio |
| L | Status | Em avaliação ou Rejeitado |
| M | ID do anúncio | Obrigatório, único e estável; letras, números, hífen e sublinhado |
| N–Q | Campos antigos do painel | Histórico; não usado pela interface |
| R | Latitude | Número decimal, opcional |
| S | Longitude | Número decimal, opcional |
| T | Distância UFG (km) | Número; calculado a partir de R/S se vazio |
| U | Precisão da localização | bairro, CEP, endereço, aproximada etc. |
| V | Cidade | Texto; vazio = não informado |
| W | Fotos | URL, URLs separadas por quebras de linha ou array JSON |
| X | Fora do ar | Sim ou Não |
| Y | Piscina | sim, cond, prev, não; vazio infere pelos comentários |
| Z | Tipo de área | lote ou construída |

Campos ausentes não viram zero. Números com formatação brasileira são aceitos. Links são restritos a HTTP(S) e textos são escapados antes da inserção no HTML. Distâncias são em linha reta até o Campus Samambaia da UFG.

Área do lote (`lot`) e construída (`built`) são separadas no leitor. Se Z indica
construída, E não é tratado como lote; a coluna opcional Área construída (m²)
prevalece quando informada. Tipo de área explícito prevalece sobre inferências
legadas dos comentários. Filtros e diferenças comparam somente a mesma natureza
de área. Faixa de preço ativa exclui registros sem preço. Limites vazios não impõem
cortes. As estatísticas dizem respeito aos resultados filtrados, e notas indisponíveis
aparecem como desconhecidas.

## Editor e comparação

`catalogo.js` conserva os contratos globais existentes e o ciclo de atualização;
`decision.js` acrescenta painéis nativos dialog, comparação por ID e editor.
Carregamento: config → sheets → ghdb → catalogo → decision. O polling consulta o
gancho `CatalogoDecision.reconcile` após a leitura CSV. Dados de comparação e
correções confirmadas ficam somente na memória da página. Rascunhos de comentário
também ficam na sessão e são restaurados ao alterar filtros.

O editor usa o snapshot autorizado do backend, não o número da linha nem dados
CSV potencialmente atrasados para definir a versão. A gravação usa os arquivos
Code.gs + Properties.gs e API avançada Sheets para células e histórico na mesma
transação. A aba historico_imoveis é criada na primeira correção. N–Q, IDs e
coleções de avaliações não fazem parte dos campos editáveis.

Veja [EDITOR.md](EDITOR.md) para contratos, autorização, implantação, colunas
opcionais, recuperação e limites de concorrência com edições diretas no Sheets.

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
