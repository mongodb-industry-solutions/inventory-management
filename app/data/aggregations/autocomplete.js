import { ObjectId } from "mongodb";
export const autocompleteProductsPipeline = (searchQuery, location) => {
  const pipeline = [
    {
      $search: {
        index: "default",
        compound: {
          must: [
            {
              text: {
                query: searchQuery,
                path: {
                  wildcard: "*",
                },
                fuzzy: {
                  maxEdits: 2, // Adjust the number of maximum edits for typo-tolerance
                },
              },
            },
          ],
          filter: [],
        },
      },
    },
    {
      $limit: 5, // Limit the number of autocomplete suggestions
    },
    {
      $project: {
        suggestion: { $concat: ["$name", " - ", "$code"] }, // Concatenate name and code for the suggestion
        _id: 0,
      },
    },
    {
      $group: {
        _id: null,
        suggestions: {
          $addToSet: "$suggestion",
        },
      },
    },
  ];

  if (location) {
    pipeline[0].$search.compound.filter.push({
      equals: {
        path: "total_stock_sum.location.id",
        value: ObjectId.createFromHexString(location),
      },
    });
  }

  return pipeline;
};

export const autocompleteTransactionsPipeline = (searchQuery) => {
  const pipeline = [
    {
      $match: {
        $or: [
          { "items.product.name": { $regex: searchQuery, $options: "i" } }, // Search by product names
          { "items.sku": { $regex: searchQuery, $options: "i" } }, // Search by SKUs
        ],
      },
    },
    {
      $unwind: "$items", // Unwind the "items" array
    },
    {
      $project: {
        suggestion: {
          $concat: [
            "$items.product.name",
            { $cond: [{ $ne: ["$items.product.name", null] }, " - ", ""] },
            { $ifNull: ["$items.sku", ""] },
          ],
        },
      },
    },
    {
      $match: {
        suggestion: { $regex: searchQuery, $options: "i" }, // Perform case-insensitive search
      },
    },
    {
      $group: {
        _id: "$suggestion", // Group by the suggestion field to remove duplicates
      },
    },
    {
      $project: {
        _id: 0,
        suggestion: "$_id", // Rename the _id field to suggestion
      },
    },
    {
      $limit: 5, // Limit the number of autocomplete suggestions
    },
    {
      $group: {
        _id: null,
        suggestions: {
          $addToSet: "$suggestion",
        },
      },
    },
  ];

  return pipeline;
};
