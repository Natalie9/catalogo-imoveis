const fs=require('fs');
function edit(f,pairs){let s=fs.readFileSync(f,'utf8');for(const [a,b] of pairs){if(!s.includes(a))throw new Error('miss '+a.slice(0,60));s=s.replace(a,()=>b)}fs.writeFileSync(f,s)}
edit('site/index.html',[['<h2 class="count" id="count" role="status"></h2>','<h2 class="count" id="count" aria-live="polite"></h2>']]);
edit('tests/decision.test.cjs',[
 ["assert.match(a.d.querySelector('#stats').textContent,/1pelas duas/)","assert.equal(a.d.querySelector('.stat.info b').textContent,'1')"],
 ["const a=app(t);await until(()=>a.d.querySelector('.cform'));const ta=","const a=app(t);await until(()=>a.d.querySelector('[data-coms=\"A\"]'));a.d.querySelector('[data-coms=\"A\"]').click();await until(()=>a.d.querySelector('.cform'));const ta="]
]);
edit('tests/site.test.cjs',[
 ["await until(()=>d.querySelector('.cform textarea'));\n const textarea=","await until(()=>d.querySelector('[data-coms]'));d.querySelector('[data-coms]').click();await until(()=>d.querySelector('.cform textarea'));\n const textarea="],
 ["a.polls[0]();await until(()=>d.querySelector('.cform'));\n});","a.polls[0]();await until(()=>!d.querySelector('.avalnote'));\n});"]
]);
