# Como as casas entram no catálogo

O jeito normal: mande os links dos anúncios para o Claude, no Cowork, com a pasta Documentos
conectada. Para cada link ele:

1. Lê o anúncio: título, preço, área, quartos, descrição, anunciante, mapa e fotos.
   - **OLX:** o `data-json` de `#initial-data` (subject, priceValue, properties, location, images, user).
   - **Zap Imóveis:** o texto da página e as fotos em `resizedimgs.zapimoveis.com.br`.
   - **Imovelweb:** o HTML (coordenadas em base64, `imgbr.imovelwebcdn.com`) e a página aberta (descrição).
   - **QuintoAndar:** o `__NEXT_DATA__`.
   - **GH Imóveis / Novo Vista, Urbs, Nonato, Adão:** a página do imóvel.
2. Calcula o **ID** (coluna M) e procura duplicatas. Pode ser o mesmo ID, ou o mesmo endereço,
   preço e área em outra imobiliária. Nesse caso, junta as informações na linha que já existe
   ("Possivelmente a mesma casa…", "Também anunciada em…") e fica com o menor preço.
3. Geocodifica o bairro (Nominatim/OpenStreetMap) e calcula a distância até a UFG.
4. Salva a foto em `Painel_imoveis/fotos/<ID>.webp` e grava a linha na planilha com um script
   `Painel_imoveis/_novasN/add_novasN.py`. O modelo está em `scripts/exemplo_adicionar_casas.py`.
5. Roda `atualizar_painel.py` e republica o painel do claude.ai.

Para levar as novidades ao GitHub Pages, rode `publicar.bat`. Ele chama `scripts/copiar_do_painel.py`.

## À mão

1. Inclua uma linha na planilha com as colunas A–M (veja [ARQUITETURA.md](ARQUITETURA.md)).
2. Inclua `"<ID>": {"lat": .., "lng": .., "km": .., "geo": "bairro", "cidade": "Goiânia", "img": ["url da foto"]}`
   em `dados_painel.json`.
3. Coloque a foto em `site/fotos/<ID>.webp`. É opcional: sem ela, o site usa o primeiro link de `img`.
4. Faça o commit e o push. O Actions regera o site.

## Formatos de ID

| Fonte | ID | De onde vem |
|---|---|---|
| OLX | `OLX-1541506374` | número no fim da URL |
| Zap | `ZAP-2906675033` | `id-<n>` na URL |
| Imovelweb | `IW-3048034929` | `-<n>.html` |
| QuintoAndar | `QA-150089142` | `/imovel/<n>` |
| GH Imóveis | `GH-GH2779` / `GH-CA1649` | código no fim da URL (ou o `cod` do parâmetro `v2` no Novo Vista) |
| Urbs | `URBS-U-0020101` | código `U-…` da página |
| Nonato | `NONATO-2810` | número na URL |
| Adão | `ADAO-15430` | número na URL |
