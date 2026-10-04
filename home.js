// The homepage is deliberately independent of the 3D runtime.
(() => {
  const query = new URLSearchParams(location.search);
  let legacyStudioUrl = null;
  // Keep older configuration links that used the site's root URL working.
  if (document.body.dataset.page === 'home' && ['front','bed','cab','finish','wall','panel','ceiling','floor','electrical','ac','heater'].some(key => query.has(key))) {
    legacyStudioUrl = 'layouts/' + location.search + location.hash;
    window.open(legacyStudioUrl, '_blank', 'noopener');
  }
  // Existing links to vehicle sections now belong to Hexa Camper Modules.
  if (!legacyStudioUrl && document.body.dataset.page === 'home' && ['#studio','#grid','#faq'].includes(location.hash)) {
    location.replace('camper.html' + location.search + location.hash);
    return;
  }
  const preferenceKey = 'hexa-studio-locale';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(preferenceKey)) || {}; } catch {}
  const explicitPlace = ['jp','au'].includes(query.get('location'));
  const place = explicitPlace ? query.get('location') : ['jp','au'].includes(saved.location) ? saved.location : 'jp';
  let language = ['ja','en'].includes(query.get('lang')) ? query.get('lang') : explicitPlace ? (place === 'au' ? 'en' : 'ja') : ['ja','en'].includes(saved.language) ? saved.language : place === 'au' ? 'en' : 'ja';
  function render() {
    document.documentElement.lang = language;
    document.querySelectorAll('[data-ja][data-en]').forEach(el => { el.textContent = el.dataset[language]; });
    for (const [attr,key] of [['alt','Alt'],['aria-label','Label']]) {
      document.querySelectorAll('[data-ja-' + key.toLowerCase() + ']').forEach(el => { el.setAttribute(attr,el.dataset[language + key]); });
    }
    document.querySelectorAll('[data-lang]').forEach(el => el.setAttribute('aria-pressed',String(el.dataset.lang === language)));
    document.querySelectorAll('[data-studio]').forEach(el => { el.href = 'layouts/?' + new URLSearchParams({location:place,lang:language}); });
    document.querySelectorAll('[data-film]').forEach(el => { el.href = language === 'en' ? 'tutorial/desktop-au-90s/' : 'tutorial/showcase-90s/'; });
    document.querySelectorAll('[data-page-link]').forEach(el => {
      const url = new URL(el.getAttribute('href'),location.href);
      url.searchParams.set('location',place);
      url.searchParams.set('lang',language);
      el.href = url.pathname + url.search + url.hash;
    });
    // Keep a user-clickable fallback if the browser blocks the legacy popup.
    if (legacyStudioUrl) document.querySelectorAll('a.preview-link').forEach(el => { el.href = legacyStudioUrl; });
    const description = document.querySelector('meta[name="description"]');
    if (description?.dataset[language === 'ja' ? 'descJa' : 'descEn']) description.content = description.dataset[language === 'ja' ? 'descJa' : 'descEn'];
    const title = document.querySelector('title');
    if (title?.dataset[language]) title.textContent = title.dataset[language];
    try { localStorage.setItem(preferenceKey,JSON.stringify({...saved,location:place,language})); } catch {}
    document.dispatchEvent(new CustomEvent('hexa:language',{detail:{language}}));
  }
  document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click',() => {
    language = button.dataset.lang;
    const url = new URL(location.href);
    url.searchParams.set('lang',language);
    history.replaceState(null,'',url.pathname + url.search + url.hash);
    render();
  }));
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
  render();
})();
