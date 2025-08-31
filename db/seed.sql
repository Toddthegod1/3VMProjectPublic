INSERT INTO transactions (t_date, description, category, t_type, amount) VALUES
(CURRENT_DATE - INTERVAL '5 days', 'Supermarket', 'groceries', 'expense', 78.40),
(CURRENT_DATE - INTERVAL '3 days', 'Bus card top-up', 'transport', 'expense', 20.00),
(CURRENT_DATE - INTERVAL '2 days', 'Student job', 'salary', 'income', 250.00),
(CURRENT_DATE - INTERVAL '1 days', 'Flat rent', 'rent', 'expense', 180.00);

INSERT INTO budgets (category, monthly_limit) VALUES
('groceries', 400.00),
('transport', 120.00),
('rent', 720.00)
ON CONFLICT (category) DO NOTHING;