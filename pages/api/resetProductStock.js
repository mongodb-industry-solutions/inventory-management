import clientPromise from '../../lib/mongodb';

export default async (req, res) => {
    try {
        const client = await clientPromise;
        const { ObjectId } = require('mongodb');
        const db = client.db("interns_mongo_retail");

        const productIdList  = req.body;

        if (!Array.isArray(productIdList)) {
            console.log("productIds should be an array");
          }

        const xsStock = [
            {"location": "store","amount": 15,"threshold": 10,"target": 20},
            {"location": "ordered","amount": 0},
            {"location": "warehouse","amount": 80}
          ];
        const sStock = [
            {"location": "store","amount": 10,"threshold": 10,"target": 20},
            {"location": "ordered","amount": 0},
            {"location": "warehouse","amount": 80}
        ];
        const mStock = [
            {"location": "store","amount": 5,"threshold": 10,"target": 20},
            {"location": "ordered","amount": 0},
            {"location": "warehouse","amount": 80}
        ];
        const lStock = [
            {"location": "store","amount": 10,"threshold": 10,"target": 20},
            {"location": "ordered","amount": 0},
            {"location": "warehouse","amount": 80}
        ];
        const xlStock = [
            {"location": "store","amount": 15,"threshold": 10,"target": 20},
            {"location": "ordered","amount": 0},
            {"location": "warehouse","amount": 80}
        ];
        const totalStock = [
            {"location": "store","amount": 55,"threshold": 50,"target": 100},
            {"location": "ordered","amount": 0},
            {"location": "warehouse","amount": 400}
        ];
        const updatePromises = productIdList.map(async (productId) => {
            const result =  db.collection("products").updateOne(
                {
                    "_id": new ObjectId(productId)
                },
                {
                    $set: {
                        "items.$[xs].stock": xsStock,
                        "items.$[s].stock": sStock,
                        "items.$[m].stock": mStock,
                        "items.$[l].stock": lStock,
                        "items.$[xl].stock": xlStock,
                        "total_stock_sum": totalStock
                    }
                },
                {
                    arrayFilters: [
                        { "xs.size": "XS" },
                        { "s.size": "S" },
                        { "m.size": "M" },
                        { "l.size": "L" },
                        { "xl.size": "XL" }
                    ]
                }
            );
            return result;
        });

        const updateResults = await Promise.all(updatePromises);
        res.status(200).json({ success: true , updatedCount: updateResults.length });
    }
    catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Error reseting stock' });
    }
};