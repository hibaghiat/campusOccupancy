"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var cron = require("node-cron");
var arubaService_1 = require("./arubaService");
var apMappings_1 = require("./apMappings");
var MongoClient = require("mongodb").MongoClient;
// Mock function to get device status
function getDeviceStatus(classroom) {
    var simulatedOnRooms = ["RoomA", "RoomB"];
    return simulatedOnRooms.includes(classroom);
}
// Control functions
function turnOnDevices(classroom) {
    console.log(" [ACTION] Turning ON devices in ".concat(classroom));
}
function turnOffDevices(classroom) {
    console.log(" [ACTION] Turning OFF devices in ".concat(classroom));
}
var mongoUrl = process.env.MONGO_URI;
var dbName = "occupancyDB";
var collectionName = "occupancy_logs";
// Save data to MongoDB
function saveDataToMongo(data) {
    return __awaiter(this, void 0, void 0, function () {
        var client, db, collection, now, timestamp;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    client = new MongoClient(mongoUrl);
                    return [4 /*yield*/, client.connect()];
                case 1:
                    _a.sent();
                    db = client.db(dbName);
                    collection = db.collection(collectionName);
                    now = new Date();
                    return [4 /*yield*/, collection.insertOne({ timestamp: now, data: data })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, client.close()];
                case 3:
                    _a.sent();
                    timestamp = new Intl.DateTimeFormat("en-GB", {
                        timeZone: "Africa/Casablanca",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                    }).format(now).replace(/\D/g, "-");
                    console.log("---------- Data saved to MongoDB at ".concat(timestamp));
                    return [2 /*return*/];
            }
        });
    });
}
function handleOccupancyLogic(occupancies) {
    return __awaiter(this, void 0, void 0, function () {
        var enriched, _i, _a, classroom, occupancy, devicesOn, count, result, result;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    enriched = {};
                    _i = 0, _a = Object.keys(occupancies);
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    classroom = _a[_i];
                    occupancy = occupancies[classroom].occupancy;
                    devicesOn = getDeviceStatus(classroom);
                    count = 0;
                    if (!devicesOn) return [3 /*break*/, 3];
                    return [4 /*yield*/, handleDevicesOn(classroom, occupancy)];
                case 2:
                    result = _b.sent();
                    enriched[classroom] = __assign({ occupancy: occupancy }, result);
                    return [3 /*break*/, 4];
                case 3:
                    result = handleDevicesOff(classroom, occupancy);
                    enriched[classroom] = __assign({ occupancy: occupancy }, result);
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/, enriched];
            }
        });
    });
}
// Handle devices when they are on
function handleDevicesOn(classroom, occupancy) {
    return __awaiter(this, void 0, void 0, function () {
        var count, status, frequency, apName, rechecked, secondOccupancy;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    count = 0;
                    status = "NA";
                    frequency = "1 hour";
                    if (!(occupancy !== 0)) return [3 /*break*/, 1];
                    status = "On";
                    console.log(" ".concat(classroom, ": Devices ON & Occupancy ").concat(occupancy, " \u2192 Check again in an hour."));
                    return [3 /*break*/, 4];
                case 1:
                    console.log("------- ".concat(classroom, ": Devices ON & Occupancy 0 \u2192 Checking again in 5 min..."));
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 5 * 60 * 1000); })];
                case 2:
                    _b.sent();
                    apName = Object.keys(apMappings_1.apMappings).find(function (ap) { return apMappings_1.apMappings[ap] === classroom; });
                    if (!apName)
                        return [2 /*return*/, { status: status, count: count, frequency: frequency }];
                    return [4 /*yield*/, (0, arubaService_1.getDataForAPs)([apName])];
                case 3:
                    rechecked = _b.sent();
                    secondOccupancy = ((_a = rechecked[classroom]) === null || _a === void 0 ? void 0 : _a.occupancy) || 0;
                    if (secondOccupancy === 0) {
                        turnOffDevices(classroom);
                        status = "Off";
                        count = 1;
                        frequency = "5 mins";
                    }
                    else {
                        status = "On";
                    }
                    _b.label = 4;
                case 4: return [2 /*return*/, { status: status, count: count, frequency: frequency }];
            }
        });
    });
}
// Handle devices when they are off
function handleDevicesOff(classroom, occupancy) {
    var count = 0;
    var frequency = "1 hour";
    // If occupancy is 0, set status to "Off"
    if (occupancy === 0) {
        console.log(" ".concat(classroom, ": Devices OFF & Occupancy 0 \u2192 Check again in an hour."));
        return { status: "Off", count: count, frequency: frequency };
    }
    // If occupancy is not 0, turn on devices and set status to "On"
    turnOnDevices(classroom);
    console.log(" ".concat(classroom, ": Devices OFF & Occupancy ").concat(occupancy, " \u2192 Turned ON devices, will check again in an hour."));
    return { status: "On", count: count, frequency: frequency };
}
// Schedule to run every hour from 8AM to 10PM
cron.schedule("0 8-22 * * *", function () { return __awaiter(void 0, void 0, void 0, function () {
    var rawOccupancies, enrichedOccupancies, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log(" Scheduled task running...");
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                return [4 /*yield*/, (0, arubaService_1.getData)()];
            case 2:
                rawOccupancies = _a.sent();
                return [4 /*yield*/, handleOccupancyLogic(rawOccupancies)];
            case 3:
                enrichedOccupancies = _a.sent();
                console.log("Enriched occupancies:", enrichedOccupancies);
                return [4 /*yield*/, saveDataToMongo(enrichedOccupancies)];
            case 4:
                _a.sent();
                return [3 /*break*/, 6];
            case 5:
                error_1 = _a.sent();
                console.error("-------Error during scheduled task:", error_1);
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
console.log("-------Scheduler initialized. Running every hour from 8AM to 10PM.");
