import { io as createSocket } from "socket.io-client";
import { pool } from "../lib/db.js";
import { runMigrations } from "./migrate.js";
import { startServer, stopServer } from "../index.js";
import { server } from "../lib/socket.js";

const waitForEvent = (socket, eventName) => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${eventName}`)), 10_000);
  socket.once(eventName, (value) => {
    clearTimeout(timeout);
    resolve(value);
  });
});

const request = async (baseUrl, path, { cookie, method = "GET", body } = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${method} ${path} failed (${response.status}): ${data.message}`);
  return { cookie: response.headers.get("set-cookie")?.split(";")[0], data, status: response.status };
};

const run = async () => {
  let firstUser;
  let secondUser;
  let socket;

  await runMigrations();
  await startServer(0);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    const firstSignup = await request(baseUrl, "/api/auth/signup", {
      method: "POST",
      body: { email: `e2e-a-${suffix}@example.com`, fullName: "E2E User A", password: "StrongPass123!" },
    });
    firstUser = firstSignup.data;

    const secondSignup = await request(baseUrl, "/api/auth/signup", {
      method: "POST",
      body: { email: `e2e-b-${suffix}@example.com`, fullName: "E2E User B", password: "StrongPass123!" },
    });
    secondUser = secondSignup.data;

    socket = createSocket(baseUrl, {
      autoConnect: false,
      extraHeaders: { Cookie: secondSignup.cookie },
      transports: ["websocket"],
    });
    const connected = waitForEvent(socket, "connect");
    socket.connect();
    await connected;

    const messageEvent = waitForEvent(socket, "newMessage");
    const sent = await request(baseUrl, `/api/messages/send/${secondUser._id}`, {
      cookie: firstSignup.cookie,
      method: "POST",
      body: { text: "Neon end-to-end message" },
    });
    const received = await messageEvent;
    if (received._id !== sent.data._id) throw new Error("Socket delivery did not match the persisted message");

    const history = await request(baseUrl, `/api/messages/${secondUser._id}`, { cookie: firstSignup.cookie });
    if (!history.data.some((message) => message._id === sent.data._id)) throw new Error("Message missing from conversation history");

    const databaseResult = await pool.query("SELECT text FROM messages WHERE id = $1", [sent.data._id]);
    if (databaseResult.rows[0]?.text !== "Neon end-to-end message") throw new Error("Message missing from Neon Postgres");

    const readiness = await request(baseUrl, "/api/ready");
    console.log(JSON.stringify({
      api: "ok",
      database: readiness.data.database,
      messageId: sent.data._id,
      socket: "ok",
    }));
  } finally {
    socket?.disconnect();
    const ids = [firstUser?._id, secondUser?._id].filter(Boolean);
    if (ids.length > 0) await pool.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [ids]);
    await stopServer();
  }
};

run().catch((error) => {
  console.error("End-to-end test failed:", error.message);
  process.exit(1);
});
