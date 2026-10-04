(() => {
  const video = document.querySelector('.studio-tutorial');
  if (!video) return;
  function update() {
    const lang = document.documentElement.lang === 'en' ? 'en' : 'ja';
    const src = video.dataset[lang + 'Src'];
    if (video.getAttribute('src') === src) return;
    video.pause();
    video.poster = video.dataset[lang + 'Poster'];
    video.setAttribute('src', src);
    video.load();
  }
  document.addEventListener('hexa:language', update);
  update();
})();
