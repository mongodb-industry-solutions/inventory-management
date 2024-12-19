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
    if (transaction.location.origin?.id)
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

    // Deduplicate items to avoid redundant updates
    const uniqueItems = transaction.items.reduce((acc, item) => {
      const exists = acc.find(
        (i) =>
          i.sku === item.sku && i.product.id.equals(item.product.id)
      );
      if (!exists) acc.push(item);
      return acc;
    }, []);

    console.log('Deduplicated items:', uniqueItems);

    // Update warehouse stock and increment ordered amount
    for (const item of uniqueItems) {
      const productID = item.product.id;
      const sku = item.sku;
      const amount = parseInt(item.amount, 10);

      console.log(
        `Processing stock update for SKU: ${sku}, Amount: ${amount}`
      );

      // Decrement warehouse stock and increment ordered amount
      const updateResult = await db.collection('products').updateOne(
        { _id: productID },
        {
          $inc: {
            'items.$[i].stock.$[warehouse].amount': -amount, // Decrement warehouse stock
            'items.$[i].stock.$[store].ordered': amount, // Increment store ordered amount
            'total_stock_sum.$[warehouse].amount': -amount, // Update total warehouse stock
            'total_stock_sum.$[store].ordered': amount, // Increment total ordered stock
          },
        },
        {
          arrayFilters: [
            { 'i.sku': sku },
            { 'warehouse.location.type': 'warehouse' },
            {
              'store.location.id':
                transaction.location.destination.id,
            },
          ],
        }
      );

      console.log('Stock update result:', {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
        acknowledged: updateResult.acknowledged,
      });

      if (updateResult.modifiedCount === 0) {
        console.warn(
          `No stock updates applied for SKU: ${sku}. Check filters or data integrity.`
        );
      }
    }

    console.log('Stock updates completed.');
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
