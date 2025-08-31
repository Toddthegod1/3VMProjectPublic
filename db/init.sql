-- Creates the transactions table to store financial records
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  t_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g., groceries, rent, salary
  t_type TEXT NOT NULL CHECK (t_type IN ('income','expense')),
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Budgets: simple monthly limits by category (demo)
CREATE TABLE IF NOT EXISTS budgets (
  category TEXT PRIMARY KEY,
  monthly_limit NUMERIC NOT NULL CHECK (monthly_limit >= 0)
);

-- Helpful view: current month rollup
CREATE OR REPLACE VIEW v_current_month_summary AS
SELECT
  COALESCE(SUM(CASE WHEN t_type = 'income'  THEN amount ELSE 0 END), 0) AS income_total,
  COALESCE(SUM(CASE WHEN t_type = 'expense' THEN amount ELSE 0 END), 0) AS expense_total
FROM transactions
WHERE date_trunc('month', t_date) = date_trunc('month', CURRENT_DATE);

-- By category for current month
CREATE OR REPLACE VIEW v_current_month_by_category AS
SELECT
  category,
  COALESCE(SUM(CASE WHEN t_type = 'expense' THEN amount ELSE 0 END), 0) AS spent
FROM transactions
WHERE t_type = 'expense'
  AND date_trunc('month', t_date) = date_trunc('month', CURRENT_DATE)
GROUP BY category
ORDER BY spent DESC;

CREATE TABLE IF NOT EXISTS budgets (
  category TEXT PRIMARY KEY,
  monthly_limit NUMERIC NOT NULL CHECK (monthly_limit >= 0)
);