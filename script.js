/* ====== CONFIG ====== */
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbyblwpOPq_hWkYJFZvBbZABJtHRCFYOaWZZ05HuuFmz5Onb8C1d9nGD2JXzwG-CGawPdw/exec";
/* ==================== */

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

function ym(d = new Date()) { return d.toISOString().slice(0,7); } // YYYY-MM
function prettyMonth(ymStr) {
  const [Y,M] = ymStr.split("-");
  return new Date(+Y, +M-1, 1).toLocaleString(undefined,{month:"long", year:"numeric"});
}

async function loadDashboard() {
  const month = ym();
  dashMonthEl.textContent = prettyMonth(month);
  dashMonthEl2.textContent = prettyMonth(month);

  try {
    const url = `${GAS_BASE_URL}?month=${month}&_=${Date.now()}`;
    console.log("Fetching dashboard:", url);
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch dashboard");
    const data = await res.json();
    console.log("Dashboard data:", data);

    paidCountEl.textContent    = data.totals?.paidCount ?? "0";
    pendingCountEl.textContent = data.totals?.pendingCount ?? "0";

    maidTodayEl.textContent = (data.maid?.todayCame === true) ? "Came"
                              : (data.maid?.todayCame === false) ? "Not Came" : "—";
    maidLeavesEl.textContent = data.maid?.leavesThisMonth ?? "0";
    maidPaidEl.textContent   = data.maid?.paidThisMonth ? "Paid" : "Not Paid";

    ebAmountEl.textContent = (data.totals?.ebAmountTotal != null)
      ? `Total: ${data.totals.ebAmountTotal}` : "—";
    ebPaidEl.textContent = (data.payments?.length && data.payments.every(r => r.ebPaid))
      ? "All Paid" : "Pending Exists";

    tbody.innerHTML = "";
    APTS.forEach(apt => {
      const row = (data.payments || []).find(p => p.apartment === apt) || {};
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
    console.error("Dashboard fetch failed:", e);
  }
}

document.getElementById("req-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("form-msg");
  msg.textContent = "Submitting...";

  const form = e.target;
  const fd = new FormData(form);     // simple POST → no CORS preflight
  fd.append("timestamp", new Date().toISOString());

  try {
    const res = await fetch(GAS_BASE_URL, { method: "POST", body: fd });
    const out = await res.json().catch(() => ({}));
    if (out && out.success) {
      msg.textContent = "Request submitted. You will receive updates via email.";
      form.reset();
      loadDashboard();
    } else {
      msg.textContent = "Submission failed. Please try again.";
    }
  } catch (err) {
    console.error(err);
    msg.textContent = "Submission failed. Check connection and try again.";
  }
});

loadDashboard();
