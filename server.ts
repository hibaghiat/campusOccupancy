const cron = require("node-cron");
import { getData, getDataForAPs } from "./arubaService";
import { apMappings } from "./apMappings";
const { MongoClient } = require("mongodb");
const express = require("express");
const app = express();
const PORT = process.env.PORT;

app.get("/", (req, res) => {
  res.send("Campus Occupancy Backend is running");
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});


// Mock function to get device status
function getDeviceStatus(classroom: string): boolean {
  const simulatedOnRooms = ["RoomA", "RoomB"];
  return simulatedOnRooms.includes(classroom);
}

// Control functions
function turnOnDevices(classroom: string) {
  console.log(` [ACTION] Turning ON devices in ${classroom}`);
}

function turnOffDevices(classroom: string) {
  console.log(` [ACTION] Turning OFF devices in ${classroom}`);
}


const mongoUrl = process.env.MONGO_URI;
const dbName = "occupancyDB";
const collectionName = "occupancy_logs";

// Save data to MongoDB
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

async function handleOccupancyLogic(occupancies: any) {
  const enriched: Record<string, { occupancy: number; status: string; count: number; frequency: string }> = {};

  for (const classroom of Object.keys(occupancies)) {
    const { occupancy } = occupancies[classroom];
    const devicesOn = getDeviceStatus(classroom);

    let count = 0;

    // Handle devices when they are on
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

// Handle devices when they are on
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
      status = "Off";
      count = 1;
      frequency = "5 mins";
    } else {
      status = "On";
    }
  }

  return { status, count, frequency };
}

// Handle devices when they are off
function handleDevicesOff(classroom: string, occupancy: number) {
  let count = 0;
  let frequency = "1 hour";

  // If occupancy is 0, set status to "Off"
  if (occupancy === 0) {
    console.log(` ${classroom}: Devices OFF & Occupancy 0 → Check again in an hour.`);
    return { status: "Off", count, frequency };
  }

  // If occupancy is not 0, turn on devices and set status to "On"
  turnOnDevices(classroom);
  console.log(` ${classroom}: Devices OFF & Occupancy ${occupancy} → Turned ON devices, will check again in an hour.`);
  return { status: "On", count, frequency };
}


// Schedule to run every hour from 8AM to 10PM
cron.schedule("13 1-22 * * *", async () => {
  console.log(" Scheduled task running...");
  try {
    const rawOccupancies = await getData();
    const enrichedOccupancies = await handleOccupancyLogic(rawOccupancies);
    
    console.log("Enriched occupancies:", enrichedOccupancies);

    await saveDataToMongo(enrichedOccupancies);
  } catch (error) {
    console.error("-------Error during scheduled task:", error);
  }
});

console.log("-------Scheduler initialized. Running every hour from 8AM to 10PM.");
