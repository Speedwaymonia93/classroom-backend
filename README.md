# Classroom backend on Neon

The backend uses Drizzle ORM over a shared node-postgres (`pg`) pool with the pooled `DATABASE_URL` from Neon's gitignored `.env.local`. Drizzle Kit uses `DATABASE_URL_UNPOOLED` for migrations. Credentials stay on the server.

```sh
npm install
npx neon@latest deploy
npm run db:migrate
npm run build
npm start
```

The backend listens on `127.0.0.1:8000` by default. Set `HOST` and `PORT` for another runtime. Drizzle migrations live in `drizzle/` and are tracked in `drizzle.__drizzle_migrations`; repeated runs skip applied files. The baseline was introspected from the existing Neon database and uses `CREATE TABLE IF NOT EXISTS`, preserving its subjects and identity sequence. The original SQL migration and `classroom_migrations` ledger remain as historical records; `scripts/migrate.mjs` is retired and is no longer used by npm commands.

In `../classroom-frontend`, set `VITE_API_URL=/api` in `.env`, then run `npm run dev`. Vite proxies `/api` to the backend. For production hosting, route `/api` to the backend on the same origin, or configure an appropriate API origin and access policy before building. Neon deploy provisions the database services; it does not host the frontend or this Express process.

Supported routes: GET `/api/health`, GET `/api/departments`, GET `/api/subjects` (page, pageSize, search, departmentId), GET `/api/subjects/:id`, POST `/api/subjects`. The app has no authentication yet; the backend defaults to loopback.

Verification: run `npm run test:integration` with the backend running. Set `APP_URL` to override the API base (default `http://127.0.0.1:8000/api`).

## Drizzle files and commands

- `src/db/schema/app.ts`: typed subjects table definition matching the existing database; timestamps retain the API's string format.
- `src/db/index.ts`: shared connection pool and Drizzle client.
- `src/drizzle-demo.ts`: read-only demo showing the subject count and latest IDs/codes. Run `npm run db:demo`.
- `drizzle.config.ts`: schema and migration configuration restricted to subjects and departments.

For future schema edits, update `src/db/schema/app.ts`, run `npm run db:generate`, review the generated SQL, test on an isolated Neon branch, and then run `npm run db:migrate` against the intended environment. The Drizzle baseline snapshot was pulled from the existing database following the [existing PostgreSQL database workflow](https://orm.drizzle.team/docs/get-started/postgresql-existing).

Run `npm run test:drizzle` to verify Drizzle insert/select behavior in a transaction that rolls back and confirm existing rows are unchanged. Identity sequences may advance during rollback, which is normal PostgreSQL behavior.

## Department API

Subject create requests require numeric `departmentId` referencing a row returned by `GET /api/departments`. Example: `{ "code": "MATH101", "name": "Calculus", "departmentId": 1, "description": null, "level": "introductory", "type": "lecture" }`. Use a real department ID from the endpoint. The API returns `departmentId`; filter with `GET /api/subjects?departmentId=1`. Code is limited to 50 characters, name to 255, description to 255, and level/type to 50. Optional fields accept null. Invalid IDs return 400, missing subjects return 404 and duplicate codes return 409.

The department migration backfills each original text department into `departments.code` and `departments.name` before replacing the subject text field with its foreign key. Existing descriptions are checked before narrowing to varchar(255). Original timestamp instants are stored as UTC wall-clock values to match the new timestamp schema. The original SQL migration remains historical; apply only Drizzle migrations.

`npm run test:integration` checks the current API contract and removes its own test subject afterward. Frontend clients must send numeric `departmentId` and use `/api/departments` for choices.

Local checks: `npm run build`, `npm run typecheck`, and `npm test`. Query pagination requires positive integer values and a pageSize of at most 100. IDs must fit PostgreSQL integer columns.
