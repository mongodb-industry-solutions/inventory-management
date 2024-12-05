import { clientPromise } from "../../../lib/mongodb";

let client = null;

export default async function handler(req, res) {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Ensure the request is a GET request
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Set up SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // Send headers before data

  try {
    if (!client) {
      client = await clientPromise;
    }
    const db = client.db(process.env.MONGODB_DATABASE_NAME);
    const collection = db.collection("products");

    // Start MongoDB change stream
    console.log("Starting change stream...");
    const changeStream = collection.watch([
      { $match: { operationType: "update" } },
    ]);

    const sendUpdate = (data) => {
      if (writable.locked) {
        console.log("Sending update");
        const event = `data: ${JSON.stringify(data)}\n\n`;
        writer.write(encoder.encode(event)).catch((error) => {
          console.error("Error writing update:", error);
        });
      } else {
        console.warn("Writable stream is not locked, skipping update.");
      }
    };

    // Notify client of connection initialization
    // res.write(
    //   `data: ${JSON.stringify({ message: "Connection initialized" })}\n\n`
    // );

    // Listen for changes in the collection
    changeStream.on("change", (change) => {
      sendUpdate(change);
    });

    // Handle client disconnect
    req.on("close", () => {
      console.log("Client disconnected");
      changeStream.close();
      res.end();
    });
  } catch (error) {
    console.error("Error in products SSE handler:", error);
    res.write(
      `data: ${JSON.stringify({ error: "Internal Server Error" })}\n\n`
    );
    res.end();
  }
}
