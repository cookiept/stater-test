// Stater · protótipo. Uma página, menu de marcas à esquerda, cada tab lê o seu Excel.
import { BRANDS, GROUP, brandById, applyTheme } from './brands.js?v=20261028-1302';
import { icon } from './icons.js?v=20261028-1302';
import { logo } from './logos.js?v=20261028-1302';
import { esc, info, ligarTooltips, toast, confirmar } from './ui.js?v=20261028-1302';
import { lerPrimeiraFolha, parseNps, parseCausas, FicheiroErrado, formatarPeriodo, formatarData } from './excel.js?v=20261028-1302';
import { resumoNps, fmt, sinal } from './stats.js?v=20261028-1302';
import { limparGraficos, base, junta, desenhar } from './charts.js?v=20261028-1302';
import * as vNps from './views/nps.js?v=20261028-1302';
import * as vCausas from './views/causas.js?v=20261028-1302';
import { exemplos } from './exemplo.js?v=20261028-1302';

// Tabs que funcionam no protótipo
const ANALISES = {
  nps: { parse: parseNps, view: vNps },
  'causa-raiz': { parse: parseCausas, view: vCausas },
};
// Uma tab funciona se tiver análise e estiver marcada como live em brands.js
const ativa = (b, t) => !!(b && t && t.live && ANALISES[t.id]);

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
const rota = () => {
  const [, b, t] = location.hash.replace(/^#\/?/, '#/').split('/');
  const brand = brandById(b);
  if (!brand) return { brand: null, tab: null };
  const tab = brand.tabs.find(x => x.id === t) || brand.tabs[0];
  return { brand, tab };
};
// Marcas com a lista de tabs aberta no menu (guardado só neste browser)
const CHAVE_ABERTAS = 'stater:v1:ui:abertas';
const abertas = new Set((() => { try { return JSON.parse(localStorage.getItem(CHAVE_ABERTAS)) || []; } catch { return []; } })());
const guardarAbertas = () => { try { localStorage.setItem(CHAVE_ABERTAS, JSON.stringify([...abertas])); } catch {} };

const ir = (b, t) => { location.hash = b ? `#/${b}/${t}` : '#/'; };

// ---------- Menu lateral ----------
function tileVars(b) {
  return `--tile-bg:${b.colors.main};--tile-on:${b.colors.on};--tile-soft:${b.colors.lightest};--tile-ink:${b.colors.darkest}`;
}

function sidebar({ brand, tab }) {
  const itens = BRANDS.map(b => {
    const atual = brand?.id === b.id;
    const aberta = abertas.has(b.id);
    const sub = aberta ? `<div class="sb-sub-nav" id="tabs-${b.id}">${b.tabs.map(t => `
        <a class="sb-tab" href="#/${b.id}/${t.id}" ${atual && tab?.id === t.id ? 'aria-current="page"' : ''}>${icon(t.icon)}<span class="lbl" title="${esc(t.name)}">${esc(t.name)}</span>${store.get(b.id, t.id) ? '<span class="dot" title="Com dados"></span>' : ''}</a>`).join('')}</div>` : '';
    return `<div class="sb-row" style="${tileVars(b)}">
        <a class="sb-item${atual ? ' is-open' : ''}" href="#/${b.id}/${b.tabs[0].id}">
        <span class="tile mark">${logo(b.icon)}</span><span class="nm" title="${esc(b.name)}">${esc(b.name)}</span><span class="count" title="${b.tabs.length} tabs">${b.tabs.length}</span></a>
        <button class="sb-toggle" data-toggle="${b.id}" aria-expanded="${aberta}" aria-controls="tabs-${b.id}" aria-label="${aberta ? 'Fechar' : 'Abrir'} tabs de ${esc(b.name)}">${icon('chevron')}</button>
      </div>${sub}`;
  }).join('');
  return `
    <div class="sb-head"><div class="sb-logo">${icon('bars')}</div><div><div class="sb-title">Stater</div><div class="sb-sub">CX · Grupo Brisa</div></div></div>
    <div>
      <div class="sb-label">Marcas</div>
      <nav class="sb-nav" aria-label="Marcas">
        <a class="sb-item sb-ov${!brand ? ' is-open' : ''}" href="#/" style="${tileVars(GROUP)}" ${!brand ? 'aria-current="page"' : ''}><span class="tile mark">${logo('grupo')}</span><span>Overview</span><span class="count">grupo</span></a>
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
  const crumbs = brand
    ? `<span>Stater</span>${icon('chevron')}<span>${esc(brand.name)}</span>${icon('chevron')}<b>${esc(tab.name)}</b>`
    : `<span>Stater</span>${icon('chevron')}<b>Overview</b>`;
  return `
    <nav class="crumbs" aria-label="Onde estás">${crumbs}</nav>
    <div class="spacer"></div>
    ${rec ? `<span class="updated">Atualizado a ${formatarData(rec.savedAt)}</span>` : ''}
`;
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
    <p>Neste protótipo funcionam a tab <b>NPS</b> de cada marca (menos a Nedlinq) e a <b>NPS por Causa Raiz</b> da Colibri. Esta tab mantém o nome e as regras do Stater atual e vai ganhar o mesmo aspeto.</p>
    ${ativa(brand, brand.tabs[0]) ? `<a class="btn btn-secondary" href="#/${brand.id}/${brand.tabs[0].id}">${icon('bars')} Ver ${esc(brand.name)} › NPS</a>` : ''}
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
  const live = ativa(brand, tab);
  const rec = store.get(brand.id, tab.id);
  const head = (chipsHtml = '') => `
    <div class="panel-head">
      <span class="tile" style="${tileVars(brand)}">${icon(tab.icon)}</span>
      <h2>${esc(tab.name)}</h2>
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

// ---------- Metas ----------
const dataMetas = () => localStorage.getItem('stater:v1:meta-data');

function editarMetas() {
  const d = document.createElement('dialog');
  d.className = 'dlg-metas';
  d.innerHTML = `<form method="dialog">
    <h3>Metas de NPS</h3>
    <p>Valor de −100 a 100 para cada marca. Usado na Overview e no resumo da tab NPS.</p>
    <div class="metas-lista">${BRANDS.map(b => `
      <label class="meta-linha"><span class="tile mark">${logo(b.icon)}</span><span>${esc(b.name)}</span>
        <input name="${b.id}" type="number" min="-100" max="100" step="1" required value="${meta(b.id)}"></label>`).join('')}
    </div>
    <div class="row"><button class="btn btn-secondary" value="no" formnovalidate>Cancelar</button><button class="btn btn-primary" value="yes">Guardar metas</button></div>
  </form>`;
  document.body.appendChild(d);
  d.addEventListener('close', () => {
    if (d.returnValue === 'yes') {
      new FormData(d.querySelector('form')).forEach((v, id) => {
        const n = Math.max(-100, Math.min(100, parseInt(v, 10)));
        if (Number.isFinite(n)) localStorage.setItem(`stater:v1:meta:${id}`, String(n));
      });
      localStorage.setItem('stater:v1:meta-data', new Date().toISOString());
      toast('Metas guardadas.');
      render();
    }
    d.remove();
  });
  d.showModal();
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
      <span class="ov-blob o" aria-hidden="true"></span><span class="ov-blob l" aria-hidden="true"></span><span class="ov-blob g" aria-hidden="true"></span><span class="ov-blob c" aria-hidden="true"></span>
      <div class="ov-txt">
        <h1>Overview do Grupo Brisa</h1>
        <p>O NPS de cada marca face à sua meta. Os números vêm da tab NPS de cada marca; as metas definem-se aqui.</p>
      </div>
      <img class="ov-logo" src="assets/grupo-brisa-branco.png" alt="Grupo Brisa" width="640" height="498">
      <span class="ov-faixa" aria-hidden="true"></span>
    </section>
    <div class="ov-bar">
      <h2>Marcas</h2>
      <span class="muted">${comDados.length} de ${BRANDS.length} com dados${totalResp ? ` · ${fmt(totalResp)} respostas` : ''}</span>
      <span class="sep"></span>
      ${dataMetas() ? `<span class="muted">Metas atualizadas a ${formatarData(dataMetas())}</span>` : ''}
      <button class="btn btn-secondary btn-sm" data-act="metas">${icon('target')} Editar metas</button>
    </div>
    <div class="ov-grid">${dados.map(({ b, rec, r, m }) => `
      <div class="ov-card" style="${tileVars(b)};--font-b:${b.font}, 'Noto Sans', sans-serif">
        <div class="top"><span class="tile mark">${logo(b.icon)}</span><b>${esc(b.name)}</b>
          ${r ? `<span class="badge ${r.nps >= m ? 'good' : 'bad'}" title="${r.nps >= m ? 'Meta atingida' : 'Abaixo da meta'}">${sinal(r.nps - m)} vs meta</span>` : '<span class="badge">Sem dados</span>'}</div>
        ${r ? `<div class="val"><b class="num">${fmt(r.nps)}</b><span class="muted">NPS · ${fmt(r.total)} respostas</span></div>
          <div class="compo" style="height:10px" aria-hidden="true"><div class="d" style="flex:${r.pctD}"></div><div class="n" style="flex:${r.pctN}"></div><div class="p" style="flex:${r.pctP};background:${b.colors.main}"></div></div>
          <div class="muted">${esc(formatarPeriodo(rec.data.periodo))}${rec.exemplo ? ' · dados de exemplo' : ''}</div>`
        : `<div class="wait">A aguardar dados da tab NPS</div>`}
        <div class="meta">${icon('target')} Meta <b>${m}</b>
          ${ativa(b, b.tabs[0]) ? `<a class="btn btn-ghost btn-sm" href="#/${b.id}/nps" style="margin-left:auto">Abrir ${icon('chevron')}</a>` : ''}</div>
      </div>`).join('')}
    </div>
    <section class="card" style="background:#fff" aria-labelledby="h-ov">
      <div class="card-head"><h3 id="h-ov">NPS vs meta por marca ${info('NPS vs meta', 'Barra colorida: NPS da tab NPS de cada marca. Barra cinzenta: meta definida em Editar metas. Marcas sem dados só mostram a meta.')}</h3>
        <div class="legend" style="margin:0 0 0 auto"><span><i style="background:conic-gradient(#005555 0 25%,#f96730 0 50%,#ffd552 0 75%,#008635 0)"></i>NPS (cor de cada marca)</span><span><i style="background:#d6dde3"></i>Meta</span></div></div>
      <div id="ch-ov" class="chart"></div>
      <div class="ov-eixo" id="ov-eixo" aria-hidden="true">${BRANDS.map(b => `<span>${esc(b.name)}</span>`).join('')}</div>
    </section>`;
}

// Põe a linha de nomes por baixo das barras e o logótipo de cada marca dentro da barra do NPS
function alinharEixo(chart) {
  const e = document.getElementById('ov-eixo');
  if (!e) return;
  const g = chart.w.globals;
  e.style.marginLeft = `${g.translateX}px`;
  e.style.width = `${g.gridWidth}px`;
  const el = chart.el;
  el.querySelectorAll('.ov-bar-logo').forEach(n => n.remove());
  const caixa = el.getBoundingClientRect();
  el.querySelectorAll('.apexcharts-series[seriesName="NPS"] path.apexcharts-bar-area').forEach(p => {
    const b = BRANDS[+p.getAttribute('j')];
    const r = p.getBoundingClientRect();
    if (!b || r.height < 30) return;
    const tam = Math.min(r.width - 10, 56, r.height - 12);
    const d = document.createElement('span');
    d.className = 'ov-bar-logo';
    d.innerHTML = logo(b.icon);
    Object.assign(d.style, { width: `${tam}px`, height: `${tam}px`, padding: `${Math.round(tam * 0.18)}px`, left: `${r.left - caixa.left + (r.width - tam) / 2}px`, top: `${r.bottom - caixa.top - tam - 8}px` });
    el.appendChild(d);
  });
}

function montarOverview() {
  const dados = BRANDS.map(b => { const rec = store.get(b.id, 'nps'); return { b, r: rec ? resumoNps(rec.data.contagens) : null, m: meta(b.id) }; });
  // Duas barras por marca: NPS (cor da marca) e meta (cinzento claro), lado a lado
  desenhar(document.getElementById('ch-ov'), junta(base(GROUP), {
    // Os nomes saem do eixo e vão para a linha HTML #ov-eixo, com o logótipo antes do nome
    chart: { type: 'bar', height: 300, events: { mounted: alinharEixo, updated: alinharEixo, animationEnd: alinharEixo } },
    series: [
      { name: 'NPS', data: dados.map(d => ({ x: d.b.name, y: d.r ? d.r.nps : null, fillColor: d.b.colors.main })) },
      { name: 'Meta', data: dados.map(d => ({ x: d.b.name, y: d.m, fillColor: '#d6dde3' })) },
    ],
    legend: { show: false },
    plotOptions: { bar: { columnWidth: '62%', borderRadius: 6, borderRadiusApplication: 'end', dataLabels: { position: 'top' } } },
    stroke: { show: true, width: 4, colors: ['transparent'] },
    dataLabels: {
      enabled: true, offsetY: -20, formatter: v => (v == null ? '' : fmt(v)),
      style: { fontSize: '12px', fontWeight: 700, colors: ['#1a1a1a', '#767676'] },
    },
    yaxis: { min: -20, max: 100, tickAmount: 4 },
    xaxis: { axisBorder: { show: false }, axisTicks: { show: false }, labels: { show: false } },
    tooltip: { shared: true, intersect: false, y: { formatter: v => (v == null ? 'sem dados' : fmt(v)) } },
    states: { hover: { filter: { type: 'darken', value: 0.9 } } },
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
        <h1>${esc(r.brand.name)}</h1>
      </header>
      ${painel(r.brand, r.tab)}`;
    const A = ANALISES[r.tab.id];
    const rec = store.get(r.brand.id, r.tab.id);
    if (rec && ativa(r.brand, r.tab)) A.view.mount(rec, r.brand, meta(r.brand.id));
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
  const tg = e.target.closest('[data-toggle]');
  if (tg) {
    const id = tg.dataset.toggle;
    abertas.has(id) ? abertas.delete(id) : abertas.add(id);
    guardarAbertas();
    $('#sidebar').innerHTML = sidebar(rota());
    $(`#sidebar [data-toggle="${id}"]`)?.focus();
    return;
  }
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const r = rota();
  if (b.dataset.act === 'upload') $('#file').click();
  if (b.dataset.act === 'metas') editarMetas();
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
// As tabs de cada marca só abrem e fecham pela seta do menu
addEventListener('hashchange', () => { erro = null; render(); window.scrollTo({ top: 0 }); });
ligarTooltips();
render();
