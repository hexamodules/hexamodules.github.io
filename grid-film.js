// Load YouTube only when the visitor chooses to watch; keep a usable link on failure.
(() => {
  const poster = document.querySelector('#grid-film-play');
  if (!poster) return;
  const host = poster.closest('.grid-film-player');
  const status = document.querySelector('#grid-film-status');
  let player, pending = false, failed = false, timer;
  const english = () => document.documentElement.lang === 'en';
  function message(ja, en) {
    status.dataset.ja = ja; status.dataset.en = en;
    status.textContent = english() ? en : ja;
    status.hidden = false;
  }
  function updateTitle() {
    const frame = host.querySelector('iframe');
    if (frame) frame.title = english()
      ? 'Grid. video tour by Mirumiru Land (Japanese)'
      : 'みるみるランドによるGrid.紹介動画';
  }
  function fallback() {
    clearTimeout(timer);
    pending = false; failed = true;
    player?.destroy();
    host.querySelector('#grid-film-player')?.remove();
    poster.hidden = false;
    poster.removeAttribute('aria-busy');
    poster.removeAttribute('role');
    poster.removeAttribute('aria-controls');
    poster.dataset.jaLabel = 'YouTubeでGrid.の紹介動画を見る';
    poster.dataset.enLabel = 'Watch the Grid. video tour on YouTube';
    poster.setAttribute('aria-label', english() ? poster.dataset.enLabel : poster.dataset.jaLabel);
    message('動画を読み込めませんでした。画像または下のリンクからYouTubeでご覧いただけます。',
      'The video could not load. Select the image or the link below to watch on YouTube.');
  }
  function loadAPI() {
    if (window.YT?.Player) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { previous?.(); resolve(); };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.referrerPolicy = 'strict-origin-when-cross-origin';
      script.onerror = reject;
      document.head.append(script);
    });
  }
  poster.setAttribute('role', 'button');
  poster.setAttribute('aria-controls', 'grid-film-player');
  poster.addEventListener('keydown', event => {
    if (!failed && event.key === ' ') { event.preventDefault(); poster.click(); }
  });
  poster.addEventListener('click', async event => {
    if (failed || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (pending || player) return;
    pending = true;
    poster.setAttribute('aria-busy', 'true');
    message('動画を読み込んでいます…', 'Loading video…');
    timer = setTimeout(fallback, 15000);
    try {
      await loadAPI();
      if (failed) return;
      const frame = document.createElement('iframe');
      frame.id = 'grid-film-player';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.src = 'https://www.youtube.com/embed/73lkuTXlYag?' + new URLSearchParams({
        enablejsapi: '1', autoplay: '1', playsinline: '1', rel: '0',
        origin: location.origin, hl: english() ? 'en' : 'ja'
      });
      host.append(frame);
      updateTitle();
      player = new YT.Player(frame, {events: {
        onReady: event => {
          if (failed) return;
          clearTimeout(timer); pending = false;
          poster.hidden = true; poster.removeAttribute('aria-busy');
          status.hidden = true;
          event.target.playVideo(); frame.focus();
        },
        onError: fallback
      }});
    } catch { fallback(); }
  });
  document.addEventListener('hexa:language', updateTitle);
})();
