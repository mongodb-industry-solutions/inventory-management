import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}
if (!process.env.EDGE_SERVER_HOST) {
  throw new Error('Invalid/Missing environment variable: "EDGE_SERVER_HOST"');
}

const uri = process.env.MONGODB_URI;
const options = {};

const uriEdge = 'mongodb://' + process.env.EDGE_SERVER_HOST + ':27021';
const optionsEdge = {};

let client;
let edgeClient;

let clientPromise: Promise<MongoClient>;
let edgeClientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
    _mongoEdgeClientPromise?: Promise<MongoClient>;
  }

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;

  if (!globalWithMongo._mongoEdgeClientPromise) {
    edgeClient = new MongoClient(uriEdge, optionsEdge);
    globalWithMongo._mongoEdgeClientPromise = edgeClient.connect();
  }
  edgeClientPromise = globalWithMongo._mongoEdgeClientPromise;

} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();

  edgeClient = new MongoClient(uriEdge, optionsEdge);
  edgeClientPromise = edgeClient.connect();
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export { clientPromise, edgeClientPromise }