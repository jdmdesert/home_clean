# Steadfast & Co. Cleaning Change Log

Last updated: September 16, 2026

This document consolidates the requests and final outcomes from the Codex tasks named **website editing** and **App Building**. It is intended to make the website and team app easier to reproduce, audit, or continue later.

## Repositories

- Public website: <https://github.com/jdmdesert/home_clean>
- Internal team app: <https://github.com/jdmdesert/home_clean_internal_app>
- Public website: <https://jdmdesert.github.io/home_clean/>

## Public website (`home_clean`)

### Branding and estimate calculator

Requested:

- Rename the site to **Steadfast & Co. Cleaning**.
- Repair the instant estimate calculator.

Landed:

- Updated the page title, header, footer, metadata, and server text to the Steadfast & Co. Cleaning name.
- Repaired static estimate calculations using `pricing_rules.json`.
- Added estimate acceptance/rejection controls.
- Added a versioned `script.js` URL to prevent visitors from receiving stale calculator code from browser cache.
- Verified the calculator locally and on GitHub Pages. A standard 1,800-square-foot test returned a `$190–$210` estimate at the time of verification.

Key commits:

- `521ba1e` — Rename site and fix static estimate calculator
- `401edfb` — Bust cached calculator script

### Calculator service-option correction

Requested:

- Diagnose and repair the calculator after it appeared not to work.

Cause and landed fix:

- The form displayed nine cleaning services plus `Other`, but `pricing_rules.json` supported only four services. Unsupported selections could never return an estimate.
- Limited the instant-estimate selector to the four services with configured business pricing: Airbnb/Vacation Rental, Standard Home, Deep, and Move Out cleaning.
- Removed the unreachable custom-service field and its JavaScript branch.
- Bumped the calculator script URL to `script.js?v=3` so GitHub Pages visitors do not combine the new form with cached older JavaScript.
- Kept the pricing rates unchanged rather than inventing prices for unsupported services.

Follow-up correction:

- A screenshot showed the site was being opened directly from `index.html` on macOS rather than through a web server. Safari blocks `fetch('./pricing_rules.json')` from a `file://` page, which caused the visible `Load failed` message.
- Embedded a matching fallback copy of the approved pricing rules in `script.js`. The calculator now works when opened as a local file and when hosted; the hosted version still loads `pricing_rules.json` when available.
- Bumped the deployed script URL to `script.js?v=4`.

### Cleaning-only focus

Requested:

- Remove landscaping and focus the business website on home cleaning.
- Make the upper-left logo slightly larger.

Landed:

- Removed landscaping from the hero tagline, introductory copy, service cards, and quote-form options.
- Reworded the introduction around recurring upkeep and deep cleaning.
- Expanded the home-cleaning service card to the full section width.
- Increased the upper-left brand-mark and wordmark sizes on desktop and mobile.

Key commit:

- `c05c789` — Focus website on home cleaning

### Final logo treatment

Requested and refined:

- Match the app logo.
- After reviewing the supplied screenshot, use only `SC`—not `S&C` and not `D`—inside a circle.

Final landed state:

- The upper-left website mark reads `SC` with no ampersand.
- It uses a transparent background and simple circular outline.
- The adjacent company name remains **Steadfast & Co.**, with **Cleaning** beneath it.
- The footer retains its existing full brand treatment.

Key commits:

- `d1be2f1` — Intermediate `D` logo version; superseded by the correction below
- `a71a035` — Correct header logo to SC monogram

## Internal team app (`home_clean_internal_app`)

### Product direction

Requested:

- Provide an inexpensive app-like way for approximately 10 cleaners and the owner to coordinate 3–5 jobs per day.
- Let owners post jobs and notify employees.
- Let employees accept or reject work, with the first acceptance winning.
- Make it installable on iPhone and Android without App Store or Google Play approval.

Decision:

- Build an installable Progressive Web App (PWA).
- Use Vercel for eventual hosting, Supabase for authentication/database/realtime behavior, and Web Push for notifications.
- Employees will install the hosted URL with **Add to Home Screen** / **Install app**.

### Work-board features

Landed:

- Mobile-first employee job feed with pay, schedule, city, ZIP code, square footage, occupancy, arrival window, and task details.
- Owner dashboard for creating and tracking work blocks.
- Reusable owner job templates.
- Owner ability to remove an assignment and return work to the available pool.
- Atomic first-accept-wins claim function to prevent two employees from winning the same job.
- Realtime job updates.
- Exact address, access codes, and private notes hidden until an employee accepts.
- Owner in-app notifications and queued email notification when a job is accepted.
- Employee registration/onboarding with English and Spanish options.
- Employee directory, profile details, standing/performance fields, payment totals, and activation/deactivation controls.
- First and last names stored separately; date-of-birth support was added but is not required for temporary pilot accounts.
- PWA manifest, service worker, installed-app icon, and push-subscription controls.

Key commits:

