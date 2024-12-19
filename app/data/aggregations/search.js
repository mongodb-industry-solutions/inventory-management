/**
 * Generates a search pipeline for products
 * @param {string} searchQuery - The search term to query
 * @param {string} location - The location ID to filter by (optional)
 * @returns {Array} - Aggregation pipeline for searching products
 */
export const searchProductsPipeline = (searchQuery, location) => {
  if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim() === '') {
    throw new Error("'searchQuery' must be a non-empty string");
  }

  const pipeline = [
    {
      $search: {
        index: 'default',
        compound: {
          must: [
            {
              text: {
                query: searchQuery.trim(),
                path: {
                  wildcard: '*', // Search across all fields
                },
                fuzzy: {
                  maxEdits: 2, // Allows minor typos
                },
              },
            },
          ],
          filter: [], // Dynamic filters will be added here
        },
      },
    },
    { $limit: 20 }, // Limit the number of results to improve performance
  ];

  if (location) {
    pipeline[0].$search.compound.filter.push({
      equals: {
        path: 'total_stock_sum.location.id',
        value: { $oid: location }, // Filter by specific location
      },
    });
  } else {
    // If no location, include additional product area view transformations
    pipeline.push(
      {
        $lookup: {
          from: 'products_area_view',
          localField: '_id',
          foreignField: '_id',
          as: 'result',
        },
      },
      {
        $set: {
          result: { $arrayElemAt: ['$result', 0] }, // Extract the first matching document
        },
      },
      {
        $replaceRoot: { newRoot: '$result' }, // Replace the root document with the result
      }
    );
  }

  return pipeline;
};

/**
 * Generates a search pipeline for transactions
 * @param {string} searchQuery - The search term to query
 * @param {string} location - The location ID to filter by (optional)
 * @param {string} type - The type of transaction (e.g., 'inbound', 'outbound')
 * @returns {Array} - Aggregation pipeline for searching transactions
 */
export const searchTransactionsPipeline = (searchQuery, location, type) => {
  if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim() === '') {
    throw new Error("'searchQuery' must be a non-empty string");
  }

  const pipeline = [
    {
      $search: {
        index: 'default',
        compound: {
          should: [
            {
              text: {
                query: searchQuery.trim(),
                path: {
                  wildcard: '*', // Search across all fields
                },
                fuzzy: {
                  maxEdits: 2, // Allows minor typos
                },
              },
            },
          ],
          filter: [
            ...(type
              ? [
                  {
                    text: {
                      query: type, // Filter by transaction type
                      path: 'type',
                    },
                  },
                ]
              : []), // Add filter only if type is provided
          ],
        },
      },
    },
    {
      $unwind: {
        path: '$items', // Unwind items array for detailed processing
      },
    },
    { $limit: 20 }, // Limit the number of results
  ];

  if (location) {
    pipeline[0].$search.compound.filter.push({
      equals: {
        path: type === 'inbound' ? 'location.destination.id' : 'location.origin.id',
        value: { $oid: location }, // Filter by specific location
      },
    });
  }

  return pipeline;
};
