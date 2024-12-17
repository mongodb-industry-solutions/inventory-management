import { clientPromise } from "../../../lib/mongodb";

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

    const users = await db.collection("users").find({}).toArray();

    res.status(200).json({ documents: users });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error fetching users" });
  }
};
