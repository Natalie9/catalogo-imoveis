/* ghdb.js — banco de notas/comentários/descartes do painel no GitHub Pages.
 *
 * Interface de assinaturas usada pelo painel estático:
 *   DB.collection("notas").onSnapshot(cb)           -> cb({docChanges(){ return [{type, doc:{id, data()}}] }})
 *   DB.collection("notas").doc(id).set(obj) / .delete()
 *   DB.collection("comentarios").add(obj)
 * Este arquivo imita essa interface usando a Planilha Google + Apps Script (apps_script/Code.gs):
 *   GET  <apiUrl>?op=all                  -> {notas:[...], comentarios:[...], descartes:[...]}
 *   POST <apiUrl>  {op, col, id, data}   (op = set | delete)
 * Leituras e gravações são abertas: não há senha do painel.
 */
(function () {
  const COLS = ["notas", "comentarios", "descartes"];
  // Apaga a senha que versões antigas guardavam no navegador.
  try { localStorage.removeItem("cat-chave") } catch (e) {}

  window.GHDB = async function () {
    const C = window.CATALOGO_CONFIG || {};
    if (!C.apiUrl) return null;                       // sem planilha configurada: painel só leitura
    const every = (C.atualizarSegundos || 20) * 1000;
    const cache = { notas: {}, comentarios: {}, descartes: {} };
    const subs = { notas: [], comentarios: [], descartes: [] };

    const snap = changes => ({ docChanges: () => changes });
    const docOf = (id, v) => ({ id, exists: true, data: () => v });
    const clean = o => { const v = Object.assign({}, o); delete v.id; if (v.estrelas !== undefined && v.estrelas !== "") v.estrelas = +v.estrelas; return v };

    let pulling = null;
    const statusSubs = [];
    let state = { ready: false, error: null };
    function status(error) {
      state = { ready: !error, error };
      statusSubs.forEach(cb => cb(state));
    }
    async function read() {
      const r = await fetch(C.apiUrl + (C.apiUrl.includes("?") ? "&" : "?") + "op=all&t=" + Date.now(), {signal: AbortSignal.timeout(25000), cache: "no-store", credentials: "omit"});
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = await r.json();
      if (!COLS.every(col => Array.isArray(j[col]))) throw new Error("Resposta de avaliações inválida");
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
    function pull() {
      if (!pulling) pulling = read().then(() => status(null)).catch(e => { status(e); throw e }).finally(() => { pulling = null });
      return pulling;
    }

    async function write(op, col, id, data) {
      // text/plain evita o "preflight" de CORS, que o Apps Script não responde
      const r = await fetch(C.apiUrl, { method: "POST", signal: AbortSignal.timeout(25000), headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ op, col, id, data }) });
      const j = await r.json().catch(() => ({ ok: false, erro: "resposta inválida" }));
      if (!j.ok) throw new Error(j.erro || "falha");
      pull().catch(() => {});
    }

    // Uma falha inicial não desliga a recuperação automática.
    await pull().catch(e => console.warn("avaliações", e));
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
    return { collection, onStatus(cb) { statusSubs.push(cb); cb(state) } };
  };
})();
