import { NextResponse } from "next/server";
import { backendStore } from "@/services/backendStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const alerts = backendStore.getAlerts();
  return NextResponse.json({
    status: "ok",
    alerts,
    unresolvedCount: alerts.filter((a) => !a.acknowledged).length,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === "acknowledge" && body.id) {
      backendStore.acknowledgeAlert(body.id);
      return NextResponse.json({ status: "acknowledged", id: body.id });
    }
    if (body.action === "clear_all") {
      backendStore.clearAllAlerts();
      return NextResponse.json({ status: "cleared" });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
