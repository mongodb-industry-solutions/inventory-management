// File: pages/api/streams/dashboard.js

import { getClientPromise } from '../../../lib/mongodb';

export default async function handler(req, res) {
  const client = await getClientPromise();
  const db = client.db(process.env.MONGODB_DATABASE_NAME);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const pipeline = [{ $match: { operationType: "insert", "fullDocument.type": "outbound" } }];
  const changeStream = db.collection("transactions").watch(pipeline);

  changeStream.on('change', () => {
    res.write(`data: ${JSON.stringify({ type: "refresh" })}\n\n`);
  });

  req.on('close', () => {
    changeStream.close();
    res.end();
  });
}
