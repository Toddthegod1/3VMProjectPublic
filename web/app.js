// __API_BASE__ is replaced by web.sh during provisioning
const API = "__API_BASE__";

async function fetchJSON(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function fmt(n) { return Number(n).toFixed(2); }

// ----- Summary & Budgets render -----
async function loadSummary() {
  const s = await fetchJSON(`${API}/summary`);
  const div = document.getElementById("summary");

  let html = `<p><strong>Income:</strong> $${fmt(s.income_total)} | <strong>Expenses:</strong> $${fmt(s.expense_total)} | <strong>Net:</strong> $${fmt(s.income_total - s.expense_total)}</p>`;

  html += `<h3>By Category (Expenses)</h3><ul>`;
  for (const row of s.by_category) {
    html += `<li>${row.category}: $${fmt(row.spent)}</li>`;
  }
  html += `</ul>`;

  html += `<h3>Budgets</h3><ul>`;
  for (const b of s.budgets) {
    const status = b.remaining >= 0 ? `Remaining $${fmt(b.remaining)}` : `Over by $${fmt(-b.remaining)}`;
    html += `<li>
      <strong>${b.category}</strong>: Limit $${fmt(b.monthly_limit)} — Spent $${fmt(b.spent)} —
      <strong>${status}</strong>
      <button data-edit="${b.category}" data-limit="${b.monthly_limit}" class="link-btn">Edit</button>
      <button data-del="${b.category}" class="link-btn">Delete</button>
    </li>`;
  }
  html += `</ul>`;

  div.innerHTML = html;

  // wire edit/delete
  div.querySelectorAll('button[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('b_category').value = btn.dataset.edit;
      document.getElementById('b_limit').value = btn.dataset.limit;
      document.getElementById('b_category').focus();
    });
  });
  div.querySelectorAll('button[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cat = btn.dataset.del;
      if (!confirm(`Delete budget for "${cat}"?`)) return;
      await fetchJSON(`${API}/budgets/${encodeURIComponent(cat)}`, { method: 'DELETE' });
      await loadSummary();
    });
  });
}

// ----- Transactions table -----
async function loadTransactions() {
  const tx = await fetchJSON(`${API}/transactions`);
  const tbody = document.querySelector("#txTable tbody");
  tbody.innerHTML = tx.map(t => `
    <tr data-id="${t.id}">
      <td>${t.t_date?.slice(0,10) || ''}</td>
      <td>${t.description}</td>
      <td>${t.category}</td>
      <td><span class="pill ${t.t_type}">${t.t_type}</span></td>
      <td>$${Number(t.amount).toFixed(2)}</td>
      <td><button class="tx-del" aria-label="Delete transaction ${t.description}">Delete</button></td>
    </tr>
  `).join("");
}

// ----- Add transaction -----
async function addTransaction(e) {
  e.preventDefault();
  const body = {
    t_date: document.getElementById("t_date").value || null,
    description: document.getElementById("description").value,
    category: document.getElementById("category").value,
    t_type: document.getElementById("t_type").value,
    amount: parseFloat(document.getElementById("amount").value)
  };
  await fetchJSON(`${API}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  e.target.reset();
  await loadSummary();
  await loadTransactions();
}

// ----- Create/update budget -----
async function saveBudget(e) {
  e.preventDefault();
  const category = document.getElementById('b_category').value.trim();
  const monthly_limit = parseFloat(document.getElementById('b_limit').value);
  if (!category || isNaN(monthly_limit)) return;

  await fetchJSON(`${API}/budgets`, {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, monthly_limit })
  });
  // clear just the limit to make quick edits easier
  document.getElementById('b_limit').value = '';
  await loadSummary();
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".tx-del");
  if (!btn) return;

  const tr = btn.closest("tr");
  const id = Number(tr?.dataset.id);
  if (!id) return;

  if (!confirm("Delete this transaction?")) return;
  await fetchJSON(`${API}/transactions/${id}`, { method: "DELETE" });

  // Refresh UI
  await loadSummary();
  await loadTransactions();
});



document.getElementById("txForm").addEventListener("submit", addTransaction);
document.getElementById("budgetForm").addEventListener("submit", saveBudget);
const clearBtn = document.getElementById("b_clear");


// init
(async function init() {
  await loadSummary();
  await loadTransactions();
})();
