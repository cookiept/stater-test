// Pequenas peças de interface partilhadas.
import { icon } from './icons.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Botão "i" com explicação (aparece ao passar o rato ou com o teclado).
export function info(titulo, texto) {
  return `<button type="button" class="info" data-tip-title="${esc(titulo)}" data-tip="${esc(texto)}" aria-label="O que é ${esc(titulo)}?">${icon('info')}</button>`;
}

let tipEl = null;
function mostrar(btn) {
  esconder();
  tipEl = document.createElement('div');
  tipEl.className = 'tip';
  tipEl.setAttribute('role', 'tooltip');
  tipEl.innerHTML = `<b>${esc(btn.dataset.tipTitle)}</b>${esc(btn.dataset.tip)}`;
  document.body.appendChild(tipEl);
  const r = btn.getBoundingClientRect();
  const t = tipEl.getBoundingClientRect();
  let left = Math.min(Math.max(8, r.left + r.width / 2 - t.width / 2), innerWidth - t.width - 8);
  let top = r.top - t.height - 8;
  if (top < 8) top = r.bottom + 8;
  tipEl.style.left = `${left}px`;
  tipEl.style.top = `${top}px`;
}
function esconder() { tipEl?.remove(); tipEl = null; }

export function ligarTooltips() {
  document.addEventListener('mouseover', e => { const b = e.target.closest('[data-tip]'); if (b) mostrar(b); });
  document.addEventListener('mouseout', e => { if (e.target.closest('[data-tip]')) esconder(); });
  document.addEventListener('focusin', e => { const b = e.target.closest('[data-tip]'); if (b) mostrar(b); });
  document.addEventListener('focusout', esconder);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') esconder(); });
  addEventListener('scroll', esconder, true);
}

export function toast(msg) {
  document.querySelector('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.innerHTML = `${icon('sparkle')}<span>${esc(msg)}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

export function confirmar(titulo, texto, acao = 'Apagar') {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.innerHTML = `<h3>${esc(titulo)}</h3><p>${esc(texto)}</p><div class="row"><button class="btn btn-secondary" value="no">Cancelar</button><button class="btn btn-danger" value="yes">${esc(acao)}</button></div>`;
    document.body.appendChild(d);
    d.addEventListener('click', e => { const v = e.target.closest('button')?.value; if (v) d.close(v); });
    d.addEventListener('close', () => { resolve(d.returnValue === 'yes'); d.remove(); });
    d.showModal();
  });
}

// Onda decorativa dos cartões (varia com a semente).
export function onda(seed = 1) {
  const a = 8 + (seed % 3) * 4, f = 1 + (seed % 4) * 0.35, ph = seed * 1.7;
  let d1 = 'M0 40', d2 = 'M0 52';
  for (let x = 0; x <= 300; x += 10) {
    d1 += ` L${x} ${(36 + a * Math.sin((x / 300) * Math.PI * 2 * f + ph)).toFixed(1)}`;
    d2 += ` L${x} ${(48 + a * 0.7 * Math.sin((x / 300) * Math.PI * 2 * f + ph + 1.2)).toFixed(1)}`;
  }
  return `<svg class="wave" viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true"><path d="${d1}" fill="none" stroke="currentColor" stroke-width="2"/><path d="${d2}" fill="none" stroke="currentColor" stroke-width="1.2"/></svg>`;
}
