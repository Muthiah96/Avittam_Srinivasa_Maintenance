/* ====== CONFIG: paste your Apps Script web app URL here ====== */
const GAS_BASE_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL"; // e.g. https://script.google.com/macros/s/AKfycb.../exec
/* ============================================================= */

const APTS = ["F1","F2","F3","S1","S2","T1","T2","T3"];

const dashMonthEl = document.getElementById("dash-month");
const dashMonthEl2 = document.getElementById("dash-month-2");
const paidCountEl = document.getElementById("paid-count");
const pendingCountEl = document.getElementById("pending-count");
const maidTodayEl = document.getElementById("maid-today");
const maidLeavesEl = document.getElementById("maid-leaves");
const maidPaidEl = document.getElementById("maid-paid");
const ebAmountEl = document.getElementById("eb-amount");
const ebPaidEl = document.getElementById("eb-paid");
const tbody = document.getElementById("apt-table-body");
const yearEl = document.getElementById("year");
yearEl.textContent = new Date().getFullYear();

function ym(d = new Date()) {
  return d.toISOString().slice(0,7); // YYYY-MM
}
function prettyMonth(ymStr) {
  const [Y,M] = ymStr.split("-");
  return new Date(parseInt(Y), parseInt(M)-1, 1).toLocaleString(undefined,{month:"long", year:"numeric"});
}
async function loadDashboard() {
  const month = ym();
  dashMonthEl.textContent = prettyMonth(month);
  dashMonthEl2.textContent = prettyMonth(month);

  try {
    const res = await fetch(`${GAS_BASE_URL}?month=${month}`, { method: "GET" });
    if (!res.ok) throw new Error("Failed to fetch");
    const data = await res.json();
    // data shape (see Apps Script below):
    // {
    //   month, payments: [{apartment, maintAmount, maintPaid, ebAmount, ebPaid}], 
    //   maid: {todayCame: true/false, leavesThisMonth: number, paidThisMonth: true/false},
    //   totals: {paidCount, pendingCount, ebAmountTotal}
    // }

    paidCountEl.textContent = data?.totals?.paidCount ?? "0";
    pendingCountEl.textContent = data?.totals?.pendingCount ?? "0";
    maidTodayEl.textContent = data?.maid?.todayCame ? "Came" : "Not Came";
    maidLeavesEl.textContent = data?.maid?.leavesThisMonth ?? "0";
    maidPaidEl.textContent = data?.maid?.paidThisMonth ? "Paid" : "Not Paid";
    ebAmountEl.textContent = data?.totals?.ebAmountTotal != null ? `Total: ${data.totals.ebAmountTotal}` : "—";
    ebPaidEl.textContent = (data?.payments?.every(r => r.ebPaid) ? "All Paid" : "Pending Exists");

    // Fill apartment table
    tbody.innerHTML = "";
    APTS.forEach(apt => {
      const row = data.payments?.find(p => p.apartment === apt) || {};
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${apt}</td>
        <td>${row.maintAmount ?? "-"}</td>
        <td class="${row.maintPaid ? "ok" : "warn"}">${row.maintPaid ? "Yes" : "No"}</td>
        <td>${row.ebAmount ?? "-"}</td>
        <td class="${row.ebPaid ? "ok" : "warn"}">${row.ebPaid ? "Yes" : "No"}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error(e);
    // Fallback demo data so UI still renders
    paidCountEl.textContent = "0";
    pendingCountEl.textContent = APTS.length.toString();
    maidTodayEl.textContent = "—";
    maidLeavesEl.textContent = "—";
    maidPaidEl.textContent = "—";
    ebAmountEl.textContent = "—";
    ebPaidEl.textContent = "—";
    tbody.innerHTML = APTS.map(a=>`<tr>
      <td>${a}</td><td>-</td><td class="warn">No</td><td>-</td><td class="warn">No</td>
    </tr>`).join("");
  }
}

document.getElementById("req-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("form-msg");
  msg.textContent = "Submitting...";
  const formData = new FormData(e.target);
  const payload = Object.fromEntries(formData.entries());
  payload.timestamp = new Date().toISOString();

  try {
    const res = await fetch(GAS_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Network error");
    const out = await res.json();
    if (out.success) {
      msg.textContent = "Request submitted. You will receive updates via email.";
      e.target.reset();
    } else {
      msg.textContent = "Submission failed. Please try again.";
    }
  } catch (err) {
    console.error(err);
    msg.textContent = "Submission failed. Check connection and try again.";
  }
});

loadDashboard();
