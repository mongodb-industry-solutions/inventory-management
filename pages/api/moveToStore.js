import clientPromise from '../../lib/mongodb';

export default async (req, res) => {
    try {
        const client = await clientPromise;
        const { ObjectId } = require('mongodb');
        const db = client.db("interns_mongo_retail");

        const { item } = req.body;
        const orderID = req.query.order_id;
        
        const productID = item.product.id.$oid;
        const sku = item.sku;
        const amount = item.amount;

        if(item.delivery_time.unit === 'seconds'){
            await new Promise(r => setTimeout(r, item.delivery_time.amount * 1000));

            const status = {
                name: 'arrived',
                update_timestamp: new Date().toISOString()
            };

                await db.collection("products").updateOne(
                    {
                        "_id": new ObjectId(productID)
                    },
                    {
                    $inc: {
                        "items.$[i].stock.$[j].amount": -amount,
                        "items.$[i].stock.$[k].amount": amount,
                        "total_stock_sum.$[j].amount": -amount,
                        "total_stock_sum.$[k].amount": amount
                    }
                    },
                    {
                        arrayFilters: [
                            { "i.sku": sku },
                            { "j.location": "ordered" },
                            { "k.location": "store" }
                        ]
                    }
                );

                await db.collection("orders").updateOne(
                    {
                        "_id": new ObjectId(orderID)
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