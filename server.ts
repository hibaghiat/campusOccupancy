import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { getData, getDataForAPs } from "./arubaService";
import { apMappings } from "./apMappings";
const cron = require("node-cron");
import express, { Request, Response } from "express";

// Load environment variables
dotenv.config();

const app = express();
const port = 3000;

// Mongo config
const mongoUrl = process.env.MONGO_URI!;
const dbName = "occupancyDB";
const collectionName = "occupancy_logs";

// Mock function for simulation
function getDeviceStatus(classroom: string): boolean {
  const simulatedOnRooms = ["RoomA", "RoomB"];
  return simulatedOnRooms.includes(classroom);
}

function turnOnDevices(classroom: string) {
  console.log(`[ACTION] Turning ON devices in ${classroom}`);
}

function turnOffDevices(classroom: string) {
  console.log(`[ACTION] Turning OFF devices in ${classroom}`);
}

// Save enriched data
async function saveDataToMongo(data: any) {
  const client = new MongoClient(mongoUrl);
  await client.connect();
  const db = client.db(dbName);
  const collection = db.collection(collectionName);
  
  const now = new Date();
  await collection.insertOne({ timestamp: now, data });
  await client.close();

  const timestamp = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now).replace(/\D/g, "-");

  console.log(`---------- Data saved to MongoDB at ${timestamp}`);
}

// Logic to handle occupancy
async function handleOccupancyLogic(occupancies: any) {
  const enriched: Record<string, { occupancy: number; status: string; count: number; frequency: string }> = {};

  for (const classroom of Object.keys(occupancies)) {
    const { occupancy } = occupancies[classroom];
    const devicesOn = getDeviceStatus(classroom);
    let count = 0;

    if (devicesOn) {
      const result = await handleDevicesOn(classroom, occupancy);
      enriched[classroom] = { occupancy, ...result };
    } else {
      const result = handleDevicesOff(classroom, occupancy);
      enriched[classroom] = { occupancy, ...result };
    }
  }

  return enriched;
}

async function handleDevicesOn(classroom: string, occupancy: number) {
  let count = 0;
  let status = "NA";
  let frequency = "1 hour";

  if (occupancy !== 0) {
    status = "On";
    console.log(` ${classroom}: Devices ON & Occupancy ${occupancy} → Check again in an hour.`);
  } else {
    console.log(`------- ${classroom}: Devices ON & Occupancy 0 → Checking again in 5 min...`);
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));

    const apName = Object.keys(apMappings).find(ap => apMappings[ap] === classroom);
    if (!apName) return { status, count, frequency };

    const rechecked = await getDataForAPs([apName]);
    const secondOccupancy = rechecked[classroom]?.occupancy || 0;

    if (secondOccupancy === 0) {
      turnOffDevices(classroom);
    } else {
      status = "On";
    }
  }

  return { status, count, frequency };
}

function handleDevicesOff(classroom: string, occupancy: number) {
  let count = 0;
  let frequency = "1 hour";

  if (occupancy === 0) {
    frequency = "5 mins";
    count = 1;
    console.log(` ${classroom}: Devices OFF & Occupancy 0 → Check again in an hour.`);
    return { status: "Off", count, frequency };
  }

  turnOnDevices(classroom);
  console.log(` ${classroom}: Devices OFF & Occupancy ${occupancy} → Turned ON devices, will check again in an hour.`);
  return { status: "On", count, frequency };
}

// Schedule data collection every hour from 8 AM to 10 PM
cron.schedule("0 8-22 * * *", async () => {
  console.log("Scheduled task running...");
  try {
    const rawOccupancies = await getData();
    const enriched = await handleOccupancyLogic(rawOccupancies);
    console.log("Enriched occupancies:", enriched);
    await saveDataToMongo(enriched);
  } catch (error) {
    console.error("------- Error during scheduled task:", error);
  }
});

console.log("------- Scheduler initialized. Running every hour from 8AM to 10PM.");

app.get("/api/occupancy", async (req: Request, res: Response) => {
  try {
    const mongo = new MongoClient(mongoUrl);
    await mongo.connect();
    const collection = mongo.db(dbName).collection(collectionName);
    const latest = await collection.find().sort({ timestamp: -1 }).limit(1).toArray();

    const occupancy = latest[0]?.data?.["NAB Classroom 001"]?.occupancy ?? 0;
    await mongo.close();

    res.json({ occupancy });
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Could not fetch occupancy" });
  }
});

app.get("/api/enriched", (req: Request, res: Response): void => {
  (async () => {
    try {
      const room = req.query.room as string;
      if (!room) {
        res.status(400).json({ error: "Missing room parameter" });
        return;
      }

      const mongo = new MongoClient(mongoUrl);
      await mongo.connect();
      const collection = mongo.db(dbName).collection(collectionName);
      const latest = await collection.find().sort({ timestamp: -1 }).limit(1).toArray();

      const roomData = latest[0]?.data?.[room];
      const status = roomData?.status ?? "NA";

      await mongo.close();
      res.json({ status });
    } catch (error) {
      console.error("Enriched API error:", error);
      res.status(500).json({ error: "Could not fetch enriched status" });
    }
  })();
});

// Start Express server
app.listen(port, () => {
  console.log(`✅ Express server running at http://localhost:${port}`);
});
