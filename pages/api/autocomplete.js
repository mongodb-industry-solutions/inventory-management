// pages/api/autocomplete.js

import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  const { q } = req.query;

  try {
    const client = await clientPromise;
    const db = client.db('interns_mongo_retail');

    const autocompleteAgg = [
      {
        $match: {
          name: {
            $regex: new RegExp(q, 'i'), // Perform case-insensitive regex search
          },
        },
      },
      {
        $limit: 5, // Limit the number of autocomplete suggestions
      },
      {
        $project: {
          name: 1, // Only return the 'name' field for suggestions
          _id: 0,
        },
      },
    ];

    const autocompleteResults = await db.collection('products').aggregate(autocompleteAgg).toArray();

    const suggestions = autocompleteResults.map((result) => result.name);

    res.status(200).json({ suggestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
