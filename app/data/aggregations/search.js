export const searchProductsPipeline = (searchQuery, location) => {

    const pipeline = [
      {
        $search: {
          index: 'default',
          text: {
            query: searchQuery,
            path: {
              wildcard: '*',
            },
            fuzzy: {
              maxEdits: 2, // Adjust the number of maximum edits for typo-tolerance
            },
          },
        },
      },
      { $limit: 20 },
    ];

    // display product area view if no location
    if (location == null) {
      pipeline.push(
        {
          $lookup: {
              from: "products_area_view",
              localField: "_id",
              foreignField: "_id",
              as: "result",
            },
        },
        {
          $set: {
              result: {
                $arrayElemAt: ["$result", 0],
              },
            },
        },
        {
          $replaceRoot: {
              newRoot: "$result",
            },
        },
      );
    }
  
    return pipeline;
  };

  export const searchTransactionsPipeline = (searchQuery, location, type) => {

    const pipeline = [
        {
          $search: {
            index: 'default',
            compound: {
              should: [
                {
                  text: {
                    query: searchQuery,
                    path: {
                      wildcard: '*',
                    },
                    fuzzy: {
                      maxEdits: 2, // Adjust the number of maximum edits for typo-tolerance
                      },
                  },
                }
              ],
              filter: [
                {
                  text: {
                    query: type,
                    path: "type"
                  },
                }
              ]
            },
            
          },
        },{
          '$unwind': {
            'path': '$items'
          }
        },
        { $limit: 20 }
      ];

      if (location !== null) {
        pipeline[0].$search.compound.filter.push({
          equals: {
            value: {$oid: location},
            path: type == "inbound" ?  "location.destination.id" :  "location.origin.id"
          }
        });
      }
  
    return pipeline;
  };