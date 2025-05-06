import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

export async function GET(req: Request) {
  const mongoUrl = process.env.MONGO_URI!;
  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    const db = client.db("occupancyDB");

    const latest = await db.collection("occupancy_logs")
      .find({})
      .sort({ timestamp: -1 })
      .limit(1)
      .toArray();

    const data = latest[0]?.data?.["NAB Classroom 001"];
    const occupancy = data?.occupancy ?? 0;
    const status = data?.status ?? "Off";

    return NextResponse.json({
      occupancy,
      status: status.toLowerCase(), // "on" or "off"
    });

  } catch (err) {
    console.error("Shelly status error:", err);
    return NextResponse.json({ error: "Failed to retrieve Shelly status" }, { status: 500 });
  } finally {
    await client.close();
  }
}
