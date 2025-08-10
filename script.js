/* ====== CONFIG ====== */
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbyblwpOPq_hWkYJFZvBbZABJtHRCFYOaWZZ05HuuFmz5Onb8C1d9nGD2JXzwG-CGawPdw/exec";
/* ==================== */

const APTS = ["F1","F2","F3","S1","S2","T1","T2","T3"]; // for maintenance counts & table
const yearEl = document.getElementById("year"); yearEl.textContent = new Date().getFullYear();

/* Maintenance */
const dashMonthEl = document.getElementById("dash-month");
const paidCountEl = document.getElementById("paid-count");
const pendingCountEl = document.getElementById("pending-count");
const tbodyMaint = document.getElementById("apt-table-maint");

/* EB */
const dashMonthEB = document.getElementById("dash-month-eb");
const ebAmountEl = document.getElementById("eb-amount");
const ebAmountNoteEl = document.getElementById("eb-amount-note");
const ebPaidEl = document.getElementById("eb-paid");

/* Maid */
const dashMonthMaid = document.getElementById("dash-month-maid");
const maidTodayEl = document.getElementById("maid-today");
const maidLeavesEl = document.getElementById("maid-leaves");
const maidPaidEl = document.getElementById("maid-paid");

/* Lift */
const liftInsPaidEl = document.getElementById("lift-ins-paid");
const liftInsValidEl = document.getElementById("lift-ins-valid");
const liftAmcPaidEl  = document.getElementById("lift-amc-paid");
const liftAmcValidEl = document.getElementById("lift-amc-valid");

/* OPL */
const oplOpenCountEl = document.getElementById("opl-open-count");
const oplClosedCountEl = document.getElementById("opl-closed-count");
const oplTableBody = document.getElementById("opl-table");

/* History */
const historyTableBody = document.getElementById("history-table");

function ym(d = new Date()){ return d.toISOString().slice(0,7); } // YYYY-MM
function prettyMonth(ymStr){ const [Y,M] = ymStr.split("-"); return new Date(+Y, +M-1, 1).toLocaleString(undefined,{month:"long", year:"numeric"}); }

async function loadDashboard(){
  const month = ym();
  dashMonthEl.textContent = prettyMonth(month);
  dashMonthEB.textContent = prettyMonth(month);
  dashMonthMaid.textContent = prettyMonth(month);

  try{
    const url = `${GAS_BASE_URL}?month=${month}&_=${Date.now()}`;
    const res = await fetch(url, { method:"GET", cache:"no-store" });
    const data = await res.json();
    console.log("Dashboard data:", data);

    /* ===== Maintenance ===== */
    const paidCount = data?.maintenance?.paidCount ?? ((data.payments||[]).filter(p=>p.maintPaid).length);
    paidCountEl.textContent = paidCount.toString();
    const pending = Math.max(0, APTS.length - paidCount);
    pendingCountEl.textContent = pending.toString();

    // Per-apt maintenance table (kept)
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

    /* ===== EB (common) ===== */
    const eb = data.eb || {};
    if (typeof eb.amountCommon === "number"){
      ebAmountEl.textContent = `${eb.amountCommon}`;
      ebAmountNoteEl.textContent = "";
    } else if (eb.note){
      ebAmountEl.textContent = "—";
      ebAmountNoteEl.textContent = eb.note;
    } else {
      // derive from payments if backend older
      const unique = Array.from(new Set((data.payments||[]).map(p => Number(p.ebAmount)||0).filter(v=>v>0)));
      if (unique.length === 1){ ebAmountEl.textContent = `${unique[0]}`; ebAmountNoteEl.textContent = ""; }
      else if (unique.length > 1){ ebAmountEl.textContent = "—"; ebAmountNoteEl.textContent = "Varies by flat; set a single common amount."; }
      else { ebAmountEl.textContent = "—"; ebAmountNoteEl.textContent = ""; }
    }
    const allEbPaid = (data.eb && typeof data.eb.allPaid === "boolean")
      ? data.eb.allPaid
      : ((data.payments||[]).length ? (data.payments||[]).every(p=>p.ebPaid) : false);
    ebPaidEl.textContent = allEbPaid ? "All Paid" : "Pending Exists";

    /* ===== Maid ===== */
    maidTodayEl.textContent = (data.maid?.todayCame === true) ? "Came"
                              : (data.maid?.todayCame === false) ? "Not Came" : "—";
    maidLeavesEl.textContent = data.maid?.leavesThisMonth ?? "0";
    maidPaidEl.textContent = data.maid?.paidThisMonth ? "Paid" : "Not Paid";

    /* ===== Lift Details (Insurance + AMC) ===== */
    if (data.lift){
      liftInsPaidEl.textContent  = data.lift.insurance?.paid ? "Paid" : "Not Paid";
      liftInsValidEl.textContent = data.lift.insurance?.validUntil || "—";
      liftAmcPaidEl.textContent  = data.lift.amc?.paid ? "Paid" : "Not Paid";
      liftAmcValidEl.textContent = data.lift.amc?.validUntil || "—";
    } else {
      liftInsPaidEl.textContent = liftAmcPaidEl.textContent = "—";
      liftInsValidEl.textContent = liftAmcValidEl.textContent = "—";
    }

    /* ===== OPL ===== */
    const opl = Array.isArray(data.opl) ? data.opl : [];
    const openItems = opl.filter(x => (String(x.status||"").toLowerCase() !== "closed"));
    const closedItems = opl.filter(x => (String(x.status||"").toLowerCase() === "closed"));
    oplOpenCountEl.textContent = openItems.length.toString();
    oplClosedCountEl.textContent = closedItems.length.toString();

    oplTableBody.innerHTML = "";
    [...openItems, ...closedItems].forEach(item => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.id ?? ""}</td>
        <td>${item.title ?? item.issue ?? ""}</td>
        <td>${item.apartment ?? ""}</td>
        <td class="${String(item.status||"").toLowerCase()==="closed" ? "ok" : "warn"}">${item.status ?? ""}</td>
        <td>${item.owner ?? ""}</td>
        <td>${item.due ?? ""}</td>
      `;
      oplTableBody.appendChild(tr);
    });

    /* ===== History ===== */
    const history = Array.isArray(data.history) ? data.history : [];
    historyTableBody.innerHTML = "";
    history.forEach(h => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${h.date ?? ""}</td>
        <td>${h.event ?? h.type ?? ""}</td>
        <td>${h.details ?? ""}</td>
        <td>${h.by ?? ""}</td>
      `;
      historyTableBody.appendChild(tr);
    });

  }catch(err){
    console.error("Dashboard fetch failed:", err);
  }
}

/* Form submit stays same (POST as FormData to avoid CORS preflight) */
document.getElementById("req-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("form-msg");
  msg.textContent = "Submitting...";

  const form = e.target;
  const fd = new FormData(form);
  fd.append("timestamp", new Date().toISOString());

  try{
    const res = await fetch(GAS_BASE_URL, { method:"POST", body: fd });
    const out = await res.json().catch(()=>({}));
    if(out && out.success){
      msg.textContent = "Request submitted. You will receive updates via email.";
      form.reset();
      loadDashboard();
    }else{
      msg.textContent = "Submission failed. Please try again.";
    }
  }catch(err){
    console.error(err);
    msg.textContent = "Submission failed. Check connection and try again.";
  }
});

loadDashboard();
