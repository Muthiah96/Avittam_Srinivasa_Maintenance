/* ====== CONFIG ====== */
const GAS_BASE_URL =
  "https://script.google.com/macros/s/AKfycbyblwpOPq_hWkYJFZvBbZABJtHRCFYOaWZZ05HuuFmz5Onb8C1d9nGD2JXzwG-CGawPdw/exec";
/* ==================== */

const APTS = ["F1", "F2", "F3", "S1", "S2", "T1", "T2", "T3"];
document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Helpers ---------- */
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
function showLoader() {
  loaderEl.classList.remove("hidden");
  appEl.classList.add("hidden");
}
function hideLoader() {
  loaderEl.classList.add("hidden");
  appEl.classList.remove("hidden");
}
function showError(msg) {
  if (!errorEl) return;
  errorEl.textContent = msg;
  errorEl.classList.remove("hidden");
}

/* Month labels */
const dashMonthEl = document.getElementById("dash-month");
const dashMonthMaid = document.getElementById("dash-month-maid");

/* CAC pill */
const cacText = document.getElementById("cac-text");

/* Maintenance */
const btnPaid = document.getElementById("btn-paid");
const btnPending = document.getElementById("btn-pending");

/* EB */
const ebAmountEl = document.getElementById("eb-amount");
const ebPeriodEl = document.getElementById("eb-period");
const ebPaidEl = document.getElementById("eb-paid");
const ebPayWindowEl = document.getElementById("eb-pay-window");
const ebNextEl = document.getElementById("eb-next");
const ebNextPayWindowEl = document.getElementById("eb-next-pay-window");

/* Sweeper */
const maidAmountEl = document.getElementById("maid-amount");
const maidLeavesEl = document.getElementById("maid-leaves");
const maidPaidEl = document.getElementById("maid-paid");

/* Lift */
const rowIns = document.getElementById("row-ins");
const rowAmc = document.getElementById("row-amc");
const liftInsPaidEl = document.getElementById("lift-ins-paid");
const liftInsValidEl = document.getElementById("lift-ins-valid");
const liftInsDaysEl = document.getElementById("lift-ins-days");
const liftAmcPaidEl = document.getElementById("lift-amc-paid");
const liftAmcValidEl = document.getElementById("lift-amc-valid");
const liftAmcDaysEl = document.getElementById("lift-amc-days");

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

function openModalHTML(title, html) {
  modalTitle.textContent = title;
  modalContent.innerHTML = html;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}
function closeModal() {
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}
if (modalClose) modalClose.addEventListener("click", closeModal);
if (modalX) modalX.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/* ---------- Date helpers ---------- */
function parseDateFlexible(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  const t = String(s).trim();
  const d1 = new Date(t);
  if (!isNaN(d1)) return d1;

  let m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (m) {
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    if (!isNaN(d)) return d;
  }
  m = t.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})$/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (!isNaN(d)) return d;
  }
  return null;
}
function daysUntil(dateString) {
  const d = parseDateFlexible(dateString);
  if (!d) return null;
  const ms = d.setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.floor(ms / 86400000);
}
function setStatusColor(el, days) {
  el.classList.remove("ok", "warn", "bad");
  if (days === null) return;
  if (days < 0) el.classList.add("bad");
  else if (days <= 40) el.classList.add("warn");
  else el.classList.add("ok");
}

/* Common Area Controller schedule – JS side */
function getControllerForDateJs(d) {
  const date = d instanceof Date ? d : new Date(d);
  const between = (dt, y1, m1, d1, y2, m2, d2) =>
    dt >= new Date(y1, m1, d1) && dt <= new Date(y2, m2, d2);

  if (between(date, 2025, 7, 1, 2025, 10, 30)) return "S1"; // Aug–Nov 2025
  if (between(date, 2025, 11, 1, 2026, 2, 31)) return "T1"; // Dec 25 – Mar 26
  if (between(date, 2026, 3, 1, 2026, 6, 31)) return "F2"; // Apr–Jul 26
  if (between(date, 2026, 7, 1, 2026, 10, 30)) return "S2"; // Aug–Nov 26
  if (between(date, 2026, 11, 1, 2027, 2, 31)) return "T2"; // Dec 26 – Mar 27
  if (between(date, 2027, 3, 1, 2027, 6, 31)) return "F3"; // Apr–Jul 27
  if (between(date, 2027, 7, 1, 2027, 10, 30)) return "T3"; // Aug–Nov 27

  return "—";
}

