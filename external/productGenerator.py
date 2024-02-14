#!/usr/bin/env python
# coding: utf-8

# In[6]:


import pandas as pd
from bson import json_util
from pymongo import MongoClient


# In[7]:


from my_secrets import secrets
  
mongodb_uri = secrets['MONGODB_URI']
sheet_id = secrets['SHEET_ID']


# In[8]:


df = pd.read_csv(f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv", on_bad_lines='skip')
df = df.dropna()


# In[9]:


# Add additional fields
df['description'] = 'High quality ' + df['name']
df['autoreplenishment'] = False

delivery_time = {"amount": 3, "unit": "seconds"}
df['delivery_time'] = [delivery_time] * len(df)

df['stock'] = df.apply(lambda row: [
    {
        "location": {"type": "factory", "id": {"$oid": "65c63cb61526ffd3415fadbd"}},
        "amount": row['quantity'],
        "threshold": int(row['quantity'] / 2),
        "target": row['quantity'],
        "ordered": 0
    },
    {
        "location": {"type": "warehouse"},
        "amount": row['quantity'] * 10
    }
], axis=1)

df['total_stock_sum'] = None


# In[10]:


df.head(5)


# In[11]:


productKeys = ['name', 'code', 'description', 'autoreplenishment']
itemKeys = ['sku', 'item', 'unit', 'delivery_time', 'stock']


j = (df.groupby(productKeys)
        .apply(lambda x: x[itemKeys].to_dict('records'))
        .reset_index()
        .rename(columns={0:'items'})
        .to_json(orient='records'))


# In[12]:


print(json_util.dumps(json_util.loads(j), indent=2, sort_keys=True))


# In[13]:


# Insert to MongoDB
client = MongoClient(mongodb_uri)
db = client['inv_mgmt_manufacturing']
collection = db['products']

collection.delete_many({})
collection.insert_many(json_util.loads(j))


# In[14]:


#Add total_stock_sum

pipeline = [
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
                'product_id': '$_id', 
                'location': '$items.stock.location'
            }, 
            'location': {
                '$first': '$items.stock.location'
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
            }
        }
    }, {
        '$addFields': {
            'stock': {
                'location': '$location', 
                'amount': '$amount', 
                'threshold': {
                    '$cond': {
                        'if': {
                            '$eq': [
                                '$location.type', 'warehouse'
                            ]
                        }, 
                        'then': '$$REMOVE', 
                        'else': '$threshold'
                    }
                }, 
                'target': {
                    '$cond': {
                        'if': {
                            '$eq': [
                                '$location.type', 'warehouse'
                            ]
                        }, 
                        'then': '$$REMOVE', 
                        'else': '$target'
                    }
                }, 
                'ordered': {
                    '$cond': {
                        'if': {
                            '$eq': [
                                '$location.type', 'warehouse'
                            ]
                        }, 
                        'then': '$$REMOVE', 
                        'else': '$ordered'
                    }
                }
            }
        }
    }, {
        '$project': {
            'stock': 1
        }
    }, {
        '$group': {
            '_id': '$_id.product_id', 
            'total_stock_sum': {
                '$addToSet': '$stock'
            }
        }
    }, {
        '$merge': {
            'into': 'products', 
            'on': '_id'
        }
    }
]


# In[15]:


collection.aggregate(pipeline)


# In[16]:


client.close()

