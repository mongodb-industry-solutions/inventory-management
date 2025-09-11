import { MongoClient } from "mongodb";
import { EJSON } from "bson";

let client;
let clientPromise;
const changeStreams = new Map();

function loadMongoEnv() {
  const { MONGODB_URI, MONGODB_DATABASE_NAME } = process.env;
  const missing = [];
  if (!MONGODB_URI) missing.push("MONGODB_URI");
  if (!MONGODB_DATABASE_NAME) missing.push("MONGODB_DATABASE_NAME");
  if (missing.length) {
    throw new Error(
      `Missing required MongoDB environment variables at runtime: ${missing.join(
        ", "
      )}`
    );
  }
  return { MONGODB_URI, MONGODB_DATABASE_NAME };
}

function createMongoClient() {
  const { MONGODB_URI } = loadMongoEnv();
  const options = { appName: "automotive-acoustic-diagnostics" };
  return new MongoClient(MONGODB_URI, options);
}

function getMongoClientPromise() {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = createMongoClient();
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = createMongoClient();
      clientPromise = client.connect();
    }
  }
  return clientPromise;
}

async function getChangeStream(filter, key) {
  if (!changeStreams.has(key)) {
    const { MONGODB_DATABASE_NAME } = loadMongoEnv();
    const client = await getMongoClientPromise();
    const db = client.db(MONGODB_DATABASE_NAME);

    const filterEJSON = EJSON.parse(JSON.stringify(filter));

    const pipeline = [{ $match: filterEJSON }];
    const changeStream = db.watch(pipeline, {
      fullDocument: "updateLookup",
    });

    changeStream.on("change", (change) => {
      //console.log("Change: ", change);
    });

    changeStream.on("error", (error) => {
      console.log("Error: ", error);
    });

    changeStreams.set(key, changeStream);
  }
  return changeStreams.get(key);
}

export { getMongoClientPromise, getChangeStream };
export default getMongoClientPromise;
