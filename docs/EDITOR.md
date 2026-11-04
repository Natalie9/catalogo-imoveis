# Editor de imóveis — implantação e contrato

## Estado desta entrega

Código e testes preparados. Nenhum novo Apps Script foi implantado e nenhuma
coluna, permissão ou informação de produção foi alterada nesta evolução.
O frontend detecta a implantação antiga e informa que a edição ainda não está
disponível; não simula gravações.

## Homologar antes de ativar

1. Crie uma planilha de homologação com dados sintéticos e uma aba **Imóveis**
   com os cabeçalhos do catálogo. Não teste gravações na planilha de produção.
2. No projeto Apps Script vinculado a essa planilha, instale **Code.gs e
   Properties.gs**. Ambos são necessários; os nomes globais não devem ser duplicados.
3. Em **Serviços → +**, adicione **Google Sheets API**, identificador `Sheets`,
   versão v4. Se o projeto usa um projeto Cloud próprio, habilite a API nele também.
4. Nas propriedades do script, defina `CHAVE` com a senha privada e
   `EDITOR_ENABLED` com `true`. Nunca copie a senha para o frontend, URL ou GitHub.
5. Implante como app da Web, executando como proprietário. O endpoint pode ser
   acessível publicamente: a autorização de escrita continua obrigatória no servidor.
   A **planilha** deve conceder leitura pública para o catálogo e edição somente
   às contas autorizadas. Acesso público à API não exige edição pública na planilha.
6. Use uma cópia local de `site/config.js` apontando para a planilha e endpoint de
   homologação. Não faça commit dessa configuração nem de credenciais. Teste o
   fluxo completo e retorne a configuração pública original antes de preparar o PR.
7. Confira edição de preço/área, cancelamento, remoção, senha inválida, IDs
   duplicados, conflito e preservação de avaliações; confira também a aba de histórico.

O serviço avançado permite gravar células e histórico em uma única requisição
atômica. A documentação do Google confirma a validação conjunta das requisições:
[batchUpdate](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate).

## Ativar em produção após autorização

1. Registre a versão atual da implantação e use o histórico de versões do Sheets
   como ponto de recuperação. Não crie arquivos locais como base paralela.
2. Revise o compartilhamento da planilha: **qualquer pessoa com o link deve ser
   leitor**, nunca editor. Na migração anterior havia edição anônima pelo navegador;
   essa permissão não foi alterada por esta entrega e precisa ser conferida.
3. Atualize os dois arquivos no Apps Script vinculado à planilha real. Habilite
   o serviço `Sheets`. Preserve `CHAVE` e a URL da implantação existente.
4. Mantenha `EDITOR_ENABLED` ausente/`false` durante a preparação. Autorize os
   escopos necessários na conta proprietária e publique uma nova versão em
   **Implantar → Gerenciar implantações → Editar → Nova versão**.
5. Após homologação e revisão de permissões, defina `EDITOR_ENABLED=true`.
   `GET ?op=capabilities` deve retornar `contract:1, propertyEditor:true`.
6. Publique o frontend aprovado pelo fluxo normal do GitHub Pages. Se o frontend
   chegar antes, a edição ficará indisponível com mensagem explícita. Notas,
   comentários, descartes e leitura CSV usam os contratos anteriores.

A primeira correção cria apenas a aba `historico_imoveis`, junto com a gravação
na mesma transação. Nenhuma coluna do cadastro é criada automaticamente.

## Contrato

Todas as escritas usam POST `text/plain;charset=utf-8`, com JSON no corpo. Assim
o navegador não exige o preflight que o Apps Script não atende. Nunca use senha em GET.

| Operação | Autorização | Resultado |
| --- | --- | --- |
| GET `?op=all` | Leitura pública | notas, comentarios, descartes |
| GET `?op=capabilities` | Leitura pública | versão do contrato e disponibilidade |
| GET `?op=property&id=ID` | Leitura pública | snapshot atual, sem histórico |
| POST `{op:"readProperty",id,chave}` | CHAVE + editor habilitado | dados atuais, versão, campos existentes, histórico |
| POST `{op:"updateProperty",id,changes,expectedVersion,author,reason,chave}` | CHAVE + editor habilitado | snapshot persistido ou erro estruturado |
| POST `set`/`delete` das avaliações | CHAVE | contrato anterior preservado |

Exemplo sem credencial:

```json
{
  "op": "updateProperty",
  "id": "ID-EXISTENTE",
  "changes": {"preco": "420.000,00", "contato": null},
  "expectedVersion": "versão obtida na leitura autorizada",
  "author": "natalie",
  "reason": "valor atualizado pela imobiliária"
}
```

