const SUPABASE_URL = "https://bsbpofvmczwcojuexiyw.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzYnBvZnZtY3p3Y29qdWV4aXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzODc5MDYsImV4cCI6MjA3NDk2MzkwNn0.f99fOJpU3WVpSlEm5Z_kohKUp7O903cFN2h3_n32zbs";

const supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


const symbolEl = document.getElementById("symbol");
const pnlEl = document.getElementById("pnl");
const addBtn = document.getElementById("add-trade");
const msgEl = document.getElementById("form-msg");
const tbody = document.querySelector("#trades-table tbody");
const canvas = document.getElementById("equity-canvas");
const ctx = canvas.getContext("2d"); // 2D drawing

// State
let startingBalance = 10000;
let trades = [];

// Helpers - format money
function fmtMoney(x) {
  return Number(x).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Load settings
async function loadSettings() {
  const { data, error } = await supa
    .from("settings")
    .select("starting_balance")
    .eq("id", 1)
    .single();

  if (!error && data?.starting_balance != null) {
    startingBalance = Number(data.starting_balance);
    console.log("Starting balance:", startingBalance);
  }
}

// Load trades from table
async function loadTrades() {
  const { data, error } = await supa
    .from("trades")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error loading trades:", error);
    return;
  }

  trades = data || [];
  console.log("Loaded trades:", trades);
}

// Render trades table
function renderTable() {
  tbody.innerHTML = "";
  let runningEquity = startingBalance;

  if (trades.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5">No trades yet</td></tr>';
    refreshEquity(); // <-- add this
    return;
  }

  trades.forEach((trade, i) => {
    runningEquity += Number(trade.pnl);

    const pnlValue = Number(trade.pnl);
    const pnlColor = pnlValue >= 0 ? "green" : "red";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${new Date(trade.created_at).toLocaleString()}</td>
      <td>${trade.symbol}</td>
      <td style="color:${pnlColor};font-weight:bold;">${fmtMoney(trade.pnl)}</td>
      <td>${fmtMoney(runningEquity)}</td>
      <td>
        <button class="edit-btn" data-id="${trade.id}">Edit</button>
        <button class="delete-btn" data-id="${trade.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  refreshEquity(); 
}



// 1) Compute equity function
function computeEquitySeries(_trades) {
  let equity = Number(startingBalance);
  const series = [equity]; // starting balance as first point

  _trades.forEach(t => {
    equity += Number(t.pnl);
    series.push(equity);
  });

  return series;
}

// 2) Draw equity curve on canvas
function drawEquityCurve(series) {
  const canvas = document.getElementById("equity-canvas");
  const ctx = canvas.getContext("2d");

  // clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (series.length < 2) return; 

  const pad = 30;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = (max - min) || 1;

  // color segments
  for (let i = 0; i < series.length - 1; i++) {
    const x1 = pad + (i / (series.length - 1)) * w;
    const y1 = pad + (1 - (series[i] - min) / span) * h;
    const x2 = pad + ((i + 1) / (series.length - 1)) * w;
    const y2 = pad + (1 - (series[i + 1] - min) / span) * h;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    // green if up, red if down
    ctx.strokeStyle = series[i + 1] >= series[i] ? "green" : "red";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // axes
  ctx.strokeStyle = "#ccc";
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, pad + h);
  ctx.lineTo(pad + w, pad + h);
  ctx.stroke();

  // labels
  ctx.fillStyle = "#000";
  ctx.font = "12px Arial";
  ctx.fillText(max.toFixed(2), 5, pad);
  ctx.fillText(min.toFixed(2), 5, pad + h);
}

// the Refresh function = recompute + redraw
function refreshEquity() {
  const equitySeries = computeEquitySeries(trades);
  drawEquityCurve(equitySeries);
}

// click listener for edt and del
tbody.addEventListener("click", async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;

  // DELETE
  if (e.target.classList.contains("delete-btn")) {
    if (!confirm("Are you sure you want to delete this trade?")) return;

    const { error } = await supa
      .from("trades")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Error deleting trade: " + error.message);
      return;
    }

    // Remove locally and redraw . we will remove from db also
    trades = trades.filter(t => t.id != id);
    renderTable();
  }

  // EDIT
  if (e.target.classList.contains("edit-btn")) {
    const trade = trades.find(t => t.id == id);
    const newPnl = prompt("Enter new PnL value:", trade.pnl);
    if (newPnl === null) return; // user cancelled

    const { error } = await supa
      .from("trades")
      .update({ pnl: Number(newPnl) })
      .eq("id", id);

    if (error) {
      alert("Error updating trade: " + error.message);
      return;
    }

    // Update local array and redraw, update db also
    trade.pnl = Number(newPnl);
    renderTable();
  }
});
// Add trade button handler
async function addTrade() {
  msgEl.textContent = "";

  const symbol = symbolEl.value.trim();
  let pnl = Number(pnlEl.value); // <-- use let

  if (!symbol || isNaN(pnl)) {
    msgEl.textContent = "Please provide a symbol and valid PnL.";
    msgEl.style.color = "#9d0303ff"; 
    return;
  }
  // special rule for MSFT and TSLA
  // Not sue if to use randomiser or fixed negative
  if (symbol === "MSFT" || symbol === "TSLA") {
    pnl = -Math.abs(pnl); // force negative
  }
  // insert
  const { error } = await supa
    .from("trades")
    .insert([{ symbol, pnl }]);

  if (error) {
    msgEl.textContent = "Error: " + error.message;
    msgEl.style.color = "#8e0303ff";
    return;
  }

  msgEl.textContent = "Trade added!";
  msgEl.style.color = "#16a34a"; 
  pnlEl.value = "";

  await loadTrades();
  renderTable(); // update chart as well
}

// Events
addBtn.addEventListener("click", addTrade);

// Init
async function init() {
  await loadSettings();
  await loadTrades();
  renderTable(); // this ....should draw the chart now
}
init();