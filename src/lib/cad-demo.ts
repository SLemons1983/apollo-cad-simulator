export type CadStatus =
  | "Unassigned"
  | "Dispatched"
  | "En Route"
  | "Holding Back"
  | "At Scene"
  | "Depart Scene"
  | "At Destination"
  | "Pending Paperwork"
  | "Unit Available"
  | "En Route Post"
  | "In Area"
  | "At Post";

export type CadCall = {
  id: string;
  cadCallNumber: string;
  emsNumber: string;
  dailySequence: number;
  priority: string;
  zone: string;
  problem: string;
  facility: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  suite: string;
  assignedUnit: string;
  vehicle: string;
  station: string;
  status: CadStatus;
  holdBackRequired: boolean;
  dispatchComments: string;
  premiseNotes: string;
  cautionNotes: string;
  createdTime: string;
  completedTime?: string;
};

export type CadActivity = {
  id: number;
  time: string;
  text: string;
  type: "call" | "assignment" | "status" | "note" | "complete";
};

export type CrewMember = {
  employeeId: string;
  displayName: string;
};

export type RideAlongType =
  | "None"
  | "Paramedic Intern"
  | "EMT Student"
  | "Other Ride Along";

export type UnitStatus =
  | Exclude<CadStatus, "Unassigned">
  | "Out of Service";

export type ActiveUnitSession = {
  id: string;
  physicalVehicle: string;
  radioIdentifier: string;
  deviceId?: string;
  crewMembers: CrewMember[];
  rideAlongType: RideAlongType;
  rideAlongName?: string;
  status: UnitStatus;
  outOfServiceReason?: string;
  activeCallNumber?: string;
  latitude?: number;
  longitude?: number;
  emergencyActive: boolean;
  loggedOnAt: string;
  updatedAt: string;
};

export const PHYSICAL_VEHICLES = [
  "300", "301", "302", "303", "305", "310",
  "315", "320", "325", "330", "335"
] as const;

export const RIDE_ALONG_TYPES: RideAlongType[] = [
  "None",
  "Paramedic Intern",
  "EMT Student",
  "Other Ride Along"
];

export const UNIT_CONFIG = [
  { radioId:"S300", cadId:"S300", vehicle:"300", level:"SUP", station:"Supervisor" },
  { radioId:"S301", cadId:"S301", vehicle:"301", level:"SUP", station:"Supervisor" },
  { radioId:"S302", cadId:"S302", vehicle:"302", level:"SUP", station:"Supervisor" },
  { radioId:"S303", cadId:"S303", vehicle:"303", level:"SUP", station:"Supervisor" },
  { radioId:"305", cadId:"Medic 305", vehicle:"305", level:"ALS", station:"Additional Unit" },
  { radioId:"9305", cadId:"Medic 9305", vehicle:"305", level:"BLS", station:"Additional Unit" },
  { radioId:"310", cadId:"Medic 310", vehicle:"310", level:"ALS", station:"Additional Unit" },
  { radioId:"9310", cadId:"Medic 9310", vehicle:"310", level:"BLS", station:"Additional Unit" },
  { radioId:"311", cadId:"Medic 311", vehicle:"305", level:"ALS", station:"Reedley-1" },
  { radioId:"9311", cadId:"Medic 9311", vehicle:"305", level:"BLS", station:"Reedley-1" },
  { radioId:"313", cadId:"Medic 313", vehicle:"310", level:"ALS", station:"Reedley-2" },
  { radioId:"9313", cadId:"Medic 9313", vehicle:"310", level:"BLS", station:"Reedley-2" },
  { radioId:"315", cadId:"Medic 315", vehicle:"315", level:"ALS", station:"Additional Unit" },
  { radioId:"9315", cadId:"Medic 9315", vehicle:"315", level:"BLS", station:"Additional Unit" },
  { radioId:"316", cadId:"Medic 316", vehicle:"315", level:"ALS", station:"Parlier" },
  { radioId:"9316", cadId:"Medic 9316", vehicle:"315", level:"BLS", station:"Parlier" },
  { radioId:"318", cadId:"Medic 318", vehicle:"320", level:"ALS", station:"Orange Cove" },
  { radioId:"9318", cadId:"Medic 9318", vehicle:"320", level:"BLS", station:"Orange Cove" },
  { radioId:"320", cadId:"Medic 320", vehicle:"320", level:"ALS", station:"Additional Unit" },
  { radioId:"9320", cadId:"Medic 9320", vehicle:"320", level:"BLS", station:"Additional Unit" },
  { radioId:"325", cadId:"Medic 325", vehicle:"325", level:"ALS", station:"Additional Unit" },
  { radioId:"9325", cadId:"Medic 9325", vehicle:"325", level:"BLS", station:"Additional Unit" },
  { radioId:"330", cadId:"Medic 330", vehicle:"330", level:"ALS", station:"Additional Unit" },
  { radioId:"9330", cadId:"Medic 9330", vehicle:"330", level:"BLS", station:"Additional Unit" },
  { radioId:"335", cadId:"Medic 335", vehicle:"335", level:"ALS", station:"Additional Unit" },
  { radioId:"9335", cadId:"Medic 9335", vehicle:"335", level:"BLS", station:"Additional Unit" },
] as const;

const SHARED_AMBULANCE_RADIO_IDENTIFIERS = [
  "311", "9311",
  "313", "9313",
  "316", "9316",
  "318", "9318"
] as const;

