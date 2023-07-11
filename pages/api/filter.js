import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = 'interns_mongo_retail';
const collectionName = 'products';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  let client;

  try {
    client = new MongoClient(uri);
    await client.connect();

    const db = client.db(dbName);

    const filters = req.query;
    const selectedColor = filters.color; // Get the selected color
    const selectedSize = filters.size; // Get the selected size

    console.log('selectedColor:', selectedColor);
    console.log('selectedSize:', selectedSize);

    const pipeline = [
        // Match documents based on selected filters
        {
          $match: buildFilterQuery(filters),
        },
        // Unwind the color array to create a separate document for each color
        {
          $unwind: '$color',
        },
        // Match documents with the selected color
        {
          $match: {
            'color.name': filters.color,
          },
        },
      ];
      
      

    const results = await db.collection(collectionName).aggregate(pipeline).toArray();

    res.status(200).json({ results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.close();
  }
}

// Helper function to build the filter query
function buildFilterQuery(filters) {
  const filterQuery = {};

  if (filters.color && filters.color.name) {
    filterQuery["color.name"] = filters.color.name;
  }
  

  if (filters.size) {
    filterQuery.size = filters.size;
  }

  return filterQuery;
}
