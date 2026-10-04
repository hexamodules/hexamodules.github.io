// Static preview: no save/PDF server is connected.
const en = () => document.documentElement.lang === 'en';
export function createLayoutSaveAction() {
 const button = document.querySelector('#outro-contact');
 const status = document.createElement('p');
 status.id = 'outro-save-status'; status.className = 'outro-save-status';
 status.setAttribute('role', 'status'); status.setAttribute('data-module-i18n', '');
 const link = document.createElement('a');
 link.href = '../contact.html'; link.className = 'module-link';
 link.id = 'public-contact-link'; link.setAttribute('data-module-i18n', '');
 button.after(status, link);
 function labels() {
  button.querySelector('span').textContent = en() ? 'PDF export is being prepared' : 'PDF保存は準備中';
  button.setAttribute('aria-disabled', 'true'); button.disabled = true;
  status.textContent = en() ? 'PDF export is being prepared.' : '参考見積書のPDF保存は準備中です。';
  link.textContent = en() ? 'Contact →' : 'お問い合わせ →';
  link.href = '../contact.html?lang=' + (en() ? 'en' : 'ja');
 }
 button.setAttribute('data-module-i18n', ''); button.onclick = event => event.preventDefault();
 new MutationObserver(() => { if (!button.disabled) button.disabled = true; }).observe(button, {attributes:true, attributeFilter:['disabled']});
 window.addEventListener('studio-locale-change', () => queueMicrotask(labels)); labels();
}
export function initLayoutRecall() {
 const panel = document.createElement('p');
 panel.id = 'saved-layout-recall'; panel.setAttribute('data-module-i18n', '');
 function labels() { panel.textContent = en() ? 'Saved layout recall is being prepared.' : '保存したレイアウトの呼び出しは準備中です。'; }
 document.querySelector('.configuration-heading').after(panel);
 window.addEventListener('studio-locale-change', labels); labels();
}
