# Automated IT Helpdesk Platform

Strict TypeScript platform for WhatsApp ticket ingestion, Gemini-assisted triage, and realtime technician operations. The backend uses Express, Prisma, PostgreSQL, and authenticated Socket.IO WebSockets. The dashboard uses Next.js App Router and Material UI.

## Services

- Backend REST and WebSocket API: `http://localhost:3000`
- Technician dashboard: `http://localhost:3001`
- PostgreSQL: internal Compose service

Ticket changes are delivered over WebSocket-only Socket.IO connections. REST remains the authoritative snapshot and is used automatically after reconnects or event gaps.

## Docker Deployment

Use Docker Compose on Ubuntu. You do not need to install PostgreSQL or Node.js directly on the host. Compose starts these services:

- `postgres`: PostgreSQL database container
- `app`: Node.js/Express/WhatsApp Web service container
- `dashboard`: Next.js technician dashboard container

Create the Docker environment file:

```bash
cp .env.docker.example .env
```

Edit `.env` and set a real database password:

```env
POSTGRES_DB=helpdesk
POSTGRES_USER=helpdesk
POSTGRES_PASSWORD=change_this_password
GEMINI_API_KEY=your_api_key_here
WHATSAPP_AUTO_REPLY=false
WHATSAPP_ENABLED=true
DASHBOARD_ALLOWED_ORIGINS=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_TRANSPORTS=polling,websocket
AUTH_JWT_SECRET=replace_with_a_random_secret_of_at_least_32_characters
AUTH_COOKIE_SECURE=false
ADMIN_EMAIL=admin@example.com
ADMIN_NAME=Helpdesk Administrator
ADMIN_PASSWORD=replace_with_a_strong_password
```

Set real Gemini, database, authentication, and administrator secrets. Use an alphanumeric database password to avoid URL escaping issues in `DATABASE_URL`.
Keep `AUTH_COOKIE_SECURE=false` only for HTTP LAN access; set it to `true` when using HTTPS.
For hosted deployments, `NEXT_PUBLIC_API_URL` must be the exact browser-facing API origin, including scheme and port if needed. If the dashboard is served over HTTPS, use an HTTPS API URL so Socket.IO upgrades to `wss://` instead of `ws://`. Set `NEXT_PUBLIC_SOCKET_TRANSPORTS=polling` only when the reverse proxy cannot forward WebSocket upgrades yet.

Start everything:

```bash
docker compose up --build
```

The app runs migrations automatically with `prisma migrate deploy` before starting the server.

Create the first administrator after the containers are healthy:

```bash
docker compose exec app npm run auth:seed-admin
```

The seed command creates the configured administrator only when the email does not already exist. It never silently resets an existing password.

Scan the WhatsApp QR code printed in the container logs:

```bash
docker compose logs -f app
```

The WhatsApp session persists in the `wwebjs_auth` Docker volume, so you normally scan once only. PostgreSQL data persists in the `postgres_data` volume.

Stop services:

```bash
docker compose down
```

Stop services and delete all persisted database/auth data:

```bash
docker compose down -v
```

Open the dashboard and sign in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`:

```text
http://localhost:3001
```

## API Verification

Health check:

```bash
curl http://localhost:3000/health
```

Authenticate and save the secure cookies:

```bash
curl -c helpdesk-cookies.txt \
  -H "Origin: http://localhost:3001" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-password"}' \
  http://localhost:3000/api/auth/login
```

List all tickets:

```bash
curl -b helpdesk-cookies.txt http://localhost:3000/api/tickets
```

Filter tickets by status and AI classification:

```bash
curl -b helpdesk-cookies.txt \
  "http://localhost:3000/api/tickets?status=open&classification=CAN_AUTO_FIX"
```

Resolve a known ticket from a disposable/test dataset:

```bash
curl -b helpdesk-cookies.txt \
  -H "Origin: http://localhost:3001" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"status":"resolved"}' \
  http://localhost:3000/api/tickets/TICKET_ID/status
```

Reopen it and verify that `resolvedAt` becomes `null`:

```bash
curl -b helpdesk-cookies.txt \
  -H "Origin: http://localhost:3001" \
  -H "Content-Type: application/json" \
  -X PATCH \
  -d '{"status":"open"}' \
  http://localhost:3000/api/tickets/TICKET_ID/status
```

## Local Development Without Docker

If you are not using Docker, install Node.js 20.9+ and PostgreSQL, then create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to your local PostgreSQL database:

```env
PORT=3000
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/helpdesk?schema=public"
GEMINI_API_KEY="your_api_key_here"
```

Install dependencies and migrate:

```bash
npm install
npm run prisma:migrate
npm run auth:seed-admin
npm run dev
```

In a second terminal, install and start the dashboard:

```bash
cd dashboard
cp .env.example .env.local
npm install
npm run dev
```

Run strict type checking and create a production build:

```bash
npm run typecheck
npm test
npm run build
cd dashboard
npm run lint
npm run typecheck
npm test
npm run build
```

## Authentication And Realtime

Technician access uses a short-lived JWT in an HttpOnly cookie and a rotating refresh token. Browser mutations require an allowed dashboard origin. There is no public registration endpoint.

Socket.IO is attached to the backend HTTP server under the authenticated `/dashboard` namespace and is forced to `websocket` transport. It publishes `ticket:created` and `ticket:updated` only after Prisma commits. The client performs a full REST reconciliation after reconnects, stream changes, or sequence gaps and uses 10-second polling only when realtime is unavailable and fallback refresh is enabled.

Production deployments must terminate TLS in front of both services, expose the realtime endpoint as `wss://`, forward WebSocket upgrade headers, and set `DASHBOARD_ALLOWED_ORIGINS` and `NEXT_PUBLIC_API_URL` to their public HTTPS origins.

Set `WHATSAPP_ENABLED=false` when running the REST and WebSocket API in isolation for tests or maintenance. The default remains `true`.

## WhatsApp Message Flow

Send a direct WhatsApp message to the authenticated WhatsApp account. The service ignores bot-sent messages, groups, status broadcasts, and empty messages. Gemini extracts the workstation number, classifies the issue, selects only whitelisted scripts, and stores the result as an `open` ticket. A contextual reply is sent only when `WHATSAPP_AUTO_REPLY=true`.

Automatic replies are disabled by default. Set `WHATSAPP_AUTO_REPLY=true` in `.env` only when you want the acknowledgment reply enabled, then recreate the app container:

```bash
docker compose up -d --build app
```
