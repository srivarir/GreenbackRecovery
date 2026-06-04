import { createServer } from "node:http";
import fetchHandler from "./dist/server/server.js";

const port = parseInt(process.env.PORT || "3000", 10);

const server = createServer(async (req, res) => {
  try {
    const url = `http://${req.headers.host || "localhost"}${req.url}`;
    
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (value != null) headers[key] = Array.isArray(value) ? value.join(", ") : value;
    }

    const webReq = new Request(url, {
      method: req.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
    });

    const webRes = await fetchHandler(webReq, {}, {});

    res.statusCode = webRes.status;
    for (const [key, value] of webRes.headers.entries()) {
      res.setHeader(key, value);
    }
    
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
    console.error(err);
    res.statusCode = 500;
    res.end("Internal Server Error");
  }
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
