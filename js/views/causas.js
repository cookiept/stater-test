// Tab "NPS por Causa Raiz": Relate de Group NPS com a causa raiz (resposta múltipla).
import { enriquecerCausas, npsDe, fmt, sinal } from '../stats.js?v=20261027-1447';
import { base, junta, desenhar } from '../charts.js?v=20261027-1447';
import { info, esc } from '../ui.js?v=20261027-1447';
import { icon } from '../icons.js?v=20261027-1447';

const npsGlobal = data => {
  const a = data.amostraGrupo;
  return a ? { nps: npsDe(a.d, a.p, a.d + a.n + a.p), total: a.d + a.n + a.p } : null;
};

export function chips(rec) {
  const g = npsGlobal(rec.data);
  return { respostas: g ? g.total : rec.data.causas.reduce((a, c) => a + c.total, 0) };
}

// Resumo: os três blocos do Stater v10 (volume, melhor NPS, maior detração).
// Otimizado: "Outra" e "Sem sugestões" e causas com menos de 30 menções não entram no melhor e pior.
export function resumo(rec) {
  const cs = enriquecerCausas(rec.data.causas).filter(c => !c.semSugestao);
  const mencoes = enriquecerCausas(rec.data.causas).reduce((a, c) => a + c.total, 0);
  const fiaveis = cs.filter(c => !c.amostraPequena);
  const lista = fiaveis.length ? fiaveis : cs;
  const maior = [...cs].sort((a, b) => b.total - a.total)[0];
  const melhor = [...lista].sort((a, b) => b.nps - a.nps)[0];
  const pior = [...lista].sort((a, b) => a.nps - b.nps)[0];
  const blocos = [];
  if (maior) blocos.push({ titulo: 'Amostra e volume', texto: `Análise de <strong>${fmt(mencoes)}</strong> ocorrências de causa raiz. O motivo mais frequente é <strong>${esc(maior.nome)}</strong> com <strong>${fmt(maior.total)}</strong> menções.` });
  if (melhor) blocos.push({ titulo: 'Melhor desempenho NPS', tom: 'good', texto: `A causa com maior índice de satisfação relativa é <strong>${esc(melhor.nome)}</strong> com um NPS de <strong>${sinal(melhor.nps)}</strong> (${fmt(melhor.pctP)}% de promotores).` });
  if (pior && pior !== melhor) blocos.push({ titulo: 'Maior ponto de detração', tom: 'bad', texto: `A causa raiz com maior impacto negativo é <strong>${esc(pior.nome)}</strong> com um NPS de <strong>${sinal(pior.nps)}</strong> (${fmt(pior.pctD)}% de detratores).` });
  const pequenas = cs.filter(c => c.amostraPequena).length;
  const notas = [];
  if (pequenas) notas.push(`${pequenas === 1 ? 'Uma causa tem' : `${pequenas} causas têm`} menos de 30 menções e não entra${pequenas === 1 ? '' : 'm'} no melhor e pior.`);
  if (rec.data.semRespostas?.length) notas.push(`${rec.data.semRespostas.length} opções sem menções neste período.`);
  return { blocos, notas };
}

