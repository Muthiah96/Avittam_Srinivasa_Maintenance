/* ====== CONFIG ====== */
const GAS_BASE_URL =
  "https://script.google.com/macros/s/AKfycbyblwpOPq_hWkYJFZvBbZABJtHRCFYOaWZZ05HuuFmz5Onb8C1d9nGD2JXzwG-CGawPdw/exec";
/* ==================== */

const APTS = ["F1","F2","F3","S1","S2","T1","T2","T3"];
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Helpers ---------- */
// Safe text write + Indian number format
const setText = (id, val) => {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
  else console.warn("Missing element:", id);
};
const fmtINR = (n) => {
  const x = Number(n);
  return Number.isFinite(x) ? x.toLocaleString("en-IN") : "0";
};

/* Loader/Error */
const appEl = document.getElementById("app");
const loaderEl = document.getElementById("loader");
const errorEl = document.getElementById("error");
function showLoader(){ loaderEl.classList.remove("hidden"); appEl.classList.add("hidden"); }
function hideLoader(){ loaderEl.classList.add("hidden"); appEl.classList.remove("hidden"); }
function showError(msg){ if(!errorEl) return; errorEl.textContent = msg; errorEl.classList.remove("hidden"); }

/* Month labels */
const dashMonthEl = document.getElementById("dash-month");
const dashMonthEB = document.getElementById("dash-month-eb");
const dashMonthMaid = document.getElementById("dash-month-maid");

/* CAC pill */
const cacText = document.getElementById("cac-text");

/* Maintenance */
const paidCountEl = document.getElementById("paid-count");
const pendingCountEl = document.getElementById("pending-count");
const tbodyMaint = document.getElementById("apt-table-maint");
const btnPaid = document.getElementById("btn-paid");
const btnPending = document.getElementById("btn-pending");

/* EB */
const ebAmountEl = document.getElementById("eb-amount");
const ebAmountNoteEl = document.getElementById("eb-amount-note");
const ebPaidEl = document.getElementById("eb-paid");
const ebNextEl = document.getElementById("eb-next");

/* Sweeper */
const maidAmountEl = document.getElementById("maid-amount");
const maidLeavesEl = document.getElementById("maid-leaves");
const maidPaidEl = document.getElementById("maid-paid");

/* Lift */
const rowIns = document.getElementById("row-ins");
const rowAmc = document.getElementById("row-amc");
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

/* Modal */
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalX = document.getElementById("modal-x");
const modalTitle = document.getElementById("modal-title");
const modalContent = document.getElementById("modal-content");

function openModalHTML(title, html){
  modalTitle.textContent = title;
  modalContent.innerHTML = html;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
}
function closeModal(){ modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true"); }
if (modalClose) modalClose.addEventListener("click", closeModal);
if (modalX) modalX.addEventListener("click", closeModal);
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeModal(); });

/* ---------- Date helpers ---------- */
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
function setStatusColor(el, days){
  el.classList.remove("ok","warn","bad");
  if (days === null) return;
  if (days < 0) el.classList.add("bad");
  else if (days <= 40) el.classList.add("warn");
  else el.classList.add("ok");
}

