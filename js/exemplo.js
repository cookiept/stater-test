// Dados fictícios para quem abre o protótipo sem Excel. Não são dados reais.
export const exemplos = {
  nps: {
    fileName: 'Exemplo – NPS.xlsx',
    data: {
      contagens: [310, 160, 170, 180, 150, 330, 420, 760, 1840, 2310, 8070],
      periodo: { inicio: '2026-07-01T00:00:00.000Z', fim: '2026-09-30T00:00:00.000Z' },
      filtros: [{ campo: 'Data de início', valor: '1 jul 2026 a 30 set 2026', data: true }],
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
      filtros: [{ campo: 'Data de início', valor: '1 jul 2026 a 30 set 2026', data: true }],
    },
  },
  molho: {
    fileName: 'Exemplo – 3 drivers',
    data: (() => {
      const periodo = { inicio: '2026-07-01T00:00:00.000Z', fim: '2026-09-30T00:00:00.000Z' };
      const filtros = [{ campo: 'Data de início', valor: '1 jul 2026 a 30 set 2026', data: true }];
      const drv = (driver, amostraGrupo, causas) => ({ driver, fileName: `Exemplo – ${driver}.xlsx`, periodo, filtros, amostraGrupo, semRespostas: [],
        causas: causas.map(([nome, d, n, p]) => ({ nome, d, n, p, total: d + n + p })) });
      const ficheiros = [
        drv('Chegada', { d: 420, n: 610, p: 1900 }, [['Tempo de espera', 96, 140, 310], ['Estacionamento', 58, 45, 61], ['Sinalização', 4, 7, 12]]),
        drv('Atendimento', { d: 300, n: 520, p: 2200 }, [['Simpatia da equipa', 9, 30, 196], ['Rapidez no balcão', 77, 64, 90], ['Outra', 6, 4, 9]]),
        drv('Oferta', { d: 610, n: 540, p: 1300 }, [['Preço dos produtos', 188, 71, 102], ['Variedade da oferta', 22, 39, 98], ['Limpeza das instalações', 41, 66, 248]]),
      ];
      return { ficheiros, periodo, filtros };
    })(),
  },
};
