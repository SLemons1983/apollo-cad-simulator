"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  MapPin,
  Radio,
  Save,
  Siren
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CadCall,
  UNIT_CONFIG,
  addActivity,
  makeIdentifiers,
  pacificTime,
  readCalls,
  readCompleted,
  writeCalls
} from "../../../lib/cad-demo";
import { sendCallToMdt } from "../../../lib/integration-client";

export default function NewCallPage() {
  const router = useRouter();
  const [clock, setClock] = useState(pacificTime());
  const [activeCalls, setActiveCalls] = useState<CadCall[]>([]);
  const [completedCalls, setCompletedCalls] = useState<CadCall[]>([]);
  const [priority, setPriority] = useState("3");
  const [zone, setZone] = useState("");
  const [problem, setProblem] = useState("");
  const [facility, setFacility] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Reedley");
  const [state, setState] = useState("CA");
  const [zip, setZip] = useState("");
  const [suite, setSuite] = useState("");
  const [dispatchComments, setDispatchComments] = useState("");
  const [premiseNotes, setPremiseNotes] = useState("");
  const [cautionNotes, setCautionNotes] = useState("");
  const [holdBackRequired, setHoldBackRequired] = useState(false);
  const [assignedUnit, setAssignedUnit] = useState("");

  useEffect(() => {
    const active = readCalls();
    const completed = readCompleted();
    setActiveCalls(active);
    setCompletedCalls(completed);
    const timer = window.setInterval(() => setClock(pacificTime()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const identifiers = useMemo(
    () => makeIdentifiers(activeCalls, completedCalls),
    [activeCalls, completedCalls]
  );

  const availableUnits = useMemo(() => {
    const busy = new Set(activeCalls.filter(c => c.assignedUnit).map(c => c.assignedUnit));
    return UNIT_CONFIG.filter(u => !busy.has(u.cadId));
  }, [activeCalls]);

  async function createCall() {
    const latestActive = readCalls();
    const latestCompleted = readCompleted();
    const ids = makeIdentifiers(latestActive, latestCompleted);
    const unit = UNIT_CONFIG.find(u => u.cadId === assignedUnit);

    const status: CadCall["status"] = assignedUnit
      ? holdBackRequired ? "Holding Back" : "Dispatched"
      : "Unassigned";

    const call: CadCall = {
      id: ids.cadCallNumber,
      cadCallNumber: ids.cadCallNumber,
      emsNumber: ids.emsNumber,
      dailySequence: ids.dailySequence,
      priority,
      zone,
      problem: problem || "EMS Call",
      facility,
      address,
      city,
      state,
      zip,
      suite,
      assignedUnit,
      vehicle: unit?.vehicle ?? "",
      station: unit?.station ?? "",
      status,
      holdBackRequired,
      dispatchComments,
      premiseNotes,
      cautionNotes,
      createdTime: pacificTime()
    };

    writeCalls([call, ...latestActive]);
    addActivity(
      assignedUnit
        ? `EMS ${ids.emsNumber} (${ids.cadCallNumber}) created and assigned to ${assignedUnit}`
        : `EMS ${ids.emsNumber} (${ids.cadCallNumber}) created — unassigned`,
      assignedUnit ? "assignment" : "call"
    );
    if (assignedUnit) await sendCallToMdt(call);
    router.push(`/CAD/calls/${ids.cadCallNumber}`);
  }

  return (
    <main className="form-page-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Radio size={22}/></div>
          <div><div className="eyebrow top-eyebrow">APOLLO OPERATIONS</div><h1>New CAD Call</h1></div>
        </div>
        <div className="pacific-clock"><span>Pacific Time</span><strong>{clock}</strong></div>
        <div className="topbar-actions">
          <div className="system-pill"><span className="system-dot"/> Simulator Online</div>
          <button className="icon-button" aria-label="Notifications"><BellRing size={18}/></button>
        </div>
      </header>

      <div className="call-subnav">
        <Link href="/CAD"><ArrowLeft size={17}/> CAD Portal</Link>
        <span>New Incident</span>
        <span>EMS {identifiers.emsNumber}</span>
        <span>{identifiers.cadCallNumber}</span>
      </div>

      <section className="new-call-page">
        <div className="new-call-heading">
          <div>
            <div className="eyebrow">INCIDENT CREATION</div>
            <h2>Create New Call</h2>
            <p>CCEMSA-style call numbering resets daily at midnight Pacific Time.</p>
          </div>
          <div className="identifier-stack">
            <div className="incident-number"><span>EMS #</span><strong>{identifiers.emsNumber}</strong></div>
            <div className="cad-number-box"><span>CALL NUMBER</span><strong>{identifiers.cadCallNumber}</strong></div>
          </div>
        </div>

        <div className="form-grid">
          <section className="form-card">
            <div className="section-title">Call Details</div>
            <div className="field-grid four">
              <label><span>Priority</span><select value={priority} onChange={e=>setPriority(e.target.value)}><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label>
              <label><span>Zone</span><input value={zone} onChange={e=>setZone(e.target.value)} placeholder="J01"/></label>
              <label className="span-2"><span>Problem / Nature</span><input value={problem} onChange={e=>setProblem(e.target.value)} placeholder="Breathing Problems"/></label>
            </div>
            <div className="field-grid two">
              <label><span>Location / Facility</span><input value={facility} onChange={e=>setFacility(e.target.value)} placeholder="Optional facility name"/></label>
              <label><span>Suite / Building</span><input value={suite} onChange={e=>setSuite(e.target.value)} placeholder="Apt / ER / Room"/></label>
            </div>
            <div className="field-grid address">
              <label className="street"><span>Address</span><div className="input-with-icon"><MapPin size={17}/><input value={address} onChange={e=>setAddress(e.target.value)} placeholder="Street address"/></div></label>
              <label><span>City</span><input value={city} onChange={e=>setCity(e.target.value)}/></label>
              <label><span>State</span><input value={state} onChange={e=>setState(e.target.value)}/></label>
              <label><span>ZIP</span><input value={zip} onChange={e=>setZip(e.target.value)} placeholder="93654"/></label>
            </div>
            <div className={`holdback-box ${holdBackRequired ? "active":""}`}>
              <div><strong>Hold Back Required</strong><span>Dispatch-controlled instruction sent with the call.</span></div>
              <div className="segmented">
                <button type="button" className={!holdBackRequired ? "on":""} onClick={()=>setHoldBackRequired(false)}>NO</button>
                <button type="button" className={holdBackRequired ? "danger-on":""} onClick={()=>setHoldBackRequired(true)}>YES</button>
              </div>
            </div>
          </section>

          <section className="form-card">
            <div className="section-title">Dispatch Information</div>
            <div className="notes-grid">
              <label><span>Dispatch Comments</span><textarea value={dispatchComments} onChange={e=>setDispatchComments(e.target.value)} placeholder="Call notes, diagnosis, equipment, sending/receiving information..."/></label>
              <label><span>Premise Notes</span><textarea value={premiseNotes} onChange={e=>setPremiseNotes(e.target.value)} placeholder="Access instructions, door codes, ambulance bay..."/></label>
              <label><span>Caution Notes</span><textarea value={cautionNotes} onChange={e=>setCautionNotes(e.target.value)} placeholder="Hazards or caution notes"/></label>
            </div>
          </section>

          <section className="form-card">
            <div className="section-title">Unit Assignment</div>
            <div className="assignment-create-grid">
              <div className="assignment-explainer">
                <Siren size={21}/>
                <div><strong>Assignment is optional.</strong><span>Leave unassigned to place the call in the Unassigned queue.</span></div>
              </div>
              <label>
                <span>Assign Available CAD / Radio Unit</span>
                <select value={assignedUnit} onChange={e=>setAssignedUnit(e.target.value)}>
                  <option value="">Unassigned</option>
                  {availableUnits.map(unit => (
                    <option key={unit.cadId} value={unit.radioId}>{unit.radioId.startsWith("S")?unit.radioId:`${unit.radioId}`} — Vehicle {unit.vehicle} — {unit.station}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="create-call-actions">
            <Link href="/CAD" className="secondary-action">Cancel</Link>
            <button className="primary-action" onClick={createCall}><Save size={18}/> Create Call</button>
          </section>
        </div>
      </section>
    </main>
  );
}
