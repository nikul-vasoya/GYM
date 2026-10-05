# Deployment Cost Estimate (1 Gym)

Rough monthly cost of running the Gym Management app in production for a
**single gym**.

> Prices are approximate. Providers change their plans often, so check the
> pricing pages before you buy anything.

## What needs hosting

| Part | Tech | Needs |
|------|------|-------|
| Frontend | React (Vite) static build (`client/`) | Static file hosting |
| Backend | Node.js / Express API (`server/`) | Always-on Node process |
| Database | MongoDB (Mongoose) | MongoDB Atlas |
| File storage | One gym logo (max 1 MB), saved to local disk under `/uploads/logos/` | Persistent disk |

## Is the 512 MB free database enough?

**Yes, easily.** MongoDB Atlas M0 (free) gives 512 MB.

Estimate for one gym, including indexes:

| Data | Assumption | Size |
|------|------------|------|
| Members | 500 members (~1.5 KB each) | ~0.75 MB |
| Expenses | 30 per month × 12 months (~0.5 KB each) | ~0.2 MB/year |
| Gym, Users, Packages, Theme | a few records | < 0.1 MB |
| **Total** | | **~1–2 MB per year** |

At this rate, one gym uses **less than 1% of the 512 MB** after several years.
Storage will not be a problem.

**Limits of the free M0 tier to keep in mind:**
- **No automatic backups.** Export data yourself on a schedule (`mongodump`).
- Shared CPU/RAM. This is fine for one gym's staff using the app.
- Pick a region near the gym (e.g. Mumbai `ap-south-1` for India).

## Important: logo upload

The logo is written to the server's local disk. Most free and cheap hosts
(Render, Railway) have **temporary disks**, so the logo disappears on every
redeploy or restart. With one gym, the simplest fixes are:

1. Use a host with a persistent disk (Option B below); or
2. Re-upload the logo after each deploy; or
3. Move logo storage to Cloudinary's free tier (needs a small code change).

## Cost options

### Option A: Free (testing / demo)

| Part | Provider | Cost |
|------|----------|------|
| Frontend | Vercel / Netlify / Cloudflare Pages | $0 |
| Backend | Render free web service | $0 |
| Database | MongoDB Atlas M0 (512 MB) | $0 |
| **Total** | | **$0/month** |

Downside: Render free sleeps after 15 minutes idle, so the first request
takes 30–60 s to wake up. The logo is lost on redeploy.

### Option B: Small VPS (recommended)

One small VPS runs both the frontend (Nginx) and backend. The disk is
persistent, so the logo works with no code change.

| Part | Provider | Cost |
|------|----------|------|
| VPS (1 GB RAM) | Hetzner / DigitalOcean / Hostinger / AWS Lightsail | ~$4–6 |
| Database | MongoDB Atlas M0 | $0 |
| SSL | Let's Encrypt | $0 |
| Domain (`.com` / `.in`) | ~$10–15/year | ~$1 |
| **Total** | | **~$5–7/month (≈ ₹400–600)** |

Downside: you manage the server yourself (updates, Nginx, PM2, SSL renewal).

### Option C: Managed hosting (no server management)

| Part | Provider | Cost |
|------|----------|------|
| Frontend | Vercel / Netlify / Cloudflare Pages | $0 |
| Backend | Render Starter (always on) | ~$7 |
| Logo disk | Render persistent disk (1 GB) | ~$0.25 |
| Database | MongoDB Atlas M0 | $0 |
| Domain | | ~$1 |
| **Total** | | **~$8–9/month (≈ ₹650–750)** |

## Other costs

- **Email (password reset):** Resend or Brevo free tiers are more than enough
  for one gym. $0.
- **Monitoring:** UptimeRobot free tier. $0.

## Recommended setup: AWS Lightsail (INR)

Option B on AWS Lightsail, 1 GB RAM plan. Assumes ~₹88 per USD. AWS bills
Indian accounts with 18% GST.

| Item | Monthly | Yearly |
|------|---------|--------|
| Lightsail 1 GB plan ($5) | ₹440 | ₹5,280 |
| GST 18% | ₹80 | ₹950 |
| MongoDB Atlas M0 (512 MB) | ₹0 | ₹0 |
| SSL (Let's Encrypt) | ₹0 | ₹0 |
| Email (Resend / Brevo free) | ₹0 | ₹0 |
| Domain (`.in` ~₹800/yr or `.com` ~₹1,200/yr) | ₹70–100 | ₹800–1,200 |
| **Total** | **≈ ₹590–620** | **≈ ₹7,000–7,500** |

Lightsail's price already includes the public IP, a 40 GB SSD (the logo is
kept) and 2 TB of data transfer, which is far more than one gym needs. Some
plans give the first 3 months free.

## Recommendation

- Use the **free 512 MB Atlas database**. One gym will not come close to
  filling it.
- Host on **Option B (~₹400–600/month)**, or **Option C (~₹650–750/month)**
  if you don't want to manage a server.
- Set up a weekly `mongodump` backup, since M0 has no backups.
- Yearly total: **about ₹5,000–9,000**, including the domain.
- Revisit this plan only when you add more gyms.