export function getRadioIdentifiersForVehicle(physicalVehicle: string) {
  if (["300", "301", "302", "303"].includes(physicalVehicle)) {
    return UNIT_CONFIG.filter(unit => unit.radioId === `S${physicalVehicle}`);
  }

  const compatible = new Set<string>([
    physicalVehicle,
    `9${physicalVehicle}`,
    ...SHARED_AMBULANCE_RADIO_IDENTIFIERS
  ]);

  return UNIT_CONFIG.filter(unit => compatible.has(unit.radioId));
}

function pacificParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    second: map.second
  };
}

export function pacificDateKey(date = new Date()) {
  const p = pacificParts(date);
  return `${p.year}${p.month}${p.day}`;
}

export function pacificTime(date = new Date()) {
  const p = pacificParts(date);
  return `${p.hour}:${p.minute}:${p.second}`;
}

export function formatEmsNumber(sequence: number) {
  return String(sequence).padStart(4, "0");
}

export function buildCadCallNumber(sequence: number, date = new Date()) {
  return `${pacificDateKey(date)}${String(sequence).padStart(4, "0")}`;
}

export function getNextSequence(active: CadCall[], completed: CadCall[]) {
  const today = pacificDateKey();
  const todaysCalls = [...active, ...completed]
    .filter(call => call.cadCallNumber?.startsWith(today))
    .map(call => call.dailySequence || Number(call.cadCallNumber.slice(-4)) || 0);

  return (todaysCalls.length ? Math.max(...todaysCalls) : 0) + 1;
}

export function makeIdentifiers(active: CadCall[], completed: CadCall[]) {
  const dailySequence = getNextSequence(active, completed);
  return {
    dailySequence,
    cadCallNumber: buildCadCallNumber(dailySequence),
    emsNumber: formatEmsNumber(dailySequence)
  };
}

export const INITIAL_CALLS: CadCall[] = [];

export const INITIAL_COMPLETED_CALLS: CadCall[] = [];

export const INITIAL_ACTIVITY: CadActivity[] = [];

export function readCalls(): CadCall[] {
  if (typeof window === "undefined") return INITIAL_CALLS;
  const raw = window.localStorage.getItem("apollo-cad-calls-v5");
  if (!raw) {
    window.localStorage.setItem("apollo-cad-calls-v5", JSON.stringify(INITIAL_CALLS));
    return INITIAL_CALLS;
  }
  try { return JSON.parse(raw) as CadCall[]; } catch { return INITIAL_CALLS; }
}

export function writeCalls(calls: CadCall[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("apollo-cad-calls-v5", JSON.stringify(calls));
  }
}

export function readCompleted(): CadCall[] {
  if (typeof window === "undefined") return INITIAL_COMPLETED_CALLS;
  const raw = window.localStorage.getItem("apollo-cad-completed-v5");
  if (!raw) {
    window.localStorage.setItem("apollo-cad-completed-v5", JSON.stringify(INITIAL_COMPLETED_CALLS));
    return INITIAL_COMPLETED_CALLS;
  }
  try { return JSON.parse(raw) as CadCall[]; } catch { return INITIAL_COMPLETED_CALLS; }
}

export function writeCompleted(calls: CadCall[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("apollo-cad-completed-v5", JSON.stringify(calls));
  }
}

export function readActivity(): CadActivity[] {
  if (typeof window === "undefined") return INITIAL_ACTIVITY;
  const raw = window.localStorage.getItem("apollo-cad-activity-v5");
  if (!raw) {
    window.localStorage.setItem("apollo-cad-activity-v5", JSON.stringify(INITIAL_ACTIVITY));
    return INITIAL_ACTIVITY;
  }
  try { return JSON.parse(raw) as CadActivity[]; } catch { return INITIAL_ACTIVITY; }
}

export function writeActivity(activity: CadActivity[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("apollo-cad-activity-v5", JSON.stringify(activity));
  }
}

const UNIT_SESSIONS_STORAGE_KEY = "apollo-cad-unit-sessions-v5";

export function readUnitSessions(): ActiveUnitSession[] {
  if (typeof window === "undefined") return [];

  const raw = window.localStorage.getItem(UNIT_SESSIONS_STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(UNIT_SESSIONS_STORAGE_KEY, "[]");
    return [];
  }

  try {
    const sessions = JSON.parse(raw);
    return Array.isArray(sessions) ? sessions as ActiveUnitSession[] : [];
  } catch {
    return [];
  }
}

export function writeUnitSessions(sessions: ActiveUnitSession[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      UNIT_SESSIONS_STORAGE_KEY,
      JSON.stringify(sessions)
    );
  }
}

export function updateUnitSession(
  radioIdentifier: string,
  updates: Partial<
    Pick<
      ActiveUnitSession,
      "status" |
      "outOfServiceReason" |
      "activeCallNumber" |
      "latitude" |
      "longitude" |
      "emergencyActive"
    >
  >
) {
  const next = readUnitSessions().map(session =>
    session.radioIdentifier === radioIdentifier
      ? {
          ...session,
          ...updates,
          updatedAt: new Date().toISOString()
        }
      : session
  );

  writeUnitSessions(next);
  return next;
}

export function addActivity(text: string, type: CadActivity["type"]) {
  const current = readActivity();
  const next = [{ id: Date.now(), time: pacificTime(), text, type }, ...current].slice(0, 100);
  writeActivity(next);
  return next;
}
