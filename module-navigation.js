// Keep the visitor's market and language when leaving the Japanese catalogue.
(() => {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('hexa-studio-locale') || '{}') || {}; } catch {}
  const links = [...document.querySelectorAll('a[href]')].map(link => ({link, href:link.getAttribute('href')}));
  function updateLinks() {
    const params = new URLSearchParams(location.search);
    const market = params.get('location') || saved.location;
    const language = params.get('lang') || saved.language;
    document.documentElement.lang = language === 'en' ? 'en' : 'ja';
    document.querySelectorAll('[data-ja][data-en]').forEach(label => {
      label.textContent = label.dataset[language === 'en' ? 'en' : 'ja'];
    });
    document.querySelectorAll('[data-ja-alt][data-en-alt]').forEach(image => {
      image.alt = image.dataset[language === 'en' ? 'enAlt' : 'jaAlt'];
    });
    for (const {link, href} of links) {
      if (href.startsWith('#')) continue;
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) continue;
      if (['jp', 'au'].includes(market)) url.searchParams.set('location', market);
      if (['ja', 'en'].includes(language)) url.searchParams.set('lang', language);
      if (['black', 'birch'].includes(params.get('finish')) && (link.matches('.next,.card') || url.pathname.endsWith('/layouts/'))) {
        url.searchParams.set('finish', params.get('finish'));
      }
      link.href = url.pathname + url.search + url.hash;
    }
  }
  updateLinks();
  document.addEventListener('hexa:module-finish', updateLinks);
})();
