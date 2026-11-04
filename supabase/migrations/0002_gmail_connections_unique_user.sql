-- One Gmail connection per app user for now (MVP: "31. FUTURE FEATURES" in
-- the original brief lists multiple Gmail accounts later — when that lands,
-- drop this constraint and key connections by (user_id, email) instead).
alter table gmail_connections
  add constraint gmail_connections_user_id_key unique (user_id);
