-- Collected once at onboarding (see web/src/components/NameSheet.tsx),
-- editable later via PATCH /profile. Scoped by device_id like everything
-- else in this no-auth app - see main.py::get_device_id. last_ip is
-- captured server-side from the request that wrote the row, never sent by
-- the client - see rate_limit.py::get_client_ip, the same extraction the
-- rate limiter already used.
create table if not exists user_profiles (
  device_id text primary key,
  display_name text,
  phone_number text,
  last_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
