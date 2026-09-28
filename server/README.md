# ROMS API

Node.js, Express, Prisma, and PostgreSQL backend for ROMS.

## Local setup

```bash
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Set `SEED_PASSWORD` before seeding if a different initial password is required. The seed creates:

- `admin@rabiyaroms.top` (`super_admin`)
- `finance@rabiyaroms.top` (`super_finance`)
- `nairobi@rabiyaroms.top` (`branch_staff`)
- `mombasa.finance@rabiyaroms.top` (`branch_finance`)
- `recruiter@rabiyaroms.top` (`recruiter`)

The default seed password is `password@123`; change it before production use.

## Production

1. Create a PostgreSQL database and a least-privilege application user.
2. Set `DATABASE_URL`, `JWT_SECRET`, `PORT`, and `CORS_ORIGIN` in `.env`.
3. Run `npx prisma migrate deploy`.
4. Run `npm run seed` once, or create users through a controlled admin workflow.
5. Run the API with systemd on `127.0.0.1:3000`.
6. Configure Nginx to proxy `/api/` for `new.rabiyaroms.top` to port `3000`.

The API enforces role and branch boundaries server-side. The frontend filters are for presentation only.
