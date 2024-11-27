import { getClientPromise } from '../../../lib/mongodb';

let client = null;

export default async function handler(req, res) {
  // Ensure the request is a GET request
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    if (!client) {
      client = await getClientPromise();
    }
    const db = client.db(process.env.MONGODB_DATABASE_NAME);
    const collection = db.collection('products');

    // Start MongoDB change stream
    const changeStream = collection.watch([{ $match: { operationType: 'update' } }]);

    // Notify client of connection initialization
    res.write(`data: Connection initialized\n\n`);

    // Listen for changes in the collection
    changeStream.on('change', (change) => {
      res.write(`data: ${JSON.stringify(change)}\n\n`);
    });

    // Handle client disconnect
    req.on('close', () => {
      console.log('Client disconnected');
      changeStream.close();
      res.end();
    });
  } catch (error) {
    console.error('Error in products SSE handler:', error);
    res.write(`data: ${JSON.stringify({ error: 'Internal Server Error' })}\n\n`);
    res.end();
  }
}
