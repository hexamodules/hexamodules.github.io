(() => {
  const videos = [...document.querySelectorAll('[data-series-video]')];
  if (!videos.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'ja';
  for (const video of videos) {
    const series = video.dataset.seriesVideo;
    const preview = video.dataset.videoMode === 'preview';
    const collections = { display: ['kiosk-collection-v1', 'Hexa Kiosk'], office: ['office-collection-v2', 'Hexa Office'], configurator: ['configurator-service-v1', '3D Sales Configurator'] };
    const [collection, label] = collections[series];
    const section = video.closest('[data-film-section]');
    const toggle = section.querySelector('.display-preview-toggle');
    const fallback = section.querySelector('[data-film-fallback]');
    const source = (lang, thumbnail = false) => `assets/series-films/${collection}-${lang}${thumbnail ? '.jpg' : (preview ? '-web' : '') + '.mp4'}`;
    let visible = !preview, manuallyPaused = false, explicitPlay = false;
    let selectedLanguage = language(), pending = null, generation = 0, objectUrl = null, loaded = false, controller;
    const allowed = () => visible && !document.hidden && !manuallyPaused && (!reduced.matches || explicitPlay);
    function status() {
      if (!toggle) return;
      toggle.classList.toggle('is-playing', !video.paused);
      toggle.setAttribute('aria-label', `${label}: ${language() === 'ja' ? (video.paused ? '動画を再生' : '動画を一時停止') : (video.paused ? 'Play video' : 'Pause video')}`);
    }
    function load(position = 0) {
      if (pending) return pending;
      loaded = true;
      const token = ++generation, lang = selectedLanguage;
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      pending = (async () => {
        // Blob media also supports seeking and looping on the local preview server,
        // which does not implement byte-range responses. Only visible previews load.
        const response = await fetch(source(lang), { signal });
        if (!response.ok) throw Error('Video unavailable');
        const blob = await response.blob();
        if (token !== generation) return false;
        const address = URL.createObjectURL(blob), previous = objectUrl;
        objectUrl = address;
        const ready = new Promise((resolve, reject) => {
          const cleanup = () => { video.removeEventListener('loadedmetadata', success); video.removeEventListener('error', failure); signal.removeEventListener('abort', failure); };
          const success = () => { cleanup(); resolve(); };
          const failure = () => { cleanup(); reject(Error('Media interrupted')); };
          video.addEventListener('loadedmetadata', success, { once: true });
          video.addEventListener('error', failure, { once: true });
          signal.addEventListener('abort', failure, { once: true });
        });
        video.src = address; video.dataset.activeLanguage = lang; video.load();
        if (previous) URL.revokeObjectURL(previous);
        await ready;
        if (token !== generation) return false;
        if (position > 0) video.currentTime = Math.min(position, Math.max(0, video.duration - .05));
        if (fallback) fallback.hidden = true;
        return true;
      })().catch(() => {
        if (token === generation && !signal.aborted) {
          pending = null;
          if (fallback) fallback.hidden = false;
          status();
        }
        return false;
      });
      return pending;
    }
    async function play() {
      if (!await load()) return;
      if (preview && !allowed()) return;
      video.play().catch(status);
    }
    function auto() {
      if (!preview) return;
      video.autoplay = allowed();
      if (allowed()) play(); else video.pause();
    }
    async function setLanguage() {
      const next = language();
      video.poster = source(next, true);
      if (fallback) fallback.querySelector('a').href = source(next);
      if (next !== selectedLanguage) {
        const playing = !video.paused, position = video.currentTime || 0;
        selectedLanguage = next; generation++; controller?.abort(); pending = null;
        if (loaded && await load(position)) {
          if (preview) auto(); else if (playing) play();
        }
      }
      status();
    }
    if (preview) {
      video.muted = true; video.defaultMuted = true; video.loop = true; video.playsInline = true;
      toggle.hidden = false;
      toggle.addEventListener('click', () => {
        if (allowed()) manuallyPaused = true;
        else { manuallyPaused = false; explicitPlay = true; }
        auto(); status();
      });
      new IntersectionObserver(entries => { visible = entries[0].isIntersecting; auto(); }, { threshold: .12 }).observe(video);
      document.addEventListener('visibilitychange', auto);
      reduced.addEventListener('change', auto);
    } else {
      load();
      const chapters = [...section.querySelectorAll('[data-film-chapter]')];
      function highlight() {
        let active = -1;
        chapters.forEach((button, i) => { if (video.currentTime >= Number(button.dataset.filmChapter)) active = i; });
        chapters.forEach((button, i) => button.setAttribute('aria-current', String(i === active)));
      }
      for (const button of chapters) button.addEventListener('click', async () => {
        if (!await load()) return;
        video.currentTime = Number(button.dataset.filmChapter);
        play(); highlight();
        video.scrollIntoView({ block: 'center', behavior: reduced.matches ? 'instant' : 'smooth' });
      });
      video.addEventListener('timeupdate', highlight); highlight();
    }
    video.addEventListener('play', status); video.addEventListener('pause', status);
    document.addEventListener('hexa:language', setLanguage);
    setLanguage();
  }
})();
