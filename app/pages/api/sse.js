import { getChangeStream } from "../../lib/mongodb";
import { NextResponse } from "next/server";
import { AbortController } from "abort-controller";

const HEARTBEAT_INTERVAL = 5000; // Keep alive interval in milliseconds

const changeStreams = new Map();
const changeListeners = new Map();

export default async (req, res) => {
  const { accept } = req.headers;

  // Check if the client accepts SSE
  if (accept === "text/event-stream") {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Parse the URL to get query parameters
    const { sessionId, colName, _id } = req.query;

    // Check if required parameters are provided
    if (!sessionId) {
      res.status(400).json({ error: "Missing required parameter: clientId" });
      return;
    }

    const key = sessionId;

    const intervalId = setInterval(() => {
      // Send a heartbeat message to keep the connection alive
      if (writable.locked) {
        writer.write(encoder.encode(": heartbeat\n\n")).catch((error) => {
          console.error("Error writing heartbeat:", error);
        });
      } else {
        console.warn("Writable stream is not locked, skipping heartbeat.");
      }
    }, HEARTBEAT_INTERVAL);

    // Send real-time updates to the client
    const sendUpdate = (data) => {
      if (writable.locked) {
        const event = `data: ${JSON.stringify(data)}\n\n`;
        writer.write(encoder.encode(event)).catch((error) => {
          console.error("Error writing update:", error);
        });
      } else {
        console.warn("Writable stream is not locked, skipping update.");
      }
    };

    const filter = {};
    if (colName) {
      filter["ns.coll"] = colName;
    }
    if (_id) {
      filter["documentKey._id"] = { $oid: _id };
    }

    const changeStream = await getChangeStream(filter, key);

    const changeListener = (change) => {
      // Notify the client about the change
      sendUpdate(change);
    };

    changeStream.on("change", changeListener);
    changeStreams.set(key, changeStream);
    changeListeners.set(key, changeListener);

    // Handle client disconnect
    const controller = new AbortController();
    const { signal } = controller;

    signal.addEventListener("abort", () => {
      // Clean up resources and stop sending updates when the client disconnects
      console.log("Client disconnected");
      clearInterval(intervalId);
      if (changeStreams.has(key)) {
        changeStreams.get(key).off("change", changeListeners.get(key));
        changeStreams.delete(key);
        changeListeners.delete(key);
      }
      writer.close().catch((error) => {
        console.error("Error closing writer:", error);
      });
    });

    // Pass the signal to the req object
    req.signal = signal;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Content-Encoding", "none");

    readable.pipeTo(
      new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        },
      })
    );
  } else {
    // Return a 404 response for non-SSE requests
    res.status(404).json({ error: "Not Found" });
  }
};
