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
  return sequence < 1000 ? String(sequence).padStart(3, "0") : String(sequence);
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

const demoDate = pacificDateKey();

export const DEMO_CALLS: CadCall[] = [
  {
    id: `${demoDate}0055`,
    cadCallNumber: `${demoDate}0055`,
    emsNumber: "055",
    dailySequence: 55,
    priority: "5",
    zone: "J01",
    problem: "Trans - ALS",
    facility: "Adventist Medical Center Reedley",
    address: "372 W Cypress Ave",
    city: "Reedley",
    state: "CA",
    zip: "93654",
    suite: "er-1",
    assignedUnit: "Medic 313",
    vehicle: "310",
    station: "Reedley",
    status: "At Scene",
    holdBackRequired: false,
    dispatchComments: "Ambulance Bay Code 2013\nNew Door Code for ER: 7010#\neq. gurney, cardiac monitor\nsnd. bayardo\nrcv. nakai\ndx. acute renal failure with hyperkalemia",
    premiseNotes: "Pick Up: Ambulance Bay Code 2013\nPick Up: New Door Code for ER: 7010#\nDest: Ambulance Bay Code 2013",
    cautionNotes: "",
    createdTime: "13:30:04"
  },
  {
    id: `${demoDate}0056`,
    cadCallNumber: `${demoDate}0056`,
    emsNumber: "056",
    dailySequence: 56,
    priority: "3",
    zone: "R02",
    problem: "Sick Person",
    facility: "Palm Village",
    address: "703 W Herbert Ave",
    city: "Reedley",
    state: "CA",
    zip: "93654",
    suite: "216",
    assignedUnit: "Medic 311",
    vehicle: "305",
    station: "Reedley",
    status: "En Route",
    holdBackRequired: false,
    dispatchComments: "75F reported altered. Caller advises patient awake now.",
    premiseNotes: "Use west driveway for ambulance access.",
    cautionNotes: "",
    createdTime: "13:36:22"
  },
  {
    id: `${demoDate}0057`,
    cadCallNumber: `${demoDate}0057`,
    emsNumber: "057",
    dailySequence: 57,
    priority: "2",
    zone: "P01",
    problem: "Traffic Collision",
    facility: "",
    address: "Manning Ave & Reed Ave",
    city: "Reedley",
    state: "CA",
    zip: "93654",
    suite: "",
    assignedUnit: "Medic 316",
    vehicle: "315",
    station: "Parlier",
    status: "Holding Back",
    holdBackRequired: true,
    dispatchComments: "Two vehicles. Law enforcement requested. Unit to hold back until scene secured.",
    premiseNotes: "",
    cautionNotes: "Hold back required until released by dispatch.",
    createdTime: "13:40:51"
  },
  {
    id: `${demoDate}0058`,
    cadCallNumber: `${demoDate}0058`,
    emsNumber: "058",
    dailySequence: 58,
    priority: "3",
    zone: "OC1",
    problem: "Breathing Problems",
    facility: "",
    address: "46000 Dunlap Rd",
    city: "Orange Cove",
    state: "CA",
    zip: "93646",
    suite: "",
    assignedUnit: "",
    vehicle: "",
    station: "",
    status: "Unassigned",
    holdBackRequired: false,
    dispatchComments: "Caller reports shortness of breath. Patient conscious and breathing.",
    premiseNotes: "Long driveway; residence is behind main house.",
    cautionNotes: "",
    createdTime: "13:43:12"
  }
];

export const DEMO_COMPLETED: CadCall[] = [
  {
    id: `${demoDate}0054`,
    cadCallNumber: `${demoDate}0054`,
    emsNumber: "054",
    dailySequence: 54,
    priority: "3",
    zone: "J01",
    problem: "Fall",
    facility: "",
    address: "1512 E Manning Ave",
    city: "Reedley",
    state: "CA",
    zip: "93654",
    suite: "",
    assignedUnit: "Medic 318",
    vehicle: "320",
    station: "Orange Cove",
    status: "Unit Available",
    holdBackRequired: false,
    dispatchComments: "Completed demonstration call.",
    premiseNotes: "",
    cautionNotes: "",
    createdTime: "12:18:07",
    completedTime: "12:57:41"
  }
];

export const DEMO_ACTIVITY: CadActivity[] = [
  { id: 1, time: "13:43:12", text: "EMS 058 created — unassigned", type: "call" },
  { id: 2, time: "13:40:51", text: "Medic 316 Holding Back on EMS 057", type: "status" },
  { id: 3, time: "13:36:22", text: "Medic 311 assigned to EMS 056", type: "assignment" },
  { id: 4, time: "13:30:04", text: "Medic 313 assigned to EMS 055", type: "assignment" }
];

export function readCalls(): CadCall[] {
  if (typeof window === "undefined") return DEMO_CALLS;
  const raw = window.localStorage.getItem("apollo-cad-demo-calls-v4-1");
  if (!raw) {
    window.localStorage.setItem("apollo-cad-demo-calls-v4-1", JSON.stringify(DEMO_CALLS));
    return DEMO_CALLS;
  }
  try { return JSON.parse(raw) as CadCall[]; } catch { return DEMO_CALLS; }
}

export function writeCalls(calls: CadCall[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("apollo-cad-demo-calls-v4-1", JSON.stringify(calls));
  }
}

export function readCompleted(): CadCall[] {
  if (typeof window === "undefined") return DEMO_COMPLETED;
  const raw = window.localStorage.getItem("apollo-cad-demo-completed-v4-1");
  if (!raw) {
    window.localStorage.setItem("apollo-cad-demo-completed-v4-1", JSON.stringify(DEMO_COMPLETED));
    return DEMO_COMPLETED;
  }
  try { return JSON.parse(raw) as CadCall[]; } catch { return DEMO_COMPLETED; }
}

export function writeCompleted(calls: CadCall[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("apollo-cad-demo-completed-v4-1", JSON.stringify(calls));
  }
}

export function readActivity(): CadActivity[] {
  if (typeof window === "undefined") return DEMO_ACTIVITY;
  const raw = window.localStorage.getItem("apollo-cad-demo-activity-v4-1");
  if (!raw) {
    window.localStorage.setItem("apollo-cad-demo-activity-v4-1", JSON.stringify(DEMO_ACTIVITY));
    return DEMO_ACTIVITY;
  }
  try { return JSON.parse(raw) as CadActivity[]; } catch { return DEMO_ACTIVITY; }
}

export function writeActivity(activity: CadActivity[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("apollo-cad-demo-activity-v4-1", JSON.stringify(activity));
  }
}

export function addActivity(text: string, type: CadActivity["type"]) {
  const current = readActivity();
  const next = [{ id: Date.now(), time: pacificTime(), text, type }, ...current].slice(0, 100);
  writeActivity(next);
  return next;
}
