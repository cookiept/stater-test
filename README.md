# Stater · protótipo

Protótipo do novo Stater: os resultados do Qualtrics Stats iQ das marcas do Grupo Brisa, com o design system do grupo.

**Ver online:** https://cookiept.github.io/stater-test/

## O que funciona
- Menu com todas as marcas e tabs, com os nomes do Stater atual.
- **Colibri › NPS** e **Colibri › NPS por Causa Raiz**: carregam o Excel exportado do Stats iQ e mostram os gráficos, o resumo (regras do Stater atual) e a tabela. Cada tab tem um botão "Ver com dados de exemplo".
- **Overview**: NPS de cada marca face ao objetivo, com a identidade do Grupo Brisa.
- As outras tabs aparecem como "Disponível na versão final".

## Dados
Os Excel são lidos só no browser de quem os abre e ficam guardados nesse browser (localStorage). Nada é enviado para a internet. **Não ponhas ficheiros Excel neste repositório** (o `.gitignore` bloqueia-os).

## Estrutura
- `index.html`: página única.
- `css/app.css`: estilos; tokens do "Design System @ Grupo Brisa".
- `js/brands.js`: marcas, cores, fontes e tabs.
- `js/excel.js`: leitura do Excel e parsers por tipo de análise.
- `js/stats.js`: contas do NPS (uma só regra).
- `js/views/`: uma vista por tipo de análise.
- `vendor/`: ApexCharts 8.5.0. SheetJS 0.20.3 vem de cdn.sheetjs.com.

Sem passo de build: abre com qualquer servidor estático (ex.: `npx serve .`).

## Versão dos ficheiros (cache)
O GitHub Pages guarda os ficheiros em cache durante 10 minutos. Para que todos vejam logo a versão nova, cada publicação muda o número `?v=` nos `import` dos ficheiros `js/` e no `index.html`:

```bash
V=$(date +%Y%m%d-%H%M); sed -i -E "s#(from '\.{1,2}/[^']+\.js)(\?v=[^']*)?'#\1?v=$V'#" js/*.js js/views/*.js; sed -i -E "s#(css/app\.css|js/app\.js)(\?v=[^\"]*)?\"#\1?v=$V\"#g" index.html
```
