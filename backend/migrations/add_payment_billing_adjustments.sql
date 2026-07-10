CREATE TABLE IF NOT EXISTS payment_billing_adjustments (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES users(id),
  batch_id INTEGER NOT NULL REFERENCES batches(id),
  billing_month VARCHAR(7) NOT NULL,
  billable_class_count INTEGER NULL,
  amount_override NUMERIC(10, 2) NULL,
  notes TEXT NULL,
  updated_by INTEGER NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_payment_billing_adjustments_student_batch_month
    UNIQUE (student_id, batch_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_payment_billing_adjustments_student_id
  ON payment_billing_adjustments(student_id);
CREATE INDEX IF NOT EXISTS idx_payment_billing_adjustments_batch_id
  ON payment_billing_adjustments(batch_id);
CREATE INDEX IF NOT EXISTS idx_payment_billing_adjustments_billing_month
  ON payment_billing_adjustments(billing_month);