export function html(rec) {
  const cs = enriquecerCausas(rec.data.causas);
  const g = npsGlobal(rec.data);
  const mencoes = cs.reduce((a, c) => a + c.total, 0);
  const titulo = rec.data.titulo ? esc(rec.data.titulo.replace(/\.\.\.$/, '…')) : 'Causa raiz';
  const kpi = (rot, val, det, tip, hero = false) => `
    <div class="kpi${hero ? ' hero' : ''}"><span class="kl">${rot} ${info(rot, tip)}</span><span class="kv num">${val}</span><span class="kd">${det}</span></div>`;
  return `
    <div class="kpis" style="grid-template-columns:repeat(4,minmax(0,1fr))">
      ${g ? kpi('NPS de quem respondeu', fmt(g.nps), `${fmt(g.total)} pessoas`, 'NPS de todas as pessoas que viram esta pergunta, calculado a partir do tamanho de cada grupo (Sample Size) no Excel.', true) : ''}
      ${kpi('Causas com menções', fmt(cs.length), `de ${fmt(cs.length + (rec.data.semRespostas?.length || 0))} opções`, 'Opções da pergunta de causa raiz que alguém escolheu no período. "Outra" e "Sem sugestões" aparecem no fim e não entram nos destaques.')}
      ${kpi('Menções', fmt(mencoes), 'uma pessoa pode escolher várias', 'Soma das vezes que cada causa foi escolhida. Como a pergunta aceita várias respostas, não é o número de pessoas.')}
      ${kpi('Causa mais referida', `${fmt(cs[0]?.quota || 0)}%`, esc(cs[0]?.nome || ''), 'Peso da causa mais escolhida no total de menções.')}
    </div>
    <section class="card" aria-labelledby="h-comp">
      <div class="card-head">
        <h3 id="h-comp">Quem escolheu cada causa ${info('Composição por causa', 'Para cada causa, a parte de detratores, neutros e promotores entre quem a escolheu. Ordenado por número de menções.')}</h3>
        <div class="legend" style="margin:0 0 0 auto"><span><i style="background:var(--detractor)"></i>Detratores</span><span><i style="background:var(--passive)"></i>Neutros</span><span><i style="background:var(--brand)"></i>Promotores</span></div>
      </div>
      <div id="ch-comp" class="chart" role="img" aria-label="Composição de detratores, neutros e promotores por causa"></div>
    </section>
    <section class="card" aria-labelledby="h-mat">
      <div class="card-head"><h3 id="h-mat">Onde atuar primeiro ${info('Menções vs NPS', 'Cada ponto é uma causa. Quanto mais à direita, mais pessoas a referiram; quanto mais abaixo, pior o NPS. As causas no canto inferior direito pesam mais e estão pior.')}</h3>
        <div class="note">${g ? `Linha tracejada: NPS de quem respondeu (${fmt(g.nps)}). Pontos a vermelho estão abaixo dela.` : ''}</div></div>
      <div id="ch-mat" class="chart" role="img" aria-label="Menções e NPS por causa"></div>
      <div class="legend" id="lg-mat" style="margin:0 0 10px"></div>
    </section>
    <section class="card" aria-labelledby="h-tab" style="padding-bottom:16px">
      <div class="card-head" style="margin-bottom:10px">
        <h3 id="h-tab">Tabela ${info('Impacto', 'Peso da causa no total de menções: Alto a partir de 15%, Médio a partir de 5%, Baixo abaixo disso.')}</h3>
        <div class="tbl-tools" style="margin-left:auto">
          <label class="search">${icon('search')}<span class="sr-only">Procurar causa</span><input id="q-causa" type="search" placeholder="Procurar causa"></label>
        </div>
      </div>
      <div class="tbl-wrap"><table class="tbl" id="tbl-causas">
        <thead><tr>
          <th scope="col"><button data-sort="nome">Causa ${icon('sort')}</button></th>
          <th scope="col" class="r"><button data-sort="nps">NPS ${icon('sort')}</button></th>
          <th scope="col" class="r"><button data-sort="total">Menções ${icon('sort')}</button></th>
          <th scope="col">Detratores · Neutros · Promotores</th>
          <th scope="col"><button data-sort="quota">Impacto ${icon('sort')}</button></th>
        </tr></thead>
        <tbody></tbody>
      </table></div>
    </section>`;
}

function linhas(cs, gNps) {
  return cs.map(c => `
    <tr>
      <td><span class="name">${esc(c.nome)}</span>${c.amostraPequena ? ' <span class="badge mid">amostra pequena</span>' : ''}</td>
      <td class="r"><span class="badge ${gNps != null && c.nps < gNps ? 'bad' : 'good'} num">${fmt(c.nps)}</span></td>
      <td class="r num">${fmt(c.total)}</td>
      <td><div style="display:flex;align-items:center;gap:10px"><div class="minibar" aria-hidden="true"><div class="d" style="flex:${c.pctD}"></div><div class="n" style="flex:${c.pctN}"></div><div class="p" style="flex:${c.pctP}"></div></div><span class="muted num" style="white-space:nowrap">${fmt(c.pctD)} · ${fmt(c.pctN)} · ${fmt(c.pctP)}%</span></div></td>
      <td><span class="badge ${c.impacto === 'Alto' ? 'bad' : c.impacto === 'Médio' ? 'mid' : ''}">${c.impacto}</span> <span class="muted num">${fmt(c.quota, 1)}%</span></td>
    </tr>`).join('') || '<tr><td colspan="5" class="muted">Nenhuma causa com esse nome.</td></tr>';
}

