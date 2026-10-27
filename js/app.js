// Stater · protótipo. Uma página, menu de marcas à esquerda, cada tab lê o seu Excel.
import { BRANDS, GROUP, brandById, applyTheme } from './brands.js';
import { icon } from './icons.js';
import { logo } from './logos.js';
import { esc, info, ligarTooltips, toast, confirmar, onda } from './ui.js';
import { lerPrimeiraFolha, parseNps, parseCausas, FicheiroErrado, formatarPeriodo, formatarData } from './excel.js';
import { resumoNps, fmt } from './stats.js';
import { limparGraficos, base, junta, desenhar } from './charts.js';
import * as vNps from './views/nps.js';
import * as vCausas from './views/causas.js';
import { exemplos } from './exemplo.js';

// Tabs que funcionam no protótipo
const ANALISES = {
  nps: { parse: parseNps, view: vNps },
  'causa-raiz': { parse: parseCausas, view: vCausas },
};

// ---------- Guardar no browser ----------
const chave = (b, t) => `stater:v1:${b}:${t}`;
const store = {
  get(b, t) { try { return JSON.parse(localStorage.getItem(chave(b, t))); } catch { return null; } },
  set(b, t, v) { localStorage.setItem(chave(b, t), JSON.stringify(v)); },
  del(b, t) { localStorage.removeItem(chave(b, t)); },
};
const meta = id => { const v = parseInt(localStorage.getItem(`stater:v1:meta:${id}`), 10); return Number.isFinite(v) ? v : (brandById(id)?.target ?? 60); };

