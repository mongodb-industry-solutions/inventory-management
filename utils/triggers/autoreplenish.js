exports = async function (changeEvent) {
  try {
    const serviceName = "mongodb-atlas";
    const dbName = "inventory_management_demo"; // Update with your database name
    const client = context.services.get(serviceName);
    const locations = client.db(dbName).collection("locations");
    const transactions = client.db(dbName).collection("transactions");
    const products = client.db(dbName).collection("products");

    const product = changeEvent.fullDocument;
    const prevProduct = changeEvent.fullDocumentBeforeChange;

    const pattern = /^items\.(\d+)\.stock\.(\d+)/;

    for (const key of Object.keys(
      changeEvent.updateDescription.updatedFields
    )) {
      if (pattern.test(key)) {
        let item = product.items[parseInt(key.match(pattern)[1], 10)];
        let itemStock = item.stock[parseInt(key.match(pattern)[2], 10)];
        let locationId = String(itemStock.location.id);
        let itemBeforeChange =
          prevProduct.items[parseInt(key.match(pattern)[1], 10)];
        let itemBeforeChangeStock = itemBeforeChange.stock.find(
          (stock) => String(stock.location.id) === locationId
        );

        if (
          itemStock.amount < itemStock.threshold &&
          itemStock.amount < itemBeforeChangeStock.amount
        ) {
          // Check for existing replenishment transactions
          const existingOrder = await transactions.findOne({
            "items.product.id": product._id,
            "items.sku": item.sku,
            "location.destination.id": locationId,
            type: "inbound",
            automatic: true,
          });

          if (!existingOrder) {
            const replenishAmount = parseInt(
              itemStock.target - itemStock.amount,
              10
            );
            const location = await locations.findOne({
              _id: new BSON.ObjectId(locationId),
            });

            const transaction = {
              type: "inbound",
              location: {
                origin: { type: "warehouse" },
                destination: {
                  type: location.type,
                  id: location._id,
                  name: location.name,
                  area_code: location.area_code,
                },
              },
              placement_timestamp: new Date(),
              items: [
                {
                  ...item,
                  amount: replenishAmount,
                  product: {
                    id: product._id,
                    name: product.name,
                    ...(product.color && { color: product.color }),
                    ...(product.image && { image: product.image }),
                  },
                },
              ],
              automatic: true,
            };

            await addTransaction({
              body: { text: () => JSON.stringify(transaction) },
            });
            console.log(
              `Replenished ${replenishAmount} units for item ${item.sku}`
            );
          } else {
            console.log(
              `Replenishment already in progress for item ${item.sku}`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in replenishment trigger:", error);
  }

  async function addTransaction(request, response) {
    try {
      if (request.body === undefined) {
        throw new Error(`Request body was not defined.`);
      }

      const transaction = JSON.parse(request.body.text());

      const placementTimestamp = new Date();

      const status = {
        name: transaction.type === "inbound" ? "placed" : "picked",
        update_timestamp: placementTimestamp,
      };

      transaction.placement_timestamp = placementTimestamp;
      transaction.items.forEach((item) => item.status.push(status));
      transaction.items.forEach(
        (item) => (item.product.id = new BSON.ObjectId(item.product.id))
      );
      if (transaction.user_id)
        transaction.user_id = new BSON.ObjectId(transaction.user_id);
      if (transaction.location.destination.id)
        transaction.location.destination.id = new BSON.ObjectId(
          transaction.location.destination.id
        );
      if (transaction.location.origin.id)
        transaction.location.origin.id = new BSON.ObjectId(
          transaction.location.origin.id
        );

      let insertTransactionResponse = null;

      const transactionOptions = {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
      };

      const session = client.startSession();

      try {
        session.startTransaction(transactionOptions);

        insertTransactionResponse = await transactions.insertOne(transaction, {
          session,
        });

        for (let i = 0; i < transaction.items.length; i++) {
          let item = transaction.items[i];
          let sku = item.sku;
          let amount = parseInt(item.amount, 10);

          if (transaction.type === "inbound") {
            await products.updateOne(
              {
                _id: item.product.id,
              },
              {
                $inc: {
                  "items.$[i].stock.$[j].amount": -amount,
                  "items.$[i].stock.$[k].ordered": amount,
                  "total_stock_sum.$[j].amount": -amount,
                  "total_stock_sum.$[k].ordered": amount,
                },
              },
              {
                arrayFilters: [
                  { "i.sku": sku },
                  { "j.location.type": "warehouse" },
                  { "k.location.id": transaction.location.destination.id },
                ],
                session,
              }
            );
          } else {
            await products.updateOne(
              {
                _id: item.product.id,
              },
              {
                $inc: {
                  "items.$[i].stock.$[j].amount": amount,
                  "total_stock_sum.$[j].amount": amount,
                },
              },
              {
                arrayFilters: [
                  { "i.sku": sku },
                  { "j.location.id": transaction.location.origin.id },
                ],
                session,
              }
            );
          }
        }
        await session.commitTransaction();
        console.log("Transaction successfully committed.");
        if (response) {
          response.setStatusCode(200);
          response.setBody(
            JSON.stringify({
              success: true,
            })
          );
        }
      } catch (error) {
        console.log(
          "An error occurred in the transaction, performing a data rollback:" +
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
    } catch (error) {
      console.log(error);
      if (response) {
        response.setStatusCode(500);
        response.setBody(JSON.stringify(error.message));
      }
    }
  }
};
