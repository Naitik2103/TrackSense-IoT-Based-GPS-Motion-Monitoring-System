import { NextResponse } from "next/server";
import { backendStore } from "@/services/backendStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const logs = backendStore.getActivityLogs();
  return NextResponse.json({
    status: "ok",
    count: logs.length,
    activity: logs,
  });
}
