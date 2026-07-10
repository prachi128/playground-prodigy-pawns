ALTER TABLE payment_billing_adjustments
  ADD COLUMN IF NOT EXISTS expected_class_count INTEGER NULL;
