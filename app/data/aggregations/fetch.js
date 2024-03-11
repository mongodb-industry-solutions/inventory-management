import { ObjectId } from 'bson';

export const fetchTransactionsPipeline = (industry, location, type) => {

    const pipeline = [
        {
          '$match': {
            'type': type
          }
        }, {
          '$unwind': {
            'path': '$items'
          }
        }, {
          '$sort': {
            'items.status.0.update_timestamp': -1
          }
        }
      ];

      if (location) {

        var locationFilter;
        if ( type === 'inbound') {
            locationFilter = {
                $match: {
                    'location.destination.id': new ObjectId(location)
                }
            };
        } else {
            locationFilter = {
                $match: {
                    'location.origin.id': new ObjectId(location)
                }
            };
        }
        pipeline.unshift(locationFilter);
    }

    if (industry === 'manufacturing') {
        var manufacturingFilter;
        if ( type === 'inbound') {
          manufacturingFilter = {
                $match: {
                    'items.product.name': { $ne: "Finished Goods" }
                }
            };
        } else {
          manufacturingFilter = {
                $match: {
                  'items.product.name': "Finished Goods"
                }
            };
        }
        pipeline.unshift(manufacturingFilter);
      }
  
    return pipeline;
  };