- `11280cf` — Build first-accept cleaning work MVP
- `967c879` — Add owner job templates
- `9deca4d` — Add owner work unassignment
- `68b31f2` — Add occupancy and arrival window details
- `0d6e473` — Add property details and claim alerts
- `15e6ab2` — Add employee registration and directory
- `8286dda` — Add employee activation controls
- `62fb168` — Split employee names and add birth date

### Four-account Supabase pilot

Requested:

- Stand up two owner accounts and two temporary employee accounts before cleaners are hired.

Landed:

- Connected the app source to Supabase authentication, database records, realtime updates, and Web Push code.
- Added a controlled `pilot:bootstrap` script for two owners and two temporary employees.
- Added environment-variable templates and setup/deployment instructions.
- Created a safe legacy migration that preserves the two existing profiles and maps:
  - `admin` → `owner`
  - `cleaner` → `employee`
- Corrected the legacy role constraint before applying the role conversion.
- The migration was reported successful in Supabase.
- Connected the local app to the real Supabase project using public values in `.env.local`; this private file is excluded from GitHub.

Do not place the Supabase service-role key, database password, account password, VAPID private key, or pilot password in GitHub or browser-visible variables.

Key commits:

- `d27addb` — Connect pilot app to Supabase and web push
- `57274be` — Add safe migration for legacy Supabase profiles
- `cadde2f` — Replace legacy profile role constraint during migration

### App branding

Requested and refined:

- Remove the **Private Work Board** label.
- Replace **Desert Home** with **Steadfast & Co.** and the **Cleaning** subtitle.
- Match the public website logo.
- Change the monogram from `S&C` to `SC` and use the same clean font as the company name.
- Change the authentication button color to `#D5BDAF`.

Final landed state:

- Header, login, password recovery, employee registration, metadata, manifest, and installed icon use Steadfast & Co. Cleaning branding.
- The circular monogram reads `SC` everywhere.
- Authentication buttons use `#D5BDAF` with dark-green text.

Key commits:

- `04bd642` — Refresh app branding for Steadfast & Co.
- `0549f21` — Match app logo to website branding
- `bedeac4` — Update authentication button color
- `006ab79` — Align logo monogram typography
- `fcd812b` — Simplify logo monogram to SC

### Password recovery

Requested:

- Add a **Forgot password?** option.
- Fix recovery links that returned to the login screen instead of allowing a new password.

Landed:

- Added a reset-email form, confirmation state, new-password screen, password confirmation, and minimum-length validation.
- Added recovery-intent detection for Supabase link formats.
- New reset links include `?recovery=1`, preventing the app from losing recovery state during startup.
- Supabase local testing requires the Site URL and Redirect URL to match the local port (previously `http://localhost:3001/**`). Production must use the final hosted URL instead.

Known operational note:

- Supabase's built-in email sender reached its authentication-email rate limit during testing. Wait for the limit to reset for short-term testing. Configure custom SMTP (for example, Resend or SendGrid) before production use.

Key commits:

- `17d5cac` — Add Supabase password recovery flow
- `0f2a97e` — Fix password recovery link handling

## Current landing point

### Public website

- Cleaning-only public site is committed to `main` and served through GitHub Pages.
- Calculator is functional.
- Final upper-left logo is the outlined circular `SC` monogram.

### Internal app

- Application source, Supabase integration, migration, branding, and password recovery are committed to `main`.
- Local Supabase-connected testing has worked.
- The code has passed lint and production builds at the noted implementation milestones.
- The app is not yet recorded as publicly deployed to Vercel.
- Production Web Push credentials, employee phone testing, permanent Supabase redirect URLs, and custom SMTP still need completion or confirmation.

## Reproduction checklist

1. Clone both repositories.
2. For the website, serve `home_clean/index.html` with a static web server or enable GitHub Pages from `main`.
3. For the app, install dependencies and copy `.env.example` to `.env.local`.
4. Create or select the Supabase project.
5. Run `supabase/schema.sql` for a new database, or `supabase/upgrade_legacy_schema.sql` for the older `admin`/`cleaner` database.
6. Add the Supabase public URL/key to client variables and keep all privileged values server-side.
7. Configure the two owners and two temporary employees, then run `npm run pilot:bootstrap` if accounts need to be created.
8. Generate VAPID keys and configure Web Push.
9. Run `npm run dev`, then test both owners and both employees.
10. Confirm simultaneous acceptance allows only one winner and hides private property information from everyone else.
11. Deploy the app to Vercel and copy the production environment variables there.
12. Add the permanent Vercel/custom-domain URL to Supabase Site URL and Redirect URLs.
13. Configure custom SMTP and the optional Resend claim-email function/webhook.
14. Install the PWA on an iPhone and Android phone, enable notifications, and complete an end-to-end pilot.

## Maintenance rule

Append future requests to this file with:

- Date
- Repository
- Request
- Final landed behavior
- Commit hash
- Any remaining setup or known limitation

Do not store passwords, secret keys, private employee data, or access codes in this file.
