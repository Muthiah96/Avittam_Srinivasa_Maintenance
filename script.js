/* ====== CONFIG ====== */
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbyblwpOPq_hWkYJFZvBbZABJtHRCFYOaWZZ05HuuFmz5Onb8C1d9nGD2JXzwG-CGawPdw/exec";
/* ==================== */

const APTS = ["F1","F2","F3","S1","S2","T1","T2","T3"];
document.getElementById("year").textContent = new Date().getFullYear();

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
const ebPeriodsEl = document.getElementById("eb-periods");

/* CAC (from OPL.Apt) */
const cacValueEl = document.getElementById("cac-value");

/* Maid */
const maidAmountEl = document.getElementById("maid-amount");
const maidLeavesEl = document.getElementById("maid-leaves");
const maidPaidEl = document.getElementById("maid-paid");

/* Lift */
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

/* Modal */
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalX = document.getElementById("modal-x");
const modalTitle = document.getElementById("modal-title");
const modalList = document.getElementById("modal-list");
const modalContent = document.getElementById("modal-content");

/* Utils */
function ym(d=new Date()){ return d.toISOString().slice(0,7); } // YYYY-MM
function prettyMonth(ymStr){ const [Y,M]=ymStr.split("-"); return new Date(+Y, +M-1, 1).toLocaleString(undefined,{month:"long", year:"numeric"}); }
function openModalList(title, items){
  modalTitle.textContent = title;
  modalList.innerHTML = "";
  modalContent.innerHTML = '<ul id="modal-list"></ul>';
  const ul = modalContent.querySelector("#modal-list");
  if (!items || !items.length){ const li=document.createElement("li"); li.textContent="None"; ul.appendChild(li); }
  else items.forEach(x => { const li=document.createElement("li"); li.textContent = x; ul.appendChild(li); });
  modal.classList.remove("hidden"); modal.setAttribute("aria-hidden","false");
}
function openModalHTML(title, html){
  modalTitle.textContent = title;
  modalContent.innerHTML = html;
  modal.classList.remove("hidden"); modal.setAttribute("aria-hidden","false");
}
function closeModal(){ modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true"); }
modalClose.addEventListener("click", closeModal);
modalX.addEventListener("click", closeModal);
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeModal(); });

/* Dates */
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

/* EB windows: start with 15.09.2025–22.09.2025, then +2 months rolling */
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
function nextEbWindows(count=3){
  const baseStart = new Date(2025,8,15); // 15 Sep 2025 (month is 0-based)
  const baseEnd   = new Date(2025,8,22); // 22 Sep 2025
  const list = [];
  for (let i=0;i<count;i++){
    const s = addMonths(baseStart, i*2);
    const e = addMonths(baseEnd, i*2);
    list.push(`${ddmmyyyy(s)} ➜ ${ddmmyyyy(e)}`);
  }
  return list;
}

