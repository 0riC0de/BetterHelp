# IT Helpdesk WhatsApp Ingress API

Backend service for ticket persistence and dashboard REST access. Incoming WhatsApp messages are ingested through `whatsapp-web.js` with `LocalAuth`.

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
```

Use an alphanumeric password to avoid URL escaping issues in `DATABASE_URL`.

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

## Local Development Without Docker

If you are not using Docker, install Node.js and PostgreSQL manually, then create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to your local PostgreSQL database:

```env
PORT=3000
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/helpdesk?schema=public"
```

Install dependencies and migrate:

```bash
npm install
npm run prisma:migrate -- --name init
npm run dev
```

## WhatsApp Message Flow

Send a direct WhatsApp message to the authenticated WhatsApp account. The service ignores bot-sent messages, groups, status broadcasts, and empty messages. Valid direct messages are inserted as `open` tickets and receive an immediate acknowledgment reply.
