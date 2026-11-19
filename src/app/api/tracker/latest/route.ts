import { NextResponse } from "next/server";
import { backendStore } from "@/services/backendStore";
import { backendMqttSubscriber } from "@/services/backendMqttSubscriber";

export const dynamic = "force-dynamic";

export async function GET() {
  // Ensure background MQTT subscriber is active
  backendMqttSubscriber.init();

  const data = backendStore.getTrackerData();
  const rawPayload = backendStore.getRawPayload();
  const alerts = backendStore.getAlerts();
  const breadcrumbs = backendStore.getBreadcrumbs();
  const mqttStatus = backendMqttSubscriber.getStatus();

  return NextResponse.json({
    status: "ok",
    data,
    rawPayload,
    unresolvedAlertsCount: alerts.filter((a) => !a.acknowledged).length,
    breadcrumbsCount: breadcrumbs.length,
    mqtt: mqttStatus,
    serverTime: new Date().toISOString(),
  });
}
