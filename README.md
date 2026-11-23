# Ludo Darwesh — Online Multiplayer Starter (v1)

This package adds an online room lobby to the existing Ludo Darwesh HTML game and connects the game to the Node.js + Socket.IO server.

## What is included
- Create a room with a 5-character code.
- Join a room using that code.
- 2–4 players per room; room creator is host.
- Host starts the match when at least two players have joined.
- The host runs the existing game rules and broadcasts game snapshots; other players send their turn actions to the host.
- The original board and custom rules are retained in `android/app/src/main/assets/index.html`.

## Important beta limitations
- This is an early multiplayer integration, not a production-ready competitive game server. The host's device runs the game logic; the server relays actions and snapshots. Server-side authoritative dice/move validation, reconnect/rejoin, host migration, persistent rooms, anti-cheat protections, and deployment hardening are not included.
- If the host disconnects or closes the page, the match may stop.
- Rooms are in-memory and disappear when the server restarts.
- The server must be reachable over the internet for friends on different networks. A server running at `localhost` on one phone is only reachable from that same phone. Deploy this Node.js project to a public HTTPS host before inviting remote friends.
- Socket.IO's browser client is loaded from the Socket.IO CDN, so the game page needs internet access.

## Run locally for a smoke test
1. Install Node.js 20 or newer.
2. In the `server` folder, run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000` in a browser. `/health` should return a small JSON status.
5. To test with another device on the same Wi-Fi, use the host phone/computer's LAN IP and port 3000 as the Server URL. This is a LAN test, not internet hosting.

## Public hosting
Deploy the contents of the `server` folder to a Node.js host that supports WebSockets and set its start command to `npm start`. Open the public HTTPS address. The Server URL field is prefilled when the page is served by that same server. For the Android WebView build, enter the public HTTPS server address in the Server URL field.

## Android app
The Android folder is a WebView wrapper project. It is not a built APK. Build it with Android Studio/Gradle on a computer after configuring the public server URL and testing the hosted web game.
