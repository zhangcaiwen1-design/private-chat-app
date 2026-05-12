# Private Calculator Chat Backend

Local Express + SQLite API for persisting contacts and chat messages during development.

## Stack

- Node.js + Express
- SQLite via `better-sqlite3`

## Setup

```bash
npm install
cp .env.example .env
npm start
```

For development with automatic restart:

```bash
npm run dev
```

The server listens on `PORT` (default `3001`) and binds to `0.0.0.0` so Expo clients on the local network can reach it.

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | No | `3001` | Express server port. |
| `DB_PATH` | No | `./data/app.db` | SQLite database file path. Relative paths are resolved from the process working directory. |

## API

### Health

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Returns server status and timestamp. |

### Contacts

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/contacts` | List contacts. |
| `POST` | `/api/v1/contacts` | Create a contact. Accepts `name`/`phone` or `friend_name`/`friend_phone`. |
| `POST` | `/api/v1/contacts/qr-add` | Create a contact from `qr_code`. |

### Messages

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/messages/:contactId` | List messages for a contact. Optional `limit` and `before` query params. |
| `POST` | `/api/v1/messages` | Create a message with `contact_id`, `content`, and optional `type`, `duration`, `burn_after_read`, `burn_duration`. |
| `POST` | `/api/v1/messages/:messageId/read` | Mark a message as read. |
| `DELETE` | `/api/v1/messages/:messageId` | Delete a message. |

## Verification

```bash
npm test
```
