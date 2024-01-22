import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

if (!process.env.MONGODB_DATABASE_NAME) {
  throw new Error('Invalid/Missing environment variables: "MONGODB_DATABASE_NAME"')
}

const dbName = process.env.MONGODB_DATABASE_NAME;
const collectionName = 'products';

async function performSale(productsCollection, salesCollection, color, size, quantity, store_id, store_name, channel) {
  console.log(`Performing sale: Color: ${color}, Size: ${size}, Quantity: ${quantity}, Store: ${store_name}, Channel: ${channel}`);

  let product = await productsCollection.findOne({ 'color.name': color, 'items.size': size });

  if (!product) {
    return { message: `Product with color '${color}' and size '${size}' not found.` };
  } else {
    product = JSON.parse(JSON.stringify(product));
  }

  const sizeItem = product.items.find((item) => item.size === size);
  const availableStock = sizeItem.stock.find(stock => stock.location.id === store_id).amount;
  const availableTotalStock = product.total_stock_sum.find(stock => stock.location.id === store_id).amount;

  if (availableStock <= 0 || availableTotalStock <= 0) {
    return { message: `Product with color '${color}' and size '${size}' is out of stock.` };
  }

  if (availableStock < quantity || availableTotalStock < quantity) {
    return { message: `Insufficient stock for color '${color}' and size '${size}'. Available stock: ${availableStock}` };
  }

  await productsCollection.updateOne(
    {
      _id: new ObjectId(product._id)
    },
    {
      $inc: {
        'items.$[i].stock.$[j].amount': -quantity,
        'total_stock_sum.$[j].amount': -quantity,
      }
    },
    {
      arrayFilters: [
        { 'i.size': size }, // Filter the correct 'items' element based on the size
        { 'j.location.id': new ObjectId(store_id) }, // Filter the correct 'total_stock_sum' element based on location
      ],
    }
  );


  // Save the sales data to the new collection
  const saleData = {
    product_id: product._id,
    name: product.name,
    color: {
      name: color,
      hex: product.color.hex, // Include the color hex
    },
    size: size,
    sku: sizeItem.sku,
    quantity: quantity,
    channel: channel, // Generate a random value of either 'online' or 'in-store'
    timestamp: new Date(),
  };

  // If in-store add store field
  if(channel == 'in-store'){
    saleData.store = {
      store_id: new ObjectId(store_id),
      name: store_name
    };
  }

  await salesCollection.insertOne(saleData);

  return {
    message: `Sold ${quantity} units of ${product.name} (Color: ${color}, Size: ${size}). New stock: ${
      availableStock - quantity
    }`,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const color = req.query.color;
  const size = req.query.size;
  const quantity = parseInt(req.query.quantity, 10); // Parse the quantity to an integer
  const store_id = req.query.store_id;
  const store_name = req.query.store_name;
  const channel = req.query.channel;

  if (!color || !size || isNaN(quantity) || quantity <= 0) {
    res.status(400).json({ error: 'Valid color, size, and positive quantity query parameters are required' });
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    const productsCollection = db.collection(collectionName);
    const salesCollection = db.collection('sales'); // Get the 'sales' collection

    const result = await performSale(productsCollection, salesCollection, color, size, quantity, store_id, store_name, channel); // Pass both collections
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
