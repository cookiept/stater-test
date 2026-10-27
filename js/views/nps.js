// Tab "NPS": distribuição das notas 0–10 (Stats iQ Describe).
import { resumoNps, fmt, sinal } from '../stats.js';
import { base, junta, desenhar } from '../charts.js';
import { info, esc } from '../ui.js';
import { icon } from '../icons.js';

export function kpiCartao(rec) {
  const r = resumoNps(rec.data.contagens);
  return { valor: fmt(r.nps), unidade: 'NPS' };
}

export function chips(rec) {
  return { respostas: resumoNps(rec.data.contagens).total };
}

export function pontos(rec, meta) {
  const c = rec.data.contagens;
  const r = resumoNps(c);
  const dif = r.nps - meta;
  const pct6NosD = r.d ? (c[6] / r.d) * 100 : 0;
  const pct8NosN = r.n ? (c[8] / r.n) * 100 : 0;
  const ganho6 = (c[6] / r.total) * 100;
  const ganho8 = (c[8] / r.total) * 100;
  const margem = v => (v >= 40 ? 'boa' : v >= 30 ? 'relevante' : 'limitada');
  return [
    {
      tom: dif < 0 ? 'bad' : 'good', valor: fmt(r.nps), rot: dif < 0 ? `${sinal(dif)} vs meta` : `${sinal(dif)} vs meta`,
      texto: dif < 0
        ? `NPS de <strong>${fmt(r.nps)}</strong>, ${fmt(-dif)} pontos abaixo da meta de ${meta}.`
        : `NPS de <strong>${fmt(r.nps)}</strong>, ${dif === 0 ? 'igual à' : `${fmt(dif)} pontos acima da`} meta de ${meta}.`,
    },
    {
      tom: '', valor: `${fmt(r.pctP)}%`, rot: 'promotores',
      texto: `<strong>${fmt(r.pctP)}%</strong> deram 9 ou 10 e <strong>${fmt(r.pctD)}%</strong> deram 0 a 6.`,
    },
    {
      tom: '', valor: `${fmt(pct6NosD)}%`, rot: 'detratores com 6',
      texto: `Margem ${margem(pct6NosD)} para reduzir detratores: se quem deu 6 passasse a neutro, o NPS subia <strong>${sinal(Math.round(ganho6))}</strong> pontos.`,
    },
    {
      tom: '', valor: `${fmt(pct8NosN)}%`, rot: 'neutros com 8',
      texto: `Margem ${margem(pct8NosN)} para converter neutros: se quem deu 8 passasse a promotor, o NPS subia <strong>${sinal(Math.round(ganho8))}</strong> pontos.`,
    },
    {
      tom: '', valor: String(r.moda), rot: 'nota mais dada',
      texto: `A nota mais dada foi <strong>${r.moda}</strong>, por ${fmt((c[r.moda] / r.total) * 100)}% das pessoas.`,
    },
  ];
}

export function html(rec, meta) {
  const r = resumoNps(rec.data.contagens);
  const kpi = (rot, val, det, tip, hero = false) => `
    <div class="kpi${hero ? ' hero' : ''}">
      <span class="kl">${rot} ${tip ? info(rot, tip) : ''}</span>
      <span class="kv num">${val}</span><span class="kd">${det}</span>
    </div>`;
  return `
    <div class="kpis">
      ${kpi('NPS', fmt(r.nps), `Meta ${meta}`, 'Net Promoter Score: % de promotores (9–10) menos % de detratores (0–6). Vai de −100 a +100. Calculado a partir das contagens do Excel.', true)}
      ${kpi('Respostas', fmt(r.total), 'notas de 0 a 10', 'Total de respostas com nota no período do ficheiro.')}
      ${kpi('Promotores', `${fmt(r.pctP, 1)}%`, `${fmt(r.p)} pessoas`, 'Quem deu 9 ou 10.')}
      ${kpi('Neutros', `${fmt(r.pctN, 1)}%`, `${fmt(r.n)} pessoas`, 'Quem deu 7 ou 8. Não entram na conta do NPS, mas estão perto de passar a promotores.')}
      ${kpi('Detratores', `${fmt(r.pctD, 1)}%`, `${fmt(r.d)} pessoas`, 'Quem deu de 0 a 6.')}
      ${kpi('Média', fmt(r.media, 2), `Desvio padrão ${fmt(r.dp, 2)}`, 'Média das notas de 0 a 10. O desvio padrão mostra quão espalhadas estão as notas: quanto maior, mais opiniões divergentes.')}
    </div>
    <div class="grid-2">
      <section class="card" aria-labelledby="h-gauge">
        <div class="card-head"><h3 id="h-gauge">NPS face à meta ${info('Meta', 'A meta vem da Overview (por omissão 60). Altera-a lá e todas as tabs passam a usá-la.')}</h3></div>
        <div id="ch-gauge" class="chart" role="img" aria-label="NPS ${fmt(r.nps)} com meta ${meta}"></div>
        <div style="flex:1"></div><div class="compo" aria-hidden="true">
          <div class="d" style="flex:${r.pctD}">${r.pctD >= 6 ? fmt(r.pctD) + '%' : ''}</div>
          <div class="n" style="flex:${r.pctN}">${r.pctN >= 6 ? fmt(r.pctN) + '%' : ''}</div>
          <div class="p" style="flex:${r.pctP}">${fmt(r.pctP)}%</div>
        </div>
        <div class="legend"><span><i style="background:var(--detractor)"></i>Detratores 0–6</span><span><i style="background:var(--passive)"></i>Neutros 7–8</span><span><i style="background:var(--brand)"></i>Promotores 9–10</span></div>
        <div style="height:10px"></div>
      </section>
      <section class="card" aria-labelledby="h-dist">
        <div class="card-head">
          <h3 id="h-dist">Notas dadas ${info('Notas dadas', 'Quantas pessoas deram cada nota. Por cima de cada barra está a percentagem do total.')}</h3>
          <div class="note">Passa o rato para ver o número de respostas</div>
        </div>
        <div id="ch-dist" class="chart" role="img" aria-label="Distribuição das notas de 0 a 10"></div>
      </section>
    </div>
    <section class="card" aria-labelledby="h-mes">
      <div class="card-head">
        <h3 id="h-mes">NPS por mês</h3>
        <span class="badge example">${icon('sparkle', 'ico')} Exemplo</span>
        <div class="note">O Excel atual não traz meses: estes valores são fictícios, só para mostrar o gráfico.</div>
      </div>
      <div id="ch-mes" class="chart" role="img" aria-label="Exemplo de NPS por mês"></div>
    </section>`;
}

