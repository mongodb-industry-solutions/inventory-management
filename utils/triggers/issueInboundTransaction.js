exports = async function (changeEvent) {
  try {
    // Define constants
    const serviceName = "mongodb-atlas";
    const dbName = "inventory_management_demo"; // Update with your database name
    const transactionId = changeEvent.fullDocument._id;

    const client = context.services.get(serviceName);
    const transactions = client.db(dbName).collection("transactions");
    const counters = client.db(dbName).collection("counters");

    // Update the counter
    const counter = await counters.findOneAndUpdate(
      { _id: changeEvent.ns },
      { $inc: { seq_value: 1 } },
      { returnNewDocument: true, upsert: true }
    );

    // Update the transaction document with the new transaction number
    await transactions.updateOne(
      { _id: transactionId },
      { $set: { transaction_number: counter.seq_value } }
    );

    // If the transaction type is "inbound", simulate item delivery
    if (changeEvent.fullDocument.type === "inbound") {
      const fetchPromises = [];
      for (const item of changeEvent.fullDocument.items) {
        // Prevent re-processing already-delivered items
        if (!item.status.some((s) => s.name === "arrived")) {
          fetchPromises.push(
            simulateItemDelivery(item, changeEvent.fullDocument._id)
          );
        }
      }
      await Promise.all(fetchPromises);
    }
  } catch (err) {
    console.log(err.message);
  }

  // Helper function to simulate item delivery
  async function simulateItemDelivery(item, transactionId) {
    try {
      const client = context.services.get(serviceName);
      const transactions = client.db(dbName).collection("transactions");

      const sku = item.sku;

      // Check if the item has already been delivered
      const transaction = await transactions.findOne(
        { _id: transactionId },
        { projection: { "items.$": 1 } }
      );

      const itemStatus = transaction?.items[0]?.status || [];
      const alreadyDelivered = itemStatus.some((s) => s.name === "arrived");

      if (alreadyDelivered) {
        console.log(`${sku} already marked as arrived. Skipping...`);
        return;
      }

      // Simulate delivery delay
      if (item.delivery_time.unit === "seconds") {
        await new Promise((r) =>
          setTimeout(r, item.delivery_time.amount * 1000)
        );

        const status = {
          name: "arrived",
          update_timestamp: new Date(),
        };

        // Update status in the transaction document
        await transactions.updateOne(
          { _id: transactionId },
          {
            $push: { "items.$[i].status": status },
          },
          {
            arrayFilters: [{ "i.sku": sku }],
          }
        );

        console.log(`${sku} marked as arrived.`);
      } else {
        throw new Error("Error: Unsupported time unit.");
      }
    } catch (error) {
      console.log(`Error in simulateItemDelivery: ${error.message}`);
    }
  }
};
