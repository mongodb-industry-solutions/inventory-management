import { getClientPromise } from '../../../lib/mongodb';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed. Use GET.' });
    return;
  }

  try {
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DATABASE_NAME);
    const collection = db.collection('transactions');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Send headers immediately

    const pipeline = [
      {
        $match: {
          operationType: 'insert',
          'fullDocument.type': 'outbound',
        },
      },
    ];

    const changeStream = collection.watch(pipeline);

    changeStream.on('change', (change) => {
      console.log('Change detected in transactions:', change);

      res.write(`data: ${JSON.stringify(change.fullDocument)}\n\n`);
    });

    req.on('close', () => {
      console.log('Client disconnected from dashboard stream');
      changeStream.close();
      res.end();
    });
  } catch (error) {
    console.error('Error in dashboard SSE handler:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
