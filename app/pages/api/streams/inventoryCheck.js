// /pages/api/streams/inventoryCheck.js
import { getClientPromise } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  try {
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DATABASE_NAME);
    const collection = db.collection('inventoryCheck');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Send headers before sending data

    const pipeline = [
      {
        $match: {
          operationType: 'insert',
        },
      },
    ];

    const changeStream = collection.watch(pipeline);

    changeStream.on('change', (change) => {
      const newCheckResult = change.fullDocument?.checkResult || null;

      if (newCheckResult) {
        res.write(`data: ${JSON.stringify(newCheckResult)}\n\n`);
      }
    });

    req.on('close', () => {
      changeStream.close(); // Close the change stream when the client disconnects
      res.end();
    });
  } catch (error) {
    console.error('Error in inventoryCheck SSE:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
