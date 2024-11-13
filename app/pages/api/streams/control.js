// File: pages/api/streams/control.js

import { getClientPromise } from '../../../lib/mongodb';

export default async function handler(req, res) {
  const client = await getClientPromise();
  const db = client.db(process.env.MONGODB_DATABASE_NAME);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const pipeline = [{ $match: { operationType: "update" } }];
  const changeStream = db.collection("products").watch(pipeline);

  changeStream.on('change', (change) => {
    res.write(`data: ${JSON.stringify(change.fullDocument)}\n\n`);
  });

  req.on('close', () => {
    changeStream.close();
    res.end();
  });
}
