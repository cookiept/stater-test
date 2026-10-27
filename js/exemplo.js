// Dados fictícios para quem abre o protótipo sem Excel. Não são dados reais.
export const exemplos = {
  nps: {
    fileName: 'Exemplo – NPS.xlsx',
    data: {
      contagens: [310, 160, 170, 180, 150, 330, 420, 760, 1840, 2310, 8070],
      periodo: { inicio: '2026-07-01T00:00:00.000Z', fim: '2026-09-30T00:00:00.000Z' },
    },
  },
  'causa-raiz': {
    fileName: 'Exemplo – NPS por Causa Raiz.xlsx',
    data: {
      titulo: 'Exemplo de pergunta de causa raiz',
      causas: [
        { nome: 'Tempo de espera', d: 96, n: 140, p: 310 },
        { nome: 'Limpeza das instalações', d: 41, n: 66, p: 248 },
        { nome: 'Preço dos produtos', d: 88, n: 71, p: 102 },
        { nome: 'Simpatia da equipa', d: 9, n: 30, p: 196 },
        { nome: 'Variedade da oferta', d: 22, n: 39, p: 98 },
        { nome: 'Estacionamento', d: 18, n: 25, p: 61 },
        { nome: 'Sinalização', d: 4, n: 7, p: 12 },
      ].map(c => ({ ...c, total: c.d + c.n + c.p })),
      semRespostas: ['Meios de pagamento'],
      amostraGrupo: { d: 1300, n: 2100, p: 8600 },
      periodo: { inicio: '2026-07-01T00:00:00.000Z', fim: '2026-09-30T00:00:00.000Z' },
    },
  },
};
