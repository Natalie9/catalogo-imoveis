# Protocolo para inserir e atualizar imóveis

**Base oficial:** [Google Sheets — Catálogo de Imóveis](https://docs.google.com/spreadsheets/d/1TaUluQulubmyRxq2qgPJEYHAmfKsZtX_VQOCmdqpq2I/edit), aba **Imóveis**. A planilha é a base de dados do site. Inclusões e correções são feitas nela; não exigem alteração de código, commit ou deploy.

## Inserir um anúncio

1. **Verifique se já existe.** Procure primeiro pelo ID e pela URL do anúncio. Se não encontrar, compare endereço/bairro, preço, descrição, fotos e telefone/imobiliária. Anúncios de portais diferentes podem ser a mesma oferta: confirme antes de criar uma nova linha. Não una anúncios distintos só porque parecem ser do mesmo imóvel.
2. **Crie uma linha na aba Imóveis**, mantendo a ordem dos cabeçalhos e as validações. Preencha o que o anúncio ou uma fonte confiável confirma; deixe o restante vazio. Nunca use zero para representar dado desconhecido.
3. **Gere o ID estável em M** conforme o padrão da fonte (tabela abaixo). Confirme que ele não existe. O ID identifica a oferta no catálogo e liga o imóvel às notas, comentários e descartes.
4. **Preencha as colunas de resumo A–M** e os campos complementares R–AD conforme as regras abaixo. Use números nas colunas numéricas e mantenha URLs completas.
5. **Copie as fórmulas de N–Q da linha anterior** para a nova linha, ajustando-as para o ID da nova linha. Confira que continuaram como fórmulas e que os resumos apontam para o ID correto.
6. **Confira a publicação:** reabra a planilha e o site, atualize a listagem pelo botão **Atualizar agora** (ou aguarde a atualização periódica) e confirme que o anúncio, as fotos e os campos exibidos estão corretos.

## Atualizar um anúncio existente

1. Localize a linha pelo ID em M; use a URL em A como segunda referência. Edite a mesma linha, preservando o ID.
2. Compare com o anúncio atual e atualize somente os dados que mudaram ou foram confirmados. Se o anúncio saiu do ar, marque X como **Sim**; não apague a linha apenas por isso.
3. Preserve comentários, avaliações e fórmulas N–Q. Não substitua fórmulas por valores, nem altere diretamente as abas **notas**, **comentarios** ou **descartes** durante uma simples atualização.
4. Registre ambiguidades e o que falta confirmar em AD (**Pendências**); use K (**Observações**) para contexto que ajude a interpretar o anúncio. Quando uma informação vier de outra fonte, anote a origem e se é confirmada ou aproximada.
5. Atualize o site e confira a alteração, como no passo 6 de inserção.

## Regras das colunas

- **A–M:** dados principais do anúncio. A contém a URL original; M contém o ID único e estável. H (**Financiamento**) usa `Sim`, `Não` ou `A confirmar`; detalhe condições ou restrições em AC, sem inferir aceitação de financiamento a partir de uma simulação de consórcio.
- **E, Z, AA e AB — áreas:** E guarda somente área do lote; AA, somente área construída. Z classifica como `lote`, `construida` ou `a confirmar`. Se o anúncio publicar uma metragem sem esclarecer o tipo, deixe E e AA vazias, copie o número original para AB e use `a confirmar` em Z. Não deduza o tipo pela metragem.
- **R–V — localização:** use R para latitude, S para longitude, T para distância, U para precisão/origem da localização e V para cidade/localidade, conforme os cabeçalhos. Não invente coordenadas nem endereço exato. Se as coordenadas forem aproximadas, diga isso em U; a distância calculada será também aproximada.
- **W — Fotos:** informe links públicos das imagens, como uma URL por linha ou uma lista JSON de URLs. Prefira links diretos às imagens do anúncio, confira que abrem e mostram o imóvel e não baixe nem duplique as fotos no repositório.
- **X — anúncio fora do ar:** `Sim` ou `Não` conforme o estado observado; use AD se não foi possível verificar.
- **Y — piscina:** `sim` (na casa), `cond` (no condomínio), `prev` (prevista/em construção) ou `não`. Não presuma que uma piscina do condomínio pertence ao imóvel.
- **AC — financiamento detalhado** e **AD — pendências:** preserve as condições específicas e os pontos ainda não confirmados. Informação ausente fica em branco.

## IDs e integridade do histórico

Use um identificador único derivado do código do anúncio, seguindo o padrão já existente:

| Fonte | Exemplo |
| --- | --- |
| OLX | `OLX-1541506374` |
| Zap | `ZAP-2906675033` |
| Imovelweb | `IW-3048034929` |
| QuintoAndar | `QA-150089142` |
| GH Imóveis | `GH-GH2779` |
| Urbs | `URBS-U-0020101` |
| Nonato | `NONATO-2810` |
| Adão | `ADAO-15430` |

Não recicle, renomeie ou troque um ID após o imóvel receber avaliações/comentários: esses registros se relacionam pelo ID e podem deixar de aparecer associados. Ao corrigir um ID criado por engano, verifique e migre também todos os registros ligados a ele antes de removê-lo.

## Retirar da seleção

Para deixar de considerar um imóvel, use **Status = Rejeitado** ou o fluxo de descarte disponível no painel. Isso preserva o histórico. Não exclua a linha como método normal de rejeição. A remoção física só deve ocorrer quando o registro for de fato inválido/duplicado e após verificar se há notas, comentários ou descartes vinculados.

## Atualização por ChatGPT ou automação

O pedido deve incluir o link do anúncio e a ação desejada (inserir, atualizar ou retirar da seleção). O assistente deve procurar ID/URL e possíveis duplicatas, extrair apenas dados comprováveis, registrar lacunas sem inventá-las, editar a linha apropriada na planilha e reler a linha para validar o resultado. O acesso ao repositório GitHub, por si só, não autoriza a edição da planilha. Não incluir tokens ou credenciais em células, código ou instruções.
