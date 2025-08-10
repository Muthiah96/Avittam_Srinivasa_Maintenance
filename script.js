/* ====== CONFIG ====== */
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbyblwpOPq_hWkYJFZvBbZABJtHRCFYOaWZZ05HuuFmz5Onb8C1d9nGD2JXzwG-CGawPdw/exec";
/* ==================== */

const APTS = ["F1","F2","F3","S1","S2","T1","T2","T3"];
document.getElementById("year").textContent = new Date().getFullYear();

/* Header badge */
const cacBadge = document.getElementById("cac-badge");

/* Month labels */
const dashMonthEl = document.getElementById("dash-month");
const dashMonthEB = document.getElementById("dash-month-eb");
const dashMonthMaid = document.getElementById("dash-month-maid");

/* Maintenance */
const paidCountEl = document.getElementById("paid-count");
const pendingCountEl = document.getElementById("pending-count");
const tbodyMaint = document.getElementById("apt-table-maint");
const cardPaid = document.getElementById("card-paid");
const cardPending = document.getElementById("card-pending");

/* EB */
const ebAmountEl = document.getElementById("eb-amount");
const ebAmountNoteEl = document.getElementById("eb-amount-note");
const ebPaidEl = document.getElementById("eb-paid");
const ebNextEl = document.getElementById("eb-next");

/* Maid */
const maidAmountEl = document.getElementById("maid-amount");
const maidLeavesEl = document.getElementById("maid-leaves");
const maidPaidEl = document.getElementById("maid-paid");

/* Lift (expiry-colored) */
const insCard = document.getElementById("lift-ins-card");
const amcCard = document.getElementById("lift-amc-card");
const liftInsPaidEl = document.getElementById("lift-ins-paid");
const liftInsValidEl = document.getElementById("lift-ins-valid");
const liftInsDaysEl  = document.getElementById("lift-ins-days");
const liftAmcPaidEl  = document.getElementById("lift-amc-paid");
const liftAmcValidEl = document.getElementById("lift-amc-valid");
const liftAmcDaysEl  = document.getElementById("lift-amc-days");

/* OPL */
const oplOpenCountEl = document.getElementById("opl-open-count");
const oplClosedCountEl = document.getElementById("opl-closed-count");
const oplTableBody = document.getElementById("opl-table");
const oplMoreBtn = document.getElementById("opl-more");

/* Balance & Expenses */
const cardBalance = document.getElementById("card-balance");
const balAvailableEl = document.getElementById("bal-available");
const balTotalEl = document.getElementById("bal-total");
const balExpensesEl = document.getElementById("bal-expenses");
const balTotalInlineEl = document.getElementById("bal-total-inline");
const balExpensesInlineEl = document.getElementById("bal-expenses-inline");

/* Modal */
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalX = document.getElementById("modal-x");
const modalTitle = document.getElementById("modal-title");
const modalContent = document.getElementById("modal-content");

/* Global cache for transactions so click works even before data refresh */
let gTransactions = [];

/* Utils */
function ym(d=new Date()){ return d.toISOString().slice(0,7); } // YYYY-MM
function prettyMonth(ymStr){ const [Y,M]=ymStr.split("-"); return new Date(+Y, +M-1, 1).toLocaleString(undefined,{month:"long", year:"numeric"}); }

function openModalHTML(title, html){
  modalTitle.textContent = title;
  modalContent.innerHTML = html;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
}
function closeModal(){ modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true"); }
modalClose.addEventListener("click", closeModal);
modalX.addEventListener("click", closeModal);
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeModal(); });

/* Date helpers */
function parseDateFlexible(s){
  if (!s) return null; if (s instanceof Date) return s;
  const t=String(s).trim(), d1=new Date(t); if(!isNaN(d1)) return d1;
  let m=t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if(m){ const d=new Date(+m[3], +m[2]-1, +m[1]); if(!isNaN(d)) return d; }
  m=t.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
  if(m){ const d=new Date(+m[1], +m[2]-1, +m[3]); if(!isNaN(d)) return d; }
  return null;
}
function daysUntil(dateString){
  const d = parseDateFlexible(dateString);
  if (!d) return null;
  const ms = d.setHours(0,0,0,0) - new Date().setHours(0,0,0,0);
  return Math.floor(ms / 86400000);
}
function setExpiryClass(tileEl, days){
  tileEl.classList.remove("tile--ok","tile--warn","tile--bad");
  if (days === null) return;
  if (days < 0) tileEl.classList.add("tile--bad");
  else if (days <= 40) tileEl.classList.add("tile--warn");
  else tileEl.classList.add("tile--ok");
}