export function mount(rec, brand) {
  const cs = enriquecerCausas(rec.data.causas);
  const g = npsGlobal(rec.data);
  const b = base(brand);
  const nomes = cs.map(c => c.nome);
  const altura = Math.max(220, cs.length * 54 + 60);

  desenhar(document.getElementById('ch-comp'), junta(b, {
    chart: { type: 'bar', height: altura, stacked: true, stackType: '100%' },
    series: [
      { name: 'Detratores', data: cs.map(c => c.d) },
      { name: 'Neutros', data: cs.map(c => c.n) },
      { name: 'Promotores', data: cs.map(c => c.p) },
    ],
    colors: ['#db3a23', '#c4c4c4', brand.colors.main],
    plotOptions: { bar: { horizontal: true, barHeight: '62%', borderRadius: 4, borderRadiusApplication: 'around', borderRadiusWhenStacked: 'all' } },
    stroke: { width: 2, colors: ['#fff'] },
    dataLabels: { enabled: true, formatter: (v) => (v >= 8 ? `${fmt(v)}%` : ''), style: { fontSize: '11px', fontWeight: 600, colors: ['#fff', '#1a1a1a', brand.colors.on] }, dropShadow: { enabled: false } },
    xaxis: { categories: cs.map(c => [c.nome.length > 34 ? c.nome.slice(0, 33) + '…' : c.nome, `${fmt(c.total)} menções · NPS ${fmt(c.nps)}`]), labels: { formatter: v => `${v}%` }, axisBorder: { show: false } },
    yaxis: { labels: { maxWidth: 300, style: { fontSize: '12px', colors: ['#1a1a1a'] } } },
    tooltip: { shared: true, intersect: false, y: { formatter: (v, { seriesIndex, dataPointIndex }) => `${fmt(v)} (${fmt([cs[dataPointIndex].pctD, cs[dataPointIndex].pctN, cs[dataPointIndex].pctP][seriesIndex], 1)}%)` } },
    grid: { xaxis: { lines: { show: true } }, yaxis: { lines: { show: false } } },
  }));

  desenhar(document.getElementById('ch-mat'), junta(b, {
    chart: { type: 'scatter', height: 340 },
    series: cs.map(c => ({ name: c.nome, data: [[c.total, c.nps]] })),
    colors: cs.map(c => (g && c.nps < g.nps ? '#db3a23' : brand.colors.main)),
    markers: { size: 11, strokeWidth: 2, strokeColors: '#fff', hover: { sizeOffset: 2 } },
    xaxis: { type: 'numeric', tickAmount: 5, min: 0, max: Math.ceil(Math.max(...cs.map(c => c.total)) * 1.15), labels: { formatter: v => fmt(v) }, title: { text: 'Menções', style: { fontSize: '11px', fontWeight: 500, color: '#767676' } } },
    yaxis: { min: Math.min(-20, Math.floor(Math.min(...cs.map(c => c.nps)) / 10) * 10 - 10), max: 100, tickAmount: 4, title: { text: 'NPS', style: { fontSize: '11px', fontWeight: 500, color: '#767676' } } },
    annotations: g ? { yaxis: [{ y: g.nps, borderColor: '#767676', strokeDashArray: 4, label: { text: `NPS geral ${fmt(g.nps)}`, position: 'right', borderColor: 'transparent', style: { background: '#f0f0f0', color: '#494949' } } }] } : {},
    tooltip: { custom: ({ seriesIndex }) => { const c = cs[seriesIndex]; return `<div style="padding:10px 12px;font-size:12px"><b>${esc(c.nome)}</b><br>NPS ${fmt(c.nps)} · ${fmt(c.total)} menções</div>`; } },
    grid: { xaxis: { lines: { show: true } } },
  }));

  document.getElementById('lg-mat').innerHTML = cs.map(c => `<span><i style="background:${g && c.nps < g.nps ? '#db3a23' : brand.colors.main};border-radius:50%"></i>${esc(c.nome)} <b class="num">${fmt(c.nps)}</b></span>`).join('');

  // Tabela: ordenar e procurar
  const tbody = document.querySelector('#tbl-causas tbody');
  let chave = 'total', dir = -1, q = '';
  const pintar = () => {
    const lista = cs.filter(c => c.nome.toLowerCase().includes(q)).sort((a, b2) => {
      if (a.semSugestao !== b2.semSugestao) return a.semSugestao - b2.semSugestao;
      const x = a[chave], y = b2[chave];
      return (typeof x === 'string' ? x.localeCompare(y, 'pt') : x - y) * dir;
    });
    tbody.innerHTML = linhas(lista, g?.nps ?? null);
    document.querySelectorAll('#tbl-causas th').forEach(th => th.removeAttribute('aria-sort'));
    document.querySelector(`#tbl-causas [data-sort="${chave}"]`)?.closest('th').setAttribute('aria-sort', dir > 0 ? 'ascending' : 'descending');
  };
  document.querySelectorAll('#tbl-causas [data-sort]').forEach(btn => btn.addEventListener('click', () => {
    const k = btn.dataset.sort;
    dir = k === chave ? -dir : (k === 'nome' ? 1 : -1);
    chave = k;
    pintar();
  }));
  document.getElementById('q-causa').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); pintar(); });
  pintar();
}

// Texto do Stater v10, sem alterações
export const importar = {
  titulo: 'Como importar os dados de NPS por causas raiz',
  texto: 'No Stats iQ, selecione a variável principal "(Group) NPS" e, como variável secundária, a "Causa Raiz" à escolha. Em seguida, execute a opção "Relate" e exporte a tabela para Excel.',
};
