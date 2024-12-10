import { clientPromise } from '../../lib/mongodb';
import { ObjectId } from 'bson';

let client = null;

export default async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res
        .status(405)
        .json({ error: 'Only POST requests are allowed' });
    }

    const { update, filter, collection } = req.body;

    if (!filter || !update || !collection) {
      return res
        .status(400)
        .json({ error: 'Missing required fields in request body' });
    }

    const database = process.env.MONGODB_DATABASE_NAME;
    if (!database) {
      return res
        .status(500)
        .json({
          error: 'Missing database name in environment variables',
        });
    }

    if (!client) {
      client = await clientPromise;
    }
    const db = client.db(database);

    const productId = ObjectId.isValid(filter._id)
      ? new ObjectId(filter._id)
      : filter._id;
    const autoStatus = update.$set.autoreplenishment;

    console.log('Filter:', { _id: productId });
    console.log('Collection:', collection);
    console.log('Database:', database);

    const result = await db
      .collection(collection)
      .updateOne(
        { _id: productId },
        { $set: { autoreplenishment: autoStatus } }
      );

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ error: 'No matching document found' });
    }

    res.status(200).json({ success: true });
  } catch (e) {
    console.error('Error in setAutoreplenishment API:', e.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