export function mount(rec, brand, meta) {
  const c = rec.data.contagens;
  const r = resumoNps(c);
  const brandC = brand.colors.main;
  const cores = c.map((_, i) => (i <= 6 ? '#db3a23' : i <= 8 ? '#c4c4c4' : brandC));
  const b = base(brand);

  desenhar(document.getElementById('ch-gauge'), junta(b, {
    chart: { type: 'radialBar', height: 280, sparkline: { enabled: true } },
    series: [Math.max(0, Math.min(100, (r.nps + 100) / 2))],
    colors: [brandC],
    plotOptions: {
      radialBar: {
        startAngle: -95, endAngle: 95, hollow: { size: '62%' },
        track: { background: '#f0f0f0', strokeWidth: '100%', margin: 0 },
        dataLabels: {
          name: { show: true, offsetY: 26, color: '#767676', fontSize: '12px', formatter: () => `meta ${meta} · ${r.nps >= meta ? 'atingida' : `faltam ${meta - r.nps}`}` },
          value: { offsetY: -14, fontSize: '40px', fontWeight: 700, color: '#1a1a1a', formatter: () => fmt(r.nps) },
        },
      },
    },
    fill: { type: 'gradient', gradient: { shade: 'light', type: 'horizontal', gradientToColors: [brand.colors.light], stops: [0, 100] } },
    stroke: { lineCap: 'round' },
    labels: ['NPS'],
  }));

  desenhar(document.getElementById('ch-dist'), junta(b, {
    chart: { type: 'bar', height: 300 },
    series: [{ name: 'Respostas', data: c }],
    colors: cores,
    plotOptions: { bar: { distributed: true, borderRadius: 5, borderRadiusApplication: 'end', columnWidth: '62%', dataLabels: { position: 'top' } } },
    dataLabels: {
      enabled: true, offsetY: -18, style: { fontSize: '11px', fontWeight: 600, colors: ['#494949'] },
      formatter: v => `${fmt((v / r.total) * 100, v / r.total < 0.1 ? 1 : 0)}%`,
    },
    xaxis: { categories: c.map((_, i) => String(i)), axisBorder: { show: false }, axisTicks: { show: false }, labels: { style: { fontSize: '12px', fontWeight: 600 } } },
    yaxis: { labels: { formatter: v => fmt(v) } },
    tooltip: { y: { formatter: v => `${fmt(v)} respostas (${fmt((v / r.total) * 100, 1)}%)` }, x: { formatter: v => `Nota ${v}` } },
  }));

  // Exemplo fictício: meses à volta do valor real
  const meses = ['set', 'out', 'nov', 'dez', 'jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago'];
  const desvios = [-7, -4, -6, -2, -5, -1, 1, -3, 2, 0, 3, 1];
  desenhar(document.getElementById('ch-mes'), junta(b, {
    chart: { type: 'bar', height: 220 },
    series: [{ name: 'NPS (exemplo)', data: desvios.map(d => r.nps + d) }],
    colors: desvios.map((_, i) => (i >= 9 ? brandC : brand.colors.lightest)),
    plotOptions: { bar: { borderRadius: 5, borderRadiusApplication: 'end', columnWidth: '58%', distributed: true, dataLabels: { position: 'top' } } },
    dataLabels: { enabled: true, offsetY: -18, style: { fontSize: '11px', fontWeight: 600, colors: ['#494949'] } },
    xaxis: { categories: meses, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { min: Math.min(0, r.nps - 20), max: 100, tickAmount: 4 },
    annotations: { yaxis: [{ y: meta, borderColor: '#e0a400', strokeDashArray: 4, label: { text: `Meta ${meta}`, position: 'right', textAnchor: 'end', offsetY: -2, borderColor: '#ffc148', style: { background: '#ffc148', color: '#1a1a1a', fontWeight: 600 } } }] },
    tooltip: { y: { formatter: v => `${v} (fictício)` } },
  }));
}

export const comoTirar = [
  'No Qualtrics, abre o inquérito da marca e vai a <b>Stats iQ</b>.',
  'Seleciona só a variável <b>NPS</b> (numérica, notas de 0 a 10).',
  'Em <b>Describe</b>, confirma que aparece a tabela <i>Count of NPS</i>.',
  'Aplica o filtro de data (<i>Start Date is between…</i>) do período que queres analisar.',
  'Exporta para <b>Excel</b> e carrega o ficheiro nesta tab.',
];
