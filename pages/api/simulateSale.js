import { MongoClient } from 'mongodb';
import clientPromise from '../../lib/mongodb';
import { random } from 'lodash';

const dbName = 'interns_mongo_retail';
const collectionName = 'products';

async function performSale(productsCollection, salesCollection, color, size, quantity) {
    console.log(`Performing sale: Color: ${color}, Size: ${size}, Quantity: ${quantity}`);
  
    const product = await productsCollection.findOne({ 'color.name': color, 'items.size': size });
  
    if (!product) {
      return { message: `Product with color '${color}' and size '${size}' not found.` };
    }
  
    const sizeItem = product.items.find((item) => item.size === size);
    const availableStock = sizeItem.stock[0].amount;
  
    if (availableStock <= 0) {
      return { message: `Product with color '${color}' and size '${size}' is out of stock.` };
    }
  
    if (availableStock < quantity) {
      return { message: `Insufficient stock for color '${color}' and size '${size}'. Available stock: ${sizeItem.stock[0].amount}` };
    }
  
    await productsCollection.updateOne(
      {
        _id: product._id,
        'color.name': color, 
        'items.size': size,
        'items.stock.location': 'store',
      },
      { $inc: { 'items.$[item].stock.$[elem].amount': -quantity } },
      {
        arrayFilters: [
          { 'item.size': size }, // Filter the correct 'items' element based on the size
          { 'elem.location': 'store' }, // Filter the correct 'stock' element based on location
        ],
      }
    );
  
    // Save the sales data to the new collection
    const saleData = {
      product_id: product._id,
      color: color,
      size: size,
      sku: sizeItem.sku,
      quantity: quantity,
      channel: random(0, 1) ? 'online' : 'in-store', // Generate a random value of either 'online' or 'in-store'
      timestamp: new Date(),
    };
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
  
    if (!color || !size || isNaN(quantity) || quantity <= 0) {
      res.status(400).json({ error: 'Valid color, size, and positive quantity query parameters are required' });
      return;
    }
  
    try {
      const client = await clientPromise;
      const db = client.db(dbName);
      const productsCollection = db.collection(collectionName);
      const salesCollection = db.collection('sales'); // Get the 'sales' collection
  
      const result = await performSale(productsCollection, salesCollection, color, size, quantity); // Pass both collections
      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
  