/* ---------- Main load ---------- */
async function loadDashboard() {
  showLoader();

  const requested = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  try {
    const res = await fetch(
      `${GAS_BASE_URL}?month=${requested}&_=${Date.now()}`,
      { method: "GET", cache: "no-store" }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const monthUsed = data.month || requested;
    const monthLabel = new Date(monthUsed + "-01").toLocaleString(undefined, {
      month: "long",
      year: "numeric",
    });
    setText("dash-month", monthLabel);
    setText("dash-month-maid", monthLabel);

    /* CAC pill – from fixed schedule */
    const cacFlat = getControllerForDateJs(new Date());
    setText("cac-text", `Common Area Controller: ${cacFlat}`);

    /* Maintenance */
    const payments = Array.isArray(data.payments) ? data.payments : [];
    const paidSet = new Set(
      payments
        .filter((p) => p.maintPaid)
        .map((p) =>
          String(p.apartment || "")
            .trim()
            .toUpperCase()
        )
    );
    const pending = APTS.filter((a) => !paidSet.has(a));

    setText("paid-count", paidSet.size);
    setText("pending-count", pending.length);

    btnPaid.onclick = () =>
      openModalHTML(
        "Flats Paid",
        `<ul id="modal-list">${
          Array.from(paidSet)
            .sort()
            .map((x) => `<li>${x}</li>`)
            .join("") || "<li>None</li>"
        }</ul>`
      );
    btnPending.onclick = () =>
      openModalHTML(
        "Flats Pending (Due)",
        `<ul id="modal-list">${
          pending.map((x) => `<li>${x}</li>`).join("") || "<li>None</li>"
        }</ul>`
      );

    /* EB – 2-month cycle from backend */
    const eb = data.eb || {};
    if (typeof eb.amountCommon === "number") {
      setText("eb-amount", fmtINR(eb.amountCommon));
    } else {
      setText("eb-amount", "—");
    }
    setText("eb-period", `Period: ${eb.period || "—"}`);
    setText("eb-paid", eb.allPaid ? "Paid" : "Not Paid");
    setText(
      "eb-pay-window",
      eb.payWindow ? `Payment Window: ${eb.payWindow}` : "Payment Window: —"
    );
    setText("eb-next", eb.nextPeriod || "—");
    setText(
      "eb-next-pay-window",
      eb.nextPayWindow
        ? `Next Payment Window: ${eb.nextPayWindow}`
        : "Next Payment Window: —"
    );

    /* Sweeper */
    setText(
      "maid-amount",
      data.maid && typeof data.maid.amountThisMonth === "number"
        ? fmtINR(data.maid.amountThisMonth)
        : "—"
    );
    setText("maid-leaves", data.maid?.leavesThisMonth ?? "0");
    setText("maid-paid", data.maid?.paidThisMonth ? "Paid" : "Not Paid");

    /* Lift */
    if (data.lift) {
      const insDays = daysUntil(data.lift.insurance?.validUntil);
      liftInsPaidEl.textContent = data.lift.insurance?.paid
        ? "Paid"
        : "Not Paid";
      liftInsValidEl.textContent = data.lift.insurance?.validUntil || "—";
      liftInsDaysEl.textContent =
        insDays === null
          ? ""
          : insDays < 0
          ? `${Math.abs(insDays)} days overdue`
          : `${insDays} days left`;
      setStatusColor(rowIns, insDays);

      const amcDays = daysUntil(data.lift.amc?.validUntil);
      liftAmcPaidEl.textContent = data.lift.amc?.paid ? "Paid" : "Not Paid";
      liftAmcValidEl.textContent = data.lift.amc?.validUntil || "—";
      liftAmcDaysEl.textContent =
        amcDays === null
          ? ""
          : amcDays < 0
          ? `${Math.abs(amcDays)} days overdue`
          : `${amcDays} days left`;
      setStatusColor(rowAmc, amcDays);
    }

    /* OPL */
    const opl = Array.isArray(data.opl) ? data.opl : [];
    const openItems = opl.filter(
      (x) => String(x.status || "").toLowerCase() !== "closed"
    );
    const closedItems = opl.filter(
      (x) => String(x.status || "").toLowerCase() === "closed"
    );
    setText("opl-open-count", openItems.length);
    setText("opl-closed-count", closedItems.length);

    oplTableBody.innerHTML = "";
    openItems.slice(0, 5).forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${item.id ?? ""}</td>
        <td>${item.title ?? item.issue ?? ""}</td>
        <td class="warn">${item.status ?? ""}</td>
        <td>${item.apartment ?? ""}</td>
        <td>${item.remarks ?? ""}</td>
      `;
      oplTableBody.appendChild(tr);
    });

    oplMoreBtn.onclick = () => {
      const rows = [...openItems, ...closedItems];
      if (!rows.length) {
        openModalHTML(
          "OPL — Full List",
          "<p class='small muted'>No items.</p>"
        );
        return;
      }
      let html = `<div class="table-wrap"><table><thead><tr>
      <th>ID</th><th>Title / Issue</th><th>Status</th><th>Apt</th><th>Remarks</th>
      </tr></thead><tbody>`;
      rows.forEach((item) => {
        const st = String(item.status || "");
        const cls = st.toLowerCase() === "closed" ? "ok" : "warn";
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

    /* Balance */
    (function updateBalance(bal) {
      const total = Number(bal?.totalBalance ?? 0);
      const exp = Number(bal?.totalExpenses ?? 0);
      const avail = Number(bal?.available ?? total - exp);

      setText("bal-available", fmtINR(avail));
      setText("bal-total-inline", fmtINR(total));
      setText("bal-expenses-inline", fmtINR(exp));

      const noteEl = document.getElementById("bal-note");
      if (noteEl) {
        noteEl.textContent =
          bal?.note ||
          "Click here to open sheet (only Common Area Controller will have edit access).";
      }
    })(data.balance || {});

    hideLoader();
  } catch (err) {
    console.error("Dashboard fetch failed:", err);
    showError("Could not load data. Please try again in a moment.");
    hideLoader();
  }
}

loadDashboard();
