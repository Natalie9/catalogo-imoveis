# Adicionar ou atualizar casas

Use a [planilha online](https://docs.google.com/spreadsheets/d/1eWDkxo6Nlr5mf-y6eB73duTFmkoLQ_rvkKRZuuQEsX0/edit), aba **Imóveis**. Não altere arquivos do repositório para cadastrar casas.

1. Leia o anúncio e procure o ID/link antes de inserir. Se já existe, edite a mesma linha. Se parece ser a mesma casa de outra imobiliária, registre a relação nos comentários e confira antes de duplicar.
2. Preencha A–M, preservando cabeçalhos e validações. Use números em preço, área e quartos. Não invente campos ausentes. M deve conter um ID único e estável.
3. Em R–V, informe localização, distância e cidade quando confirmadas. Identifique coordenadas aproximadas em Precisão da localização. Se T estiver vazio e houver coordenadas, o site calcula a distância em linha reta até a UFG.
4. Em W (Fotos), coloque links públicos diretos das imagens: uma URL, uma URL por linha ou ["https://exemplo.com/foto1.jpg","https://exemplo.com/foto2.jpg"]. Confira se a imagem mostra a casa, não a marca genérica do portal. Não baixe fotos nem as envie para o GitHub.
5. X indica anúncio fora do ar. Y aceita sim (piscina da casa), cond (condomínio), prev (espaço/previsão) ou não. Z aceita lote ou construída.
6. Abra o site e clique em Atualizar agora, ou aguarde a checagem periódica. Não faça commit/deploy por alteração de dados.

Para retirar da avaliação, prefira Status = Rejeitado ou o descarte pelo painel, preservando o histórico. Para remover da listagem, exclua a linha. Não mude o ID de uma casa avaliada: as avaliações ficariam separadas do cadastro.

As abas notas, comentarios e descartes contêm as avaliações atuais. N–Q de Imóveis são campos históricos. Não sobrescreva avaliações ao incluir/atualizar anúncios.

## IDs por fonte

| Fonte | Exemplo |
| --- | --- |
| OLX | OLX-1541506374 |
| Zap | ZAP-2906675033 |
| Imovelweb | IW-3048034929 |
| QuintoAndar | QA-150089142 |
| GH Imóveis | GH-GH2779 |
| Urbs | URBS-U-0020101 |
| Nonato | NONATO-2810 |
| Adão | ADAO-15430 |

ChatGPT, Claude e automações no GitHub seguem o mesmo procedimento pela conexão autorizada com o Google Sheets. Acesso ao GitHub sozinho não concede edição na planilha. Não guarde tokens no código, nas células ou em instruções.
