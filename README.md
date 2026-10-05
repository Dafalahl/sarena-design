# 🎨 Sarena Design

> **The premier escrow marketplace for top-tier creators, illustrators, and designers.**

Sarena Design is a modern web application that bridges the gap between digital creators and clients. By integrating a secure, admin-validated **Escrow (Rekber)** payment system, it guarantees that clients only pay for successfully completed work, and creators are guaranteed payment once their work is approved.

---

## 🧭 How Sarena Escrow (Rekber) Works

Sarena utilizes a secure transactional workflow powered by **Xendit Payments** and **Supabase Database**:

```
[ Client ] --(1. Hire Creator)--> [ Sarena DB (Pending) ]
                                          |
                                 (2. Creates Invoice)
                                          v
[ Xendit Checkout Page ] <--(3. Redirects Client)
      |
(4. Client Pays)
      v
[ Xendit Webhook Callback ]
      |
      +--(5. Validates Callback Token)
      v
[ Sarena Webhook Handler ] --(6. Service Role Bypass)--> [ Sarena DB (Escrow) ]
                                                                 |
                                                      (7. Creator Works)
                                                                 v
[ Sarena Admin Escrow Panel ] --(8. Admin Releases Funds)--> [ Sarena DB (Released) ]
                                                                 |
                                                       (9. Creator Gets Paid)
```

1. **Hire**: A client discovers a creator's profile and clicks **"Hire via Escrow"**.
2. **Pending Order**: Sarena creates an order in the database with status `pending` and requests a 24-hour payment invoice from Xendit (including a **10% Sarena platform fee**).
3. **Redirect**: The client is redirected to Xendit's hosted checkout page to complete the payment.
4. **Paid & Escrowed**: Once paid, Xendit calls Sarena's secure webhook endpoint. Sarena updates the order status to `escrow`. The funds are now legally held in escrow by Sarena.
5. **Execution**: The creator works on the project.
6. **Release**: Upon completion and verification, an Administrator uses the **Admin Escrow Panel** to release the funds, updating the status to `released` and initiating payout to the creator.

---

## ✨ Key Features

*   **OAuth Authentication**: Seamless login and signup with Google using Supabase Auth.
*   **Talent Discovery**: Public explorer showing verified creators, bios, base rates, and portfolio summaries.
*   **Dynamic Profile Setup**: Creators can customize their display name, bio, Behance/ArtStation portfolio links, and base IDR rates. Doing so upgrades their account role to `creator`.
*   **Secure Payment Invoices**: Real-time integration with Xendit to produce short-lived invoices with transaction emails.
*   **Webhook Synchronizer**: High-reliability webhook listener verifying signature tokens before modifying order states.
*   **Admin Control Panel**: Restricted area allowing admins to review all escrowed transactions and issue releases.

---

