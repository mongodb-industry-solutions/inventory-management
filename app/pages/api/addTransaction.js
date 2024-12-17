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

    const transaction = req.body;

    const placementTimestamp = new Date();

    const status = {
      name: transaction.type === 'inbound' ? 'placed' : 'picked',
      update_timestamp: placementTimestamp,
    };

    // Prepare transaction object
    transaction.placement_timestamp = placementTimestamp;
    transaction.items.forEach((item) => item.status.push(status));
    transaction.items.forEach(
      (item) => (item.product.id = new ObjectId(item.product.id))
    );
    if (transaction.user_id)
      transaction.user_id = new ObjectId(transaction.user_id);
    if (transaction.location.destination.id)
      transaction.location.destination.id = new ObjectId(
        transaction.location.destination.id
      );
    if (transaction.location.origin.id)
      transaction.location.origin.id = new ObjectId(
        transaction.location.origin.id
      );

    console.log('Starting transaction insertion...');
    const insertTransactionResponse = await db
      .collection('transactions')
      .insertOne(transaction);
    console.log('Transaction successfully inserted:', {
      transactionId: insertTransactionResponse.insertedId,
    });

    console.log('Transaction successfully committed.');

    // Respond to the client
    res.status(200).json({
      success: true,
      transactionId: insertTransactionResponse.insertedId,
    });
  } catch (e) {
    console.error('Error adding transaction:', e);
    res.status(500).json({ error: 'Error adding transaction' });
  }
};
