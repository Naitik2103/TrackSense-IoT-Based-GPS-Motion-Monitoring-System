"use client";

import dynamic from "next/dynamic";
import { TrackerData } from "@/types/tracker";
import { Loader2, MapPin } from "lucide-react";

interface LiveMapProps {
  data: TrackerData;
  isDark?: boolean;
}

const DynamicLiveMapInner = dynamic(
  () => import("./LiveMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[460px] md:h-[540px] rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-2 shadow-sm">
        <div className="relative">
          <MapPin className="w-7 h-7 text-sky-500 animate-bounce" />
          <Loader2 className="w-4 h-4 text-sky-400 animate-spin absolute -top-1 -right-1" />
        </div>
        <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          Loading OpenStreetMap & Leaflet...
        </div>
      </div>
    ),
  }
);

export default function LiveMap(props: LiveMapProps) {
  return <DynamicLiveMapInner {...props} />;
}
