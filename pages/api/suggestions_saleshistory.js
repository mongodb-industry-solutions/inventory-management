import { MongoClient } from 'mongodb';
import clientPromise from '../../lib/mongodb';

const dbName = 'interns_mongo_retail';
const collectionName = 'sales';

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
    const collection = db.collection(collectionName);

    const autocompleteAgg = [
      {
        $match: {
          "sku": { $regex: searchQuery, $options: "i" } // Search by SKUs
        }
      },
      {
        $group: {
          _id: "$sku" // Group by the SKU field to remove duplicates
        }
      },
      {
        $limit: 5 // Limit the number of autocomplete suggestions
      }
    ];

    const autocompleteResults = await collection.aggregate(autocompleteAgg).toArray();

    const suggestions = autocompleteResults.map((result) => result._id); 

    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Error in suggestions.js:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
