/* ====== CONFIG ====== */
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbyblwpOPq_hWkYJFZvBbZABJtHRCFYOaWZZ05HuuFmz5Onb8C1d9nGD2JXzwG-CGawPdw/exec";
/* ==================== */

const APTS = ["F1","F2","F3","S1","S2","T1","T2","T3"]; // used for counts and pending lists
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
const maidAmountEl = document.getElementById("maid-amount");
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

/* Modal */
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modal-close");
const modalX = document.getElementById("modal-x");
const modalTitle = document.getElementById("modal-title");
const modalList = document.getElementById("modal-list");

function ym(d = new Date()){ return d.toISOString().slice(0,7); } // YYYY-MM
function prettyMonth(ymStr){ const [Y,M] = ymStr.split("-"); return new Date(+Y, +M-1, 1).toLocaleString(undefined,{month:"long", year:"numeric"}); }

function openModal(title, items){
  modalTitle.textContent = title;
  modalList.innerHTML = "";
  if (!items || items.length === 0){
    const li = document.createElement("li");
    li.textContent = "None";
    modalList.appendChild(li);
  } else {
    items.forEach(x => {
      const li = document.createElement("li"); li.textContent = x; modalList.appendChild(li);
    });
  }
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
}
function closeModal(){
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
}
modalClose.addEventListener("click", closeModal);
modalX.addEventListener("click", closeModal);
document.addEventListener("keydown", (e)=>{ if(e.key==="Escape") closeModal(); });

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

    // click behavior
    document.getElementById("card-paid").onclick    = ()=> openModal("Flats Paid", Array.from(paidFlats).sort());
    document.getElementById("card-pending").onclick = ()=> openModal("Flats Pending (Due)", pendingFlats);

    // per-apt maintenance table (kept)
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
    maidAmountEl.textContent = (data.maid && typeof data.maid.amountThisMonth === "number")
      ? `${data.maid.amountThisMonth}`
      : "—";
    maidLeavesEl.textContent = data.maid?.leavesThisMonth ?? "0";
    maidPaidEl.textContent   = data.maid?.paidThisMonth ? "Paid" : "Not Paid";

    /* ===== Lift Details ===== */
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
    oplOpenCountEl.textContent = String(openItems.length);
    oplClosedCountEl.textContent = String(closedItems.length);

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

  }catch(err){
    console.error("Dashboard fetch failed:", err);
  }
}

/* (Form submit kept as before – if you still have the form on the page) */
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
