"use client";

import Link from "next/link";
import {
  Activity,
  Ambulance,
  BellRing,
  CheckCircle2,
  CircleDot,
  Clock3,
  Filter,
  MapPin,
  Plus,
  Radio,
  Search,
  ShieldAlert,
  Siren
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ActiveUnitSession,
  CadActivity,
  CadCall,
  UNIT_CONFIG,
  pacificTime,
  readActivity,
  readCalls,
  readCompleted,
  readUnitSessions,
  updateUnitSession,
  writeCalls
} from "../../lib/cad-demo";

type ViewMode = "active" | "completed";

export default function CadPortal() {
  const [calls, setCalls] = useState<CadCall[]>([]);
  const [completed, setCompleted] = useState<CadCall[]>([]);
  const [activity, setActivity] = useState<CadActivity[]>([]);
  const [unitSessions, setUnitSessions] = useState<ActiveUnitSession[]>([]);
  const [clock, setClock] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewMode>("active");
  const [unitFilter, setUnitFilter] = useState<string>("");

  useEffect(() => {
    const refresh = () => {
      setClock(pacificTime());
      setCalls(readCalls());
      setCompleted(readCompleted());
      setActivity(readActivity());
      setUnitSessions(readUnitSessions());
    };
    refresh();
    const timer = window.setInterval(async () => {
      setClock(pacificTime());
      refresh();
      try {
        const response = await fetch("/api/integration/mdt/state", { cache:"no-store" });
        const data = await response.json();
        if (data.ok) {
          const current = readCalls();
          let changed = false;
          const next = current.map(call => {
            const event = (data.statuses ?? []).find((e:any)=>e.radioIdentifier===call.assignedUnit && e.callNumber===call.cadCallNumber);
            if (event?.status && event.status !== call.status) {
              changed = true;
              setUnitSessions(updateUnitSession(call.assignedUnit, {
                status: event.status,
                activeCallNumber: call.cadCallNumber
              }));
              return {...call,status:event.status};
            }
            return call;
          });
          if (changed) { writeCalls(next); setCalls(next); }
        }
      } catch {}
    }, 1500);
    return () => window.clearInterval(timer);
  }, []);

  const visibleCalls = useMemo(() => {
    const source = view === "active" ? calls : completed;
    const q = search.trim().toLowerCase();
    return source.filter((call) => {
      const searchMatch = !q || [
        call.cadCallNumber,
        call.emsNumber,
        call.problem,
        call.facility,
        call.address,
        call.assignedUnit,
        call.status,
        call.city
      ].join(" ").toLowerCase().includes(q);
      const unitMatch = !unitFilter || call.assignedUnit === unitFilter;
      return searchMatch && unitMatch;
    });
  }, [calls, completed, search, unitFilter, view]);

  const unassignedCount = calls.filter((c) => !c.assignedUnit).length;

  function callForUnit(cadId: string) {
    return calls.find((c) => c.assignedUnit === cadId);
  }

  return (
    <main className="portal-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Radio size={22}/></div>
          <div><div className="eyebrow top-eyebrow">APOLLO OPERATIONS</div><h1>CAD Portal</h1></div>
        </div>
        <div className="pacific-clock"><span>Pacific Time</span><strong>{clock}</strong></div>
        <div className="topbar-actions">
          <div className="system-pill"><span className="system-dot"/> CAD Online</div>
          <button className="icon-button" aria-label="Notifications"><BellRing size={18}/></button>
        </div>
      </header>

      <section className="portal-grid">
        <aside className="unit-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">SYSTEM STATUS</div><h2>Unit Board</h2></div>
            <span className="count-badge">{unitSessions.length}</span>
          </div>

          <button
            className={`unit-filter-reset ${!unitFilter ? "selected" : ""}`}
            onClick={() => setUnitFilter("")}
          >
            All Units
          </button>

          <div className="unit-list">
            {unitSessions.map((session) => {
              const unit = UNIT_CONFIG.find(
                item => item.radioId === session.radioIdentifier
              );
              const active = callForUnit(session.radioIdentifier);

              return (
                <button
                  className={`unit-row ${unitFilter === session.radioIdentifier ? "selected" : ""}`}
                  key={session.id}
                  onClick={() => {
                    if (active) {
                      window.location.href = `/CAD/calls/${active.id}`;
                    } else {
                      setUnitFilter(
                        session.radioIdentifier === unitFilter
                          ? ""
                          : session.radioIdentifier
                      );
                    }
                  }}
                >
                  <div className="unit-icon">
                    {unit?.level === "SUP"
                      ? <ShieldAlert size={19}/>
                      : <Ambulance size={19}/>}
                  </div>

                  <div className="unit-copy">
                    <div className="unit-title-line">
                      <strong>{session.radioIdentifier}</strong>
                      {unit && (
                        <span className={`level-badge level-${unit.level.toLowerCase()}`}>
                          {unit.level}
                        </span>
                      )}
                    </div>

                    <span>
                      Vehicle {session.physicalVehicle}
                      {unit?.station ? ` · ${unit.station}` : ""}
                    </span>

                    <span>
                      Crew: {session.crewMembers
                        .map(member => member.displayName)
                        .join(", ")}
                    </span>

                    <span className="unit-status">
                      <CircleDot size={11}/>
                      {active ? active.status : session.status}
                    </span>

                    {session.status === "Out of Service" && session.outOfServiceReason && (
                      <span className="unit-oos-reason">
                        Reason: {session.outOfServiceReason}
                      </span>
                    )}

                    {active && (
                      <span className="unit-incident">
                        EMS {active.emsNumber} · Open call
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {unitSessions.length === 0 && (
              <div className="empty-state">
                No units are logged on.
              </div>
            )}
          </div>
        </aside>

        <section className="portal-main">
          <div className="portal-heading">
            <div>
              <div className="eyebrow">DISPATCH OPERATIONS</div>
              <h2>{view === "active" ? "Active Calls" : "Completed Calls"}</h2>
              <p>Multi-call dispatch operations for Apollo CAD and MDT.</p>
            </div>
            <div className="create-call-actions">
              <Link href="/CAD/units" className="secondary-action">Manage Units</Link>
              <Link href="/CAD/new" className="primary-action"><Plus size={18}/> New Call</Link>
            </div>
          </div>

          <div className="portal-tabs">
            <button className={view === "active" ? "active" : ""} onClick={() => setView("active")}>
              <Siren size={16}/> Active Calls <span>{calls.length}</span>
            </button>
            <button className={view === "completed" ? "active" : ""} onClick={() => setView("completed")}>
              <CheckCircle2 size={16}/> Completed <span>{completed.length}</span>
            </button>
          </div>

          <label className="portal-search">
            <Search size={18}/>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search call #, EMS #, unit, address, problem or status"/>
          </label>

          {view === "active" && (
            <div className="portal-metrics">
              <div><span>Active Calls</span><strong>{calls.length}</strong></div>
              <div className={unassignedCount ? "metric-alert" : ""}><span>Unassigned Calls</span><strong>{unassignedCount}</strong></div>
              <div><span>Units Assigned</span><strong>{new Set(calls.filter(c => c.assignedUnit).map(c => c.assignedUnit)).size}</strong></div>
              <div><span>Hold Back</span><strong>{calls.filter(c => c.holdBackRequired).length}</strong></div>
            </div>
          )}

          {unitFilter && (
            <div className="filter-chip">
              <Filter size={14}/> Showing {unitFilter}
              <button onClick={() => setUnitFilter("")}>Clear</button>
            </div>
          )}

          <div className="active-call-list">
            {visibleCalls.map((call) => (
              <Link href={`/CAD/calls/${call.id}`} className={`active-call-card ${!call.assignedUnit ? "unassigned-card" : ""}`} key={call.id}>
                <div className="call-priority">P{call.priority}</div>
                <div className="call-main-copy">
                  <div className="call-number-line">
                    <strong>EMS {call.emsNumber}</strong>
                    <span className="full-call-number">{call.cadCallNumber}</span>
                    <span className={`call-status ${call.status.toLowerCase().replaceAll(" ","-")}`}>{call.status}</span>
                    {call.holdBackRequired && <span className="hold-badge">HOLD BACK</span>}
                    {!call.assignedUnit && <span className="unassigned-badge">UNASSIGNED</span>}
                  </div>
                  <h3>{call.problem}</h3>
                  <div className="call-location"><MapPin size={15}/><span>{call.address}{call.suite ? ` (${call.suite})` : ""} · {call.city}</span></div>
                  {call.facility && <p>{call.facility}</p>}
                </div>
                <div className="call-assignment">
                  <span>{view === "completed" ? "Completed" : "Assigned"}</span>
                  <strong>{call.assignedUnit || "Needs Unit"}</strong>
                  {call.assignedUnit && <small>Vehicle {call.vehicle} · {call.station}</small>}
                  <small>{view === "completed" ? call.completedTime : call.createdTime}</small>
                </div>
              </Link>
            ))}
            {visibleCalls.length === 0 && (
              <div className="empty-state">
                {search || unitFilter
                  ? "No calls match the current search or unit filter."
                  : view === "active"
                    ? "No active calls. Create a new call when dispatch activity begins."
                    : "No completed calls are recorded."}
              </div>
            )}
          </div>
        </section>

        <aside className="activity-panel">
          <div className="activity-heading">
            <div><div className="eyebrow">LIVE OPERATIONS LOG</div><h3>Dispatch Activity</h3></div>
            <Activity size={20}/>
          </div>
          <div className="activity-feed">
            {activity.slice(0, 16).map((item) => (
              <div className="activity-item" key={item.id}>
                <span className={`activity-icon activity-${item.type}`}/>
                <div>
                  <strong>{item.time}</strong>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <div className="empty-state">No dispatch activity recorded.</div>
            )}
          </div>
          <div className="activity-note">
            <Clock3 size={15}/>
            CAD and future MDT actions will share this event stream.
          </div>
        </aside>
      </section>
    </main>
  );
}
