# IT Helpdesk WhatsApp Ingress API

Strict TypeScript backend for AI-assisted ticket triage, persistence, and dashboard REST access. Incoming WhatsApp messages are ingested through `whatsapp-web.js` with `LocalAuth` and classified by Gemini 2.5 Flash.

## Docker Deployment

Use Docker Compose on Ubuntu. You do not need to install PostgreSQL directly on the host. Compose starts both services:

- `postgres`: PostgreSQL database container
- `app`: Node.js/Express/WhatsApp Web service container

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
```

Set a real Gemini API key and use an alphanumeric database password to avoid URL escaping issues in `DATABASE_URL`.

Start everything:

```bash
docker compose up --build
```

The app runs migrations automatically with `prisma migrate deploy` before starting the server.

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

## Docker API Tests

Health check:

```bash
curl http://localhost:3000/health
```

List all tickets:

```bash
curl http://localhost:3000/api/tickets
```

Filter open tickets:

```bash
curl "http://localhost:3000/api/tickets?status=open"
```

Filter tickets by AI classification:

```bash
curl "http://localhost:3000/api/tickets?classification=CAN_AUTO_FIX"
```

## Local Development Without Docker

If you are not using Docker, install Node.js and PostgreSQL manually, then create `.env` from `.env.example`:

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
npm run prisma:migrate -- --name init
npm run dev
```

Run strict type checking and create a production build:

```bash
npm run typecheck
npm run build
```

## WhatsApp Message Flow

Send a direct WhatsApp message to the authenticated WhatsApp account. The service ignores bot-sent messages, groups, status broadcasts, and empty messages. Gemini extracts the workstation number, classifies the issue, selects only whitelisted scripts, and stores the result as an `open` ticket. A contextual reply is sent only when `WHATSAPP_AUTO_REPLY=true`.

Automatic replies are disabled by default. Set `WHATSAPP_AUTO_REPLY=true` in `.env` only when you want the acknowledgment reply enabled, then recreate the app container:

```bash
docker compose up -d --build app
```
