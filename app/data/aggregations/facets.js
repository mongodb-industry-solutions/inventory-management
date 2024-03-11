export const facetsTransactionsPipeline = (industry, type) => {

    const pipeline = [
        {
          $searchMeta: {
            index: "facets",
            facet: {
              facets: {
                productsFacet: { type: "string", path: "items.product.name", numBuckets: 20 },
                itemsFacet: { type: "string", path: "items.name" },
              },
            },
          },
        },
      ];
    /*
    if (industry === 'manufacturing') {
        var facetsManufacturingFilter;

        if ( type === 'inbound') {
            facetsManufacturingFilter = {
                $project: {
                    count: 1,
                    "facet.itemsFacet.buckets": {
                        $filter: {
                        input: "$facet.itemsFacet.buckets",
                        as: "buckets",
                        cond: {
                            $and: [
                            {
                                $ne: [
                                "$$buckets._id",
                                "Portable Air Conditioners",
                                ],
                            },
                            {
                                $ne: [
                                "$$buckets._id",
                                "Central Air Conditioners",
                                ],
                            },
                            ],
                        },
                        },
                    },
                    "facet.productsFacet.buckets": {
                        $filter: {
                        input: "$facet.productsFacet.buckets",
                        as: "buckets",
                        cond: {
                            $ne: [
                            "$$buckets._id",
                            "Finished Goods",
                            ],
                        },
                        },
                    },
                },
            };
        } else {
            facetsManufacturingFilter = {
                $project: {
                    count: 1,
                    "facet.itemsFacet.buckets": {
                        $filter: {
                        input: "$facet.itemsFacet.buckets",
                        as: "buckets",
                        cond: {
                            $or: [
                            {
                                $eq: [
                                "$$buckets._id",
                                "Portable Air Conditioners",
                                ],
                            },
                            {
                                $eq: [
                                "$$buckets._id",
                                "Central Air Conditioners",
                                ],
                            },
                            ],
                        },
                        },
                    },
                    "facet.productsFacet.buckets": {
                        $filter: {
                        input: "$facet.productsFacet.buckets",
                        as: "buckets",
                        cond: {
                            $eq: [
                            "$$buckets._id",
                            "Finished Goods",
                            ],
                        },
                        },
                    },
                },
            };
        }
        pipeline.push(facetsManufacturingFilter);
    }
    */
  
    return pipeline;
  };