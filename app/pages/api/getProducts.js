import getMongoClientPromise from "../../lib/mongodb";
import retail from "../../config/retail";
import manufacturing from "../../config/manufacturing";
import { resolveIndustryFromRequest } from "../../lib/industryConfig";
import { ObjectId } from "mongodb";

let client = null;

export default async (req, res) => {
  try {
    const industry = resolveIndustryFromRequest(req);
    const dbName = (industry === "manufacturing" ? manufacturing : retail)
      .mongodbDatabaseName;

    if (!client) {
      client = await getMongoClientPromise();
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
