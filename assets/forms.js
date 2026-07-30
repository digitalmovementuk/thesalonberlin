/* The Salon Berlin — form delivery + thank-you dialog.
 *
 * The site is static (GitHub Pages), so there is no backend to post to.
 * Submissions go through FormSubmit, which relays them straight to
 * Fabian's inbox. No account, no key, no monthly cost.
 *
 * ACTIVATION: the very first submission to a new address makes FormSubmit
 * send a one-time confirmation mail to that address. Until the link in it
 * is clicked, nothing is delivered. This needs doing once, by hand.
 *
 * Any form marked data-salon-form is handled here. Per-form dialog copy
 * comes from data-thanks-title / data-thanks-body.
 */
(function () {
  'use strict';

  var INBOX    = 'fabianpianka@hotmail.com';
  var ENDPOINT = 'https://formsubmit.co/ajax/' + INBOX;
  var FALLBACK = 'mailto:fabian@thesalonberlin.de';

  var forms = document.querySelectorAll('[data-salon-form]');
  if (!forms.length) return;

  /* ---------- the dialog, built once and reused ---------- */

  var modal, panel, elTitle, elBody, elEyebrow, elMeta, lastFocus;

  function build() {
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.hidden = true;
    modal.innerHTML =
      '<div class="modal__scrim" data-close></div>' +
      '<div class="modal__panel" role="dialog" aria-modal="true" aria-labelledby="modalTitle" tabindex="-1">' +
        '<button class="modal__close" type="button" data-close aria-label="Close">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
        '<div class="modal__mark">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5.2 5.2L20 7"/></svg>' +
        '</div>' +
        '<span class="modal__eyebrow"></span>' +
        '<h2 class="modal__title" id="modalTitle"></h2>' +
        '<p class="modal__body"></p>' +
        '<hr class="modal__rule">' +
        '<p class="modal__meta"></p>' +
        '<div class="modal__actions">' +
          '<button class="btn" type="button" data-close>Close</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);

    panel     = modal.querySelector('.modal__panel');
    elEyebrow = modal.querySelector('.modal__eyebrow');
    elTitle   = modal.querySelector('.modal__title');
    elBody    = modal.querySelector('.modal__body');
    elMeta    = modal.querySelector('.modal__meta');

    modal.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key === 'Tab') trapTab(e);
    });
  }

  function trapTab(e) {
    var f = panel.querySelectorAll('button, [href], input, select, textarea');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function open(opts) {
    if (!modal) build();
    elEyebrow.textContent = opts.eyebrow;
    elTitle.textContent   = opts.title;
    elBody.innerHTML      = opts.body;
    elMeta.textContent    = opts.meta;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    // focus the panel, not the button: focusing the button paints Chrome's
    // default blue ring the instant the dialog opens, which is off-palette.
    panel.focus();
  }

  function close() {
    modal.hidden = true;
    document.body.classList.remove('modal-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- submission ---------- */

  function wire(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var btn  = form.querySelector('[type="submit"]');
      var was  = btn ? btn.textContent : '';
      var old  = form.querySelector('.form-error');
      if (old) old.remove();
      if (btn) { btn.classList.add('is-sending'); btn.textContent = 'Sending…'; }

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function () {
          form.reset();
          open({
            eyebrow: form.dataset.thanksEyebrow || 'Message sent',
            title:   form.dataset.thanksTitle   || 'Thank you.',
            body:    form.dataset.thanksBody    || 'We have your message.',
            meta:    form.dataset.thanksMeta    || 'The Salon Berlin'
          });
        })
        .catch(function () {
          var p = document.createElement('p');
          p.className = 'form-error';
          p.setAttribute('role', 'alert');
          p.innerHTML = 'That didn’t send — something blocked the connection. ' +
                        'Please write to <a href="' + FALLBACK + '">fabian@thesalonberlin.de</a> ' +
                        'or use WhatsApp, and we’ll pick it up from there.';
          form.appendChild(p);
        })
        .finally(function () {
          if (btn) { btn.classList.remove('is-sending'); btn.textContent = was; }
        });
    });
  }

  Array.prototype.forEach.call(forms, wire);
})();
