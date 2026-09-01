import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import "./StudentPromotion.css";

/* ------------------------------------------------------------------ */
/*  MOCK DATA (replace the bodies of the functions in this section    */
/*  with real API calls later — keep the same return shapes)          */
/* ------------------------------------------------------------------ */

const NAME_POOL = [
  "Aarav Sharma", "Diya Patel", "Vihaan Reddy", "Ananya Iyer", "Kabir Nair",
  "Ishaan Rao", "Saanvi Gupta", "Aditya Menon", "Myra Joshi", "Arjun Verma",
  "Kiara Pillai", "Reyansh Kumar", "Anika Das", "Vivaan Bhat", "Navya Shetty",
  "Advait Rao", "Riya Chatterjee", "Sai Krishna", "Prisha Mehta", "Dhruv Malhotra",
  "Tara Kapoor", "Yash Agarwal", "Meera Pillai", "Rohan Desai", "Nisha Kulkarni",
  "Arnav Singh", "Aisha Khan", "Rudra Jain", "Sara Thomas", "Kian Fernandes",
];

const REASONS = [
  "Attendance below 75%",
  "Backlog in 2+ subjects",
  "Fee dues pending",
  "Attendance below 75%, backlog in 1 subject",
];

const BATCHES = [
  { id: "PB-001", college: "PIR Institute of Technology", department: "Computer Science & Engineering", branch: "CSE", section: "A", academicYear: "2025-26", currentSemester: "Semester 3", nextSemester: "Semester 4", totalStudents: 62, eligible: 55, notEligible: 7, status: "pending" },
  { id: "PB-002", college: "PIR Institute of Technology", department: "Computer Science & Engineering", branch: "CSE", section: "B", academicYear: "2025-26", currentSemester: "Semester 3", nextSemester: "Semester 4", totalStudents: 58, eligible: 58, notEligible: 0, status: "promoted" },
  { id: "PB-003", college: "PIR Institute of Technology", department: "Electronics & Communication", branch: "ECE", section: "A", academicYear: "2025-26", currentSemester: "Semester 5", nextSemester: "Semester 6", totalStudents: 49, eligible: 41, notEligible: 8, status: "in_review" },
  { id: "PB-004", college: "PIR Institute of Technology", department: "Electronics & Communication", branch: "ECE", section: "B", academicYear: "2025-26", currentSemester: "Semester 1", nextSemester: "Semester 2", totalStudents: 64, eligible: 60, notEligible: 4, status: "pending" },
  { id: "PB-005", college: "PIR Institute of Technology", department: "Mechanical Engineering", branch: "MECH", section: "A", academicYear: "2025-26", currentSemester: "Semester 7", nextSemester: "Semester 8", totalStudents: 45, eligible: 45, notEligible: 0, status: "promoted" },
  { id: "PB-006", college: "PIR Institute of Technology", department: "Civil Engineering", branch: "CIVIL", section: "A", academicYear: "2024-25", currentSemester: "Semester 5", nextSemester: "Semester 6", totalStudents: 52, eligible: 44, notEligible: 8, status: "in_review" },
];

function generateStudents(batch) {
  const students = [];
  for (let i = 0; i < batch.totalStudents; i++) {
    const isEligible = i < batch.eligible;
    const name = NAME_POOL[(i + batch.id.length * 3) % NAME_POOL.length];
    students.push({
      id: `${batch.id}-S${String(i + 1).padStart(3, "0")}`,
      rollNo: `${batch.branch}${batch.section}${String(i + 1).padStart(3, "0")}`,
      name,
      batchId: batch.id,
      attendance: isEligible ? 78 + ((i * 3) % 20) : 52 + ((i * 5) % 20),
      backlogs: isEligible ? 0 : 1 + (i % 3),
      eligible: isEligible,
      reason: isEligible ? null : REASONS[i % REASONS.length],
    });
  }
  return students;
}

const STUDENTS_BY_BATCH = BATCHES.reduce((acc, batch) => {
  acc[batch.id] = generateStudents(batch);
  return acc;
}, {});