/* EB window: 15.09.2025–22.09.2025, then +2 months; show next >= today */
function ddmmyyyy(d){ return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`; }
function addMonths(date, n){ const d=new Date(date.getTime()); d.setMonth(d.getMonth()+n); return d; }
function nextEbWindow(){
  const baseStart = new Date(2025,8,15); // Sep
  const baseEnd   = new Date(2025,8,22);
  const today = new Date();
  let i=0, s=baseStart, e=baseEnd;
  while (e < today && i < 100){ i++; s = addMonths(baseStart, i*2); e = addMonths(baseEnd, i*2); }
  return `${ddmmyyyy(s)} ➜ ${ddmmyyyy(e)}`;
}

/* ---------- Main load ---------- */
async function loadDashboard(){
  showLoader();

  const requested = new Date().toISOString().slice(0,7);
  try{
    const res = await fetch(`${GAS_BASE_URL}?month=${requested}&_=${Date.now()}`, { method:"GET", cache:"no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const monthUsed = data.month || requested;
    const monthLabel = new Date(monthUsed + "-01").toLocaleString(undefined,{month:"long", year:"numeric"});
    setText("dash-month", monthLabel);
    setText("dash-month-eb", monthLabel);
    setText("dash-month-maid", monthLabel);

    /* CAC pill (from OPL remarks/title) */
    let cac = "—";
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
    setText("cac-text", `Common Area Controller: ${cac}`);

    /* Maintenance */
    const payments = Array.isArray(data.payments) ? data.payments : [];
    const paidSet = new Set(payments.filter(p=>p.maintPaid).map(p=>String(p.apartment||"").trim().toUpperCase()));
    const pending = APTS.filter(a => !paidSet.has(a));

    setText("paid-count", paidSet.size);
    setText("pending-count", pending.length);

    btnPaid.onclick = ()=> openModalHTML(
      "Flats Paid",
      `<ul id="modal-list">${Array.from(paidSet).sort().map(x=>`<li>${x}</li>`).join("") || "<li>None</li>"}</ul>`
    );
    btnPending.onclick = ()=> openModalHTML(
      "Flats Pending (Due)",
      `<ul id="modal-list">${pending.map(x=>`<li>${x}</li>`).join("") || "<li>None</li>"}</ul>`
    );

    if (tbodyMaint){
      tbodyMaint.innerHTML = "";
      APTS.forEach(apt => {
        const row = payments.find(p => String(p.apartment).toUpperCase() === apt) || {};
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${apt}</td>
          <td>${row.maintAmount ?? "-"}</td>
          <td class="${row.maintPaid ? "ok" : "warn"}">${row.maintPaid ? "Yes" : "No"}</td>
        `;
        tbodyMaint.appendChild(tr);
      });
    }

    /* EB */
    const eb = data.eb || {};
    if (typeof eb.amountCommon === "number"){
      setText("eb-amount", eb.amountCommon);
      setText("eb-amount-note", "");
    } else if (eb.note){
      setText("eb-amount", "—");
      setText("eb-amount-note", eb.note);
    } else {
      const unique = Array.from(new Set(payments.map(p => Number(p.ebAmount)||0).filter(v=>v>0)));
      if (unique.length === 1){ setText("eb-amount", unique[0]); setText("eb-amount-note",""); }
      else if (unique.length > 1){ setText("eb-amount","—"); setText("eb-amount-note","Varies by flat; set a single common amount."); }
      else { setText("eb-amount","—"); setText("eb-amount-note",""); }
    }
    const allEbPaid = payments.length ? payments.every(p=>p.ebPaid) : false;
    setText("eb-paid", allEbPaid ? "All Paid" : "Pending Exists");
    setText("eb-next", nextEbWindow());

    /* Sweeper */
    setText("maid-amount", (data.maid && typeof data.maid.amountThisMonth === "number") ? data.maid.amountThisMonth : "—");
    setText("maid-leaves", data.maid?.leavesThisMonth ?? "0");
    setText("maid-paid",   data.maid?.paidThisMonth ? "Paid" : "Not Paid");

    /* Lift */
    if (data.lift){
      const insDays = daysUntil(data.lift.insurance?.validUntil);
      liftInsPaidEl.textContent  = data.lift.insurance?.paid ? "Paid" : "Not Paid";
      liftInsValidEl.textContent = data.lift.insurance?.validUntil || "—";
      liftInsDaysEl.textContent  = (insDays===null) ? "" : (insDays < 0 ? `${Math.abs(insDays)} days overdue` : `${insDays} days left`);
      setStatusColor(rowIns, insDays);

      const amcDays = daysUntil(data.lift.amc?.validUntil);
      liftAmcPaidEl.textContent  = data.lift.amc?.paid ? "Paid" : "Not Paid";
      liftAmcValidEl.textContent = data.lift.amc?.validUntil || "—";
      liftAmcDaysEl.textContent  = (amcDays===null) ? "" : (amcDays < 0 ? `${Math.abs(amcDays)} days overdue` : `${amcDays} days left`);
      setStatusColor(rowAmc, amcDays);
    }

    /* OPL */
    const opl = Array.isArray(data.opl) ? data.opl : [];
    const openItems = opl.filter(x => (String(x.status||"").toLowerCase() !== "closed"));
    const closedItems = opl.filter(x => (String(x.status||"").toLowerCase() === "closed"));
    setText("opl-open-count", openItems.length);
    setText("opl-closed-count", closedItems.length);

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
    oplMoreBtn.onclick = ()=>{
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

    /* Balance — write safely + format numbers */
    console.log("Balance from API:", data.balance);
    (function updateBalance(bal){
      const total = Number(bal?.totalBalance ?? 0);
      const exp   = Number(bal?.totalExpenses ?? 0);
      const avail = Number(bal?.available ?? (total - exp));
      setText("bal-available",       fmtINR(avail));
      setText("bal-total-inline",    fmtINR(total));
      setText("bal-expenses-inline", fmtINR(exp));
    })(data.balance || {});

    hideLoader();
  }catch(err){
    console.error("Dashboard fetch failed:", err);
    showError("Could not load data. Please try again in a moment.");
    hideLoader(); // show page so error bar is visible
  }
}

loadDashboard();
