// File: pages/api/streams/productList.js

import { getClientPromise } from '../../../lib/mongodb';

export default async function handler(req, res) {
  const client = await getClientPromise();
  const db = client.db(process.env.MONGODB_DATABASE_NAME);
  const locationId = req.query.locationId;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const pipeline = [
    { $match: { operationType: "update" } },
    { $match: { "fullDocument.location.id": locationId } }
  ];

  const changeStream = db.collection("products").watch(pipeline);

  changeStream.on('change', (change) => {
    const updatedProduct = change.fullDocument;
    updatedProduct.items.forEach((item) => {
      const itemStock = item.stock.find((stock) => stock.location.id === locationId);
      if (itemStock && itemStock.amount + itemStock.ordered < itemStock.threshold) {
        res.write(`data: ${JSON.stringify({ type: "alert", item })}\n\n`);
      }
    });
    res.write(`data: ${JSON.stringify({ type: "update", product: updatedProduct })}\n\n`);
  });

  req.on('close', () => {
    changeStream.close();
    res.end();
  });
}
