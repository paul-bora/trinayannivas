# Trinayan Nivas Housing Society App

A simple resident app for Trinayan Nivas. It is a web app that residents install on their phone's home screen, on Android and iPhone. It costs nothing to run.

| Tab | What's in it |
|---|---|
| **Home** | Latest announcements, WhatsApp group link, society rules, buy/sell |
| **Community** | Resident posts with photos, likes and comments; posts can be reported |
| **Directory** | Neighbours, documents, emergency contacts, vendors, Management Committee |
| **My Unit** | Flat details, house members, vehicles, **My Dues** (pay by UPI) |
| **Admin** (committee only) | Accounts dashboard, maintenance dues, expenses, flats & members, settings, reported posts |

**Free services used:** Supabase (database, login and file storage), Brevo (sends login emails), Cloudflare Pages (hosts the app at `trinayannivas.pages.dev`), GitHub (stores the code and runs backups).

---

## One-time setup (about 1 hour)

### 1. Supabase: database and login
1. Sign up at <https://supabase.com> (free, no card) → **New project**. Name it `trinayan-nivas`, choose region **Mumbai**, and save the database password somewhere safe.
2. Open **SQL Editor** → paste all of [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql) → **Run**.
3. Open [supabase/seed.sql](supabase/seed.sql). **Change `secretary@example.com` to your own email** and the name, paste it into the SQL Editor → **Run**. You are now the first admin.
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key. You need them in steps 3 and 4.

### 2. Login emails: connect Brevo, then set the code template
Supabase only lets you edit email templates after you connect your own email sender (custom SMTP). Its built-in sender also allows only a few emails per hour. Brevo is a free sender that allows 300 emails a day.

1. Sign up at <https://www.brevo.com> and verify a sender email.
2. Brevo → **SMTP & API** → create an SMTP key.
3. Supabase → **Authentication → Emails → SMTP Settings** → turn on **Enable custom SMTP**:
   - Host: `smtp-relay.brevo.com`
   - Port: `587`
   - Username: the **SMTP login** shown on Brevo's SMTP & API page. It often looks like `xxxx@smtp-brevo.com` and may differ from your account email.
   - Password: the SMTP key
   - Sender: any email verified in Brevo → **Senders, Domains & Dedicated IPs → Senders**. Your Brevo sign-up email is usually verified already.
   - Sender name: `Trinayan Nivas`
   - Save.

   If the codes land in spam, ask residents to mark the first one as **Not spam**.

Then set the code template:
1. **Authentication → Emails → Templates**: in both **Magic Link** and **Confirm signup**, set the subject to `Your Trinayan Nivas login code` and replace the message with:
   ```html
   <h2>Trinayan Nivas login code</h2>
   <p>Your login code is: <strong style="font-size:24px">{{ .Token }}</strong></p>
   <p>If you didn't ask for this, you can ignore this email.</p>
   ```
2. **Authentication → Rate Limits**: raise "emails per hour" to about 100.

### 3. Try it on your computer (optional)
Install [Node.js](https://nodejs.org) (LTS version), then:
```bash
cp .env.example .env      # then paste your Supabase URL and anon key into .env
npm install
npm run dev               # open the address it prints
```

### 4. Put it online with Cloudflare Pages
1. Create a free **private** GitHub repository and push this folder to it.
2. Sign up at <https://pages.cloudflare.com> (free, no card) → **Workers & Pages → Create → Pages → Connect to Git** → pick the repo.
3. **Project name:** type `trinayannivas`. This becomes the app's free web address, **`https://trinayannivas.pages.dev`**, and **can't be changed later**, so check the spelling. If the name is taken, Cloudflare adds a random ending; try `trinayan-nivas` instead.
4. Build settings: framework **None**, build command `npm run build`, output folder `dist`.
   Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the values from step 1.4), plus `NODE_VERSION` = `20`.
5. **Save and Deploy**. The app is live at `https://trinayannivas.pages.dev`, free with no renewals and HTTPS included.
6. Supabase → **Authentication → URL Configuration** → set **Site URL** to `https://trinayannivas.pages.dev`.

From now on, every push to GitHub updates the app automatically in about a minute.

### 5. Automatic backups and keep-alive (GitHub Actions)
A free Supabase project pauses after 7 days of no use. In the GitHub repo, go to **Settings → Secrets and variables → Actions** and add:
- `SUPABASE_URL` and `SUPABASE_ANON_KEY`, for the keep-alive ping every 3 days
- `SUPABASE_DB_URL`, for the monthly backup: Supabase → **Connect** → *Session pooler* connection string, with your database password filled in

Then the **Monthly database backup** workflow saves a full copy of the data on the 1st of each month. Download it from the **Actions** tab. You can also run it any time with **Run workflow**.

---

## Getting the society started
1. Log in with your email (you'll receive a code).
2. **Admin → Society settings**: UPI ID, UPI QR screenshot, WhatsApp group link, monthly maintenance amount, opening balance.
3. **Admin → Flats & members**: add every flat, then add each resident's name and email under their flat. Make other committee members **Committee admin**.
4. Fill in **Directory → Emergency contacts / Vendors / Management Committee**, upload **Documents**, and write the **Rules** (Home → Society rules → Edit).
5. Each month: **Admin → Maintenance → Raise dues**. When money arrives, tap the flat → **Mark as paid**. If a resident has tapped *I've paid*, their flat is marked **Check**, with their UPI reference shown.
6. Record spending in **Admin → Expenses**, with a photo of the receipt.

### Message to share in the WhatsApp group
> 🏠 **Trinayan Nivas now has its own app!**
> Open: https://trinayannivas.pages.dev
> Log in with your email; you'll get a 6-digit code.
> **Android:** tap ⋮ → *Install app* / *Add to Home screen*
> **iPhone:** open the link in **Safari** → Share ⬆️ → *Add to Home Screen*
> Not registered? Message the committee with your flat number and email.

---

## For developers
- `npm run dev`: local server · `npm run build`: type-check and production build · `npm run icons`: regenerate the app icons from the design in `scripts/make-icons.mjs`
- Stack: React 18 + TypeScript + Vite + `vite-plugin-pwa`, `@supabase/supabase-js`, plain CSS (`src/styles.css`).
- All access rules are enforced in the database with row-level security ([supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql)). The app hides admin screens, but the database is what actually protects the data.
- Login is allowed only for emails in `allowed_emails` (a trigger on `auth.users`). Removing an email there deletes that person's login.

