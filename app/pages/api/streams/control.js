// /pages/api/streams/control.js
import { getClientPromise } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  try {
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DATABASE_NAME);
    const collection = db.collection('products');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Send headers before sending data

    const pipeline = [
      {
        $match: {
          operationType: 'update',
        },
      },
    ];

    const changeStream = collection.watch(pipeline);

    changeStream.on('change', (change) => {
      const updatedProduct = change.fullDocument;

      if (updatedProduct) {
        res.write(`data: ${JSON.stringify(updatedProduct)}\n\n`);
      }
    });

    req.on('close', () => {
      changeStream.close(); // Close the change stream when the client disconnects
      res.end();
    });
  } catch (error) {
    console.error('Error in control SSE:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
