# Deploying booking-crm-vercel to Vercel (Forever Storage & Login)

Follow these simple steps to deploy your multi-user web application to **Vercel** with **Forever 10-Year Logins** and **Permanent Cloud Database Storage** so data is never reset or lost!

---

## Step 1: 1-Click Deployment via Vercel CLI (Fastest)

1. Open your terminal inside this project folder:
   ```bash
   cd C:\Users\NIladri\.gemini\antigravity\scratch\booking-crm-vercel
   ```

2. Run Vercel CLI command:
   ```bash
   npx vercel
   ```

3. Follow the terminal prompts:
   - **Set up and deploy?** Type `Y` and press Enter.
   - **Which scope?** Select your Vercel account.
   - **Link to existing project?** Type `N`.
   - **What's your project's name?** Press Enter (`booking-crm-vercel`).
   - **In which directory is your code located?** Press Enter (`./`).

4. Your live Vercel URL will be generated instantly (e.g. `https://booking-crm-vercel.vercel.app`)!

---

## Step 2: Enable Permanent Cloud Storage on Vercel (Takes 20 Seconds - 100% Free)

Vercel functions run in the cloud as serverless functions. To ensure user accounts and booking records are saved **permanently forever** across server restarts:

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click on your `booking-crm-vercel` project.
3. Click on the **Storage** tab ➔ Click **Create Database** ➔ Select **KV** (Vercel KV / Upstash Redis).
4. Click **Create** and select **Connect to Project** (`booking-crm-vercel`).
5. Click **Redeploy** on Vercel!

🎉 **Done!** Your users' login credentials and booking ledgers will now be saved **forever** in Vercel's Cloud Database with 10-year login cookies!

---

## Features for Your Users:
- ♾️ **10-Year "Stay Logged In" Sessions**: Login tokens are saved for 10 years so users never have to keep re-entering passwords.
- 👥 **Multi-User Privacy**: Users log in to their own private dashboard.
- 👑 **Admin Super View**: Toggle `👑 Admin Super Access` to view and manage all users' records.
- 📊 **Light Google Sheets UI**: Native Google Sheets look with Indian Rupees (₹), Preset Discounts (50–200 & Group Offers 4/6/8), Token Info, and Excel `.xlsx` exports.
