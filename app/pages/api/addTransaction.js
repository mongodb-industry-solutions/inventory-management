import getMongoClientPromise from "../../lib/mongodb";
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
      client = await getMongoClientPromise();
    }
    const db = client.db(dbName);

    const transaction = req.body;

    const placementTimestamp = new Date();

    const status = {
      name: transaction.type === "inbound" ? "placed" : "picked",
      update_timestamp: placementTimestamp,
    };

    // Prepare transaction object
    transaction.placement_timestamp = placementTimestamp;
    transaction.items.forEach((item) => item.status.push(status));
    transaction.items.forEach(
      (item) =>
        (item.product.id = ObjectId.createFromHexString(item.product.id))
    );
    if (transaction.user_id)
      transaction.user_id = ObjectId.createFromHexString(transaction.user_id);
    if (transaction.location.destination.id)
      transaction.location.destination.id = ObjectId.createFromHexString(
        transaction.location.destination.id
      );
    if (transaction.location.origin?.id)
      transaction.location.origin.id = ObjectId.createFromHexString(
        transaction.location.origin.id
      );
    const transactionOptions = {
      readConcern: { level: "snapshot" },
      writeConcern: { w: "majority" },
      readPreference: "primary",
    };

    const session = client.startSession();

    try {
      session.startTransaction(transactionOptions);

      console.log("Starting transaction insertion...");
      const insertTransactionResponse = await db
        .collection("transactions")
        .insertOne(transaction, { session });

      // Deduplicate items to avoid redundant updates
      const uniqueItems = transaction.items.reduce((acc, item) => {
        const exists = acc.find(
          (i) => i.sku === item.sku && i.product.id.equals(item.product.id)
        );
        if (!exists) acc.push(item);
        return acc;
      }, []);

      //console.log("Deduplicated items:", uniqueItems);

      // Update warehouse stock and increment ordered amount
      for (const item of uniqueItems) {
        const productID = item.product.id;
        const sku = item.sku;
        const amount = parseInt(item.amount, 10);

        console.log(
          `Processing stock update for SKU: ${sku}, Amount: ${amount}`
        );

        if (transaction.type === "inbound") {
          // Decrement warehouse stock and increment ordered amount
          await db.collection("products").updateOne(
            { _id: productID },
            {
              $inc: {
                "items.$[i].stock.$[j].amount": -amount, // Decrement warehouse stock
                "items.$[i].stock.$[k].ordered": amount, // Increment destination ordered amount
                "total_stock_sum.$[j].amount": -amount, // Update total warehouse stock
                "total_stock_sum.$[k].ordered": amount, // Increment total ordered stock
              },
            },
            {
              arrayFilters: [
                { "i.sku": sku },
                { "j.location.type": "warehouse" },
                {
                  "k.location.id": transaction.location.destination.id,
                },
              ],
              session,
            }
          );
        } else {
          await db.collection("products").updateOne(
            { _id: productID },
            {
              $inc: {
                "items.$[i].stock.$[j].amount": amount, // Increment store ordered amount
                "total_stock_sum.$[j].amount": amount, // Increment total ordered stock
              },
            },
            {
              arrayFilters: [
                { "i.sku": sku },
                {
                  "j.location.id": transaction.location.origin.id,
                },
              ],
              session,
            }
          );
        }
      }
      await session.commitTransaction();
      console.log("ACID transaction successfully committed.");

      // Respond to the client
      res.status(200).json({
        success: true,
        transactionId: insertTransactionResponse.insertedId,
      });
    } catch (error) {
      console.log(
        "An error occured in the ACID transaction, performing a data rollback:" +
          error
      );
      await session.abortTransaction();
      if (response) {
        response.setStatusCode(500);
        response.setBody(JSON.stringify(error.message));
      }
    } finally {
      await session.endSession();
    }
  } catch (e) {
    console.error("Error adding ACID transaction:", e);
    res.status(500).json({ error: "Error adding ACID transaction" });
  }
};
