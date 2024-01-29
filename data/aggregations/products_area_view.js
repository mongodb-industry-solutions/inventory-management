[
  {
    '$unwind': {
      'path': '$items'
    }
  }, {
    '$unwind': {
      'path': '$items.stock'
    }
  }, {
    '$group': {
      '_id': {
        'sku': '$items.sku', 
        'locationType': '$items.stock.location.type'
      }, 
      'product_id': {
        '$first': '$_id'
      }, 
      'size': {
        '$first': '$items.size'
      }, 
      'delivery_time': {
        '$first': '$items.delivery_time'
      }, 
      'amount': {
        '$sum': '$items.stock.amount'
      }, 
      'threshold': {
        '$sum': '$items.stock.threshold'
      }, 
      'target': {
        '$sum': '$items.stock.target'
      }, 
      'ordered': {
        '$sum': '$items.stock.ordered'
      }, 
      'total_stock_sum': {
        '$first': '$total_stock_sum'
      }
    }
  }, {
    '$group': {
      '_id': '$_id.sku', 
      'product_id': {
        '$first': '$product_id'
      }, 
      'sku': {
        '$first': '$_id.sku'
      }, 
      'size': {
        '$first': '$size'
      }, 
      'delivery_time': {
        '$first': '$delivery_time'
      }, 
      'stock': {
        '$push': {
          'location': {
            'type': '$_id.locationType'
          }, 
          'amount': '$amount', 
          'threshold': '$threshold', 
          'target': '$target', 
          'ordered': '$ordered'
        }
      }, 
      'total_stock_sum': {
        '$first': '$total_stock_sum'
      }
    }
  }, {
    '$group': {
      '_id': '$product_id', 
      'items': {
        '$push': {
          'sku': '$sku', 
          'size': '$size', 
          'delivery_time': '$delivery_time', 
          'stock': '$stock'
        }
      }, 
      'total_stock_sum': {
        '$first': '$total_stock_sum'
      }
    }
  }, {
    '$unwind': {
      'path': '$total_stock_sum'
    }
  }, {
    '$group': {
      '_id': {
        'location_type': '$total_stock_sum.location.type', 
        'product_id': '$_id'
      }, 
      'items': {
        '$first': '$items'
      }, 
      'amount': {
        '$sum': '$total_stock_sum.amount'
      }, 
      'threshold': {
        '$sum': '$total_stock_sum.threshold'
      }, 
      'target': {
        '$sum': '$total_stock_sum.target'
      }, 
      'ordered': {
        '$sum': '$total_stock_sum.ordered'
      }
    }
  }, {
    '$group': {
      '_id': '$_id.product_id', 
      'items': {
        '$first': '$items'
      }, 
      'total_stock_sum': {
        '$push': {
          'location': {
            'type': '$_id.location_type'
          }, 
          'amount': '$amount', 
          'threshold': '$threshold', 
          'target': '$target', 
          'ordered': '$ordered'
        }
      }
    }
  }, {
    '$lookup': {
      'from': 'products', 
      'localField': '_id', 
      'foreignField': '_id', 
      'as': 'product'
    }
  }, {
    '$unwind': {
      'path': '$product'
    }
  }, {
    '$set': {
      'product.items': '$items', 
      'product.total_stock_sum': '$total_stock_sum'
    }
  }, {
    '$replaceRoot': {
      'newRoot': '$product'
    }
  }
]