## 🛠️ Tech Stack

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Components)
*   **Database & Auth**: [Supabase](https://supabase.com/) (Postgres DB, Go-OAuth, Row Level Security, Triggers)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
*   **Payment Gateway**: [Xendit API](https://www.xendit.co/)
*   **Validation**: [Zod](https://zod.dev/) & [React Hook Form](https://react-hook-form.com/)

---

## 📁 Directory Structure

```
sarena-design/
├── setup.sql                 # Supabase database setup script (Schema, Triggers, RLS)
├── package.json              # Project dependencies & npm scripts
├── next.config.mjs           # Next.js configurations
├── public/                   # Static assets & icons
└── src/
    ├── app/
    │   ├── page.jsx          # Landing page with interactive mockups
    │   ├── login/            # Google OAuth authentication trigger
    │   ├── explore/          # Public catalog of creators
    │   ├── creator/[id]/     # Detail/portfolio view of a creator
    │   ├── order/[id]/       # Escrow summary and Xendit checkout initiator
    │   ├── dashboard/        # Customer & Creator statistics and order lists
    │   │   ├── profile/      # Creator profile activation page
    │   │   └── layout.jsx    # Dashboard sidebar navigation
    │   ├── admin/escrow/     # Administrative panel to release escrow funds
    │   └── api/
    │       ├── checkout/     # Server endpoint creating orders & Xendit invoices
    │       ├── admin/release/# Admin restricted endpoint updating order status
    │       └── webhook/xendit# Raw callback receiver modifying paid orders
    ├── components/
    │   ├── ui/               # Reusable styled UI pieces (buttons, cards, inputs)
    │   ├── Navbar.jsx        # Top navigational header
    │   └── Footer.jsx        # Project bottom footer
    ├── lib/
    │   ├── supabase.js       # Client-side Supabase wrapper
    │   ├── supabaseServer.js # Server-side Supabase wrapper (reads cookies)
    │   └── utils.js          # Tailwind class-merging helper
```

---

## 🗄️ Database Architecture

Sarena relies on three main Postgres tables in the `public` schema of Supabase. The database layout is automatically provisioned by running the [setup.sql](file:///run/media/kaky/programming/projects/sarena-design/setup.sql) file.

### Tables

1.  **`users`**:
    *   `id` (UUID, Primary Key): References `auth.users(id)` in Supabase Auth.
    *   `email` (Text): The user's email address.
    *   `full_name` (Text): Display name from Google OAuth.
    *   `avatar_url` (Text): User profile picture.
    *   `role` (Text): User access level (`client`, `creator`, or `admin`). Defaults to `client`.

2.  **`profiles`**:
    *   `id` (UUID, Primary Key): References `public.users(id)`.
    *   `username` (Text, Unique): Public creative handle (e.g. `@alexdesigns`).
    *   `bio` (Text): Creator's professional description.
    *   `portfolio_url` (Text): Link to portfolio website.
    *   `price_base` (Integer): Starting price for a standard project in IDR.
    *   `is_verified` (Boolean): Boolean checked by administrators to verify creator authenticity.

3.  **`orders`**:
    *   `id` (UUID, Primary Key): Autogenerated transaction ID.
    *   `client_id` (UUID): References buying user.
    *   `creator_id` (UUID): References hiring profile.
    *   `amount` (Integer): Total charged amount (base price + 10% platform fee).
    *   `status` (Text): Project stage (`pending`, `escrow`, `released`, `refunded`).
    *   `xendit_invoice_id` (Text): Reference invoice ID from Xendit.
    *   `xendit_external_id` (Text): Invoice identification callback token.

### Automated Sync Trigger

Upon user registration via Google OAuth, a PostgreSQL trigger function automatically replicates the user into the `public.users` table:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    'client'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ⚙️ Environment Variables

Create a file named `.env.local` in the root of the project and populate it with the following values:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Xendit Payment Integration
XENDIT_SECRET_KEY=xnd_development_...
XENDIT_CALLBACK_TOKEN=callback_token_from_xendit_dashboard

# App Settings
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> ⚠️ **Security Warning**: `SUPABASE_SERVICE_ROLE_KEY` and `XENDIT_SECRET_KEY` contain sensitive permissions. Never expose them client-side (do not prefix them with `NEXT_PUBLIC_`).

---

## ⚡ Setup & Deployment

### 1. Supabase Initialization
1.  Go to the [Supabase Dashboard](https://supabase.com/) and create a new project.
2.  Navigate to the **SQL Editor** tab in the sidebar.
3.  Click **New Query**, paste the entire contents of [setup.sql](file:///run/media/kaky/programming/projects/sarena-design/setup.sql), and click **Run**.
4.  Copy your **Project URL** and **API Keys** from Project Settings > API and paste them into `.env.local`.

### 2. Xendit Webhook Setup
1.  Sign in to your [Xendit Dashboard](https://dashboard.xendit.co/) (Sandbox/Development mode recommended first).
2.  Go to **Developers** > **Webhooks**.
3.  Locate the section for **Invoice Paid** notification.
4.  Set your Webhook URL to: `https://your-domain.com/api/webhook/xendit` (Use services like `ngrok` to expose your local port `3000` during development).
5.  Copy the **Callback Token** and paste it as `XENDIT_CALLBACK_TOKEN` in your environment config.

### 3. Local Development Start
Install project dependencies and start the development server:

```bash
# Install dependencies
npm install

# Start Next.js server
npm run dev
```

Your server will be running at [http://localhost:3000](http://localhost:3000).

---

## 🔐 Creating an Admin User
By default, all new users are given the `client` role. To test the **Admin Escrow Panel** locally:
1.  Sign in to Sarena once using your Google account to initialize your record.
2.  Open your Supabase **SQL Editor**.
3.  Run this query to upgrade your account to administrator:
    ```sql
    UPDATE public.users 
    SET role = 'admin' 
    WHERE email = 'your-google-email@gmail.com';
    ```
4.  Refresh your Sarena Dashboard. The sidebar will now display the **Admin Escrow Panel**.
