// This form prepares a user-reviewed email; no message is sent by the website.
(() => {
  if(new URLSearchParams(location.search).get('topic')==='grid'){const url=new URL('grid.html',location.href);for(const key of ['lang','location']){const value=new URLSearchParams(location.search).get(key);if(value)url.searchParams.set(key,value);}url.hash='grid-enquiry';location.replace(url.href);return;}
  const CONTACT_EMAIL = 'info@hexamodules.com';
  document.querySelectorAll('[data-contact-email]').forEach(link => {
    link.href = 'mailto:' + CONTACT_EMAIL;
    if (link.classList.contains('contact-email')) link.textContent = CONTACT_EMAIL;
  });
  const form = document.querySelector('#contact-form');
  if (!form) return;
  const review = document.querySelector('#contact-review');
  const draft = document.querySelector('#contact-draft');
  const mail = document.querySelector('#contact-mail');
  const status = document.querySelector('#contact-status');
  const ja = () => document.documentElement.lang === 'ja';
  const topic = new URLSearchParams(location.search).get('topic');
  if (['products','partner','configurator','other'].includes(topic)) form.elements.topic.value = topic;

  const serviceHelp = document.querySelector('#configurator-contact-help');
  const updateTopic = () => { serviceHelp.hidden = form.elements.topic.value !== 'configurator'; };
  form.elements.topic.addEventListener('change', updateTopic);
  updateTopic();

  function prepare() {
    const data = new FormData(form);
    const subject = 'Hexa — ' + form.elements.topic.selectedOptions[0].textContent;
    const content = [
      ...(data.get('company').trim() ? [`${ja() ? '会社・ブランド名' : 'Company / brand'}: ${data.get('company').trim()}`] : []),
      `${ja() ? 'お名前' : 'Name'}: ${data.get('name').trim()}`,
      `Email: ${data.get('email').trim()}`,
      ...(data.get('phone').trim() ? [`${ja() ? '電話番号' : 'Phone'}: ${data.get('phone').trim()}`] : []),
      '', data.get('message').trim()
    ].join('\n');
    draft.value = subject + '\n\n' + content;
    mail.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(content);
    status.textContent = '';
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    for (const field of [form.elements.name,form.elements.message]) {
      field.setCustomValidity(field.value.trim() ? '' : ja() ? '入力してください。' : 'Please complete this field.');
    }
    if (!form.reportValidity()) return;
    prepare();
    review.hidden = false;
    document.querySelector('#review-title').focus({preventScroll:true});
    review.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',block:'start'});
  });
  form.addEventListener('input', event => {
    if (event.target.setCustomValidity) event.target.setCustomValidity('');
    review.hidden = true;
    draft.value = '';
    mail.href = 'mailto:' + CONTACT_EMAIL;
    status.textContent = '';
  });
  document.addEventListener('hexa:language', () => { if (!review.hidden) prepare(); });
  document.querySelector('#copy-contact').addEventListener('click',async () => {
    try {
      await navigator.clipboard.writeText(draft.value);
      status.textContent = ja() ? 'コピーしました。メールに貼り付けてお送りください。' : 'Copied. Paste it into an email and send.';
    } catch {
      draft.focus(); draft.select();
      status.textContent = ja() ? '内容を選択しました。コピーしてお使いください。' : 'Message selected. Copy it into an email to send.';
    }
  });
})();
