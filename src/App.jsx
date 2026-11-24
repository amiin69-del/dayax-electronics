import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { createClient } from "@supabase/supabase-js";

// Connection: build-time env vars if present, otherwise the values saved on this device by the setup screen
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};
const SB_URL = import.meta.env.VITE_SUPABASE_URL || store.get("sb_url");
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || store.get("sb_key");
const supabase = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY) : null;

const SHOP = "Dayax Electronics";
const money = (n) => "$" + Number(n).toFixed(2);
const slsh = (n) => Math.round(Number(n)).toLocaleString("en-US");
// Cash due in Somaliland shillings, rounded to the nearest 100
const toSlsh = (usd, rate) => Math.round((usd * rate) / 100) * 100;
const todayKey = () => new Date().toLocaleDateString("en-CA");
const shortId = (id) => String(id).slice(0, 8).toUpperCase();

// Effective unit price: the new (discount) price if typed, otherwise the list price
const priceOf = (i, rate) => {
  const v = i.newPrice;
  if (v === "" || isNaN(Number(v)) || Number(v) < 0) return i.listPrice;
  // a new price typed in shillings is converted to dollars with the exchange rate
  if (i.newCur === "SLSH") return rate ? Math.round((Number(v) / rate) * 100) / 100 : i.listPrice;
  return Number(v);
};

const warrantyUntil = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString("en-GB");
};

function beep(ok) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    o.frequency.value = ok ? 880 : 220;
    o.connect(ctx.destination);
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, ok ? 90 : 250);
  } catch {}
}