// ---------- Estado ----------
let erro = null;
let animarSub = false; // só anima a lista de tabs quando se muda de marca
const rota = () => {
  const [, b, t] = location.hash.replace(/^#\/?/, '#/').split('/');
  const brand = brandById(b);
  if (!brand) return { brand: null, tab: null };
  const tab = brand.tabs.find(x => x.id === t) || brand.tabs[0];
  return { brand, tab };
};
const ir = (b, t) => { location.hash = b ? `#/${b}/${t}` : '#/'; };

// ---------- Menu lateral ----------
function tileVars(b) {
  return `--tile-bg:${b.colors.main};--tile-on:${b.colors.on};--tile-soft:${b.colors.lightest};--tile-ink:${b.colors.darkest}`;
}

function sidebar({ brand, tab }) {
  const itens = BRANDS.map(b => {
    const aberta = brand?.id === b.id;
    const sub = aberta ? `<div class="sb-sub-nav${animarSub ? ' anim' : ''}">${b.tabs.map(t => `
        <a class="sb-tab" href="#/${b.id}/${t.id}" ${tab?.id === t.id ? 'aria-current="page"' : ''}>${icon(t.icon)}<span class="lbl" title="${esc(t.name)}">${esc(t.name)}</span>${store.get(b.id, t.id) ? '<span class="dot" title="Com dados"></span>' : ''}</a>`).join('')}</div>` : '';
    return `<a class="sb-item${aberta ? ' is-open' : ''}" href="#/${b.id}/${b.tabs[0].id}" style="${tileVars(b)}" ${aberta ? 'aria-expanded="true"' : 'aria-expanded="false"'}>
        <span class="tile mark">${logo(b.icon)}</span><span>${esc(b.name)}</span><span class="count">${b.tabs.length} tabs</span></a>${sub}`;
  }).join('');
  return `
    <div class="sb-head"><div class="sb-logo">${icon('bars')}</div><div><div class="sb-title">Stater</div><div class="sb-sub">CX · Grupo Brisa</div></div></div>
    <div>
      <div class="sb-label">Marcas</div>
      <nav class="sb-nav" aria-label="Marcas">
        <a class="sb-item${!brand ? ' is-open' : ''}" href="#/" style="${tileVars(GROUP)}" ${!brand ? 'aria-current="page"' : ''}><span class="tile mark">${logo('grupo')}</span><span>Overview</span><span class="count">grupo</span></a>
        ${itens}
      </nav>
    </div>
    <div class="sb-foot">
      <div class="sb-note">${icon('lock')} Os dados ficam só neste browser.</div>
    </div>`;
}

// ---------- Barra de topo ----------
function topbar({ brand, tab }) {
  const rec = brand && tab ? store.get(brand.id, tab.id) : null;
  const live = brand && tab && ANALISES[tab.id] && brand.id === 'colibri';
  const crumbs = brand
    ? `<span>Stater</span>${icon('chevron')}<span>${esc(brand.name)}</span>${icon('chevron')}<b>${esc(tab.name)}</b>`
    : `<span>Stater</span>${icon('chevron')}<b>Overview</b>`;
  return `
    <nav class="crumbs" aria-label="Onde estás">${crumbs}</nav>
    <div class="spacer"></div>
    ${rec ? `<span class="updated">Atualizado a ${formatarData(rec.savedAt)}</span>` : ''}
    ${brand ? `<button class="btn btn-primary" data-act="upload" ${live ? '' : 'disabled'}>${icon('upload')} Carregar Excel</button>` : ''}`;
}

// ---------- Painel da tab ----------
function painelVazio(brand, tab, A) {
  return `
    ${erro ? `<div class="alert error" role="alert" style="margin:20px 24px 0">${icon('info')}<div><b>Este ficheiro não serve para esta tab</b>${esc(erro)}</div></div>` : ''}
    <div class="empty">
      <div class="drop" id="drop">
        <div class="big">${icon('upload')}</div>
        <h3>Carrega o Excel desta tab</h3>
        <p>Arrasta o ficheiro para aqui ou escolhe-o no computador. Aceita .xlsx, .xls e .csv.</p>
        <div class="row">
          <button class="btn btn-primary" data-act="upload">${icon('upload')} Escolher ficheiro</button>
          <button class="btn btn-secondary" data-act="sample">${icon('sparkle')} Ver com dados de exemplo</button>
        </div>
      </div>
      <div class="howto">
        <h3>${esc(A.view.importar.titulo)}</h3>
        <p class="import-txt">${esc(A.view.importar.texto)}</p>
        <div class="alert alert-info" style="margin-top:16px">${icon('lock')}<div>O ficheiro é lido só neste browser. Nada é enviado para a internet.</div></div>
      </div>
    </div>`;
}

function painelEmBreve(brand, tab) {
  return `<div class="soon-panel">
    <div class="big">${icon(tab.icon)}</div>
    <h3>Disponível na versão final</h3>
    <p>Neste protótipo só funcionam as tabs <b>NPS</b> e <b>NPS por Causa Raiz</b> da Colibri. Esta tab mantém o nome e as regras do Stater atual e vai ganhar o mesmo aspeto.</p>
    <a class="btn btn-secondary" href="#/colibri/nps">${icon('bars')} Ver a Colibri › NPS</a>
  </div>`;
}

const TIP_REGRAS = 'O texto sai de regras fixas aplicadas aos números do Excel, as mesmas do Stater atual. Não há opinião nem IA: as mesmas contas dão sempre as mesmas frases.';

function resumoHtml(r) {
  const blocos = r.blocos || [{ texto: r.texto, tom: r.tom }];
  return `<div class="resumo">
    <h3 class="sec-title">Resumo <span class="badge" data-tip-title="Regras fixas" data-tip="${TIP_REGRAS}" tabindex="0">Regras fixas</span></h3>
    ${blocos.map(b => `<div class="rs-bloco ${b.tom || ''}">${b.titulo ? `<b class="rs-t">${b.titulo}</b>` : ''}<p>${b.texto}</p></div>`).join('')}
    ${r.factos ? `<div class="rs-factos">${r.factos.map(f => `<div class="rs-f ${f.tom || ''}"><b class="num">${f.valor}</b><span>${f.rot} ${f.tip ? info(f.rot, f.tip) : ''}</span></div>`).join('')}</div>` : ''}
    ${r.notas?.length ? `<ul class="rs-notas">${r.notas.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}
  </div>`;
}

function painel(brand, tab) {
  const A = ANALISES[tab.id];
  const live = A && brand.id === 'colibri';
  const rec = store.get(brand.id, tab.id);
  const head = (chipsHtml = '') => `
    <div class="panel-head">
      <span class="tile" style="${tileVars(brand)}">${icon(tab.icon)}</span>
      <div><h2>${esc(tab.name)}</h2><div class="sub">${esc(brand.name)} · Stats iQ</div></div>
      <div class="chips">${chipsHtml}</div>
    </div>`;
  if (!live) return `<section class="panel">${head()}${painelEmBreve(brand, tab)}</section>`;
  if (!rec) return `<section class="panel">${head()}${painelVazio(brand, tab, A)}</section>`;

  const m = meta(brand.id);
  const ch = A.view.chips(rec);
  const chipsHtml = `
    ${rec.exemplo ? `<span class="chip" style="background:#ece7fb;color:#4b2a9c">${icon('sparkle')} Dados de exemplo</span>` : ''}
    <span class="chip">${icon('calendar')} Período do ficheiro <b class="chip brand" style="padding:2px 8px">${esc(formatarPeriodo(rec.data.periodo))}</b></span>
    <span class="chip">${icon('users')} Respostas <b class="num">${fmt(ch.respostas)}</b></span>
    <span class="chip">${icon('file')} Fonte <b>Stats iQ</b></span>`;
  return `<section class="panel">
    ${head(chipsHtml)}
    ${erro ? `<div class="alert error" role="alert" style="margin:16px 24px 0">${icon('info')}<div><b>Este ficheiro não serve para esta tab</b>${esc(erro)} Os dados anteriores continuam.</div></div>` : ''}
    <div class="panel-body">
      <aside class="panel-side">
        ${resumoHtml(A.view.resumo(rec, m))}
        <div class="side-block">
          <h3 class="sec-title">Ficheiro desta tab</h3>
          <div class="filecard">${icon('file')}<div><div class="fn">${esc(rec.fileName)}</div><div class="fm">Carregado a ${formatarData(rec.savedAt)} · ${esc(formatarPeriodo(rec.data.periodo))}</div></div></div>
          <div class="file-actions">
            <button class="btn btn-secondary btn-sm" data-act="upload">${icon('upload')} Substituir</button>
            <button class="btn btn-danger-ghost btn-sm" data-act="clear">${icon('trash')} Apagar dados desta tab</button>
          </div>
        </div>
        <details class="fold">
          <summary>${icon('chevron')} ${esc(A.view.importar.titulo)}</summary>
          <div class="fold-body"><p class="import-txt">${esc(A.view.importar.texto)}</p></div>
        </details>
      </aside>
      <div class="panel-main">${A.view.html(rec, m)}</div>
    </div>
  </section>`;
}

// ---------- Overview (Grupo Brisa) ----------
function overview() {
  const dados = BRANDS.map(b => {
    const rec = store.get(b.id, 'nps');
    return { b, rec, r: rec ? resumoNps(rec.data.contagens) : null, m: meta(b.id) };
  });
  const comDados = dados.filter(d => d.r);
  const totalResp = comDados.reduce((a, d) => a + d.r.total, 0);
  return `
    <section class="ov-hero">
      ${onda(7)}
      <div style="position:relative">
        <h1>Overview do Grupo Brisa</h1>
        <p>O NPS de cada marca face à sua meta. Os números vêm da tab NPS de cada marca; as metas definem-se aqui.</p>
      </div>
      <div class="stat"><b class="num">${comDados.length}/${BRANDS.length}</b><span>marcas com dados${totalResp ? ` · ${fmt(totalResp)} respostas` : ''}</span></div>
    </section>
    <div class="ov-grid">${dados.map(({ b, rec, r, m }) => `
      <div class="ov-card" style="${tileVars(b)};--font-b:${b.font}, 'Noto Sans', sans-serif">
        <div class="top"><span class="tile mark">${logo(b.icon)}</span><b>${esc(b.name)}</b>
          ${r ? `<span class="badge ${r.nps >= m ? 'good' : 'bad'}">${r.nps >= m ? 'Meta atingida' : 'Abaixo da meta'}</span>` : '<span class="badge">Sem dados</span>'}</div>
        ${r ? `<div class="val"><b class="num">${fmt(r.nps)}</b><span class="muted">NPS · ${fmt(r.total)} respostas</span></div>
          <div class="compo" style="height:10px" aria-hidden="true"><div class="d" style="flex:${r.pctD}"></div><div class="n" style="flex:${r.pctN}"></div><div class="p" style="flex:${r.pctP};background:${b.colors.main}"></div></div>
          <div class="muted">${esc(formatarPeriodo(rec.data.periodo))}${rec.exemplo ? ' · dados de exemplo' : ''}</div>`
        : `<div class="wait">A aguardar dados da tab NPS</div>`}
        <div class="meta"><label for="meta-${b.id}">Objetivo NPS</label><input id="meta-${b.id}" data-meta="${b.id}" inputmode="numeric" value="${m}" aria-describedby="meta-h">
          ${b.id === 'colibri' ? `<a class="btn btn-ghost btn-sm" href="#/colibri/nps" style="margin-left:auto">Abrir ${icon('chevron')}</a>` : ''}</div>
      </div>`).join('')}
    </div>
    <span id="meta-h" class="sr-only">Número de −100 a 100. Guarda ao sair do campo.</span>
    <section class="card" style="background:#fff" aria-labelledby="h-ov">
      <div class="card-head"><h3 id="h-ov">NPS vs objetivo por marca ${info('NPS vs objetivo', 'Barra: NPS da tab NPS de cada marca. Traço: objetivo definido nos cartões acima. Marcas sem dados ficam vazias.')}</h3></div>
      <div id="ch-ov" class="chart"></div>
    </section>`;
}

function montarOverview() {
  const dados = BRANDS.map(b => { const rec = store.get(b.id, 'nps'); return { b, r: rec ? resumoNps(rec.data.contagens) : null, m: meta(b.id) }; });
  desenhar(document.getElementById('ch-ov'), junta(base(GROUP), {
    chart: { type: 'bar', height: 300 },
    series: [{ name: 'NPS', data: dados.map(d => ({ x: d.b.name, y: d.r ? d.r.nps : null, fillColor: d.b.colors.main, goals: [{ name: 'Objetivo', value: d.m, strokeHeight: 4, strokeWidth: 36, strokeLineCap: 'round', strokeColor: '#1a1a1a' }] })) }],
    plotOptions: { bar: { columnWidth: '46%', borderRadius: 6, borderRadiusApplication: 'end', dataLabels: { position: 'top' } } },
    dataLabels: { enabled: true, offsetY: -20, formatter: v => (v == null ? '' : fmt(v)), style: { fontSize: '13px', fontWeight: 700, colors: ['#1a1a1a'] } },
    yaxis: { min: -20, max: 100, tickAmount: 4 },
    xaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '12px', fontWeight: 600, colors: '#494949' } } },
    tooltip: { y: { formatter: (v, { dataPointIndex }) => (v == null ? 'sem dados' : `${fmt(v)} (objetivo ${dados[dataPointIndex].m})`) } },
    noData: { text: 'Sem dados' },
  }));
  document.querySelectorAll('[data-meta]').forEach(inp => inp.addEventListener('change', () => {
    const v = Math.max(-100, Math.min(100, parseInt(inp.value, 10)));
    if (!Number.isFinite(v)) { inp.value = meta(inp.dataset.meta); return; }
    inp.value = v;
    localStorage.setItem(`stater:v1:meta:${inp.dataset.meta}`, String(v));
    toast('Objetivo guardado.');
    render();
  }));
}

// ---------- Render ----------
const $ = s => document.querySelector(s);

function render() {
  limparGraficos();
  const r = rota();
  const tema = r.brand || GROUP;
  applyTheme(document.documentElement, tema);
  document.title = r.brand ? `${r.tab.name} · ${r.brand.name} · Stater` : 'Overview · Stater';
  $('#sidebar').innerHTML = sidebar(r);
  $('#topbar').innerHTML = topbar(r);
  const c = $('#content');
  if (!r.brand) {
    c.innerHTML = overview();
    montarOverview();
  } else {
    c.innerHTML = `
      <header class="brand-head">
        <span class="tile mark">${logo(r.brand.icon)}</span>
        <div><h1>${esc(r.brand.name)}</h1><p>${r.brand.tabs.length} tabs</p></div>
      </header>
      ${painel(r.brand, r.tab)}`;
    const A = ANALISES[r.tab.id];
    const rec = store.get(r.brand.id, r.tab.id);
    if (A && rec && r.brand.id === 'colibri') A.view.mount(rec, r.brand, meta(r.brand.id));
    ligarDrop();
  }
}

// ---------- Ações ----------
async function carregar(file) {
  const r = rota();
  if (!r.brand || !file) return;
  const A = ANALISES[r.tab.id];
  try {
    const rows = await lerPrimeiraFolha(file);
    const data = A.parse(rows);
    store.set(r.brand.id, r.tab.id, { fileName: file.name, savedAt: new Date().toISOString(), data });
    erro = null;
    toast(`${file.name} carregado.`);
  } catch (e) {
    erro = e instanceof FicheiroErrado ? e.message : `Não consegui ler o ficheiro (${e.message}).`;
    if (e.name === 'QuotaExceededError') erro = 'A memória do browser para o Stater está cheia. Apaga dados de outras tabs e tenta de novo.';
  }
  render();
}

function ligarDrop() {
  const d = $('#drop');
  if (!d) return;
  d.addEventListener('dragover', e => { e.preventDefault(); d.classList.add('is-over'); });
  d.addEventListener('dragleave', () => d.classList.remove('is-over'));
  d.addEventListener('drop', e => { e.preventDefault(); d.classList.remove('is-over'); carregar(e.dataTransfer.files[0]); });
}

document.addEventListener('click', async e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const r = rota();
  if (b.dataset.act === 'upload') $('#file').click();
  if (b.dataset.act === 'sample' && r.brand) {
    const ex = exemplos[r.tab.id];
    store.set(r.brand.id, r.tab.id, { ...ex, savedAt: new Date().toISOString(), exemplo: true });
    erro = null;
    render();
  }
  if (b.dataset.act === 'clear' && r.brand) {
    if (await confirmar('Apagar os dados desta tab?', `Sai o ficheiro carregado em "${r.tab.name}". As outras tabs não mudam.`)) {
      store.del(r.brand.id, r.tab.id);
      erro = null;
      toast('Dados apagados.');
      render();
    }
  }
});

$('#file').addEventListener('change', e => { carregar(e.target.files[0]); e.target.value = ''; });
// Animação suave ao mudar de marca (View Transitions; sem suporte, só o fade de CSS)
let marcaAtual = rota().brand?.id ?? null;
addEventListener('hashchange', () => {
  erro = null;
  const nova = rota().brand?.id ?? null;
  const mudouMarca = nova !== marcaAtual;
  marcaAtual = nova;
  animarSub = mudouMarca;
  const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mudar = () => { render(); window.scrollTo({ top: 0 }); };
  if (!reduzir && document.startViewTransition) {
    document.documentElement.dataset.vt = mudouMarca ? 'marca' : 'tab';
    document.startViewTransition(mudar).finished.finally(() => delete document.documentElement.dataset.vt);
  } else mudar();
});
ligarTooltips();
render();
