"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const mongodb_1 = require("mongodb");
const arubaService_1 = require("./arubaService");
const apMappings_1 = require("./apMappings");
const cron = require("node-cron");
const express_1 = __importDefault(require("express"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = 3000;
// Mongo config
const mongoUrl = process.env.MONGO_URI;
const dbName = "occupancyDB";
const collectionName = "occupancy_logs";
// Mock function for simulation
function getDeviceStatus(classroom) {
    const simulatedOnRooms = ["RoomA", "RoomB"];
    return simulatedOnRooms.includes(classroom);
}
function turnOnDevices(classroom) {
    console.log(`[ACTION] Turning ON devices in ${classroom}`);
}
function turnOffDevices(classroom) {
    console.log(`[ACTION] Turning OFF devices in ${classroom}`);
}
// Save enriched data
function saveDataToMongo(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = new mongodb_1.MongoClient(mongoUrl);
        yield client.connect();
        const db = client.db(dbName);
        const collection = db.collection(collectionName);
        const now = new Date();
        yield collection.insertOne({ timestamp: now, data });
        yield client.close();
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
    });
}
// Logic to handle occupancy
function handleOccupancyLogic(occupancies) {
    return __awaiter(this, void 0, void 0, function* () {
        const enriched = {};
        for (const classroom of Object.keys(occupancies)) {
            const { occupancy } = occupancies[classroom];
            const devicesOn = getDeviceStatus(classroom);
            let count = 0;
            if (devicesOn) {
                const result = yield handleDevicesOn(classroom, occupancy);
                enriched[classroom] = Object.assign({ occupancy }, result);
            }
            else {
                const result = handleDevicesOff(classroom, occupancy);
                enriched[classroom] = Object.assign({ occupancy }, result);
            }
        }
        return enriched;
    });
}
function handleDevicesOn(classroom, occupancy) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        let count = 0;
        let status = "NA";
        let frequency = "1 hour";
        if (occupancy !== 0) {
            status = "On";
            console.log(` ${classroom}: Devices ON & Occupancy ${occupancy} → Check again in an hour.`);
        }
        else {
            console.log(`------- ${classroom}: Devices ON & Occupancy 0 → Checking again in 5 min...`);
            yield new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
            const apName = Object.keys(apMappings_1.apMappings).find(ap => apMappings_1.apMappings[ap] === classroom);
            if (!apName)
                return { status, count, frequency };
            const rechecked = yield (0, arubaService_1.getDataForAPs)([apName]);
            const secondOccupancy = ((_a = rechecked[classroom]) === null || _a === void 0 ? void 0 : _a.occupancy) || 0;
            if (secondOccupancy === 0) {
                turnOffDevices(classroom);
            }
            else {
                status = "On";
            }
        }
        return { status, count, frequency };
    });
}
function handleDevicesOff(classroom, occupancy) {
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
cron.schedule("55 2-22 * * *", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Scheduled task running...");
    try {
        const rawOccupancies = yield (0, arubaService_1.getData)();
        const enriched = yield handleOccupancyLogic(rawOccupancies);
        console.log("Enriched occupancies:", enriched);
        yield saveDataToMongo(enriched);
    }
    catch (error) {
        console.error("------- Error during scheduled task:", error);
    }
}));
console.log("------- Scheduler initialized. Running every hour from 8AM to 10PM.");
app.get("/api/occupancy", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const mongo = new mongodb_1.MongoClient(mongoUrl);
        yield mongo.connect();
        const collection = mongo.db(dbName).collection(collectionName);
        const latest = yield collection.find().sort({ timestamp: -1 }).limit(1).toArray();
        const occupancy = (_d = (_c = (_b = (_a = latest[0]) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b["NAB Classroom 001"]) === null || _c === void 0 ? void 0 : _c.occupancy) !== null && _d !== void 0 ? _d : 0;
        yield mongo.close();
        res.json({ occupancy });
    }
    catch (error) {
        console.error("API error:", error);
        res.status(500).json({ error: "Could not fetch occupancy" });
    }
}));
app.get("/api/enriched", (req, res) => {
    (() => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        try {
            const room = req.query.room;
            if (!room) {
                res.status(400).json({ error: "Missing room parameter" });
                return;
            }
            const mongo = new mongodb_1.MongoClient(mongoUrl);
            yield mongo.connect();
            const collection = mongo.db(dbName).collection(collectionName);
            const latest = yield collection.find().sort({ timestamp: -1 }).limit(1).toArray();
            const roomData = (_b = (_a = latest[0]) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b[room];
            const status = (_c = roomData === null || roomData === void 0 ? void 0 : roomData.status) !== null && _c !== void 0 ? _c : "NA";
            yield mongo.close();
            res.json({ status });
        }
        catch (error) {
            console.error("Enriched API error:", error);
            res.status(500).json({ error: "Could not fetch enriched status" });
        }
    }))();
});
// Start Express server
app.listen(port, () => {
    console.log(`✅ Express server running at http://localhost:${port}`);
});
