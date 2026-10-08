// Synchronise head metadata with the site's existing language renderers.
(() => {
  const update = () => {
    const language = document.documentElement.lang === 'en' ? 'en' : 'ja';
    const title = document.querySelector('title[data-ja][data-en]');
    if (title && title.textContent !== title.dataset[language]) title.textContent = title.dataset[language];
    document.head.querySelectorAll('meta[data-ja][data-en]').forEach(meta => {
      const value = meta.dataset[language];
      if (meta.content !== value) meta.content = value;
    });
    const data = document.getElementById('seo-data');
    const target = document.getElementById('seo-jsonld');
    if (data && target) {
      const value = JSON.stringify(JSON.parse(data.textContent)[language]);
      if (target.textContent !== value) target.textContent = value;
    }
  };
  document.addEventListener('hexa:language', update);
  window.addEventListener('studio-locale-change', update);
  document.addEventListener('hexa:module-finish', update);
  new MutationObserver(update).observe(document.documentElement, {attributes:true, attributeFilter:['lang']});
  update();
})();