// The scanner types the barcode very fast and presses Enter. Slow typing is ignored.
function useBarcodeScanner(onScan) {
  const cb = useRef(onScan);
  cb.current = onScan;
  useEffect(() => {
    let buffer = "";
    let last = 0;
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const now = Date.now();
      if (now - last > 80) buffer = "";
      last = now;
      if (e.key === "Enter") {
        if (buffer.length >= 6) cb.current(buffer);
        buffer = "";
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
}

// A normal text/number field that ignores scanner bursts (many characters typed within a few ms).
// Humans type slower than ~50ms per key, so a fast burst is reverted and its Enter is blocked.
function GuardedInput({ value, onValue, onKeyDown, ...props }) {
  const last = useRef(0);
  const base = useRef(value);
  return (
    <input
      {...props}
      value={value}
      onChange={(e) => {
        const now = Date.now();
        const gap = now - last.current;
        last.current = now;
        if (gap > 50) {
          base.current = value;
          onValue(e.target.value);
        } else {
          onValue(base.current);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && Date.now() - last.current < 50) {
          e.preventDefault();
          return;
        }
        if (onKeyDown) onKeyDown(e);
      }}
    />
  );
}

/* ------------------------------ Languages (English / Somali) ------------------------------ */

const DICT = {
  en: {
    checkout: "Checkout", products: "Products", sales: "Sales", expenses: "Expenses", dashboard: "Dashboard",
    signOut: "Sign out", staffSignIn: "Staff sign in", email: "Email", password: "Password",
    signIn: "Sign in", signingIn: "Signing in…", loading: "Loading…",
    setupText: "First-time setup. Paste your Supabase project URL and anon key. They are saved on this device only.",
    anonKey: "Anon key", saveContinue: "Save and continue",
    searchPh: "Search by name, or type a barcode and press Enter",
    scanStart: "Scan a product to start the sale.",
    newPrice: "New price",
    warrantyMo: (n) => `Warranty ${n} mo`,
    hintEnter: "Typed a new price? Press Enter before scanning the next item.",
    items: (n) => (n === 1 ? "1 item" : `${n} items`),
    discountGiven: "Discount given", completeSale: "Complete sale", cancelSale: "Cancel sale",
    noProduct: (c) => `No product with barcode ${c}.`, addThisProduct: "Add this product",
    dbError: "Database error: ", saleFailed: "Sale failed: ",
    payTitle: "Take payment", totalDue: "Total due", custPaid: "Customer paid (SlSh)",
    exact: "Exact amount", change: "Change to give back", short: (x) => `Short by ${x} SlSh`,
    confirmSave: "Confirm and save sale", back: "Back",
    rateNeeded: "Set the exchange rate first", rateLabel: "1 USD =", saveRate: "Save rate",
    setRate: "Set exchange rate", edit: "Edit", save: "Save", cancel: "Cancel",
    addProduct: "Add product", barcode: "Barcode", name: "Name", priceUsd: "Price ($)", stock: "Stock",
    warrantyLabel: "Warranty (months, 0 = none)", saveProduct: "Save product", scanOrType: "Scan or type",
    filterPh: "Filter by name or barcode", countOf: (a, b) => `${a} of ${b} products`,
    noProducts: "No products yet. Scan one and fill in the form.", price: "Price", warranty: "Warranty",
    delete: "Delete", barcodeExists: "This barcode already exists.",
    numTooLarge: "A number is too large. Check price, stock and warranty.",
    saved: (n) => `Saved ${n}`, updated: "Product updated", deleted: (n) => `Deleted ${n}`,
    confirmDelete: (n) => `Delete "${n}"? Past sales are kept.`,
    today: "Today", days7: "7 days", days30: "30 days",
    revenue: "Revenue (after refunds)", salesCount: "Sales", itemsSold: "Items sold", avgSale: "Average sale",
    discounts: "Discounts given", refundsLabel: "Refunds", expensesLabel: "Expenses",
    netLabel: "Left after expenses", rateMissing: "Set the exchange rate to see this",
    perDay: "Revenue per day", topProducts: "Top products", sold: (n) => `${n} sold`,
    lowStock: "Low stock (3 or less)", nothingLow: "Nothing is running low.",
    noSalesPeriod: "No sales in this period.", recentSales: "Recent sales",
    searchReceipt: "Search receipt number", receiptBtn: "Receipt", refundBtn: "Refund / return",
    refundedTag: (x) => `Refunded ${x}`, soldQty: "Sold", returnedQty: "Returned", returnQty: "Return",
    restockLabel: "Put items back in stock", refundAmount: "Refund amount", giveBack: "Give the customer",
    confirmRefund: "Confirm refund", nothingToRefund: "Choose at least one item to return.",
    fullyReturned: "Fully returned", refundDone: (u, s) => (s ? `Refund done: ${u}. Give the customer ${s} SlSh.` : `Refund done: ${u}.`),
    dateLabel: "Date", description: "What was it for?", amount: "Amount", currency: "Currency",
    addExpense: "Add expense", spentDay: "Spent on this day", noExpenses: "No expenses on this day.",
    expSaved: "Expense saved", confirmDelExp: "Delete this expense?", about: "about",
    youSaved: "You saved", total: "TOTAL", paid: "Paid", changeR: "Change", wasPrice: "was",
    warrantyLine: (m, d) => `Warranty: ${m} months, until ${d}`, thanks: (s) => `Thank you for shopping at ${s}`,
    printReceipt: "Print receipt", newSale: "New sale", close: "Close", totalSlsh: "Total (SlSh)",
    hintDelete: "Tap a sale to see its items.",
    paidSlshLbl: "Paid in SlSh", paidUsdLbl: "Paid in USD ($)",
    exactSlsh: "Exact in SlSh", exactUsd: "Exact in USD",
    giveUsdLbl: "Give change in USD ($)", giveSlshLbl: "Give change in SlSh",
    tooMuchUsd: "Too many dollars for this change.",
    paidSlshR: "Paid (SlSh)", paidUsdR: "Paid (USD)", changeUsdR: "Change (USD)", changeSlshR: "Change (SlSh)",
  },
  so: {
    checkout: "Iibka", products: "Alaabta", sales: "Taariikhda iibka", expenses: "Kharashka", dashboard: "Warbixin",
    signOut: "Ka bax", staffSignIn: "Gelitaanka shaqaalaha", email: "Iimeyl", password: "Erayga sirta ah",
    signIn: "Gal", signingIn: "Waa la galayaa…", loading: "Waa la soo raraya…",
    setupText: "Habaynta ugu horreysa. Ku dhaji URL-ka iyo furaha anon ee Supabase. Waxaa lagu kaydinayaa qalabkan oo keliya.",
    anonKey: "Furaha anon", saveContinue: "Kaydi oo sii wad",
    searchPh: "Raadi magaca, ama qor barcode-ka oo riix Enter",
    scanStart: "Iskaan garee alaab si aad iibka u bilowdo.",
    newPrice: "Qiimo cusub",
    warrantyMo: (n) => `Damaanad ${n} bilood`,
    hintEnter: "Qiimo cusub ma qortay? Riix Enter intaadan alaabta xigta iskaanayn.",
    items: (n) => `${n} shay`,
    discountGiven: "Dhimista la bixiyay", completeSale: "Dhammaystir iibka", cancelSale: "Jooji iibka",
    noProduct: (c) => `Alaab barcode ${c} leh lama helin.`, addThisProduct: "Ku dar alaabtan",
    dbError: "Khalad kaydka: ", saleFailed: "Iibku wuu guuldareystay: ",
    payTitle: "Qaado lacagta", totalDue: "Wadarta la bixinayo", custPaid: "Macmiilku wuu bixiyay (SlSh)",
    exact: "Qaddarka saxda ah", change: "Haraaga la celinayo", short: (x) => `Wuu yar yahay ${x} SlSh`,
    confirmSave: "Xaqiiji oo kaydi iibka", back: "Dib u noqo",
    rateNeeded: "Marka hore deji heerka sarrifka", rateLabel: "1 USD =", saveRate: "Kaydi heerka",
    setRate: "Deji heerka sarrifka", edit: "Wax ka beddel", save: "Kaydi", cancel: "Jooji",
    addProduct: "Ku dar alaab", barcode: "Barcode", name: "Magac", priceUsd: "Qiimo ($)", stock: "Kayd",
    warrantyLabel: "Damaanad (bilo, 0 = ma jirto)", saveProduct: "Kaydi alaabta", scanOrType: "Iskaan garee ama qor",
    filterPh: "Ka raadi magac ama barcode", countOf: (a, b) => `${a} ka mid ah ${b} alaab`,
    noProducts: "Weli alaab ma jirto. Iskaan garee mid oo buuxi foomka.", price: "Qiimo", warranty: "Damaanad",
    delete: "Tirtir", barcodeExists: "Barcode-kan hore ayuu u jiray.",
    numTooLarge: "Lambar aad u weyn. Hubi qiimaha, kaydka iyo damaanadda.",
    saved: (n) => `Waa la kaydiyay ${n}`, updated: "Alaabta waa la cusboonaysiiyay", deleted: (n) => `Waa la tirtiray ${n}`,
    confirmDelete: (n) => `Ma tirtirtaa "${n}"? Iibabkii hore waa la hayaa.`,
    today: "Maanta", days7: "7 maalmood", days30: "30 maalmood",
    revenue: "Dakhli (ka dib celinta)", salesCount: "Iibab", itemsSold: "Shay la iibiyay", avgSale: "Celceliska iibka",
    discounts: "Dhimisyada la bixiyay", refundsLabel: "Lacag celin", expensesLabel: "Kharashka",
    netLabel: "Haraaga kharashka ka dib", rateMissing: "Deji heerka sarrifka si aad tan u aragto",
    perDay: "Dakhliga maalin kasta", topProducts: "Alaabta ugu iibsan", sold: (n) => `${n} la iibiyay`,
    lowStock: "Kayd hooseeya (3 ama ka yar)", nothingLow: "Wax yar ma jiraan.",
    noSalesPeriod: "Iib muddadan ma jiro.", recentSales: "Iibkii u dambeeyay",
    searchReceipt: "Raadi lambarka rasiidka", receiptBtn: "Rasiid", refundBtn: "Lacag celin / Soo celin",
    refundedTag: (x) => `La celiyay ${x}`, soldQty: "La iibiyay", returnedQty: "La soo celiyay", returnQty: "Soo celi",
    restockLabel: "Ku soo celi alaabta kaydka", refundAmount: "Lacagta la celinayo", giveBack: "Siiso macmiilka",
    confirmRefund: "Xaqiiji celinta", nothingToRefund: "Dooro ugu yaraan hal shay oo la soo celinayo.",
    fullyReturned: "Dhammaantood waa la soo celiyay", refundDone: (u, s) => (s ? `Celinta waa dhammaatay: ${u}. Macmiilka sii ${s} SlSh.` : `Celinta waa dhammaatay: ${u}.`),
    dateLabel: "Taariikh", description: "Muxuu u ahaa?", amount: "Qaddar", currency: "Lacag",
    addExpense: "Ku dar kharash", spentDay: "Kharashka maalintan", noExpenses: "Kharash maalintan ma jiro.",
    expSaved: "Kharashka waa la kaydiyay", confirmDelExp: "Ma tirtirtaa kharashkan?", about: "qiyaastii",
    youSaved: "Waad badbaadisay", total: "WADARTA", paid: "La bixiyay", changeR: "Soo celin", wasPrice: "waxay ahayd",
    warrantyLine: (m, d) => `Damaanad: ${m} bilood, ilaa ${d}`, thanks: (s) => `Waad ku mahadsan tahay inaad ka iibsatay ${s}`,
    printReceipt: "Daabac rasiidka", newSale: "Iib cusub", close: "Xidh", totalSlsh: "Wadarta (SlSh)",
    hintDelete: "Taabo iib si aad alaabtiisa u aragto.",
    paidSlshLbl: "La bixiyay SlSh", paidUsdLbl: "La bixiyay USD ($)",
    exactSlsh: "SlSh saxda ah", exactUsd: "USD saxda ah",
    giveUsdLbl: "Soo celi USD ($)", giveSlshLbl: "Soo celi SlSh",
    tooMuchUsd: "Doollar aad u badan oo haraaga ah.",
    paidSlshR: "La bixiyay (SlSh)", paidUsdR: "La bixiyay (USD)", changeUsdR: "Soo celin (USD)", changeSlshR: "Soo celin (SlSh)",
  },
};

const LangCtx = createContext({ t: (k) => k, lang: "en", setLang: () => {} });
const useT = () => useContext(LangCtx).t;

/* ------------------------------ Root: login gate ------------------------------ */

export default function App() {
  const [lang, setLangState] = useState(() => store.get("lang") || "en");
  const setLang = (l) => {
    setLangState(l);
    store.set("lang", l);
  };
  const t = (k, ...a) => {
    const v = (DICT[lang] && DICT[lang][k]) ?? DICT.en[k] ?? k;
    return typeof v === "function" ? v(...a) : v;
  };

  return (
    <LangCtx.Provider value={{ t, lang, setLang }}>
      <style>{css}</style>
      {supabase ? <Gate /> : <Setup />}
    </LangCtx.Provider>
  );
}

function LangToggle() {
  const { lang, setLang } = useContext(LangCtx);
  return (
    <div className="langtoggle" role="group" aria-label="Language">
      <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
      <button className={lang === "so" ? "on" : ""} onClick={() => setLang("so")}>SO</button>
    </div>
  );
}

function Setup() {
  const t = useT();
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const save = (e) => {
    e.preventDefault();
    store.set("sb_url", url.trim());
    store.set("sb_key", key.trim());
    window.location.reload();
  };
  return (
    <div className="login">
      <form onSubmit={save}>
        <h1>{SHOP}</h1>
        <p>{t("setupText")}</p>
        <label>
          Supabase URL
          <input required autoFocus placeholder="https://xxxx.supabase.co" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
        <label>
          {t("anonKey")}
          <input required value={key} onChange={(e) => setKey(e.target.value)} />
        </label>
        <button className="go" type="submit">{t("saveContinue")}</button>
      </form>
    </div>
  );
}

function Gate() {
  const t = useT();
  const [session, setSession] = useState(undefined); // undefined = still loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div className="boot">{t("loading")}</div>;
  return session ? <Shop user={session.user} /> : <Login />;
}

function Login() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setErr(error.message);
  };

  return (
    <div className="login">
      <form onSubmit={submit}>
        <div className="loginhead"><LangToggle /></div>
        <h1>{SHOP}</h1>
        <p>{t("staffSignIn")}</p>
        <label>
          {t("email")}
          <input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          {t("password")}
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {err && <div className="loginerr" role="alert">{err}</div>}
        <button className="go" type="submit" disabled={busy}>{busy ? t("signingIn") : t("signIn")}</button>
      </form>
    </div>
  );
}

/* ------------------------------ Exchange rate box ------------------------------ */

function RateBox({ rate, onSave }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState("");

  if (editing) {
    return (
      <div className="ratebox">
        <span>{t("rateLabel")}</span>
        <GuardedInput inputMode="numeric" autoFocus value={v} onValue={(x) => setV(x.replace(/[^0-9]/g, ""))} />
        <span>SlSh</span>
        <button
          className="mini ok"
          onClick={async () => {
            if (v && (await onSave(Number(v)))) setEditing(false);
          }}
        >
          {t("save")}
        </button>
        <button className="mini" onClick={() => setEditing(false)}>{t("cancel")}</button>
      </div>
    );
  }
  return (
    <button
      className={rate ? "ratebtn" : "ratebtn warn"}
      onClick={() => {
        setV(rate ? String(rate) : "");
        setEditing(true);
      }}
    >
      {rate ? `$1 = ${slsh(rate)} SlSh` : t("setRate")}
    </button>
  );
}

/* ------------------------------ Receipt ------------------------------ */

function Receipt({ receipt, closeLabel, onClose }) {
  const t = useT();
  return (
    <div className="modal">
      <div className="paper">
        <h3>{SHOP}</h3>
        <p className="c small">
          {receipt.date.toLocaleString("en-GB")} · #{shortId(receipt.id)}
        </p>
        <hr />
        {receipt.items.map((i, idx) => (
          <div className="rline" key={idx}>
            <div className="row">
              <span>{i.name}</span>
              <b>{money(i.price * i.qty)}</b>
            </div>
            <div className="small">
              {i.qty} × {money(i.price)}
              {i.price !== i.listPrice && <> ({t("wasPrice")} {money(i.listPrice)})</>}
            </div>
            {i.warranty > 0 && <div className="small">{t("warrantyLine", i.warranty, warrantyUntil(i.warranty))}</div>}
          </div>
        ))}
        <hr />
        {receipt.savings > 0 && (
          <div className="row small"><span>{t("youSaved")}</span><span>{money(receipt.savings)}</span></div>
        )}
        <div className="row big"><span>{t("total")}</span><b>{money(receipt.total)}</b></div>
        {receipt.slsh && receipt.slsh.due != null && (
          <>
            <div className="row"><span>{t("totalSlsh")}</span><b>{slsh(receipt.slsh.due)}</b></div>
            {receipt.slsh.paidSlsh > 0 && (
              <div className="row small"><span>{t("paidSlshR")}</span><span>{slsh(receipt.slsh.paidSlsh)}</span></div>
            )}
            {receipt.slsh.paidUsd > 0 && (
              <div className="row small"><span>{t("paidUsdR")}</span><span>{money(receipt.slsh.paidUsd)}</span></div>
            )}
            {receipt.slsh.changeUsd > 0 && (
              <div className="row small"><span>{t("changeUsdR")}</span><span>{money(receipt.slsh.changeUsd)}</span></div>
            )}
            {receipt.slsh.changeSlsh > 0 && (
              <div className="row small"><span>{t("changeSlshR")}</span><span>{slsh(receipt.slsh.changeSlsh)}</span></div>
            )}
          </>
        )}
        <hr />
        <p className="c small">{t("thanks", SHOP)}</p>
      </div>
      <div className="actions no-print">
        <button className="go" onClick={() => window.print()}>{t("printReceipt")}</button>
        <button className="clear" onClick={onClose}>{closeLabel}</button>
      </div>
    </div>
  );
}

/* ------------------------------ Payment (cash in SlSh) ------------------------------ */

function PayModal({ totalUsd, rate, onSaveRate, onConfirm, onClose, busy }) {
  const t = useT();
  const [paidSlsh, setPaidSlsh] = useState("");
  const [paidUsd, setPaidUsd] = useState("");
  const [giveUsd, setGiveUsd] = useState(null); // null = use the suggestion
  const [rateIn, setRateIn] = useState("");

  const due = rate ? toSlsh(totalUsd, rate) : 0;
  const ps = Number(paidSlsh || 0);
  const pu = Number(paidUsd || 0);
  const entered = paidSlsh !== "" || paidUsd !== "";
  // everything is compared in shillings; dollars paid are converted with the rate
  const diff = rate ? ps + pu * rate - due : 0;
  // if the customer paid only in dollars, suggest giving back whole dollars first
  const suggest = rate && diff > 0 && pu > 0 && ps === 0 ? Math.floor(diff / rate) : 0;
  const gu = giveUsd === null ? suggest : Number(giveUsd || 0);
  const giveSlsh = rate ? Math.max(0, Math.round((diff - gu * rate) / 100) * 100) : 0;
  const tooMuch = rate ? gu * rate > diff + 50 : false;
  const ok = !!rate && entered && diff >= 0 && !tooMuch;

  return (
    <div className="modal no-print">
      <div className="dialog">
        <h2>{t("payTitle")}</h2>
        <div className="duebox">
          <span>{t("totalDue")}</span>
          <b>{money(totalUsd)}</b>
          {rate ? <em>{slsh(due)} SlSh</em> : null}
        </div>

        {!rate ? (
          <div className="ratefix">
            <p>{t("rateNeeded")}</p>
            <label>
              {t("rateLabel")} (SlSh)
              <GuardedInput inputMode="numeric" autoFocus value={rateIn} onValue={(x) => setRateIn(x.replace(/[^0-9]/g, ""))} />
            </label>
            <button className="go" disabled={!rateIn} onClick={() => onSaveRate(Number(rateIn))}>{t("saveRate")}</button>
          </div>
        ) : (
          <>
            <div className="dualpay">
              <label>
                {t("paidSlshLbl")}
                <GuardedInput
                  inputMode="numeric"
                  autoFocus
                  placeholder="0"
                  value={paidSlsh}
                  onValue={(x) => {
                    setPaidSlsh(x.replace(/[^0-9]/g, ""));
                    setGiveUsd(null);
                  }}
                />
              </label>
              <label>
                {t("paidUsdLbl")}
                <GuardedInput
                  inputMode="decimal"
                  placeholder="0"
                  value={paidUsd}
                  onValue={(x) => {
                    setPaidUsd(x.replace(/[^0-9.]/g, ""));
                    setGiveUsd(null);
                  }}
                />
              </label>
            </div>
            <div className="quick">
              <button
                className="mini"
                onClick={() => {
                  setPaidSlsh(String(due));
                  setPaidUsd("");
                  setGiveUsd(null);
                }}
              >
                {t("exactSlsh")}
              </button>
              <button
                className="mini"
                onClick={() => {
                  setPaidUsd(Number(totalUsd).toFixed(2));
                  setPaidSlsh("");
                  setGiveUsd(null);
                }}
              >
                {t("exactUsd")}
              </button>
            </div>

            {entered &&
              (diff >= 0 ? (
                <div className="changebox okc">
                  <span>{t("change")}</span>
                  <b>{slsh(diff)} SlSh</b> <em>≈ {money(diff / rate)}</em>
                  <div className="givebox">
                    <label>
                      {t("giveUsdLbl")}
                      <GuardedInput
                        inputMode="numeric"
                        value={giveUsd === null ? String(suggest) : giveUsd}
                        onValue={(x) => setGiveUsd(x.replace(/[^0-9]/g, ""))}
                      />
                    </label>
                    <div className="giveslsh">
                      <span>{t("giveSlshLbl")}</span>
                      <b>{slsh(giveSlsh)}</b>
                    </div>
                  </div>
                  {tooMuch && <p className="warnline">{t("tooMuchUsd")}</p>}
                </div>
              ) : (
                <div className="changebox badc">
                  <b>{t("short", slsh(-diff))}</b> <em>≈ {money(-diff / rate)}</em>
                </div>
              ))}

            <button
              className="go"
              disabled={!ok || busy}
              onClick={() =>
                onConfirm({
                  rate,
                  total_slsh: due,
                  paid_slsh: ps,
                  paid_usd: pu,
                  change_slsh: giveSlsh,
                  change_usd: gu,
                })
              }
            >
              {t("confirmSave")}
            </button>
          </>
        )}
        <button className="clear dark" onClick={onClose}>{t("back")}</button>
      </div>
    </div>
  );
}

/* ------------------------------ Sales history + refunds ------------------------------ */

function SalesTab({ rate, setNotice, onReceipt }) {
  const t = useT();
  const [range, setRange] = useState("today");
  const [q, setQ] = useState("");
  const [sales, setSales] = useState([]);
  const [open, setOpen] = useState(null);
  const [refund, setRefund] = useState(null); // { sale, qtys, restock }
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - (days - 1));
      const { data, error } = await supabase
        .from("sales")
        .select(
          "id,total,total_slsh,paid_slsh,paid_usd,change_slsh,change_usd,rate,created_at,refunds(total),sale_items(id,name,qty,price,list_price,warranty_months,refund_items(qty))"
        )
        .gte("created_at", from.toISOString())
        .order("created_at", { ascending: false })
        .limit(200);
      if (!alive) return;
      if (error) setNotice({ kind: "error", text: error.message });
      else setSales(data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [days, tick]);

  const returned = (si) => (si.refund_items || []).reduce((a, r) => a + r.qty, 0);
  const shown = sales.filter((s) => shortId(s.id).includes(q.trim().toUpperCase()));

  const openReceipt = (s) =>
    onReceipt({
      id: s.id,
      date: new Date(s.created_at),
      total: Number(s.total),
      savings: s.sale_items.reduce(
        (a, i) => a + (i.list_price != null ? Math.max(0, Number(i.list_price) - Number(i.price)) * i.qty : 0),
        0
      ),
      items: s.sale_items.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: Number(i.price),
        listPrice: i.list_price != null ? Number(i.list_price) : Number(i.price),
        warranty: i.warranty_months || 0,
      })),
      slsh:
        s.total_slsh != null
          ? {
              due: Number(s.total_slsh),
              paidSlsh: Number(s.paid_slsh || 0),
              paidUsd: Number(s.paid_usd || 0),
              changeSlsh: Number(s.change_slsh || 0),
              changeUsd: Number(s.change_usd || 0),
            }
          : null,
    });

  const startRefund = (s) => setRefund({ sale: s, qtys: {}, restock: true });

  const refundUsd = refund
    ? refund.sale.sale_items.reduce((a, i) => a + Number(i.price) * (refund.qtys[i.id] || 0), 0)
    : 0;
  const useRate = refund ? Number(refund.sale.rate) || rate || 0 : 0;

  const confirmRefund = async () => {
    const items = Object.entries(refund.qtys)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => ({ sale_item_id: id, qty: n }));
    if (!items.length) return setNotice({ kind: "error", text: t("nothingToRefund") });
    setBusy(true);
    const { error } = await supabase.rpc("refund_sale", {
      p_sale: refund.sale.id,
      items,
      p_restock: refund.restock,
      p_rate: useRate || null,
    });
    setBusy(false);
    if (error) return setNotice({ kind: "error", text: error.message });
    setNotice({ kind: "ok", text: t("refundDone", money(refundUsd), useRate ? slsh(toSlsh(refundUsd, useRate)) : "") });
    setRefund(null);
    setTick((x) => x + 1);
  };

  return (
    <main className="dash no-print">
      <div className="range">
        {[["today", t("today")], ["7d", t("days7")], ["30d", t("days30")]].map(([k, label]) => (
          <button key={k} className={range === k ? "tab on" : "tab"} onClick={() => setRange(k)}>{label}</button>
        ))}
        <input className="filter inline" placeholder={t("searchReceipt")} value={q} onChange={(e) => setQ(e.target.value)} />
        {loading && <span className="muted">{t("loading")}</span>}
      </div>

      <section className="panel">
        {shown.length === 0 ? (
          <p className="empty small">{t("noSalesPeriod")}</p>
        ) : (
          <ul className="rank salelist">
            {shown.map((s) => {
              const refunded = (s.refunds || []).reduce((a, r) => a + Number(r.total), 0);
              const canRefund = s.sale_items.some((i) => i.qty - returned(i) > 0);
              return (
                <li key={s.id} className="saleitem">
                  <button className="salerow" onClick={() => setOpen(open === s.id ? null : s.id)}>
                    <span className="when">
                      {new Date(s.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span className="mono">#{shortId(s.id)}</span>
                    <span className="what">{s.sale_items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</span>
                    {refunded > 0 && <em className="rtag">{t("refundedTag", money(refunded))}</em>}
                    <b>{money(s.total)}</b>
                  </button>
                  {open === s.id && (
                    <div className="saledetail">
                      <table>
                        <thead>
                          <tr>
                            <th>{t("name")}</th><th className="r">{t("price")}</th>
                            <th className="r">{t("soldQty")}</th><th className="r">{t("returnedQty")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.sale_items.map((i) => (
                            <tr key={i.id}>
                              <td>{i.name}</td>
                              <td className="r">{money(i.price)}</td>
                              <td className="r">{i.qty}</td>
                              <td className="r">{returned(i)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {s.total_slsh != null && (
                        <p className="muted small">
                          {t("totalSlsh")}: {slsh(s.total_slsh)}
                          {Number(s.paid_slsh) > 0 && <> · {t("paidSlshR")}: {slsh(s.paid_slsh)}</>}
                          {Number(s.paid_usd) > 0 && <> · {t("paidUsdR")}: {money(s.paid_usd)}</>}
                          {Number(s.change_usd) > 0 && <> · {t("changeUsdR")}: {money(s.change_usd)}</>}
                          {Number(s.change_slsh) > 0 && <> · {t("changeSlshR")}: {slsh(s.change_slsh)}</>}
                        </p>
                      )}
                      <div className="detailacts">
                        <button className="mini" onClick={() => openReceipt(s)}>{t("receiptBtn")}</button>
                        {canRefund ? (
                          <button className="mini del" onClick={() => startRefund(s)}>{t("refundBtn")}</button>
                        ) : (
                          <span className="muted small">{t("fullyReturned")}</span>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {refund && (
        <div className="modal no-print">
          <div className="dialog">
            <h2>{t("refundBtn")} · #{shortId(refund.sale.id)}</h2>
            <ul className="rank">
              {refund.sale.sale_items.map((i) => {
                const left = i.qty - returned(i);
                const n = refund.qtys[i.id] || 0;
                return (
                  <li key={i.id}>
                    <span>
                      {i.name}
                      <br />
                      <em className="muted small">{money(i.price)} · {t("soldQty")} {i.qty} · {t("returnedQty")} {returned(i)}</em>
                    </span>
                    {left > 0 ? (
                      <div className="qty">
                        <button aria-label="-" onClick={() => setRefund({ ...refund, qtys: { ...refund.qtys, [i.id]: Math.max(0, n - 1) } })}>−</button>
                        <b>{n}</b>
                        <button aria-label="+" onClick={() => setRefund({ ...refund, qtys: { ...refund.qtys, [i.id]: Math.min(left, n + 1) } })}>+</button>
                      </div>
                    ) : (
                      <span className="muted small">{t("fullyReturned")}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <label className="check">
              <input type="checkbox" checked={refund.restock} onChange={(e) => setRefund({ ...refund, restock: e.target.checked })} />
              {t("restockLabel")}
            </label>
            <div className="duebox">
              <span>{t("refundAmount")}</span>
              <b>{money(refundUsd)}</b>
              {useRate ? <em>{t("giveBack")}: {slsh(toSlsh(refundUsd, useRate))} SlSh</em> : null}
            </div>
            <button className="go" disabled={busy || refundUsd <= 0} onClick={confirmRefund}>{t("confirmRefund")}</button>
            <button className="clear dark" onClick={() => setRefund(null)}>{t("cancel")}</button>
          </div>
        </div>
      )}
    </main>
  );
}

/* ------------------------------ Daily expenses ------------------------------ */

function ExpensesTab({ rate, setNotice }) {
  const t = useT();
  const [day, setDay] = useState(todayKey());
  const [rows, setRows] = useState([]);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [cur, setCur] = useState("SLSH");

  const load = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("spent_on", day)
      .order("created_at", { ascending: false });
    if (error) setNotice({ kind: "error", text: error.message });
    else setRows(data);
  };

  useEffect(() => { load(); }, [day]);

  const add = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("expenses").insert({
      description: desc.trim(),
      amount: Number(amount),
      currency: cur,
      spent_on: day,
    });
    if (error) {
      return setNotice({ kind: "error", text: error.code === "22003" ? t("numTooLarge") : error.message });
    }
    setNotice({ kind: "ok", text: t("expSaved") });
    setDesc("");
    setAmount("");
    load();
    const d = document.getElementById("expdesc");
    if (d) d.focus();
  };

  const remove = async (r) => {
    if (!window.confirm(t("confirmDelExp"))) return;
    const { error } = await supabase.from("expenses").delete().eq("id", r.id);
    if (error) return setNotice({ kind: "error", text: error.message });
    load();
  };

  const sumSlsh = rows.filter((r) => r.currency === "SLSH").reduce((a, r) => a + Number(r.amount), 0);
  const sumUsd = rows.filter((r) => r.currency === "USD").reduce((a, r) => a + Number(r.amount), 0);

  return (
    <main className="dash no-print">
      <section className="panel">
        <div className="exphead">
          <h2>{t("expenses")}</h2>
          <input className="datebox" type="date" required value={day} onChange={(e) => setDay(e.target.value)} aria-label={t("dateLabel")} />
        </div>
        <form onSubmit={add} className="exprow">
          <GuardedInput
            id="expdesc"
            className="expdesc"
            required
            autoFocus
            placeholder={t("description")}
            value={desc}
            onValue={setDesc}
          />
          <GuardedInput
            className="expamt"
            required
            inputMode="decimal"
            placeholder={t("price")}
            value={amount}
            onValue={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
          />
          <select value={cur} onChange={(e) => setCur(e.target.value)} aria-label={t("currency")}>
            <option value="SLSH">SlSh</option>
            <option value="USD">USD</option>
          </select>
          <button className="go" type="submit">{t("addExpense")}</button>
        </form>
      </section>

      <section className="panel">
        <h2>{t("spentDay")}</h2>
        <div className="spent">
          <b>{slsh(sumSlsh)} SlSh</b>
          {sumUsd > 0 && <b>+ {money(sumUsd)}</b>}
          {rate && sumUsd > 0 ? (
            <em className="muted">
              {t("about")} {slsh(sumSlsh + sumUsd * rate)} SlSh
            </em>
          ) : null}
        </div>
        {rows.length === 0 ? (
          <p className="empty small">{t("noExpenses")}</p>
        ) : (
          <ul className="rank">
            {rows.map((r) => (
              <li key={r.id}>
                <span>{r.description}</span>
                <b>{r.currency === "USD" ? money(r.amount) : `${slsh(r.amount)} SlSh`}</b>
                <button className="mini del" onClick={() => remove(r)}>{t("delete")}</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

/* ------------------------------ Dashboard ------------------------------ */

function Dashboard({ rate }) {
  const t = useT();
  const [range, setRange] = useState("today");
  const [sales, setSales] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [exps, setExps] = useState([]);
  const [low, setLow] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const days = range === "today" ? 1 : range === "7d" ? 7 : 30;

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError("");
      const from = new Date();
      from.setHours(0, 0, 0, 0);
      from.setDate(from.getDate() - (days - 1));
      const [s, r, x, l] = await Promise.all([
        supabase
          .from("sales")
          .select("id,total,created_at,sale_items(name,qty,price,list_price)")
          .gte("created_at", from.toISOString())
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.from("refunds").select("id,total").gte("created_at", from.toISOString()).limit(1000),
        supabase.from("expenses").select("amount,currency").gte("spent_on", from.toLocaleDateString("en-CA")).limit(2000),
        supabase.from("products").select("id,name,stock").lte("stock", 3).order("stock", { ascending: true }).limit(10),
      ]);
      if (!alive) return;
      const err = s.error || r.error || x.error || l.error;
      if (err) setError(err.message);
      else {
        setSales(s.data);
        setRefunds(r.data);
        setExps(x.data);
        setLow(l.data);
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [days]);

  const sumItems = (s, fn) => s.sale_items.reduce((a, i) => a + fn(i), 0);
  const gross = sales.reduce((a, s) => a + Number(s.total), 0);
  const refundTotal = refunds.reduce((a, r) => a + Number(r.total), 0);
  const revenue = gross - refundTotal;
  const count = sales.length;
  const itemsSold = sales.reduce((a, s) => a + sumItems(s, (i) => i.qty), 0);
  const discount = sales.reduce(
    (a, s) =>
      a + sumItems(s, (i) => (i.list_price != null ? Math.max(0, Number(i.list_price) - Number(i.price)) * i.qty : 0)),
    0
  );
  const avg = count ? gross / count : 0;

  const expSlsh = exps.filter((e) => e.currency === "SLSH").reduce((a, e) => a + Number(e.amount), 0);
  const expUsd = exps.filter((e) => e.currency === "USD").reduce((a, e) => a + Number(e.amount), 0);
  const expAllUsd = rate ? expUsd + expSlsh / rate : null;
  const expDisplay = rate
    ? `${slsh(expSlsh + expUsd * rate)} SlSh`
    : `${slsh(expSlsh)} SlSh${expUsd ? ` + ${money(expUsd)}` : ""}`;

  const topMap = {};
  sales.forEach((s) =>
    s.sale_items.forEach((i) => {
      const x = (topMap[i.name] = topMap[i.name] || { name: i.name, qty: 0, revenue: 0 });
      x.qty += i.qty;
      x.revenue += Number(i.price) * i.qty;
    })
  );
  const top = Object.values(topMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

  const dayKey = (d) => d.toLocaleDateString("en-CA");
  const buckets = [];
  for (let k = days - 1; k >= 0; k--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - k);
    buckets.push({ key: dayKey(d), label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), total: 0 });
  }
  sales.forEach((s) => {
    const b = buckets.find((x) => x.key === dayKey(new Date(s.created_at)));
    if (b) b.total += Number(s.total);
  });
  const max = Math.max(1, ...buckets.map((b) => b.total));

  return (
    <main className="dash no-print">
      <div className="range">
        {[["today", t("today")], ["7d", t("days7")], ["30d", t("days30")]].map(([k, label]) => (
          <button key={k} className={range === k ? "tab on" : "tab"} onClick={() => setRange(k)}>{label}</button>
        ))}
        {loading && <span className="muted">{t("loading")}</span>}
      </div>

      {error && <div className="notice error">{error}</div>}

      <div className="stats">
        <div className="stat main">
          <span>{t("revenue")}</span>
          <b>{money(revenue)}</b>
          {rate ? <em>{slsh(toSlsh(revenue, rate))} SlSh</em> : null}
        </div>
        <div className="stat"><span>{t("salesCount")}</span><b>{count}</b></div>
        <div className="stat"><span>{t("itemsSold")}</span><b>{itemsSold}</b></div>
        <div className="stat"><span>{t("avgSale")}</span><b>{money(avg)}</b></div>
        <div className="stat"><span>{t("discounts")}</span><b>{money(discount)}</b></div>
        <div className="stat"><span>{t("refundsLabel")}</span><b>{money(refundTotal)}</b></div>
        <div className="stat"><span>{t("expensesLabel")}</span><b className="smallnum">{expDisplay}</b></div>
        <div className="stat">
          <span>{t("netLabel")}</span>
          {expAllUsd != null ? (
            <>
              <b>{money(revenue - expAllUsd)}</b>
              <em>{slsh(toSlsh(revenue - expAllUsd, rate))} SlSh</em>
            </>
          ) : (
            <b className="smallnum">—</b>
          )}
        </div>
      </div>

      {days > 1 && (
        <section className="panel">
          <h2>{t("perDay")}</h2>
          <div className="dbars">
            {buckets.map((b, idx) => (
              <div className="dcol" key={b.key} title={`${b.label}: ${money(b.total)}`}>
                <div className="dbar" style={{ height: `${(b.total / max) * 100}%` }} />
                <span>{idx % (days > 7 ? 5 : 1) === 0 ? b.label : ""}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="two-col">
        <section className="panel">
          <h2>{t("topProducts")}</h2>
          {top.length === 0 ? (
            <p className="empty small">{t("noSalesPeriod")}</p>
          ) : (
            <ol className="rank">
              {top.map((x) => (
                <li key={x.name}>
                  <span>{x.name}</span>
                  <em>{t("sold", x.qty)}</em>
                  <b>{money(x.revenue)}</b>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="panel">
          <h2>{t("lowStock")}</h2>
          {low.length === 0 ? (
            <p className="empty small">{t("nothingLow")}</p>
          ) : (
            <ul className="rank">
              {low.map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <b className={p.stock <= 0 ? "lowred" : ""}>{p.stock}</b>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>{t("recentSales")}</h2>
        {sales.length === 0 ? (
          <p className="empty small">{t("noSalesPeriod")}</p>
        ) : (
          <ul className="rank recent">
            {sales.slice(0, 10).map((s) => (
              <li key={s.id}>
                <span className="when">
                  {new Date(s.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="what">{s.sale_items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</span>
                <b>{money(s.total)}</b>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

/* ------------------------------ Shop (all tabs) ------------------------------ */

const EMPTY_DRAFT = { barcode: "", name: "", price: "", stock: "", warranty: "" };

function Shop({ user }) {
  const t = useT();
  const tRef = useRef(t);
  tRef.current = t;

  const [view, setView] = useState("checkout");
  const [cart, setCart] = useState([]);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);
  const [rate, setRate] = useState(null);
  const [manual, setManual] = useState("");
  const [results, setResults] = useState([]);
  const [products, setProducts] = useState([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [filter, setFilter] = useState("");
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({});
  const [receipt, setReceipt] = useState(null);
  const [receiptIsNew, setReceiptIsNew] = useState(true);

  const unitOf = (i) => priceOf(i, rate);
  const total = cart.reduce((s, i) => s + unitOf(i) * i.qty, 0);
  const savings = cart.reduce((s, i) => s + Math.max(0, i.listPrice - unitOf(i)) * i.qty, 0);
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  // exchange rate (shared by all computers through the database)
  useEffect(() => {
    supabase
      .from("settings")
      .select("value")
      .eq("key", "usd_slsh")
      .maybeSingle()
      .then(({ data }) => {
        if (data && Number(data.value) > 0) setRate(Number(data.value));
      });
  }, []);

  const saveRate = async (n) => {
    const { error } = await supabase.from("settings").upsert({ key: "usd_slsh", value: String(n) });
    if (error) {
      setNotice({ kind: "error", text: error.message });
      return false;
    }
    setRate(n);
    return true;
  };

  const addToCart = (p) =>
    setCart((prev) => {
      const found = prev.find((i) => i.id === p.id);
      if (found) return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [
        ...prev,
        {
          id: p.id,
          barcode: p.barcode,
          name: p.name,
          listPrice: Number(p.price),
          newPrice: "",
          newCur: "USD",
          qty: 1,
          warranty: p.warranty_months || 0,
        },
      ];
    });

  const changeQty = (id, delta) =>
    setCart((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i)).filter((i) => i.qty > 0)
    );

  const setNewPrice = (id, v) =>
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, newPrice: v } : i)));

  const setNewCur = (id, c) =>
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, newCur: c, newPrice: "" } : i)));

  const removeItem = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const lookup = useCallback(async (code) => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("barcode", code)
      .maybeSingle();
    if (error) return setNotice({ kind: "error", text: tRef.current("dbError") + error.message });
    if (!data) {
      beep(false);
      return setNotice({ kind: "unknown", code, text: tRef.current("noProduct", code) });
    }
    beep(true);
    setNotice(null);
    addToCart(data);
  }, []);

  const scanning = view === "checkout" && !paying && !receipt;
  useBarcodeScanner(
    scanning
      ? lookup
      : view === "products"
      ? (code) => setDraft((d) => ({ ...d, barcode: code }))
      : () => {}
  );

  // Search by product name (for items without a barcode)
  useEffect(() => {
    const q = manual.trim();
    if (q.length < 2 || /^\d+$/.test(q)) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .ilike("name", `%${q}%`)
        .limit(6);
      setResults(data || []);
    }, 250);
    return () => clearTimeout(timer);
  }, [manual]);

  const pickResult = (p) => {
    beep(true);
    addToCart(p);
    setManual("");
    setResults([]);
  };

  const finishSale = async (payInfo) => {
    setBusy(true);
    const items = cart.map((i) => ({
      id: i.id,
      qty: i.qty,
      ...(unitOf(i) !== i.listPrice ? { price: unitOf(i) } : {}),
    }));
    const { data, error } = await supabase.rpc("checkout", { items, pay: payInfo });
    setBusy(false);
    if (error) {
      setPaying(false);
      return setNotice({ kind: "error", text: t("saleFailed") + error.message });
    }
    setReceiptIsNew(true);
    setReceipt({
      id: data,
      date: new Date(),
      total,
      savings,
      items: cart.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: unitOf(i),
        listPrice: i.listPrice,
        warranty: i.warranty,
      })),
      slsh: {
        due: payInfo.total_slsh,
        paidSlsh: payInfo.paid_slsh,
        paidUsd: payInfo.paid_usd,
        changeSlsh: payInfo.change_slsh,
        changeUsd: payInfo.change_usd,
      },
    });
    setPaying(false);
    setNotice(null);
    setCart([]);
  };

  const showOldReceipt = (r) => {
    setReceiptIsNew(false);
    setReceipt(r);
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setNotice({ kind: "error", text: error.message });
    else setProducts(data);
  };

  useEffect(() => {
    if (view === "products") loadProducts();
  }, [view]);

  const saveProduct = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from("products").insert({
      barcode: draft.barcode.trim(),
      name: draft.name.trim(),
      price: Number(draft.price),
      stock: Number(draft.stock || 0),
      warranty_months: Number(draft.warranty || 0),
    });
    if (error) {
      return setNotice({
        kind: "error",
        text:
          error.code === "23505"
            ? t("barcodeExists")
            : error.code === "22003"
            ? t("numTooLarge")
            : error.message,
      });
    }
    setNotice({ kind: "ok", text: t("saved", draft.name) });
    setDraft(EMPTY_DRAFT);
    loadProducts();
  };

  const startEdit = (p) => {
    setEditId(p.id);
    setEdit({
      name: p.name,
      price: String(p.price),
      stock: String(p.stock),
      warranty_months: String(p.warranty_months || 0),
    });
  };

  const saveEdit = async () => {
    const { error } = await supabase
      .from("products")
      .update({
        name: edit.name.trim(),
        price: Number(edit.price),
        stock: Number(edit.stock || 0),
        warranty_months: Number(edit.warranty_months || 0),
      })
      .eq("id", editId);
    if (error) {
      return setNotice({
        kind: "error",
        text: error.code === "22003" ? t("numTooLarge") : error.message,
      });
    }
    setEditId(null);
    setNotice({ kind: "ok", text: t("updated") });
    loadProducts();
  };

  const deleteProduct = async (p) => {
    if (!window.confirm(t("confirmDelete", p.name))) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return setNotice({ kind: "error", text: error.message });
    setNotice({ kind: "ok", text: t("deleted", p.name) });
    loadProducts();
  };

  const goAddProduct = (code) => {
    setDraft((d) => ({ ...d, barcode: code }));
    setNotice(null);
    setView("products");
  };

  const shown = products.filter((p) =>
    (p.name + " " + p.barcode).toLowerCase().includes(filter.trim().toLowerCase())
  );

  const tabs = [
    ["checkout", t("checkout")],
    ["products", t("products")],
    ["sales", t("sales")],
    ["expenses", t("expenses")],
    ["dashboard", t("dashboard")],
  ];

  return (
    <div className="app">
      <header className="bar no-print">
        <h1>{SHOP}</h1>
        <nav>
          {tabs.map(([k, label]) => (
            <button key={k} className={view === k ? "tab on" : "tab"} onClick={() => setView(k)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="barright">
          <RateBox rate={rate} onSave={saveRate} />
          <LangToggle />
          <button className="signout" onClick={() => supabase.auth.signOut()} title={user.email}>
            {t("signOut")}
          </button>
        </div>
      </header>

      {notice && (
        <div className={`notice ${notice.kind} no-print`} role="status" aria-live="polite">
          <span>{notice.text}</span>
          {notice.kind === "unknown" && (
            <button onClick={() => goAddProduct(notice.code)}>{t("addThisProduct")}</button>
          )}
          <button className="x" aria-label="Dismiss" onClick={() => setNotice(null)}>×</button>
        </div>
      )}

      {view === "dashboard" ? (
        <Dashboard rate={rate} />
      ) : view === "sales" ? (
        <SalesTab rate={rate} setNotice={setNotice} onReceipt={showOldReceipt} />
      ) : view === "expenses" ? (
        <ExpensesTab rate={rate} setNotice={setNotice} />
      ) : view === "checkout" ? (
        <main className="checkout no-print">
          <section className="receipt">
            <div className="manual">
              <input
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const q = manual.trim();
                  if (/^\d+$/.test(q) && q.length >= 3) {
                    lookup(q);
                    setManual("");
                  } else if (results.length === 1) {
                    pickResult(results[0]);
                  }
                }}
                placeholder={t("searchPh")}
              />
              {results.length > 0 && (
                <ul className="results">
                  {results.map((p) => (
                    <li key={p.id}>
                      <button onClick={() => pickResult(p)}>
                        <span>{p.name}</span>
                        <b>{money(p.price)}</b>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cart.length === 0 ? (
              <p className="empty">{t("scanStart")}</p>
            ) : (
              <ul className="cart">
                {cart.map((i) => {
                  const unit = unitOf(i);
                  const discounted = unit !== i.listPrice;
                  return (
                    <li key={i.id}>
                      <div className="name">
                        <strong>{i.name}</strong>
                        <div className="pricing">
                          <span className={discounted ? "old" : "list"}>
                            {money(i.listPrice)}
                            {rate ? ` · ${slsh(toSlsh(i.listPrice, rate))} SlSh` : ""}
                          </span>
                          {discounted && (
                            <span className="new">
                              {money(unit)}
                              {rate ? ` · ${slsh(toSlsh(unit, rate))} SlSh` : ""}
                            </span>
                          )}
                          <div className="curtoggle" role="group" aria-label="Currency">
                            <button className={i.newCur !== "SLSH" ? "on" : ""} onClick={() => setNewCur(i.id, "USD")}>$</button>
                            <button className={i.newCur === "SLSH" ? "on" : ""} disabled={!rate} onClick={() => setNewCur(i.id, "SLSH")}>SlSh</button>
                          </div>
                          <GuardedInput
                            className="np"
                            inputMode="decimal"
                            placeholder={`${t("newPrice")} (${i.newCur === "SLSH" ? "SlSh" : "$"})`}
                            aria-label={`${t("newPrice")}: ${i.name}`}
                            value={i.newPrice}
                            onValue={(v) => setNewPrice(i.id, v.replace(i.newCur === "SLSH" ? /[^0-9]/g : /[^0-9.]/g, ""))}
                            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                          />
                        </div>
                        {i.warranty > 0 && <span className="wtag">{t("warrantyMo", i.warranty)}</span>}
                      </div>
                      <div className="qty">
                        <button aria-label="-" onClick={() => changeQty(i.id, -1)}>−</button>
                        <b>{i.qty}</b>
                        <button aria-label="+" onClick={() => changeQty(i.id, 1)}>+</button>
                      </div>
                      <div className="line">
                        {money(unit * i.qty)}
                        {rate ? <small>{slsh(toSlsh(unit * i.qty, rate))} SlSh</small> : null}
                      </div>
                      <button className="x" aria-label={`Remove ${i.name}`} onClick={() => removeItem(i.id)}>×</button>
                    </li>
                  );
                })}
              </ul>
            )}
            {cart.length > 0 && <p className="hint">{t("hintEnter")}</p>}
          </section>

          <aside className="pay">
            <span className="label">{t("items", itemCount)}</span>
            <div className="total">{money(total)}</div>
            {rate ? <div className="slshline">{slsh(toSlsh(total, rate))} SlSh</div> : null}
            {savings > 0 && <div className="save">{t("discountGiven")}: {money(savings)}</div>}
            <button className="go" disabled={!cart.length || busy} onClick={() => setPaying(true)}>
              {t("completeSale")}
            </button>
            <button className="clear" disabled={!cart.length} onClick={() => setCart([])}>
              {t("cancelSale")}
            </button>
          </aside>
        </main>
      ) : (
        <main className="products no-print">
          <form onSubmit={saveProduct} className="add">
            <h2>{t("addProduct")}</h2>
            <label>
              {t("barcode")}
              <input
                required
                value={draft.barcode}
                onChange={(e) => setDraft({ ...draft, barcode: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    document.getElementById("pname").focus();
                  }
                }}
                placeholder={t("scanOrType")}
                autoFocus
              />
            </label>
            <label>
              {t("name")}
              <GuardedInput id="pname" required value={draft.name} onValue={(v) => setDraft((d) => ({ ...d, name: v }))} />
            </label>
            <div className="two">
              <label>
                {t("priceUsd")}
                <GuardedInput required type="number" step="0.01" min="0" max="1000000" value={draft.price} onValue={(v) => setDraft((d) => ({ ...d, price: v }))} />
              </label>
              <label>
                {t("stock")}
                <GuardedInput type="number" min="0" max="1000000" value={draft.stock} onValue={(v) => setDraft((d) => ({ ...d, stock: v }))} />
              </label>
            </div>
            <label>
              {t("warrantyLabel")}
              <GuardedInput type="number" min="0" max="120" value={draft.warranty} onValue={(v) => setDraft((d) => ({ ...d, warranty: v }))} />
            </label>
            <button className="go" type="submit">{t("saveProduct")}</button>
          </form>

          <section className="list">
            <h2>{t("countOf", shown.length, products.length)}</h2>
            <input
              className="filter"
              placeholder={t("filterPh")}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            {products.length === 0 ? (
              <p className="empty">{t("noProducts")}</p>
            ) : (
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{t("name")}</th><th>{t("barcode")}</th><th className="r">{t("price")}</th>
                      <th className="r">{t("stock")}</th><th className="r">{t("warranty")}</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((p) =>
                      editId === p.id ? (
                        <tr key={p.id} className="editing">
                          <td><GuardedInput value={edit.name} onValue={(v) => setEdit((d) => ({ ...d, name: v }))} /></td>
                          <td className="mono">{p.barcode}</td>
                          <td><GuardedInput className="num" type="number" step="0.01" min="0" max="1000000" value={edit.price} onValue={(v) => setEdit((d) => ({ ...d, price: v }))} /></td>
                          <td><GuardedInput className="num" type="number" max="1000000" value={edit.stock} onValue={(v) => setEdit((d) => ({ ...d, stock: v }))} /></td>
                          <td><GuardedInput className="num" type="number" min="0" max="120" value={edit.warranty_months} onValue={(v) => setEdit((d) => ({ ...d, warranty_months: v }))} /></td>
                          <td className="acts">
                            <button className="mini ok" onClick={saveEdit}>{t("save")}</button>
                            <button className="mini" onClick={() => setEditId(null)}>{t("cancel")}</button>
                          </td>
                        </tr>
                      ) : (
                        <tr key={p.id}>
                          <td>{p.name}</td>
                          <td className="mono">{p.barcode}</td>
                          <td className="r">{money(p.price)}</td>
                          <td className={p.stock <= 0 ? "r low" : "r"}>{p.stock}</td>
                          <td className="r">{p.warranty_months > 0 ? `${p.warranty_months} mo` : "—"}</td>
                          <td className="acts">
                            <button className="mini" onClick={() => startEdit(p)}>{t("edit")}</button>
                            <button className="mini del" onClick={() => deleteProduct(p)}>{t("delete")}</button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      )}

      {paying && (
        <PayModal
          totalUsd={total}
          rate={rate}
          busy={busy}
          onSaveRate={saveRate}
          onConfirm={finishSale}
          onClose={() => setPaying(false)}
        />
      )}

      {receipt && (
        <Receipt
          receipt={receipt}
          closeLabel={receiptIsNew ? t("newSale") : t("close")}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..800&display=swap');
:root{--paper:#F3F5F2;--ink:#13241B;--tag:#FFD23F;--ok:#1E8449;--bad:#C8402F;--line:#D3DAD3;--mute:#5E6F64}
*{box-sizing:border-box}
html,body,#root{margin:0;min-height:100%;background:var(--paper);color:var(--ink);font-family:'Archivo',system-ui,sans-serif;font-variant-numeric:tabular-nums}
button{font:inherit;cursor:pointer}
button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--tag);outline-offset:2px}
.boot{padding:40px;text-align:center;color:var(--mute)}
.login{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
.login form{width:360px;max-width:100%;background:#fff;border:1px solid var(--line);border-radius:14px;padding:28px}
.login h1{margin:0;font-size:1.6rem;font-weight:800;font-stretch:112%}
.login p{margin:4px 0 20px;color:var(--mute)}
.loginhead{display:flex;justify-content:flex-end;margin-bottom:8px}
.loginerr{background:var(--bad);color:#fff;padding:10px 12px;border-radius:8px;margin-bottom:12px;font-weight:600}
.app{max-width:1200px;margin:0 auto;padding:16px}
.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0 16px;flex-wrap:wrap}
.bar h1{margin:0;font-size:1.5rem;font-weight:800;font-stretch:112%}
.barright{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
nav{display:flex;gap:4px;background:#E4E9E4;padding:4px;border-radius:10px;flex-wrap:wrap}
.tab{border:0;background:transparent;padding:10px 16px;border-radius:7px;font-weight:600;color:var(--mute)}
.tab.on{background:var(--ink);color:#fff}
.signout{border:1px solid var(--line);background:#fff;padding:9px 14px;border-radius:8px;font-weight:600}
.langtoggle{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:#fff}
.langtoggle button{border:0;background:transparent;padding:9px 11px;font-weight:700;color:var(--mute)}
.langtoggle button.on{background:var(--ink);color:#fff}
.ratebtn{border:1px solid var(--line);background:#fff;padding:9px 12px;border-radius:8px;font-weight:700}
.ratebtn.warn{background:var(--tag);border-color:var(--tag)}
.ratebox{display:flex;align-items:center;gap:6px;background:#fff;border:1px solid var(--line);border-radius:8px;padding:4px 8px}
.ratebox input{width:90px;padding:6px;border:1px solid var(--line);border-radius:6px;font:inherit}
.notice{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:8px;margin-bottom:14px;font-weight:600;color:#fff}
.notice span{flex:1}
.notice.ok{background:var(--ok)}
.notice.error,.notice.unknown{background:var(--bad)}
.notice button{border:0;background:#fff;color:var(--ink);padding:8px 12px;border-radius:6px;font-weight:700}
.notice .x{background:transparent;color:#fff;font-size:1.3rem;padding:0 6px}
.checkout{display:grid;grid-template-columns:1fr 340px;gap:16px;align-items:start}
.receipt{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;min-height:60vh}
.manual{position:relative}
.manual input{width:100%;padding:12px;border:1px solid var(--line);border-radius:8px;font:inherit;background:var(--paper)}
.results{position:absolute;z-index:5;left:0;right:0;top:100%;margin:4px 0 0;padding:4px;list-style:none;background:#fff;border:1px solid var(--line);border-radius:8px;box-shadow:0 8px 24px rgba(19,36,27,.15)}
.results button{width:100%;display:flex;justify-content:space-between;gap:12px;border:0;background:transparent;padding:10px;border-radius:6px;text-align:left}
.results button:hover{background:var(--paper)}
.cart{list-style:none;margin:12px 0 0;padding:0}
.cart li{display:grid;grid-template-columns:1fr auto 130px 32px;align-items:center;gap:12px;padding:14px 0;border-bottom:2px dashed var(--line)}
.name strong{display:block;font-size:1.05rem}
.pricing{display:flex;align-items:center;gap:10px;margin-top:6px;flex-wrap:wrap}
.list{color:var(--mute)}
.old{color:var(--mute);text-decoration:line-through}
.new{color:var(--ok);font-weight:800}
.np{width:120px;padding:7px 9px;border:2px solid var(--tag);border-radius:7px;font:inherit;background:#FFFBE6}
.wtag{display:inline-block;margin-top:6px;font-size:.78rem;font-weight:700;background:#E4E9E4;padding:2px 8px;border-radius:999px}
.qty{display:flex;align-items:center;gap:10px}
.qty button{width:36px;height:36px;border:1px solid var(--line);background:var(--paper);border-radius:8px;font-size:1.2rem}
.qty b{min-width:24px;text-align:center;font-size:1.1rem}
.line{text-align:right;font-weight:700;font-size:1.1rem}
.line small{display:block;font-weight:600;color:var(--mute);font-size:.8rem;margin-top:2px}
.curtoggle{display:flex;border:1px solid var(--line);border-radius:7px;overflow:hidden}
.curtoggle button{border:0;background:#fff;padding:7px 10px;font-weight:700;color:var(--mute)}
.curtoggle button.on{background:var(--ink);color:#fff}
.curtoggle button:disabled{opacity:.4;cursor:not-allowed}
.x{border:0;background:transparent;font-size:1.4rem;color:var(--mute)}
.empty{color:var(--mute);padding:40px 0;text-align:center}
.empty.small{padding:16px 0}
.hint{color:var(--mute);font-size:.85rem;margin:12px 0 0}
.pay{background:var(--ink);color:#fff;border-radius:12px;padding:20px;position:sticky;top:16px}
.pay .label{color:#B9C7BE}
.total{font-size:3.4rem;font-weight:800;font-stretch:112%;margin:6px 0 4px;line-height:1}
.slshline{font-size:1.3rem;font-weight:700;color:var(--tag);margin-bottom:12px}
.save{color:var(--tag);font-weight:700;margin-bottom:14px}
.go{width:100%;border:0;background:var(--tag);color:var(--ink);padding:16px;border-radius:10px;font-weight:800;font-size:1.1rem}
.go:disabled{opacity:.45;cursor:not-allowed}
.clear{width:100%;margin-top:10px;background:transparent;border:1px solid #4B5E53;color:#fff;padding:12px;border-radius:10px}
.clear.dark{color:var(--ink);border-color:var(--line)}
.clear:disabled{opacity:.4}
.products{display:grid;grid-template-columns:340px 1fr;gap:16px;align-items:start}
.add,.list{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px}
h2{margin:0 0 12px;font-size:1.1rem}
label{display:block;font-weight:600;font-size:.9rem;margin-bottom:12px}
label input,label select,.filter{display:block;width:100%;margin-top:4px;padding:11px;border:1px solid var(--line);border-radius:8px;font:inherit;background:var(--paper)}
.filter{margin:0 0 12px}
.filter.inline{width:240px;margin:0}
label.check{display:flex;align-items:center;gap:10px}
label.check input{width:auto;margin:0}
.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.scroll{overflow-x:auto}
table{width:100%;border-collapse:collapse}
th,td{padding:10px 8px;border-bottom:1px solid var(--line);text-align:left}
th{font-size:.85rem;color:var(--mute)}
td input{width:100%;min-width:70px;padding:8px;border:1px solid var(--line);border-radius:6px;font:inherit}
td input.num{min-width:60px;text-align:right}
.editing{background:#FFFBE6}
.r{text-align:right}
.mono{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9rem}
.low{color:var(--bad);font-weight:700}
.acts{white-space:nowrap;text-align:right}
.mini{border:1px solid var(--line);background:var(--paper);padding:6px 10px;border-radius:6px;font-weight:600;margin-left:4px}
.mini.ok{background:var(--ok);color:#fff;border-color:var(--ok)}
.mini.del{color:var(--bad)}
.dash{display:flex;flex-direction:column;gap:16px}
.range{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.range .tab{background:#E4E9E4}
.range .tab.on{background:var(--ink)}
.muted{color:var(--mute)}
.small{font-size:.85rem}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.stat{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px}
.stat span{display:block;color:var(--mute);font-size:.85rem;font-weight:600}
.stat b{display:block;font-size:1.6rem;margin-top:4px}
.stat b.smallnum{font-size:1.15rem;margin-top:8px}
.stat em{display:block;font-style:normal;color:var(--mute);font-size:.9rem;margin-top:2px}
.stat.main{background:var(--ink);border-color:var(--ink);color:#fff;grid-column:span 2}
.stat.main span,.stat.main em{color:#B9C7BE}
.stat.main b{font-size:2.6rem;font-weight:800;font-stretch:112%}
.panel{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.dbars{display:flex;align-items:flex-end;gap:4px;height:160px}
.dcol{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px;min-width:0}
.dbar{width:100%;background:var(--ink);border-radius:4px 4px 0 0;min-height:2px}
.dcol span{font-size:.7rem;color:var(--mute);height:14px;white-space:nowrap}
.rank{list-style:none;margin:0;padding:0}
.rank li{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.rank li span:first-child{flex:1;min-width:0}
.rank em{font-style:normal;color:var(--mute);font-size:.85rem}
.rank.recent .when{flex:none;width:110px;color:var(--mute);font-size:.85rem}
.rank.recent .what{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lowred{color:var(--bad)}
.salelist .saleitem{display:block;padding:0}
.salerow{width:100%;display:flex;align-items:center;gap:12px;border:0;background:transparent;padding:12px 0;text-align:left}
.salerow .when{flex:none;width:110px;color:var(--mute);font-size:.85rem}
.salerow .what{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rtag{background:#FBE3DF;color:var(--bad)!important;font-weight:700;padding:2px 8px;border-radius:999px}
.saledetail{background:var(--paper);border-radius:10px;padding:12px;margin:0 0 12px}
.detailacts{display:flex;align-items:center;gap:8px;margin-top:8px}
.detailacts .mini{margin-left:0}
.exphead{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
.exphead h2{margin:0}
.datebox{padding:9px 10px;border:1px solid var(--line);border-radius:8px;font:inherit;background:var(--paper)}
.exprow{display:flex;gap:8px;flex-wrap:wrap}
.exprow input,.exprow select{padding:13px;border:1px solid var(--line);border-radius:8px;font:inherit;background:var(--paper)}
.expdesc{flex:1 1 240px;min-width:0}
.expamt{width:160px}
.exprow .go{width:auto;padding:13px 22px;font-size:1rem}
.spent{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;font-size:1.4rem;margin-bottom:8px}
.modal{position:fixed;inset:0;z-index:20;background:rgba(19,36,27,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px;overflow:auto}
.dialog{width:420px;max-width:100%;background:#fff;border-radius:14px;padding:22px}
.duebox{background:var(--ink);color:#fff;border-radius:10px;padding:14px;margin-bottom:14px}
.duebox span{display:block;color:#B9C7BE;font-size:.85rem}
.duebox b{display:block;font-size:2rem;font-weight:800}
.duebox em{display:block;font-style:normal;color:var(--tag);font-weight:700;font-size:1.2rem}
.changebox{margin:12px 0;padding:12px;border-radius:10px;min-height:56px}
.changebox span{display:block;font-size:.85rem}
.changebox b{font-size:1.5rem}
.okc{background:#E3F3EA;color:var(--ok)}
.badc{background:#FBE3DF;color:var(--bad)}
.ratefix p{font-weight:700}
.dualpay{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.dualpay input{font-size:1.1rem;font-weight:700}
.quick{display:flex;gap:6px;margin-bottom:4px}
.quick .mini{margin-left:0}
.givebox{display:grid;grid-template-columns:1fr 1fr;gap:10px;align-items:end;margin-top:10px}
.givebox label{margin:0;color:var(--ink)}
.giveslsh span{display:block;font-size:.85rem;font-weight:600;color:var(--ink)}
.giveslsh b{display:block;font-size:1.3rem;padding:8px 0}
.warnline{color:var(--bad);font-weight:700;margin:8px 0 0}
.changebox em{font-style:normal;font-weight:700}
.paper{width:320px;max-width:100%;background:#fff;color:#000;padding:18px 16px;border-radius:4px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px}
.paper h3{margin:0;text-align:center;font-size:1.2rem;font-family:'Archivo',sans-serif;font-weight:800}
.paper hr{border:0;border-top:1px dashed #000;margin:10px 0}
.paper .c{text-align:center}
.paper .small{font-size:11px;color:#333}
.paper .row{display:flex;justify-content:space-between;gap:10px}
.paper .big{font-size:1.1rem;font-weight:800}
.rline{margin-bottom:8px}
.actions{display:flex;flex-direction:column;gap:8px;width:320px;max-width:100%}
@media(max-width:900px){.stat.main{grid-column:1/-1}.two-col{grid-template-columns:1fr}}
@media(max-width:820px){.checkout,.products{grid-template-columns:1fr}.pay{position:static}.cart li{grid-template-columns:1fr auto 100px 28px}.filter.inline{width:100%}}
@media(prefers-reduced-motion:reduce){*{transition:none!important}}
@media print{
  body *{visibility:hidden}
  .paper,.paper *{visibility:visible}
  .paper{position:absolute;left:0;top:0;width:72mm;padding:0}
  .no-print{display:none!important}
  @page{margin:4mm}
}
`;
