# 🚀 PW Global CRM - Team Lead & Demo Management System

A clean, modern, fully-working web-hosted CRM built specifically for educational counselling and sales teams. Featuring **individual counsellor logins**, **Google Sheets 2-way sync**, **multi-sheet management with round-robin assignment**, **1-on-1 demo session scheduling**, and **direct WhatsApp follow-up reminders**.

---

## 🌟 Key Features

1. **Individual Team Logins & Roles**
   - **Admin Access**: Comprehensive analytics, counsellor activity logs, lead assignment rules, multi-sheet configuration, and team management.
   - **Counsellor Workstation**: Personal pipeline showing only their assigned leads, daily callback schedule, upcoming demo sessions, and quick actions.

2. **Clean & High-Efficiency UI**
   - Instant search across student names, phone numbers, courses, and notes.
   - Pipeline filter pills (`All`, `New Lead`, `In Follow-up`, `Demo Booked`, `Demo Attended`, `Enrolled 🎉`, `Lost`).
   - Quick toggles for **Starred / Important Leads**, **Due Today**, and **Overdue Follow-ups**.
   - Switch between **Visual Card View** and **Compact Data Table View**.

3. **Counsellor Call & Demo Booking Scenario**
   - **Call Disposition & Notes**: Log call details and notes directly from the lead drawer.
   - **Book Demo Session**: One-click action to schedule Date, Time, Topic, and Google Meet/Zoom link.
   - **Automatic Stage Transition**: When a demo is booked, the lead stage automatically moves to `Demo Booked`.
   - **Automatic Google Sheets Sync**: All stage changes, notes, and demo session details automatically write back to the corresponding row in your Google Sheet!

4. **Direct WhatsApp Reminders & Alerts**
   - **Reminder to Counsellor's WhatsApp**: With 1 click, counsellors can send an instant summary of an upcoming callback or demo session directly to their own WhatsApp number.
   - **Student WhatsApp Messaging**: Pre-composed templates for Demo Booked confirmation, 1-Hour Demo Reminder, and follow-up brochures with 1-click launch into WhatsApp Web/Desktop/Mobile.

5. **Multi Google Sheets Management**
   - Connect **unlimited Google Sheets** (e.g. JEE Batch Sheet, NEET Foundation Sheet, Regional Campaigns).
   - **Automated Lead Distribution**: Choose between **Round-Robin** (auto-distributes leads evenly across active counsellors), **Specific Counsellor Assignment**, or an **Unassigned Pool**.
   - **2 Sync Modes Supported**:
     - *Mode 1 (Instant 30-sec Setup)*: Copy-paste the auto-generated **Google Apps Script** snippet directly into Google Sheets (no Google Cloud credentials needed!).
     - *Mode 2 (Direct API)*: Paste Google Cloud Service Account JSON for direct background read/write.

---

## 🔑 Default Login Credentials

The CRM comes pre-seeded with realistic sample leads, sheets, and active accounts:

| Role | Name | Email | Password | WhatsApp Number |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Admin Manager | `admin@crm.com` | `admin123` | +91 9876543210 |
| **Counsellor** | Rahul Sharma | `rahul@crm.com` | `counsellor123` | +91 9876543211 |
| **Counsellor** | Priya Patel | `priya@crm.com` | `counsellor123` | +91 9876543212 |
| **Counsellor** | Amit Verma | `amit@crm.com` | `counsellor123` | +91 9876543213 |

*(Quick-login buttons are also available on the login page for instant 1-click access!)*

---

## 🚀 Quick Start (Run Locally)

### 1. Install & Build
```bash
# In the root folder
npm install
npm run build
```

### 2. Start the Server
```bash
npm start
```
Open your browser and navigate to: **`http://localhost:5000`**

---

## 🌐 Web Hosting & Deployment Guide

This application is ready to be hosted on any cloud provider with zero additional configuration:

### Option A: 1-Click Deploy on Render (Recommended)
1. Push this repository to GitHub or GitLab.
2. In [Render.com](https://render.com), click **New** → **Blueprint** and select your repository (it automatically detects `render.yaml`).
3. Render will automatically build the frontend and launch the Node.js server.

### Option B: Deploy on Railway / Heroku
- The repository includes a `Procfile` (`web: node server/index.js`).
- Simply link your Git repository to [Railway](https://railway.app) and set `PORT=5000`.

### Option C: Docker Container
```bash
docker build -t pw-crm .
docker run -p 5000:5000 -d pw-crm
```

---

## 📊 Google Sheets 2-Way Sync Setup

### 30-Second Google Apps Script Setup (No API Keys Needed)
1. In the CRM, go to **Google Sheets** (Admin view).
2. Click **Connect Google Sheet** and enter your Sheet Name and Spreadsheet ID/URL.
3. On the connected sheet card, click **Apps Script Webhook**.
4. In your Google Spreadsheet, open **Extensions** → **Apps Script**.
5. Paste the generated code and click **Save**.
6. Run `setupTriggers` once.
7. Done! Any row added or edited in Google Sheets will immediately appear in the CRM, and counsellor updates in the CRM will sync right back.

---

## 📱 WhatsApp Follow-Up Reminders

- Each counsellor can verify or change their WhatsApp phone number under **Profile & Settings** (top-right menu).
- On any lead card or detail drawer:
  - Click **"WhatsApp Me Reminder"** to open WhatsApp with a ready-made lead briefing: student name, phone, course, stage, and scheduled callback time.
  - Click **"WhatsApp Student"** to choose from pre-formatted templates (Demo Booked confirmation, 1-Hour Reminder, or Course Brochure).
