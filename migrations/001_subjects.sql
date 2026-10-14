CREATE TABLE IF NOT EXISTS subjects (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code varchar(32) NOT NULL UNIQUE,
  name varchar(200) NOT NULL,
  department varchar(100) NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
