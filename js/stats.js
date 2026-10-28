// Contas do NPS: uma regra para todo o Stater.
// 0–6 detrator, 7–8 neutro, 9–10 promotor. NPS = %promotores − %detratores, calculado a partir das contagens e arredondado no fim.

export function resumoNps(contagens) {
  const total = contagens.reduce((a, b) => a + b, 0);
  const d = contagens.slice(0, 7).reduce((a, b) => a + b, 0);
  const n = contagens[7] + contagens[8];
  const p = contagens[9] + contagens[10];
  const media = contagens.reduce((a, c, i) => a + c * i, 0) / total;
  const variancia = total > 1 ? contagens.reduce((a, c, i) => a + c * (i - media) ** 2, 0) / (total - 1) : 0;
  let moda = 0;
  contagens.forEach((c, i) => { if (c > contagens[moda]) moda = i; });
  return {
    total, d, n, p,
    pctD: (d / total) * 100, pctN: (n / total) * 100, pctP: (p / total) * 100,
    nps: npsDe(d, p, total),
    media, dp: Math.sqrt(variancia), moda,
  };
}

export const npsDe = (d, p, total) => (total ? Math.round(((p - d) / total) * 100) : 0);

export function enriquecerCausas(causas) {
  const totalGeral = causas.reduce((a, c) => a + c.total, 0);
  return causas.map(c => {
    const quota = (c.total / totalGeral) * 100;
    return {
      ...c,
      nps: npsDe(c.d, c.p, c.total),
      pctD: (c.d / c.total) * 100, pctN: (c.n / c.total) * 100, pctP: (c.p / c.total) * 100,
      quota,
      impacto: quota >= 15 ? 'Alto' : quota >= 5 ? 'Médio' : 'Baixo',
      amostraPequena: c.total < 30,
      semSugestao: /sem sugest|^outr[oa]s?\b/i.test(c.nome),
    };
  }).sort((a, b) => (a.semSugestao - b.semSugestao) || (b.total - a.total));
}

export const fmt = (v, casas = 0) => Number(v).toLocaleString('pt-PT', { minimumFractionDigits: casas, maximumFractionDigits: casas });
export const sinal = v => (v > 0 ? `+${fmt(v)}` : fmt(v));

// Limites para avisar que há poucas respostas (os números servem só como indicação)
export const LIMITES = { poucasRespostas: 100, amostraPequena: 30 };

// Causas que contam para destaques e alertas: sem "Outra"/"Sem sugestões" e com menções suficientes
export const causasFiaveis = cs => cs.filter(c => !c.semSugestao && !c.amostraPequena);

// Destaques de uma lista de causas já enriquecida: pior NPS, mais detratores e mais referida
export function destaques(cs) {
  const f = causasFiaveis(cs);
  const lista = f.length ? f : cs.filter(c => !c.semSugestao);
  if (!lista.length) return {};
  return {
    pior: [...lista].sort((a, b) => a.nps - b.nps)[0],
    maisDetratores: [...lista].sort((a, b) => b.d - a.d)[0],
    maisReferida: [...lista].sort((a, b) => b.total - a.total)[0],
  };
}