O campo `chave` é acrescentado somente em memória no navegador. `author` aceita
`natalie` ou `jessica` e é **autoria declarada**, sem comprovação de identidade.

Chaves de `changes` são os identificadores fixos em `PROPERTY_FIELDS`, nunca
nomes livres de coluna ou coordenadas de célula. Campo omitido permanece intacto;
`null` ou texto vazio remove o conteúdo; número zero permanece zero. Link original
não pode ficar vazio. Textos são gravados como `stringValue`, inclusive quando
começam com `=`, evitando execução como fórmula. Campos que contêm fórmulas são
bloqueados para edição. Preço/áreas não aceitam negativos; coordenadas têm limites.

O ID é imutável. Busca por ID exige exatamente uma correspondência. Cabeçalhos
duplicados e colunas ausentes bloqueiam a operação. A versão é um hash de
cabeçalhos e da linha inteira, detectando também mudanças feitas diretamente no Sheets.

`LockService.getScriptLock()` serializa escritores deste Apps Script. Uma versão
desatualizada retorna `{ok:false,erro:"conflito",current:{...}}`. O editor pede
revisão dos valores atuais e não reenvia automaticamente.

O lock **não bloqueia edições manuais ou outros scripts**: existe uma janela entre
a conferência e a gravação. Evite reordenar/editar manualmente durante operações
do editor. Garantia transacional entre escritores externos exigiria centralizar
todas as escritas no mesmo serviço. [Referência LockService](https://developers.google.com/apps-script/reference/lock/).

## Histórico e sincronização

`historico_imoveis`: operação, imóvel, campo, valor anterior, valor novo, quando
(ISO UTC), autoria declarada e motivo opcional. A leitura autorizada retorna até
200 alterações recentes por imóvel. A aplicação não oferece exclusão de histórico.
As regras de compartilhamento do documento também se aplicam a essa aba.

Após salvar, o frontend usa o snapshot confirmado, preserva os filtros e recalcula
a comparação. Enquanto o CSV público estiver atrasado, confere o snapshot direto
do backend e mantém a correção em memória, sem criar um banco local persistente.
Falha de rede pode acontecer **depois** de o servidor salvar: o editor não afirma
sucesso e exige recarregar antes de reenviar. Notas/comentários/descartes não são
tocados pela edição de características.

## Autorização e limites

A mesma CHAVE compartilhada foi preservada para compatibilidade. A cópia antiga
`cat-chave` no localStorage é removida ao abrir a nova interface; avaliações
mantêm a senha somente na memória da página. O editor a mantém apenas durante
a operação aberta e descarta ao fechar/salvar. O segredo não identifica uma pessoa,
não impede compartilhamento e não fornece autenticação forte nem limitação de
tentativas. Uma evolução para login Google/OAuth exige projeto e homologação próprios.

## Recuperação

- Desativar imediatamente novas edições: `EDITOR_ENABLED=false`.
- Reverter código: selecionar a versão anterior da implantação; preservar URL/CHAVE.
- Corrigir um valor: usar o histórico como evidência e enviar nova edição autorizada,
  registrando motivo; não reescrever a aba inteira.
- Em falha ampla, revisar o histórico de versões do Sheets e o impacto sobre
  avaliações antes de restaurar. Não restaurar o documento inteiro sem aprovação.

## Expansão opcional do esquema

Adicionar cabeçalhos apenas em colunas novas, após Z, mantendo A–Z e N–Q intactos.
Conferir antes se cada cabeçalho já existe: repetir o procedimento não deve duplicá-lo.
Não preencher valores presumidos. Não mover a área legada automaticamente.

| Cabeçalho opcional | Tipo / ausência |
| --- | --- |
| Área construída (m²) | Número não negativo; vazio = desconhecido |
| Suítes / Banheiros / Vagas de garagem | Inteiros não negativos; vazio ≠ zero |
| Condomínio (R$) / IPTU (R$) | Números não negativos; periodicidade deve ser conferida |
| Situação do financiamento | Texto informado; vazio = não confirmado |
| Data da conferência | Texto/data ISO; vazio = sem conferência registrada |
| Fonte da conferência | Texto ou URL da fonte; vazio = fonte não registrada |
| Informações confirmadas / Pendências | Texto; vazio = sem registro |
| Informação sobre ágio | Texto; vazio = sem informação |

O leitor e editor suportam esses campos quando existem. Nenhuma dessas colunas
foi presumida como existente ou criada em produção nesta entrega. Para planilhas
grandes, estenda o filtro do Sheets até as novas colunas para preservar as linhas
durante ordenação. Confira os IDs e células anteriores/depois pela própria planilha.
