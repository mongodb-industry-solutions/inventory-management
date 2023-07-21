import { MongoClient } from 'mongodb';
import clientPromise from '../../lib/mongodb';

const dbName = 'interns_mongo_retail';
const collectionName = 'orders';

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  const client = await MongoClient.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = client.db(dbName);
  cachedDb = db;

  return db;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const searchQuery = req.query.q;

  if (!searchQuery) {
    res.status(400).json({ error: 'Search query is required' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db(dbName);

    const results = await db
      .collection(collectionName)
      .aggregate([
        {
          $search: {
            index: 'default',
            text: {
              query: searchQuery,
              path: {
                wildcard: '*',
              },
              fuzzy: {
                maxEdits: 2, // Adjust the number of maximum edits for typo-tolerance
                },
            },
          },
        },
        { $limit: 20 },
      ])
      .toArray();

    res.status(200).json({ results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

