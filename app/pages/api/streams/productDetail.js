import { getClientPromise } from '../../../lib/mongodb';
import { ObjectId } from 'bson';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { productId, location } = req.query;

  if (!productId) {
    return res.status(400).json({ error: 'Missing required query parameter: productId' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Send headers before data

  try {
    const client = await getClientPromise();
    const db = client.db(process.env.MONGODB_DATABASE_NAME);
    const collection = db.collection('products');

    const pipeline = [
      {
        $match: {
          'fullDocument._id': new ObjectId(productId),
          operationType: 'update',
        },
      },
    ];

    const changeStream = collection.watch(pipeline);

    // Notify client of connection initialization
    res.write(`data: ${JSON.stringify({ message: 'Connection initialized' })}\n\n`);

    changeStream.on('change', async (change) => {
      let updatedProduct = change.fullDocument;

      // If location is not provided, retrieve additional data
      if (!location) {
        const areaView = await db.collection('products_area_view').findOne({
          _id: updatedProduct._id,
        });
        updatedProduct = areaView || updatedProduct;
      }

      res.write(`data: ${JSON.stringify(updatedProduct)}\n\n`); // Send update to frontend
    });

    req.on('close', () => {
      console.log('Client disconnected from product detail stream');
      changeStream.close(); // Close the change stream when the connection is closed
      res.end();
    });
  } catch (error) {
    console.error('Error in productDetail SSE:', error);
    res.write(`data: ${JSON.stringify({ error: 'Internal Server Error' })}\n\n`);
    res.end();
  }
}