const HISTORY = [
  { id: "PH-1001", batchLabel: "CSE - Section B", academicYear: "2025-26", fromSemester: "Semester 3", toSemester: "Semester 4", studentsPromoted: 58, promotedBy: "Admin Account", date: "2026-07-18" },
  { id: "PH-1002", batchLabel: "MECH - Section A", academicYear: "2025-26", fromSemester: "Semester 7", toSemester: "Semester 8", studentsPromoted: 45, promotedBy: "Admin Account", date: "2026-07-15" },
  { id: "PH-1003", batchLabel: "CSE - Section A", academicYear: "2024-25", fromSemester: "Semester 1", toSemester: "Semester 2", studentsPromoted: 60, promotedBy: "Priya Nambiar", date: "2025-12-20" },
];

const STATUS_LABELS = { pending: "Pending", in_review: "In Review", promoted: "Promoted" };
const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In Review" },
  { value: "promoted", label: "Promoted" },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getPromotionBatches() {
  await wait(300);
  return BATCHES;
}
async function getBatchById(batchId) {
  await wait(150);
  return BATCHES.find((b) => b.id === batchId) || null;
}
async function getStudentsForBatch(batchId) {
  await wait(300);
  return STUDENTS_BY_BATCH[batchId] || [];
}
async function getPromotionHistory() {
  await wait(300);
  return HISTORY;
}
async function promoteStudents({ batchId, studentIds }) {
  await wait(500);
  const batch = BATCHES.find((b) => b.id === batchId);
  if (!batch) throw new Error("Batch not found");
  batch.status = "promoted";
  const historyEntry = {
    id: `PH-${Math.floor(1000 + Math.random() * 9000)}`,
    batchLabel: `${batch.branch} - Section ${batch.section}`,
    academicYear: batch.academicYear,
    fromSemester: batch.currentSemester,
    toSemester: batch.nextSemester,
    studentsPromoted: studentIds.length,
    promotedBy: "Admin Account",
    date: new Date().toISOString().slice(0, 10),
  };
  HISTORY.unshift(historyEntry);
  return { batch, historyEntry };
}

/* ------------------------------------------------------------------ */
/*  SCREEN 1: Promotion List                                          */
/* ------------------------------------------------------------------ */

