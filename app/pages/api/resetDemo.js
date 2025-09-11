import getMongoClientPromise from "../../lib/mongodb";
import retail from "../../config/retail";
import manufacturing from "../../config/manufacturing";
import { resolveIndustryFromRequest } from "../../lib/industryConfig";
import fs from "fs";
import path from "path";
import { EJSON } from "bson";

export default async (req, res) => {
  try {
    const industryParam = (
      req.query.industry ||
      req.body?.industry ||
      ""
    ).toString();
    const fallback = resolveIndustryFromRequest(req);
    const industry =
      industryParam === "manufacturing" || industryParam === "retail"
        ? industryParam
        : fallback;
    const dbName =
      industry === "manufacturing"
        ? manufacturing.mongodbDatabaseName
        : retail.mongodbDatabaseName;
    const client = await getMongoClientPromise();
    const db = client.db(dbName);

    const fileName = `./data/${industry}/products.json`;

    const filePath = path.resolve(process.cwd(), fileName);
    const rawData = fs.readFileSync(filePath);
    const newData = EJSON.parse(rawData);
    //console.log(newData);

    await db.collection("products").deleteMany({});

    await db.collection("products").insertMany(newData);

    console.log("Demo reset complete.");
    res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error reseting stock" });
  }
};
