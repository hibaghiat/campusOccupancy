import { Agent} from "https";
require('dotenv').config();
import { apMappings } from "./apMappings";
import axios from "axios";

const ARUBA_BASE_URL_V2 = "https://10.6.0.1:4343";
interface LoginResponse {
  _global_result: {
    UIDARUBA: string;
    "X-CSRF-Token": string;
  };
}

interface UserData {
  "AP name": string;
  "Age(d:h:m)": string;
}

interface ShowCommandResponse {
  Users: UserData[];
}

// Create axios instances with default configs
const apiV2 = axios.create({
  baseURL: ARUBA_BASE_URL_V2,
  httpsAgent: new Agent({
    rejectUnauthorized: false,
  }),
});

async function loginV2() {
  try {
    console.log("Attempting login...");
    const loginResponse = await apiV2.post<LoginResponse>(
      "/v1/api/login",
      `username=${process.env.ARUBA_USERNAME}&password=${process.env.ARUBA_PASSWORD}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const sessionCookie =
      loginResponse.headers["set-cookie"]?.[0].split(";")[0];
    const csrfToken = loginResponse.data._global_result["X-CSRF-Token"];

    console.log("Aruba Login successful (V2)");

    if (!sessionCookie || !csrfToken) {
      throw new Error("Missing authentication tokens");
    }

    return {
      sessionCookie,
      csrfToken,
    };
  } catch (error) {
    console.error("Aruba login error:", error);
    throw new Error("Failed to login to Aruba controller");
  }
}

async function getUsersByAPV2(
  apName: string,
  auth: { sessionCookie: string; csrfToken: string }
) {
  try {
    console.log(`Getting users for AP ${apName}...`);
    const response = await apiV2.get<ShowCommandResponse>(
      `/v1/configuration/showcommand?command=show+user-table+ap-name+${apName}`,
      {
        headers: {
          Cookie: auth.sessionCookie,
          "X-CSRF-Token": auth.csrfToken,
        },
      }
    );

    // Filter users for specific AP
    const apUsers = (response.data.Users || []).filter(
      (user) => user["AP name"] === apName
    );
    console.log(
    	`Got ${apUsers.length} users for AP ${apName} (filtered from ${
    		response.data.Users?.length || 0
    	} total users)`
    );

    return apUsers;
  } catch (error) {
    console.error(`Error getting users for AP ${apName}:`, error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      // Re-login and retry once on auth error
      console.log("Auth error - attempting relogin");
      const newAuth = await loginV2();
      const response = await apiV2.get<ShowCommandResponse>(
        `/v1/configuration/showcommand?command=show+user-table+ap-name+${apName}`,
        {
          headers: {
            Cookie: newAuth.sessionCookie,
            "X-CSRF-Token": newAuth.csrfToken,
          },
        }
      );
      return response.data.Users || [];
    }
    return [];
  }
}

async function getData() {
  return await getDataForAPs(); // default: fetch ALL APs
}

async function getDataForAPs(apsToFetch?: string[]) {
  try {
    const authV2 = await loginV2();
    const occupancies: { [classroom: string]: { occupancy: number } } = {};

    // Initialize occupancies based on apMappings
    Object.values(apMappings).forEach(classroom => {
      if (!occupancies[classroom]) {
        occupancies[classroom] = { occupancy: 0 };
      }
    });

    // Decide which APs to process
    const entries = Object.entries(apMappings).filter(([apName, _classroom]) => {
      return !apsToFetch || apsToFetch.includes(apName);
    });

    for (const [apName, classroomName] of entries) {
      const users = await getUsersByAPV2(apName, authV2);
      occupancies[classroomName].occupancy += users.length;
    }

    console.log(JSON.stringify(occupancies, null, 2));
    return occupancies;
  } catch (error) {
    console.error("Error getting AP data:", error);
    throw error;
  }
}


export { getUsersByAPV2, getDataForAPs, loginV2, getData };
