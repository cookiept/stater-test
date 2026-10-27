// Leitura dos Excel exportados do Qualtrics Stats iQ.
// Um só leitor para todas as tabs; cada tipo de análise tem o seu parser.

export class FicheiroErrado extends Error {
  constructor(motivo) { super(motivo); this.name = 'FicheiroErrado'; }
}

export async function lerPrimeiraFolha(file) {
  if (!window.XLSX) throw new Error('A biblioteca de leitura de Excel não carregou. Verifica a ligação à internet e recarrega a página.');
  const buf = await file.arrayBuffer();
  const wb = window.XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
}

const texto = v => (v == null ? '' : String(v)).trim();
const lower = v => texto(v).toLowerCase();
const inteiro = v => {
  if (typeof v === 'number') return Number.isInteger(v) ? v : null;
  const s = texto(v).replace(/[\s.]/g, '').replace(',', '.');
  return /^-?\d+$/.test(s) ? parseInt(s, 10) : null;
};
const temPalavra = (rows, n, re) => rows.slice(0, n).some(r => (r || []).some(c => re.test(texto(c))));

// ---------- Filtro de data (período do ficheiro) ----------
const MESES = { jan: 1, feb: 2, fev: 2, mar: 3, apr: 4, abr: 4, may: 5, mai: 5, jun: 6, jul: 7, aug: 8, ago: 8, sep: 9, set: 9, oct: 10, out: 10, nov: 11, dec: 12, dez: 12 };
const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function lerData(s) {
  s = texto(s);
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/(\d{1,2})\s+([A-Za-zçÇ]{3})[a-zç]*\.?,?\s+(\d{4})/);
  if (m && MESES[m[2].toLowerCase()]) return new Date(+m[3], MESES[m[2].toLowerCase()] - 1, +m[1]);
  m = s.match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MESES[m[1].toLowerCase()]) return new Date(+m[3], MESES[m[1].toLowerCase()] - 1, +m[2]);
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); // Qualtrics exporta em formato americano
  if (m) return new Date(+m[3], +m[1] - 1, +m[2]);
  return null;
}

