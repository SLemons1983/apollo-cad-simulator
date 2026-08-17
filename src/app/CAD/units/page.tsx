"use client";

import Link from "next/link";
import { ArrowLeft, BellRing, Pencil, Radio, Save, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ActiveUnitSession, CadStatus, PHYSICAL_VEHICLES, RIDE_ALONG_TYPES,
  RideAlongType, UNIT_CONFIG, addActivity, getRadioIdentifiersForVehicle, pacificTime, readCalls,
  readUnitSessions, updateUnitSession, writeCalls, writeUnitSessions
} from "../../../lib/cad-demo";
import { fetchSharedUnitSessions, sendCallToMdt, sendUnitStatusToMdt } from "../../../lib/integration-client";

const EMPTY_CREW = ["", "", "", ""];
const UNIT_STATUSES: ActiveUnitSession["status"][] = [
  "Logged In - Not Available", "Dispatched", "En Route", "Hold Back Required", "Holding Back", "Scene Secure", "At Scene", "Depart Scene",
  "At Destination", "Pending Paperwork", "Unit Available", "En Route Post",
  "In Area", "At Post", "Out of Service"
];

export default function UnitManagementPage() {
  const [clock, setClock] = useState("");
  const [sessions, setSessions] = useState<ActiveUnitSession[]>([]);
  const [physicalVehicle, setPhysicalVehicle] = useState("");
  const [radioIdentifier, setRadioIdentifier] = useState("");
  const [crewNames, setCrewNames] = useState([...EMPTY_CREW]);
  const [rideAlongType, setRideAlongType] = useState<RideAlongType>("None");
  const [rideAlongName, setRideAlongName] = useState("");
  const [editingSessionId, setEditingSessionId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setClock(pacificTime());
    setSessions(readUnitSessions());
    const refreshShared = async () => {
      const shared = await fetchSharedUnitSessions();
      if (shared) { writeUnitSessions(shared); setSessions(shared); }
    };
    void refreshShared();
    const timer = window.setInterval(() => { setClock(pacificTime()); void refreshShared(); }, 2000);
    return () => window.clearInterval(timer);
  }, []);

  const compatibleRadioIdentifiers = useMemo(
    () => getRadioIdentifiersForVehicle(physicalVehicle),
    [physicalVehicle]
  );

  function resetForm() {
    setPhysicalVehicle("");
    setRadioIdentifier("");
    setCrewNames([...EMPTY_CREW]);
    setRideAlongType("None");
    setRideAlongName("");
    setEditingSessionId("");
    setError("");
  }

  function updateCrewName(index: number, value: string) {
    setCrewNames(current => current.map((name, i) => i === index ? value : name));
  }

  function beginEdit(session: ActiveUnitSession) {
    setEditingSessionId(session.id);
    setPhysicalVehicle(session.physicalVehicle);
    setRadioIdentifier(session.radioIdentifier);
    setCrewNames([
      ...session.crewMembers.map(member => member.displayName), ...EMPTY_CREW
    ].slice(0, 4));
    setRideAlongType(session.rideAlongType);
    setRideAlongName(session.rideAlongName ?? "");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveUnit() {
    setError("");
    const trimmedCrew = crewNames.map(name => name.trim()).filter(Boolean);
    const normalizedCrew = trimmedCrew.map(name => name.toLowerCase());

    if (!physicalVehicle) return setError("Select a physical vehicle.");
    if (!radioIdentifier) return setError("Select a radio identifier.");
    if (!crewNames[0].trim()) return setError("Crew Member 1 is required.");
    if (new Set(normalizedCrew).size !== normalizedCrew.length) {
      return setError("The same crew member cannot be entered more than once.");
    }
    if (sessions.some(session => session.id !== editingSessionId && session.physicalVehicle === physicalVehicle)) {
      return setError(`Vehicle ${physicalVehicle} is already logged on.`);
    }
    if (sessions.some(session => session.id !== editingSessionId && session.radioIdentifier === radioIdentifier)) {
      return setError(`${radioIdentifier} is already logged on.`);
    }

    const crewMembers = trimmedCrew.map(name => ({
      employeeId: `manual:${name.toLowerCase()}`,
      displayName: name
    }));
    const now = new Date().toISOString();

    if (editingSessionId) {
      const next = sessions.map(session => session.id === editingSessionId ? {
        ...session,
        crewMembers,
        rideAlongType,
        rideAlongName: rideAlongType === "None" ? "" : rideAlongName.trim(),
        updatedAt: now
      } : session);
      writeUnitSessions(next);
      setSessions(next);
      const updatedSession = next.find(session => session.id === editingSessionId);
      if (updatedSession) await sendUnitStatusToMdt(updatedSession);
      addActivity(`${radioIdentifier} crew assignment updated`, "assignment");
      resetForm();
      return;
    }

    const session: ActiveUnitSession = {
      id: `${radioIdentifier}-${Date.now()}`,
      physicalVehicle,
      radioIdentifier,
      crewMembers,
      rideAlongType,
      rideAlongName: rideAlongType === "None" ? "" : rideAlongName.trim(),
      status: "Logged In - Not Available",
      emergencyActive: false,
      loggedOnAt: now,
      updatedAt: now
    };
    const next = [...sessions, session];
    writeUnitSessions(next);
    setSessions(next);
    await sendUnitStatusToMdt(session);
    addActivity(
      `${radioIdentifier} logged on with ${crewMembers.length} operational crew member${crewMembers.length === 1 ? "" : "s"}`,
      "status"
    );
    resetForm();
  }

  async function changeStatus(session: ActiveUnitSession, status: ActiveUnitSession["status"]) {
    setError("");
    const activeCalls = readCalls();
    const assignedCall = activeCalls.find(call =>
      call.assignedUnit === session.radioIdentifier &&
      (!session.activeCallNumber || call.cadCallNumber === session.activeCallNumber)
    );

    if (status === "Out of Service") {
      if (assignedCall) {
        setError(`${session.radioIdentifier} cannot be placed out of service while assigned to EMS ${assignedCall.emsNumber}. Reassign or complete the call first.`);
        return;
      }

      const reason = window.prompt(
        `Enter the required out-of-service reason for ${session.radioIdentifier}:`,
        session.outOfServiceReason ?? ""
      )?.trim();

      if (!reason) {
        setError("An out-of-service reason is required. The unit status was not changed.");
        return;
      }

      const next = updateUnitSession(session.radioIdentifier, {
        status,
        outOfServiceReason: reason
      });
      setSessions(next);
      const updatedSession = next.find(item => item.id === session.id);
      if (updatedSession) await sendUnitStatusToMdt(updatedSession);
      addActivity(`${session.radioIdentifier} placed Out of Service — ${reason}`, "status");
      return;
    }

    const next = updateUnitSession(session.radioIdentifier, {
      status,
      outOfServiceReason: undefined
    });
    setSessions(next);

    if (assignedCall) {
      const updatedCall = { ...assignedCall, status: status as CadStatus };
      writeCalls(activeCalls.map(call => call.id === updatedCall.id ? updatedCall : call));
      await sendCallToMdt(updatedCall);
      addActivity(`${session.radioIdentifier} ${status} on EMS ${assignedCall.emsNumber}`, "status");
      return;
    }
    const updatedSession = next.find(item => item.id === session.id);
    if (updatedSession) await sendUnitStatusToMdt(updatedSession);
    addActivity(`${session.radioIdentifier} status changed to ${status}`, "status");
  }

  async function logOffUnit(session: ActiveUnitSession) {
    const assignedCall = readCalls().find(call => call.assignedUnit === session.radioIdentifier);
    if (assignedCall) {
      setError(`${session.radioIdentifier} cannot be logged off while assigned to EMS ${assignedCall.emsNumber}. Reassign or complete the call first.`);
      return;
    }
    const next = sessions.filter(item => item.id !== session.id);
    writeUnitSessions(next);
    setSessions(next);
    await sendUnitStatusToMdt(session, false);
    if (editingSessionId === session.id) resetForm();
    addActivity(`${session.radioIdentifier} logged off`, "status");
  }

  return (
    <main className="form-page-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Radio size={22}/></div><div><div className="eyebrow top-eyebrow">APOLLO OPERATIONS</div><h1>CAD Unit Management</h1></div></div>
        <div className="pacific-clock"><span>Pacific Time</span><strong>{clock}</strong></div>
        <div className="topbar-actions"><div className="system-pill"><span className="system-dot"/> CAD Online</div><button className="icon-button" aria-label="Notifications"><BellRing size={18}/></button></div>
      </header>

      <div className="call-subnav">
        <Link href="/CAD"><ArrowLeft size={17}/> CAD Portal</Link>
        <span>Unit Management</span>
        <span>{sessions.length} Active Unit{sessions.length === 1 ? "" : "s"}</span>
      </div>

      <section className="new-call-page unit-management-page">
        <div className="new-call-heading"><div><div className="eyebrow">ACTIVE UNIT SESSIONS</div><h2>{editingSessionId ? `Change Crew — ${radioIdentifier}` : "Log On a Unit"}</h2><p>Only logged-on units appear on the operational CAD Unit Board.</p></div></div>
        <div className="form-grid">
          <section className="form-card">
            <div className="section-title">Vehicle and Radio Assignment</div>
            <div className="field-grid two">
              <label><span>Physical Vehicle</span><select value={physicalVehicle} disabled={Boolean(editingSessionId)} onChange={event => { setPhysicalVehicle(event.target.value); setRadioIdentifier(""); }}><option value="">Select vehicle</option>{PHYSICAL_VEHICLES.map(vehicle => <option key={vehicle} value={vehicle}>Vehicle {vehicle}</option>)}</select></label>
              <label><span>Radio Identifier</span><select value={radioIdentifier} disabled={!physicalVehicle || Boolean(editingSessionId)} onChange={event => setRadioIdentifier(event.target.value)}><option value="">Select radio identifier</option>{compatibleRadioIdentifiers.map(unit => <option key={unit.radioId} value={unit.radioId}>{unit.radioId} — {unit.level} — {unit.station}</option>)}</select></label>
            </div>
          </section>

          <section className="form-card">
            <div className="section-title">Operational Crew</div>
            <div className="field-grid four">{crewNames.map((name, index) => <label key={index}><span>Crew Member {index + 1}{index === 0 ? " — Required" : " — Optional"}</span><input value={name} onChange={event => updateCrewName(index, event.target.value)} placeholder={index === 0 ? "Required employee" : "Optional employee"}/></label>)}</div>
            <p className="status-help">Manual entries are temporary and already structured for active ApolloEMS employee-profile selections.</p>
          </section>

          <section className="form-card">
            <div className="section-title">Ride Along — Separate from Operational Crew</div>
            <div className="field-grid two">
              <label><span>Ride Along Type</span><select value={rideAlongType} onChange={event => setRideAlongType(event.target.value as RideAlongType)}>{RIDE_ALONG_TYPES.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
              <label><span>Ride Along Name — Optional</span><input value={rideAlongName} onChange={event => setRideAlongName(event.target.value)} disabled={rideAlongType === "None"} placeholder="Optional name"/></label>
            </div>
          </section>

          {error && <div className="status-disabled-note">{error}</div>}
          <section className="create-call-actions">
            {editingSessionId ? <button className="secondary-action" type="button" onClick={resetForm}>Cancel Changes</button> : <Link href="/CAD" className="secondary-action">Cancel</Link>}
            <button className="primary-action" type="button" onClick={saveUnit}><Save size={18}/> {editingSessionId ? "Save Crew Changes" : "Log On Unit"}</button>
          </section>

          <section className="form-card">
            <div className="section-title">Currently Logged-On Units — {sessions.length}</div>
            <div className="managed-unit-list">
              {sessions.map(session => {
                const unit = UNIT_CONFIG.find(item => item.radioId === session.radioIdentifier);
                return <article className="managed-unit-card" key={session.id}>
                  <div className="managed-unit-icon"><UserRound size={21}/></div>
                  <div className="managed-unit-copy">
                    <div className="unit-title-line"><h3>{session.radioIdentifier}</h3>{unit && <span className={`level-badge level-${unit.level.toLowerCase()}`}>{unit.level}</span>}</div>
                    <p>Vehicle {session.physicalVehicle}{unit?.station ? ` · ${unit.station}` : ""}</p>
                    <p><strong>Crew:</strong> {session.crewMembers.map(member => member.displayName).join(", ")}</p>
                    {session.rideAlongType !== "None" && <p><strong>Ride Along:</strong> {session.rideAlongType}{session.rideAlongName ? ` — ${session.rideAlongName}` : ""}</p>}
                    {session.activeCallNumber && <p className="managed-unit-call">Active call {session.activeCallNumber}</p>}
                    {session.status === "Out of Service" && session.outOfServiceReason && <p className="managed-unit-oos"><strong>Out of Service:</strong> {session.outOfServiceReason}</p>}
                  </div>
                  <div className="managed-unit-controls">
                    <label><span>Unit Status</span><select value={session.status} onChange={event => void changeStatus(session, event.target.value as ActiveUnitSession["status"])}>{UNIT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}</select></label>
                    <div className="managed-unit-actions">
                      <button type="button" className="secondary-action" onClick={() => beginEdit(session)}><Pencil size={15}/> Change Crew</button>
                      <button type="button" className="secondary-action danger-action" onClick={() => void logOffUnit(session)}><X size={15}/> Log Off</button>
                    </div>
                  </div>
                </article>;
              })}
              {sessions.length === 0 && <div className="empty-state">No units are currently logged on.</div>}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
