# Catálogo de Imóveis

Google Sheets é a única base de dados. Nunca cadastre ou altere imóveis editando este repositório.

- Planilha: https://docs.google.com/spreadsheets/d/1TaUluQulubmyRxq2qgPJEYHAmfKsZtX_VQOCmdqpq2I/edit
- Leia `docs/ADICIONAR_CASAS.md` antes de modificar dados na planilha.
- Leia a linha atual e procure o ID/link antes de inserir, evitando duplicatas. Preserve o ID quando editar ou reordenar linhas.
- Não altere notas, comentários pessoais e descartes sem instrução explícita. As abas `notas`, `comentarios` e `descartes` são a fonte das avaliações.
- Fotos são links HTTP(S) na coluna `Fotos` (JSON de URLs ou uma URL por linha). Não baixe nem versione fotos de anúncios.
- Não crie planilhas locais, JSONs de imóveis ou exportações CSV como fonte de dados do site.
- Não invente dados ausentes. Campos não confirmados ficam vazios. Coordenadas aproximadas precisam indicar a precisão.
- Alterações na planilha não exigem commit ou deploy. Mudanças de interface são feitas em `site/`; execute `npm ci --ignore-scripts` e `npm test` antes de publicar código.
