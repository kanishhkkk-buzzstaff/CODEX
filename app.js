/* =========================================================
   Scam Registry — app logic
   All data is kept in the browser (localStorage) for the demo.
   ========================================================= */
(() => {
  'use strict';

  /* ================= Settings ================= */
  const RULES = {
    limitDays: 7,        // one report per person per ID every 7 days
    scope: 'perId',      // 'perId' or 'global' (once a week in total)
    windowDays: 30,      // only communication received in the last 30 days
    maxFiles: 3,
    maxFileMB: 5
  };

  const MEDIA = [
    { id: 'call', label: 'Phone call', icon: 'M6 3h3l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z' },
    { id: 'sms', label: 'SMS', icon: 'M4 5h16v11H9l-5 4z' },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z' },
    { id: 'telegram', label: 'Telegram', icon: 'M21 4 3 11l6 2 2 6 3-4 5 4z' },
    { id: 'email', label: 'Email', icon: 'M3 6h18v12H3zM3 6l9 7 9-7' },
    { id: 'social', label: 'Social media', icon: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20a6 6 0 0 1 12 0M17 11a2.5 2.5 0 1 0 0-5M16 14a5 5 0 0 1 6 6' },
    { id: 'website', label: 'Website or app', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18' },
    { id: 'other', label: 'Other', icon: 'M6 12h.01M12 12h.01M18 12h.01' }
  ];
  const MEDIA_LABEL = Object.fromEntries(MEDIA.map(m => [m.id, m.label]));
  const CALL_MEDIA = ['call', 'whatsapp', 'telegram'];

  const CATS = ['Digital arrest / fake police', 'KYC / bank account block', 'SIM disconnection threat', 'Courier / parcel scam',
    'Electricity bill threat', 'Fake job / task', 'Investment / trading', 'Lottery / prize', 'Loan app',
    'Fake customer care', 'OLX / marketplace', 'Sextortion / blackmail', 'Phishing link', 'Other'];

  const TYPES = ['Phone', 'UPI', 'Link', 'Email'];
  const TYPE_LABEL = { Phone: 'Phone number', UPI: 'UPI ID', Link: 'Link', Email: 'Email' };
  const TYPE_COLOR = { Phone: 'var(--c-phone)', UPI: 'var(--c-upi)', Link: 'var(--c-link)', Email: '#8a6a45' };
  const CALLTYPE_LABEL = { domestic: 'Indian number', international: 'International number', spoofed: 'Spoofed +91 (from abroad)' };

  // Country codes for showing where an international number is from
  const CC = { '1': 'USA / Canada', '7': 'Russia / Kazakhstan', '20': 'Egypt', '27': 'South Africa', '33': 'France', '44': 'United Kingdom',
    '49': 'Germany', '60': 'Malaysia', '61': 'Australia', '62': 'Indonesia', '63': 'Philippines', '65': 'Singapore', '66': 'Thailand',
    '81': 'Japan', '82': 'South Korea', '84': 'Vietnam', '86': 'China', '90': 'Turkey', '92': 'Pakistan', '93': 'Afghanistan',
    '94': 'Sri Lanka', '95': 'Myanmar', '98': 'Iran', '234': 'Nigeria', '254': 'Kenya', '855': 'Cambodia', '856': 'Laos',
    '880': 'Bangladesh', '965': 'Kuwait', '966': 'Saudi Arabia', '968': 'Oman', '971': 'UAE', '973': 'Bahrain', '974': 'Qatar', '977': 'Nepal' };

  const KEY = 'scamreg_v3', UKEY = 'scamreg_user';
  const DAY = 864e5;

  /* ================= Helpers ================= */
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { } }
  };
  let memReports = null;
  const load = () => store.get(KEY, null) || memReports || [];
  const save = r => { memReports = r; return store.set(KEY, r); };
  let user = store.get(UKEY, null);

  const dayStart = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const daysAgo = t => Math.round((dayStart(Date.now()) - dayStart(t)) / DAY);
  const localISO = t => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const fromISO = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  const fmtDate = t => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtShort = t => new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const fmtTime = t => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  function ago(t) {
    const mins = Math.floor((Date.now() - t) / 6e4);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    const d = daysAgo(t);
    if (d === 0) return 'today, ' + fmtTime(t);
    if (d === 1) return 'yesterday, ' + fmtTime(t);
    return d + ' days ago';
  }
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const svgIcon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

  let toastTimer;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 2800);
  }

  /* ================= Normalize input ================= */
  // Different spellings of the same ID become one key.
  function splitCC(d) {
    for (const len of [3, 2, 1]) if (CC[d.slice(0, len)]) return { cc: d.slice(0, len), rest: d.slice(len), country: CC[d.slice(0, len)] };
    return { cc: '', rest: d, country: 'Unknown country' };
  }
  function normalize(raw) {
    let s = String(raw || '').trim();
    if (!s) return null;
    s = s.replace(/hxxp/ig, 'http').replace(/\[\.\]|\(dot\)|\[dot\]/ig, '.');   // un-defang links
    const low = s.toLowerCase().replace(/\s+/g, '');

    // UPI ID: name@bank (no dot after @)
    if (/^[a-z0-9._-]{2,}@[a-z][a-z0-9]{1,}$/.test(low)) return { type: 'UPI', key: low, show: low };
    // Email address
    if (/^[a-z0-9._%+-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(low)) return { type: 'Email', key: low, show: low };

    // Phone numbers (Indian or international)
    if (/^[+\d\s().\-]+$/.test(s)) {
      let d = s.replace(/\D/g, '');
      const plus = /^\s*\+/.test(s) || d.startsWith('00');
      if (d.startsWith('00')) d = d.slice(2);
      // Indian
      let ind = d;
      if (ind.length === 12 && ind.startsWith('91')) ind = ind.slice(2);
      else if (!plus && ind.length === 11 && ind.startsWith('0')) ind = ind.slice(1);
      if ((!plus || d.startsWith('91')) && /^[6-9]\d{9}$/.test(ind)) {
        return { type: 'Phone', intl: false, key: ind, show: '+91 ' + ind.slice(0, 5) + ' ' + ind.slice(5), country: 'India' };
      }
      // International (needs + or 00 in front)
      if (plus && d.length >= 8 && d.length <= 15 && !d.startsWith('91')) {
        const p = splitCC(d);
        return { type: 'Phone', intl: true, key: '+' + d, show: '+' + (p.cc ? p.cc + ' ' + p.rest : d), country: p.country };
      }
      if (plus && d.startsWith('91')) return { err: 'Indian numbers have 10 digits after +91, starting with 6–9.' };
      if (!plus && d.length > 10) return { err: 'For an international number, start with + and the country code, e.g. +44 7700 900461.' };
      return { err: 'Indian mobile numbers have 10 digits starting with 6–9.' };
    }

    // Link: drop scheme, www, ?query, #hash and trailing slash
    if (/[a-z0-9]\.[a-z]/i.test(low)) {
      let u = low.replace(/^[a-z]+:\/\//, '').replace(/^www\./, '');
      u = u.split('#')[0].split('?')[0].replace(/\/+$/, '');
      if (!/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/.test(u)) return { err: "That doesn't look like a valid link." };
      return { type: 'Link', key: u, show: u };
    }
    return { err: 'Type a phone number, UPI ID (name@bank), email or link.' };
  }
  const phoneKey = p => { const n = normalize(p); return n && n.type === 'Phone' && !n.intl ? n.key : null; };
  const kindText = n => n.type === 'Phone' ? (n.intl ? 'International number · ' + n.country : 'Mobile number · India') : TYPE_LABEL[n.type];

  /* ================= Demo data ================= */
  function seed() {
    const now = Date.now(), out = [];
    // [value, category, medium, count, newestDaysAgo, callType]
    const plan = [
      ['+91 98765 43210', 'SIM disconnection threat', 'call', 34, 0],
      ['indiapost-redelivery.top/track', 'Courier / parcel scam', 'sms', 23, 0],
      ['http://sbi-kyc-update.in/login?id=77', 'KYC / bank account block', 'sms', 27, 0],
      ['+44 7700 900461', 'Digital arrest / fake police', 'whatsapp', 19, 0],
      ['refund.help@ybl', 'Fake customer care', 'call', 21, 1],
      ['09123456780', 'Fake job / task', 'whatsapp', 15, 2],
      ['+91 90000 12345', 'Courier / parcel scam', 'call', 12, 0, 'spoofed'],
      ['+1 555 010 4477', 'Investment / trading', 'whatsapp', 9, 1],
      ['bit.ly/free-iphone-26', 'Phishing link', 'social', 12, 3],
      ['winner.kbc2026@paytm', 'Lottery / prize', 'whatsapp', 9, 5],
      ['tradeguru-profits.com', 'Investment / trading', 'telegram', 8, 1],
      ['support@amazon-refund-desk.com', 'Fake customer care', 'email', 6, 2],
      ['7001122334', 'Loan app', 'sms', 6, 8],
      ['quickloan.cash@axl', 'Loan app', 'website', 4, 12]
    ];
    let u = 1;
    for (const [v, cat, med, n, newest, ct] of plan) {
      const k = normalize(v);
      for (let i = 0; i < n; i++) {
        const age = i === 0 ? newest : newest + Math.floor(Math.pow(Math.random(), 1.3) * (29 - newest));
        let ts = dayStart(now) - age * DAY + Math.floor(Math.random() * DAY);
        if (ts > now) ts = now - Math.floor(Math.random() * 3 * 36e5);
        const happened = Math.max(ts - Math.floor(Math.random() * 4) * DAY, dayStart(now) - 29 * DAY);
        const r = Math.random();
        out.push({
          key: k.key, type: k.type, show: k.show, intl: !!k.intl, country: k.country || '',
          cat: r < .82 ? cat : CATS[Math.floor(Math.random() * CATS.length)],
          medium: r < .85 ? med : MEDIA[Math.floor(Math.random() * 3)].id,
          callType: k.type === 'Phone' ? (k.intl ? 'international' : (ct || (Math.random() < .08 ? 'spoofed' : 'domestic'))) : '',
          note: '', user: 'demo' + (u++), ts, incident: localISO(happened),
          files: Math.random() < .35 ? [{ name: 'screenshot.jpg', type: 'image/jpeg', size: 120000, data: null }] : []
        });
      }
    }
    return out;
  }
  if (!load().length) save(seed());

  /* ================= Aggregation ================= */
  const countBy = (arr, fn) => { const m = {}; arr.forEach(x => { const k = fn(x); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  function summary(key, list = load()) {
    const rs = list.filter(r => r.key === key);
    if (!rs.length) return null;
    rs.sort((a, b) => a.ts - b.ts);
    const l = rs[rs.length - 1];
    return {
      rs, key, count: rs.length, type: l.type, show: l.show, intl: l.intl, country: l.country,
      first: rs[0].ts, last: l.ts,
      recent: rs.filter(r => r.ts > Date.now() - 7 * DAY).length,
      cats: countBy(rs, r => r.cat), media: countBy(rs, r => MEDIA_LABEL[r.medium]),
      spoofed: rs.filter(r => r.callType === 'spoofed').length,
      evidence: rs.filter(r => r.files && r.files.length).length
    };
  }
  function risk(n) {
    if (n >= 10) return { label: 'High risk — do not engage', c: 'var(--sindoor)' };
    if (n >= 3) return { label: 'Suspicious — be careful', c: 'var(--amber)' };
    if (n >= 1) return { label: 'Reported — verify first', c: 'var(--amber)' };
    return { label: 'No reports yet', c: 'var(--leaf)' };
  }
  const barRow = (label, v, total, color, right) =>
    `<div class="bar"><span>${esc(label)}</span><span class="track"><i style="width:${total ? Math.max(2, v / total * 100) : 0}%;${color ? '--b:' + color : ''}"></i></span><span>${right ?? v}</span></div>`;

  function limitCheck(key) {
    if (!user) return { ok: true };
    const mine = load().filter(r => r.user === user.id && (RULES.scope === 'global' || r.key === key));
    if (!mine.length) return { ok: true };
    const last = Math.max(...mine.map(r => r.ts));
    const next = last + RULES.limitDays * DAY;
    return next > Date.now() ? { ok: false, last, next } : { ok: true };
  }

  /* ================= Routing (tabs) ================= */
  const VIEWS = ['check', 'report', 'trends', 'aware', 'faq'];
  function route() {
    const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'check';
    VIEWS.forEach(x => { $('#v-' + x).hidden = x !== v; });
    $$('.tabs a').forEach(a => a.dataset.v === v ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    if (v === 'trends') renderTrends();
    if (v === 'check') renderTop();
    if (v === 'report') refreshLimitNote();
  }
  function go(v) {
    if (location.hash.slice(1) !== v) location.hash = v; else route();
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('hashchange', () => { route(); window.scrollTo({ top: 0 }); });

  /* ================= CHECK ================= */
  function previewNorm(input, out, verb) {
    const n = normalize(input.value);
    out.innerHTML = !n ? '' : n.err
      ? `<span class="err">${esc(n.err)}</span>`
      : `${verb} <code>${esc(n.show)}</code> · ${esc(kindText(n))}`;
    return n;
  }
  function advice(n) {
    if (n.type === 'Phone' && n.intl) return 'Indian government offices, banks and police never call from international numbers. Don\'t share anything. Report it on Sanchar Saathi (Chakshu) too.';
    if (n.type === 'Phone') return 'Don\'t share OTPs or PINs, and don\'t install apps the caller asks for. Block the number and report it on Sanchar Saathi (Chakshu).';
    if (n.type === 'UPI') return 'Don\'t pay or approve a collect request. Scanning a QR code or entering your UPI PIN only ever sends money.';
    if (n.type === 'Email') return 'Don\'t reply, open attachments or click links. Real companies email from their own domain.';
    return 'Don\'t open it. If you already entered details, change your passwords and call your bank on its official number.';
  }
  function showResult(raw) {
    const n = normalize(raw), box = $('#result');
    if (!n) { box.innerHTML = ''; return; }
    if (n.err) { box.innerHTML = `<div class="msg" style="--v:var(--amber)">${esc(n.err)}</div>`; return; }
    const s = summary(n.key), k = risk(s ? s.count : 0);
    if (!s) {
      box.innerHTML = `<article class="verdict" style="--v:${k.c}">
        <div><div class="v-id">${esc(n.show)}</div><div class="v-kind">${esc(kindText(n))}</div>
          <div class="count-big">0<small>reports</small></div><span class="stamp">${k.label}</span></div>
        <div><p>Nobody has reported this yet. That doesn't make it safe: scammers switch numbers often.</p>
          <div class="advice">${esc(advice(n))}</div>
          <p><button class="btn" type="button" data-report="${esc(n.key)}">Report it</button></p></div></article>`;
      return;
    }
    const lim = limitCheck(n.key);
    const action = !lim.ok
      ? `<p class="muted">You reported ${s.rs.some(r => user && r.user === user.id) ? 'this' : 'an ID'} ${ago(lim.last)}. You can report again on <b>${fmtDate(lim.next)}</b>.</p>`
      : `<p><button class="btn" type="button" data-report="${esc(n.key)}">I was targeted too — report it</button></p>`;
    const tags = [];
    if (s.intl) tags.push(`<span class="tagpill">International · ${esc(s.country)}</span>`);
    if (s.spoofed) tags.push(`<span class="tagpill red">${plural(s.spoofed, 'spoofed call report')}</span>`);
    box.innerHTML = `<article class="verdict" style="--v:${k.c}">
      <div>
        <div class="v-id">${esc(s.show)}</div><div class="v-kind">${esc(kindText(n))}</div>
        <div class="count-big">${s.count}<small>${s.count === 1 ? 'report' : 'reports'}</small></div>
        <span class="stamp">${k.label}</span>
        <div style="margin-top:14px">${tags.join('')}</div>
      </div>
      <div>
        <dl class="facts">
          <dt>First reported</dt><dd>${fmtDate(s.first)}</dd>
          <dt>Last reported</dt><dd>${ago(s.last)}</dd>
          <dt>Last 7 days</dt><dd>${plural(s.recent, 'new report')}</dd>
          <dt>Reached people by</dt><dd>${s.media.slice(0, 3).map(m => esc(m[0])).join(', ')}</dd>
          <dt>With evidence</dt><dd>${s.evidence} of ${s.count} reports</dd>
        </dl>
        <h3 style="margin-top:18px">What people said it was</h3>
        ${s.cats.slice(0, 5).map(([c, v]) => barRow(c, v, s.count, k.c)).join('')}
        <div class="advice">${esc(advice(n))}</div>
        ${action}
      </div></article>`;
  }
  function check(raw) {
    $('#q').value = raw;
    previewNorm($('#q'), $('#qnorm'), 'Checking');
    go('check');
    showResult(raw);
  }
  $('#sform').addEventListener('submit', e => { e.preventDefault(); showResult($('#q').value); });
  $('#q').addEventListener('input', () => previewNorm($('#q'), $('#qnorm'), 'Checking'));
  $('#tries').innerHTML = '<span class="muted small">Try:</span>' +
    ['98765-43210', '0044 7700 900461', 'Refund.Help@YBL', 'https://www.sbi-kyc-update.in/login/', '+91 90000 12345', '8888800000']
      .map(t => `<button class="chip" type="button" data-check="${esc(t)}">${esc(t)}</button>`).join('');

  function renderTop() {
    const from = dayStart(Date.now()) - 29 * DAY;
    const recent = load().filter(r => r.ts >= from);
    const top = [...new Set(recent.map(r => r.key))].map(k => summary(k, recent)).sort((a, b) => b.count - a.count || b.last - a.last).slice(0, 10);
    $('#topbody').innerHTML = top.map(s => `<tr class="click" tabindex="0" data-check="${esc(s.key)}">
      <td><span class="id">${esc(s.show)}</span>${s.intl ? ' <span class="tagpill">Intl</span>' : ''}</td>
      <td>${TYPE_LABEL[s.type]}</td><td>${esc(s.cats[0][0])}</td><td>${ago(s.last)}</td>
      <td class="n"><span class="pill" style="background:${risk(s.count).c}">${s.count}</span></td></tr>`).join('');
  }

  /* ================= REPORT ================= */
  $('#medium').innerHTML = MEDIA.map(m => `<label class="tile"><input type="radio" name="medium" value="${m.id}"><span>${svgIcon(m.icon)}${m.label}</span></label>`).join('');
  $('#rc').insertAdjacentHTML('beforeend', CATS.map(c => `<option>${esc(c)}</option>`).join(''));

  const ID_LABELS = {
    call: 'Number that called you', sms: 'Sender number, or the link in the SMS', whatsapp: 'WhatsApp number, or the link they sent',
    telegram: 'Telegram number, or the link they sent', email: 'Sender email, or the link in the email',
    social: 'Profile link, or the link they sent', website: 'Website or app link', other: "Scammer's number, UPI ID or link"
  };
  // Which kinds of ID make sense for each channel (e.g. an email can't be a phone number)
  const ALLOWED = {
    call: ['Phone', 'UPI'], sms: ['Phone', 'Link', 'UPI'], whatsapp: ['Phone', 'Link', 'UPI'], telegram: ['Phone', 'Link', 'UPI'],
    email: ['Email', 'Link'], social: ['Link', 'UPI'], website: ['Link', 'UPI'], other: TYPES
  };
  const PLACEHOLDER = {
    call: '+91 98765 43210 or +44 7700 900461', sms: '+91 98765 43210 or the link in the SMS', whatsapp: '+91 98765 43210 or the link they sent',
    telegram: '+44 7700 900461 or t.me/… link', email: 'sender@example.com or the link in the email', social: 'instagram.com/profile or the link they sent',
    website: 'fake-site.com/login', other: 'Number, UPI ID, email or link'
  };
  const INPUTMODE = { call: 'tel', email: 'email', website: 'url', social: 'url' };
  const listTypes = arr => { const l = arr.map(t => TYPE_LABEL[t].toLowerCase().replace('upi id', 'UPI ID')); return l.length > 1 ? l.slice(0, -1).join(', ') + ' or ' + l[l.length - 1] : l[0]; };
  function mediumMismatch(n, m) {
    if (!n || n.err || !m || ALLOWED[m].includes(n.type)) return '';
    const art = w => (/^[aeio]/i.test(w) ? 'an ' : 'a ') + w;
    return `You chose ${MEDIA_LABEL[m]}, so enter ${art(listTypes(ALLOWED[m]))}, not ${art(TYPE_LABEL[n.type].toLowerCase().replace('upi id', 'UPI ID'))}. Or change the channel in step 1.`;
  }
  const getMedium = () => ($('input[name=medium]:checked') || {}).value || '';
  function updateIdField() {
    const m = getMedium();
    $('#id-label').textContent = ID_LABELS[m] || "Scammer's number, UPI ID or link";
    $('#rv').placeholder = PLACEHOLDER[m] || 'First choose how you received it in step 1';
    $('#rv').inputMode = INPUTMODE[m] || 'text';
    let n = previewNorm($('#rv'), $('#rnorm'), 'Saved as');
    const mis = mediumMismatch(n, m);
    if (mis) { $('#rnorm').innerHTML = `<span class="err">${esc(mis)}</span>`; n = null; }
    const isPhone = n && !n.err && n.type === 'Phone';
    $('#calltype-box').hidden = !(isPhone && CALL_MEDIA.includes(m));
    if (isPhone) {
      const intl = !!n.intl;
      $$('input[name=ct]').forEach(r => {
        r.disabled = intl ? r.value !== 'international' : r.value === 'international';
      });
      const cur = $('input[name=ct]:checked');
      if (intl) $('input[name=ct][value=international]').checked = true;
      else if (!cur || cur.value === 'international') $('input[name=ct][value=domestic]').checked = true;
    }
    $('#spoof-hint').hidden = ($('input[name=ct]:checked') || {}).value !== 'spoofed' || $('#calltype-box').hidden;
    refreshLimitNote();
  }
  $('#medium').addEventListener('change', () => { $('#e-medium').textContent = ''; updateIdField(); });
  $('#rv').addEventListener('input', () => { $('#e-rv').textContent = ''; updateIdField(); });
  $('#calltype').addEventListener('change', updateIdField);
  $('#rc').addEventListener('change', () => { $('#e-rc').textContent = ''; });
  $('#rt').addEventListener('input', () => { $('#rtc').textContent = $('#rt').value.length; });
  $('#decl').addEventListener('change', () => { $('#e-decl').textContent = ''; });

  function refreshLimitNote() {
    const n = normalize($('#rv').value);
    const lim = n && !n.err ? limitCheck(n.key) : { ok: true };
    $('#limit-note').innerHTML = !lim.ok ? `You can report this again on <b>${fmtDate(lim.next)}</b>.` : (user ? `Reporting as <b>${esc(user.name)}</b>` : 'You\'ll be asked for your name and mobile number.');
  }

  /* ---- date: last 30 days ---- */
  const todayISO = localISO(Date.now());
  const minISO = localISO(dayStart(Date.now()) - RULES.windowDays * DAY);
  $('#rd').max = todayISO; $('#rd').min = minISO; $('#rd').value = todayISO;
  const QUICK = [[0, 'Today'], [1, 'Yesterday'], [2, '2 days ago'], [7, '1 week ago'], [14, '2 weeks ago'], [30, '30 days ago']];
  $('#dpick').innerHTML = QUICK.map(([d, l]) => `<button type="button" class="chip" data-days="${d}" aria-pressed="false">${l}</button>`).join('');
  function dateState() {
    const v = $('#rd').value;
    if (!v) return { ok: false, msg: 'Pick the date you received it.' };
    const d = daysAgo(fromISO(v));
    if (d < 0) return { ok: false, msg: 'The date can\'t be in the future.' };
    if (d > RULES.windowDays) return { ok: false, msg: `Only communication received in the last ${RULES.windowDays} days can be reported here. For older cases, use cybercrime.gov.in or call 1930.` };
    return { ok: true, d };
  }
  function updateDate() {
    const st = dateState();
    $$('#dpick .chip').forEach(c => c.setAttribute('aria-pressed', String(st.ok && +c.dataset.days === st.d)));
    $('#dnote').textContent = st.ok ? `${fmtDate(fromISO($('#rd').value))} · ${st.d === 0 ? 'today' : st.d === 1 ? 'yesterday' : st.d + ' days ago'} · ${RULES.windowDays - st.d} days left to report` : '';
    $('#e-rd').textContent = st.ok ? '' : st.msg;
  }
  $('#dpick').addEventListener('click', e => {
    const c = e.target.closest('[data-days]'); if (!c) return;
    $('#rd').value = localISO(dayStart(Date.now()) - c.dataset.days * DAY); updateDate();
  });
  $('#rd').addEventListener('input', updateDate);
  $('#rd').addEventListener('change', updateDate);

  /* ---- attachments ---- */
  let attached = [];
  function readAsDataURL(file) {
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
  }
  async function shrinkImage(file) {
    const url = await readAsDataURL(file);
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', .72);
  }
  async function addFiles(list) {
    const err = [];
    for (const f of list) {
      if (attached.length >= RULES.maxFiles) { err.push(`Only ${RULES.maxFiles} files allowed.`); break; }
      const okType = /^image\/(png|jpe?g|webp)$/.test(f.type) || f.type === 'application/pdf';
      if (!okType) { err.push(`${f.name}: only JPG, PNG, WebP or PDF.`); continue; }
      if (f.size > RULES.maxFileMB * 1048576) { err.push(`${f.name}: larger than ${RULES.maxFileMB} MB.`); continue; }
      try {
        let data = null;
        if (f.type === 'application/pdf') data = f.size <= 1.5 * 1048576 ? await readAsDataURL(f) : null;
        else data = await shrinkImage(f);
        attached.push({ name: f.name.slice(0, 80), type: f.type, size: f.size, data });
      } catch (e) { err.push(`${f.name}: couldn't be read.`); }
    }
    $('#e-files').textContent = err.join(' ');
    renderFiles();
  }
  const thumb = f => f.type === 'application/pdf' || !f.data ? `<span class="pdf">${f.type === 'application/pdf' ? 'PDF' : 'IMG'}</span>` : `<img src="${esc(f.data)}" alt="">`;
  function renderFiles() {
    $('#filelist').innerHTML = attached.map((f, i) => `<li>${thumb(f)}<span class="meta">${esc(f.name)}<br><span class="muted small">${kb(f.size)}${f.data ? '' : ' · name only (too big to store in demo)'}</span></span><button type="button" data-rm="${i}" aria-label="Remove ${esc(f.name)}">Remove</button></li>`).join('');
  }
  $('#files').addEventListener('change', e => { addFiles([...e.target.files]); e.target.value = ''; });
  $('#filelist').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { attached.splice(+b.dataset.rm, 1); renderFiles(); } });
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => addFiles([...e.dataTransfer.files]));

  /* ---- captcha (client-side demo; use reCAPTCHA / Turnstile with a server in production) ---- */
  let capCode = '';
  function newCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    capCode = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const c = $('#cap'), x = c.getContext('2d'), W = c.width, H = c.height;
    x.fillStyle = '#fff8e8'; x.fillRect(0, 0, W, H);
    const inks = ['#241c15', '#7a3b12', '#31479a', '#8d1e12', '#2d5a3a'];
    for (let i = 0; i < 5; i++) {
      x.strokeStyle = 'rgba(120,90,50,.35)'; x.lineWidth = 1 + Math.random();
      x.beginPath(); x.moveTo(Math.random() * W, Math.random() * H);
      x.bezierCurveTo(Math.random() * W, Math.random() * H, Math.random() * W, Math.random() * H, Math.random() * W, Math.random() * H); x.stroke();
    }
    [...capCode].forEach((ch, i) => {
      x.save();
      x.translate(22 + i * 36, 40 + (Math.random() * 10 - 5));
      x.rotate((Math.random() - .5) * .7);
      x.font = `800 ${30 + Math.floor(Math.random() * 7)}px Mukta, Arial, sans-serif`;
      x.fillStyle = inks[Math.floor(Math.random() * inks.length)];
      x.fillText(ch, -10, 0);
      x.restore();
    });
    for (let i = 0; i < 70; i++) { x.fillStyle = 'rgba(60,40,20,.25)'; x.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
    $('#cap-in').value = '';
  }
  $('#cap-new').addEventListener('click', () => { newCaptcha(); $('#cap-in').focus(); });
  $('#cap-in').addEventListener('input', () => { $('#e-cap').textContent = ''; });

  /* ---- submit ---- */
  let pending = null;
  function validate() {
    const errs = {};
    const medium = getMedium();
    if (!medium) errs.medium = 'Please select how you received the communication.';
    const n = normalize($('#rv').value);
    if (!n) errs.rv = 'Enter the number, UPI ID, email or link.';
    else if (n.err) errs.rv = n.err;
    else if (mediumMismatch(n, medium)) errs.rv = mediumMismatch(n, medium);
    if (!$('#rc').value) errs.rc = 'Choose the kind of scam.';
    const ds = dateState(); if (!ds.ok) errs.rd = ds.msg;
    if ($('#cap-in').value.trim().toUpperCase() !== capCode) errs.cap = 'Characters don\'t match. Try again.';
    if (!$('#decl').checked) errs.decl = 'Please tick the declaration.';
    ['medium', 'rv', 'rc', 'rd', 'cap', 'decl'].forEach(f => { $('#e-' + f).textContent = errs[f] || ''; });
    return { ok: !Object.keys(errs).length, errs, n, medium };
  }
  function finalize(n, medium) {
    const box = $('#rmsg');
    if (n.type === 'Phone' && n.key === user.id) { box.innerHTML = `<div class="msg" style="--v:var(--amber)">You can't report your own number.</div>`; return; }
    const lim = limitCheck(n.key);
    if (!lim.ok) {
      box.innerHTML = `<div class="msg" style="--v:var(--sindoor)"><h3>Already reported this week</h3>You reported ${RULES.scope === 'global' ? 'a scam' : `<b>${esc(n.show)}</b>`} ${ago(lim.last)}. Each person can report ${RULES.scope === 'global' ? 'once' : 'the same ID once'} every ${RULES.limitDays} days, so counts stay honest. You can report again on <b>${fmtDate(lim.next)}</b>.</div>`;
      newCaptcha(); return;
    }
    const isPhone = n.type === 'Phone';
    const callType = isPhone ? (n.intl ? 'international' : (!$('#calltype-box').hidden && ($('input[name=ct]:checked') || {}).value) || 'domestic') : '';
    const report = {
      key: n.key, type: n.type, show: n.show, intl: !!n.intl, country: n.country || '',
      medium, callType, cat: $('#rc').value, note: $('#rt').value.slice(0, 500),
      user: user.id, ts: Date.now(), incident: $('#rd').value, files: attached.slice()
    };
    const all = load(); all.push(report);
    let saved = save(all), stripped = false;
    if (!saved) {  // storage full: keep file names, drop file contents
      report.files = report.files.map(f => ({ ...f, data: null })); stripped = true;
      saved = save(all);
    }
    const ref = 'SR-' + Date.now().toString(36).toUpperCase().slice(-6);
    const s = summary(n.key);
    box.innerHTML = `<div class="msg" style="--v:var(--leaf)">
      <h3>Report submitted. Thank you, ${esc(user.name)}.</h3>
      <dl class="receipt">
        <dt>Reference</dt><dd>${ref}</dd>
        <dt>Reported</dt><dd>${esc(n.show)}${n.intl ? ' · ' + esc(n.country) : ''}</dd>
        <dt>Received via</dt><dd>${esc(MEDIA_LABEL[medium])}${callType ? ' · ' + esc(CALLTYPE_LABEL[callType]) : ''}</dd>
        <dt>Scam type</dt><dd>${esc(report.cat)}</dd>
        <dt>Date received</dt><dd>${fmtDate(fromISO(report.incident))}</dd>
        <dt>Total reports</dt><dd>${s.count}</dd>
      </dl>
      ${report.files.length ? `<div class="thumbs">${report.files.map(thumb).join('')}</div>` : ''}
      ${stripped ? '<p class="muted small">Browser storage is full, so only file names were kept.</p>' : ''}
      ${callType === 'spoofed' ? '<p class="small">Please also report this spoofed call on <a href="https://sancharsaathi.gov.in" target="_blank" rel="noopener">Sanchar Saathi</a>.</p>' : ''}
      <button class="btn ghost sm" type="button" data-check="${esc(n.key)}">View this record</button></div>`;
    // reset form
    $('#rform').reset(); attached = []; renderFiles();
    $('#rd').value = todayISO; updateDate(); updateIdField(); $('#rtc').textContent = '0';
    newCaptcha();
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('Report submitted');
  }
  $('#rform').addEventListener('submit', e => {
    e.preventDefault();
    $('#rmsg').innerHTML = '';
    const v = validate();
    if (!v.ok) {
      if (v.errs.cap) newCaptcha();
      const first = ['medium', 'rv', 'rc', 'rd', 'cap', 'decl'].find(f => v.errs[f]);
      const el = $('#e-' + first).closest('fieldset');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const inp = el.querySelector('input,select,textarea'); if (inp) inp.focus({ preventScroll: true });
      return;
    }
    if (!user) { pending = () => finalize(v.n, v.medium); openModal('#login'); }
    else finalize(v.n, v.medium);
  });

  /* ================= TRENDS ================= */
  let chartMode = 'reported', chartDays = null;
  function renderTrends() {
    const all = load(), now = Date.now();
    const from = dayStart(now) - 29 * DAY;
    const recent = all.filter(r => r.ts >= from);
    const wk = all.filter(r => r.ts > now - 7 * DAY), prev = all.filter(r => r.ts <= now - 7 * DAY && r.ts > now - 14 * DAY);
    const diff = wk.length - prev.length, pct = prev.length ? Math.round(diff / prev.length * 100) : 0;
    const phones = recent.filter(r => r.type === 'Phone');
    const abroad = phones.filter(r => r.callType === 'international' || r.callType === 'spoofed').length;
    const media = countBy(recent, r => MEDIA_LABEL[r.medium]);
    const cats = countBy(recent, r => r.cat);
    $('#trend-title').textContent = cats.length ? `${cats[0][0]} is the most reported scam this month` : 'Fraud trends';
    $('#figures').innerHTML = [
      [recent.length, 'reports in the last 30 days', ''],
      [wk.length, 'reports this week', `<em class="${diff > 0 ? 'up' : 'down'}">${diff >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs last week</em>`],
      [phones.length ? Math.round(abroad / phones.length * 100) + '%' : '0%', 'of scam calls came from abroad', `<em>${abroad} of ${phones.length} phone reports</em>`],
      [media.length ? esc(media[0][0]) : '—', 'is the top way scammers reach people', media.length ? `<em>${Math.round(media[0][1] / recent.length * 100)}% of reports</em>` : '']
    ].map(([b, s, e]) => `<div class="fcard"><b>${b}</b><span>${s}</span><br>${e}</div>`).join('');

    // daily buckets by type
    chartDays = Array.from({ length: 30 }, (_, i) => { const o = { t: from + i * DAY }; TYPES.forEach(t => { o[t] = 0; }); return o; });
    recent.concat(chartMode === 'happened' ? all.filter(r => r.ts < from) : []).forEach(r => {
      const t = chartMode === 'happened' ? fromISO(r.incident || localISO(r.ts)) : r.ts;
      const i = Math.round((dayStart(t) - from) / DAY);
      if (i >= 0 && i < 30) chartDays[i][r.type]++;
    });
    $('#chart-h').textContent = chartMode === 'happened' ? 'Scams per day, by the date people received them' : 'Reports per day, by the date they were filed';
    $('#legend').innerHTML = TYPES.map(t => `<span><i style="background:${TYPE_COLOR[t]}"></i>${TYPE_LABEL[t]}</span>`).join('');
    drawChart();

    // rising categories
    const cw = Object.fromEntries(countBy(wk, r => r.cat)), cp = Object.fromEntries(countBy(prev, r => r.cat));
    const rising = CATS.map(c => ({ c, a: cw[c] || 0, b: cp[c] || 0 })).filter(x => x.a || x.b)
      .sort((x, y) => (y.a - y.b) - (x.a - x.b) || y.a - x.a).slice(0, 6);
    $('#rising').innerHTML = rising.map(x => { const d = x.a - x.b; return `<div class="rise"><span>${esc(x.c)}</span><b class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '▲ +' + d : d < 0 ? '▼ ' + d : '0'} <span class="muted small">(${x.b} → ${x.a})</span></b></div>`; }).join('') || '<p class="muted">Not enough data yet.</p>';

    $('#bymedium').innerHTML = media.map(([m, v]) => barRow(m, v, recent.length, 'var(--neel)', Math.round(v / recent.length * 100) + '%')).join('');
    const ct = ['domestic', 'international', 'spoofed'].map(k => [CALLTYPE_LABEL[k], phones.filter(r => (r.callType || 'domestic') === k).length]);
    $('#bycall').innerHTML = ct.map(([l, v], i) => barRow(l, v, phones.length, ['var(--ink)', 'var(--c-phone)', 'var(--amber)'][i])).join('') +
      '<p class="muted small" style="margin-top:10px">Spoofed calls show a +91 number but come from abroad. Phones in India now label real foreign calls “International call”.</p>';
    $('#bycat').innerHTML = cats.map(([c, v]) => barRow(c, v, cats[0][1], 'var(--sindoor)')).join('');
    const wd = [0, 0, 0, 0, 0, 0, 0]; recent.forEach(r => { wd[(new Date(r.ts).getDay() + 6) % 7]++; });
    const wmax = Math.max(...wd);
    $('#byday').innerHTML = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => barRow(d, wd[i], wmax, wd[i] === wmax ? 'var(--haldi)' : 'var(--line-2)')).join('');
  }

  function drawChart() {
    const svg = $('#chart'); if (!svg || !chartDays) return;
    const W = svg.clientWidth, H = svg.clientHeight; if (!W || !H) return;
    const L = 30, B = 26, T = 8;
    const totals = chartDays.map(d => TYPES.reduce((s, t) => s + d[t], 0));
    const step = Math.max(1, Math.ceil(Math.max(4, ...totals) / 4)), top = step * 4;
    const y = v => T + (H - T - B) * (1 - v / top), bw = (W - L) / 30;
    let h = '';
    for (let g = 0; g <= 4; g++) {
      h += `<line x1="${L}" x2="${W}" y1="${y(g * step)}" y2="${y(g * step)}" stroke="var(--line)"/>`;
      h += `<text x="${L - 8}" y="${y(g * step) + 4}" text-anchor="end">${g * step}</text>`;
    }
    chartDays.forEach((d, i) => {
      const x = L + i * bw + Math.max(1, bw * .14), w = Math.max(1, bw * .72);
      let base = 0, bars = '';
      TYPES.forEach(t => {
        if (!d[t]) return;
        bars += `<rect x="${x}" y="${y(base + d[t])}" width="${w}" height="${y(base) - y(base + d[t])}" fill="${TYPE_COLOR[t]}"/>`;
        base += d[t];
      });
      const tip = `${fmtShort(d.t)}: ${plural(totals[i], 'report')} (` + TYPES.map(t => `${TYPE_LABEL[t]} ${d[t]}`).join(', ') + ')';
      h += `<g><title>${esc(tip)}</title>${bars}<rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"/></g>`;
    });
    const marks = W < 520 ? [0, 29] : [0, 7, 14, 21, 29];
    marks.forEach(i => {
      const anchor = i === 0 ? 'start' : i === 29 ? 'end' : 'middle';
      const x = i === 0 ? L : i === 29 ? W : L + i * bw + bw / 2;
      h += `<text x="${x}" y="${H - 6}" text-anchor="${anchor}">${i === 29 ? 'Today' : fmtShort(chartDays[i].t)}</text>`;
    });
    svg.innerHTML = h;
  }
  const chartObserver = new ResizeObserver(drawChart);
  chartObserver.observe($('#fig'));
  $$('.seg button').forEach(b => b.addEventListener('click', () => {
    chartMode = b.dataset.mode;
    $$('.seg button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
    renderTrends();
  }));

  /* ================= AWARE ================= */
  const SCAMS = [
    { t: 'Digital arrest', via: 'Video call · WhatsApp', how: 'Someone dressed as police, CBI or customs says your Aadhaar or a parcel is linked to a crime. They keep you on video call for hours and demand money to “clear your name”.', flag: 'You are told not to hang up or tell your family.', act: 'Hang up. No agency in India arrests or questions anyone over video call. Call 1930 if you paid.' },
    { t: 'SIM disconnection threat', via: 'Phone call · IVR', how: 'A recorded call says your mobile number will be blocked in 2 hours, “press 9 to talk to an officer”, and then asks for personal details.', flag: 'Claims to be DoT or TRAI.', act: 'DoT and TRAI don\'t make such calls and don\'t authorise anyone to. Report the number on Sanchar Saathi (Chakshu).' },
    { t: 'Courier or parcel scam', via: 'SMS · Phone call', how: 'An SMS asks you to pay ₹5–50 to “reschedule delivery”, or a caller says a parcel in your name has drugs.', flag: 'A short link to an unfamiliar site asking for card details.', act: 'Track parcels only on the courier\'s official site or app.' },
    { t: 'KYC or account block', via: 'SMS · WhatsApp', how: 'A message says your bank account, PAN or wallet will be blocked unless you update KYC through a link.', flag: 'A link that isn\'t your bank\'s real domain, and the word “urgent”.', act: 'Banks don\'t block accounts by SMS link. Open your bank app or visit the branch.' },
    { t: 'Part-time job or task scam', via: 'WhatsApp · Telegram', how: 'You get paid small amounts for liking videos or rating hotels. Then come “prepaid tasks” where you deposit money and can never withdraw it.', flag: 'You have to pay to earn.', act: 'Real jobs never ask you to deposit money. Leave the group and report the number.' },
    { t: 'Investment or trading group', via: 'WhatsApp · Telegram · Instagram', how: 'An “expert” group shows huge profits on a custom app. Your balance grows on screen, but withdrawal needs “tax” or “fees”.', flag: 'Guaranteed returns, and an app that isn\'t on SEBI-registered platforms.', act: 'Invest only through SEBI-registered brokers. Check lenders and schemes on RBI Sachet.' },
    { t: 'Fake customer care', via: 'Search results · Social media', how: 'You search for a helpline and call a fake number. The “agent” asks you to install AnyDesk or share your screen to process a refund.', flag: 'Asked to install an app or share an OTP for a refund.', act: 'Get helpline numbers only from the company\'s official app or website.' },
    { t: 'QR code “payment”', via: 'OLX · Marketplace', how: 'A buyer sends a QR code or a collect request so you can “receive” payment for something you are selling.', flag: 'Asked to scan or enter your PIN to receive money.', act: 'Receiving money never needs your PIN or a scan. Decline the request.' },
    { t: 'Sextortion video call', via: 'Video call · Social media', how: 'A video call from a stranger is secretly recorded, edited, and used for blackmail.', flag: 'An unknown video call, followed by threats to send a clip to your contacts.', act: 'Don\'t pay: payments lead to more demands. Keep screenshots and report on cybercrime.gov.in.' },
    { t: 'Instant loan apps', via: 'Apps · SMS ads', how: 'An app gives a small loan within minutes, takes access to your contacts and photos, then harasses you for huge repayments.', flag: 'Permission to read contacts and photos, and no RBI-registered lender named.', act: 'Borrow only from RBI-registered lenders. Report harassment on cybercrime.gov.in.' },
    { t: 'Electricity bill threat', via: 'SMS · WhatsApp', how: 'A message says your power will be cut tonight because a bill is unpaid, and asks you to call an “officer” at a mobile number.', flag: 'A personal mobile number instead of the electricity board\'s helpline.', act: 'Check your bill on the electricity board\'s official app or website.' }
  ];
  $('#scamcards').innerHTML = SCAMS.map(s => `<article class="scam"><h3>${esc(s.t)}</h3><span class="muted small">Usually comes by: ${esc(s.via)}</span>
    <p>${esc(s.how)}</p><p class="flag"><b>Red flag:</b> ${esc(s.flag)}</p><p class="do"><b>What to do:</b> ${esc(s.act)}</p></article>`).join('');

  /* ================= FAQ ================= */
  const FAQ = [
    ['Is this a government website?', 'No. Scam Registry is an independent community project. To file official complaints, use Sanchar Saathi (Chakshu) for fraud calls and messages, and cybercrime.gov.in or 1930 if you lost money. The links are at the bottom of every page.'],
    ['I already lost money. What should I do first?', 'Call 1930 or file a complaint on cybercrime.gov.in straight away. The sooner it\'s reported, the better the chance the money can be frozen. Then call your bank and block your card or UPI.'],
    ['Why can I report an ID only once a week?', 'So one angry person can\'t inflate the count. Each report is tied to your mobile number, and you can report the same ID again after 7 days if it keeps targeting you.'],
    ['Why only scams from the last 30 days?', 'Recent reports are the most useful for warning others, and that\'s also the window Sanchar Saathi\'s Chakshu uses. For older incidents, file on cybercrime.gov.in.'],
    ['How do I report an international call?', 'Choose “Phone call” or “WhatsApp”, then type the number with + and the country code, like +44 7700 900461 or 0044 7700 900461. We detect the country automatically.'],
    ['A call showed a +91 number but my phone said “International call”. What is that?', 'That\'s a spoofed call: it comes from abroad but pretends to be Indian. Choose that option in step 2. Please also report it on Sanchar Saathi under “Report Incoming International Call with Indian Number”.'],
    ['Why does “98765-43210” match “+91 98765 43210”?', 'We clean up what you type. Spaces, dashes, +91 and a leading 0 are removed from numbers, UPI IDs and emails are lowercased, and links lose https://, www., tracking codes and trailing slashes. One scammer shows up as one entry however people type it.'],
    ['What evidence should I attach?', 'Screenshots of the SMS, WhatsApp chat, call log or payment page, or a PDF. Hide your own OTPs, account numbers and other private details before uploading.'],
    ['Is my mobile number shown publicly?', 'No. Your number is used only as your user ID to apply the weekly limit. Only the scammer\'s ID and counts are shown.'],
    ['Can a genuine number be listed by mistake?', 'Yes, it can happen. That\'s why we show the number of reports and dates rather than a final verdict, and why every report needs a declaration. Always verify through official channels.']
  ];
  $('#faqlist').innerHTML = FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="ans"><p>${esc(a)}</p></div></details>`).join('');

  /* ================= Sign in / log out ================= */
  function openModal(id) { const m = $(id); m.classList.add('on'); const f = m.querySelector('input,button'); if (f) f.focus(); }
  function closeModals() { $$('.modal.on').forEach(m => m.classList.remove('on')); pending = null; }
  $$('[data-close]').forEach(b => b.addEventListener('click', closeModals));
  $$('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModals(); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModals(); });

  $('#lform').addEventListener('submit', e => {
    e.preventDefault();
    const id = phoneKey($('#lp').value);
    if (!id) { $('#lmsg').textContent = 'Enter a valid 10-digit Indian mobile number.'; return; }
    user = { id, name: $('#ln').value.trim().slice(0, 40) || 'User' };
    store.set(UKEY, user);
    $('#lmsg').textContent = ''; $('#ln').value = ''; $('#lp').value = '';
    const next = pending; closeModals(); renderWho(); refreshLimitNote();
    toast('Signed in as ' + user.name);
    if (next) next(); else if ($('#q').value) showResult($('#q').value);
  });
  function renderWho() {
    $('#who').innerHTML = user
      ? `Signed in as <b>${esc(user.name)}</b> <button class="btn ghost sm" type="button" id="switch">Switch user</button>`
      : `<button class="btn ghost sm" type="button" id="signin">Sign in</button>`;
  }
  $('#agree').addEventListener('change', () => { $('#logout-yes').disabled = !$('#agree').checked; });
  $('#logout-yes').addEventListener('click', () => {
    user = null; store.del(UKEY);
    closeModals(); renderWho(); refreshLimitNote();
    $('#rmsg').innerHTML = '';
    if ($('#q').value) showResult($('#q').value);
    toast('Logged out');
    openModal('#login');
  });

  /* ================= Shared click handling ================= */
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-check]');
    if (c) { check(c.dataset.check); return; }
    const r = e.target.closest('[data-report]');
    if (r) {
      $('#rv').value = r.dataset.report; $('#rmsg').innerHTML = '';
      // pre-select a sensible channel for the ID being reported
      const n = normalize(r.dataset.report), pre = { Phone: 'call', Email: 'email', Link: 'website', UPI: 'other' }[n && n.type];
      if (pre && !getMedium()) $(`input[name=medium][value=${pre}]`).checked = true;
      go('report'); updateIdField(); return;
    }
    if (e.target.closest('#signin')) { openModal('#login'); return; }
    if (e.target.closest('#switch')) { $('#agree').checked = false; $('#logout-yes').disabled = true; openModal('#logout'); }
  });
  document.addEventListener('keydown', e => {
    const tr = e.target.closest && e.target.closest('tr[data-check]');
    if (tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); check(tr.dataset.check); }
  });
  $('#reset').addEventListener('click', () => {
    save(seed()); $('#result').innerHTML = ''; $('#rmsg').innerHTML = ''; route();
    if ($('#q').value) showResult($('#q').value);
    toast('Demo data reset');
  });

  // label table cells for the stacked phone layout
  new MutationObserver(() => {
    $$('.stack td:not([data-l])').forEach(td => { td.dataset.l = td.closest('table').rows[0].cells[td.cellIndex]?.textContent || ''; });
  }).observe(document.body, { childList: true, subtree: true });

  /* ================= Start ================= */
  renderWho();
  newCaptcha();
  updateDate();
  updateIdField();
  route();
  if (!location.hash || location.hash === '#check') { $('#q').value = '98765-43210'; previewNorm($('#q'), $('#qnorm'), 'Checking'); showResult('98765-43210'); }
})();
