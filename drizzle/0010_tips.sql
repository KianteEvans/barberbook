-- Allow 'tip' payments (post-visit gratuity). ASCII only.
ALTER TABLE payments DROP CONSTRAINT payments_type_check;
ALTER TABLE payments ADD CONSTRAINT payments_type_check
  CHECK (type IN ('deposit','remainder','refund','no_show_fee','subscription','tip'));
