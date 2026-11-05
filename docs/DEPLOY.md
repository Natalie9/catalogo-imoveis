# Publicar a interface

O GitHub Pages hospeda apenas os arquivos estáticos de site/. Não há cópia do catálogo na publicação.

Para mudanças de layout/código:

1. Com Node.js 24, execute npm ci --ignore-scripts e npm test.
2. Teste no navegador com npm run preview.
3. Envie o código para main. O workflow Publicar no GitHub Pages valida e publica site/.
4. Settings → Pages → Source deve estar em GitHub Actions.

Imóveis, fotos, localização e avaliações são alterados apenas na planilha. Suas alterações aparecem nas próximas leituras e **não exigem deploy**.

site/config.js contém ID da planilha, gid de Imóveis, intervalo de consulta e URL do Apps Script. São endereços públicos, sem credenciais.

Não use versões antigas de publicar.bat, copiar_do_painel.py ou geradores Python para atualizar esta versão: pertencem ao fluxo antigo com arquivos locais.
