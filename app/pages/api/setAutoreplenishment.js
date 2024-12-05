import { clientPromise } from "../../lib/mongodb";
import { ObjectId } from "bson";

let client = null;

export default async (req, res) => {
  try {
    // Check if the method is POST
    if (req.method !== "POST") {
      console.error("Invalid HTTP method");
      return res.status(405).json({ error: "Only POST requests are allowed" });
    }

    const { update, filter, collection } = req.body;

    // Validate request body
    if (!filter || !update || !collection) {
      console.error("Missing required fields in request body");
      return res
        .status(400)
        .json({ error: "Missing required fields in request body" });
    }

    // Use database name from the environment file
    const database = process.env.MONGODB_DATABASE_NAME;
    if (!database) {
      console.error("Database name is missing in environment variables");
      return res
        .status(500)
        .json({ error: "Server configuration error: Missing database name" });
    }

    // Connect to MongoDB client
    if (!client) {
      client = await clientPromise;
    }
    const db = client.db(database);

    // Parse filter to ObjectId if applicable
    const productId = new ObjectId(filter._id.$oid);
    const autoStatus = update.$set.autoreplenishment;

    // Perform update operation
    const result = await db.collection(collection).updateOne(
      {
        _id: productId,
      },
      {
        $set: {
          autoreplenishment: autoStatus,
        },
      }
    );

    // Check if the update was successful
    if (result.matchedCount === 0) {
      console.error("No matching document found");
      return res.status(404).json({ error: "No matching document found" });
    }

    res.status(200).json({ success: true });
  } catch (e) {
    // Log any critical errors
    console.error("Error in setAutoreplenishment API:", e.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
