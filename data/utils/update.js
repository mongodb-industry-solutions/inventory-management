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

/* Update stock values */

db.orders.aggregate([
  {
    $match:
      /**
       * query: The query in MQL.
       */
      {
        $expr: {
          $gte: [
            "$placement_timestamp",
            {
              $dateSubtract: {
                startDate: new ISODate(),
                unit: "day",
                amount: 1,
              },
            },
          ],
        },
      },
  },
  {
    $unwind:
      /**
       * path: Path to the array field.
       * includeArrayIndex: Optional name for index.
       * preserveNullAndEmptyArrays: Optional
       *   toggle to unwind null and empty values.
       */
      {
        path: "$items",
      },
  },
  {
    $lookup:
      /**
       * from: The target collection.
       * localField: The local join field.
       * foreignField: The target join field.
       * as: The name for the results.
       * pipeline: Optional pipeline to run on the foreign collection.
       * let: Optional variables to use in the pipeline field stages.
       */
      {
        from: "products",
        localField: "items.product.id",
        foreignField: "_id",
        as: "result",
      },
  },
  {
    $project:
      /**
       * specifications: The fields to
       *   include or exclude.
       */
      {
        amount: "$items.amount",
        sku: "$items.sku",
        product_id: "$items.product.id",
        product_name: "$items.product.name",
        placement_timestamp: 1,
        product: {
          $arrayElemAt: ["$result", 0],
        },
      },
  },
  {
    $project:
      /**
       * specifications: The fields to
       *   include or exclude.
       */
      {
        amount: 1,
        sku: 1,
        placement_timestamp: 1,
        product_id: 1,
        product_name: 1,
        product_current_stock: {
          $arrayElemAt: [
            {
              $filter: {
                input: "$product.total_stock_sum",
                as: "totalStock",
                cond: {
                  $eq: [
                    "$$totalStock.location",
                    "store",
                  ],
                },
              },
            },
            0,
          ],
        },
      },
  },
  {
    $project:
      /**
       * specifications: The fields to
       *   include or exclude.
       */
      {
        amount: 1,
        sku: 1,
        product_id: 1,
        product_name: 1,
        placement_hour: {
          $dateTrunc: {
            date: "$placement_timestamp",
            unit: "hour",
          },
        },
        product_current_stock_amount:
          "$product_current_stock.amount",
        product_current_stock_threshold:
          "$product_current_stock.threshold",
        product_current_stock_target:
          "$product_current_stock.target",
      },
  },
  {
    $group:
      /**
       * _id: The id of the group.
       * fieldN: The first field name.
       */
      {
        _id: {
          placement_hour: "$placement_hour",
          product_id: "$product_id",
          product_name: "$product_name",
        },
        amount: {
          $sum: "$amount",
        },
        product_current_stock_amount: {
          $first: "$product_current_stock_amount",
        },
        product_current_stock_threshold: {
          $first:
            "$product_current_stock_threshold",
        },
        product_current_stock_target: {
          $first: "$product_current_stock_target",
        },
      },
  },
  {
    $project:
      /**
       * specifications: The fields to
       *   include or exclude.
       */
      {
        _id: 0,
        product_id: "$_id.product_id",
        product_name: "$_id.product_name",
        placement_hour: "$_id.placement_hour",
        amount: 1,
        product_current_stock_amount: 1,
        product_current_stock_threshold: 1,
        product_current_stock_target: 1,
      },
  },
  {
    $setWindowFields:
      /**
       * partitionBy: partitioning of data.
       * sortBy: fields to sort by.
       * output: {
       *   path: {
       *     function: The window function to compute over the given window.
       *     window: {
       *       documents: A number of documents before and after the current document.
       *       range: A range of possible values around the value in the current document's sortBy field.
       *       unit: Specifies the units for the window bounds.
       *     }
       *   }
       * }
       */
      {
        partitionBy: "product_id",
        sortBy: {
          placement_hour: -1,
        },
        output: {
          runningTotal: {
            $sum: "$amount",
            window: {
              documents: ["unbounded", "current"],
            },
          },
        },
      },
  },
  {
    $project:
      /**
       * specifications: The fields to
       *   include or exclude.
       */
      {
        "items.product.id": "$product_id",
        "items.product.name": "$product_name",
        placement_hour: 1,
        amount: 1,
        runningTotal: 1,
        product_current_stock_amount: 1,
        product_current_stock_threshold: 1,
        product_current_stock_target: 1,
        stock: {
          $subtract: [
            "$product_current_stock_amount",
            "$runningTotal",
          ],
        },
      },
  },
  {
    $out:
      /**
       * Provide the name of the output collection.
       */
      "stocks",
  },
])