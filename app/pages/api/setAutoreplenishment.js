import getMongoClientPromise from "../../lib/mongodb";
import retail from "../../config/retail";
import manufacturing from "../../config/manufacturing";
import { resolveIndustryFromRequest } from "../../lib/industryConfig";
import { ObjectId } from "mongodb";

let client = null;

export default async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST requests are allowed" });
    }

    const { update, filter, collection } = req.body;

    if (!filter || !update || !collection) {
      return res
        .status(400)
        .json({ error: "Missing required fields in request body" });
    }

    const industry = resolveIndustryFromRequest(req);
    const database = (industry === "manufacturing" ? manufacturing : retail)
      .mongodbDatabaseName;

    if (!client) {
      client = await getMongoClientPromise();
    }
    const db = client.db(database);

    const productId = ObjectId.isValid(filter._id)
      ? ObjectId.createFromHexString(filter._id)
      : filter._id;
    const autoStatus = update.$set.autoreplenishment;

    console.log("Filter:", { _id: productId });
    console.log("Collection:", collection);

    const result = await db
      .collection(collection)
      .updateOne(
        { _id: productId },
        { $set: { autoreplenishment: autoStatus } }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "No matching document found" });
    }

    // Fetch the updated document and return it
    const updatedProduct = await db
      .collection(collection)
      .findOne({ _id: productId });
    console.log("Updated product being returned from API:", updatedProduct);
    res.status(200).json(updatedProduct);
  } catch (e) {
    console.error("Error in setAutoreplenishment API:", e.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
