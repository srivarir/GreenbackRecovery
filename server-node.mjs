import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = parseInt(process.env.PORT || "3000", 10);

// Import server handler using absolute URL so relative imports inside it resolve correctly
const serverPath = pathToFileURL(join(__dirname, "dist/server/server.js")).href;
const { default: fetchHandler } = await import(serverPath);

const server = createServer(async (req, res) => {
  try {
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
    const url = `${protocol}://${host}${req.url}`;

    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (v != null) headers[k] = Array.isArray(v) ? v.join(", ") : String(v);
    }

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

    const webReq = new Request(url, {
      method: req.method,
      headers,
      body: body?.length ? body : undefined,
    });

    const webRes = await fetchHandler(webReq, {}, {});

    res.statusCode = webRes.status;
    for (const [k, v] of webRes.headers.entries()) res.setHeader(k, v);

    if (webRes.body) {
      const reader = webRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error("Server error:", err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
