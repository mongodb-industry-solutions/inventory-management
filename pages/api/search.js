import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = 'interns_mongo_retail';
const collectionName = 'products';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const searchQuery = req.query.q;
  let client;

  try {
    client = new MongoClient(uri);
    await client.connect();

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
  } finally {
    client.close();
  }
}