async function loadDashboard(){
  const month = ym();
  dashMonthEl.textContent   = prettyMonth(month);
  dashMonthEB.textContent   = prettyMonth(month);
  dashMonthMaid.textContent = prettyMonth(month);

  try{
    const res = await fetch(`${GAS_BASE_URL}?month=${month}&_=${Date.now()}`, { method:"GET", cache:"no-store" });
    const data = await res.json();

    /* ===== Maintenance ===== */
    const paidFlats = new Set((data.payments||[]).filter(p=>p.maintPaid).map(p=>p.apartment));
    const pendingFlats = APTS.filter(a => !paidFlats.has(a));
    paidCountEl.textContent = String(paidFlats.size);
    pendingCountEl.textContent = String(pendingFlats.length);

    // clicks (ensure bound)
    cardPaid.onclick    = ()=> openModalList("Flats Paid", Array.from(paidFlats).sort());
    cardPending.onclick = ()=> openModalList("Flats Pending (Due)", pendingFlats);

    if (tbodyMaint){
      tbodyMaint.innerHTML = "";
      APTS.forEach(apt => {
        const row = (data.payments||[]).find(p => p.apartment === apt) || {};
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${apt}</td>
          <td>${row.maintAmount ?? "-"}</td>
          <td class="${row.maintPaid ? "ok" : "warn"}">${row.maintPaid ? "Yes" : "No"}</td>
        `;
        tbodyMaint.appendChild(tr);
      });
    }

    /* ===== EB (common + next periods) ===== */
    const eb = data.eb || {};
    if (typeof eb.amountCommon === "number"){ ebAmountEl.textContent = `${eb.amountCommon}`; ebAmountNoteEl.textContent = ""; }
    else if (eb.note){ ebAmountEl.textContent = "—"; ebAmountNoteEl.textContent = eb.note; }
    else {
      const unique = Array.from(new Set((data.payments||[]).map(p => Number(p.ebAmount)||0).filter(v=>v>0)));
      if (unique.length === 1){ ebAmountEl.textContent = `${unique[0]}`; ebAmountNoteEl.textContent = ""; }
      else if (unique.length > 1){ ebAmountEl.textContent = "—"; ebAmountNoteEl.textContent = "Varies by flat; set a single common amount."; }
      else { ebAmountEl.textContent = "—"; ebAmountNoteEl.textContent = ""; }
    }
    const allEbPaid = (data.payments||[]).length ? (data.payments||[]).every(p=>p.ebPaid) : false;
    ebPaidEl.textContent = allEbPaid ? "All Paid" : "Pending Exists";

    ebPeriodsEl.innerHTML = "";
    nextEbWindows(4).forEach(p => {
      const li = document.createElement("li"); li.textContent = p; ebPeriodsEl.appendChild(li);
    });

    /* ===== Common Area Controller (from OPL.Apt) ===== */
    // Find latest OPL row whose title/remarks include "Common Area Controller"
    let cac = null;
    if (Array.isArray(data.opl)){
      for (let i=data.opl.length-1; i>=0; i--){
        const r = data.opl[i];
        const t = String(r.title||"").toLowerCase();
        const rem = String(r.remarks||"").toLowerCase();
        if (t.includes("common area controller") || rem.includes("common area controller")){
          cac = r.apartment || r.remarks || r.title;
          break;
        }
      }
    }
    cacValueEl.textContent = cac ? String(cac) : "—";

    /* ===== Maid ===== */
    maidAmountEl.textContent = (data.maid && typeof data.maid.amountThisMonth === "number") ? `${data.maid.amountThisMonth}` : "—";
    maidLeavesEl.textContent = data.maid?.leavesThisMonth ?? "0";
    maidPaidEl.textContent   = data.maid?.paidThisMonth ? "Paid" : "Not Paid";

    /* ===== Lift (expiry color) ===== */
    if (data.lift){
      // Insurance
      liftInsPaidEl.textContent  = data.lift.insurance?.paid ? "Paid" : "Not Paid";
      liftInsValidEl.textContent = data.lift.insurance?.validUntil || "—";
      const insDays = daysUntil(data.lift.insurance?.validUntil);
      liftInsDaysEl.textContent  = (insDays===null) ? "" : (insDays < 0 ? `${Math.abs(insDays)} days overdue` : `${insDays} days left`);
      setExpiryClass(insCard, insDays);
      // AMC
      liftAmcPaidEl.textContent  = data.lift.amc?.paid ? "Paid" : "Not Paid";
      liftAmcValidEl.textContent = data.lift.amc?.validUntil || "—";
      const amcDays = daysUntil(data.lift.amc?.validUntil);
      liftAmcDaysEl.textContent  = (amcDays===null) ? "" : (amcDays < 0 ? `${Math.abs(amcDays)} days overdue` : `${amcDays} days left`);
      setExpiryClass(amcCard, amcDays);
    }

    /* ===== OPL (show top 5, full list in modal) ===== */
    const opl = Array.isArray(data.opl) ? data.opl : [];
    const openItems = opl.filter(x => (String(x.status||"").toLowerCase() !== "closed"));
    const closedItems = opl.filter(x => (String(x.status||"").toLowerCase() === "closed"));
    oplOpenCountEl.textContent = String(openItems.length);
    oplClosedCountEl.textContent = String(closedItems.length);

    const short = [...openItems, ...closedItems].slice(0,5);
    oplTableBody.innerHTML = "";
    short.forEach(item => {
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
    oplMoreBtn.onclick = ()=>{
      const rows = [...openItems, ...closedItems];
      if (!rows.length){ openModalList("OPL — Full List", []); return; }
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
    if (data.balance){
      balTotalEl.textContent = `${data.balance.totalBalance ?? 0}`;
      balExpensesEl.textContent = `${data.balance.totalExpenses ?? 0}`;
      balAvailableEl.textContent = `${data.balance.available ?? 0}`;

      // transactions modal
      cardBalance.onclick = ()=>{
        const rows = Array.isArray(data.balance.list) ? data.balance.list : [];
        if (!rows.length){ openModalList("Transactions", []); return; }
        let html = `<div class="table-wrap"><table><thead><tr>
          <th>Date</th><th>Remarks</th><th>Expenses</th><th>Balance</th><th>Responsible</th>
        </tr></thead><tbody>`;
        rows.forEach(r=>{
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
      };
    } else {
      cardBalance.onclick = ()=> openModalList("Transactions", []);
    }

  }catch(err){
    console.error("Dashboard fetch failed:", err);
  }
}

loadDashboard();
