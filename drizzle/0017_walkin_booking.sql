-- Walk-ins can be booked into a real calendar slot. ASCII only.

ALTER TABLE walk_ins DROP CONSTRAINT walk_ins_status_check;
ALTER TABLE walk_ins ADD CONSTRAINT walk_ins_status_check
  CHECK (status IN ('waiting','serving','done','no_show','canceled','booked'));

ALTER TABLE walk_ins ADD COLUMN appointment_id uuid REFERENCES appointments(id);
