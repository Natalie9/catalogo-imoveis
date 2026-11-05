/* Detalhes e comparação. Usa os contratos de catálogo e avaliações existentes. */
(() => {
  'use strict';
  const missing='Não informado', selected=new Set(), locating=new Set();
  let current=null, previousFocus=null;
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
    previousFocus=document.activeElement;current={mode,id};
    $('#dialog-title').textContent=title;content.innerHTML='';
    if(!dialog.open)dialog.showModal();$('#dialog-title').focus();
  }
  function close(){
    if(content.querySelector('.cform textarea')?.value.trim()&&!window.confirm('Descartar o comentário não salvo?'))return;
    current=null;dialog.close();
    if(PENDING_DATA&&!typing()){const p=PENDING_DATA;PENDING_DATA=null;applyHouses(p);catalogMessage();}
    if(pendingRender&&!typing()){pendingRender=false;render();}
    if(previousFocus?.isConnected)previousFocus.focus();else $('#list').focus();
  }
  $('#dialog-close').addEventListener('click',close);
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  function actions(d){return `<div class="card-actions"><button type="button" data-sheet-edit="${d.id}">Editar na planilha</button><button type="button" data-compare="${d.id}">Comparar</button><a href="${esc(d.u)}" target="_blank" rel="noopener">Abrir anúncio</a>${d.st==='Rejeitado'?'<span>Rejeitado na planilha: altere o Status na planilha para recuperar.</span>':`<button type="button" class="disc" data-id="${d.id}" ${DBSTATE!=='ready'?'disabled':''}>${DESC[d.id]?'Recuperar imóvel':'Descartar esta casa'}</button>`}</div><p class="sheet-edit-status" role="status" aria-live="polite"></p>`;}
  function editStatus(message){say(message);content.querySelectorAll('.sheet-edit-status').forEach(el=>el.textContent=message);}
  function syncEditButtons(){document.querySelectorAll('[data-sheet-edit]').forEach(button=>{const busy=locating.has(button.dataset.sheetEdit);button.disabled=busy;button.textContent=busy?'Localizando imóvel…':'Editar na planilha';});}
  async function editInSheet(id){
    if(locating.has(id))return;
    // Abrir durante o clique evita bloqueio de popup após a consulta assíncrona.
    const popup=window.open('about:blank','_blank');
    if(!popup){editStatus('Permita abrir uma nova guia e tente Editar na planilha novamente.');return;}
    popup.opener=null;
    locating.add(id);syncEditButtons();editStatus('Localizando o ID '+id+' na planilha…');
    try{
      const config=window.CATALOGO_CONFIG, rows=await CatalogoSheets.read(config,config.imoveisGid,AbortSignal.timeout(25000));
      const found=CatalogoSheets.locate(rows,id);
      if(popup.closed){editStatus('A guia foi fechada. Clique novamente para abrir a planilha.');return;}
      const url='https://docs.google.com/spreadsheets/d/'+config.spreadsheetId+'/edit#gid='+config.imoveisGid+'&range='+found.cell;
      popup.location.replace(url);
      editStatus('Imóvel '+id+' localizado. Confira o ID destacado na planilha antes de editar.');
    }catch(error){
      if(!popup.closed)popup.close();
      editStatus('Não foi possível abrir o imóvel: '+error.message);
    }finally{locating.delete(id);syncEditButtons();}
  }
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
      ${actions(d)}`;
    content.querySelector('.comments').open=true;
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
  document.addEventListener('click',e=>{
    const d=e.target.closest('[data-detail]'),c=e.target.closest('[data-compare]');
    const edit=e.target.closest('[data-sheet-edit]');if(edit)editInSheet(edit.dataset.sheetEdit);
    if(d)detail(d.dataset.detail);
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
  window.addEventListener('catalogrender',()=>{filterStatus();syncCompare();syncEditButtons();if(current?.mode==='compare')paintComparison();});
  window.addEventListener('ratingschange',()=>{syncCompare();if(current?.mode==='compare')paintComparison();});
  let theme='auto';try{theme=localStorage.getItem('cat-theme')||'auto';}catch(_){}
  function applyTheme(){if(theme==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.dataset.theme=theme;}
  $('#theme').value=theme;applyTheme();$('#theme').addEventListener('change',e=>{theme=e.target.value;applyTheme();try{localStorage.setItem('cat-theme',theme);}catch(_){}});
  // A preferência de autora torna explícito a quem o filtro “meu” se refere.
  const viewer=document.createElement('div');viewer.className='f';viewer.innerHTML='<label for="viewer">Meus comentários: identificar como</label><select id="viewer"><option value="natalie">Natalie</option><option value="jessica">Jéssica</option></select>';
  document.querySelector('.advanced-grid').append(viewer);$('#viewer').value=ME;
  $('#viewer').addEventListener('change',e=>{ME=e.target.value;try{localStorage.setItem('cat-pessoa',ME);}catch(_){}render();});
  document.addEventListener('change',e=>{if(e.target.closest('.cform select')){$('#viewer').value=ME;if(S.onlynat)render();}});
  filterStatus();syncCompare();
})();
