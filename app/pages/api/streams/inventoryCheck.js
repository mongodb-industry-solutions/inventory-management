// /pages/api/streams/inventoryCheck.js
import { getClientPromise } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  try {
    if (!process.env.MONGODB_DATABASE_NAME) {
      console.error('Missing environment variable: MONGODB_DATABASE_NAME');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DATABASE_NAME);
    const collection = db.collection('inventoryCheck');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Send headers immediately

    const pipeline = [
      {
        $match: {
          operationType: 'insert',
        },
      },
    ];

    let changeStream;
    try {
      changeStream = collection.watch(pipeline);
    } catch (err) {
      console.error('Error starting change stream:', err);
      res.status(500).json({ error: 'Unable to start change stream' });
      return;
    }

    changeStream.on('change', (change) => {
      const newCheckResult = change.fullDocument?.checkResult || null;
      if (newCheckResult) {
        res.write(`data: ${JSON.stringify(newCheckResult)}\n\n`);
      } else {
        console.log('Received change without a checkResult:', change);
      }
    });

    const timeout = setTimeout(() => {
      console.log('Closing inactive client connection.');
      changeStream.close();
      res.end();
    }, 300000); // 5 minutes timeout for idle connection

    req.on('close', () => {
      clearTimeout(timeout);
      console.log('Client connection closed.');
      changeStream.close();
      res.end();
    });
  } catch (error) {
    console.error('Error in inventoryCheck SSE:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
