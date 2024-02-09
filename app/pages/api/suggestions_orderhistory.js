import { MongoClient } from 'mongodb';
import clientPromise from '../../lib/mongodb';

if (!process.env.MONGODB_DATABASE_NAME) {
  throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
}

const dbName = process.env.MONGODB_DATABASE_NAME;
const collectionName = 'orders';

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
          $or: [
            { "items.product.name": { $regex: searchQuery, $options: "i" } }, // Search by product names
            { "items.sku": { $regex: searchQuery, $options: "i" } } // Search by SKUs
          ]
        }
      },
      {
        $unwind: "$items" // Unwind the "items" array
      },
      {
        $project: {
          suggestion: {
            $concat: [
              "$items.product.name",
              { $cond: [{ $ne: ["$items.product.name", null] }, " - ", ""] },
              { $ifNull: ["$items.sku", ""] }
            ]
          }
        }
      },
      {
        $match: {
          suggestion: { $regex: searchQuery, $options: "i" } // Perform case-insensitive search
        }
      },
      {
        $group: {
          _id: "$suggestion" // Group by the suggestion field to remove duplicates
        }
      },
      {
        $project: {
          _id: 0,
          suggestion: "$_id" // Rename the _id field to suggestion
        }
      },
      {
        $limit: 5 // Limit the number of autocomplete suggestions
      }
    ];
    
    

    const autocompleteResults = await collection.aggregate(autocompleteAgg).toArray();

    const suggestions = autocompleteResults.map((result) => result.suggestion);

    res.status(200).json({ suggestions });
  } catch (error) {
    console.error('Error in suggestions.js:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
