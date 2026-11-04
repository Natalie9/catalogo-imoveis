/* ghdb.js — banco de notas/comentários/descartes do painel no GitHub Pages.
 *
 * O painel (template.html) foi escrito para o banco do claude.ai, que tem esta forma:
 *   DB.collection("notas").onSnapshot(cb)           -> cb({docChanges(){ return [{type, doc:{id, data()}}] }})
 *   DB.collection("notas").doc(id).set(obj) / .delete()
 *   DB.collection("comentarios").add(obj)
 * Este arquivo imita essa interface usando a Planilha Google + Apps Script (apps_script/Code.gs):
 *   GET  <apiUrl>?op=all                  -> {notas:[...], comentarios:[...], descartes:[...]}
 *   POST <apiUrl>  {op, col, id, data, chave}   (op = set | delete)
 * As leituras são abertas; as gravações pedem a "senha do painel" (Script Property CHAVE),
 * guardada só no navegador de quem digitou.
 */
(function () {
  const COLS = ["notas", "comentarios", "descartes"];
  const KEY = "cat-chave";
  const ls = {
    get: k => { try { return localStorage.getItem(k) } catch (e) { return null } },
    set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v) } catch (e) {} }
  };

  window.GHDB = async function () {
    const C = window.CATALOGO_CONFIG || {};
    if (!C.apiUrl) return null;                       // sem planilha configurada: painel só leitura
    const every = (C.atualizarSegundos || 20) * 1000;
    const cache = { notas: {}, comentarios: {}, descartes: {} };
    const subs = { notas: [], comentarios: [], descartes: [] };

    const snap = changes => ({ docChanges: () => changes });
    const docOf = (id, v) => ({ id, exists: true, data: () => v });
    const clean = o => { const v = Object.assign({}, o); delete v.id; if (v.estrelas !== undefined && v.estrelas !== "") v.estrelas = +v.estrelas; return v };

    async function pull() {
      const r = await fetch(C.apiUrl + (C.apiUrl.includes("?") ? "&" : "?") + "op=all&t=" + Date.now());
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      COLS.forEach(col => {
        const novo = {}; (j[col] || []).forEach(o => { if (o && o.id !== "" && o.id != null) novo[String(o.id)] = clean(o) });
        const ch = [];
        for (const id in novo) {
          const antes = cache[col][id];
          if (!antes) ch.push({ type: "added", doc: docOf(id, novo[id]) });
          else if (JSON.stringify(antes) !== JSON.stringify(novo[id])) ch.push({ type: "modified", doc: docOf(id, novo[id]) });
        }
        for (const id in cache[col]) if (!novo[id]) ch.push({ type: "removed", doc: docOf(id, cache[col][id]) });
        cache[col] = novo;
        if (ch.length) subs[col].forEach(cb => { try { cb(snap(ch)) } catch (e) { console.warn(e) } });
      });
    }

    async function write(op, col, id, data) {
      let chave = ls.get(KEY);
      if (!chave) { chave = window.prompt("Senha do painel (para salvar notas e comentários):") || ""; if (!chave) throw { code: "chave" } }
      // text/plain evita o "preflight" de CORS, que o Apps Script não responde
      const r = await fetch(C.apiUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ op, col, id, data, chave }) });
      const j = await r.json().catch(() => ({ ok: false, erro: "resposta inválida" }));
      if (!j.ok) { if (j.erro === "chave") { ls.set(KEY, null); throw { code: "chave" } } throw new Error(j.erro || "falha") }
      ls.set(KEY, chave);
      pull().catch(() => {});
    }

    await pull();                                     // falhou? o painel cai para o modo só leitura
    setInterval(() => { if (!document.hidden) pull().catch(e => console.warn("planilha", e)) }, every);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) pull().catch(() => {}) });

    const rid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    function collection(col) {
      return {
        onSnapshot(cb) {
          subs[col].push(cb);
          const ch = Object.keys(cache[col]).map(id => ({ type: "added", doc: docOf(id, cache[col][id]) }));
          setTimeout(() => cb(snap(ch)), 0);
          return () => { subs[col] = subs[col].filter(f => f !== cb) };
        },
        doc(id) {
          return {
            set: data => write("set", col, id, data),
            delete: () => write("delete", col, id, null)
          };
        },
        add: data => write("set", col, rid(), data)
      };
    }
    return { collection, doc: () => ({ onSnapshot() { return () => {} } }) };
  };
})();
