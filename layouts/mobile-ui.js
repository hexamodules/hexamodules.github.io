/* Mobile presentation adapter. Existing controls, listeners and price calculation stay authoritative. */
(() => {
  'use strict';
  const root = document.documentElement;
  const width = matchMedia('(max-width: 700px)');
  const touch = matchMedia('(any-pointer: coarse)');
  const eligible = () => width.matches && (touch.matches || navigator.maxTouchPoints > 0);
  const $ = s => document.querySelector(s);
  const panel = $('.configuration'), scroll = $('.panel-scroll');
  if (!panel || !scroll) return;
  let active = false, current = 'vehicle', expanded = false, pending = false;
  const moved = new Map();
  const make = (tag, className) => { const el = document.createElement(tag); el.className = className; el.dataset.moduleI18n = ''; return el; };
  const head = make('div', 'mobile-sheet-head');
  const handle = make('button', 'mobile-sheet-handle'); handle.type = 'button'; handle.setAttribute('aria-controls', 'mobile-sheet-content');
  const row = make('div', 'mobile-price-row');
  const price = make('div', 'mobile-price');
  const priceLabel = make('span', 'mobile-price-label');
  const total = make('output', 'mobile-price-total'); total.setAttribute('aria-live', 'polite');
  const quote = make('button', 'mobile-quote'); quote.type = 'button';
  price.append(priceLabel, total); row.append(price, quote); head.append(handle, row);
  const nav = make('div', 'mobile-tabs'); nav.setAttribute('role', 'tablist');
  const other = make('section', 'mobile-other'); other.id = 'mobile-other'; delete other.dataset.moduleI18n;
  other.setAttribute('role', 'tabpanel'); other.setAttribute('aria-labelledby', 'mobile-tab-other');
  const vehicles = make('div', 'mobile-vehicle-cards');
  const vehicleButtons = new Map();
  const categories = ['vehicle', 'furniture', 'interior', 'equipment', 'review', 'other'];
  const labels = {ja:['車種','家具','内装','装備','見積','その他'], en:['Vehicle','Furniture','Interior','Equipment','Quote','More']};
  const buttons = categories.map(key => {
    const b = make('button', 'mobile-tab'); b.type = 'button'; b.id = 'mobile-tab-' + key;
    b.dataset.mobileTab = key; b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', key === 'other' ? other.id : 'pane-' + key);
    b.addEventListener('click', () => select(key, true)); nav.append(b); return b;
  });
  // Keep original DOM nodes and restore their exact positions when returning to desktop.
  function move(el, parent, before = null) {
    if (!el || moved.has(el)) return;
    const marker = document.createComment('mobile-ui original position'); el.before(marker);
    moved.set(el, marker); parent.insertBefore(el, before);
  }
  const setText = (el, value) => { if (el.textContent !== value) el.textContent = value; };
  const en = () => root.lang.toLowerCase().startsWith('en');
  function size(open) {
    expanded = open; root.classList.toggle('mobile-sheet-expanded', open);
    handle.setAttribute('aria-expanded', String(open));
    setText(handle, open ? (en() ? '⌄ View 3D' : '⌄ 3Dを見る') : (en() ? '⌃ Show options' : '⌃ 選択肢を広げる'));
  }
  function select(key, open = expanded) {
    current = key; root.dataset.mobilePane = key;
    buttons.forEach(b => { const on = b.dataset.mobileTab === key; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    other.hidden = key !== 'other';
    scroll.scrollTop = 0; size(open);
  }
  handle.addEventListener('click', () => size(!expanded));
  quote.addEventListener('click', () => select('review', true));
  nav.addEventListener('keydown', e => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    e.preventDefault(); const index = categories.indexOf(current);
    const next = e.key === 'Home' ? 0 : e.key === 'End' ? categories.length - 1 : (index + (e.key === 'ArrowRight' ? 1 : -1) + categories.length) % categories.length;
    select(categories[next], true); buttons[next].focus();
  });
  let startY = null;
  handle.addEventListener('pointerdown', e => { startY = e.clientY; handle.setPointerCapture(e.pointerId); });
  handle.addEventListener('pointerup', e => {
    if (startY !== null && Math.abs(e.clientY - startY) > 24) { size(e.clientY < startY); suppressClick = true; }
    startY = null;
  });
  handle.addEventListener('pointercancel', () => { startY = null; });
  let suppressClick = false;
  handle.addEventListener('click', e => { if (suppressClick) { suppressClick = false; e.stopImmediatePropagation(); } }, true);
  const selection = 'button[aria-pressed]:not([data-lang]):not([data-view]):not([data-night-toggle]),input[type=checkbox],select';
  panel.addEventListener('click', e => { if (active && e.target.closest(selection)) pending = true; }, true);
  panel.addEventListener('change', e => { if (active && e.target.matches('input,select')) pending = true; }, true);
  // app.js writes data-assets only after models have loaded and the new scene is ready.
  new MutationObserver(() => {
    if (active && pending && $('#loading')?.style.display === 'none') {
      pending = false; requestAnimationFrame(() => { if (active) size(false); });
    }
  }).observe($('#viewport'), {attributes:true, attributeFilter:['data-assets']});
  function refresh() {
    if (!active) return;
    const language = en() ? 'en' : 'ja';
    buttons.forEach((b, i) => setText(b, labels[language][i]));
    const dealer=!!new URLSearchParams(location.search).get('dealer');
    setText(priceLabel, dealer ? (en() ? 'Reference price' : '参考価格') : (en() ? 'Your dealer will provide a quote' : 'お見積もりは取扱店から'));
    setText(quote, en() ? 'Quote →' : '見積へ →');
    nav.setAttribute('aria-label', en() ? 'Choose a category' : '選ぶ項目');
    root.dataset.mobileElectrical = String(!$('#tab-electrical').hidden);
    root.dataset.mobileShipping = String(!$('#tab-shipping').hidden);
    const source = $('#reference-price-total');
    setText(total, dealer ? (source?.textContent.trim() || '—') : '');
    const scope = $('.price-review-total strong')?.textContent || '';
    total.setAttribute('aria-label', (scope ? scope + ' ' : '') + total.textContent);
    size(expanded);
    // Keep the whole header intact: dealer/language modules rely on its descendants.
    move($('.studio-header'), other);
    move($('.studio-maker-info'), other);
    for (const selector of ['.view-toolbar','#motion-section','.lighting-preview','.equipment-indicators','#electrical-preview','.stage-context','.gesture-hint','.shell-label']) move($(selector), other);
    move($('#studio-vehicle-compatibility'), $('#pane-vehicle'), $('#pane-vehicle').firstChild);
    const vehicleSelect = $('#studio-base-vehicle');
    if (vehicleSelect) {
      if (!vehicles.isConnected) vehicleSelect.closest('#studio-vehicle-compatibility').after(vehicles);
      for (const option of vehicleSelect.options) {
        let card = vehicleButtons.get(option.value);
        if (!card) {
          card = make('button', 'mobile-vehicle-card'); card.type = 'button';
          card.innerHTML = '<svg viewBox="0 0 160 80" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M15 58V24q0-7 8-7h91l26 23v18H15Z"/><path d="M94 18v40M25 27h57v18H25ZM103 27h12l14 14h-26Z"/><circle cx="39" cy="59" r="10" fill="white"/><circle cx="117" cy="59" r="10" fill="white"/></svg><span></span>';
          const value = option.value;
          card.addEventListener('click', () => { vehicleSelect.value = value; vehicleSelect.dispatchEvent(new Event('change', {bubbles:true})); });
          vehicleButtons.set(value, card); vehicles.append(card);
        }
        setText(card.querySelector('span'), option.textContent);
        card.disabled = vehicleSelect.disabled || option.disabled;
        card.setAttribute('aria-pressed', String(vehicleSelect.value === option.value));
      }
    }
    move($('#floor-required-notice'), scroll, scroll.firstChild);
    // Interior order on phones follows the requested floor / ceiling / wall sequence.
    move($('#floor-step'), $('#pane-interior'), $('#pane-interior').firstChild);
  }
  let scheduled = false;
  new MutationObserver(records => {
    if (!active) return;
    if (!scheduled) { scheduled = true; requestAnimationFrame(() => { scheduled = false; refresh(); }); }
  }).observe(panel, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['aria-selected']});
  document.addEventListener('click', e => {
    if (!active) return;
    const tab = e.target.closest('[data-studio-tab]');
    if (tab && !tab.disabled) {
      const key = tab.dataset.studioTab;
      select(key === 'electrical' ? 'equipment' : key === 'shipping' ? 'other' : key, true);
    }
    if (e.target.closest('#choose-required-floor')) select('interior', true);
    if (e.target.closest('#contact-edit-vehicle')) select('vehicle', true);
  });
  window.addEventListener('studio-locale-change', refresh);
  function sync() {
    if (eligible() === active) return;
    active = eligible(); root.classList.toggle('mobile-ui', active);
    if (active) {
      panel.prepend(head, nav); scroll.append(other);
      scroll.id = 'mobile-sheet-content';
      select(current, false); refresh();
    } else {
      pending = false;
      for (const [el, marker] of [...moved].reverse()) { marker.replaceWith(el); }
      moved.clear(); vehicles.remove(); head.remove(); nav.remove(); other.remove(); scroll.removeAttribute('id');
      root.classList.remove('mobile-sheet-expanded'); delete root.dataset.mobilePane; delete root.dataset.mobileElectrical; delete root.dataset.mobileShipping;
    }
  }
  width.addEventListener('change', sync); touch.addEventListener('change', sync); sync();
})();
