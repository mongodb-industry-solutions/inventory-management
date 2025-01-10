import { clientPromise } from "../../lib/mongodb";
import { ObjectId } from "mongodb";

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

    const id = req.query.id;
    const location = req.query.location;

    // Use the direct _id filter for product
    let productFilter = id
      ? { _id: ObjectId.createFromHexString(id) } // Query directly by _id
      : {};
    let locationFilter = location
      ? { "location.destination.id": ObjectId.createFromHexString(location) }
      : {};

    const products = await db
      .collection("products")
      .find({ $and: [productFilter, locationFilter] })
      .toArray();

    console.log("API Response - Products fetched:", products);

    // Ensure products array is always returned
    res.status(200).json({ products: products || [] });
  } catch (e) {
    console.error("Error fetching products:", e);
    res.status(500).json({ error: "Error fetching products" });
  }
};
