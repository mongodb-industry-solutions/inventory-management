/* Add target field to product.items.stock where product.items.stock.location=store */
db.products.updateMany(
    {
      "items.stock.location": "store"
    },
    {
      $set: {
        "items.$[i].stock.$[j].target": 20,
        "total_stock_sum.$[k].target": 100
      }
    },
    {
      arrayFilters: [
        { "i.stock.location": "store" },
        { "j.location": "store" },
        { "k.location": "store" }
      ]
    }
  );

/*Change field data type from string to Date*/ 
db.orders.updateOne(
  { _id: ObjectId("64bf8a9792cab4ad67c10b17") },
  [
    { 
      $set: {
        placement_timestamp: {
          $dateFromString: { dateString: "$placement_timestamp" }
        }
      } 
    }
  ]
)

db.orders.updateMany(
  {
    placement_timestamp: { $type: "string" }
  },
  [
    { 
      $set: {
        placement_timestamp: {
          $dateFromString: { dateString: "$placement_timestamp" }
        }
      } 
    }
  ]
)