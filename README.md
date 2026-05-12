# Private Calculator Chat

Calculator-disguised private chat prototype for Expo Go. The mobile app connects to a local Node/Express server on your computer, and chat data is stored in a local SQLite database.

## Project layout

```text
app/          Expo Router entry
src/          Calculator and chat UI
backend/      Local Express + SQLite API
```

## Install

```bash
npm install
npm install --prefix backend
```

## Start backend

```bash
npm run dev --prefix backend
```

Backend health check:

```text
http://localhost:3001/health
```

Expected response contains `"status":"ok"`.

## Configure phone access

Your phone cannot use `localhost` to reach the computer. Find the computer's LAN IPv4 address, then create `.env` in the project root:

```env
EXPO_PUBLIC_API_BASE_URL=http://YOUR_COMPUTER_LAN_IP:3001/api/v1
EXPO_PUBLIC_APP_UNLOCK_PIN=change-me-unlock-pin
EXPO_PUBLIC_ADMIN_ENTRY_CODE=change-me-admin-entry-code
ADMIN_MEMBERSHIP_KEY=change-me-admin-key
```

Example:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.100:3001/api/v1
EXPO_PUBLIC_APP_UNLOCK_PIN=change-me-unlock-pin
EXPO_PUBLIC_ADMIN_ENTRY_CODE=change-me-admin-entry-code
ADMIN_MEMBERSHIP_KEY=change-me-admin-key
```

Keep the phone and computer on the same Wi-Fi.

后端启动时会优先读取项目根 `.env`，也兼容读取 `backend/.env`。
如果你要打开会员中心里的隐藏运营入口，可以在 `.env` 里设置 `EXPO_PUBLIC_ADMIN_ENTRY_CODE`，网页调试时输入该口令后会跳到本地审核台。

## Start Expo

```bash
npm start
```

Scan the QR code with Expo Go.

## Manual Expo Go test

1. Open the app in Expo Go.
2. Confirm the first screen looks like a calculator.
3. Enter the value from `EXPO_PUBLIC_APP_UNLOCK_PIN` and press `=`.
4. Confirm the chat list appears.
5. Open the seeded test contact.
6. Send a text message.
7. Close and reopen the app.
8. Unlock again and confirm the message is still present.

## Local-first persistence checks

1. Add a new contact from the chat list.
2. Open that conversation and send two text messages.
3. Return to the chat list and confirm the last preview shows the latest text.
4. Reopen the conversation, delete the latest message, then return to the chat list.
5. Confirm the preview falls back to the previous message.
6. Close and reopen Expo Go, unlock again, and confirm the conversation still exists.

The local backend now stores `conversation_id`, `client_id`, `sync_state`, `updated_at`, and soft-delete tombstones so later cloud sync can build on the same local records.

## Cloud record dimension and restore checks

Run the full cloud verification suite:

```bash
npm run cloud:verify
```

This runs backend API regression plus the text, image, and voice cloud restore smoke flows.

If you only want the UI smoke suite:

```bash
npm run cloud:restore:smoke
```

This sequentially verifies text, image, and voice cloud restore flows.

Manual checklist:

1. Unlock the app and switch cloud membership to paid.
2. Send a new chat message, then open `云端记录` from the chat list action menu.
3. Confirm the latest cloud card shows contact, source, and upload time.
4. Tap the cloud card and confirm preview/download still works.
5. Tap `恢复到本地` on that card.
6. Return to the chat list and confirm the restored conversation preview updates.
7. Open the conversation and confirm the restored message exists locally.

## Data location

SQLite database:

```text
backend/data/app.db
```

This file is intentionally ignored by git.