function PromotionListView({ refreshKey, onReview }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [academicYear, setAcademicYear] = useState("all");
  const [status, setStatus] = useState("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPromotionBatches().then((data) => {
      if (!cancelled) {
        setBatches(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const departments = useMemo(() => ["all", ...new Set(batches.map((b) => b.department))], [batches]);
  const academicYears = useMemo(() => ["all", ...new Set(batches.map((b) => b.academicYear))], [batches]);

  const filtered = useMemo(() => {
    return batches.filter((b) => {
      const matchesSearch = search.trim() === "" || `${b.branch} ${b.section} ${b.department}`.toLowerCase().includes(search.trim().toLowerCase());
      const matchesDept = department === "all" || b.department === department;
      const matchesYear = academicYear === "all" || b.academicYear === academicYear;
      const matchesStatus = status === "all" || b.status === status;
      return matchesSearch && matchesDept && matchesYear && matchesStatus;
    });
  }, [batches, search, department, academicYear, status]);

  const summary = useMemo(() => ({
    totalSections: batches.length,
    pending: batches.filter((b) => b.status === "pending").length,
    inReview: batches.filter((b) => b.status === "in_review").length,
    promoted: batches.filter((b) => b.status === "promoted").length,
    totalEligible: batches.reduce((sum, b) => sum + b.eligible, 0),
  }), [batches]);

  return (
    <>
      <section className="sp-summary">
        <div className="sp-summary-card">
          <span className="sp-summary-value">{summary.totalSections}</span>
          <span className="sp-summary-label">Sections tracked</span>
        </div>
        <div className="sp-summary-card sp-summary-pending">
          <span className="sp-summary-value">{summary.pending}</span>
          <span className="sp-summary-label">Pending review</span>
        </div>
        <div className="sp-summary-card sp-summary-review">
          <span className="sp-summary-value">{summary.inReview}</span>
          <span className="sp-summary-label">In review</span>
        </div>
        <div className="sp-summary-card sp-summary-promoted">
          <span className="sp-summary-value">{summary.promoted}</span>
          <span className="sp-summary-label">Promoted</span>
        </div>
        <div className="sp-summary-card">
          <span className="sp-summary-value">{summary.totalEligible}</span>
          <span className="sp-summary-label">Eligible students</span>
        </div>
      </section>

      <section className="sp-panel">
        <div className="sp-toolbar">
          <div className="sp-search">
            <input type="text" placeholder="Search by branch or section" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            {departments.map((d) => (<option key={d} value={d}>{d === "all" ? "All departments" : d}</option>))}
          </select>
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}>
            {academicYears.map((y) => (<option key={y} value={y}>{y === "all" ? "All academic years" : y}</option>))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_FILTERS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
          </select>
        </div>

        {loading ? (
          <div className="sp-empty">Loading promotion batches…</div>
        ) : filtered.length === 0 ? (
          <div className="sp-empty">No sections match these filters. Try clearing search or filters.</div>
        ) : (
          <div className="sp-table-wrap">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Branch / Section</th><th>Department</th><th>Academic Year</th>
                  <th>Promotion</th><th>Total</th><th>Eligible</th><th>Not Eligible</th>
                  <th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <div className="sp-branch-cell">
                        <span className="sp-branch-name">{b.branch}</span>
                        <span className="sp-section-name">Section {b.section}</span>
                      </div>
                    </td>
                    <td>{b.department}</td>
                    <td>{b.academicYear}</td>
                    <td><span className="sp-sem-flow">{b.currentSemester} <span className="sp-arrow">→</span> {b.nextSemester}</span></td>
                    <td>{b.totalStudents}</td>
                    <td className="sp-eligible">{b.eligible}</td>
                    <td className={b.notEligible > 0 ? "sp-not-eligible" : ""}>{b.notEligible}</td>
                    <td><span className={`sp-status sp-status-${b.status}`}>{STATUS_LABELS[b.status]}</span></td>
                    <td className="sp-actions-cell">
                      <button type="button" className="sp-action-btn" disabled={b.status === "promoted"} onClick={() => onReview(b.id)}>
                        {b.status === "promoted" ? "Completed" : "Review & Promote"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  SCREEN 2: Eligible Students                                       */
/* ------------------------------------------------------------------ */

function EligibleStudentsView({ batchId, onContinue, onBack }) {
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getBatchById(batchId), getStudentsForBatch(batchId)]).then(([b, allStudents]) => {
      if (cancelled) return;
      const eligible = allStudents.filter((s) => s.eligible);
      setBatch(b);
      setStudents(eligible);
      setSelected(new Set(eligible.map((s) => s.id)));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [batchId]);

  const allChecked = students.length > 0 && selected.size === students.length;
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(students.map((s) => s.id)));
  const toggleOne = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectedList = useMemo(() => students.filter((s) => selected.has(s.id)), [students, selected]);

  if (loading) return <div className="sp-empty">Loading eligible students…</div>;

  return (
    <section className="sp-panel">
      <div className="sp-workflow-meta">
        <div>
          <span className="sp-branch-name">{batch?.branch} - Section {batch?.section}</span>
          <span className="sp-section-name">{batch?.currentSemester} → {batch?.nextSemester} · {batch?.academicYear}</span>
        </div>
        <span className="sp-eligible-count">{students.length} eligible students</span>
      </div>

      {students.length === 0 ? (
        <div className="sp-empty">No eligible students found for this section.</div>
      ) : (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
                <th>Roll No.</th><th>Name</th><th>Attendance</th><th>Backlogs</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleOne(s.id)} /></td>
                  <td>{s.rollNo}</td>
                  <td>{s.name}</td>
                  <td>{s.attendance}%</td>
                  <td>{s.backlogs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="sp-workflow-footer">
        <button type="button" className="sp-secondary-btn" onClick={onBack}>Back to list</button>
        <button type="button" className="sp-action-btn" disabled={selectedList.length === 0} onClick={() => onContinue(selectedList)}>
          Continue with {selectedList.length} selected
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  SCREEN 3: Failed / Detained Students                               */
/* ------------------------------------------------------------------ */

function FailedStudentsView({ batchId, onContinue, onBack }) {
  const [batch, setBatch] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getBatchById(batchId), getStudentsForBatch(batchId)]).then(([b, allStudents]) => {
      if (cancelled) return;
      setBatch(b);
      setStudents(allStudents.filter((s) => !s.eligible));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [batchId]);

  if (loading) return <div className="sp-empty">Loading detained students…</div>;

  return (
    <section className="sp-panel">
      <div className="sp-workflow-meta">
        <div>
          <span className="sp-branch-name">{batch?.branch} - Section {batch?.section}</span>
          <span className="sp-section-name">{batch?.currentSemester} · {batch?.academicYear}</span>
        </div>
        <span className="sp-not-eligible-count">{students.length} not eligible for promotion</span>
      </div>

      {students.length === 0 ? (
        <div className="sp-empty">Every student in this section is eligible — nothing to review here.</div>
      ) : (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr><th>Roll No.</th><th>Name</th><th>Attendance</th><th>Backlogs</th><th>Reason held back</th></tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.rollNo}</td>
                  <td>{s.name}</td>
                  <td>{s.attendance}%</td>
                  <td>{s.backlogs}</td>
                  <td className="sp-reason-cell">{s.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="sp-workflow-footer">
        <button type="button" className="sp-secondary-btn" onClick={onBack}>Back</button>
        <button type="button" className="sp-action-btn" onClick={onContinue}>Continue to promote eligible students</button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  SCREEN 4: Promote Students (confirmation)                         */
/* ------------------------------------------------------------------ */

function PromoteStudentsView({ batchId, selectedStudents, onBack, onPromoted }) {
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getBatchById(batchId).then((b) => {
      if (!cancelled) {
        setBatch(b);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [batchId]);

  const handlePromote = async () => {
    setSubmitting(true);
    const { historyEntry } = await promoteStudents({ batchId, studentIds: selectedStudents.map((s) => s.id) });
    setSubmitting(false);
    onPromoted(historyEntry);
  };

  if (loading) return <div className="sp-empty">Loading summary…</div>;

  return (
    <section className="sp-panel">
      <div className="sp-workflow-meta">
        <div>
          <span className="sp-branch-name">{batch?.branch} - Section {batch?.section}</span>
          <span className="sp-section-name">{batch?.academicYear}</span>
        </div>
      </div>

      <div className="sp-confirm-card">
        <div className="sp-confirm-row"><span>Promoting from</span><strong>{batch?.currentSemester}</strong></div>
        <div className="sp-confirm-row"><span>Promoting to</span><strong>{batch?.nextSemester}</strong></div>
        <div className="sp-confirm-row"><span>Students to be promoted</span><strong>{selectedStudents.length}</strong></div>
      </div>

      <div className="sp-table-wrap">
        <table className="sp-table">
          <thead><tr><th>Roll No.</th><th>Name</th></tr></thead>
          <tbody>
            {selectedStudents.map((s) => (<tr key={s.id}><td>{s.rollNo}</td><td>{s.name}</td></tr>))}
          </tbody>
        </table>
      </div>

      <label className="sp-confirm-check">
        <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} />
        I've verified this list and confirm these students should be promoted to {batch?.nextSemester}. This action cannot be undone.
      </label>

      <div className="sp-workflow-footer">
        <button type="button" className="sp-secondary-btn" onClick={onBack}>Back</button>
        <button type="button" className="sp-action-btn" disabled={!confirmChecked || submitting} onClick={handlePromote}>
          {submitting ? "Promoting…" : `Promote ${selectedStudents.length} students`}
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  SCREEN 5: Promotion History                                       */
/* ------------------------------------------------------------------ */

function PromotionHistoryView({ refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getPromotionHistory().then((data) => {
      if (!cancelled) {
        setHistory(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <section className="sp-panel">
      {loading ? (
        <div className="sp-empty">Loading promotion history…</div>
      ) : history.length === 0 ? (
        <div className="sp-empty">No promotions have been recorded yet.</div>
      ) : (
        <div className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr><th>Section</th><th>Academic Year</th><th>Promotion</th><th>Students Promoted</th><th>Promoted By</th><th>Date</th></tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="sp-branch-name">{h.batchLabel}</td>
                  <td>{h.academicYear}</td>
                  <td><span className="sp-sem-flow">{h.fromSemester} <span className="sp-arrow">→</span> {h.toSemester}</span></td>
                  <td className="sp-eligible">{h.studentsPromoted}</td>
                  <td>{h.promotedBy}</td>
                  <td>{h.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  PARENT: ties tabs + workflow together                             */
/* ------------------------------------------------------------------ */

export default function StudentPromotion() {
  const [tab, setTab] = useState("list");       // "list" | "history"
  const [step, setStep] = useState(null);        // null | "eligible" | "failed" | "promote"

  const [activeBatchId, setActiveBatchId] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [successBanner, setSuccessBanner] = useState(null);

  const startReview = (batchId) => {
    setActiveBatchId(batchId);
    setStep("eligible");
    setSuccessBanner(null);
  };

  const exitWorkflow = () => {
    setStep(null);
    setActiveBatchId(null);
    setSelectedStudents([]);
  };

  const handleEligibleContinue = (selected) => {
    setSelectedStudents(selected);
    setStep("failed");
  };

  const handlePromoted = (historyEntry) => {
    setSuccessBanner(`${historyEntry.studentsPromoted} students in ${historyEntry.batchLabel} promoted to ${historyEntry.toSemester}.`);
    setListRefreshKey((k) => k + 1);
    setHistoryRefreshKey((k) => k + 1);
    exitWorkflow();
    setTab("list");
  };

  const switchTab = (nextTab) => {
    exitWorkflow();
    setTab(nextTab);
  };

  const stepLabels = [
    { key: "eligible", label: "1. Eligible Students" },
    { key: "failed", label: "2. Not Eligible / Detained" },
    { key: "promote", label: "3. Confirm & Promote" },
  ];

  return (
    <DashboardLayout>
      <main className="student-promotion">
        <nav className="sp-breadcrumb">
          <span>STUDENT MANAGEMENT</span>
          <span className="sp-breadcrumb-sep">/</span>
          <span className="sp-breadcrumb-current">STUDENT PROMOTIONS</span>
        </nav>

        <header className="sp-header">
          <span className="sp-header-eyebrow">Student Management</span>
          <h1>Student Promotion</h1>
          <p>Review each section's eligibility, then promote students into their next semester or academic year.</p>
        </header>

        {successBanner && (
          <div className="sp-success-banner">
            {successBanner}
            <button type="button" onClick={() => setSuccessBanner(null)}>×</button>
          </div>
        )}

        {!step && (
          <div className="sp-tabs">
            <button type="button" className={`sp-tab ${tab === "list" ? "sp-tab-active" : ""}`} onClick={() => switchTab("list")}>Promotion List</button>
            <button type="button" className={`sp-tab ${tab === "history" ? "sp-tab-active" : ""}`} onClick={() => switchTab("history")}>Promotion History</button>
          </div>
        )}

        {step && (
          <div className="sp-stepper">
            {stepLabels.map((s) => (
              <span key={s.key} className={`sp-step ${step === s.key ? "sp-step-active" : ""}`}>{s.label}</span>
            ))}
          </div>
        )}

        {!step && tab === "list" && <PromotionListView refreshKey={listRefreshKey} onReview={startReview} />}
        {!step && tab === "history" && <PromotionHistoryView refreshKey={historyRefreshKey} />}

        {step === "eligible" && (
          <EligibleStudentsView batchId={activeBatchId} onBack={exitWorkflow} onContinue={handleEligibleContinue} />
        )}
        {step === "failed" && (
          <FailedStudentsView batchId={activeBatchId} onBack={() => setStep("eligible")} onContinue={() => setStep("promote")} />
        )}
        {step === "promote" && (
          <PromoteStudentsView batchId={activeBatchId} selectedStudents={selectedStudents} onBack={() => setStep("failed")} onPromoted={handlePromoted} />
        )}
      </main>
    </DashboardLayout>
  );
}
