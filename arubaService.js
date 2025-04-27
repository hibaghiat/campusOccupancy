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
exports.getUsersByAPV2 = getUsersByAPV2;
exports.getDataForAPs = getDataForAPs;
exports.loginV2 = loginV2;
exports.getData = getData;
var https_1 = require("https");
require('dotenv').config();
var apMappings_1 = require("./apMappings");
var axios_1 = require("axios");
var ARUBA_BASE_URL_V2 = "https://10.6.0.1:4343";
// Create axios instances with default configs
var apiV2 = axios_1.default.create({
    baseURL: ARUBA_BASE_URL_V2,
    httpsAgent: new https_1.Agent({
        rejectUnauthorized: false,
    }),
});
function loginV2() {
    return __awaiter(this, void 0, void 0, function () {
        var loginResponse, sessionCookie, csrfToken, error_1;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    console.log("Attempting login...");
                    return [4 /*yield*/, apiV2.post("/v1/api/login", "username=".concat(process.env.ARUBA_USERNAME, "&password=").concat(process.env.ARUBA_PASSWORD), {
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded",
                            },
                        })];
                case 1:
                    loginResponse = _b.sent();
                    sessionCookie = (_a = loginResponse.headers["set-cookie"]) === null || _a === void 0 ? void 0 : _a[0].split(";")[0];
                    csrfToken = loginResponse.data._global_result["X-CSRF-Token"];
                    console.log("Aruba Login successful (V2)");
                    if (!sessionCookie || !csrfToken) {
                        throw new Error("Missing authentication tokens");
                    }
                    return [2 /*return*/, {
                            sessionCookie: sessionCookie,
                            csrfToken: csrfToken,
                        }];
                case 2:
                    error_1 = _b.sent();
                    console.error("Aruba login error:", error_1);
                    throw new Error("Failed to login to Aruba controller");
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getUsersByAPV2(apName, auth) {
    return __awaiter(this, void 0, void 0, function () {
        var response, apUsers, error_2, newAuth, response;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 6]);
                    console.log("Getting users for AP ".concat(apName, "..."));
                    return [4 /*yield*/, apiV2.get("/v1/configuration/showcommand?command=show+user-table+ap-name+".concat(apName), {
                            headers: {
                                Cookie: auth.sessionCookie,
                                "X-CSRF-Token": auth.csrfToken,
                            },
                        })];
                case 1:
                    response = _c.sent();
                    apUsers = (response.data.Users || []).filter(function (user) { return user["AP name"] === apName; });
                    console.log("Got ".concat(apUsers.length, " users for AP ").concat(apName, " (filtered from ").concat(((_a = response.data.Users) === null || _a === void 0 ? void 0 : _a.length) || 0, " total users)"));
                    return [2 /*return*/, apUsers];
                case 2:
                    error_2 = _c.sent();
                    console.error("Error getting users for AP ".concat(apName, ":"), error_2);
                    if (!(axios_1.default.isAxiosError(error_2) && ((_b = error_2.response) === null || _b === void 0 ? void 0 : _b.status) === 401)) return [3 /*break*/, 5];
                    // Re-login and retry once on auth error
                    console.log("Auth error - attempting relogin");
                    return [4 /*yield*/, loginV2()];
                case 3:
                    newAuth = _c.sent();
                    return [4 /*yield*/, apiV2.get("/v1/configuration/showcommand?command=show+user-table+ap-name+".concat(apName), {
                            headers: {
                                Cookie: newAuth.sessionCookie,
                                "X-CSRF-Token": newAuth.csrfToken,
                            },
                        })];
                case 4:
                    response = _c.sent();
                    return [2 /*return*/, response.data.Users || []];
                case 5: return [2 /*return*/, []];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function getData() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getDataForAPs()];
                case 1: return [2 /*return*/, _a.sent()]; // default: fetch ALL APs
            }
        });
    });
}
function getDataForAPs(apsToFetch) {
    return __awaiter(this, void 0, void 0, function () {
        var authV2, occupancies_1, entries, _i, entries_1, _a, apName, classroomName, users, error_3;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, loginV2()];
                case 1:
                    authV2 = _b.sent();
                    occupancies_1 = {};
                    // Initialize occupancies based on apMappings
                    Object.values(apMappings_1.apMappings).forEach(function (classroom) {
                        if (!occupancies_1[classroom]) {
                            occupancies_1[classroom] = { occupancy: 0 };
                        }
                    });
                    entries = Object.entries(apMappings_1.apMappings).filter(function (_a) {
                        var apName = _a[0], _classroom = _a[1];
                        return !apsToFetch || apsToFetch.includes(apName);
                    });
                    _i = 0, entries_1 = entries;
                    _b.label = 2;
                case 2:
                    if (!(_i < entries_1.length)) return [3 /*break*/, 5];
                    _a = entries_1[_i], apName = _a[0], classroomName = _a[1];
                    return [4 /*yield*/, getUsersByAPV2(apName, authV2)];
                case 3:
                    users = _b.sent();
                    occupancies_1[classroomName].occupancy += users.length;
                    _b.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log(JSON.stringify(occupancies_1, null, 2));
                    return [2 /*return*/, occupancies_1];
                case 6:
                    error_3 = _b.sent();
                    console.error("Error getting AP data:", error_3);
                    throw error_3;
                case 7: return [2 /*return*/];
            }
        });
    });
}
