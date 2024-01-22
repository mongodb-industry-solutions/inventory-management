import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async (req, res) => {
    try {

        if (!process.env.MONGODB_DATABASE_NAME) {
            throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
        }

        const dbName = process.env.MONGODB_DATABASE_NAME;
        const client = await clientPromise;
        const db = client.db(dbName);

        const { item } = req.body;
        const orderId = req.query.order_id;
        
        const productID = item.product.id;
        const sku = item.sku;
        const amount = item.amount;

        const order = await db
            .collection("orders")
            .findOne(
                { _id: ObjectId(orderId)},
                { projection: { "location.destination._id": 1 } }
            );
        const storeId = new ObjectId(order.location.destination._id);

        if(item.delivery_time.unit === 'seconds'){
            await new Promise(r => setTimeout(r, item.delivery_time.amount * 1000));

            const status = {
                name: 'arrived',
                update_timestamp: new Date()
            };

                await db.collection("products").updateOne(
                    {
                        "_id": new ObjectId(productID)
                    },
                    {
                    $inc: {
                        "items.$[i].stock.$[j].ordered": -amount,
                        "items.$[i].stock.$[j].amount": amount,
                        "total_stock_sum.$[j].ordered": -amount,
                        "total_stock_sum.$[j].amount": amount
                    }
                    },
                    {
                        arrayFilters: [
                            { "i.sku": sku },
                            { "j.location.id": storeId }
                        ]
                    }
                );

                await db.collection("orders").updateOne(
                    {
                        "_id": new ObjectId(orderId)
                    },
                    {
                        $push: { "items.$[i].status": status }
                    },
                    {
                        arrayFilters: [
                            { "i.sku": sku }
                        ]
                    }
                );
                
                console.log(item.sku + ' moved to store successfully.');
        }
        else {
            console.log('Error: time units not supported');
        }
       
        res.status(200).json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error creating order' });
    }
 };