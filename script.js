/* ====== CONFIG ====== */
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbyblwpOPq_hWkYJFZvBbZABJtHRCFYOaWZZ05HuuFmz5Onb8C1d9nGD2JXzwG-CGawPdw/exec";
/* ==================== */

const APTS = ["F1","F2","F3","S1","S2","T1","T2","T3"];
const yearEl = document.getElementById("year"); yearEl.textContent = new Date().getFullYear();

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
function ym(d = new Date()){ return d.toISOString().slice(0,7); } // YYYY-MM
function prettyMonth(ymStr){ const [Y,M] = ymStr.split("-"); return new Date(+Y, +M-1, 1).toLocaleString(undefined,{month:"long", year:"numeric"}); }

function openModalList(title, items){
  modalTitle.textContent = title;
  modalList.innerHTML = "";
  modalContent.style.display = "block";
  if (!items || items.length === 0){
    const li = document.createElement("li"); li.textContent = "None"; modalList.appendChild(li);
  } else {
    items.forEach(x => { const li = document.createElement("li"); li.textContent = x; modalList.appendChild(li); });
  }
  modal.classList.remove("hidden"); modal.setAttribute("aria-hidden","false");
}
function openModalHTML(title, html){
  modalTitle.textContent = title;
  modalList.innerHTML = "";
  modalContent.innerHTML = html;
  modal.classList.remove("hidden"); modal.setAttribute("aria-hidden","false");
}
function closeModal(){ modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true"); modalContent.innerHTML = '<ul id="modal-list"></ul>'; }
modalClose.addEventListener("click", closeModal);
modalX.addEventListener("click", closeModal);
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeModal(); });

/* Parse many date formats to a Date; return null if invalid */
function parseDateFlexible(s){
  if (!s) return null;
  if (s instanceof Date) return s;
  const t = String(s).trim();
  // ISO or RFC
  const d1 = new Date(t);
  if (!isNaN(d1)) return d1;
  // dd/mm/yyyy or dd-mm-yyyy
  const m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (m){
    const day = parseInt(m[1],10), mon = parseInt(m[2],10)-1, yr = parseInt(m[3],10);
    const d = new Date(yr, mon, day);
    if (!isNaN(d)) return d;
  }
  // yyyy/mm/dd
  const m2 = t.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
  if (m2){
    const yr = parseInt(m2[1],10), mon = parseInt(m2[2],10)-1, day = parseInt(m2[3],10);
    const d = new Date(yr, mon, day);
    if (!isNaN(d)) return d;
  }
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
  if (days === null){ return; }
  if (days < 0)      tileEl.classList.add("tile--bad");
  else if (days <= 40) tileEl.classList.add("tile--warn");
  else               tileEl.classList.add("tile--ok");
}

async function loadDashboard(){
  const month = ym();
  dashMonthEl.textContent   = prettyMonth(month);
  dashMonthEB.textContent   = prettyMonth(month);
  dashMonthMaid.textContent = prettyMonth(month);

  try{
    const url = `${GAS_BASE_URL}?month=${month}&_=${Date.now()}`;
    const res = await fetch(url, { method:"GET", cache:"no-store" });
    const data = await res.json();
    console.log("Dashboard data:", data);

    /* ===== Maintenance ===== */
    const paidFlats = new Set((data.payments||[]).filter(p=>p.maintPaid).map(p=>p.apartment));
    const paidCount = paidFlats.size;
    const pendingFlats = APTS.filter(a => !paidFlats.has(a));
    const pendingCount = pendingFlats.length;

    paidCountEl.textContent = String(paidCount);
    pendingCountEl.textContent = String(pendingCount);
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

    /* ===== EB (common) ===== */
    const eb = data.eb || {};
    if (typeof eb.amountCommon === "number"){
      ebAmountEl.textContent = `${eb.amountCommon}`;
      ebAmountNoteEl.textContent = "";
    } else if (eb.note){
      ebAmountEl.textContent = "—";
      ebAmountNoteEl.textContent = eb.note;
    } else {
      const unique = Array.from(new Set((data.payments||[]).map(p => Number(p.ebAmount)||0).filter(v=>v>0)));
      if (unique.length === 1){ ebAmountEl.textContent = `${unique[0]}`; ebAmountNoteEl.textContent = ""; }
      else if (unique.length > 1){ ebAmountEl.textContent = "—"; ebAmountNoteEl.textContent = "Varies by flat; set a single common amount."; }
      else { ebAmountEl.textContent = "—"; ebAmountNoteEl.textContent = ""; }
    }
    const allEbPaid = (data.eb && typeof data.eb.allPaid === "boolean")
      ? data.eb.allPaid
      : ((data.payments||[]).length ? (data.payments||[]).every(p=>p.ebPaid) : false);
    ebPaidEl.textContent = allEbPaid ? "All Paid" : "Pending Exists";

    /* ===== Maid (amount, leaves, paid) ===== */
    maidAmountEl.textContent = (data.maid && typeof data.maid.amountThisMonth === "number")
      ? `${data.maid.amountThisMonth}`
      : "—";
    maidLeavesEl.textContent = data.maid?.leavesThisMonth ?? "0";
    maidPaidEl.textContent   = data.maid?.paidThisMonth ? "Paid" : "Not Paid";

    /* ===== Lift Details with expiry color ===== */
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
    } else {
      [liftInsPaidEl, liftInsValidEl, liftInsDaysEl, liftAmcPaidEl, liftAmcValidEl, liftAmcDaysEl].forEach(el=>{ if(el) el.textContent="—"; });
    }

    /* ===== OPL (show up to 5; full list in modal) ===== */
    const opl = Array.isArray(data.opl) ? data.opl : [];
    const openItems = opl.filter(x => (String(x.status||"").toLowerCase() !== "closed"));
    const closedItems = opl.filter(x => (String(x.status||"").toLowerCase() === "closed"));
    oplOpenCountEl.textContent = String(openItems.length);
    oplClosedCountEl.textContent = String(closedItems.length);

    // top 5 by open first then closed
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
      if (rows.length === 0){ openModalList("OPL — Full List", []); return; }
      // Build a small HTML table in modal
      let html = `<div class="table-wrap"><table><thead><tr>
      <th>ID</th><th>Title / Issue</th><th>Status</th><th>Apt</th><th>Remarks</th>
      </tr></thead><tbody>`;
      rows.forEach(item=>{
        const st = String(item.status||"");
        const cls = st.toLowerCase()==="closed" ? "ok" : "warn";
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
    } else {
      balTotalEl.textContent = balExpensesEl.textContent = balAvailableEl.textContent = "—";
    }

  }catch(err){
    console.error("Dashboard fetch failed:", err);
  }
}

loadDashboard();
