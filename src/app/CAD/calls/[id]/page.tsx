"use client";

import Link from "next/link";
import {
  Ambulance,
  ArrowLeft,
  BellRing,
  CheckCircle2,
  CircleDot,
  MapPin,
  MessageSquareText,
  Radio,
  Search,
  ShieldAlert,
  UserPlus,
  X
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  CadCall,
  CadStatus,
  UNIT_CONFIG,
  addActivity,
  pacificTime,
  readCalls,
  readCompleted,
  writeCalls,
  writeCompleted
} from "../../../../lib/cad-demo";
import { sendCallToMdt } from "../../../../lib/integration-client";

type HistoryItem = { id:number; status:CadStatus; time:string; source:"CAD"|"MDT" };

const statuses: CadStatus[] = [
  "Dispatched","En Route","Holding Back","At Scene","Depart Scene","At Destination",
  "Pending Paperwork","Unit Available","En Route Post","In Area","At Post"
];

export default function CallDetailPage() {
  const params = useParams<{ id:string }>();
  const router = useRouter();
  const [call,setCall] = useState<CadCall|null>(null);
  const [clock,setClock] = useState(pacificTime());
  const [history,setHistory] = useState<HistoryItem[]>([]);
  const [search,setSearch] = useState("");
  const [allActive,setAllActive] = useState<CadCall[]>([]);

  useEffect(()=>{
    const calls = readCalls();
    setAllActive(calls);
    const found = calls.find(c=>c.id===params.id) ?? null;
    setCall(found);
    if(found) setHistory([{id:1,status:found.status,time:found.createdTime,source:"CAD"}]);
    const timer = window.setInterval(()=>setClock(pacificTime()),1000);
    return ()=>window.clearInterval(timer);
  },[params.id]);

  useEffect(()=>{
    const poll=async()=>{
      try{
        const r=await fetch("/api/integration/mdt/state",{cache:"no-store"});
        const data=await r.json();
        if(!data.ok)return;
        const current=readCalls().find(c=>c.id===params.id);
        if(!current?.assignedUnit)return;
        const event=(data.statuses??[]).find((e:any)=>e.radioIdentifier===current.assignedUnit&&e.callNumber===current.cadCallNumber);
        if(event&&event.status&&event.status!==current.status){
          const updated={...current,status:event.status as CadStatus};
          writeCalls(readCalls().map(c=>c.id===updated.id?updated:c));
          setCall(updated);
          setAllActive(readCalls());
          setHistory(h=>[...h,{id:Date.now(),status:updated.status,time:event.timestamp?.slice(11,19)??pacificTime(),source:"MDT"}]);
          addActivity(`${updated.assignedUnit} ${updated.status} on EMS ${updated.emsNumber} (MDT)`,"status");
        }
      }catch{}
    };
    void poll();
    const timer=window.setInterval(poll,1500);
    return()=>window.clearInterval(timer);
  },[params.id]);

  const currentUnit = useMemo(()=>UNIT_CONFIG.find(u=>u.radioId===call?.assignedUnit),[call]);
  const busyUnits = useMemo(
    ()=>new Set(allActive.filter(c=>c.id!==call?.id && c.assignedUnit).map(c=>c.assignedUnit)),
    [allActive,call?.id]
  );
  const assignableUnits = UNIT_CONFIG.filter(u=>!busyUnits.has(u.cadId));

  function persist(updated:CadCall){
    setCall(updated);
    const next = readCalls().map(c=>c.id===updated.id ? updated : c);
    writeCalls(next);
    setAllActive(next);
  }

  async function changeStatus(status:CadStatus,source:"CAD"|"MDT"="CAD"){
    if(!call) return;
    const time=pacificTime();
    const updated={...call,status};
    persist(updated);
    if(updated.assignedUnit) await sendCallToMdt(updated);
    setHistory(h=>[...h,{id:Date.now(),status,time,source}]);
    addActivity(`${call.assignedUnit || "Unassigned unit"} ${status} on EMS ${call.emsNumber}`, "status");
  }

  async function assignUnit(cadId:string){
    if(!call) return;
    const unit=UNIT_CONFIG.find(u=>u.radioId===cadId);
    const previous=call.assignedUnit;
    const updated:CadCall={
      ...call,
      assignedUnit:cadId,
      vehicle:unit?.vehicle ?? "",
      station:unit?.station ?? "",
      status:cadId ? (call.holdBackRequired ? "Holding Back" : "Dispatched") : "Unassigned"
    };
    persist(updated);
    if(cadId) await sendCallToMdt(updated);
    if(cadId){
      addActivity(`${cadId} ${previous ? `reassigned from ${previous}` : "assigned"} to EMS ${call.emsNumber}`, "assignment");
    } else {
      addActivity(`EMS ${call.emsNumber} returned to Unassigned queue`, "assignment");
    }
  }

  function completeCall(){
    if(!call) return;
    const completedCall={...call,completedTime:pacificTime()};
    const remaining=readCalls().filter(c=>c.id!==call.id);
    writeCalls(remaining);
    writeCompleted([completedCall,...readCompleted()]);
    addActivity(`EMS ${call.emsNumber} completed by ${call.assignedUnit || "Dispatch"}`, "complete");
    router.push("/CAD");
  }

  if(!call){
    return <main className="missing-call"><h2>Call not found</h2><Link href="/CAD">Return to CAD Portal</Link></main>;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Radio size={22}/></div><div><div className="eyebrow top-eyebrow">APOLLO OPERATIONS</div><h1>CAD Call Detail</h1></div></div>
        <div className="pacific-clock"><span>Pacific Time</span><strong>{clock}</strong></div>
        <div className="topbar-actions"><div className="system-pill"><span className="system-dot"/> Simulator Online</div><button className="icon-button" aria-label="Notifications"><BellRing size={18}/></button></div>
      </header>

      <div className="call-subnav">
        <Link href="/CAD"><ArrowLeft size={17}/> CAD Portal</Link>
        <span>Call {call.cadCallNumber}</span>
        <span>EMS {call.emsNumber}</span>
        <span>{call.assignedUnit || "UNASSIGNED"}</span>
        <span>{call.status}</span>
      </div>

      <section className="workspace">
        <aside className="unit-panel">
          <div className="panel-heading"><div><div className="eyebrow">SYSTEM STATUS</div><h2>Unit Board</h2></div><span className="count-badge">{UNIT_CONFIG.length}</span></div>
          <label className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search units"/></label>
          <div className="unit-list">
            {UNIT_CONFIG.filter(u=>u.cadId.toLowerCase().includes(search.toLowerCase())).map(unit=>{
              const assignedElsewhere=allActive.find(c=>c.id!==call.id && c.assignedUnit===unit.cadId);
              return (
                <div className={`unit-row static ${unit.cadId===call.assignedUnit?"selected":""}`} key={unit.cadId}>
                  <div className="unit-icon">{unit.level==="SUP"?<ShieldAlert size={19}/>:<Ambulance size={19}/>}</div>
                  <div className="unit-copy">
                    <div className="unit-title-line"><strong>{unit.cadId}</strong><span className={`level-badge level-${unit.level.toLowerCase()}`}>{unit.level}</span></div>
                    <span>Vehicle {unit.vehicle} · {unit.station}</span>
                    <span className="unit-status"><CircleDot size={11}/> {unit.cadId===call.assignedUnit ? call.status : assignedElsewhere ? `EMS ${assignedElsewhere.emsNumber}` : "Unit Available"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="dispatch-panel">
          <div className="dispatch-header">
            <div>
              <div className="eyebrow">ACTIVE INCIDENT</div>
              <h2>EMS {call.emsNumber} · {call.problem}</h2>
              <p>Call {call.cadCallNumber} · {call.assignedUnit || "Awaiting unit assignment"}{call.vehicle ? ` · Vehicle ${call.vehicle}`:""}</p>
            </div>
            <div className="identifier-stack">
              <div className="incident-number"><span>EMS #</span><strong>{call.emsNumber}</strong></div>
              <div className="cad-number-box"><span>CALL NUMBER</span><strong>{call.cadCallNumber}</strong></div>
            </div>
          </div>

          <div className="form-grid">
            <section className="form-card">
              <div className="section-title">Call Details</div>
              <div className="field-grid four">
                <label><span>Priority</span><input value={call.priority} readOnly/></label>
                <label><span>Zone</span><input value={call.zone} readOnly/></label>
                <label className="span-2"><span>Problem / Nature</span><input value={call.problem} readOnly/></label>
              </div>
              <div className="field-grid two">
                <label><span>Location / Facility</span><input value={call.facility} readOnly/></label>
                <label><span>Suite / Building</span><input value={call.suite} readOnly/></label>
              </div>
              <div className="field-grid address">
                <label className="street"><span>Address</span><div className="input-with-icon"><MapPin size={17}/><input value={call.address} readOnly/></div></label>
                <label><span>City</span><input value={call.city} readOnly/></label>
                <label><span>State</span><input value={call.state} readOnly/></label>
                <label><span>ZIP</span><input value={call.zip} readOnly/></label>
              </div>
              <div className={`holdback-box ${call.holdBackRequired?"active":""}`}>
                <div><strong>Hold Back Required</strong><span>Dispatch-controlled incident instruction</span></div>
                <div className="segmented">
                  <button type="button" className={!call.holdBackRequired?"on":""} onClick={()=>persist({...call,holdBackRequired:false})}>NO</button>
                  <button type="button" className={call.holdBackRequired?"danger-on":""} onClick={()=>persist({...call,holdBackRequired:true})}>YES</button>
                </div>
              </div>
            </section>

            <section className="form-card">
              <div className="section-title">Dispatch Information</div>
              <div className="notes-grid">
                <label><span>Dispatch Comments</span><textarea value={call.dispatchComments} readOnly/></label>
                <label><span>Premise Notes</span><textarea value={call.premiseNotes} readOnly/></label>
                <label><span>Caution Notes</span><textarea value={call.cautionNotes} placeholder="No caution notes entered" readOnly/></label>
              </div>
            </section>

            <section className="form-card">
              <div className="section-title">Unit Assignment / Reassignment</div>
              <div className="assignment-create-grid">
                <div className="assignment-explainer">
                  <UserPlus size={21}/>
                  <div><strong>{call.assignedUnit ? "Reassign this incident" : "Assign this incident"}</strong><span>Only units not committed to another active call are available.</span></div>
                </div>
                <label>
                  <span>CAD / Radio Unit</span>
                  <select value={call.assignedUnit} onChange={e=>assignUnit(e.target.value)}>
                    <option value="">Unassigned</option>
                    {assignableUnits.map(unit=><option key={unit.cadId} value={unit.radioId}>{unit.radioId.startsWith("S")?unit.radioId:`${unit.radioId}`} — Vehicle {unit.vehicle} — {unit.station}</option>)}
                  </select>
                </label>
              </div>
            </section>

            <section className="form-card">
              <div className="section-title">Unit Status — Radio / CAD Status Change</div>
              {!call.assignedUnit ? (
                <div className="status-disabled-note">Assign a unit before changing operational status.</div>
              ) : (
                <div className="status-grid">
                  {statuses.map(status=>(
                    <button key={status} type="button" className={`status-button ${call.status===status?"active":""}`} onClick={()=>changeStatus(status,"CAD")}>
                      <strong>{status}</strong><span>{call.status===status?clock:"Set status"}</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="status-help">CAD-entered and MDT-entered changes share the same Pacific-time timeline.</p>
            </section>

            <section className="complete-strip">
              <div><CheckCircle2 size={22}/><div><strong>Ready to close this incident?</strong><span>Call Completed moves the incident to Completed Calls; it is not deleted.</span></div></div>
              <button type="button" onClick={completeCall}><CheckCircle2 size={18}/> Call Completed</button>
            </section>
          </div>
        </section>

        <aside className="right-panel">
          <section className="side-card">
            <div className="eyebrow">ACTIVE ASSIGNMENT</div>
            <div className="active-unit-title">
              <div><h3>{call.assignedUnit || "UNASSIGNED"}</h3>{currentUnit && <span className={`level-badge level-${currentUnit.level.toLowerCase()}`}>{currentUnit.level}</span>}</div>
              <p>{call.vehicle ? `Vehicle ${call.vehicle} · ${call.station} Station` : "No unit assigned"}</p>
              <p>EMS # {call.emsNumber}</p>
              <p>{call.cadCallNumber}</p>
            </div>
            <button className="dispatch-button" type="button" disabled={!call.assignedUnit}><MessageSquareText size={18}/> Send Update to MDT</button>
          </section>

          <section className="side-card">
            <div className="eyebrow">STATUS HISTORY · PACIFIC TIME</div>
            <div className="timeline">
              {history.slice().reverse().map(item=>(
                <div className="timeline-item" key={item.id}><div className="timeline-dot"/><div><div className="timeline-line"><strong>{item.time}</strong><span>{item.status}</span></div><small>By {item.source}</small></div></div>
              ))}
            </div>
          </section>

          <section className="side-card quick-actions">
            <div className="eyebrow">QUICK ACTIONS</div>
            <button type="button"><MessageSquareText size={16}/> Add Call Note</button>
            <button className="outline-danger" type="button" onClick={completeCall}><X size={16}/> Call Completed</button>
          </section>
        </aside>
      </section>
    </main>
  );
}
