import { clientPromise } from '../../lib/mongodb';
import { ObjectId } from 'bson';

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

    let productFilter = id
      ? { 'items.product.id': new ObjectId(id) }
      : {};
    let locationFilter = location
      ? { 'location.destination.id': new ObjectId(location) }
      : {};

    const products = await db
      .collection('products')
      .find({ $and: [productFilter, locationFilter] })
      .toArray();
    // Log the fetched products for debugging
    console.log('API Response - Products fetched:', products);

    res.status(200).json({ products });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error fetching products' });
  }
};
