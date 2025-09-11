import getMongoClientPromise from "../../lib/mongodb";
import retail from "../../config/retail";
import manufacturing from "../../config/manufacturing";
import { resolveIndustryFromRequest } from "../../lib/industryConfig";

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

    const users = await db.collection("users").find({}).toArray();

    res.status(200).json({ documents: users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error fetching users" });
  }
};
