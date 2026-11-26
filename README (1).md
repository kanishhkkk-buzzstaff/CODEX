# 🛡️ Scam Registry

**Check before you pick up, pay or click.**
A community web app where people can report scam phone numbers, UPI/payment IDs, emails and links, and look up any ID to see whether others have been targeted by it.

> Built for a hackathon · Problem Statement **P-21: Scam Registry**

---

## ✨ Features

- **Search any ID**: phone number, international number, UPI ID, email or link. See the total report count, first and last reported dates, the most common scam category, how scammers reached people, and a risk level.
- **Report a scam**: a step-by-step form covering channel (call, SMS, WhatsApp, Telegram, email, social media, website), scam category, date received (last 30 days), description, and optional screenshot or PDF evidence.
- **Input normalization**: different spellings of the same ID are merged into one record.
- **One report per user limit**: each user can report a given ID only once per 7 days, so counts stay honest.
- **Fraud trends dashboard**: reports per day, rising scam types, channels used, call origin (Indian, international, spoofed) and busiest days.
- **Spoofed call detection**: separate option for calls that show a +91 number but come from abroad.
- **Stay aware**: common Indian scams explained with red flags and what to do.
- **FAQ and official help links**: 1930, cybercrime.gov.in, Sanchar Saathi (Chakshu) and RBI Sachet.
- **Mobile friendly**: app-style bottom navigation on phones.

## 🧹 How normalization works

| You type | Saved as |
|---|---|
| `98765-43210`, `+91 98765 43210`, `09876543210` | `9876543210` |
| `0044 7700 900461`, `+44 7700 900461` | `+447700900461` |
| `Refund.Help@YBL` | `refund.help@ybl` |
| `https://www.sbi-kyc-update.in/login/?id=7#x` | `sbi-kyc-update.in/login` |
| `hxxp://evil[.]com/pay` | `evil.com/pay` |

## 🚀 Run it locally

No build step or installs are needed. It's plain HTML, CSS and JavaScript.

```bash
git clone https://github.com/kanishhkkk-buzzstaff/CODEX.git
cd CODEX
code .
```

Then in VS Code, right-click `index.html` and choose **Open with Live Server** (install the *Live Server* extension first). You can also just double-click `index.html` to open it in your browser.

## 🗂️ Project structure

```
CODEX/
├── index.html   # page structure and tabs
├── style.css    # styling and responsive layout
├── app.js       # all app logic (normalize, search, report, trends)
└── README.md
```

## 🧪 Quick demo guide

1. Open the app. It starts with a pre-filled search for `98765-43210` showing a high-risk result.
2. Try the sample chips, such as `+91 90000 12345`, `0044 7700 900461` or `Refund.Help@YBL`, to see normalization in action.
3. Go to **Report a scam**, fill the form, solve the captcha and submit.
4. Try reporting the same ID again to see the weekly limit message.
5. Open **Fraud trends** to see the charts update with your report.
6. Use **Reset demo data** at the bottom of the page to start fresh.

## ⚠️ Limitations (demo version)

- Data is stored in the browser's `localStorage`, so it isn't shared between devices or users.
- The mobile-number sign-in has no OTP verification, and the captcha runs in the browser. A production version would verify numbers by OTP and use a server-side captcha such as reCAPTCHA or Cloudflare Turnstile.
- Demo reports are randomly generated sample data, not real scam records.
- Reports are unverified. The app shows counts and dates rather than a final verdict, and always points users to official channels.

## 🔮 Future scope

- Backend and database (Firebase or Supabase) so reports are shared across all users
- OTP-verified accounts and server-side rate limiting
- Moderation tools for reviewing reports and evidence
- Browser extension and WhatsApp bot to check a link or number instantly
- Hindi and regional language support

## 👥 Team

| Name | GitHub |
|---|---|
| Kanishk Asthana | [@kanishhkkk-buzzstaff](https://github.com/kanishhkkk-buzzstaff) |
| Ishan Shrivastava | [@ishan336](https://github.com/ishan336) |
| Ishant Pawar | [@zynothium5](https://github.com/zynothium5) |
| Ishika Jain | [@ishikaj-25](https://github.com/ishikaj-25) |

---

*Scam Registry is an independent community project, not a government website. If you've lost money to a scam, call **1930** or report at [cybercrime.gov.in](https://cybercrime.gov.in).*
