# Private Calculator Chat Local Migration Design

Date: 2026-04-28

## Context

The existing Expo Go prototype lives at `C:/Users/Administrator/PrivateChatApp`. It already contains the calculator disguise, unlock flow, chat list, chat window, cloud records, and a `backend/` directory. The user has viewed the prototype on a phone through Expo Go and considers the UI a good initial version, not a final design.

The desired project location is `D:/coding/private-calculator-chat`.

## Goal

Preserve the existing initial UI and move the project into the `D:/coding` workspace, then adapt the backend from remote-storage-oriented persistence to a local computer server using SQLite. The phone running Expo Go should connect to the computer over the same Wi-Fi.

## Scope

Included:

- Copy or migrate the existing Expo project into `D:/coding/private-calculator-chat`.
- Keep the existing calculator disguise and chat UI as the baseline.
- Replace or simplify backend persistence to local SQLite.
- Run the backend on `0.0.0.0` so Expo Go on a phone can reach it through the computer LAN IP.
- Provide simple API endpoints for health, contacts/conversations, messages, and message creation.
- Keep development workflow simple: start backend, start Expo, scan with Expo Go.

Excluded for now:

- Final UI redesign.
- Cloud deployment.
- Remote production storage integration.
- Real multi-user production authentication.
- End-to-end encryption.
- Voice/image message uploads unless already local and working.

## Architecture

The migrated project should use this structure:

```text
D:/coding/private-calculator-chat/
  mobile/app and existing Expo files
  src/                         existing UI/components/services
  backend/
    server.js                  Express app
    data/app.db                SQLite database file
    routes/                    local API routes
    services/db.js             SQLite initialization and queries
```

The frontend remains an Expo app. The backend remains Node/Express and uses local SQLite storage. The mobile app should use a configurable API base URL so the user can set the computer LAN IP during development.

## Data model

SQLite should start with minimal tables:

- `contacts`: id, name, avatar, last_message, updated_at
- `messages`: id, contact_id, direction, content, type, created_at, read_at

The first version can seed one or two sample contacts so the chat UI works immediately.

## Data flow

1. User opens Expo Go and sees the calculator disguise.
2. User enters the configured PIN and presses `=`.
3. App opens the private chat list.
4. Chat list calls the local backend for contacts/conversations.
5. Chat window calls the backend for messages by contact.
6. Sending a message posts to the backend and stores it in SQLite.
7. Returning to calculator locks the private UI again.

## Error handling

- If the server is unreachable, the UI should show a clear local-network connection message instead of failing silently.
- Backend should return JSON errors and keep `/health` unauthenticated.
- SQLite initialization should create required tables automatically on server startup.

## Testing and verification

- Run backend locally and verify `/health` from the computer.
- Start Expo and verify the calculator screen opens.
- Use Expo Go on the phone on the same Wi-Fi.
- Unlock with PIN and verify chat list loads from backend.
- Send a test message and verify it persists after app reload.

## Open implementation decision

Before implementation, check whether copying the entire existing directory including `node_modules` is necessary. Prefer migrating source files and reinstalling dependencies in the new location to avoid moving heavy generated folders.
