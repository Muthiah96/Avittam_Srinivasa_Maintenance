/***** ====== CONFIG ====== *****/
const ADMIN_EMAIL = "muralidharan.vtmt96@gmail.com";
const SS_ID = "1vGhGbTScu8bdkP2xLb31vuPYKfjv_E6aKCqYwGAHcN0";
/***** ===================== *****/

const VERSION = "v28";
const TZ = Session.getScriptTimeZone();

/** Spreadsheet helpers */
function ss() {
  return SpreadsheetApp.openById(SS_ID);
}
function sheet(name) {
  const s = ss().getSheetByName(name);
  if (s) return s;
  const target = String(name || "")
    .trim()
    .toLowerCase();
  return (
    ss()
      .getSheets()
      .find((sh) => sh.getName().trim().toLowerCase() === target) || null
  );
}

/** Utils */
function yymm(d) {
  return Utilities.formatDate(d || new Date(), TZ, "yyyy-MM");
}
function todayYMD() {
  return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd");
}
function normalizeMonthCell(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, "yyyy-MM");
  const raw = String(v || "").trim();
  if (!raw) return "";
  let m = raw.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (m) return `${m[1]}-${("0" + m[2]).slice(-2)}`;
  m = raw.match(/^(\d{4})[-\/.](\d{1,2})$/);
  if (m) return `${m[1]}-${("0" + m[2]).slice(-2)}`;
  m = raw.match(/^(\d{4})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}`;
  m = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (m) return `${m[3]}-${("0" + m[2]).slice(-2)}`;
  return raw;
}
function toNum(v) {
  return typeof v === "number"
    ? v
    : Number(String(v).replace(/[^\d.-]/g, "")) || 0;
}
function toBool(v) {
  if (v === true || v === false) return v;
  const s = String(v || "")
    .trim()
    .toLowerCase();
  return s === "true" || s === "yes" || s === "y" || s === "1";
}

/** ====== API ====== */
function doGet(e) {
  const reqMonth = normalizeMonthCell(
    (e && e.parameter && e.parameter.month) || yymm(new Date())
  );

  // Debug endpoints
  if (e && e.parameter && e.parameter.debugPayments === "1") {
    return ContentService.createTextOutput(
      JSON.stringify(paymentsDebug(reqMonth))
    ).setMimeType(ContentService.MimeType.JSON);
  }
  if (e && e.parameter && e.parameter.debugMaid === "1") {
    return ContentService.createTextOutput(
      JSON.stringify(maidDebug(reqMonth))
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const payments = readPayments(reqMonth);
  const eb = summarizeEB(payments);
  const maid = readMaid(reqMonth);
  const lift = readLiftDetails(reqMonth);
  const opl = readOPL();
  const balance = readBalanceExpenses();

  const paidCount = payments.filter((r) => r.maintPaid).length;
  const maintenance = {
    paidCount,
    pendingCount: Math.max(0, 8 - paidCount),
    totalFlats: 8,
  };

  const out = {
    version: VERSION,
    month: reqMonth,
    payments,
    maintenance,
    eb,
    maid,
    lift,
    opl,
    balance,
  };
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doPost(e) {
  try {
    let data = {};
    if (e && e.parameter && Object.keys(e.parameter).length) data = e.parameter;
    else if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (_) {}
    }

    const ts = new Date();
    const month = yymm(ts);
    const sh = sheet("Requests") || ss().insertSheet("Requests");
    if (sh.getLastRow() === 0) {
      sh.appendRow([
        "Timestamp",
        "Name",
        "Apartment",
        "Email",
        "Phone",
        "Issue",
        "Month",
      ]);
    }
    sh.appendRow([
      ts,
      data.name || "",
      data.apartment || "",
      data.email || "",
      data.phone || "",
      data.issue || "",
      month,
    ]);

    if (ADMIN_EMAIL) {
      MailApp.sendEmail({
        to: ADMIN_EMAIL,
        subject: `[Maintenance] ${data.apartment || "Apartment"} - New Request`,
        htmlBody: `<p><b>New Maintenance Request</b></p>
          <p><b>Name:</b> ${data.name || ""}<br/>
          <b>Apartment:</b> ${data.apartment || ""}<br/>
          <b>Email:</b> ${data.email || ""}<br/>
          <b>Phone:</b> ${data.phone || ""}<br/>
          <b>Issue:</b> ${data.issue || ""}<br/>
          <b>Time:</b> ${ts}</p>`,
      });
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: String(err) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/** ====== Readers ====== */

/* Payments (ultra-robust, typed + display, header-aware)
   Accepts any header order/casing; trims spaces; handles TRUE/FALSE as text or booleans.
   Columns expected somewhere in row 1: Month, Apartment, MaintAmount, MaintPaid, EBAmount, EBPaid
*/
function readPayments(month) {
  const sh = sheet("Payments");
  if (!sh) return [];

  const range = sh.getDataRange();
  const values = range.getValues(); // typed (booleans/numbers/dates)
  const display = range.getDisplayValues(); // what you see

  if (values.length < 2) return [];

  const headersDisp = display[0].map((h) => String(h || ""));
  const H = headersDisp.map((h) =>
    h.toLowerCase().replace(/\s+|\(|\)|\[|\]|\/|\\/g, "")
  );

  const idx = {
    month: H.findIndex((h) => h.includes("month")),
    apt: H.findIndex(
      (h) => h.includes("apartment") || h === "apt" || h.includes("flat")
    ),
    mAmt: H.findIndex(
      (h) => h.includes("maintamount") || h.includes("maintenanceamount")
    ),
    mPaid: H.findIndex((h) => h.includes("maintpaid")),
    ebAmt: H.findIndex((h) => h.includes("ebamount")),
    ebPaid: H.findIndex((h) => h.includes("ebpaid")),
  };
  // Fallback to classic A..F if headers missed
  if (idx.month < 0) idx.month = 0;
  if (idx.apt < 0) idx.apt = 1;
  if (idx.mAmt < 0) idx.mAmt = 2;
  if (idx.mPaid < 0) idx.mPaid = 3;
  if (idx.ebAmt < 0) idx.ebAmt = 4;
  if (idx.ebPaid < 0) idx.ebPaid = 5;

  const out = [];
  for (let r = 1; r < values.length; r++) {
    const vMonth = values[r][idx.month];
    const dMonth = display[r][idx.month];
    const vApt = values[r][idx.apt];
    const dApt = display[r][idx.apt];
    const vMAmt = values[r][idx.mAmt];
    const dMAmt = display[r][idx.mAmt];
    const vMPaid = values[r][idx.mPaid];
    const dMPaid = display[r][idx.mPaid];
    const vEAmt = values[r][idx.ebAmt];
    const dEAmt = display[r][idx.ebAmt];
    const vEPaid = values[r][idx.ebPaid];
    const dEPaid = display[r][idx.ebPaid];

    const monthNorm = normalizeMonthCell(vMonth !== "" ? vMonth : dMonth);
    if (monthNorm !== month) continue;

    const apartment = String((vApt !== "" && vApt != null ? vApt : dApt) || "")
      .trim()
      .toUpperCase();

    const maintAmount = typeof vMAmt === "number" ? vMAmt : toNum(dMAmt);
    const ebAmount = typeof vEAmt === "number" ? vEAmt : toNum(dEAmt);

    const maintPaid = typeof vMPaid === "boolean" ? vMPaid : toBool(dMPaid);
    const ebPaid = typeof vEPaid === "boolean" ? vEPaid : toBool(dEPaid);

    if (!apartment) continue;
    out.push({ apartment, maintAmount, maintPaid, ebAmount, ebPaid });
  }

  return out;
}

function summarizeEB(payments) {
  const amounts = Array.from(
    new Set(
      (payments || []).map((p) => Number(p.ebAmount) || 0).filter((v) => v > 0)
    )
  );
  let amountCommon = null,
    note = "";
  if (amounts.length === 1) amountCommon = amounts[0];
  else if (amounts.length > 1)
    note = "Varies by flat; set a single common amount in Sheet.";
  const allPaid = (payments || []).length
    ? payments.every((p) => p.ebPaid)
    : false;
  return { amountCommon, allPaid, note };
}

/* Maid (Sweeper)
   Columns: Date | Leaves | Came | Month | Paid | Amount
*/
function readMaid(month) {
  const sh = sheet("Maid");
  if (!sh)
    return { amountThisMonth: null, leavesThisMonth: 0, paidThisMonth: false };

  const values = sh.getDataRange().getValues();
  if (values.length < 2)
    return { amountThisMonth: null, leavesThisMonth: 0, paidThisMonth: false };

  const headers = values[0].map((h) => String(h || ""));
  const rows = values.slice(1);
  const norm = (s) => s.toLowerCase().replace(/\s+|\(|\)|\[|\]|\/|\\/g, "");
  const H = headers.map(norm);

  const idx = {
    date: H.findIndex((h) => h.includes("date")),
    leaves: H.findIndex((h) => h.includes("leave")),
    came: H.findIndex((h) => h.includes("came")),
    month: H.findIndex((h) => h.includes("month")),
    paid: H.findIndex((h) => h.includes("paid") || h.includes("status")),
    amount: H.findIndex((h) => h.includes("amount")),
  };
  if (idx.date < 0) idx.date = 0;
  if (idx.leaves < 0) idx.leaves = 1;
  if (idx.came < 0) idx.came = 2;
  if (idx.month < 0) idx.month = 3;
  if (idx.paid < 0) idx.paid = 4;
  if (idx.amount < 0) idx.amount = 5;

  const rowMonth = (r) => {
    const m = normalizeMonthCell(r[idx.month]);
    if (m) return m;
    const d = r[idx.date];
    if (d instanceof Date) return Utilities.formatDate(d, TZ, "yyyy-MM");
    const s = String(d || "");
    const mm = s.match(/^(\d{4})[-\/.](\d{1,2})/);
    return mm ? `${mm[1]}-${("0" + mm[2]).slice(-2)}` : "";
  };

  const monthRows = rows.filter((r) => rowMonth(r) === month);

  let leavesThisMonth = 0;
  if (monthRows.length) {
    if (idx.leaves >= 0) {
      leavesThisMonth = monthRows.reduce(
        (sum, r) =>
          sum +
          (typeof r[idx.leaves] === "number"
            ? r[idx.leaves]
            : toNum(r[idx.leaves])),
        0
      );
    } else {
      leavesThisMonth = monthRows.filter((r) => !toBool(r[idx.came])).length;
    }
  }

  let paidThisMonth = false;
  let amountThisMonth = null;
  for (let i = monthRows.length - 1; i >= 0; i--) {
    const pv = monthRows[i][idx.paid];
    if (pv !== "" && pv !== null) {
      paidThisMonth = toBool(pv);
      break;
    }
  }
  for (let i = monthRows.length - 1; i >= 0; i--) {
    const av = monthRows[i][idx.amount];
    if (av !== "" && av !== null) {
      const n = typeof av === "number" ? av : toNum(av);
      if (n > 0) {
        amountThisMonth = n;
        break;
      }
    }
  }

  return { amountThisMonth, leavesThisMonth, paidThisMonth };
}

/* Lift details (lenient headers, accepts "Inusrance Until") */
function readLiftDetails(month) {
  const sh =
    sheet("LiftDetails") ||
    sheet("LiftInsurance") ||
    sheet("Lift") ||
    sheet("Insurance");
  if (!sh)
    return {
      insurance: { paid: false, validUntil: "" },
      amc: { paid: false, validUntil: "" },
    };
  if (sh.getLastRow() < 2)
    return {
      insurance: { paid: false, validUntil: "" },
      amc: { paid: false, validUntil: "" },
    };

  const head = sh
    .getRange(1, 1, 1, sh.getLastColumn())
    .getDisplayValues()[0]
    .map((h) =>
      String(h || "")
        .toLowerCase()
        .trim()
    );
  const headNorm = head.map((h) => h.replace(/[^a-z]/g, ""));

  const findCol = (fn) => {
    for (let i = 0; i < head.length; i++) {
      if (fn(head[i], headNorm[i])) return i;
    }
    return -1;
  };
  const mIdx = findCol((h) => /month/.test(h));
  const insPaidIdx = findCol(
    (h) =>
      (h.includes("insur") || h.includes("inusr")) &&
      (h.includes("paid") || h.includes("status"))
  );
  const insValidIdx = findCol(
    (h, hn) =>
      (h.includes("insur") || h.includes("inusr")) &&
      (h.includes("valid") ||
        h.includes("until") ||
        h.includes("expiry") ||
        hn.includes("inusranceuntil"))
  );
  const amcPaidIdx = findCol(
    (h) => h.includes("amc") && (h.includes("paid") || h.includes("status"))
  );
  const amcValidIdx = findCol(
    (h) =>
      h.includes("amc") &&
      (h.includes("valid") || h.includes("until") || h.includes("expiry"))
  );

  const rows = sh
    .getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn())
    .getDisplayValues();
  let row = rows.find(
    (r) => mIdx >= 0 && normalizeMonthCell(r[mIdx]) === month
  );
  if (!row) row = rows[rows.length - 1];

  const fmt = (v) =>
    v instanceof Date
      ? Utilities.formatDate(v, TZ, "yyyy-MM-dd")
      : String(v || "").trim();

  return {
    insurance: {
      paid: toBool(insPaidIdx >= 0 ? row[insPaidIdx] : ""),
      validUntil: fmt(insValidIdx >= 0 ? row[insValidIdx] : ""),
    },
    amc: {
      paid: toBool(amcPaidIdx >= 0 ? row[amcPaidIdx] : ""),
      validUntil: fmt(amcValidIdx >= 0 ? row[amcValidIdx] : ""),
    },
  };
}

/* OPL: ID | Title / Issue | Status | Apt | Remarks */
function readOPL() {
  const sh = sheet("OPL") || sheet("OpenPoints") || sheet("Open Point List");
  if (!sh) return [];
  if (sh.getLastRow() < 2) return [];
  const head = sh
    .getRange(1, 1, 1, sh.getLastColumn())
    .getDisplayValues()[0]
    .map((h) =>
      String(h || "")
        .toLowerCase()
        .trim()
    );
  const rows = sh
    .getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn())
    .getDisplayValues();
  const idIdx = head.findIndex((h) => /id|#/.test(h));
  const titleIdx = head.findIndex((h) => /title|issue/.test(h));
  const statusIdx = head.findIndex((h) => /status/.test(h));
  const aptIdx = head.findIndex((h) => /apt|apartment|flat/.test(h));
  const remarksIdx = head.findIndex((h) => /remark|note|comment/.test(h));
  return rows.map((r) => ({
    id: idIdx >= 0 ? r[idIdx] : "",
    title: titleIdx >= 0 ? r[titleIdx] : "",
    status: statusIdx >= 0 ? r[statusIdx] : "",
    apartment: aptIdx >= 0 ? r[aptIdx] : "",
    remarks: remarksIdx >= 0 ? r[remarksIdx] : "",
  }));
}

/* Balance_Expenses: Date | Remarks | Expenses | Balance | Responsible */
function readBalanceExpenses() {
  const sh = sheet("Balance_Expenses");
  if (!sh) return { totalBalance: 0, totalExpenses: 0, available: 0, list: [] };
  if (sh.getLastRow() < 2)
    return { totalBalance: 0, totalExpenses: 0, available: 0, list: [] };

  const head = sh
    .getRange(1, 1, 1, sh.getLastColumn())
    .getDisplayValues()[0]
    .map((h) =>
      String(h || "")
        .toLowerCase()
        .trim()
    );
  const rows = sh
    .getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn())
    .getDisplayValues();

  const dateIdx = head.findIndex((h) => /date/.test(h));
  const remarksIdx = head.findIndex((h) => /remark|note|desc/.test(h));
  const expIdx = head.findIndex((h) => /expense/.test(h));
  const balIdx = head.findIndex((h) => /^balance$|^balance\s*/.test(h));
  const respIdx = head.findIndex((h) => /responsible|owner|by/.test(h));

  let totalBalance = 0,
    totalExpenses = 0;
  const list = rows.map((r) => {
    const dateVal = dateIdx >= 0 ? r[dateIdx] : "";
    const date =
      dateVal instanceof Date
        ? Utilities.formatDate(dateVal, TZ, "yyyy-MM-dd")
        : String(dateVal || "");
    const remarks = remarksIdx >= 0 ? r[remarksIdx] : "";
    const expenses = toNum(expIdx >= 0 ? r[expIdx] : 0);
    const balance = toNum(balIdx >= 0 ? r[balIdx] : 0);
    const responsible = respIdx >= 0 ? r[respIdx] : "";
    totalBalance += balance;
    totalExpenses += expenses;
    return { date, remarks, expenses, balance, responsible };
  });

  return {
    totalBalance,
    totalExpenses,
    available: totalBalance - totalExpenses,
    list,
  };
}

/** ====== Debug helpers ====== */
function paymentsDebug(month) {
  const sh = sheet("Payments");
  if (!sh) return { sheet: false };
  const range = sh.getDataRange();
  const values = range.getValues();
  const display = range.getDisplayValues();

  const headers = display[0];
  const filtered = readPayments(month);

  return {
    version: VERSION,
    month,
    headers,
    first3Typed: values.slice(1, 4),
    first3Shown: display.slice(1, 4),
    filtered,
  };
}

function maidDebug(month) {
  const sh = sheet("Maid");
  const out = { version: VERSION, month, foundSheet: !!sh };
  if (!sh) return out;

  const values = sh.getDataRange().getValues();
  out.rows = values.length - 1;
  out.headers = (values.length ? values[0] : []).map(String);
  const rows = values.slice(1);

  const first = rows[0] || [];
  out.firstRow = first.map((v) => ({ v, t: typeof v }));
  out.filtered = readMaid(month);
  return out;
}
