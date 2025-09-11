import getMongoClientPromise from "../../lib/mongodb";
import {
  autocompleteProductsPipeline,
  autocompleteTransactionsPipeline,
} from "../../data/aggregations/autocomplete";

let client = null;

export default async (req, res) => {
  try {
    if (!process.env.MONGODB_DATABASE_NAME) {
      throw new Error(
        'Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"'
      );
    }

    const dbName = process.env.MONGODB_DATABASE_NAME;
    if (!client) {
      client = await getMongoClientPromise();
    }
    const db = client.db(dbName);

    const { collection, type, industry, location } = req.query;
    const searchQuery = req.body;

    if (!collection || !searchQuery) {
      return res
        .status(400)
        .json({ error: "Collection and search query are required" });
    }

    let result = [];

    if (collection === "products") {
      // Use the pre-defined aggregation pipeline for products
      const pipeline = autocompleteProductsPipeline(searchQuery, location);
      const response = await db
        .collection(collection)
        .aggregate(pipeline)
        .toArray();

      if (response.length > 0) {
        result = response;
      }
    } else if (collection === "transactions") {
      // Use the pre-defined aggregation pipeline for transactions
      const pipeline = autocompleteTransactionsPipeline(searchQuery);
      const response = await db
        .collection(collection)
        .aggregate(pipeline)
        .toArray();

      if (response.length > 0) {
        result = response;
      }
    }

    res.status(200).json({ documents: result });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error searching" });
  }
};
