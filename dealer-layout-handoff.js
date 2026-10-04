// Static preview: retain the supplied layout number without linking to the local API.
(() => {
 const number = new URLSearchParams(location.search).get('layout_number');
 if (!/^HX-[A-F0-9]{8}-[A-F0-9]{8}$/.test(number || '')) return;
 const box = document.createElement('aside');
 box.style.cssText = 'padding:18px 22px;border:1px solid #c3cfb8;border-radius:6px;margin:25px 0;font-size:13px';
 const label = document.createElement('p'), status = document.createElement('p');
 const update = () => {
  const en = document.documentElement.lang === 'en';
  label.textContent = (en ? 'Saved layout: ' : '保存したレイアウト：') + number;
  status.textContent = en ? 'Saved estimate viewing is being prepared.' : '保存した参考見積書の表示は準備中です。';
 };
 box.append(label, status); document.querySelector('.page-intro').append(box);
 document.addEventListener('hexa:language', update); update();
})();
