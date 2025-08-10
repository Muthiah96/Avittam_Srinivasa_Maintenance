/* ====== CONFIG ====== */
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbyblwpOPq_hWkYJFZvBbZABJtHRCFYOaWZZ05HuuFmz5Onb8C1d9nGD2JXzwG-CGawPdw/exec";
/* ==================== */

const APTS = ["F1","F2","F3","S1","S2","T1","T2","T3"];

const dashMonthEl = document.getElementById("dash-month");
const dashMonthEB = document.getElementById("dash-month-eb");
const dashMonthMaid = document.getElementById("dash-month-maid");
const paidCountEl = document.getElementById("paid-count");
const pendingCountEl = document.getElementById("pending-count");

const ebAmountEl = document.getElementById("eb-amount");
const ebAmountNoteEl = document.getElementById("eb-amount-note");
const ebPaidEl = document.getElementById("eb-paid");

const maidTodayEl = document.getElementById("maid-today");
const maidLeavesEl = document.getElementById("maid-leaves");
const maidPaidEl = document.getElementById("maid-paid");

const liftPaidEl = document.getElementById("lift-paid");
const liftValidEl = document.getElementById("lift-valid");

const tbodyMaint = document.getElementById("apt-table-maint");
const tbodyEB = document.getElementById("apt-table-eb");
const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();

function ym(d=new Date()){ return d.toISOString().slice(0,7); }
function prettyMonth(ymStr){
  const [Y,M] = ymStr.split("-");
  return new Date(+Y, +M-1, 1).toLocaleString(undefined,{month:"long", year:"numeric"});
}

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

    // ----- Maintenance -----
    const paidApts = (data.payments || []).filter(p => p.maintPaid).map(p => p.apartment);
    const paidCount = paidApts.length;
    const totalFlats = APTS.length;
    const pending = Math.max(0, totalFlats - paidCount);

    paidCountEl.textContent = paidCount.toString();
    pendingCountEl.textContent = pending.toString();

    // per-apt maintenance table
    tbodyMaint.innerHTML = "";
    APTS.forEach(apt => {
      const row = (data.payments || []).find(p => p.apartment === apt) || {};
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${apt}</td>
        <td>${row.maintAmount ?? "-"}</td>
        <td class="${row.maintPaid ? "ok" : "warn"}">${row.maintPaid ? "Yes" : "No"}</td>
      `;
      tbodyMaint.appendChild(tr);
    });

    // ----- EB (Common amount, overall status) -----
    const ebAmounts = Array.from(new Set((data.payments||[])
      .map(p => Number(p.ebAmount)||0)
      .filter(v => v>0)
    ));
    if(ebAmounts.length === 1){
      ebAmountEl.textContent = `${ebAmounts[0]}`;
      ebAmountNoteEl.textContent = "";
    }else if(ebAmounts.length > 1){
      ebAmountEl.textContent = "—";
      ebAmountNoteEl.textContent = "Varies by flat; set a single common amount in Sheet.";
    }else{
      ebAmountEl.textContent = "—";
      ebAmountNoteEl.textContent = "";
    }

    const allEbPaid = (data.payments||[]).length
      ? (data.payments||[]).every(p => p.ebPaid)
      : false;
    ebPaidEl.textContent = allEbPaid ? "All Paid" : "Pending Exists";

    // per-apt EB table
    tbodyEB.innerHTML = "";
    APTS.forEach(apt => {
      const row = (data.payments || []).find(p => p.apartment === apt) || {};
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${apt}</td>
        <td class="${row.ebPaid ? "ok" : "warn"}">${row.ebPaid ? "Yes" : "No"}</td>
      `;
      tbodyEB.appendChild(tr);
    });

    // ----- Maid -----
    maidTodayEl.textContent = (data.maid?.todayCame === true) ? "Came"
                              : (data.maid?.todayCame === false) ? "Not Came" : "—";
    maidLeavesEl.textContent = data.maid?.leavesThisMonth ?? "0";
    maidPaidEl.textContent   = data.maid?.paidThisMonth ? "Paid" : "Not Paid";

    // ----- Lift Insurance -----
    // (Backend will add data.lift. Fallback to dashes if missing.)
    if (data.lift){
      liftPaidEl.textContent  = data.lift.paidThisMonth ? "Paid" : "Not Paid";
      liftValidEl.textContent = data.lift.validUntil || "—";
    }else{
      liftPaidEl.textContent = "—";
      liftValidEl.textContent = "—";
    }

  }catch(err){
    console.error("Dashboard fetch failed:", err);
  }
}

// ----- Form submit (unchanged) -----
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
