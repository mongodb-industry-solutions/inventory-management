import { clientPromise } from "../../lib/mongodb";
import {
  searchProductsPipeline,
  searchTransactionsPipeline,
} from "../../data/aggregations/search";

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
      client = await clientPromise;
    }
    const db = client.db(dbName);

    // Validate input parameters
    const { collection, type, industry, location } = req.query;
    const searchQuery = req.body;

    if (
      !collection ||
      !searchQuery ||
      typeof searchQuery !== "string" ||
      searchQuery.trim() === ""
    ) {
      return res
        .status(400)
        .json({ error: "Invalid or missing 'collection' or 'searchQuery'" });
    }

    let result = [];

    if (collection === "products") {
      // Use fuzzy search pipeline for products
      const pipeline = searchProductsPipeline(searchQuery.trim(), location);
      result = await db.collection(collection).aggregate(pipeline).toArray();
    } else if (collection === "transactions") {
      // Use fuzzy search pipeline for transactions
      const pipeline = searchTransactionsPipeline(
        searchQuery.trim(),
        location,
        type
      );
      result = await db.collection(collection).aggregate(pipeline).toArray();
    } else {
      return res.status(400).json({ error: "Unsupported collection type" });
    }

    // Respond with the search results
    res.status(200).json({ documents: result });
  } catch (e) {
    console.error("Error in /api/search:", e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
