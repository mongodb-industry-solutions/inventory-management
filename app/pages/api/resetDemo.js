import { clientPromise } from "../../lib/mongodb";
import fs from "fs";
import path from "path";
import { EJSON } from "bson";

export default async (req, res) => {
  try {
    if (!process.env.MONGODB_DATABASE_NAME) {
      throw new Error(
        'Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"'
      );
    }

    const dbName = process.env.MONGODB_DATABASE_NAME;
    const industry = process.env.DEMO_INDUSTRY || "retail";
    const client = await clientPromise;
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