/* EB windows: starting 15.09.2025–22.09.2025, then +2 months; show only the next period >= today */
function ddmmyyyy(d){
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}
function addMonths(date, n){
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth()+n);
  return d;
}
function nextEbWindow(){
  const baseStart = new Date(2025,8,15); // Sep=8
  const baseEnd   = new Date(2025,8,22);
  const today = new Date();
  let i = 0, s = baseStart, e = baseEnd;
  while (e < today && i < 100){ i++; s = addMonths(baseStart, i*2); e = addMonths(baseEnd, i*2); }
  return `${ddmmyyyy(s)} ➜ ${ddmmyyyy(e)}`;
}

/* Transactions click (always wired) */
cardBalance.addEventListener("click", ()=>{
  if (!gTransactions.length){
    openModalHTML("Transactions — Balance_Expenses", "<p class='small muted'>No transactions found.</p>");
    return;
  }
  let html = `<div class="table-wrap"><table><thead><tr>
    <th>Date</th><th>Remarks</th><th>Expenses</th><th>Balance</th><th>Responsible</th>
  </tr></thead><tbody>`;
  gTransactions.forEach(r=>{
    html += `<tr>
      <td>${r.date ?? ""}</td>
      <td>${r.remarks ?? ""}</td>
      <td>${r.expenses ?? 0}</td>
      <td>${r.balance ?? 0}</td>
      <td>${r.responsible ?? ""}</td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  openModalHTML("Transactions — Balance_Expenses", html);
});

async function loadDashboard(){
  const month = ym();
  dashMonthEl.textContent   = prettyMonth(month);
  dashMonthEB.textContent   = prettyMonth(month);
  dashMonthMaid.textContent = prettyMonth(month);

  try{
    const res = await fetch(`${GAS_BASE_URL}?month=${month}&_=${Date.now()}`, { method:"GET", cache:"no-store" });
    const data = await res.json();

    /* ===== Paid/Pending counts (also drive modal lists) ===== */
    const payments = Array.isArray(data.payments) ? data.payments : [];
    const paidFlatsArr = payments.filter(p=>p.maintPaid).map(p=> String(p.apartment||"").trim());
    const paidFlats = new Set(paidFlatsArr);
    const pendingFlats = APTS.filter(a => !paidFlats.has(a));

    paidCountEl.textContent = String(paidFlats.size);
    pendingCountEl.textContent = String(pendingFlats.length);

    cardPaid.onclick    = ()=> {
      const list = Array.from(paidFlats).sort();
      openModalHTML("Flats Paid", `<ul id="modal-list">${list.map(x=>`<li>${x}</li>`).join("") || "<li>None</li>"}</ul>`);
    };
    cardPending.onclick = ()=> {
      openModalHTML("Flats Pending (Due)", `<ul id="modal-list">${pendingFlats.map(x=>`<li>${x}</li>`).join("") || "<li>None</li>"}</ul>`);
    };

    if (tbodyMaint){
      tbodyMaint.innerHTML = "";
      APTS.forEach(apt => {
        const row = payments.find(p => String(p.apartment) === apt) || {};
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${apt}</td>
          <td>${row.maintAmount ?? "-"}</td>
          <td class="${row.maintPaid ? "ok" : "warn"}">${row.maintPaid ? "Yes" : "No"}</td>
        `;
        tbodyMaint.appendChild(tr);
      });
    }

    /* ===== EB ===== */
    const eb = data.eb || {};
    if (typeof eb.amountCommon === "number"){ ebAmountEl.textContent = `${eb.amountCommon}`; ebAmountNoteEl.textContent = ""; }
    else if (eb.note){ ebAmountEl.textContent = "—"; ebAmountNoteEl.textContent = eb.note; }
    else {
      const unique = Array.from(new Set(payments.map(p => Number(p.ebAmount)||0).filter(v=>v>0)));
      if (unique.length === 1){ ebAmountEl.textContent = `${unique[0]}`; ebAmountNoteEl.textContent = ""; }
      else if (unique.length > 1){ ebAmountEl.textContent = "—"; ebAmountNoteEl.textContent = "Varies by flat; set a single common amount."; }
      else { ebAmountEl.textContent = "—"; ebAmountNoteEl.textContent = ""; }
    }
    const allEbPaid = payments.length ? payments.every(p=>p.ebPaid) : false;
    ebPaidEl.textContent = allEbPaid ? "All Paid" : "Pending Exists";
    ebNextEl.textContent = nextEbWindow(); // only one period

    /* ===== Common Area Controller in header ===== */
    let cac = null;
    if (Array.isArray(data.opl)){
      for (let i=data.opl.length-1; i>=0; i--){
        const r = data.opl[i];
        const t = String(r.title||"").toLowerCase();
        const rem = String(r.remarks||"").toLowerCase();
        if (t.includes("common area controller") || rem.includes("common area controller")){
          cac = r.apartment || r.remarks || r.title; break;
        }
      }
    }
    cacBadge.textContent = `Common Area Controller: ${cac ? String(cac) : "—"}`;

    /* ===== Maid ===== */
    maidAmountEl.textContent = (data.maid && typeof data.maid.amountThisMonth === "number") ? `${data.maid.amountThisMonth}` : "—";
    maidLeavesEl.textContent = data.maid?.leavesThisMonth ?? "0";
    maidPaidEl.textContent   = data.maid?.paidThisMonth ? "Paid" : "Not Paid";

    /* ===== Lift (expiry color) ===== */
    if (data.lift){
      const insDays = daysUntil(data.lift.insurance?.validUntil);
      liftInsPaidEl.textContent  = data.lift.insurance?.paid ? "Paid" : "Not Paid";
      liftInsValidEl.textContent = data.lift.insurance?.validUntil || "—";
      liftInsDaysEl.textContent  = (insDays===null) ? "" : (insDays < 0 ? `${Math.abs(insDays)} days overdue` : `${insDays} days left`);
      setExpiryClass(insCard, insDays);

      const amcDays = daysUntil(data.lift.amc?.validUntil);
      liftAmcPaidEl.textContent  = data.lift.amc?.paid ? "Paid" : "Not Paid";
      liftAmcValidEl.textContent = data.lift.amc?.validUntil || "—";
      liftAmcDaysEl.textContent  = (amcDays===null) ? "" : (amcDays < 0 ? `${Math.abs(amcDays)} days overdue` : `${amcDays} days left`);
      setExpiryClass(amcCard, amcDays);
    }

    /* ===== OPL ===== */
    const opl = Array.isArray(data.opl) ? data.opl : [];
    const openItems = opl.filter(x => (String(x.status||"").toLowerCase() !== "closed"));
    const closedItems = opl.filter(x => (String(x.status||"").toLowerCase() === "closed"));
    oplOpenCountEl.textContent = String(openItems.length);
    oplClosedCountEl.textContent = String(closedItems.length);

    oplTableBody.innerHTML = "";
    [...openItems, ...closedItems].slice(0,5).forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.id ?? ""}</td>
        <td>${item.title ?? item.issue ?? ""}</td>
        <td class="${String(item.status||"").toLowerCase()==="closed" ? "ok" : "warn"}">${item.status ?? ""}</td>
        <td>${item.apartment ?? ""}</td>
        <td>${item.remarks ?? ""}</td>
      `;
      oplTableBody.appendChild(tr);
    });
    document.getElementById("opl-more").onclick = ()=>{
      const rows = [...openItems, ...closedItems];
      if (!rows.length){ openModalHTML("OPL — Full List", "<p class='small muted'>No items.</p>"); return; }
      let html = `<div class="table-wrap"><table><thead><tr>
      <th>ID</th><th>Title / Issue</th><th>Status</th><th>Apt</th><th>Remarks</th>
      </tr></thead><tbody>`;
      rows.forEach(item=>{
        const st = String(item.status||""); const cls = st.toLowerCase()==="closed" ? "ok" : "warn";
        html += `<tr>
          <td>${item.id ?? ""}</td>
          <td>${item.title ?? item.issue ?? ""}</td>
          <td class="${cls}">${st}</td>
          <td>${item.apartment ?? ""}</td>
          <td>${item.remarks ?? ""}</td>
        </tr>`;
      });
      html += `</tbody></table></div>`;
      openModalHTML("OPL — Full List", html);
    };

    /* ===== Balance & Expenses ===== */
    const bal = data.balance || {};
    const total = Number(bal.totalBalance||0);
    const exp   = Number(bal.totalExpenses||0);
    const avail = Number(bal.available|| (total - exp));

    balTotalEl.textContent = `${total}`;
    balExpensesEl.textContent = `${exp}`;
    balAvailableEl.textContent = `${avail}`;
    balTotalInlineEl.textContent = `${total}`;
    balExpensesInlineEl.textContent = `${exp}`;

    gTransactions = Array.isArray(bal.list) ? bal.list : [];

  }catch(err){
    console.error("Dashboard fetch failed:", err);
  }
}

loadDashboard();