export function formatarData(d, curto = false) {
  if (!d) return '';
  d = new Date(d);
  return curto ? `${d.getDate()} ${MESES_PT[d.getMonth()]}` : `${d.getDate()} ${MESES_PT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatarPeriodo(p) {
  if (!p) return 'Sem filtro de data';
  if (p.inicio && p.fim) {
    const a = new Date(p.inicio), b = new Date(p.fim);
    return a.getFullYear() === b.getFullYear() ? `${formatarData(a, true)} – ${formatarData(b)}` : `${formatarData(a)} – ${formatarData(b)}`;
  }
  if (p.inicio) return `Desde ${formatarData(p.inicio)}`;
  if (p.fim) return `Até ${formatarData(p.fim)}`;
  return 'Sem filtro de data'; // filtro sem datas (ex.: linha "greater than or equal to" vazia)
}

export function extrairPeriodo(rows) {
  let semData = null; // filtro sem datas (ex.: "greater than or equal to " vazio): só serve se não houver outro
  for (const r of rows.slice(0, 40)) {
    for (const c of r || []) {
      const s = texto(c);
      if (!/(start|end|recorded)\s*date/i.test(s)) continue;
      const encontradas = s.match(/\d{4}-\d{1,2}-\d{1,2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}\s+[A-Za-zç]{3}[a-zç]*\.?,?\s+\d{4}|[A-Za-z]{3}[a-z]*\.?\s+\d{1,2},?\s+\d{4}/g) || [];
      const datas = encontradas.map(lerData).filter(Boolean);
      if (/between/i.test(s) && datas.length >= 2) return { inicio: datas[0].toISOString(), fim: datas[1].toISOString(), texto: s };
      if (!datas.length) { semData ??= { texto: s.trim() }; continue; }
      if (/after|since|greater|≥|>=/i.test(s) && datas[0]) return { inicio: datas[0].toISOString(), texto: s };
      if (/before|until|less|≤|<=/i.test(s) && datas[0]) return { fim: datas[0].toISOString(), texto: s };
      if (datas.length >= 2) return { inicio: datas[0].toISOString(), fim: datas[1].toISOString(), texto: s };
      return { texto: s };
    }
  }
  return semData;
}

// ---------- NPS: distribuição 0–10 (Stats iQ "Describe" de NPS numérico) ----------
export function parseNps(rows) {
  if (temPalavra(rows, 5, /\b(ces|customer effort score|topic hierarchy|regression)\b/i))
    throw new FicheiroErrado('Este Excel parece ser de outra análise (CES, Topics ou regressão). Nesta tab carrega o Describe do NPS (notas de 0 a 10).');
  const contagens = Array(11).fill(null);
  // A tabela certa vem depois do cabeçalho "Count of NPS…" (antes há a tabela de percentis, que também tem 0–10).
  const iCab = rows.findIndex(r => (r || []).some(c => /^count of/i.test(texto(c))));
  for (const r of iCab >= 0 ? rows.slice(iCab + 1) : rows) {
    if (!r) continue;
    const nota = inteiro(r[0]), n = inteiro(r[1]);
    if (nota == null || n == null || nota < 0 || nota > 10 || n < 0) continue;
    if (contagens[nota] == null) contagens[nota] = n;
  }
  const encontradas = contagens.filter(v => v != null).length;
  const total = contagens.reduce((a, b) => a + (b || 0), 0);
  if (encontradas < 6 || total === 0)
    throw new FicheiroErrado('Não encontrei a tabela de notas de 0 a 10 com o número de respostas. Confirma que exportaste o Describe do NPS (numérico) no Stats iQ.');
  return { contagens: contagens.map(v => v || 0), periodo: extrairPeriodo(rows) };
}

// ---------- NPS por Causa Raiz (Stats iQ "Relate" de Group NPS × causa de resposta múltipla) ----------
const grupoDe = s => {
  s = lower(s);
  if (/detra|detract/.test(s)) return 'd';
  if (/neutr|passiv/.test(s)) return 'n';
  if (/promo/.test(s)) return 'p';
  return null;
};

function limparTitulo(s) {
  const m = texto(s).split(/\s+vs\.?\s+/i);
  let t = (m[1] || m[0] || '').trim();
  t = t.replace(/^(CR\s*Store_|CR[_\s-]+|RC[_\s-]+)/i, '').replace(/\s*-\s*Quais.*$/i, '').trim();
  return t;
}

export function parseCausas(rows) {
  if (temPalavra(rows, 5, /\b(level 1|level 2|continuous summary)\b/i))
    throw new FicheiroErrado('Este Excel é de Text iQ (Level 1/Level 2). Nesta tab carrega o Relate de Group NPS com a Causa Raiz.');

  let titulo = '';
  for (const r of rows.slice(0, 5)) for (const c of r || []) if (/\svs\.?\s/i.test(texto(c)) && !titulo) titulo = limparTitulo(c);

  const mapa = new Map();
  const somar = (nome, g, n) => {
    if (!nome || g == null || n == null) return;
    if (!mapa.has(nome)) mapa.set(nome, { nome, d: 0, n: 0, p: 0 });
    mapa.get(nome)[g] += n;
  };

  // 1) Bloco vertical: [grupo NPS, causa, Checked Count, Sample Size do grupo, Sample Size da causa]
  const amostraGrupo = { d: 0, n: 0, p: 0 };
  const inicio = rows.findIndex(r => (r || []).some(c => /checked count|sample size of/i.test(texto(c))));
  if (inicio >= 0) {
    let grupoAtual = null;
    for (let i = inicio + 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const primeira = lower(r.find(c => texto(c) !== ''));
      if (/^(count|all %|check %|category %|chi-squared)/.test(primeira)) break;
      const g = grupoDe(r[0]);
      if (g) grupoAtual = g;
      const nome = texto(r[1]);
      const n = inteiro(r[2]);
      if (grupoAtual && nome && n != null) somar(nome, grupoAtual, n);
      const ag = inteiro(r[3]);
      if (g && ag != null) amostraGrupo[g] = Math.max(amostraGrupo[g], ag);
    }
  }

  // 2) Alternativa: bloco horizontal "Count" (linhas = grupos, colunas = causas)
  if (mapa.size === 0) {
    let iCount = -1;
    rows.forEach((r, i) => { if ((r || []).some(c => lower(c) === 'count')) iCount = i; });
    if (iCount >= 0) {
      const cab = rows[iCount + 1] || [];
      for (let i = iCount + 2; i < Math.min(rows.length, iCount + 10); i++) {
        const r = rows[i] || [];
        const g = grupoDe(r[0]);
        if (!g) continue;
        for (let j = 1; j < cab.length; j++) {
          const nome = texto(cab[j]);
          if (nome && !/^total$/i.test(nome)) somar(nome, g, inteiro(r[j]));
        }
      }
    }
  }

  const todas = [...mapa.values()].map(c => ({ ...c, total: c.d + c.n + c.p }));
  const causas = todas.filter(c => c.total > 0);
  if (causas.length === 0)
    throw new FicheiroErrado('Não encontrei as linhas Detrator / Neutro / Promotor por causa. Confirma que exportaste o Relate de Group NPS com a Causa Raiz no Stats iQ.');
  const semRespostas = todas.filter(c => c.total === 0).map(c => c.nome);
  const respondentes = amostraGrupo.d + amostraGrupo.n + amostraGrupo.p;
  return { titulo, causas, semRespostas, amostraGrupo: respondentes ? amostraGrupo : null, periodo: extrairPeriodo(rows) };
}
