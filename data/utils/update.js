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