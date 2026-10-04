// A pre-rendered studio loop: the homepage never downloads the 3D models.
(() => {
  const root = document.querySelector('#studio-showreel');
  if (!root) return;
  const video = root.querySelector('video'), toggle = root.querySelector('button');
  const title = root.querySelector('.showreel-caption strong'), detail = root.querySelector('.showreel-caption small');
  const markers = [...root.querySelectorAll('.showreel-progress i')];
  const mobile = matchMedia('(max-width:700px)'), reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const scenes = [
    {
      "title": "ベッドを広げて、くつろぎの時間。",
      "en": "Slide out. Settle in.",
      "detail": "DX · アルミベッドの前後スライド＋後部収納",
      "detail_en": "DX · Split slide-out bed + rear storage",
      "night": false
    },
    {
      "title": "シンプルに、空間を広げる。",
      "en": "Simply more space.",
      "detail": "DX · シンプルスライドアウトベッド × バーチ",
      "detail_en": "DX · Simple slide-out bed × Birch",
      "night": false
    },
    {
      "title": "引き出せば、道具がすぐそこに。",
      "en": "Everything within reach.",
      "detail": "DX · 収納付きスライドアウトベッド × シンク",
      "detail_en": "DX · Storage slide-out bed × Sink cabinet",
      "night": false
    },
    {
      "title": "ラウンジの中に、大きな収納を。",
      "en": "A lounge with room for more.",
      "detail": "DX · フロントモジュール × ラウンジベッド",
      "detail_en": "DX · Front module × Lounge bed",
      "night": false
    },
    {
      "title": "床から、もうひとつの使い方。",
      "en": "Let the floor do more.",
      "detail": "DX · 床スライド付きラウンジベッド × ヘキサ",
      "detail_en": "DX · Lounge bed with floor slide × Hexa",
      "night": false
    },
    {
      "title": "シートも、冷蔵庫も、一緒に。",
      "en": "Seats, storage and something cool.",
      "detail": "DX · セカンドシート × アルミベッド × 冷蔵庫",
      "detail_en": "DX · Second-row seat × Aluminium bed × Fridge",
      "night": false
    },
    {
      "title": "必要なものだけ、すっきりと。",
      "en": "Just what you need.",
      "detail": "DX · シンプルベッド × シンク付きキャビネット",
      "detail_en": "DX · Simple bed × Sink-equipped cabinet",
      "night": false
    },
    {
      "title": "キッチンと収納を、ひとつの空間に。",
      "en": "Cook, store and make yourself at home.",
      "detail": "DX · アルミフロント × 収納付きスライドベッド",
      "detail_en": "DX · Aluminium front module × Storage slide-out bed",
      "night": false
    },
    {
      "title": "Super GLも、自由に組み合わせる。",
      "en": "Make Super GL your own.",
      "detail": "Super GL · TWIクリア天井 × アルミ家具",
      "detail_en": "Super GL · TWI clear ceiling × Aluminium furniture",
      "night": false
    },
    {
      "title": "木の色で、雰囲気まで変える。",
      "en": "A different grain. A different mood.",
      "detail": "Super GL · TWIウォールナット天井 × ラウンジ",
      "detail_en": "Super GL · TWI walnut ceiling × Lounge layout",
      "night": false
    },
    {
      "title": "灯りが広がる、夜の一台。",
      "en": "A warm welcome after dark.",
      "detail": "DX · 天井ダウンライト＋バックドアライト",
      "detail_en": "DX · Ceiling downlights + Tailgate lights",
      "night": true
    },
    {
      "title": "外から眺める、くつろぎの明かり。",
      "en": "Your space, glowing from within.",
      "detail": "Super GL · バーライト＋間接照明＋バックドアライト",
      "detail_en": "Super GL · Bar lights + Indirect glow + Tailgate lights",
      "night": true
    }
  ];
  const step = 5, transition = .5, duration = 60;
  let visible = false, pausedByUser = false, explicitPlay = false, failed = false, generation = 0;
  video.muted = true;
  toggle.hidden = false;
  const en = () => document.documentElement.lang === 'en';
  const automatic = () => explicitPlay || (!reduced.matches && !navigator.connection?.saveData);
  function update() {
    const time = video.currentTime || 0;
    const index = time >= duration - transition / 2 ? 0 : Math.max(0, Math.min(scenes.length - 1, Math.floor((time - transition / 2) / step)));
    const scene = scenes[index];
    for (const [element,ja,english] of [[title,scene.title,scene.en],[detail,scene.detail,scene.detail_en]]) {
      element.dataset.ja = ja; element.dataset.en = english;
      const text = en() ? english : ja;
      if (element.textContent !== text) element.textContent = text;
    }
    markers.forEach((marker,i) => marker.classList.toggle('active',i === index));
    root.classList.toggle('showreel-night',scene.night);
    root.classList.toggle('is-playing',!video.paused);
    root.dataset.scene = String(index + 1);
    toggle.setAttribute('aria-label',video.paused ? (en() ? 'Play preview' : '映像を再生') : (en() ? 'Pause preview' : '映像を一時停止'));
  }
  async function sync() {
    const ticket = ++generation;
    if (failed || !visible || document.hidden || pausedByUser || !automatic()) { video.pause(); update(); return; }
    const source = mobile.matches ? video.dataset.mobile : video.dataset.desktop;
    if (video.getAttribute('src') !== source) {
      const time = video.currentTime || 0;
      video.pause(); root.classList.remove('is-ready');
      video.src = source;
      video.onloadedmetadata = () => { video.currentTime = Math.min(time, Math.max(0, video.duration - .05)); };
      video.load();
    }
    try { await video.play(); if (ticket !== generation && (!visible || pausedByUser || document.hidden || !automatic())) video.pause(); }
    catch { /* The poster and Play button remain usable when autoplay is blocked. */ }
    update();
  }
  toggle.addEventListener('click',() => {
    if (video.paused) { pausedByUser = false; explicitPlay = true; sync(); }
    else { pausedByUser = true; sync(); }
  });
  video.addEventListener('loadeddata',() => root.classList.add('is-ready'));
  video.addEventListener('error',() => { failed = true; video.pause(); root.classList.remove('is-ready'); toggle.hidden = true; video.removeAttribute('src'); update(); });
  for (const event of ['timeupdate','play','pause','seeked']) video.addEventListener(event,update);
  document.addEventListener('hexa:language',update);
  document.addEventListener('visibilitychange',sync);
  mobile.addEventListener('change',sync);
  reduced.addEventListener('change',() => { explicitPlay = false; sync(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .12;
    sync();
  }, {threshold:[0,.12]}).observe(root);
  else { visible = true; sync(); }
  update();
})();
