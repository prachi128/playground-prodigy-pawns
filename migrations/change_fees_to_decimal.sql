ALTER TABLE batches 
  ALTER COLUMN monthly_fee TYPE NUMERIC(10,2) 
  USING (monthly_fee / 100.0);

ALTER TABLE payments 
  ALTER COLUMN amount TYPE NUMERIC(10,2) 
  USING (amount / 100.0);
