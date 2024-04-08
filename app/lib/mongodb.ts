import { MongoClient } from 'mongodb'


export function getClientPromise() {
  const uri = process.env.MONGODB_URI;
  const options = {};

  if (!uri) {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  }

  let client;
  let clientPromise: Promise<MongoClient>;

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    }
  
    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }

  return clientPromise;
}

export function getEdgeClientPromise() {
  const uriEdge = 'mongodb://' + process.env.EDGE_SERVER_HOST + ':27021';
  const optionsEdge = {};

  if (!uriEdge) {
    throw new Error('Invalid/Missing environment variable: "EDGE_SERVER_HOST"');
  }

  let edgeClient;
  let edgeClientPromise: Promise<MongoClient>;

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoEdgeClientPromise?: Promise<MongoClient>;
    }
  
    if (!globalWithMongo._mongoEdgeClientPromise) {
      edgeClient = new MongoClient(uriEdge, optionsEdge);
      globalWithMongo._mongoEdgeClientPromise = edgeClient.connect();
    }
    edgeClientPromise = globalWithMongo._mongoEdgeClientPromise;
  
  } else {
    // In production mode, it's best to not use a global variable.
    edgeClient = new MongoClient(uriEdge, optionsEdge);
    edgeClientPromise = edgeClient.connect();
  }

  return edgeClientPromise;
}


// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default { getClientPromise, getEdgeClientPromise }