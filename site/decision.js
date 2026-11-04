/* Detalhes, comparação e editor. Usa os contratos de catálogo e avaliações existentes. */
(() => {
  'use strict';
  const missing='Não informado', selected=new Set(), confirmed=new Map();
  let current=null, busy=false, dirty=false, credential='', previousFocus=null, request=0;
  const el=document.createElement('div');
  el.innerHTML=`<div id="decision-message" role="status" aria-live="polite"></div>
    <aside id="compare-bar" class="compare-bar" aria-label="Seleção para comparação" hidden></aside>
    <dialog id="property-dialog" aria-labelledby="dialog-title"><div class="dialog-top"><h2 id="dialog-title" tabindex="-1"></h2><button type="button" id="dialog-close" aria-label="Fechar painel">Fechar</button></div><div id="dialog-content"></div></dialog>`;
  document.body.append(el);
  const dialog=$('#property-dialog'),content=$('#dialog-content');
  const n=v=>v==null?missing:Number(v).toLocaleString('pt-BR');
  const m2=v=>v==null?missing:n(v)+' m²';
  const money=v=>v==null?missing:brl(v);
  const say=text=>{$('#decision-message').textContent=text;};
  const pool=d=>d.pool?({sim:'Piscina privativa',cond:'Piscina do condomínio',prev:'Espaço para piscina'}[d.pool]):d.poolInfo||missing;
  const fields=[['Preço',d=>money(d.p)],['Bairro',d=>d.b],['Cidade',d=>d.cid],['Área do lote',d=>m2(d.lot)],['Área construída',d=>m2(d.built)],['Quartos',d=>n(d.q)],['Suítes',d=>n(d.suites)],['Banheiros',d=>n(d.baths)],['Garagem',d=>n(d.parking)],['Quintal',d=>d.qt],['Piscina',pool],['Financiamento informado',d=>d.fin||d.f],['Condomínio',d=>money(d.condo)],['IPTU (periodicidade a conferir)',d=>money(d.iptu)],['UFG · linha reta',d=>d.km==null?missing:n(d.km)+' km'],['Nota Natalie',d=>NOTAS[d.id]?.natalie?NOTAS[d.id].natalie+'/5':missing],['Nota Jéssica',d=>NOTAS[d.id]?.jessica?NOTAS[d.id].jessica+'/5':missing],['Média das notas disponíveis',d=>media(d.id)==null?missing:n(media(d.id))+'/5'],['Alertas do anúncio',d=>d.tags.filter(t=>['bad','warn','off'].includes(t[0])).map(t=>t[1]).join('; ')||'Nenhum sinalizado']];
  function open(title,mode,id){
    previousFocus=document.activeElement;current={mode,id};dirty=false;busy=false;credential='';request++;
    $('#dialog-title').textContent=title;content.innerHTML='';
    if(!dialog.open)dialog.showModal();$('#dialog-title').focus();
  }
  function close(){
    if(busy){say('Aguarde a conclusão da operação.');return;}
    if((dirty||content.querySelector('.cform textarea')?.value.trim())&&!window.confirm('Descartar as alterações não salvas?'))return;
    request++;current=null;credential='';dirty=false;dialog.close();
    if(PENDING_DATA&&!typing()){const p=PENDING_DATA;PENDING_DATA=null;applyHouses(p);catalogMessage();}
    if(pendingRender&&!typing()){pendingRender=false;render();}
    if(previousFocus?.isConnected)previousFocus.focus();else $('#list').focus();
  }
  $('#dialog-close').addEventListener('click',close);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  function actions(d){return `<div class="card-actions"><button type="button" data-edit="${d.id}">Editar informações</button><button type="button" data-compare="${d.id}">Comparar</button><a href="${esc(d.u)}" target="_blank" rel="noopener">Abrir anúncio</a>${d.st==='Rejeitado'?'<span>Rejeitado na planilha: altere o Status no editor para recuperar.</span>':`<button type="button" class="disc" data-id="${d.id}" ${DBSTATE!=='ready'?'disabled':''}>${DESC[d.id]?'Recuperar imóvel':'Descartar esta casa'}</button>`}</div>`;}
  function detail(id){
    const d=DATA.find(d=>d.id===id);if(!d)return;
    open(d.b||'Detalhes do imóvel','detail',id);
    content.innerHTML=`<p class="muted">${esc(d.cid||missing)} · ${esc(id)}</p>
      <div class="detail-gallery">${d.img.length?d.img.map((src,i)=>`<a href="${esc(src)}" target="_blank" rel="noopener" aria-label="Abrir foto ${i+1}"><img src="${esc(src)}" loading="lazy" alt="Foto ${i+1} do anúncio em ${esc(d.b)}"></a>`).join(''):'<p>Sem foto disponível</p>'}</div>
      <h3>Informações do anúncio</h3><p class="muted">Dados informados; confirmação e origem aparecem abaixo quando registradas.</p><dl class="property-facts">${fields.slice(0,15).map(([label,get])=>`<div><dt>${esc(label)}</dt><dd>${esc(get(d)||missing)}</dd></div>`).join('')}<div><dt>Precisão da localização</dt><dd>${esc(d.gp)}</dd></div></dl>
      <h3>Avaliação compartilhada</h3><p>${ratingDifference(d)}</p><div class="aval" data-id="${id}">${avalHTML(d)}</div>
      ${d.nat?`<p>Comentário histórico de Natalie: ${esc(d.nat)}</p>`:''}
      <h3>Alertas e verificações</h3><p>${esc(fields.at(-1)[1](d))}</p><p class="muted">Alertas por palavras-chave são indícios a conferir.</p>
      <dl class="property-facts">${[['Endereço',d.rua],['Imobiliária',d.i],['Contato',d.c],['Observações do anúncio',d.com],['Informações confirmadas',d.confirmed],['Pendências',d.pending],['Ágio',d.agio],['Data da conferência',d.checked],['Fonte da conferência',d.source]].map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v||missing)}</dd></div>`).join('')}</dl>
      <h3>Histórico de correções</h3><p>O histórico exige a senha do painel. A autoria registrada é declarada.</p><button type="button" id="load-history">Consultar histórico</button><div id="history"></div>${actions(d)}`;
    content.querySelector('.comments').open=true;
    content.querySelector('#load-history').addEventListener('click',()=>history(id));
    syncCompare();
  }
  function ratingDifference(d){
    const a=NOTAS[d.id]?.natalie,b=NOTAS[d.id]?.jessica;
    if(!a&&!b)return 'Ainda sem avaliações.';
    if(!a||!b)return 'Falta a avaliação de '+(!a?'Natalie':'Jéssica')+'.';
    return a===b?'As duas deram a mesma nota ('+a+'/5).':'Diferença de '+Math.abs(a-b)+' estrela(s) entre as notas. Leia os comentários para conhecer as opiniões.';
  }
  function syncCompare(){
    for(const id of selected)if(!DATA.some(d=>d.id===id))selected.delete(id);
    document.querySelectorAll('[data-compare]').forEach(b=>{const on=selected.has(b.dataset.compare);b.setAttribute('aria-pressed',String(on));b.textContent=on?'Remover da comparação':'Comparar';});
    const bar=$('#compare-bar');bar.hidden=!selected.size;
    bar.innerHTML=`<strong>${selected.size} de 4 selecionadas</strong><div class="compare-selection">${[...selected].map(id=>`<button type="button" data-compare="${id}" aria-label="Remover ${esc(DATA.find(d=>d.id===id)?.b)} da comparação">${esc(DATA.find(d=>d.id===id)?.b||id)} ×</button>`).join('')}</div><button type="button" id="open-compare" ${selected.size<2?'disabled':''}>Comparar casas</button><button type="button" id="clear-compare">Limpar seleção</button>`;
    $('#open-compare')?.addEventListener('click',compare);$('#clear-compare')?.addEventListener('click',()=>{selected.clear();syncCompare();if(current?.mode==='compare')paintComparison();});
  }
  function compare(){open('Comparar casas','compare');paintComparison();}
  function delta(value,base,unit,percent){
    if(value==null||base==null)return missing;const diff=value-base;
    const amount=(diff>0?'+':'')+n(diff)+(unit==='R$'?' reais':' '+unit);
    return amount+(percent&&base>0?' ('+(diff>0?'+':'')+n(Math.round(diff/base*1000)/10)+'%)':'');
  }
  function paintComparison(){
    const houses=[...selected].map(id=>DATA.find(d=>d.id===id)).filter(Boolean),base=houses[0];
    if(houses.length<2){content.innerHTML='<p>Selecione pelo menos duas casas. Feche este painel para continuar.</p>';return;}
    const rows=fields.concat([['Diferença de preço¹',d=>delta(d.p,base.p,'R$',true)],['Diferença de lote¹',d=>delta(d.lot,base.lot,'m²')],['Diferença de área construída¹',d=>delta(d.built,base.built,'m²')],['Diferença de distância¹',d=>delta(d.km,base.km,'km')],['Avaliações compartilhadas',ratingDifference]]);
    content.innerHTML=`<p>¹ Diferenças em relação à primeira coluna. Preço e notas não determinam uma recomendação automática.</p><div class="comparison-scroll" tabindex="0" role="region" aria-label="Tabela comparativa com rolagem horizontal"><table class="comparison"><caption>Comparação de ${houses.length} imóveis</caption><thead><tr><th scope="col">Característica</th>${houses.map(d=>`<th scope="col">${esc(d.b||missing)}<small>${esc(d.id)}</small><button type="button" data-compare="${d.id}">Remover</button></th>`).join('')}</tr></thead><tbody>${rows.map(([label,get])=>`<tr><th scope="row">${esc(label)}</th>${houses.map(d=>`<td>${esc(get(d)||missing)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  const messages={chave:'Senha incorreta. Digite novamente.',conflito:'Este imóvel mudou desde a abertura do editor. Revise os valores atuais antes de salvar.',editor_desativado:'O editor ainda não foi habilitado na implantação do Apps Script.',id_duplicado:'Há mais de uma linha com este ID. A edição foi bloqueada.',id_inexistente:'O imóvel não foi encontrado. Atualize o catálogo.',ocupado:'Outra operação está em andamento. Tente novamente.',unavailable:'A edição precisa da nova implantação do Apps Script. Nenhuma alteração foi enviada.',network:'Não foi possível confirmar a operação. Confira a conexão e recarregue os dados antes de tentar novamente.'};
  function errorText(e){return messages[e.code]||('Não foi possível salvar: '+(e.message||e.code||'resposta inválida')+'.');}
  async function api(body){
    let r,j;
    try{r=await fetch(CATALOGO_CONFIG.apiUrl,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...body,chave:credential}),signal:AbortSignal.timeout(25000),credentials:'omit'});j=await r.json();}catch(_){throw {code:'network'};}
    if(!r.ok||!j.ok)throw {code:j.erro||'network',current:j.current};
    if(!j.property||j.property.id!==body.id||!Array.isArray(j.property.row)||!Array.isArray(j.property.headers))throw {code:'unavailable'};
    return j;
  }
  async function capability(){
    try{const r=await fetch(CATALOGO_CONFIG.apiUrl+'?op=capabilities',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)}),j=await r.json();if(!r.ok||j.contract!==1)throw {code:'unavailable'};if(!j.propertyEditor)throw {code:'editor_desativado'};}
    catch(e){throw e.code?e:{code:'network'};}
  }
  function passwordForm(){return `<form id="editor-auth"><label for="editor-password">Senha do painel</label><input type="password" id="editor-password" autocomplete="off" required><p>A senha fica apenas nesta operação. Os nomes de autoria são declarados.</p><button type="submit">Carregar dados atuais</button><p id="editor-status" role="status" aria-live="polite"></p></form>`;}
  async function edit(id){
    if(current&&dirty&&!window.confirm('Descartar alterações não salvas para abrir outro painel?'))return;
    open('Editar informações','edit',id);const serial=request;
    content.innerHTML='<p role="status">Verificando disponibilidade do editor…</p>';
    try{await capability();if(serial!==request)return;content.innerHTML=passwordForm();
      $('#editor-auth').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;credential=$('#editor-password').value;busy=true;const b=e.target.querySelector('button');b.disabled=true;$('#editor-status').textContent='Carregando dados atuais…';
        try{const j=await api({op:'readProperty',id});if(serial===request)editorForm(j.property);}
        catch(err){if(serial===request)$('#editor-status').textContent=errorText(err);credential='';}
        finally{busy=false;b.disabled=false;}
      });$('#editor-password').focus();
    }catch(e){if(serial===request)content.innerHTML='<p role="alert">'+esc(errorText(e))+'</p><p>As informações continuam disponíveis nos detalhes. A leitura e as avaliações permanecem independentes do editor.</p>';}
  }
  function valueError(field,value){
    const s=value.trim(),type=field.type;if(!s)return field.type==='url'?'Informe o link do anúncio.':'';
    if(s.length>(['longtext','photos'].includes(type)?10000:1000))return 'Texto maior que o limite permitido.';
    if(type==='url'&&!CatalogoSheets.url(s))return 'Informe uma URL HTTP ou HTTPS válida.';
    if(type==='photos'){
      let links;try{links=s[0]==='['?JSON.parse(s):s.split(/[\n|]+/);}catch(_){return 'Confira o formato das URLs das fotos.';}
      if(!Array.isArray(links)||!links.length||links.length>30||links.some(v=>typeof v!=='string'||!CatalogoSheets.url(v)))return 'Informe até 30 links HTTP(S) válidos, um por linha ou em um array JSON.';
    }
    if(['number','integer','latitude','longitude','decimal'].includes(type)){
      const v=['latitude','longitude','decimal'].includes(type)?Number(s.replace(',','.')):CatalogoSheets.number(s);
      if(v==null||!Number.isFinite(v))return 'Informe um número válido (ex.: 420.000,50).';
      if(type==='latitude'&&Math.abs(v)>90||type==='longitude'&&Math.abs(v)>180)return 'Coordenada fora do intervalo permitido.';
      if(!['latitude','longitude'].includes(type)&&v<0)return 'O valor não pode ser negativo.';
      if(type==='integer'&&!Number.isInteger(v))return 'Informe uma quantidade inteira.';
    }
    return '';
  }
  function editorForm(property,draft){
    current.property=property;current.mode='edit';dirty=false;
    let needsReload=false;
    content.innerHTML=`<p>ID <strong>${esc(property.id)}</strong> · não pode ser alterado</p><p>Somente campos modificados serão enviados. Apague o conteúdo para remover um valor. Campos ainda ausentes na planilha não aparecem.</p>
      <form id="property-editor" novalidate><div class="editor-fields">${Object.entries(property.fields).map(([key,f])=>`<div class="edit-field"><label for="edit-${key}">${esc(f.label)}</label>${['longtext','photos'].includes(f.type)?`<textarea id="edit-${key}" data-field="${key}" rows="3">${esc(f.value)}</textarea>`:`<input id="edit-${key}" data-field="${key}" value="${esc(f.value)}" ${['number','integer','latitude','longitude','decimal'].includes(f.type)?'inputmode="decimal"':''}>`}<span id="error-${key}" class="field-error"></span></div>`).join('')}</div>
      <label for="edit-author">Quem está editando (identificação declarada)</label><select id="edit-author">${PESSOAS.map(p=>`<option value="${p}" ${p===ME?'selected':''}>${NOMES[p]}</option>`).join('')}</select><label for="edit-reason">Motivo da correção (opcional)</label><textarea id="edit-reason" maxlength="1000" rows="2"></textarea>
      <p id="editor-status" role="status" aria-live="polite">Nenhuma alteração.</p><div class="card-actions"><button type="submit" id="editor-save" disabled>Salvar alterações</button><button type="button" id="editor-cancel">Cancelar</button></div></form>`;
    function changed(){
      dirty=[...content.querySelectorAll('[data-field]')].some(input=>input.value!==String(property.fields[input.dataset.field].value??''));
      $('#editor-save').disabled=!dirty||busy||needsReload;if(!needsReload)$('#editor-status').textContent=dirty?'Há alterações não salvas.':'Nenhuma alteração.';
      content.querySelectorAll('[data-field]').forEach(input=>input.closest('.edit-field').classList.toggle('modified',input.value!==String(property.fields[input.dataset.field].value??'')));
    }
    content.querySelectorAll('[data-field]').forEach(input=>input.addEventListener('input',changed));
    $('#editor-cancel').addEventListener('click',close);
    if(draft){for(const [key,value] of Object.entries(draft))if($('#edit-'+key))$('#edit-'+key).value=value??'';changed();}
    $('#property-editor').addEventListener('submit',async e=>{
      e.preventDefault();if(busy||!dirty||needsReload)return;
      const changes={};let first=null;
      for(const input of content.querySelectorAll('[data-field]')){
        const key=input.dataset.field,f=property.fields[key];if(input.value===String(f.value??''))continue;
        const error=valueError(f,input.value);$('#error-'+key).textContent=error;input.setAttribute('aria-invalid',String(!!error));input.setAttribute('aria-describedby','error-'+key);
        if(error){first=first||input;continue;}changes[key]=input.value.trim()===''?null:input.value;
      }
      if(first){$('#editor-status').textContent='Confira os campos indicados.';first.focus();return;}
      busy=true;$('#editor-save').disabled=true;$('#editor-cancel').disabled=true;$('#editor-status').textContent='Salvando na planilha…';
      for(const input of content.querySelectorAll('input,textarea,select'))input.disabled=true;
      try{
        const j=await api({op:'updateProperty',id:property.id,changes,expectedVersion:property.version,author:$('#edit-author').value,reason:$('#edit-reason').value});
        const house=normalize(j.property);confirmed.set(house.id,house);DATA=DATA.map(d=>d.id===house.id?{...house,r:d.r}:d);PENDING_DATA=null;
        dirty=false;busy=false;credential='';close();if(!typing())render();else refreshAval(house.id);
        if(typing())pendingRender=true;
        say(j.unchanged?'Nenhuma mudança necessária.':'Alterações confirmadas na planilha. A exportação pública pode levar alguns instantes para acompanhar.');
      }catch(err){
        needsReload=['conflito','network','chave'].includes(err.code);
        if(err.code==='conflito'&&err.current){
          current.conflict={property:err.current,draft:changes};
          $('#editor-status').innerHTML=esc(errorText(err))+'<button type="button" id="review-conflict">Revisar conflito</button>';
          $('#review-conflict').addEventListener('click',()=>reviewConflict(err.current,changes));
        }else{$('#editor-status').textContent=errorText(err);}
        // Falha de rede pode ocorrer depois de persistir. Reabrir é obrigatório para
        // evitar reenvio cego com resultado desconhecido ou senha inválida.
        if(['network','chave'].includes(err.code)){
          const button=document.createElement('button');button.type='button';button.textContent='Recarregar com segurança';button.addEventListener('click',()=>edit(property.id));$('#editor-status').append(button);
        }
      }finally{
        busy=false;
        if(current?.mode==='edit'&&$('#editor-save')){for(const input of content.querySelectorAll('input,textarea,select'))input.disabled=false;$('#editor-cancel').disabled=false;$('#editor-save').disabled=needsReload;}
      }
    });
  }
  function reviewConflict(property,draft){
    content.innerHTML='<h3>Revise antes de reaplicar</h3><p>Os dados atuais abaixo já incluem a outra alteração. Seu rascunho será reaplicado somente quando você escolher continuar; nada será salvo automaticamente.</p><dl class="property-facts">'+Object.entries(draft).map(([key,value])=>`<div><dt>${esc(property.fields[key]?.label||key)}</dt><dd>Atual: ${esc(property.fields[key]?.value??missing)}<br>Seu rascunho: ${esc(value??'(remover)')}</dd></div>`).join('')+'</dl><button type="button" id="use-current">Usar dados atuais</button><button type="button" id="reapply">Reaplicar meu rascunho para revisar</button>';
    $('#use-current').addEventListener('click',()=>editorForm(property));$('#reapply').addEventListener('click',()=>editorForm(property,draft));
  }
  async function history(id){
    const target=$('#history');target.innerHTML=passwordForm();const serial=request;
    $('#editor-auth').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;credential=$('#editor-password').value;$('#editor-status').textContent='Consultando histórico…';
      try{const j=await api({op:'readProperty',id});if(serial!==request)return;
        target.innerHTML=j.property.history?.length?'<ol class="history">'+j.property.history.map(h=>`<li><strong>${esc(h.field)}</strong>: ${esc(h.before||'(vazio)')} → ${esc(h.after||'(vazio)')}<br>${esc(h.when)} · ${esc(NOMES[h.author]||h.author)} (autoria declarada)${h.reason?'<p>'+esc(h.reason)+'</p>':''}</li>`).join('')+'</ol>':'<p>Nenhuma correção registrada neste histórico.</p>';
      }catch(err){if(serial===request)$('#editor-status').textContent=errorText(err);}finally{busy=false;credential='';}
    });
  }
  function normalize(property){const result=CatalogoSheets.houses([property.headers,property.row]);if(result.data.length!==1)throw {code:'resposta_invalida'};return result.data[0];}
  function equal(a,b){if(!a||!b)return false;const x={...a},y={...b};delete x.r;delete y.r;return JSON.stringify(x)===JSON.stringify(y);}
  async function reconcile(result){
    for(const [id,saved] of confirmed){
      const i=result.data.findIndex(d=>d.id===id);
      if(i>=0&&equal(saved,result.data[i])){confirmed.delete(id);continue;}
      // Resposta direta evita voltar silenciosamente à versão antiga do CSV.
      try{const r=await fetch(CATALOGO_CONFIG.apiUrl+'?op=property&id='+encodeURIComponent(id)+'&t='+Date.now(),{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)}),j=await r.json();
        if(j.erro==='id_inexistente'){confirmed.delete(id);continue;}if(!r.ok||!j.ok||j.property.id!==id)throw Error('snapshot');
        const actual=normalize(j.property);confirmed.set(id,actual);if(i>=0)result.data[i]={...actual,r:result.data[i].r};else result.data.push(actual);
      }catch(_){if(i>=0)result.data[i]={...saved,r:result.data[i].r};else result.data.push(saved);result.warnings.push('Mantida a última correção confirmada; não foi possível conferir a propagação de '+id+'.');}
    }
    return result;
  }
  document.addEventListener('click',e=>{
    const d=e.target.closest('[data-detail]'),editButton=e.target.closest('[data-edit]'),c=e.target.closest('[data-compare]');
    if(d)detail(d.dataset.detail);if(editButton)edit(editButton.dataset.edit);
    if(c){const id=c.dataset.compare;if(selected.has(id))selected.delete(id);else if(selected.size<4)selected.add(id);else{say('Compare no máximo quatro casas. Remova uma para incluir outra.');return;}syncCompare();if(current?.mode==='compare')paintComparison();}
  });
  function filterStatus(){
    const count=Object.keys(DEF).filter(k=>!['sort','grp','area'].includes(k)&&String(S[k]??'')!==String(DEF[k]??'')).length;
    $('#activefilters').textContent=count?'· '+count+' filtro(s) ativo(s)':'';
    const errors=[];for(const [min,max,label] of [['pmin','pmax','preço'],['lmin','lmax','área']]){
      if(S[min]!=null&&S[max]!=null&&S[min]>S[max])errors.push('O mínimo de '+label+' supera o máximo.');
      for(const key of [min,max]){const input=$('#'+key),bad=input.value.trim()!==''&&(CatalogoSheets.number(input.value)==null||CatalogoSheets.number(input.value)<0);input.setAttribute('aria-invalid',String(bad));if(bad)errors.push('Informe '+label+' válido e não negativo.');}
    }$('#filter-error').textContent=errors.join(' ');
  }
  window.addEventListener('catalogrender',()=>{filterStatus();syncCompare();if(current?.mode==='compare')paintComparison();});
  window.addEventListener('ratingschange',()=>{syncCompare();if(current?.mode==='compare')paintComparison();});
  let theme='auto';try{theme=localStorage.getItem('cat-theme')||'auto';}catch(_){}
  function applyTheme(){if(theme==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=theme;}
  $('#theme').value=theme;applyTheme();$('#theme').addEventListener('change',e=>{theme=e.target.value;applyTheme();try{localStorage.setItem('cat-theme',theme);}catch(_){}});
  // A preferência de autora torna explícito a quem o filtro “meu” se refere.
  const viewer=document.createElement('div');viewer.className='f';viewer.innerHTML='<label for="viewer">Meus comentários: identificar como</label><select id="viewer"><option value="natalie">Natalie</option><option value="jessica">Jéssica</option></select>';
  document.querySelector('.advanced-grid').append(viewer);$('#viewer').value=ME;
  $('#viewer').addEventListener('change',e=>{ME=e.target.value;try{localStorage.setItem('cat-pessoa',ME);}catch(_){}render();});
  document.addEventListener('change',e=>{if(e.target.closest('.cform select')){$('#viewer').value=ME;if(S.onlynat)render();}});
  window.CatalogoDecision={editing:()=>current?.mode==='edit',reconcile};
  filterStatus();syncCompare();
})();
