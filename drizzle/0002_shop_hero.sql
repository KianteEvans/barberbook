-- Landing hero photo, admin-uploaded. NULL = CSS fallback backdrop.
ALTER TABLE shop_settings ADD COLUMN hero_file text;
