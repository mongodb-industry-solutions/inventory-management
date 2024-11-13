// File: pages/api/streams/productDetail.js

import { getClientPromise } from '../../../lib/mongodb';
import { ObjectId } from 'bson';

export default async function handler(req, res) {
  const client = await getClientPromise();
  const db = client.db(process.env.MONGODB_DATABASE_NAME);
  const productId = new ObjectId(req.query.productId);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const pipeline = [{ $match: { "fullDocument._id": productId } }];
  const changeStream = db.collection("products").watch(pipeline);

  changeStream.on('change', (change) => {
    res.write(`data: ${JSON.stringify(change.fullDocument)}\n\n`);
  });

  req.on('close', () => {
    changeStream.close();
    res.end();
  });
}
