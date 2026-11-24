# Dayax Electronics POS

React + Vite + Supabase. Barcode checkout (Pozone BS430), discounts, warranty, receipts, cash in Somaliland shillings with change, refunds/returns, daily expenses, English/Somali, products, staff login, sales dashboard.

## Supabase (once)
1. SQL Editor: run `sql/1-schema.sql`, `sql/2-schema2.sql`, `sql/3-schema3.sql`, then `sql/4-schema4.sql` (in this order).
2. Authentication > Users > Add user (tick Auto Confirm). This is the staff login.
3. Authentication > Sign In / Providers > Email: turn OFF "Allow new users to sign up".
4. If you see "permission denied" before step 3 of the SQL, run:
   grant usage on schema public to anon, authenticated;
   grant select, insert, update, delete on products, sales, sale_items to anon, authenticated;

## Run on a laptop
    npm install
    copy .env.example to .env and fill in the two values (optional: without it the app asks on first open)
    npm run dev

## Deploy
- Upload the contents of `dist/` (or rebuild with `npm run build`) to Netlify or Cloudflare Pages.
- Or push to GitHub and import into Vercel (add the two VITE_ variables).
- With no .env values, the site shows a first-time setup screen for the Supabase URL and anon key (saved on that device).

## Files
- `src/App.jsx` - the whole app (login, checkout, products, dashboard, receipt)
- `sql/` - database scripts, run in order
- `dist/` - ready-to-upload build

## Exchange rate
The app shows prices in USD and takes cash in Somaliland shillings. Set today's rate with the button in the top bar (1 USD = ... SlSh). It is stored in the database and shared by every computer.
