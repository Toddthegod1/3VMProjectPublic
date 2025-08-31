import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import pkg from "pg";
const { Pool } = pkg;

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS
});

// ---- Ensure budgets table exists ----
(async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS budgets (
        category TEXT PRIMARY KEY,
        monthly_limit NUMERIC NOT NULL CHECK (monthly_limit >= 0)
      );
    `);
  } finally {
    client.release();
  }
})();

// Health check
app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (e) {
    res.status(500).json({ status: "db_error", error: String(e) });
  }
});

// List latest transactions
app.get("/transactions", async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, t_date, description, category, t_type, amount, created_at
     FROM transactions
     ORDER BY t_date DESC, id DESC`
  );
  res.json(rows);
});

// Create a transaction
app.post("/transactions", async (req, res) => {
  const { t_date, description, category, t_type, amount } = req.body || {};
  if (
    !description ||
    !category ||
    !["income", "expense"].includes(t_type) ||
    typeof amount !== "number"
  ) {
    return res.status(400).json({
      error:
        "description, category, t_type(income|expense), amount(number) required"
    });
  }
  const { rows } = await pool.query(
    `INSERT INTO transactions (t_date, description, category, t_type, amount)
     VALUES (COALESCE($1::date, CURRENT_DATE), $2, $3, $4, $5)
     RETURNING *`,
    [t_date || null, description, category, t_type, amount]
  );
  res.status(201).json(rows[0]);
});

// ----- Budgets -----

// List budgets
app.get("/budgets", async (_req, res) => {
  try {
    const result = await pool.query("SELECT * FROM budgets ORDER BY category");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Add or update a budget
app.post("/budgets", async (req, res) => {
  const { category, monthly_limit } = req.body;
  if (!category || monthly_limit == null) {
    return res
      .status(400)
      .json({ error: "category and monthly_limit are required" });
  }
  try {
    await pool.query(
      `INSERT INTO budgets (category, monthly_limit)
       VALUES ($1, $2)
       ON CONFLICT (category)
       DO UPDATE SET monthly_limit = EXCLUDED.monthly_limit`,
      [category.trim(), Number(monthly_limit)]
    );
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a budget
app.delete("/budgets/:category", async (req, res) => {
  try {
    await pool.query("DELETE FROM budgets WHERE category = $1", [
      req.params.category
    ]);
    res.json({ status: "ok" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ----- Summary -----
app.get("/summary", async (_req, res) => {
  const client = await pool.connect();
  try {
    const total = await client.query("SELECT * FROM v_current_month_summary");
    const byCat = await client.query(
      "SELECT * FROM v_current_month_by_category"
    );
    const budgets = await client.query("SELECT * FROM budgets");

    // Merge budgets with spending
    const spendMap = new Map(
      byCat.rows.map((r) => [r.category, Number(r.spent)])
    );
    const budgetStatus = budgets.rows.map((b) => ({
      category: b.category,
      monthly_limit: Number(b.monthly_limit),
      spent: spendMap.get(b.category) || 0,
      remaining: Number(b.monthly_limit) - (spendMap.get(b.category) || 0)
    }));

    res.json({
      income_total: Number(total.rows[0].income_total),
      expense_total: Number(total.rows[0].expense_total),
      by_category: byCat.rows,
      budgets: budgetStatus
    });
  } finally {
    client.release();
  }
});

// Delete a transaction by id
app.delete("/transactions/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "invalid id" });

  const { rowCount } = await pool.query("DELETE FROM transactions WHERE id = $1", [id]);
  if (rowCount === 0) return res.status(404).json({ error: "not found" });
  res.json({ status: "deleted", id });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Finance API listening on ${PORT}`));