import { MongoClient } from 'mongodb';
import clientPromise from '../../lib/mongodb';

const dbName = 'interns_mongo_retail';
const collectionName = 'products';

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
      {
        $limit: 5, // Limit the number of autocomplete suggestions
      },
      {
        $project: {
          suggestion: '$name', // Map 'name' field to 'suggestion' for consistency
          _id: 0,
        },
      },
    ];

    const autocompleteResults = await collection.aggregate(autocompleteAgg).toArray();

    const suggestions = autocompleteResults.map((result) => result.suggestion);

    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Error in suggestions.js:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
