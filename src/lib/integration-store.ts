export type MdtStatusEvent = {
  radioIdentifier: string;
  callNumber: string;
  emsNumber?: string;
  status: string;
  timestamp: string;
  source: string;
  latitude?: number;
  longitude?: number;
  dispositionCategory?: "Transport" | "Non-Transport";
  disposition?: string;
  dispositionCode?: string;
  dispositionDetail?: string;
  dispositionTimestamp?: string;
};

export type MdtEmergencyEvent = {
  radioIdentifier: string;
  callNumber?: string;
  active: boolean;
  timestamp: string;
  latitude?: number;
  longitude?: number;
};

type Store = {
  statusByUnit: Map<string, MdtStatusEvent>;
  emergencyByUnit: Map<string, MdtEmergencyEvent>;
  locationByUnit: Map<string, {radioIdentifier:string;latitude:number;longitude:number;timestamp:string}>;
};

declare global { var __apolloCadIntegrationStore: Store | undefined; }
export const cadIntegrationStore: Store = globalThis.__apolloCadIntegrationStore ??= {
  statusByUnit: new Map(), emergencyByUnit: new Map(), locationByUnit: new Map()
};
