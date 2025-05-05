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
exports.getUsersByAPV2 = getUsersByAPV2;
exports.getDataForAPs = getDataForAPs;
exports.loginV2 = loginV2;
exports.getData = getData;
const https_1 = require("https");
require('dotenv').config();
const apMappings_1 = require("./apMappings");
const axios_1 = __importDefault(require("axios"));
const ARUBA_BASE_URL_V2 = "https://10.6.0.1:4343";
// Create axios instances with default configs
const apiV2 = axios_1.default.create({
    baseURL: ARUBA_BASE_URL_V2,
    httpsAgent: new https_1.Agent({
        rejectUnauthorized: false,
    }),
});
function loginV2() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            console.log("Attempting login...");
            const loginResponse = yield apiV2.post("/v1/api/login", `username=${process.env.ARUBA_USERNAME}&password=${process.env.ARUBA_PASSWORD}`, {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });
            const sessionCookie = (_a = loginResponse.headers["set-cookie"]) === null || _a === void 0 ? void 0 : _a[0].split(";")[0];
            const csrfToken = loginResponse.data._global_result["X-CSRF-Token"];
            console.log("Aruba Login successful (V2)");
            if (!sessionCookie || !csrfToken) {
                throw new Error("Missing authentication tokens");
            }
            return {
                sessionCookie,
                csrfToken,
            };
        }
        catch (error) {
            console.error("Aruba login error:", error);
            throw new Error("Failed to login to Aruba controller");
        }
    });
}
function getUsersByAPV2(apName, auth) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            console.log(`Getting users for AP ${apName}...`);
            const response = yield apiV2.get(`/v1/configuration/showcommand?command=show+user-table+ap-name+${apName}`, {
                headers: {
                    Cookie: auth.sessionCookie,
                    "X-CSRF-Token": auth.csrfToken,
                },
            });
            // Filter users for specific AP
            const apUsers = (response.data.Users || []).filter((user) => user["AP name"] === apName);
            console.log(`Got ${apUsers.length} users for AP ${apName} (filtered from ${((_a = response.data.Users) === null || _a === void 0 ? void 0 : _a.length) || 0} total users)`);
            return apUsers;
        }
        catch (error) {
            console.error(`Error getting users for AP ${apName}:`, error);
            if (axios_1.default.isAxiosError(error) && ((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 401) {
                // Re-login and retry once on auth error
                console.log("Auth error - attempting relogin");
                const newAuth = yield loginV2();
                const response = yield apiV2.get(`/v1/configuration/showcommand?command=show+user-table+ap-name+${apName}`, {
                    headers: {
                        Cookie: newAuth.sessionCookie,
                        "X-CSRF-Token": newAuth.csrfToken,
                    },
                });
                return response.data.Users || [];
            }
            return [];
        }
    });
}
function getData() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield getDataForAPs(); // default: fetch ALL APs
    });
}
function getDataForAPs(apsToFetch) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const authV2 = yield loginV2();
            const occupancies = {};
            // Initialize occupancies based on apMappings
            Object.values(apMappings_1.apMappings).forEach(classroom => {
                if (!occupancies[classroom]) {
                    occupancies[classroom] = { occupancy: 0 };
                }
            });
            // Decide which APs to process
            const entries = Object.entries(apMappings_1.apMappings).filter(([apName, _classroom]) => {
                return !apsToFetch || apsToFetch.includes(apName);
            });
            for (const [apName, classroomName] of entries) {
                const users = yield getUsersByAPV2(apName, authV2);
                occupancies[classroomName].occupancy += users.length;
            }
            console.log(JSON.stringify(occupancies, null, 2));
            return occupancies;
        }
        catch (error) {
            console.error("Error getting AP data:", error);
            throw error;
        }
    });
}
