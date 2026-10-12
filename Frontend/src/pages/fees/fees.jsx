// Comprehensive Fee Management Module: Overview, Fee Plans, Student Fees, Payments, Reports
import * as external0 from "react";
import * as external1 from "react-router-dom";
import * as external2 from "react-dom";
import * as external3 from "react-icons/fi";
import {
  PageHeaderModule,
  SearchableSelectModule,
  TablePaginationModule,
  EmptyStateModule,
  DirectoryEmptyStateModule,
  useToastStateModule,
  ExportMenuModule,
  DashboardLayoutModule,
  AcademicContextModule,
  feeStructureServiceModule,
  recordDetailSectionsModule,
  toastModule,
  exportColumnsModule,
  academicYearUtilsModule,
  exportUtilsModule,
  feeNavigationModule,
} from "../../components/components.jsx";
import {
  apiEndpointsModule,
  collegeApiModule,
  authModule,
  collegeScopeModule,
} from "../../API/apiendpoints.jsx";

function FeeRequestState({ loading, error, children }) {
  if (loading) return <div className="fm-request-state" role="status">Loading fee records...</div>;
  if (error) return <div className="fm-error-banner" role="alert">{error}</div>;
  return children;
}

const date = (val) => (val ? String(val).slice(0, 10) : "—");

// ============================================================================
// MODULE 1: FEE STRUCTURE WIZARD MODULE (NOW 3-SECTION CREATE FEE PLAN FORM)
// ============================================================================
export const FeeStructureWizardModule = (() => {
  const { useEffect, useId, useMemo, useRef, useState } = external0;
  const {
    FiAlertTriangle,
    FiArrowLeft,
    FiCheck,
    FiPlus,
    FiTrash2,
    FiX,
    FiChevronDown,
    FiChevronRight,
    FiSearch,
    FiCheckCircle,
    FiMoreHorizontal,
  } = external3;
  const { Link, useNavigate } = external1;
  const { default: SearchableSelect } = SearchableSelectModule;
  const { default: TablePagination } = TablePaginationModule;
  const { default: EmptyState } = EmptyStateModule;
  const {
    academicFeeComponent,
    cents,
    checkDuplicateStructure,
    feeMoney,
    feeTotal,
    rupees,
    studentMatchesFee,
    uid,
    validateFeeStructure,
  } = feeStructureServiceModule;

  function feeFieldLabel(label) {
    return typeof label === "string" && label.endsWith(" *") ? (
      <>
        {label.slice(0, -2)} <b className="required-mark">*</b>
      </>
    ) : (
      label
    );
  }

  function FeeField({ label, children, className = "" }) {
    return (
      <label className={className || "fs-field"}>
        <span>{feeFieldLabel(label)}</span>
        {children}
      </label>
    );
  }

  function FeeInput({ label, value, onChange, className, ...props }) {
    return (
      <FeeField label={label} className={className}>
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      </FeeField>
    );
  }

  function FeeSelect({
    label,
    value,
    options,
    onChange,
    className = "",
    displayLabel = label,
    ...props
  }) {
    const placeholder =
      options.find((option) => typeof option === "object" && option.id === "")
        ?.name || "Select an option";
    return (
      <div className={className || "fs-field"}>
        <span className="fs-field-label">{feeFieldLabel(displayLabel)}</span>
        <SearchableSelect
          label={label}
          value={value}
          options={options}
          placeholder={placeholder}
          onChange={onChange}
          {...props}
        />
      </div>
    );
  }

  function FeeBadge({ value }) {
    const v = String(value || "Draft").toLowerCase().replace(/\s+/g, "-");
    return <span className={`fm-badge fm-badge--${v}`}>{value}</span>;
  }

  function FeeStats({ items }) {
    return (
      <div className="fm-kpis-grid">
        {items.map(([label, value, meta]) => (
          <div key={label} className="fm-kpi-card">
            <span className="fm-kpi-label">{label}</span>
            <strong className="fm-kpi-value">{value}</strong>
            {meta && <span className="fm-kpi-meta">{meta}</span>}
          </div>
        ))}
      </div>
    );
  }

  function FeeTable({
    columns,
    rows,
    empty = "No records found.",
    pageSize = 8,
    rowKey = (row) => row.id ?? row.studentFeeId ?? row.receiptId ?? row.paymentId,
    loading = false,
    error = "",
    caption,
    totalRow,
    className = "",
    wrapClassName = "",
  }) {
    const [page, setPage] = useState(1);
    const signature = rows.map(rowKey).join("|");
    useEffect(() => setPage(1), [signature]);
    const pages = Math.max(1, Math.ceil(rows.length / pageSize)),
      current = Math.min(page, pages);
    return (
      <FeeRequestState loading={loading} error={error}>
        {rows.length ? (
          <>
            <div className={`fm-table-wrap ${wrapClassName}`.trim()}>
              <table className={`fm-table ${className}`.trim()}>
                {caption && <caption className="fm-sr-only">{caption}</caption>}
                <thead>
                  <tr>
                    {columns.map((c, i) => (
                      <th
                        key={i}
                        scope="col"
                        style={c.width ? { width: c.width } : undefined}
                        className={c.align === "right" ? "fm-text-right" : undefined}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows
                    .slice((current - 1) * pageSize, current * pageSize)
                    .map((row, n) => (
                      <tr key={rowKey(row) ?? n}>
                        {columns.map((c, i) => (
                          <td
                            key={i}
                            className={c.align === "right" ? "fm-text-right" : undefined}
                          >
                            {c.render
                              ? c.render(row)
                              : typeof c.value === "function"
                              ? c.value(row)
                              : row[c.key ?? c.value] ?? "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
                {totalRow && rows.length > 0 && (
                  <tfoot>
                    <tr className="fm-table-total-row">
                      {columns.map((c, i) => {
                        const valKey = typeof c.value === "string" ? c.value : undefined;
                        const cell =
                          (valKey && totalRow[valKey] !== undefined)
                            ? totalRow[valKey]
                            : totalRow[c.key] !== undefined
                            ? totalRow[c.key]
                            : totalRow[c.label] !== undefined
                            ? totalRow[c.label]
                            : totalRow[i] !== undefined
                            ? totalRow[i]
                            : i === 0
                            ? <strong>Total</strong>
                            : "";
                        return (
                          <td
                            key={i}
                            className={c.align === "right" ? "fm-text-right" : undefined}
                          >
                            {cell}
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {pages > 1 && (
              <TablePagination
                currentPage={current}
                totalPages={pages}
                onPageChange={setPage}
              />
            )}
          </>
        ) : (
          <div className="fm-empty-state">
            <p>{empty}</p>
          </div>
        )}
      </FeeRequestState>
    );
  }

  function FeeDialog({ title, close, children, footer, wide = false }) {
    const ref = useRef(null),
      titleId = useId();
    useEffect(() => {
      const previous = document.activeElement,
        overflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      ref.current?.focus();
      return () => {
        document.body.style.overflow = overflow;
        previous?.focus();
      };
    }, []);
    const keydown = (e) => {
      if (e.key === "Tab") {
        const controls = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (!first) { e.preventDefault(); return; }
        if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first.focus(); }
      }
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    return (
      <div className="fs-overlay" onClick={close} onKeyDown={keydown}>
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`fm-dialog ${wide ? "fm-dialog--wide" : ""}`}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <header className="fm-dialog__header">
            <h2 id={titleId}>{title}</h2>
            <button
              type="button"
              className="fm-dialog__close"
              onClick={close}
              aria-label="Close"
            >
              <FiX />
            </button>
          </header>
          <div className="fm-dialog__body">{children}</div>
          {footer && <footer className="fm-dialog__footer">{footer}</footer>}
        </div>
      </div>
    );
  }

  function FeeReview({ value: s, section = "all", showTotals = true, showLateRules = true }) {
    return (
      <div className="fm-review-block">
        <dl className="fm-review-grid">
          <div>
            <dt>Fee Plan</dt>
            <dd>{s.name || "Untitled Plan"}</dd>
          </div>
          <div>
            <dt>Academic Year</dt>
            <dd>{s.academicYearName || "—"}</dd>
          </div>
          <div>
            <dt>Program / Course</dt>
            <dd>{s.courseName || "—"}</dd>
          </div>
          <div>
            <dt>Branch</dt>
            <dd>{s.branchName || "—"}</dd>
          </div>
          <div>
            <dt>Batch</dt>
            <dd>{s.batch || "—"}</dd>
          </div>
          <div>
            <dt>Category</dt>
            <dd>{s.applicableTo === "All Students" ? "All Students" : s.category || "All Students"}</dd>
          </div>
          <div>
            <dt>Payment Plan</dt>
            <dd>{s.plan || "Full Payment"}</dd>
          </div>
          <div>
            <dt>Total Fee</dt>
            <dd>{feeMoney(feeTotal(s))}</dd>
          </div>
        </dl>
      </div>
    );
  }

  function FeePlanPreview({ title, groups, total, status = "Draft" }) {
    return (
      <aside className="fm-live-preview" aria-label="Live Preview">
        <header className="fm-live-preview__header">
          <div>
            <h2>Live Preview</h2>
            <p>Updates as you configure the fee plan.</p>
          </div>
          <FeeBadge value={status} />
        </header>
        <div className="fm-live-preview__body">
          <h3>{title}</h3>
          {groups.map(({ label, rows }) => (
            <section className="fm-preview-section" key={label}>
              <h4>{label}</h4>
              <dl>
                {rows.map(([name, value], index) => (
                  <div key={`${name}-${index}`}>
                    <dt>{name}</dt>
                    <dd>{value || <span className="fm-preview-empty">Not selected</span>}</dd>
                  </div>
                ))}
              </dl>
              {label === "Fee Breakdown" && (
                <div className="fm-preview-total">
                  <span>Total Fee</span><strong>{feeMoney(total)}</strong>
                </div>
              )}
            </section>
          ))}
        </div>
      </aside>
    );
  }

  function FeeRowActions({ children }) {
    const id = useId(), popover = useRef(null), trigger = useRef(null);
    const [position, setPosition] = useState({});
    const [open, setOpen] = useState(false);
    const closeOnEscape = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        popover.current?.hidePopover();
        trigger.current?.focus();
      }
    };
    return (
      <>
        <button
          type="button"
          ref={trigger}
          className="fm-icon-btn"
          aria-label="Fee plan actions"
          title="Fee plan actions"
          aria-expanded={open}
          onKeyDown={closeOnEscape}
          popoverTarget={id}
          onClick={event => {
            const rect = event.currentTarget.getBoundingClientRect();
            const height = external0.Children.toArray(children).length * 34 + 12;
            setPosition({
              left: Math.max(8, Math.min(rect.right - 180, window.innerWidth - 188)),
              top: rect.bottom + height < window.innerHeight - 8 ? rect.bottom + 4 : Math.max(8, rect.top - height - 4),
            });
          }}
        >
          <FiMoreHorizontal />
        </button>
        <div
          id={id}
          ref={popover}
          popover="auto"
          className="fm-row-action-menu"
          style={position}
          aria-label="Fee plan actions"
          onKeyDown={closeOnEscape}
          onToggle={event => {
            const nextOpen = event.newState === "open";
            setOpen(nextOpen);
            if (nextOpen) popover.current?.querySelector("button:not(:disabled)")?.focus();
          }}
        >
          {external0.Children.map(children, child => external0.isValidElement(child) ? external0.cloneElement(child, {
            className: child.props.className?.includes("danger") ? "fm-row-action--danger" : "",
            onClick: event => { popover.current?.hidePopover(); child.props.onClick?.(event); },
          }, child.props.children, <span>{child.props.title}</span>) : child)}
        </div>
      </>
    );
  }

  function financialLedgerRows(assignment, ledger, concessions) {
    const entries = [
      {
        id: assignment.id,
        date: assignment.at,
        reference: assignment.structure.name,
        description: "Original fee plan assignment",
        debit: ledger.total,
        credit: 0,
        order: 0,
      },
      ...ledger.payments.map((p) => ({
        id: p.id,
        date: p.date,
        reference: p.receipt,
        description: `Payment · ${p.mode}`,
        debit: 0,
        credit: cents(p.amount),
        order: 2,
      })),
      ...concessions
        .filter((c) => c.status === "Approved")
        .map((c) => ({
          id: c.id,
          date: c.updatedAt,
          reference: c.id,
          description: c.reason,
          debit: 0,
          credit: c.amount,
          order: 1,
        })),
      ...ledger.refunds.map((r) => ({
        id: r.id,
        date: r.updatedAt,
        reference: r.id,
        description: `Refund · ${r.reason}`,
        debit: r.amount,
        credit: 0,
        order: 3,
      })),
    ].sort(
      (a, b) =>
        String(a.date).slice(0, 10).localeCompare(String(b.date).slice(0, 10)) ||
        a.order - b.order
    );
    return entries.reduce(
      (rows, r) => [
        ...rows,
        { ...r, balance: (rows.at(-1)?.balance || 0) + r.debit - r.credit },
      ],
      []
    );
  }

  // ==========================================================================
  // COMPLETE REFACTOR: CREATE ACADEMIC FEE PLAN (ONE SURFACE, 3 SECTIONS)
  // ==========================================================================
  function CreateAcademicFeePlan({
    value,
    masters,
    components = [],
    existingStructures = [],
    students = [],
    close,
    save,
  }) {
    const [s, set] = useState(() => ({ ...structuredClone(value), plan: value.plan === "Installments" ? "Installment Plan" : value.plan }));
    const [error, setError] = useState("");
    const [showAddCharge, setShowAddCharge] = useState(false);
    const [chargeSearch, setChargeSearch] = useState("");
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const patch = (change) => {
      set((curr) => ({ ...curr, ...change }));
      setError("");
    };

    const branches = masters.branches.filter(
      (b) => !s.courseId || String(b.courseId) === String(s.courseId)
    );
    const semesters = masters.semesters.filter(
      (r) =>
        (!r.courseId || String(r.courseId) === String(s.courseId)) &&
        (!r.branchId || String(r.branchId) === String(s.branchId)) &&
        (!r.academicYearId || String(r.academicYearId) === String(s.academicYearId))
    );
    const batches = masters.batchScopes
      ? [
          ...new Set(
            masters.batchScopes
              .filter(
                (r) =>
                  (!s.courseId || String(r.courseId) === String(s.courseId)) &&
                  (!s.branchId || String(r.branchId) === String(s.branchId)) &&
                  (!r.academicYearId ||
                    String(r.academicYearId) === String(s.academicYearId))
              )
              .map((r) => r.batch)
              .filter(Boolean)
          ),
        ]
      : masters.batches;

    const total = feeTotal(s);
    const scheduled = s.installments.reduce(
      (sum, i) => sum + (Number(i.amount) || 0),
      0
    );
    const remaining = total - scheduled;

    // Available charges from configured master components
    const availableCharges = components.filter(
      (c) =>
        c.status === "Active" &&
        academicFeeComponent(c) &&
        !s.components.some((row) => row.masterId === c.id)
    );

    const addCharge = (master) => {
      patch({
        components: [
          ...s.components,
          {
            masterId: master.id,
            name: master.name,
            category: master.category || "Academic",
            frequency: master.frequency || "Yearly",
            mandatory: master.mandatory ?? true,
            refundable: master.refundable ?? false,
            recurring: master.recurring ?? true,
            amount: "",
          },
        ],
      });
      setShowAddCharge(false);
      setChargeSearch("");
    };

    const removeCharge = (masterId) => {
      patch({
        components: s.components.filter((c) => c.masterId !== masterId),
      });
    };

    const updateChargeAmount = (masterId, amount) => {
      patch({
        components: s.components.map((c) =>
          c.masterId === masterId ? { ...c, amount } : c
        ),
      });
    };

    const addInstallment = () => {
      const num = s.installments.length + 1;
      const defaultDate = new Date();
      defaultDate.setMonth(defaultDate.getMonth() + (num - 1) * 3);
      const isoDate = defaultDate.toISOString().slice(0, 10);
      patch({
        installments: [
          ...s.installments,
          {
            id: uid("INST"),
            name: `${num}${num === 1 ? "st" : num === 2 ? "nd" : num === 3 ? "rd" : "th"} Payment`,
            dueDate: isoDate,
            amount: s.installments.length === 0 ? String(total) : "",
          },
        ],
      });
    };

    const removeInstallment = (id) => {
      patch({
        installments: s.installments.filter((i) => i.id !== id),
      });
    };

    const updateInstallment = (id, key, val) => {
      patch({
        installments: s.installments.map((i) =>
          i.id === id ? { ...i, [key]: val } : i
        ),
      });
    };

    const validate = (targetStatus) => {
      if (!s.academicYearId) return "Select an academic year.";
      if (!s.courseId) return "Select a program / course.";
      if (!s.branchId) return "Select a branch.";
      if (!s.batch?.trim()) return "Select a batch.";
      if (s.applicableTo === "Selected Category" && !s.category)
        return "Select a student category / quota.";

      if (targetStatus !== "Draft") {
        if (!s.components.length)
          return "Add at least one charge to the fee breakdown.";
        if (s.components.some((c) => !Number(c.amount) || Number(c.amount) <= 0))
          return "All charges must have positive amounts.";

        if (s.plan === "Full Payment") {
          if (!s.dueDate) return "Select a payment due date.";
        } else {
          if (!s.installments.length)
            return "Add at least one installment to the payment schedule.";
          if (s.installments.some((i) => !i.dueDate || !Number(i.amount)))
            return "Every installment requires a due date and amount.";
          if (Math.abs(remaining) > 0.01)
            return `Payment installments must equal total fee. Remaining balance is ${feeMoney(remaining)}.`;
        }
      }
      return "";
    };

    const handleSubmit = (targetStatus) => {
      const err = validate(targetStatus);
      if (err) {
        setError(err);
        return;
      }
      // Populate names
      const payload = {
        ...s,
        status: targetStatus,
        academicYearName:
          masters.years.find((y) => String(y.id) === String(s.academicYearId))
            ?.name || s.academicYearName,
        courseName:
          masters.courses.find((c) => String(c.id) === String(s.courseId))
            ?.name || s.courseName,
        branchName:
          masters.branches.find((b) => String(b.id) === String(s.branchId))
            ?.name || s.branchName,
        name:
          s.name?.trim() ||
          `${masters.courses.find((c) => String(c.id) === String(s.courseId))?.name || "Program"} ${masters.branches.find((b) => String(b.id) === String(s.branchId))?.name || "Branch"} ${s.batch || ""}`.trim(),
      };
      try { save(payload, targetStatus); }
      catch (reason) { setError(reason.message || "Unable to save the fee plan."); }
    };

    return (
      <div className="fm-create-plan-container">
        {/* Page Header */}
        <header className="fm-page-header">
          <div>
            <button
              type="button"
              className="fm-back-btn"
              onClick={close}
            >
              <FiArrowLeft /> Back to Fee Plans
            </button>
            <h1>{s.id ? "Edit Academic Fee Plan" : "Create Academic Fee Plan"}</h1>
            <p>Set the fee amount and payment terms for a student group.</p>
          </div>
        </header>

        <div className="fm-create-layout">
        <div className="fm-create-form-panel">
        {error && (
          <div className="fm-error-banner" role="alert">
            <FiAlertTriangle />
            <span>{error}</span>
          </div>
        )}
        <div className="fm-create-form-body">
          {/* SECTION 1: Who should pay this fee? */}
          <section className="fm-form-section">
            <div className="fm-section-header">
              <h2>1. Student Applicability</h2>
              <p>Choose the student group this fee applies to.</p>
            </div>

            <div className="fm-form-grid">
              <FeeSelect
                label="Academic Year *"
                value={s.academicYearId || ""}
                options={[{ id: "", name: "Select Academic Year" }, ...masters.years]}
                onChange={(academicYearId) => patch({ academicYearId })}
              />

              <FeeSelect
                label="Course *"
                value={s.courseId || ""}
                options={[{ id: "", name: "Select Course / Program" }, ...masters.courses]}
                onChange={(courseId) => patch({ courseId, branchId: "", semesterId: "" })}
              />

              <FeeSelect
                label="Branch *"
                value={s.branchId || ""}
                options={[{ id: "", name: "Select Branch" }, ...branches]}
                onChange={(branchId) => patch({ branchId, semesterId: "" })}
              />

              <FeeSelect
                label="Batch *"
                value={s.batch || ""}
                options={[{ id: "", name: "Select Batch" }, ...batches.map((b) => ({ id: b, name: b }))]}
                onChange={(batch) => patch({ batch })}
              />

              <FeeSelect
                label="Student Category / Quota"
                value={s.category || ""}
                options={[
                  { id: "", name: "All Students" },
                  { id: "Convener", name: "Convener Quota" },
                  { id: "Management", name: "Management Quota" },
                  { id: "NRI", name: "NRI Quota" },
                  { id: "Lateral Entry", name: "Lateral Entry" },
                  { id: "Sports", name: "Sports Quota" },
                ]}
                onChange={(category) =>
                  patch({
                    category,
                    applicableTo: category ? "Selected Category" : "All Students",
                  })
                }
              />

              <FeeSelect
                label="Fee Cycle"
                value={s.cycle || "Yearly"}
                options={[
                  { id: "Yearly", name: "Yearly (Per Academic Year)" },
                  { id: "Semester-wise", name: "Semester-wise" },
                ]}
                onChange={(cycle) => patch({ cycle, semesterId: "" })}
              />

              {s.cycle === "Semester-wise" && (
                <FeeSelect
                  label="Semester *"
                  value={s.semesterId || ""}
                  options={[{ id: "", name: "Select Semester" }, ...semesters]}
                  onChange={(semesterId) => patch({ semesterId })}
                />
              )}
            </div>
          </section>

          {/* SECTION 2: What should they pay? */}
          <section className="fm-form-section">
            <div className="fm-section-header">
              <h2>2. Fee Breakdown</h2>
              <p>Add the charges that make up this fee plan.</p>
            </div>

            <div className="fm-breakdown-container">
              {s.components.length === 0 ? (
                <div className="fm-breakdown-empty">
                  <p>No charges added yet. Click "+ Add another charge" to select charges.</p>
                </div>
              ) : (
                <div className="fm-breakdown-list">
                  <div className="fm-breakdown-head">
                    <span>Charge</span>
                    <span className="fm-text-right">Amount</span>
                    <span />
                  </div>
                  {s.components.map((c) => (
                    <div key={c.masterId} className="fm-breakdown-row">
                      <span className="fm-charge-name">{c.name}</span>
                      <div className="fm-amount-input-wrap">
                        <span className="fm-currency-symbol">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          aria-label={`${c.name} amount`}
                          value={c.amount}
                          onChange={(e) => updateChargeAmount(c.masterId, e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="fm-remove-btn"
                        onClick={() => removeCharge(c.masterId)}
                        title="Remove charge"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="fm-breakdown-actions">
                <button
                  type="button"
                  className="erp-btn erp-btn--secondary fm-add-charge-btn"
                  onClick={() => setShowAddCharge(true)}
                >
                  <FiPlus /> Add another charge
                </button>
              </div>

              {/* Total Fee display */}
              <div className="fm-total-fee-row">
                <span className="fm-total-label">Total Fee</span>
                <strong className="fm-total-value">{feeMoney(total)}</strong>
              </div>
            </div>
          </section>

          {/* SECTION 3: When should they pay? */}
          <section className="fm-form-section">
            <div className="fm-section-header">
              <h2>3. Payment Schedule</h2>
              <p>Set whether students pay all at once or in scheduled installments.</p>
            </div>

            {/* Payment Mode Radio Options */}
            <div className="fm-radio-group">
              <label className={`fm-radio-card ${s.plan === "Full Payment" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="paymentPlan"
                  checked={s.plan === "Full Payment"}
                  onChange={() => patch({ plan: "Full Payment" })}
                />
                <div>
                  <strong>Pay in Full</strong>
                </div>
              </label>

              <label className={`fm-radio-card ${s.plan === "Installment Plan" ? "active" : ""}`}>
                <input
                  type="radio"
                  name="paymentPlan"
                  checked={s.plan === "Installment Plan"}
                  onChange={() => {
                    patch({ plan: "Installment Plan" });
                    if (!s.installments.length) addInstallment();
                  }}
                />
                <div>
                  <strong>Pay in Installments</strong>
                </div>
              </label>
            </div>

            {/* Pay in Full View */}
            {s.plan === "Full Payment" && (
              <div className="fm-form-grid fm-schedule-single">
                <FeeInput
                  label="Due Date *"
                  type="date"
                  value={s.dueDate || ""}
                  onChange={(dueDate) => patch({ dueDate })}
                />
                <div className="fm-static-field">
                  <span className="fs-field-label">Amount</span>
                  <div className="fm-static-value">{feeMoney(total)}</div>
                </div>
              </div>
            )}

            {/* Pay in Installments View */}
            {s.plan === "Installment Plan" && (
              <div className="fm-installments-container">
                <div className="fm-installments-list">
                  <div className="fm-installments-head">
                    <span>Payment</span>
                    <span>Due Date</span>
                    <span className="fm-text-right">Amount</span>
                    <span />
                  </div>
                  {s.installments.map((inst, index) => (
                    <div key={inst.id} className="fm-installment-row">
                      <input
                        type="text"
                        value={inst.name || `Payment ${index + 1}`}
                        onChange={(e) => updateInstallment(inst.id, "name", e.target.value)}
                        placeholder={`Installment ${index + 1}`}
                        className="fm-inst-name-input"
                        aria-label={`Payment ${index + 1} name`}
                      />
                      <input
                        type="date"
                        value={inst.dueDate || ""}
                        onChange={(e) => updateInstallment(inst.id, "dueDate", e.target.value)}
                        className="fm-inst-date-input"
                        aria-label={`Payment ${index + 1} due date`}
                      />
                      <div className="fm-amount-input-wrap">
                        <span className="fm-currency-symbol">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          aria-label={`Payment ${index + 1} amount`}
                          value={inst.amount}
                          onChange={(e) => updateInstallment(inst.id, "amount", e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        className="fm-remove-btn"
                        onClick={() => removeInstallment(inst.id)}
                        disabled={s.installments.length <= 1}
                        title="Remove installment"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="erp-btn erp-btn--secondary fm-add-inst-btn"
                  onClick={addInstallment}
                >
                  <FiPlus /> Add Installment
                </button>

                {/* Balance validation block */}
                <div className="fm-installment-totals">
                  <div className="fm-inst-totals-row">
                    <span>Total Fee:</span>
                    <strong>{feeMoney(total)}</strong>
                  </div>
                  <div className="fm-inst-totals-row">
                    <span>Scheduled:</span>
                    <strong>{feeMoney(scheduled)}</strong>
                  </div>
                  <div className="fm-inst-totals-row">
                    <span>Remaining:</span>
                    <strong>{feeMoney(remaining)}</strong>
                  </div>
                  {Math.abs(remaining) <= 0.01 && s.installments.length > 0 ? (
                    <div className="fm-balanced-notice">
                      <FiCheckCircle /> Payment schedule matches the total fee.
                    </div>
                  ) : (
                    <div className="fm-unbalanced-notice">
                      Scheduled payments must equal total fee. Difference: {feeMoney(remaining)}.
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Advanced Options (Collapsible) */}
          <section className="fm-form-section fm-advanced-section">
            <button
              type="button"
              className="fm-advanced-toggle"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen((o) => !o)}
            >
              <span>Advanced Options (Grace Period, Late Fees &amp; Penalty Rules)</span>
              {advancedOpen ? <FiChevronDown /> : <FiChevronRight />}
            </button>

            {advancedOpen && (
              <div className="fm-form-grid fm-advanced-content">
                <FeeInput
                  label="Grace Period (days)"
                  type="number"
                  min="0"
                  max="365"
                  value={s.grace ?? 0}
                  onChange={(grace) => patch({ grace })}
                />

                <FeeSelect
                  label="Penalty Type"
                  value={s.penaltyType || "None"}
                  options={[
                    { id: "None", name: "No Penalty" },
                    { id: "Fixed Amount", name: "Fixed Amount" },
                    { id: "Percentage", name: "Percentage" },
                  ]}
                  onChange={(penaltyType) => patch({ penaltyType })}
                />

                {s.penaltyType !== "None" && (
                  <>
                    <FeeInput
                      label="Penalty Value *"
                      type="number"
                      min="0"
                      step="0.01"
                      value={s.penaltyValue ?? 0}
                      onChange={(penaltyValue) => patch({ penaltyValue })}
                    />
                    <FeeInput
                      label="Maximum Penalty (optional)"
                      type="number"
                      min="0"
                      step="0.01"
                      value={s.maximumPenalty ?? ""}
                      onChange={(maximumPenalty) => patch({ maximumPenalty })}
                    />
                  </>
                )}

                <FeeInput
                  label="Effective From"
                  type="date"
                  value={s.effectiveFrom || ""}
                  onChange={(effectiveFrom) => patch({ effectiveFrom })}
                />

                <FeeInput
                  label="Effective To (optional)"
                  type="date"
                  value={s.effectiveTo || ""}
                  onChange={(effectiveTo) => patch({ effectiveTo })}
                />
              </div>
            )}
          </section>
        </div>

        {/* Sticky Form Footer */}
        <footer className="fm-sticky-footer">
          <button
            type="button"
            className="erp-btn erp-btn--secondary"
            onClick={close}
          >
            Cancel
          </button>
          <div className="fm-footer-right">
            <button
              type="button"
              className="erp-btn erp-btn--secondary"
              onClick={() => handleSubmit("Draft")}
            >
              Save Draft
            </button>
            <button
              type="button"
              className="erp-btn erp-btn--primary"
              onClick={() => handleSubmit("Pending Approval")}
            >
              Submit for Approval
            </button>
          </div>
        </footer>
        </div>
        <FeePlanPreview
          title={s.name || "Academic Fee Plan"}
          status={s.status}
          total={total}
          groups={[
            { label: "Academic Details", rows: [
              ["Plan Type", "Academic Fee"],
              ["Academic Year", masters.years.find(y => String(y.id) === String(s.academicYearId))?.name || s.academicYearName],
              ["Course", masters.courses.find(c => String(c.id) === String(s.courseId))?.name || s.courseName],
              ["Branch", masters.branches.find(b => String(b.id) === String(s.branchId))?.name || s.branchName],
              ["Batch", s.batch],
              ["Category", s.applicableTo === "Selected Category" ? s.category : "All Students"],
            ] },
            { label: "Fee Breakdown", rows: s.components.length
              ? s.components.map(c => [c.name, c.amount === "" ? "Amount not entered" : feeMoney(c.amount)])
              : [["Charges", "No charges selected"]] },
            { label: "Payment", rows: s.plan === "Full Payment"
              ? [["Payment Type", "Pay in Full"], ["Due Date", s.dueDate], ["Amount", feeMoney(total)]]
              : [["Payment Type", `${s.installments.length} Installments`], ...s.installments.map((i, index) => [
                i.name || `Payment ${index + 1}`,
                <><strong>{i.amount === "" ? "Amount not entered" : feeMoney(i.amount)}</strong><small>{i.dueDate || "Date not selected"}</small></>,
              ])] },
          ]}
        />
        </div>

        {/* Modal: Add Another Charge */}
        {showAddCharge && (
          <FeeDialog
            title="Add Charge"
            close={() => {
              setShowAddCharge(false);
              setChargeSearch("");
            }}
            footer={
              <button
                type="button"
                className="erp-btn erp-btn--secondary"
                onClick={() => {
                  setShowAddCharge(false);
                  setChargeSearch("");
                }}
              >
                Close
              </button>
            }
          >
            <div className="fm-add-charge-dialog">
              <div className="fm-search-bar">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Search available charges..."
                  value={chargeSearch}
                  onChange={(e) => setChargeSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="fm-charge-options-list">
                {availableCharges
                  .filter((c) =>
                    `${c.name} ${c.code || ""}`
                      .toLowerCase()
                      .includes(chargeSearch.toLowerCase())
                  )
                  .map((charge) => (
                    <div
                      key={charge.id}
                      className="fm-charge-option-item"
                    >
                      <div>
                        <strong>{charge.name}</strong>
                        <small>{charge.category} · {charge.frequency || "Yearly"}</small>
                      </div>
                      <button type="button" className="erp-btn erp-btn--secondary erp-btn--sm" onClick={() => addCharge(charge)}>
                        Select
                      </button>
                    </div>
                  ))}

                {availableCharges.filter(c => (c.name + " " + (c.code || "")).toLowerCase().includes(chargeSearch.toLowerCase())).length === 0 && (
                  <p className="fm-empty-text">
                    {chargeSearch ? "No charges match your search." : "No additional active charges are available. Configure charges in Manage Charges."}
                  </p>
                )}
              </div>
            </div>
          </FeeDialog>
        )}
      </div>
    );
  }

  return {
    get FeeField() {
      return FeeField;
    },
    get FeeInput() {
      return FeeInput;
    },
    get FeeSelect() {
      return FeeSelect;
    },
    get FeeBadge() {
      return FeeBadge;
    },
    get financialLedgerRows() {
      return financialLedgerRows;
    },
    get FeeStats() {
      return FeeStats;
    },
    get FeeTable() {
      return FeeTable;
    },
    get FeeDialog() {
      return FeeDialog;
    },
    get FeeReview() {
      return FeeReview;
    },
    get FeePlanPreview() {
      return FeePlanPreview;
    },
    get FeeRowActions() {
      return FeeRowActions;
    },
    get default() {
      return CreateAcademicFeePlan;
    },
  };
})();

// ============================================================================
// MODULE 2: FEE STRUCTURE MODULE (NOW FEE PLANS: ACADEMIC, HOSTEL, TRANSPORT)
// ============================================================================
export const FeeStructureModule = (() => {
  const { useEffect, useMemo, useRef, useState } = external0;
  const { Link, useLocation, useNavigate, useParams } = external1;
  const {
    FiCheck,
    FiCopy,
    FiEdit2,
    FiEye,
    FiFilter,
    FiPlus,
    FiSearch,
    FiSettings,
    FiTrash2,
    FiX,
    FiArrowLeft,
    FiBookOpen,
    FiHome,
    FiTruck,
  } = external3;
  const { default: PageHeader } = PageHeaderModule;
  const { FeeInput, FeeSelect, FeeBadge, FeeDialog, FeeTable, FeeReview, FeePlanPreview, FeeRowActions } =
    FeeStructureWizardModule;
  const { default: ExportMenu } = ExportMenuModule;
  const {
    feeStructureColumns,
    hostelFeeColumns,
    transportFeeColumns,
  } = exportColumnsModule;
  const { default: DashboardLayout } = DashboardLayoutModule;
  const { academicYearApi, branchApi, courseApi, departmentApi } =
    apiEndpointsModule;
  const { getSemesters } = collegeApiModule;
  const { getOperationalAcademicYearOptions } = academicYearUtilsModule;
  const {
    blankAcademic,
    componentTotals,
    money,
    persistStructures,
    persistHostelStructures,
    persistTransportStructures,
    readHostelStructures,
    readStructures,
    readTransportStructures,
    saveAcademic,
    uid,
    workflowAcademicRow,
  } = feeStructureServiceModule;
  const { useAcademic } = AcademicContextModule;
  const { showError, showSuccess } = toastModule;
  const { default: useToastState } = useToastStateModule;

  const STATUSES = ["All", "Active", "Draft", "Inactive"];

  const norm = (rows, ids, names) => {
    const map = new Map();
    for (const x of rows || []) {
      const id = ids.map((k) => x[k]).find((v) => v != null);
      const nameStr = names.map((k) => x[k]).find(Boolean);
      const cleanName = String(nameStr || "").trim();
      if (!id || !cleanName) continue;
      const key = String(id);
      if (!map.has(key)) map.set(key, { ...x, id, name: cleanName });
    }
    return Array.from(map.values());
  };

  const normSemesters = (response) => {
    const list = Array.isArray(response)
      ? response
      : response?.data || response?.items || [];
    return list
      .map((x) => ({
        ...x,
        id: x.semesterId || x.id,
        name: x.semesterName || x.name || `Semester ${x.semesterNumber || ""}`,
        courseId: x.courseId || "",
        branchId: x.branchId || "",
        academicYearId: x.academicYearId || "",
      }))
      .filter((x) => x.id && x.name);
  };

  // Facility (Hostel / Transport) Editor
  function FacilityEditor({ type, value, masters, close, save }) {
    const hostel = type === "hostel";
    const [form, setForm] = useState(() => structuredClone(value));
    const [error, setError] = useState("");

    const patch = (change) => {
      setForm((curr) => ({ ...curr, ...change }));
      setError("");
    };

    const validate = () => {
      if (!form.academicYearId) return "Select an academic year.";
      if (hostel) {
        if (!form.hostelName?.trim()) return "Enter hostel name.";
        if (!form.roomType?.trim()) return "Enter room type.";
        if (!Number(form.fee) || Number(form.fee) <= 0)
          return "Enter a valid positive fee amount.";
      } else {
        if (!form.route?.trim()) return "Enter transit route name.";
        if (!form.pickupPoint?.trim()) return "Enter pickup boarding stop.";
        if (!Number(form.fee) || Number(form.fee) <= 0)
          return "Enter a valid positive route fee.";
      }
      return "";
    };

    const submit = (status = "Active") => {
      const err = validate();
      if (err) {
        setError(err);
        return;
      }
      try { save(type, {
        ...form,
        status,
        academicYearName:
          masters.years.find((y) => String(y.id) === String(form.academicYearId))
            ?.name || form.academicYearName,
      }); } catch (reason) { setError(reason.message || "Unable to save this fee plan."); }
    };

    return (
      <div className="fm-create-plan-container">
        <header className="fm-page-header">
          <div>
            <button type="button" className="fm-back-btn" onClick={close}>
              <FiArrowLeft /> Back to Fee Plans
            </button>
            <h1>
              {form.id
                ? `Edit ${hostel ? "Hostel" : "Transport"} Fee Plan`
                : `Create ${hostel ? "Hostel" : "Transport"} Fee Plan`}
            </h1>
            <p>
              {hostel
                ? "Configure room occupancy and residential accommodation rates."
                : "Configure campus bus routes, pickup stops and transit fares."}
            </p>
          </div>
        </header>

        <div className="fm-create-layout">
        <div className="fm-create-form-panel">
        {error && (
          <div className="fm-error-banner" role="alert">
            <FiX />
            <span>{error}</span>
          </div>
        )}
        <div className="fm-create-form-body">
          {/* Section 1 */}
          <section className="fm-form-section">
            <div className="fm-section-header">
              <h2>1. {hostel ? "Who is this fee for?" : "Which transport service?"}</h2>
              <p>
                {hostel
                  ? "Select academic year and hostel accommodation specifications."
                  : "Specify bus corridor, boarding stop and distance."}
              </p>
            </div>

            <div className="fm-form-grid">
              <FeeSelect
                label="Academic Year *"
                value={form.academicYearId || ""}
                options={[{ id: "", name: "Select Academic Year" }, ...masters.years]}
                onChange={(academicYearId) => patch({ academicYearId })}
              />

              {hostel ? (
                <>
                  <FeeInput
                    label="Hostel Name *"
                    placeholder="e.g. Cauvery Bhavan (Boys)"
                    value={form.hostelName || ""}
                    onChange={(hostelName) => patch({ hostelName })}
                  />
                  <FeeSelect
                    label="Hostel Type"
                    value={form.hostelType || "Boys Hostel"}
                    options={[
                      { id: "Boys Hostel", name: "Boys Hostel" },
                      { id: "Girls Hostel", name: "Girls Hostel" },
                      { id: "Co-ed Residence", name: "Co-ed Residence" },
                    ]}
                    onChange={(hostelType) => patch({ hostelType })}
                  />
                  <FeeInput
                    label="Room Type *"
                    placeholder="e.g. 2-Sharing, Single AC"
                    value={form.roomType || ""}
                    onChange={(roomType) => patch({ roomType })}
                  />
                  <FeeSelect
                    label="AC Category"
                    value={form.acType || "Non-AC"}
                    options={[
                      { id: "Non-AC", name: "Non-AC" },
                      { id: "AC Room", name: "AC Room" },
                    ]}
                    onChange={(acType) => patch({ acType })}
                  />
                  <FeeInput
                    label="Mess Plan"
                    placeholder="e.g. Standard Veg & Non-Veg"
                    value={form.messPlan || ""}
                    onChange={(messPlan) => patch({ messPlan })}
                  />
                </>
              ) : (
                <>
                  <FeeInput
                    label="Route Name *"
                    placeholder="e.g. Route 101 - City Central"
                    value={form.route || ""}
                    onChange={(route) => patch({ route })}
                  />
                  <FeeInput
                    label="Route Code"
                    placeholder="e.g. RTE-101"
                    value={form.routeCode || ""}
                    onChange={(routeCode) => patch({ routeCode })}
                  />
                  <FeeInput
                    label="Boarding Stop *"
                    placeholder="e.g. Central Bus Station"
                    value={form.pickupPoint || ""}
                    onChange={(pickupPoint) => patch({ pickupPoint })}
                  />
                  <FeeInput
                    label="Distance (km)"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 15.5"
                    value={form.distance || ""}
                    onChange={(distance) => patch({ distance })}
                  />
                </>
              )}
            </div>
          </section>

          {/* Section 2 */}
          <section className="fm-form-section">
            <div className="fm-section-header">
              <h2>2. Fee Breakdown</h2>
              <p>Set the standard fee amount and billing frequency.</p>
            </div>

            <div className="fm-form-grid">
              <FeeInput
                label="Fee Rate (₹) *"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.fee || ""}
                onChange={(fee) => patch({ fee })}
              />
              <FeeSelect
                label="Billing Frequency"
                value={form.frequency || (hostel ? "Annual" : "Per Semester")}
                options={[
                  { id: "Annual", name: "Annual / Per Academic Year" },
                  { id: "Per Semester", name: "Per Semester" },
                  { id: "Monthly", name: "Monthly" },
                ]}
                onChange={(frequency) => patch({ frequency })}
              />
              {hostel && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <FeeInput
                    label="Fee Inclusions Description"
                    placeholder="e.g. Room Rent: ₹40,000, Mess: ₹25,000, Caution Deposit: ₹5,000"
                    value={form.componentsText || ""}
                    onChange={(componentsText) => patch({ componentsText })}
                  />
                </div>
              )}
            </div>
          </section>

          {/* Section 3 */}
          <section className="fm-form-section">
            <div className="fm-section-header">
              <h2>3. Payment Schedule</h2>
              <p>Set effective billing validity dates.</p>
            </div>

            <div className="fm-form-grid">
              <FeeInput
                label="Effective From"
                type="date"
                value={form.effectiveFrom || ""}
                onChange={(effectiveFrom) => patch({ effectiveFrom })}
              />
              <FeeInput
                label="Effective To"
                type="date"
                value={form.effectiveTo || ""}
                onChange={(effectiveTo) => patch({ effectiveTo })}
              />
            </div>
          </section>
        </div>

        {/* Sticky Footer */}
        <footer className="fm-sticky-footer">
          <button type="button" className="erp-btn erp-btn--secondary" onClick={close}>
            Cancel
          </button>
          <div className="fm-footer-right">
            <button
              type="button"
              className="erp-btn erp-btn--secondary"
              onClick={() => submit("Draft")}
            >
              Save Draft
            </button>
            <button
              type="button"
              className="erp-btn erp-btn--primary"
              onClick={() => submit("Active")}
            >
              Activate Fee Plan
            </button>
          </div>
        </footer>
        </div>
        <FeePlanPreview
          title={hostel ? "Hostel Fee Plan" : "Transport Fee Plan"}
          status={form.status}
          total={Number(form.fee) || 0}
          groups={[
            { label: hostel ? "Accommodation Details" : "Transport Details", rows: [
              ["Plan Type", hostel ? "Hostel Fee" : "Transport Fee"],
              ["Academic Year", masters.years.find(y => String(y.id) === String(form.academicYearId))?.name || form.academicYearName],
              ...(hostel
                ? [["Hostel", form.hostelName], ["Hostel Type", form.hostelType || "Boys Hostel"], ["Room / Occupancy", form.roomType], ["AC Category", form.acType || "Non-AC"], ["Mess Plan", form.messPlan]]
                : [["Route", form.route], ["Route Code", form.routeCode], ["Boarding Stop", form.pickupPoint], ["Distance", form.distance ? `${form.distance} km` : ""]]),
            ] },
            { label: "Fee Breakdown", rows: [
              [hostel ? "Accommodation Rate" : "Route Rate", form.fee === "" ? "Amount not entered" : money(form.fee)],
              ...(hostel && form.componentsText ? [["Inclusions", form.componentsText]] : []),
            ] },
            { label: "Payment", rows: [
              ["Billing Frequency", form.frequency || (hostel ? "Annual" : "Per Semester")],
              ["Effective From", form.effectiveFrom], ["Effective To", form.effectiveTo || "Open ended"],
              ["Payment Schedule", "Not configured in this service plan"],
            ] },
          ]}
        />
        </div>
      </div>
    );
  }

  // Facility Preview / Details Modal
  function FacilityDetails({ type, value, close, edit }) {
    const hostel = type === "hostel";
    return (
      <FeeDialog
        title={`${hostel ? "Hostel" : "Transport"} Fee Plan Details`}
        close={close}
        footer={
          <>
            <button type="button" className="erp-btn erp-btn--secondary" onClick={close}>
              Close
            </button>
            <button type="button" className="erp-btn erp-btn--primary" onClick={edit}>
              <FiEdit2 /> Edit Plan
            </button>
          </>
        }
      >
        <div className="fm-dialog-details">
          <dl className="fm-review-grid">
            <div>
              <dt>Academic Year</dt>
              <dd>{value.academicYearName || "—"}</dd>
            </div>
            <div>
              <dt>{hostel ? "Hostel" : "Route"}</dt>
              <dd>{hostel ? value.hostelName : value.route}</dd>
            </div>
            <div>
              <dt>{hostel ? "Room / Type" : "Boarding Stop"}</dt>
              <dd>{hostel ? `${value.roomType} (${value.acType || "Non-AC"})` : value.pickupPoint}</dd>
            </div>
            <div>
              <dt>{hostel ? "Mess Plan" : "Distance"}</dt>
              <dd>{hostel ? value.messPlan || "Standard" : `${value.distance || 0} km`}</dd>
            </div>
            <div>
              <dt>Fee Rate</dt>
              <dd><strong>{money(value.fee)}</strong></dd>
            </div>
            <div>
              <dt>Frequency</dt>
              <dd>{value.frequency || (hostel ? "Annual" : "Per Semester")}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd><FeeBadge value={value.status} /></dd>
            </div>
            <div>
              <dt>Effective Period</dt>
              <dd>{value.effectiveFrom || "Immediate"} to {value.effectiveTo || "Open"}</dd>
            </div>
          </dl>
        </div>
      </FeeDialog>
    );
  }

  // Details dialog for Academic Plans
  function PlanDetailsDialog({ row, close, edit }) {
    return (
      <FeeDialog
        title={row.name}
        close={close}
        footer={
          <>
            <button type="button" className="erp-btn erp-btn--secondary" onClick={close}>
              Close
            </button>
            <button type="button" className="erp-btn erp-btn--primary" onClick={edit}>
              <FiEdit2 /> Edit Fee Plan
            </button>
          </>
        }
      >
        <div className="fm-dialog-details">
          <dl className="fm-review-grid">
            <div>
              <dt>Academic Year</dt>
              <dd>{row.academicYearName || "—"}</dd>
            </div>
            <div>
              <dt>Program / Course</dt>
              <dd>{row.courseName || "—"}</dd>
            </div>
            <div>
              <dt>Branch</dt>
              <dd>{row.branchName || "—"}</dd>
            </div>
            <div>
              <dt>Batch</dt>
              <dd>{row.batch || "—"}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{row.category || "All Students"}</dd>
            </div>
            <div>
              <dt>Payment Mode</dt>
              <dd>{row.plan || "Full Payment"}</dd>
            </div>
            <div>
              <dt>Total Fee</dt>
              <dd><strong>{money(row.components ? feeStructureServiceModule.feeTotal(row) : componentTotals(row.feeComponents || []).total)}</strong></dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd><FeeBadge value={row.status} /></dd>
            </div>
          </dl>

          {row.components?.length > 0 && (
            <div style={{ marginTop: "16px" }}>
              <h4>Fee Breakdown</h4>
              <FeeTable
                rows={row.components}
                columns={[
                  { label: "Charge", key: "name" },
                  { label: "Amount", align: "right", render: (c) => money(c.amount) },
                ]}
              />
            </div>
          )}
        </div>
      </FeeDialog>
    );
  }

  // ==========================================================================
  // MAIN FEE PLANS PAGE (Destination 2)
  // ==========================================================================
  /* export default */ function FeePlans({
    embedded = false,
    workflow,
    facilityType,
  }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { facilityId } = useParams();
    const { scopeRecords, selectedAcademicYearId, selectedAcademicYear } =
      useAcademic();

    const [tab, setTab] = useState("academic");
    const [rows, setRows] = useState(readStructures);
    const [hostels, setHostels] = useState(readHostelStructures);
    const [transports, setTransports] = useState(readTransportStructures);
    const [allMasters, setMasters] = useState({
      years: [],
      departments: [],
      courses: [],
      branches: [],
      semesters: [],
    });
    const [loading, setLoading] = useState(true);
    const [lookupError, setLookupError] = useState("");
    const [, setToast] = useToastState("", "success");
    const [query, setQuery] = useState("");
    const [filters, setFilters] = useState({
      academicYearId: "",
      courseId: "",
      branchId: "",
      batch: "",
      status: "All",
    });
    const [hostelFilters, setHostelFilters] = useState({
      academicYearId: "",
      hostelName: "",
      roomType: "",
      status: "All",
    });
    const [transportFilters, setTransportFilters] = useState({
      academicYearId: "",
      route: "",
      pickupPoint: "",
      status: "All",
    });
    const [detailsModal, setDetailsModal] = useState(null);
    const [facilityDetailsModal, setFacilityDetailsModal] = useState(null);

    const masters = {
      ...allMasters,
      ...Object.fromEntries(
        ["departments", "courses", "branches", "semesters"].map((type) => [
          type,
          scopeRecords(allMasters[type]),
        ])
      ),
    };

    useEffect(() => {
      let active = true;
      const lookups = [
        academicYearApi.getAll(),
        departmentApi.getAll(),
        courseApi.getAll(),
        branchApi.getAll(),
        getSemesters(),
      ];
      Promise.all(lookups)
        .then(([y, d, c, b, s]) => {
          if (active) {
            setMasters({
              years: getOperationalAcademicYearOptions(y),
              departments: norm(d, ["departmentId", "id"], ["departmentName", "name"]),
              courses: norm(c, ["courseId", "id"], ["courseName", "name"]),
              branches: norm(b, ["branchId", "id"], ["branchName", "name"]),
              semesters: normSemesters(s),
            });
          }
        })
        .catch(reason => { if (active) setLookupError(reason.message || "Unable to load fee plan filters."); })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []);

    const academicRows = useMemo(() => {
      return [
        ...rows,
        ...(workflow?.rows || []).map((s) => ({
          ...workflowAcademicRow(s),
          assignedCount: (workflow?.assignments || []).filter(
            (a) => a.structureId === s.id
          ).length,
        })),
      ];
    }, [rows, workflow?.rows, workflow?.assignments]);

    const uniqueBatches = useMemo(() => {
      return [...new Set(academicRows.map((r) => r.batch).filter(Boolean))];
    }, [academicRows]);

    const uniqueHostelNames = useMemo(() => {
      return [...new Set(hostels.map((h) => h.hostelName).filter(Boolean))];
    }, [hostels]);

    const uniqueRoomTypes = useMemo(() => {
      return [...new Set(hostels.map((h) => h.roomType).filter(Boolean))];
    }, [hostels]);

    const uniqueRoutes = useMemo(() => {
      return [...new Set(transports.map((t) => t.route).filter(Boolean))];
    }, [transports]);

    const uniqueStops = useMemo(() => {
      return [...new Set(transports.map((t) => t.pickupPoint).filter(Boolean))];
    }, [transports]);

    const filteredAcademicRows = useMemo(() => {
      return academicRows.filter((row) => {
        const text = `${row.name} ${row.code} ${row.courseName} ${row.branchName} ${row.batch}`.toLowerCase();
        const matchesQuery = !query || text.includes(query.toLowerCase());
        const matchesYear =
          !filters.academicYearId ||
          String(row.academicYearId) === String(filters.academicYearId);
        const matchesCourse =
          !filters.courseId || String(row.courseId) === String(filters.courseId);
        const matchesBranch =
          !filters.branchId || String(row.branchId) === String(filters.branchId);
        const matchesBatch = !filters.batch || row.batch === filters.batch;
        const matchesStatus =
          filters.status === "All" || row.status === filters.status;
        return (
          matchesQuery &&
          matchesYear &&
          matchesCourse &&
          matchesBranch &&
          matchesBatch &&
          matchesStatus
        );
      });
    }, [academicRows, query, filters]);

    const filteredHostels = useMemo(() => {
      return hostels.filter((h) => {
        const text = `${h.hostelName} ${h.hostelType} ${h.roomType} ${h.messPlan}`.toLowerCase();
        const matchesQuery = !query || text.includes(query.toLowerCase());
        const matchesYear =
          !hostelFilters.academicYearId ||
          String(h.academicYearId) === String(hostelFilters.academicYearId);
        const matchesHostel =
          !hostelFilters.hostelName || h.hostelName === hostelFilters.hostelName;
        const matchesRoomType =
          !hostelFilters.roomType || h.roomType === hostelFilters.roomType;
        const matchesStatus =
          hostelFilters.status === "All" || h.status === hostelFilters.status;
        return (
          matchesQuery &&
          matchesYear &&
          matchesHostel &&
          matchesRoomType &&
          matchesStatus
        );
      });
    }, [hostels, query, hostelFilters]);

    const filteredTransports = useMemo(() => {
      return transports.filter((t) => {
        const text = `${t.route} ${t.routeCode} ${t.pickupPoint}`.toLowerCase();
        const matchesQuery = !query || text.includes(query.toLowerCase());
        const matchesYear =
          !transportFilters.academicYearId ||
          String(t.academicYearId) === String(transportFilters.academicYearId);
        const matchesRoute =
          !transportFilters.route || t.route === transportFilters.route;
        const matchesStop =
          !transportFilters.pickupPoint || t.pickupPoint === transportFilters.pickupPoint;
        const matchesStatus =
          transportFilters.status === "All" || t.status === transportFilters.status;
        return (
          matchesQuery &&
          matchesYear &&
          matchesRoute &&
          matchesStop &&
          matchesStatus
        );
      });
    }, [transports, query, transportFilters]);

    const isAcademicFiltered =
      Boolean(query) ||
      Boolean(filters.academicYearId) ||
      Boolean(filters.courseId) ||
      Boolean(filters.branchId) ||
      Boolean(filters.batch) ||
      filters.status !== "All";

    const clearAcademicFilters = () => {
      setQuery("");
      setFilters({
        academicYearId: "",
        courseId: "",
        branchId: "",
        batch: "",
        status: "All",
      });
    };

    const isHostelFiltered =
      Boolean(query) ||
      Boolean(hostelFilters.academicYearId) ||
      Boolean(hostelFilters.hostelName) ||
      Boolean(hostelFilters.roomType) ||
      hostelFilters.status !== "All";

    const clearHostelFilters = () => {
      setQuery("");
      setHostelFilters({
        academicYearId: "",
        hostelName: "",
        roomType: "",
        status: "All",
      });
    };

    const isTransportFiltered =
      Boolean(query) ||
      Boolean(transportFilters.academicYearId) ||
      Boolean(transportFilters.route) ||
      Boolean(transportFilters.pickupPoint) ||
      transportFilters.status !== "All";

    const clearTransportFilters = () => {
      setQuery("");
      setTransportFilters({
        academicYearId: "",
        route: "",
        pickupPoint: "",
        status: "All",
      });
    };

    const switchTab = (nextTab) => {
      setTab(nextTab);
      setQuery("");
    };

    const handleCreate = () => {
      if (tab === "academic") {
        navigate("/fees/structures/create");
      } else if (tab === "hostel") {
        navigate("/fees/structures/hostel/create");
      } else {
        navigate("/fees/structures/transport/create");
      }
    };

    const handleDuplicateDraft = (row) => {
      if (row.workflowStructure) { workflow.duplicate(row.workflowStructure); return; }
      const clone = {
        ...structuredClone(row),
        id: uid("FS"),
        name: `${row.name} (Copy)`,
        status: "Draft",
        assignedCount: 0,
      };
      const next = [clone, ...rows];
      persistStructures(next);
      setRows(next);
      setToast("Fee plan duplicated as draft.");
    };

    const handleDeleteDraft = (row) => {
      if (row.status !== "Draft") {
        alert("Only Draft fee plans can be deleted.");
        return;
      }
      if (!window.confirm(`Delete draft plan "${row.name}"?`)) return;
      if (row.workflowStructure) { workflow.remove(row.id); return; }
      const next = rows.filter((r) => r.id !== row.id);
      persistStructures(next);
      setRows(next);
      setToast("Draft fee plan deleted.");
    };

    const saveFacility = (type, val) => {
      val = { ...val, id: val.id || uid(type === "hostel" ? "HF" : "TF") };
      const target = type === "hostel" ? hostels : transports;
      const next = [val, ...target.filter((x) => x.id !== val.id)];
      if (type === "hostel") {
        persistHostelStructures(next);
        setHostels(next);
      } else {
        persistTransportStructures(next);
        setTransports(next);
      }
      setToast(`${type === "hostel" ? "Hostel" : "Transport"} fee plan saved.`);
      navigate("/fees/structures");
    };

    // If on facility editor sub-route
    if (facilityType) {
      const existing = facilityId
        ? (facilityType === "hostel" ? hostels : transports).find(
            (r) => r.id === facilityId
          )
        : null;
      const initial =
        existing || {
          id: "",
          academicYearId: selectedAcademicYearId || "",
          status: "Draft",
          fee: "",
        };

      return (
        <FacilityEditor
          type={facilityType}
          value={initial}
          masters={masters}
          close={() => navigate("/fees/structures")}
          save={saveFacility}
        />
      );
    }

    return (
      <div className="fm-page-container">
        {/* Page Header */}
        <header className="fm-page-header">
          <div>
            <h1>Fee Plans</h1>
            <p>Manage academic, hostel, and transport fee structures.</p>
          </div>
          <div className="fm-header-actions">
            <Link to="/fees/components" className="fm-btn-manage-charges">
              <FiSettings /> Manage Charges
            </Link>
          </div>
        </header>

        {lookupError && <div className="fm-error-banner" role="alert">{lookupError}</div>}
        {loading && <div className="fm-request-state" role="status">Loading fee plan filters...</div>}
        {/* Fee Type Navigation (Segmented Tabs) */}
        <nav className="fm-fee-type-nav" role="tablist" aria-label="Fee plan categories">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "academic"}
            className={`fm-fee-type-tab ${tab === "academic" ? "active" : ""}`}
            onClick={() => switchTab("academic")}
          >
            <FiBookOpen />
            <span>Academic Fees</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "hostel"}
            className={`fm-fee-type-tab ${tab === "hostel" ? "active" : ""}`}
            onClick={() => switchTab("hostel")}
          >
            <FiHome />
            <span>Hostel Fees</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "transport"}
            className={`fm-fee-type-tab ${tab === "transport" ? "active" : ""}`}
            onClick={() => switchTab("transport")}
          >
            <FiTruck />
            <span>Transport Fees</span>
          </button>
        </nav>

        {/* Main Workspace */}
        <div className="fm-plan-workspace">
          {/* Workspace Context Header */}
          <div className="fm-plan-workspace-header">
            <div className="fm-plan-context">
              <h2>
                {tab === "academic"
                  ? "Academic Fees"
                  : tab === "hostel"
                  ? "Hostel Fees"
                  : "Transport Fees"}
              </h2>
              <p>
                {tab === "academic"
                  ? "Course, branch, batch and category based student fee plans."
                  : tab === "hostel"
                  ? "Accommodation, room type and occupancy based fee plans."
                  : "Route and boarding-point based transport fee plans."}
              </p>
            </div>
            <button
              type="button"
              className="fm-btn-context-primary"
              onClick={handleCreate}
            >
              <FiPlus />
              <span>
                {tab === "academic"
                  ? "New Academic Plan"
                  : tab === "hostel"
                  ? "New Hostel Plan"
                  : "New Transport Plan"}
              </span>
            </button>
          </div>

          {/* Contextual Filter Toolbar */}
          {tab === "academic" && (
            <div className="fm-plan-filter-bar">
              <div className="fm-plan-search-wrap">
                <FiSearch />
                <input
                  type="text"
                  className="fm-plan-search-input"
                  aria-label="Search academic fee plans"
                  placeholder="Search fee plans..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    className="fm-plan-search-clear"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <FiX />
                  </button>
                )}
              </div>

              <select
                className="fm-filter-select fm-filter-select--year"
                value={filters.academicYearId}
                onChange={(e) => setFilters((f) => ({ ...f, academicYearId: e.target.value }))}
                aria-label="Filter by Academic Year"
              >
                <option value="">All Years</option>
                {masters.years.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>

              <select
                className="fm-filter-select fm-filter-select--course"
                value={filters.courseId}
                onChange={(e) => setFilters((f) => ({ ...f, courseId: e.target.value, branchId: "" }))}
                aria-label="Filter by Course"
              >
                <option value="">All Courses</option>
                {masters.courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                className="fm-filter-select fm-filter-select--branch"
                value={filters.branchId}
                onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
                aria-label="Filter by Branch"
              >
                <option value="">All Branches</option>
                {masters.branches
                  .filter((b) => !filters.courseId || String(b.courseId) === String(filters.courseId))
                  .map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
              </select>

              <select
                className="fm-filter-select fm-filter-select--batch"
                value={filters.batch}
                onChange={(e) => setFilters((f) => ({ ...f, batch: e.target.value }))}
                aria-label="Filter by Batch"
              >
                <option value="">All Batches</option>
                {uniqueBatches.map((batch) => (
                  <option key={batch} value={batch}>{batch}</option>
                ))}
              </select>

              <select
                className="fm-filter-select fm-filter-select--status"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                aria-label="Filter by Status"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Inactive">Inactive</option>
                {["Pending Approval", "Approved", "Published", "Archived"].map(status => <option key={status} value={status}>{status}</option>)}
              </select>

              {isAcademicFiltered && (
                <button
                  type="button"
                  className="fm-filter-clear-btn"
                  onClick={clearAcademicFilters}
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {tab === "hostel" && (
            <div className="fm-plan-filter-bar">
              <div className="fm-plan-search-wrap">
                <FiSearch />
                <input
                  type="text"
                  className="fm-plan-search-input"
                  aria-label="Search hostel fee plans"
                  placeholder="Search hostel or room..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    className="fm-plan-search-clear"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <FiX />
                  </button>
                )}
              </div>

              <select
                className="fm-filter-select fm-filter-select--year"
                value={hostelFilters.academicYearId}
                onChange={(e) => setHostelFilters((f) => ({ ...f, academicYearId: e.target.value }))}
                aria-label="Filter by Academic Year"
              >
                <option value="">All Years</option>
                {masters.years.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>

              <select
                className="fm-filter-select fm-filter-select--hostel"
                value={hostelFilters.hostelName}
                onChange={(e) => setHostelFilters((f) => ({ ...f, hostelName: e.target.value }))}
                aria-label="Filter by Hostel"
              >
                <option value="">All Hostels</option>
                {uniqueHostelNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              <select
                className="fm-filter-select fm-filter-select--room"
                value={hostelFilters.roomType}
                onChange={(e) => setHostelFilters((f) => ({ ...f, roomType: e.target.value }))}
                aria-label="Filter by Room Type"
              >
                <option value="">All Room Types</option>
                {uniqueRoomTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <select
                className="fm-filter-select fm-filter-select--status"
                value={hostelFilters.status}
                onChange={(e) => setHostelFilters((f) => ({ ...f, status: e.target.value }))}
                aria-label="Filter by Status"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Inactive">Inactive</option>
              </select>

              {isHostelFiltered && (
                <button
                  type="button"
                  className="fm-filter-clear-btn"
                  onClick={clearHostelFilters}
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {tab === "transport" && (
            <div className="fm-plan-filter-bar">
              <div className="fm-plan-search-wrap">
                <FiSearch />
                <input
                  type="text"
                  className="fm-plan-search-input"
                  aria-label="Search transport fee plans"
                  placeholder="Search route or stop..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    className="fm-plan-search-clear"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                  >
                    <FiX />
                  </button>
                )}
              </div>

              <select
                className="fm-filter-select fm-filter-select--year"
                value={transportFilters.academicYearId}
                onChange={(e) => setTransportFilters((f) => ({ ...f, academicYearId: e.target.value }))}
                aria-label="Filter by Academic Year"
              >
                <option value="">All Years</option>
                {masters.years.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>

              <select
                className="fm-filter-select fm-filter-select--route"
                value={transportFilters.route}
                onChange={(e) => setTransportFilters((f) => ({ ...f, route: e.target.value }))}
                aria-label="Filter by Route"
              >
                <option value="">All Routes</option>
                {uniqueRoutes.map((route) => (
                  <option key={route} value={route}>{route}</option>
                ))}
              </select>

              <select
                className="fm-filter-select fm-filter-select--stop"
                value={transportFilters.pickupPoint}
                onChange={(e) => setTransportFilters((f) => ({ ...f, pickupPoint: e.target.value }))}
                aria-label="Filter by Boarding Point"
              >
                <option value="">All Stops</option>
                {uniqueStops.map((stop) => (
                  <option key={stop} value={stop}>{stop}</option>
                ))}
              </select>

              <select
                className="fm-filter-select fm-filter-select--status"
                value={transportFilters.status}
                onChange={(e) => setTransportFilters((f) => ({ ...f, status: e.target.value }))}
                aria-label="Filter by Status"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Inactive">Inactive</option>
              </select>

              {isTransportFiltered && (
                <button
                  type="button"
                  className="fm-filter-clear-btn"
                  onClick={clearTransportFilters}
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Academic Table / Empty State */}
          {tab === "academic" && (
            <>
              {filteredAcademicRows.length === 0 ? (
                <div className="fm-plan-empty-state">
                  <div className="fm-plan-empty-icon">
                    <FiBookOpen />
                  </div>
                  <h3 className="fm-plan-empty-title">{isAcademicFiltered ? "No matching fee plans" : "No academic fee plans yet"}</h3>
                  <p className="fm-plan-empty-desc">
                    Create an academic fee plan to define charges and payment schedules for a course, branch and batch.
                  </p>
                </div>
              ) : (
                <FeeTable
                  rows={filteredAcademicRows}
                  columns={[
                    {
                      label: "Plan Name",
                      render: (r) => (
                        <div>
                          <strong>{r.name}</strong>
                          <small className="fm-cell-sub">{r.code || "Plan"} · v{r.version || 1}</small>
                        </div>
                      ),
                    },
                    {
                      label: "Academic Year",
                      render: (r) =>
                        r.academicYearName ||
                        masters.years.find((y) => String(y.id) === String(r.academicYearId))?.name ||
                        "—",
                    },
                    {
                      label: "Course / Branch",
                      render: (r) => (
                        <div>
                          <span>{r.courseName || "—"}</span>
                          <small className="fm-cell-sub">{r.branchName || "—"}</small>
                        </div>
                      ),
                    },
                    { label: "Batch", key: "batch" },
                    {
                      label: "Category",
                      render: (r) => r.category || "All Students",
                    },
                    {
                      label: "Total Fee",
                      align: "right",
                      render: (r) => {
                        const t = r.feeComponents
                          ? componentTotals(r.feeComponents).total
                          : r.fee || 0;
                        return <strong>{money(t)}</strong>;
                      },
                    },
                    {
                      label: "Payment",
                      render: (r) =>
                        r.paymentPlan?.mode === "Full Payment" || r.plan === "Full Payment"
                          ? "Pay in Full"
                          : `${r.paymentPlan?.installments?.length || r.installments?.length || 0} Installments`,
                    },
                    {
                      label: "Status",
                      render: (r) => <FeeBadge value={r.status} />,
                    },
                    {
                      label: "Actions",
                      align: "right",
                      render: (r) => (
                        <FeeRowActions>
                          <button
                            type="button"
                            className="fm-icon-btn"
                            title="View Plan Details"
                            onClick={() => setDetailsModal(r)}
                          >
                            <FiEye />
                          </button>
                          {r.status === "Draft" && (
                            <button
                              type="button"
                              className="fm-icon-btn"
                              title="Edit Plan"
                              onClick={() =>
                                navigate(`/fees/structures/${r.id}/edit`, {
                                  state: { initialStructure: r },
                                })
                              }
                            >
                              <FiEdit2 />
                            </button>
                          )}
                          {r.workflowStructure && (feeStructureServiceModule.feeTransitions[r.status] || []).map(status => (
                            <button key={status} type="button"
                              title={status === "Pending Approval" ? "Submit for Approval" : status === "Approved" ? "Approve Plan" : status === "Published" ? "Publish Plan" : status === "Archived" ? "Archive Plan" : "Return to Draft"}
                              onClick={() => workflow.transition(r.id, status)}><FiCheck /></button>
                          ))}
                          <button
                            type="button"
                            className="fm-icon-btn"
                            title="Duplicate as Draft"
                            onClick={() => handleDuplicateDraft(r)}
                          >
                            <FiCopy />
                          </button>
                          {r.status === "Draft" && (
                            <button
                              type="button"
                              className="fm-icon-btn fm-icon-btn--danger"
                              title="Delete Draft"
                              onClick={() => handleDeleteDraft(r)}
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </FeeRowActions>
                      ),
                    },
                  ]}
                />
              )}
            </>
          )}

          {/* Hostel Table / Empty State */}
          {tab === "hostel" && (
            <>
              {filteredHostels.length === 0 ? (
                <div className="fm-plan-empty-state">
                  <div className="fm-plan-empty-icon">
                    <FiHome />
                  </div>
                  <h3 className="fm-plan-empty-title">{isHostelFiltered ? "No matching fee plans" : "No hostel fee plans yet"}</h3>
                  <p className="fm-plan-empty-desc">
                    Create a hostel fee plan for accommodation, room type and occupancy.
                  </p>
                </div>
              ) : (
                <FeeTable
                  rows={filteredHostels}
                  columns={[
                    {
                      label: "Plan Name",
                      render: (h) => (
                        <div>
                          <strong>{h.hostelName}</strong>
                          <small className="fm-cell-sub">{h.hostelType || "Residence"}</small>
                        </div>
                      ),
                    },
                    {
                      label: "Academic Year",
                      render: (h) =>
                        h.academicYearName ||
                        masters.years.find((y) => String(y.id) === String(h.academicYearId))?.name ||
                        "—",
                    },
                    { label: "Hostel", render: (h) => h.hostelName },
                    {
                      label: "Room Type / Occupancy",
                      render: (h) => `${h.roomType} (${h.acType || "Non-AC"})`,
                    },
                    {
                      label: "Total Fee",
                      align: "right",
                      render: (h) => <strong>{money(h.fee)}</strong>,
                    },
                    {
                      label: "Payment",
                      render: (h) => h.frequency || "Annual",
                    },
                    {
                      label: "Status",
                      render: (h) => <FeeBadge value={h.status} />,
                    },
                    {
                      label: "Actions",
                      align: "right",
                      render: (h) => (
                        <FeeRowActions>
                          <button
                            type="button"
                            className="fm-icon-btn"
                            title="View Details"
                            onClick={() => setFacilityDetailsModal({ type: "hostel", row: h })}
                          >
                            <FiEye />
                          </button>
                          <button
                            type="button"
                            className="fm-icon-btn"
                            title="Edit"
                            onClick={() => navigate(`/fees/structures/hostel/${h.id}/edit`)}
                          >
                            <FiEdit2 />
                          </button>
                          {h.status === "Draft" && (
                            <button
                              type="button"
                              className="fm-icon-btn fm-icon-btn--danger"
                              title="Delete"
                              onClick={() => {
                                if (window.confirm("Delete this draft hostel fee plan?")) {
                                  const next = hostels.filter((x) => x.id !== h.id);
                                  persistHostelStructures(next);
                                  setHostels(next);
                                  setToast("Hostel fee plan deleted.");
                                }
                              }}
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </FeeRowActions>
                      ),
                    },
                  ]}
                />
              )}
            </>
          )}

          {/* Transport Table / Empty State */}
          {tab === "transport" && (
            <>
              {filteredTransports.length === 0 ? (
                <div className="fm-plan-empty-state">
                  <div className="fm-plan-empty-icon">
                    <FiTruck />
                  </div>
                  <h3 className="fm-plan-empty-title">{isTransportFiltered ? "No matching fee plans" : "No transport fee plans yet"}</h3>
                  <p className="fm-plan-empty-desc">
                    Create a transport fee plan for routes and boarding points.
                  </p>
                </div>
              ) : (
                <FeeTable
                  rows={filteredTransports}
                  columns={[
                    {
                      label: "Plan Name",
                      render: (t) => (
                        <div>
                          <strong>{t.route}</strong>
                          <small className="fm-cell-sub">{t.routeCode || "Route"}</small>
                        </div>
                      ),
                    },
                    {
                      label: "Academic Year",
                      render: (t) =>
                        t.academicYearName ||
                        masters.years.find((y) => String(y.id) === String(t.academicYearId))?.name ||
                        "—",
                    },
                    { label: "Route", render: (t) => t.route },
                    { label: "Boarding Point", render: (t) => t.pickupPoint },
                    {
                      label: "Total Fee",
                      align: "right",
                      render: (t) => <strong>{money(t.fee)}</strong>,
                    },
                    {
                      label: "Payment",
                      render: (t) => t.frequency || "Per Semester",
                    },
                    {
                      label: "Status",
                      render: (t) => <FeeBadge value={t.status} />,
                    },
                    {
                      label: "Actions",
                      align: "right",
                      render: (t) => (
                        <FeeRowActions>
                          <button
                            type="button"
                            className="fm-icon-btn"
                            title="View Details"
                            onClick={() => setFacilityDetailsModal({ type: "transport", row: t })}
                          >
                            <FiEye />
                          </button>
                          <button
                            type="button"
                            className="fm-icon-btn"
                            title="Edit"
                            onClick={() => navigate(`/fees/structures/transport/${t.id}/edit`)}
                          >
                            <FiEdit2 />
                          </button>
                          {t.status === "Draft" && (
                            <button
                              type="button"
                              className="fm-icon-btn fm-icon-btn--danger"
                              title="Delete"
                              onClick={() => {
                                if (window.confirm("Delete this draft transport plan?")) {
                                  const next = transports.filter((x) => x.id !== t.id);
                                  persistTransportStructures(next);
                                  setTransports(next);
                                  setToast("Transport fee plan deleted.");
                                }
                              }}
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </FeeRowActions>
                      ),
                    },
                  ]}
                />
              )}
            </>
          )}
        </div>

        {/* Plan Details Modal */}
        {detailsModal && (
          <PlanDetailsDialog
            row={detailsModal}
            close={() => setDetailsModal(null)}
            edit={() => {
              const r = detailsModal;
              setDetailsModal(null);
              navigate(`/fees/structures/${r.id}/edit`, { state: { initialStructure: r } });
            }}
          />
        )}

        {/* Facility Details Modal */}
        {facilityDetailsModal && (
          <FacilityDetails
            type={facilityDetailsModal.type}
            value={facilityDetailsModal.row}
            close={() => setFacilityDetailsModal(null)}
            edit={() => {
              const { type, row } = facilityDetailsModal;
              setFacilityDetailsModal(null);
              navigate(`/fees/structures/${type}/${row.id}/edit`);
            }}
          />
        )}
      </div>
    );
  }

  return {
    get default() {
      return FeePlans;
    },
    get FacilityEditor() {
      return FacilityEditor;
    },
    get FacilityDetails() {
      return FacilityDetails;
    },
  };
})();

// ============================================================================
// MODULE 3: SERVER FEE COLLECTION MODULE (OVERVIEW, PAYMENTS, CASHIER, REPORTS)
// ============================================================================
export const ServerFeeCollectionModule = (() => {
  const { useEffect, useMemo, useRef, useState } = external0;
  const { Link, useLocation, useNavigate, useParams } = external1;
  const {
    FiAlertCircle,
    FiCheck,
    FiCheckCircle,
    FiEdit2,
    FiFilter,
    FiPlus,
    FiRefreshCw,
    FiSearch,
    FiSliders,
    FiX,
    FiArrowLeft,
    FiPrinter,
  } = external3;
  const { feeCollectionApi } = apiEndpointsModule;
  const { cents, feeMoney, feeToday, rupees, money } = feeStructureServiceModule;
  const {
    FeeBadge,
    FeeDialog,
    FeeInput,
    FeeSelect,
    FeeStats,
    FeeTable,
  } = FeeStructureWizardModule;
  const { default: ExportMenu } = ExportMenuModule;
  const { default: TablePagination } = TablePaginationModule;
  const { printSingleRecord } = exportUtilsModule;
  const { showError, showSuccess } = toastModule;

  const MODES = [
    { id: "CASH", name: "Cash" },
    { id: "UPI", name: "UPI" },
    { id: "CARD", name: "Card" },
    { id: "BANK_TRANSFER", name: "Bank Transfer" },
    { id: "CHEQUE", name: "Cheque" },
  ];

  function serverDueAmounts(row) {
    return {
      outstanding: Math.max(
        0,
        cents(row.payableAmount) - cents(row.paidAmount)
      ),
      overdue: row.overdue ? cents(row.balanceAmount) : 0,
      penalty: cents(row.finePending),
      total: cents(row.balanceAmount),
    };
  }

  function ServerReceiptDialog({ data: r, close }) {
    const rows = [
      ["Receipt Number", r.receiptNumber],
      ["Student", r.studentName],
      ["Student ID", r.studentCode],
      ["Issued Date", r.issuedAt || r.paymentDate],
      ["Component", r.feeCategory || "Fee Payment"],
      ["Payment Mode", r.paymentMode],
      ["Transaction Reference", r.transactionReference || "—"],
      ["Fee Amount", feeMoney(r.feeAmount || r.totalAmount)],
      ["Total Amount", feeMoney(r.totalAmount)],
      ["Collected By", r.issuedByName || "Accounts Desk"],
      ["Remarks", r.remarks || "—"],
    ];

    return (
      <FeeDialog
        title={`Receipt ${r.receiptNumber}`}
        close={close}
        footer={
          <>
            <button
              type="button"
              className="erp-btn erp-btn--secondary"
              onClick={close}
            >
              Close
            </button>
            <button
              type="button"
              className="erp-btn erp-btn--primary"
              onClick={() => {
                try {
                  printSingleRecord({
                    title: `Fee Receipt ${r.receiptNumber}`,
                    sections: [{ title: "Receipt Details", rows }],
                  });
                } catch (e) {
                  showError(e.message);
                }
              }}
            >
              <FiPrinter /> Print Receipt
            </button>
          </>
        }
      >
        <div className="fm-receipt-content">
          <dl className="fm-review-grid">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </FeeDialog>
    );
  }

  // ==========================================================================
  // DESTINATION 1: FINANCE OVERVIEW
  // ==========================================================================
  function FinanceOverview({ academic, configuration }) {
    const [trendPeriod, setTrendPeriod] = useState("30");
    const [dashData, setDashData] = useState(null);
    const [recentPayments, setRecentPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedYear, setSelectedYear] = useState(
      academic.selectedAcademicYearId || ""
    );
    const [receiptView, setReceiptView] = useState(null);

    const yearOptions = (academic.academicYears || []).map((y) => ({
      id: String(y.academicYearId || y.id),
      name: y.academicYearName || y.name,
    }));

    useEffect(() => {
      let active = true;
      setLoading(true);
      setError("");
      setDashData(null);
      setRecentPayments([]);
      Promise.allSettled([
        feeCollectionApi.dashboard({
          academicYearId: selectedYear,
        }),
        feeCollectionApi.history({ page: 1, pageSize: 6 }),
      ])
        .then(([dashRes, histRes]) => {
          if (!active) return;
          const failures = [dashRes, histRes].filter(res => res.status === "rejected");
          if (failures.length) setError(failures.map(res => res.reason?.message || "Unable to load financial records.").join(" "));
          if (dashRes.status === "fulfilled" && dashRes.value) {
            setDashData(dashRes.value);
          }
          if (histRes.status === "fulfilled" && histRes.value) {
            setRecentPayments(histRes.value.items || []);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [selectedYear, academic.selectedCollegeId]);

    // KPI Metrics calculation
    const totalFees = dashData?.totalPayable || 0;
    const collected = dashData?.totalCollected || 0;
    const balance = dashData?.totalPending || 0;
    const overdue = dashData?.totalOverdue || 0;


    const pendingStudents = dashData?.studentsWithPending || 0;
    const overdueStudents = dashData?.studentsOverdue || 0;

    const collectionPct =
      totalFees > 0 ? ((collected / totalFees) * 100).toFixed(1) : "0.0";

    // Chart processing
    const trendRows = dashData?.collectionTrend || [];
    const dailyMap = new Map();
    for (const r of trendRows) {
      const d = date(r.date);
      dailyMap.set(d, (dailyMap.get(d) || 0) + Number(r.amount || 0));
    }
    const daysCount = trendPeriod === "7" ? 7 : trendPeriod === "30" ? 30 : 90;
    const today = new Date();
    const recentTrendPoints = Array.from({ length: daysCount }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (daysCount - 1 - i));
      const key = d.toISOString().slice(0, 10);
      return { date: key, amount: dailyMap.get(key) || 0 };
    });
    const trendPoints = trendPeriod === "year" ? [...dailyMap].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount })) : recentTrendPoints;
    const maxVal = Math.max(1, ...trendPoints.map((p) => p.amount));

    return (
      <div className="fm-page-container">
        {/* Page Header (Clean, Not inside card) */}
        <header className="fm-page-header">
          <div>
            <h1>Fee Management</h1>
            <p>Track student fees, payments and pending balances.</p>
          </div>
          <div className="fm-header-actions">
            <FeeSelect
              label="Academic Year"
              value={selectedYear}
              options={[{ id: "", name: "All Years" }, ...yearOptions]}
              onChange={setSelectedYear}
            />
            <Link to="/fees/collection" className="erp-btn erp-btn--primary">
              <FiPlus /> Collect Payment
            </Link>
          </div>
        </header>


        <FeeRequestState loading={loading} error={error}>
        {/* PRIMARY KPI ROW: EXACTLY FOUR ALL-WHITE CARDS */}
        <div className="fm-kpis-grid">
          <div className="fm-kpi-card">
            <span className="fm-kpi-label">TOTAL FEE DEMAND</span>
            <strong className="fm-kpi-value">{feeMoney(totalFees)}</strong>
            <span className="fm-kpi-meta">Assigned student fees</span>
          </div>
          <div className="fm-kpi-card">
            <span className="fm-kpi-label">TOTAL COLLECTED</span>
            <strong className="fm-kpi-value">{feeMoney(collected)}</strong>
            <span className="fm-kpi-meta">{collectionPct}% collected</span>
          </div>
          <div className="fm-kpi-card">
            <span className="fm-kpi-label">OUTSTANDING BALANCE</span>
            <strong className="fm-kpi-value">{feeMoney(balance)}</strong>
            <span className="fm-kpi-meta">{pendingStudents} students</span>
          </div>
          <div className="fm-kpi-card">
            <span className="fm-kpi-label">COLLECTION RATE</span>
            <strong className="fm-kpi-value">{collectionPct}%</strong>
            <span className="fm-kpi-meta">{feeMoney(overdue)} overdue</span>
          </div>
        </div>

        {/* COLLECTION PROGRESS BAR */}
        <div className="fm-progress-card">
          <div className="fm-progress-card__header">
            <span>Collection Progress</span>
            <strong>
              {feeMoney(collected)} collected of {feeMoney(totalFees)} ({collectionPct}%)
            </strong>
          </div>
          <div className="fm-progress-card__track">
            <div
              className="fm-progress-card__fill"
              style={{ width: `${Math.min(100, Math.max(0, Number(collectionPct)))}%` }}
            />
          </div>
        </div>

        {/* OVERVIEW CONTENT GRID: LEFT 65% / RIGHT 35% */}
        <div className="fm-overview-grid">
          {/* Left: Collection Trend */}
          <div className="fm-trend-card">
            <div className="fm-card-header">
              <h2>Collection Trend</h2>
              <div className="fm-segmented-control" role="group" aria-label="Trend range">
                <button
                  type="button"
                  className={trendPeriod === "7" ? "active" : ""}
                  onClick={() => setTrendPeriod("7")}
                >
                  7 Days
                </button>
                <button
                  type="button"
                  className={trendPeriod === "30" ? "active" : ""}
                  onClick={() => setTrendPeriod("30")}
                >
                  30 Days
                </button>
                <button
                  type="button"
                  className={trendPeriod === "year" ? "active" : ""}
                  onClick={() => setTrendPeriod("year")}
                >
                  Available History
                </button>
              </div>
            </div>

            <div className="fm-chart-wrap">
              {!trendRows.length ? <div className="fm-empty-state">No collections in this period.</div> : <svg viewBox="0 0 640 180" className="fm-trend-svg" role="img" aria-label="Collection trend chart">
                <line x1="40" y1="140" x2="600" y2="140" className="fm-axis" />
                {trendPoints.length > 1 && (
                  <>
                    <polyline
                      fill="none"
                      stroke="var(--fm-primary)"
                      strokeWidth="2.5"
                      points={trendPoints
                        .map(
                          (p, i) =>
                            `${40 + (i / (trendPoints.length - 1)) * 560},${140 - (p.amount / maxVal) * 110}`
                        )
                        .join(" ")}
                    />
                    <polygon
                      fill="var(--fm-primary-light)"
                      points={`40,140 ${trendPoints
                        .map(
                          (p, i) =>
                            `${40 + (i / (trendPoints.length - 1)) * 560},${140 - (p.amount / maxVal) * 110}`
                        )
                        .join(" ")} 600,140`}
                    />
                  </>
                )}
                <text x="40" y="165" className="fm-chart-label">{trendPoints[0]?.date}</text>
                <text x="600" y="165" textAnchor="end" className="fm-chart-label">{trendPoints.at(-1)?.date}</text>
                <text x="40" y="20" className="fm-chart-label">{feeMoney(maxVal)}</text>
              </svg>}
            </div>
          </div>

          {/* Right: Fee Status Breakdown */}
          <div className="fm-status-breakdown-card">
            <div className="fm-card-header">
              <h2>Fee Status</h2>
            </div>
            <div className="fm-status-list">
              <div className="fm-status-item">
                <div className="fm-status-item__left">
                  <span className="fm-status-dot fm-status-dot--paid" />
                  <span>Collected</span>
                </div>
                <strong>{feeMoney(collected)}</strong>
              </div>
              <div className="fm-status-item">
                <div className="fm-status-item__left">
                  <span className="fm-status-dot fm-status-dot--partial" />
                  <span>Outstanding</span>
                </div>
                <strong>{feeMoney(balance)}</strong>
              </div>
              <div className="fm-status-item">
                <div className="fm-status-item__left">
                  <span className="fm-status-dot fm-status-dot--due" />
                  <span>Payment Due</span>
                </div>
                <strong>{pendingStudents} students</strong>
              </div>
              <div className="fm-status-item">
                <div className="fm-status-item__left">
                  <span className="fm-status-dot fm-status-dot--overdue" />
                  <span>Overdue</span>
                </div>
                <strong>{overdueStudents} students</strong>
              </div>
            </div>
          </div>
        </div>

        {/* NEEDS ATTENTION: Operational Panel (Real Data Only) */}
        {(overdueStudents > 0 || dashData?.studentsWithPending > 0) && (
          <div className="fm-attention-card">
            <div className="fm-card-header">
              <h2>Needs Attention</h2>
            </div>
            <div className="fm-attention-items">
              {overdueStudents > 0 && (
                <Link to="/fees/students" state={{ status: "Overdue" }} className="fm-attention-row">
                  <FeeBadge value="Overdue" />
                  <span>{overdueStudents} students have overdue payments</span>
                  <span className="fm-action-hint">Review →</span>
                </Link>
              )}
              {pendingStudents > 0 && (
                <Link to="/fees/students" state={{ status: "Pending" }} className="fm-attention-row">
                  <FeeBadge value="Pending" />
                  <span>{pendingStudents} students have pending fee installments</span>
                  <span className="fm-action-hint">Review →</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* RECENT PAYMENTS: Latest 5-8 Payments Table */}
        <div className="fm-recent-payments-card">
          <div className="fm-card-header">
            <h2>Recent Payments</h2>
            <Link to="/fees/receipts" className="fm-link-more">
              View All Payments →
            </Link>
          </div>

          <FeeTable
            rows={recentPayments}
            pageSize={6}
            columns={[
              {
                label: "Receipt",
                render: (r) => (
                  <button
                    type="button"
                    className="fm-text-link"
                    onClick={() => setReceiptView(r)}
                  >
                    {r.receiptNumber}
                  </button>
                ),
              },
              { label: "Student", key: "studentName" },
              { label: "Roll No", key: "studentCode" },
              { label: "Payment Method", key: "paymentMode" },
              {
                label: "Amount",
                align: "right",
                render: (r) => <strong>{feeMoney(r.totalAmount)}</strong>,
              },
              { label: "Date", render: (r) => date(r.paymentDate) },
              { label: "Status", render: () => <FeeBadge value="Completed" /> },
            ]}
          />
        </div>

        </FeeRequestState>
        {/* Receipt Dialog */}
        {receiptView && (
          <ServerReceiptDialog
            data={receiptView}
            close={() => setReceiptView(null)}
          />
        )}
      </div>
    );
  }

  // ==========================================================================
  // DESTINATION 4: PAYMENTS SCREEN (`/fees/receipts`)
  // ==========================================================================
  function Payments({ academic }) {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [paymentMode, setPaymentMode] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [page, setPage] = useState(1);
    const [result, setResult] = useState(null);
    const [dailySummary, setDailySummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [receiptModal, setReceiptModal] = useState(null);

    useEffect(() => {
      let active = true;
      feeCollectionApi
        .dashboard({ fromDate: feeToday(), toDate: feeToday() })
        .then((res) => {
          if (active) setDailySummary(res);
        })
        .catch((reason) => { if (active) setError(reason.message || "Unable to load fee records. Please try again."); });
      return () => {
        active = false;
      };
    }, [academic.selectedCollegeId]);

    useEffect(() => {
      let active = true;
      setLoading(true);
      setError("");
      feeCollectionApi
        .history({
          search,
          paymentMode,
          fromDate,
          toDate,
          page,
          pageSize: 10,
        })
        .then((data) => {
          if (active) setResult(data);
        })
        .catch((reason) => { if (active) setError(reason.message || "Unable to load fee records. Please try again."); })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [search, paymentMode, fromDate, toDate, page, academic.selectedCollegeId]);

    const openReceipt = async (id, payment) => {
      try {
        const full = await feeCollectionApi.receipt(id);
        setReceiptModal(full || payment);
      } catch {
        setReceiptModal(payment);
      }
    };

    return (
      <div className="fm-page-container">
        {/* Page Header */}
        <header className="fm-page-header">
          <div>
            <h1>Payments</h1>
            <p>Record student payments and view payment history.</p>
          </div>
          <div className="fm-header-actions">
            <Link to="/fees/collection" className="erp-btn erp-btn--primary">
              <FiPlus /> Collect Payment
            </Link>
          </div>
        </header>

        {/* 3-4 Compact Summary Values */}
        <div className="fm-summary-strip">
          <div className="fm-summary-box">
            <span>Collected Today</span>
            <strong>{feeMoney(dailySummary?.totalCollected || 0)}</strong>
          </div>
          <div className="fm-summary-box">
            <span>Payments Today</span>
            <strong>{dailySummary?.paymentsCount || 0}</strong>
          </div>
          <div className="fm-summary-box">
            <span>Receipts Issued</span>
            <strong>{dailySummary?.receiptsCount || 0}</strong>
          </div>

        </div>

        {/* Main Content Surface */}
        <div className="fm-workspace">
          {/* Search / Filter Toolbar */}
          <div className="fm-filter-bar">
            <div className="fm-search-wrap">
              <FiSearch />
              <input
                type="text"
                placeholder="Search student, roll no, or receipt no..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  className="fm-clear-btn"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <FiX />
                </button>
              )}
            </div>

            <FeeSelect
              label="Payment Method"
              value={paymentMode}
              options={[{ id: "", name: "All Methods" }, ...MODES]}
              onChange={(m) => {
                setPaymentMode(m);
                setPage(1);
              }}
            />

            <FeeInput
              label="From Date"
              type="date"
              value={fromDate}
              onChange={(d) => {
                setFromDate(d);
                setPage(1);
              }}
            />

            <FeeInput
              label="To Date"
              type="date"
              value={toDate}
              onChange={(d) => {
                setToDate(d);
                setPage(1);
              }}
            />

            {(search || paymentMode || fromDate || toDate) && (
              <button
                type="button"
                className="fm-reset-btn"
                onClick={() => {
                  setSearch("");
                  setPaymentMode("");
                  setFromDate("");
                  setToDate("");
                  setPage(1);
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Payment Transactions Table */}
          <FeeTable
            loading={loading}
            error={error}
            rows={result?.items || []}
            pageSize={10}
            columns={[
              {
                label: "Receipt No",
                render: (r) => (
                  <button
                    type="button"
                    className="fm-text-link"
                    onClick={() => openReceipt(r.receiptId, r)}
                  >
                    {r.receiptNumber}
                  </button>
                ),
              },
              { label: "Student", key: "studentName" },
              { label: "Roll No", key: "studentCode" },
              { label: "Date", render: (r) => date(r.paymentDate) },
              { label: "Payment Method", key: "paymentMode" },
              {
                label: "Transaction ID",
                render: (r) => r.transactionReference || "—",
              },
              {
                label: "Amount",
                align: "right",
                render: (r) => <strong>{feeMoney(r.totalAmount)}</strong>,
              },
              {
                label: "Status",
                render: () => <FeeBadge value="Confirmed" />,
              },
              {
                label: "Actions",
                align: "right",
                render: (r) => (
                  <button
                    type="button"
                    className="erp-btn erp-btn--secondary erp-btn--sm"
                    onClick={() => openReceipt(r.receiptId, r)}
                  >
                    View Receipt
                  </button>
                ),
              },
            ]}
          />

          {result?.totalPages > 1 && (
            <TablePagination
              currentPage={page}
              totalPages={result.totalPages}
              onPageChange={setPage}
            />
          )}
        </div>

        {receiptModal && (
          <ServerReceiptDialog
            data={receiptModal}
            close={() => setReceiptModal(null)}
          />
        )}
      </div>
    );
  }

  // ==========================================================================
  // CASHIER WORKFLOW: COLLECT PAYMENT (`/fees/collection`)
  // ==========================================================================
  function CollectPayment({ academic }) {
    const navigate = useNavigate();
    const location = useLocation();
    const initialQuery = location.state?.studentSearch || "";

    const [step, setStep] = useState(1);
    const [searchQuery, setSearchQuery] = useState(initialQuery);
    const [studentsList, setStudentsList] = useState([]);
    const [searching, setSearching] = useState(false);
    const [loadingDues, setLoadingDues] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentDues, setStudentDues] = useState([]);
    const [selectedDues, setSelectedDues] = useState([]);

    const [form, setForm] = useState({
      feeAmount: "",
      paymentMode: "CASH",
      transactionReference: "",
      paymentDate: feeToday(),
      remarks: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [successReceipt, setSuccessReceipt] = useState(null);
    const [error, setError] = useState("");

    // Step 1: Search students
    useEffect(() => {
      let active = true;
      setSearching(true);
      setStudentsList([]);
      setError("");
      feeCollectionApi
        .pending({
          search: searchQuery,
          page: 1,
          pageSize: 8,
        })
        .then((res) => {
          if (active) setStudentsList(res?.items || []);
        })
        .catch(reason => { if (active) setError(reason.message || "Unable to search students."); })
        .finally(() => {
          if (active) setSearching(false);
        });

      return () => {
        active = false;
      };
    }, [searchQuery, academic.selectedCollegeId]);

    // When student selected, load their unpaid dues
    const handleSelectStudent = (st) => {
      setSelectedStudent(st);
      setLoadingDues(true);
      setStudentDues([]);
      setSelectedDues([]);
      setError("");
      feeCollectionApi
        .allPending({ studentId: st.studentId })
        .then((dues) => {
          setStudentDues(dues || []);
          if (dues && dues.length > 0) {
            setSelectedDues([dues[0].studentFeeId]);
            setForm((f) => ({
              ...f,
              feeAmount: String(dues[0].balanceAmount || dues[0].payableAmount || ""),
            }));
          }
          setStep(2);
        })
        .catch(reason => { setError(reason.message || "Unable to load the student's dues."); })
        .finally(() => setLoadingDues(false));
    };

    // Calculate total balance from selected items
    const selectedTotalBalance = useMemo(() => {
      return studentDues
        .filter((d) => selectedDues.includes(d.studentFeeId))
        .reduce((sum, d) => sum + (Number(d.balanceAmount) || 0), 0);
    }, [studentDues, selectedDues]);

    const handleConfirmPayment = async () => {
      if (submitting || selectedDues.length !== 1 || !form.paymentDate || Number(form.feeAmount) <= 0 || Number(form.feeAmount) > selectedTotalBalance) { setError("Select an installment, a payment date and an amount within its outstanding balance."); return; }
      setSubmitting(true);
      setError("");
      try {
        const payload = {
          studentFeeId: selectedDues[0] || selectedStudent.studentFeeId,
          feeAmount: Number(form.feeAmount),
          fineAmount: 0,
          paymentMode: form.paymentMode,
          transactionReference: form.transactionReference || "Cash payment",
          paymentDate: form.paymentDate,
          remarks: form.remarks,
        };
        const receipt = await feeCollectionApi.collect(payload);
        if (!receipt) {
          showError("The server returned no receipt. Check payment history before collecting again.");
          navigate("/fees/receipts");
          return;
        }
        setSuccessReceipt(receipt);
        showSuccess("Payment collected successfully.");
      } catch (e) {
        setError(e.message || "Failed to record payment.");
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="fm-create-plan-container">
        {/* Header */}
        <header className="fm-page-header">
          <div>
            <button
              type="button"
              className="fm-back-btn"
              onClick={() => navigate("/fees/receipts")}
            >
              <FiArrowLeft /> Back to Payments
            </button>
            <h1>Collect Payment</h1>
            <p>Cashier desk: search student, select unpaid items, and collect payment.</p>
          </div>
        </header>

        {error && (
          <div className="fm-error-banner" role="alert">
            <FiX /> <span>{error}</span>
          </div>
        )}

        {/* SUCCESS SCREEN */}
        {successReceipt ? (
          <div className="fm-payment-success-card">
            <div className="fm-success-icon-wrap">
              <FiCheckCircle size={48} />
            </div>
            <h2>Payment Successful</h2>
            <p>Receipt {successReceipt.receiptNumber} recorded in institution accounts.</p>

            <dl className="fm-review-grid" style={{ margin: "24px 0" }}>
              <div>
                <dt>Receipt No</dt>
                <dd><strong>{successReceipt.receiptNumber}</strong></dd>
              </div>
              <div>
                <dt>Student</dt>
                <dd>{successReceipt.studentName || selectedStudent?.studentName}</dd>
              </div>
              <div>
                <dt>Amount Paid</dt>
                <dd><strong>{feeMoney(successReceipt.totalAmount || form.feeAmount)}</strong></dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{successReceipt.paymentMode || form.paymentMode}</dd>
              </div>
              <div>
                <dt>Date</dt>
                <dd>{successReceipt.issuedAt || form.paymentDate}</dd>
              </div>
            </dl>

            <div className="fm-success-actions">
              <button
                type="button"
                className="erp-btn erp-btn--secondary"
                onClick={() => {
                  try {
                    printSingleRecord({
                      title: `Fee Receipt ${successReceipt.receiptNumber}`,
                      sections: [
                        {
                          title: "Payment Summary",
                          rows: [
                            ["Receipt Number", successReceipt.receiptNumber],
                            ["Student Name", selectedStudent?.studentName],
                            ["Student ID", selectedStudent?.studentCode],
                            ["Amount Paid", feeMoney(form.feeAmount)],
                            ["Payment Mode", form.paymentMode],
                            ["Date", form.paymentDate],
                          ],
                        },
                      ],
                    });
                  } catch (e) {
                    showError(e.message);
                  }
                }}
              >
                <FiPrinter /> Print Receipt
              </button>
              <button
                type="button"
                className="erp-btn erp-btn--primary"
                onClick={() => navigate("/fees/receipts")}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="fm-form-surface">
            {/* STEP 1: FIND STUDENT */}
            <section className="fm-form-section">
              <div className="fm-section-header">
                <h2>1. Find Student</h2>
                <p>Search by student name, roll number or admission number.</p>
              </div>

              <div className="fm-search-bar" style={{ maxWidth: "480px", marginBottom: "16px" }}>
                <FiSearch />
                <input
                  type="text"
                  placeholder="Search student name, roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {step === 1 && (
                <div className="fm-student-search-results">
                  {loadingDues ? <p role="status">Loading student dues...</p> : studentsList.length === 0 ? (
                    <p className="fm-empty-text">
                      {searching ? "Searching students..." : "No matching students with pending fee balances."}
                    </p>
                  ) : (
                    <div className="fm-student-select-grid">
                      {studentsList.map((st) => (
                        <div
                          key={st.studentFeeId || st.studentId}
                          className="fm-student-select-card"
                          role="button"
                          tabIndex={0}
                          onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleSelectStudent(st); } }}
                          onClick={() => handleSelectStudent(st)}
                        >
                          <div>
                            <strong>{st.studentName}</strong>
                            <small>{st.studentCode} · {st.courseName || "Program"}</small>
                          </div>
                          <div className="fm-student-balance-chip">
                            <span>Balance:</span>
                            <strong>{feeMoney(st.balanceAmount)}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedStudent && step > 1 && (
                <div className="fm-selected-student-banner">
                  <div>
                    <strong>{selectedStudent.studentName}</strong>
                    <span>{selectedStudent.studentCode} · {selectedStudent.courseName} {selectedStudent.branchName}</span>
                  </div>
                  <button
                    type="button"
                    className="fm-change-btn"
                    onClick={() => {
                      setSelectedStudent(null);
                      setStep(1);
                    }}
                  >
                    Change Student
                  </button>
                </div>
              )}
            </section>

            {/* STEP 2: REVIEW BALANCE & SELECT ITEMS */}
            {step >= 2 && selectedStudent && (
              <section className="fm-form-section">
                <div className="fm-section-header">
                  <h2>2. Review Balance</h2>
                  <p>Choose the fee installment or charges to settle.</p>
                </div>

                <div className="fm-review-balances-grid">
                  <div className="fm-balance-stat">
                    <span>Total Fee</span>
                    <strong>{feeMoney(selectedStudent.payableAmount)}</strong>
                  </div>
                  <div className="fm-balance-stat">
                    <span>Paid So Far</span>
                    <strong>{feeMoney(selectedStudent.paidAmount)}</strong>
                  </div>
                  <div className="fm-balance-stat">
                    <span>Outstanding Balance</span>
                    <strong style={{ color: "var(--brand)" }}>
                      {feeMoney(selectedStudent.balanceAmount)}
                    </strong>
                  </div>
                  {selectedStudent.overdue && (
                    <div className="fm-balance-stat">
                      <span>Overdue</span>
                      <strong style={{ color: "var(--danger)" }}>
                        {feeMoney(selectedStudent.balanceAmount)}
                      </strong>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "16px" }}>
                  <h4>Select Installment to Pay</h4>
                  <div className="fm-dues-picker-list">
                    {studentDues.map((due) => (
                      <label key={due.studentFeeId} className="fm-due-item-checkbox">
                        <input
                          type="radio"
                          name="fee-installment"
                          checked={selectedDues.includes(due.studentFeeId)}
                          onChange={(e) => {
                            const next = e.target.checked ? [due.studentFeeId] : [];
                            setSelectedDues(next);
                            const newTotal = studentDues
                              .filter((d) => next.includes(d.studentFeeId))
                              .reduce((s, d) => s + (Number(d.balanceAmount) || 0), 0);
                            setForm((f) => ({ ...f, feeAmount: String(newTotal || "") }));
                          }}
                        />
                        <div className="fm-due-item-copy">
                          <strong>{due.feeCategory || "Fee Installment"}</strong>
                          <small>Due Date: {date(due.dueDate)} · {due.installmentNumber ? `Installment ${due.installmentNumber}` : "Single Plan"}</small>
                        </div>
                        <div className="fm-due-item-amount">
                          {feeMoney(due.balanceAmount)}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* STEP 3: PAYMENT DETAILS */}
            {step >= 2 && selectedStudent && (
              <section className="fm-form-section">
                <div className="fm-section-header">
                  <h2>3. Payment Details</h2>
                  <p>Specify the amount and payment mode.</p>
                </div>

                <div className="fm-form-grid">
                  <FeeInput
                    label="Amount Being Paid (₹) *"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.feeAmount}
                    onChange={(feeAmount) => setForm((f) => ({ ...f, feeAmount }))}
                  />

                  <FeeSelect
                    label="Payment Method *"
                    value={form.paymentMode}
                    options={MODES}
                    onChange={(paymentMode) => setForm((f) => ({ ...f, paymentMode }))}
                  />

                  <FeeInput
                    label="Payment Date *"
                    type="date"
                    max={feeToday()}
                    value={form.paymentDate}
                    onChange={(paymentDate) => setForm((f) => ({ ...f, paymentDate }))}
                  />

                  <FeeInput
                    label={form.paymentMode === "CASH" ? "Reference (optional)" : "Transaction Reference *"}
                    placeholder={form.paymentMode === "CASH" ? "Receipt/counter note" : "e.g. UPI Ref / Cheque No / Tx ID"}
                    value={form.transactionReference}
                    onChange={(transactionReference) =>
                      setForm((f) => ({ ...f, transactionReference }))
                    }
                  />

                  <div style={{ gridColumn: "1 / -1" }}>
                    <FeeInput
                      label="Remarks (optional)"
                      placeholder="Additional notes for receipt"
                      value={form.remarks}
                      onChange={(remarks) => setForm((f) => ({ ...f, remarks }))}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* STEP 4: CONFIRM & SUBMIT */}
            {step >= 2 && selectedStudent && (
              <footer className="fm-sticky-footer">
                <button
                  type="button"
                  className="erp-btn erp-btn--secondary"
                  onClick={() => navigate("/fees/receipts")}
                >
                  Cancel
                </button>
                <div className="fm-footer-right">
                  <button
                    type="button"
                    className="erp-btn erp-btn--primary"
                    disabled={
                      submitting || loadingDues || selectedDues.length !== 1 || !form.paymentDate ||
                      Number(form.feeAmount) > selectedTotalBalance ||
                      !Number(form.feeAmount) ||
                      Number(form.feeAmount) <= 0 ||
                      (form.paymentMode !== "CASH" && !form.transactionReference.trim())
                    }
                    onClick={handleConfirmPayment}
                  >
                    {submitting ? "Processing…" : `Confirm & Collect ${feeMoney(form.feeAmount || 0)}`}
                  </button>
                </div>
              </footer>
            )}
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // DESTINATION 5: FEE REPORTS (`/fees/reports`)
  // ==========================================================================
  const REPORT_MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function formatReportMonth(val) {
    if (!val) return "—";
    const str = String(val).trim();
    const match = str.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const monthIndex = parseInt(match[2], 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${REPORT_MONTH_NAMES[monthIndex]} ${match[1]}`;
      }
    }
    return str;
  }

  function formatReportDate(val) {
    if (!val) return "—";
    const str = String(val).trim();
    const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const monthIndex = parseInt(match[2], 10) - 1;
      if (monthIndex >= 0 && monthIndex < 12) {
        return `${parseInt(match[3], 10)} ${REPORT_MONTH_NAMES[monthIndex]} ${match[1]}`;
      }
    }
    return date(val);
  }

  function FeeReports({ academic }) {
    const reportTypes = [
      { id: "summary", name: "Monthly Collection Summary" },
      { id: "daily", name: "Daily Collections" },
      { id: "outstanding", name: "Outstanding Fees" },
      { id: "overdue", name: "Overdue Fees" },
      { id: "category", name: "Charge-wise Collections" },
      { id: "mode", name: "Payment Methods" },
      { id: "ledger", name: "Student Payment History" },
    ];
    const [type, setType] = useState("summary");
    const [academicYearId, setAcademicYearId] = useState(academic.selectedAcademicYearId || "");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [studentId, setStudentId] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const outstanding = type === "outstanding" || type === "overdue";
    const invalidRange = fromDate && toDate && fromDate > toDate;

    useEffect(() => {
      let active = true;
      setResult(null);
      setError("");
      if (invalidRange || (type === "ledger" && !studentId.trim())) { setLoading(false); return; }
      setLoading(true);
      const request = outstanding
        ? feeCollectionApi.allPending({ academicYearId, overdueOnly: type === "overdue", dueFrom: fromDate, dueTo: toDate })
        : type === "ledger"
        ? feeCollectionApi.allHistory({ studentId, fromDate, toDate })
        : feeCollectionApi.dashboard({ academicYearId, fromDate, toDate });
      request.then(data => { if (active) setResult(data); })
        .catch(reason => { if (active) setError(reason.message || "Unable to load this report."); })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }, [type, academicYearId, fromDate, toDate, studentId, academic.selectedCollegeId, invalidRange, outstanding]);

    const title = reportTypes.find(report => report.id === type).name;
    let rows = [], columns = [];
    let totalRow = null;
    let summaryMetrics = null;

    const amount = (label, key, width = "30%") => ({
      label,
      value: key,
      width,
      align: "right",
      render: row => feeMoney(row[key]),
    });

    if (outstanding) {
      rows = Array.isArray(result) ? result : [];
      columns = [
        { label: "Student", value: "studentName", width: "20%", align: "left" },
        { label: "Student ID", value: "studentCode", width: "13%", align: "left" },
        { label: "Charge", value: "feeCategory", width: "16%", align: "left" },
        { label: "Due Date", value: row => formatReportDate(row.dueDate), key: "dueDate", width: "13%", align: "left", render: row => formatReportDate(row.dueDate) },
        amount("Payable", "payableAmount", "12%"),
        amount("Paid", "paidAmount", "12%"),
        amount("Balance", "balanceAmount", "14%"),
      ];
      if (rows.length > 0) {
        const totalPayable = rupees(rows.reduce((sum, r) => sum + cents(r.payableAmount || 0), 0));
        const totalPaid = rupees(rows.reduce((sum, r) => sum + cents(r.paidAmount || 0), 0));
        const totalBalance = rupees(rows.reduce((sum, r) => sum + cents(r.balanceAmount || 0), 0));
        totalRow = {
          studentName: <strong>Total</strong>,
          payableAmount: <strong>{feeMoney(totalPayable)}</strong>,
          paidAmount: <strong>{feeMoney(totalPaid)}</strong>,
          balanceAmount: <strong>{feeMoney(totalBalance)}</strong>,
        };
        summaryMetrics = [
          { label: "Total Payable", value: feeMoney(totalPayable) },
          { label: "Total Paid", value: feeMoney(totalPaid) },
          { label: type === "overdue" ? "Total Overdue" : "Total Outstanding", value: feeMoney(totalBalance) },
        ];
      }
    } else if (type === "ledger") {
      rows = Array.isArray(result) ? result : [];
      columns = [
        { label: "Receipt", value: "receiptNumber", width: "16%", align: "left" },
        { label: "Student", value: "studentName", width: "22%", align: "left" },
        { label: "Date", value: row => formatReportDate(row.paymentDate), key: "paymentDate", width: "15%", align: "left", render: row => formatReportDate(row.paymentDate) },
        { label: "Method", value: "paymentMode", width: "15%", align: "left" },
        { label: "Reference", value: "transactionReference", width: "16%", align: "left" },
        amount("Paid", "totalAmount", "16%"),
      ];
      if (rows.length > 0) {
        const totalPaid = rupees(rows.reduce((sum, r) => sum + cents(r.totalAmount || 0), 0));
        totalRow = {
          receiptNumber: <strong>Total</strong>,
          totalAmount: <strong>{feeMoney(totalPaid)}</strong>,
        };
        if (studentId.trim()) {
          summaryMetrics = [
            { label: "Total Paid", value: feeMoney(totalPaid) },
            { label: "Total Receipts", value: rows.length.toLocaleString() },
          ];
        }
      }
    } else if (type === "mode") {
      rows = result?.byPaymentMode || [];
      columns = [
        { label: "Payment Method", value: "paymentMode", width: "40%", align: "left" },
        { label: "Transactions", value: "paymentCount", width: "30%", align: "right", render: row => Number(row.paymentCount || 0).toLocaleString() },
        amount("Collected Amount", "amount", "30%"),
      ];
      if (rows.length > 0) {
        const totalTx = rows.reduce((sum, r) => sum + Number(r.paymentCount || 0), 0);
        const totalCollected = rupees(rows.reduce((sum, r) => sum + cents(r.amount || 0), 0));
        totalRow = {
          paymentMode: <strong>Total</strong>,
          paymentCount: <strong>{totalTx.toLocaleString()}</strong>,
          amount: <strong>{feeMoney(totalCollected)}</strong>,
        };
        summaryMetrics = [
          { label: "Total Collected", value: feeMoney(totalCollected) },
          { label: "Total Transactions", value: totalTx.toLocaleString() },
        ];
      }
    } else if (type === "category") {
      rows = result?.byCategory || [];
      columns = [
        { label: "Charge", value: "categoryName", width: "34%", align: "left" },
        amount("Assigned", "assigned", "22%"),
        amount("Collected", "collected", "22%"),
        amount("Pending", "pending", "22%"),
      ];
      if (rows.length > 0) {
        const totalAssigned = rupees(rows.reduce((sum, r) => sum + cents(r.assigned || 0), 0));
        const totalCollected = rupees(rows.reduce((sum, r) => sum + cents(r.collected || 0), 0));
        const totalPending = rupees(rows.reduce((sum, r) => sum + cents(r.pending || 0), 0));
        totalRow = {
          categoryName: <strong>Total</strong>,
          assigned: <strong>{feeMoney(totalAssigned)}</strong>,
          collected: <strong>{feeMoney(totalCollected)}</strong>,
          pending: <strong>{feeMoney(totalPending)}</strong>,
        };
        summaryMetrics = [
          { label: "Total Assigned", value: feeMoney(totalAssigned) },
          { label: "Total Collected", value: feeMoney(totalCollected) },
          { label: "Total Pending", value: feeMoney(totalPending) },
        ];
      }
    } else {
      const groups = new Map();
      for (const row of result?.collectionTrend || []) {
        const period = date(row.date).slice(0, type === "summary" ? 7 : 10);
        const previous = groups.get(period) || { period, amount: 0, paymentCount: 0 };
        previous.amount = rupees(cents(previous.amount) + cents(row.amount));
        previous.paymentCount += Number(row.paymentCount || 0);
        groups.set(period, previous);
      }
      rows = [...groups.values()].sort((a, b) => a.period.localeCompare(b.period));
      columns = [
        {
          label: type === "summary" ? "Month" : "Date",
          value: row => (type === "summary" ? formatReportMonth(row.period) : formatReportDate(row.period)),
          key: "period",
          width: "40%",
          align: "left",
          render: row => (type === "summary" ? formatReportMonth(row.period) : formatReportDate(row.period)),
        },
        {
          label: "Transactions",
          value: "paymentCount",
          width: "30%",
          align: "right",
          render: row => Number(row.paymentCount || 0).toLocaleString(),
        },
        amount("Collected Amount", "amount", "30%"),
      ];
      if (rows.length > 0) {
        const totalTx = rows.reduce((sum, r) => sum + Number(r.paymentCount || 0), 0);
        const totalCollected = rupees(rows.reduce((sum, r) => sum + cents(r.amount || 0), 0));
        const avgCollection = totalTx > 0 ? rupees(Math.round(cents(totalCollected) / totalTx)) : 0;
        totalRow = {
          period: <strong>Total</strong>,
          paymentCount: <strong>{totalTx.toLocaleString()}</strong>,
          amount: <strong>{feeMoney(totalCollected)}</strong>,
        };
        summaryMetrics = [
          { label: "Total Collected", value: feeMoney(totalCollected) },
          { label: "Total Transactions", value: totalTx.toLocaleString() },
          { label: "Average Collection per Transaction", value: feeMoney(avgCollection) },
        ];
      }
    }

    const tableColumns = columns.map(column => ({
      ...column,
      render: column.render || (row => typeof column.value === "function" ? column.value(row) : row[column.value] ?? "—")
    }));
    const rangeError = invalidRange ? "From Date must be on or before To Date." : error;

    return (
      <div className="fm-page-container fm-reports-container">
        <header className="fm-page-header fm-reports-header">
          <div className="fm-reports-header-text">
            <h1 className="fm-reports-title">Fee Reports</h1>
            <p className="fm-reports-description">Review collections and outstanding fees. Export the selected report.</p>
          </div>
          <div className="fm-reports-header-actions">
            <ExportMenu rows={rows} columns={columns} filename={"fee-report-" + type} title={title} loading={loading} unavailable={rangeError} />
          </div>
        </header>

        <div className="fm-workspace fm-reports-workspace">
          {/* 2. Compact report filter toolbar */}
          <div className="fm-filter-bar fm-reports-filter-bar">
            <FeeSelect
              label="Report Type"
              displayLabel="Report Type"
              className="fs-field fm-filter-field fm-filter-field--type"
              value={type}
              options={reportTypes}
              onChange={setType}
            />
            {type === "ledger" ? (
              <FeeInput
                label="Student ID"
                className="fs-field fm-filter-field fm-filter-field--student"
                value={studentId}
                onChange={setStudentId}
                placeholder="Enter student ID"
              />
            ) : (
              <FeeSelect
                label="Academic Year"
                displayLabel="Academic Year"
                className="fs-field fm-filter-field fm-filter-field--year"
                value={academicYearId}
                options={[
                  { id: "", name: "All Years" },
                  ...(academic.academicYears || []).map((y) => ({
                    id: String(y.academicYearId || y.id),
                    name: y.academicYearName || y.name,
                  })),
                ]}
                onChange={setAcademicYearId}
              />
            )}
            <FeeInput
              label="From Date"
              type="date"
              className="fs-field fm-filter-field fm-filter-field--date"
              value={fromDate}
              max={toDate || undefined}
              onChange={setFromDate}
            />
            <FeeInput
              label="To Date"
              type="date"
              className="fs-field fm-filter-field fm-filter-field--date"
              value={toDate}
              min={fromDate || undefined}
              onChange={setToDate}
            />
            <button
              type="button"
              className="fm-reset-btn fm-reports-reset-btn"
              onClick={() => {
                setAcademicYearId("");
                setFromDate("");
                setToDate("");
                setStudentId("");
              }}
            >
              Reset
            </button>
          </div>

          {/* 3. Relevant report summary strip */}
          {summaryMetrics && !loading && !rangeError && rows.length > 0 && (
            <div className="fm-report-summary-strip" role="region" aria-label="Report summary">
              {summaryMetrics.map((item, idx) => (
                <div key={idx} className="fm-report-summary-item">
                  <span className="fm-report-summary-label">{item.label}</span>
                  <strong className="fm-report-summary-value">{item.value}</strong>
                </div>
              ))}
            </div>
          )}

          {/* 4. Report title and record count */}
          <div className="fm-report-context">
            <strong>{title}</strong>
            <span>
              {rows.length} {rows.length === 1 ? "record" : "records"} |{" "}
              {outstanding
                ? "Dates filter installment due dates"
                : "Dates filter payment dates"}
            </span>
          </div>

          {/* 5. Properly aligned report table */}
          <FeeTable
            columns={tableColumns}
            rows={rows}
            totalRow={totalRow}
            className="fm-report-table"
            wrapClassName="fm-reports-table-wrap"
            loading={loading}
            error={rangeError}
            rowKey={(row) =>
              row.studentFeeId ||
              row.paymentId ||
              row.feeCategoryId ||
              row.paymentMode ||
              row.period ||
              row.receiptNumber
            }
            empty={
              type === "ledger" && !studentId
                ? "Enter a student ID to view payment history."
                : "No records for the selected report and filters."
            }
          />
        </div>
      </div>
    );
  }

  // Router component wrapper
  /* export default */ function ServerFeeCollection(props) {
    if (props.overview) {
      return <FinanceOverview {...props} />;
    }
    if (props.page === "collection") {
      return <CollectPayment {...props} />;
    }
    if (props.page === "receipts") {
      return <Payments {...props} />;
    }
    if (props.page === "reports") {
      return <FeeReports {...props} />;
    }
    return <FinanceOverview {...props} />;
  }

  return {
    get default() {
      return ServerFeeCollection;
    },
    get FinanceOverview() {
      return FinanceOverview;
    },
    get Payments() {
      return Payments;
    },
    get CollectPayment() {
      return CollectPayment;
    },
    get FeeReports() {
      return FeeReports;
    },
  };
})();

// ============================================================================
// MODULE 4: FEE MANAGEMENT MODULE (STUDENT FEES, DETAILS, ASSIGNMENTS & ROUTER)
// ============================================================================
export const FeeManagementModule = (() => {
  const { useEffect, useId, useMemo, useRef, useState } = external0;
  const { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } =
    external1;
  const {
    FiArrowLeft,
    FiCheck,
    FiCopy,
    FiEdit2,
    FiEye,
    FiFilter,
    FiPlus,
    FiRefreshCw,
    FiSearch,
    FiSettings,
    FiTrash2,
    FiX,
  } = external3;
  const { default: DashboardLayout } = DashboardLayoutModule;
  const { default: PageHeader } = PageHeaderModule;
  const { default: ExportMenu } = ExportMenuModule;
  const { useAcademic } = AcademicContextModule;
  const { studentProfilesApi, feeCollectionApi } = apiEndpointsModule;
  const { getAuthStorage } = authModule;
  const { collegeField } = collegeScopeModule;
  const { printSingleRecord } = exportUtilsModule;
  const { showError, showSuccess } = toastModule;
  const { default: useToastState } = useToastStateModule;
  const { default: FeeStructureConfiguration } = FeeStructureModule;
  const {
    FeeBadge,
    FeeDialog,
    FeeInput,
    FeeReview,
    FeeSelect,
    FeeStats,
    FeeTable,
    financialLedgerRows,
  } = FeeStructureWizardModule;
  const { default: CreateAcademicFeePlan } = FeeStructureWizardModule;
  const { default: ServerFeeCollection } = ServerFeeCollectionModule;
  const {
    assignFeeStructure,
    cents,
    emptyFeeWorkspace,
    feeLedger,
    feeMoney,
    feeToday,
    feeTotal,
    newFeeStructure,
    readFeeWorkspace,
    rupees,
    saveWorkflowStructure,
    transitionFeeStructure,
    studentMatchesFee,
    writeFeeWorkspace,
  } = feeStructureServiceModule;

  function studentRecord(r) {
    const personal = r.personalDetails || r.personal || {};
    const admission = r.admissionDetails || r.admission || {};
    const academic = r.academicDetails || r.academic || {};
    const merged = { ...r, ...admission, ...academic };
    const text = (...vals) => vals.find((v) => v != null && String(v).trim()) || "";
    return {
      id: String(r.id || r.studentId || ""),
      name: text(
        r.studentName,
        r.fullName,
        r.name,
        personal.fullName,
        [personal.firstName, personal.lastName].filter(Boolean).join(" ")
      ),
      code: text(r.studentCode, r.rollNumber, r.rollNo, String(r.id || "")),
      roll: text(r.rollNumber, r.rollNo, academic.rollNumber),
      application: text(
        r.applicationNumber,
        admission.applicationNumber,
        r.admissionNumber
      ),
      academicYearId: String(collegeField(merged, "academicYear") || ""),
      courseId: String(collegeField(merged, "course") || ""),
      branchId: String(collegeField(merged, "branch") || ""),
      batch: text(r.batch, academic.batch, admission.batch),
      courseName: text(r.courseName, r.course, academic.courseName),
      branchName: text(r.branchName, r.branch, academic.branchName),
      category: text(r.admissionQuota, r.quota, r.studentCategory),
    };
  }

  // ==========================================================================
  // MANAGE CHARGES PAGE (`/fees/components`)
  // ==========================================================================
  function ManageCharges({ state, commit }) {
    const navigate = useNavigate();
    const [form, setForm] = useState(null);
    const [query, setQuery] = useState("");
    const [error, setError] = useState("");

    const blank = {
      name: "",
      code: "",
      category: "Academic",
      frequency: "Yearly",
      refundable: false,
      status: "Active",
    };

    const handleSave = () => {
      if (!form.name?.trim()) {
        setError("Charge name is required.");
        return;
      }
      if (!form.code?.trim()) {
        setError("Charge code is required.");
        return;
      }
      try {
        const id = form.id || `FC-${Date.now()}`;
        const next = {
          ...state,
          components: [
            { ...form, id },
            ...state.components.filter((c) => c.id !== form.id),
          ],
        };
        commit(next);
        setForm(null);
      } catch (e) {
        setError(e.message);
      }
    };

    const toggleStatus = (c) => {
      const next = {
        ...state,
        components: state.components.map((x) =>
          x.id === c.id
            ? { ...x, status: x.status === "Active" ? "Inactive" : "Active" }
            : x
        ),
      };
      commit(next);
    };

    return (
      <div className="fm-page-container">
        <header className="fm-page-header">
          <div>
            <button
              type="button"
              className="fm-back-btn"
              onClick={() => navigate("/fees/structures")}
            >
              <FiArrowLeft /> Back to Fee Plans
            </button>
            <h1>Charges</h1>
            <p>Define individual charges here, then add their amounts and payment schedules to Fee Plans.</p>
          </div>
          <div className="fm-header-actions">
            <button
              type="button"
              className="erp-btn erp-btn--primary"
              onClick={() => {
                setError("");
                setForm(blank);
              }}
            >
              <FiPlus /> Add Charge
            </button>
          </div>
        </header>

        <div className="fm-workspace">
          <div className="fm-filter-bar">
            <div className="fm-search-wrap">
              <FiSearch />
              <input
                type="text"
                placeholder="Search charge name or code..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          <FeeTable
            rows={state.components.filter((c) =>
              `${c.name} ${c.code}`.toLowerCase().includes(query.toLowerCase())
            )}
            empty="No charges configured yet. Click '+ Add Charge' to create one."
            columns={[
              { label: "Charge Name", key: "name" },
              { label: "Code", key: "code" },
              { label: "Category", key: "category" },
              { label: "Frequency", key: "frequency" },
              {
                label: "Refundable",
                render: (c) => (c.refundable ? "Yes" : "No"),
              },
              { label: "Status", render: (c) => <FeeBadge value={c.status} /> },
              {
                label: "Actions",
                align: "right",
                render: (c) => (
                  <div className="fm-table-actions">
                    <button
                      type="button"
                      className="fm-icon-btn"
                      title="Edit Charge"
                      onClick={() => {
                        setError("");
                        setForm(c);
                      }}
                    >
                      <FiEdit2 />
                    </button>
                    <button
                      type="button"
                      className="erp-btn erp-btn--secondary erp-btn--sm"
                      onClick={() => toggleStatus(c)}
                    >
                      {c.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>

        {form && (
          <FeeDialog
            title={form.id ? "Edit Charge" : "Add Charge"}
            close={() => setForm(null)}
            footer={
              <>
                <button
                  type="button"
                  className="erp-btn erp-btn--secondary"
                  onClick={() => setForm(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="erp-btn erp-btn--primary"
                  onClick={handleSave}
                >
                  Save Charge
                </button>
              </>
            }
          >
            {error && (
              <div className="fm-error-banner" role="alert">
                <FiX /> <span>{error}</span>
              </div>
            )}
            <div className="fm-form-grid">
              <FeeInput
                label="Charge Name *"
                placeholder="e.g. Tuition Fee"
                value={form.name}
                onChange={(name) => setForm({ ...form, name })}
              />
              <FeeInput
                label="Charge Code *"
                placeholder="e.g. TUI-01"
                value={form.code}
                onChange={(code) => setForm({ ...form, code })}
              />
              <FeeSelect
                label="Category *"
                value={form.category}
                options={[
                  { id: "Academic", name: "Academic" },
                  { id: "University", name: "University" },
                  { id: "Examination", name: "Examination" },
                  { id: "Laboratory", name: "Laboratory" },
                  { id: "Student Service", name: "Student Service" },
                  { id: "Hostel", name: "Hostel" },
                  { id: "Transport", name: "Transport" },
                  { id: "Deposit", name: "Deposit" },
                ]}
                onChange={(category) => setForm({ ...form, category })}
              />
              <FeeSelect
                label="Frequency"
                value={form.frequency}
                options={[
                  { id: "Yearly", name: "Yearly" },
                  { id: "Semester-wise", name: "Semester-wise" },
                  { id: "One Time", name: "One Time" },
                  { id: "Monthly", name: "Monthly" },
                ]}
                onChange={(frequency) => setForm({ ...form, frequency })}
              />
              <FeeSelect
                label="Status"
                value={form.status}
                options={[
                  { id: "Active", name: "Active" },
                  { id: "Inactive", name: "Inactive" },
                ]}
                onChange={(status) => setForm({ ...form, status })}
              />
              <label className="fm-checkbox-label">
                <input
                  type="checkbox"
                  checked={Boolean(form.refundable)}
                  onChange={(e) => setForm({ ...form, refundable: e.target.checked })}
                />
                <span>Refundable Charge</span>
              </label>
            </div>
          </FeeDialog>
        )}
      </div>
    );
  }

  // ==========================================================================
  // DESTINATION 3: STUDENT FEES (`/fees/students`)
  // ==========================================================================
  function StudentFees({ academic, ledgers, assignments, masters }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [query, setQuery] = useState("");
    const [academicYearId, setAcademicYearId] = useState(
      academic.selectedAcademicYearId || ""
    );
    const [courseId, setCourseId] = useState("");
    const [branchId, setBranchId] = useState("");
    const [statusFilter, setStatusFilter] = useState(
      location.state?.status || "All"
    );

    const [serverRows, setServerRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
      let active = true;
      setLoading(true);
      setError("");
      feeCollectionApi
        .allPending({
          academicYearId,
          courseId,
          branchId,
          search: query,
        })
        .then((items) => {
          if (active) setServerRows(items || []);
        })
        .catch((reason) => { if (active) setError(reason.message || "Unable to load fee records. Please try again."); })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [academicYearId, courseId, branchId, query, academic.selectedCollegeId]);

    // Unified student rows
    const studentRows = useMemo(() => {
      if (serverRows.length > 0) {
        return serverRows.map((r) => {
          const balance = Number(r.balanceAmount || 0);
          const paid = Number(r.paidAmount || 0);
          const status = r.overdue
            ? "Overdue"
            : balance === 0
            ? "Paid"
            : paid > 0
            ? "Partially Paid"
            : "Payment Due";
          return {
            id: r.studentId,
            studentFeeId: r.studentFeeId,
            planName: r.feePlanName || r.structureName || r.feeCategory,
            name: r.studentName,
            roll: r.studentCode,
            application: r.studentCode,
            courseName: r.courseName,
            branchName: r.branchName,
            batch: r.batch || "—",
            totalFee: Number(r.payableAmount || 0),
            discount: Number(r.concessionAmount || 0),
            paid,
            balance,
            nextDue: date(r.dueDate),
            status,
          };
        });
      }

      // Fallback to local workspace ledgers if server records are empty
      return ledgers.map((a) => {
        const bal = rupees(a.ledger.outstanding);
        const status = a.ledger.overdue
          ? "Overdue"
          : bal === 0
          ? "Paid"
          : a.ledger.paid > 0
          ? "Partially Paid"
          : "Payment Due";
        return {
          id: a.student.id,
          assignmentId: a.id,
          planName: a.structure.name,
          name: a.student.name,
          roll: a.student.roll || a.student.code,
          application: a.student.application || a.student.code,
          courseName: a.structure.courseName || a.student.courseName,
          branchName: a.structure.branchName || a.student.branchName,
          batch: a.structure.batch || a.student.batch,
          totalFee: rupees(a.ledger.total),
          discount: rupees(a.ledger.concession),
          paid: rupees(a.ledger.paid),
          balance: bal,
          nextDue: "—",
          status,
        };
      });
    }, [serverRows, ledgers]);

    const filteredStudents = useMemo(() => {
      return studentRows.filter((st) => {
        const text = `${st.name} ${st.roll} ${st.application}`.toLowerCase();
        const matchesQuery = !query || text.includes(query.toLowerCase());
        const matchesStatus =
          statusFilter === "All" || (statusFilter === "Pending" ? st.balance > 0 : st.status === statusFilter);
        return matchesQuery && matchesStatus;
      });
    }, [studentRows, query, statusFilter]);

    return (
      <div className="fm-page-container">
        {/* Page Header */}
        <header className="fm-page-header">
          <div>
            <h1>Student Fees</h1>
            <p>View student fee amounts, payments and remaining balances.</p>
          </div>
          <div className="fm-header-actions">
            <Link to="/fees/assignments" className="erp-btn erp-btn--primary">
              <FiPlus /> Assign Fee Plan
            </Link>
          </div>
        </header>

        {/* Main Content Surface */}
        <div className="fm-workspace">
          {/* Compact Single-Row Filters */}
          <div className="fm-filter-bar">
            <div className="fm-search-wrap">
              <FiSearch />
              <input
                type="text"
                placeholder="Search student, roll or admission no..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  className="fm-clear-btn"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <FiX />
                </button>
              )}
            </div>

            <FeeSelect
              label="Academic Year"
              value={academicYearId}
              options={[{ id: "", name: "All Years" }, ...masters.years]}
              onChange={setAcademicYearId}
            />

            <FeeSelect
              label="Course"
              value={courseId}
              options={[{ id: "", name: "All Courses" }, ...masters.courses]}
              onChange={(c) => {
                setCourseId(c);
                setBranchId("");
              }}
            />

            <FeeSelect
              label="Branch"
              value={branchId}
              options={[
                { id: "", name: "All Branches" },
                ...masters.branches.filter(
                  (b) => !courseId || String(b.courseId) === String(courseId)
                ),
              ]}
              onChange={setBranchId}
            />

            <FeeSelect
              label="Payment Status"
              value={statusFilter}
              options={[
                { id: "All", name: "All Statuses" },
                { id: "Pending", name: "All Outstanding" },
                { id: "Paid", name: "Paid" },
                { id: "Partially Paid", name: "Partially Paid" },
                { id: "Payment Due", name: "Payment Due" },
                { id: "Overdue", name: "Overdue" },
              ]}
              onChange={setStatusFilter}
            />

            {(query || academicYearId || courseId || branchId || statusFilter !== "All") && (
              <button
                type="button"
                className="fm-reset-btn"
                onClick={() => {
                  setQuery("");
                  setAcademicYearId("");
                  setCourseId("");
                  setBranchId("");
                  setStatusFilter("All");
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Student Table */}
          <FeeTable
            loading={loading}
            error={error}
            rows={filteredStudents}
            rowKey={st => st.studentFeeId || st.assignmentId || st.id}
            pageSize={10}
            columns={[
              {
                label: "Student",
                render: (st) => (
                  <div>
                    <strong>{st.name}</strong>
                    <small className="fm-cell-sub">
                      {st.roll} · {st.application}
                    </small>
                  </div>
                ),
              },
              {
                label: "Course / Branch",
                render: (st) => (
                  <div>
                    <span>{st.courseName || "—"}</span>
                    <small className="fm-cell-sub">
                      {st.branchName} · {st.batch}
                    </small>
                  </div>
                ),
              },
              {
                label: "Total Fee",
                align: "right",
                render: (st) => feeMoney(st.totalFee),
              },
              {
                label: "Discount",
                align: "right",
                render: (st) => (st.discount > 0 ? `-${feeMoney(st.discount)}` : "—"),
              },
              {
                label: "Paid",
                align: "right",
                render: (st) => feeMoney(st.paid),
              },
              {
                label: "Balance",
                align: "right",
                render: (st) => (
                  <strong style={{ color: st.balance > 0 ? "var(--brand, #2563eb)" : "inherit" }}>
                    {feeMoney(st.balance)}
                  </strong>
                ),
              },
              { label: "Fee Plan", key: "planName" },
              { label: "Next Due", render: (st) => st.nextDue || "—" },
              { label: "Status", render: (st) => <FeeBadge value={st.status} /> },
              {
                label: "Actions",
                align: "right",
                render: (st) => (
                  <div className="fm-table-actions">
                    <Link
                      to={st.assignmentId ? `/fees/ledger/${st.assignmentId}` : `/fees/accounts/${st.id}`}
                      className="erp-btn erp-btn--secondary erp-btn--sm"
                    >
                      View Details
                    </Link>
                    <Link
                      to="/fees/collection"
                      state={{ studentSearch: st.roll, studentId: st.id }}
                      className="erp-btn erp-btn--primary erp-btn--sm"
                    >
                      Collect
                    </Link>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
    );
  }

  // ==========================================================================
  // STUDENT FEE DETAILS (`/fees/accounts/:studentId` & `/fees/ledger/:id`)
  // ==========================================================================
  function StudentFeeDetails({ academic, state, ledgers }) {
    const { studentId, assignmentId } = useParams();
    const navigate = useNavigate();

    const [tab, setTab] = useState("summary");
    const [studentData, setStudentData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const assignment = state.assignments.find((a) => a.id === assignmentId);
    const localLedger = assignment ? feeLedger(state, assignment) : null;

    useEffect(() => {
      let active = true;
      if (studentId) {
        setLoading(true);
        setStudentData(null);
        setError("");
        Promise.allSettled([
          feeCollectionApi.allPending({ studentId }),
          feeCollectionApi.allHistory({ studentId }),
        ])
          .then(([pRes, hRes]) => {
            if (!active) return;
            const failed = [pRes, hRes].find(res => res.status === "rejected");
            if (failed) { setError(failed.reason?.message || "Unable to load student fees."); return; }
            const dues = pRes.status === "fulfilled" ? pRes.value || [] : [];
            const hist = hRes.status === "fulfilled" ? hRes.value || [] : [];
            setStudentData({ dues, payments: hist });
          })
          .catch(() => {})
          .finally(() => {
            if (active) setLoading(false);
          });
      } else {
        setLoading(false);
      }
      return () => {
        active = false;
      };
    }, [studentId, academic.selectedCollegeId]);

    const s = assignment?.student || studentData?.dues?.[0] || studentData?.payments?.[0];
    const dues = studentData?.dues || [];
    const payments = studentData?.payments || localLedger?.payments || [];

    const totalFee = localLedger
      ? rupees(localLedger.total)
      : dues.reduce((a, b) => a + Number(b.payableAmount || 0), 0);
    const discount = localLedger
      ? rupees(localLedger.concession)
      : dues.reduce((a, b) => a + Number(b.concessionAmount || 0), 0);
    const paid = localLedger
      ? rupees(localLedger.paid)
      : dues.reduce((a, b) => a + Number(b.paidAmount || 0), 0);
    const balance = localLedger
      ? rupees(localLedger.outstanding)
      : dues.reduce((a, b) => a + Number(b.balanceAmount || 0), 0);
    const overdue = localLedger
      ? rupees(localLedger.overdue)
      : dues.reduce((a, b) => a + (b.overdue ? Number(b.balanceAmount || 0) : 0), 0);

    return (
      <div className="fm-page-container">
        {/* Header */}
        <header className="fm-page-header">
          <div>
            <button
              type="button"
              className="fm-back-btn"
              onClick={() => navigate("/fees/students")}
            >
              <FiArrowLeft /> Back to Student Fees
            </button>
            <h1>{s?.name || s?.studentName || "Student Fee Details"}</h1>
            <p>
              {s?.code || s?.studentCode || studentId} · {s?.courseName || "Program"}{" "}
              {s?.branchName || "Branch"} · {s?.batch || "—"}
            </p>
          </div>
          <div className="fm-header-actions">
            <Link
              to="/fees/collection"
              state={{ studentSearch: s?.code || s?.studentCode }}
              className="erp-btn erp-btn--primary"
            >
              <FiPlus /> Collect Payment
            </Link>
          </div>
        </header>

        <FeeRequestState loading={loading} error={error}>
        {/* 4 Compact Summary Values Strip */}
        <div className="fm-kpis-grid">
          <div className="fm-kpi-card">
            <span className="fm-kpi-label">TOTAL FEE</span>
            <strong className="fm-kpi-value">{feeMoney(totalFee)}</strong>
          </div>
          <div className="fm-kpi-card">
            <span className="fm-kpi-label">DISCOUNT</span>
            <strong className="fm-kpi-value">{feeMoney(discount)}</strong>
          </div>
          <div className="fm-kpi-card">
            <span className="fm-kpi-label">PAID</span>
            <strong className="fm-kpi-value">{feeMoney(paid)}</strong>
          </div>
          <div className="fm-kpi-card">
            <span className="fm-kpi-label">BALANCE</span>
            <strong className="fm-kpi-value" style={{ color: "var(--brand, #2563eb)" }}>
              {feeMoney(balance)}
            </strong>
          </div>
        </div>

        {/* Main Content Surface with Underline Tabs */}
        <div className="fm-workspace">
          <div className="fm-tabs-bar" role="tablist">
            <button
              type="button"
              className={`fm-tab-btn ${tab === "summary" ? "active" : ""}`}
              onClick={() => setTab("summary")}
            >
              Summary
            </button>
            <button
              type="button"
              className={`fm-tab-btn ${tab === "payments" ? "active" : ""}`}
              onClick={() => setTab("payments")}
            >
              Payments
            </button>
            <button
              type="button"
              className={`fm-tab-btn ${tab === "installments" ? "active" : ""}`}
              onClick={() => setTab("installments")}
            >
              Installments
            </button>
            <button
              type="button"
              className={`fm-tab-btn ${tab === "adjustments" ? "active" : ""}`}
              onClick={() => setTab("adjustments")}
            >
              Adjustments
            </button>
            <button
              type="button"
              className={`fm-tab-btn ${tab === "ledger" ? "active" : ""}`}
              onClick={() => setTab("ledger")}
            >
              Ledger
            </button>
          </div>

          {/* Tab 1: Summary Calculation */}
          {tab === "summary" && (
            <div className="fm-tab-body">
              <div className="fm-summary-calculation">
                <div className="fm-calc-row">
                  <span>Academic Fee</span>
                  <strong>{feeMoney(totalFee)}</strong>
                </div>
                {discount > 0 && (
                  <div className="fm-calc-row">
                    <span>Scholarship / Concession</span>
                    <strong style={{ color: "var(--success)" }}>-{feeMoney(discount)}</strong>
                  </div>
                )}
                {paid > 0 && (
                  <div className="fm-calc-row">
                    <span>Payments Recorded</span>
                    <strong style={{ color: "var(--brand)" }}>-{feeMoney(paid)}</strong>
                  </div>
                )}
                <div className="fm-calc-total-row">
                  <span>Remaining Balance</span>
                  <strong>{feeMoney(balance)}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Payments History */}
          {tab === "payments" && (
            <div className="fm-tab-body">
              <FeeTable
                rows={payments}
                empty="No payments recorded yet for this student."
                columns={[
                  { label: "Receipt No", key: "receiptNumber" },
                  { label: "Date", render: (p) => date(p.paymentDate || p.date) },
                  { label: "Payment Method", render: (p) => p.paymentMode || p.mode },
                  {
                    label: "Amount",
                    align: "right",
                    render: (p) => <strong>{feeMoney(p.totalAmount || p.amount)}</strong>,
                  },
                  { label: "Status", render: () => <FeeBadge value="Confirmed" /> },
                ]}
              />
            </div>
          )}

          {/* Tab 3: Installments */}
          {tab === "installments" && (
            <div className="fm-tab-body">
              <FeeTable
                rows={dues.length > 0 ? dues : localLedger?.cells || []}
                empty="No scheduled installments found."
                columns={[
                  {
                    label: "Installment",
                    render: (d) => d.feeCategory || d.name || `Payment Tranche`,
                  },
                  { label: "Due Date", render: (d) => date(d.dueDate) },
                  {
                    label: "Amount",
                    align: "right",
                    render: (d) => feeMoney(d.payableAmount || d.amount),
                  },
                  {
                    label: "Paid",
                    align: "right",
                    render: (d) => feeMoney(d.paidAmount || d.paid || 0),
                  },
                  {
                    label: "Balance",
                    align: "right",
                    render: (d) => <strong>{feeMoney(d.balanceAmount || d.balance || 0)}</strong>,
                  },
                  {
                    label: "Status",
                    render: (d) => (
                      <FeeBadge
                        value={
                          d.overdue
                            ? "Overdue"
                            : (d.balanceAmount || d.balance) === 0
                            ? "Paid"
                            : "Due"
                        }
                      />
                    ),
                  },
                ]}
              />
            </div>
          )}

          {/* Tab 4: Adjustments */}
          {tab === "adjustments" && (
            <div className="fm-tab-body">
              <div className="fm-section-header-inline">
                <h3>Scholarships &amp; Waivers</h3>
                <Link to="/fees/concessions" className="erp-btn erp-btn--secondary erp-btn--sm">
                  <FiPlus /> Add Adjustment
                </Link>
              </div>
              <p className="fm-empty-text">No active adjustments or waivers recorded for this student.</p>
            </div>
          )}

          {/* Tab 5: Ledger */}
          {tab === "ledger" && (
            <div className="fm-tab-body">
              <FeeTable
                rows={
                  assignment && localLedger
                    ? financialLedgerRows(assignment, localLedger, state.concessions.filter(c => c.assignmentId === assignment.id))
                    : []
                }
                empty="Chronological financial transactions will appear here as fees and payments are posted."
                columns={[
                  { label: "Date", render: (r) => date(r.date) },
                  { label: "Reference", key: "reference" },
                  { label: "Description", key: "description" },
                  {
                    label: "Debit (₹)",
                    align: "right",
                    render: (r) => (r.debit ? feeMoney(rupees(r.debit)) : "—"),
                  },
                  {
                    label: "Credit (₹)",
                    align: "right",
                    render: (r) => (r.credit ? feeMoney(rupees(r.credit)) : "—"),
                  },
                  {
                    label: "Balance (₹)",
                    align: "right",
                    render: (r) => <strong>{feeMoney(rupees(r.balance))}</strong>,
                  },
                ]}
              />
            </div>
          )}
        </div>
        </FeeRequestState>
      </div>
    );
  }

  // ==========================================================================
  // ASSIGN FEE PLAN (`/fees/assignments`)
  // ==========================================================================
  function AssignFeePlan({
    state,
    commit,
    students,
    masters,
    filter,
    setFilter,
  }) {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [selectedPlanId, setSelectedPlanId] = useState("");
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [searchStudent, setSearchStudent] = useState("");

    const publishedPlans = state.structures.filter(
      (s) =>
        s.status === "Published"
    );
    const plan = publishedPlans.find((p) => p.id === selectedPlanId);

    // Eligible students matching the selected plan
    const eligibleStudents = useMemo(() => {
      if (!plan) return [];
      return students.filter((s) => {
        const matchesPlan = studentMatchesFee(s, plan);
        const text = `${s.name} ${s.code} ${s.roll}`.toLowerCase();
        const matchesSearch =
          !searchStudent || text.includes(searchStudent.toLowerCase());
        return matchesPlan && matchesSearch;
      });
    }, [plan, students, searchStudent]);

    const handleConfirm = () => {
      const chosen = students.filter((s) => studentMatchesFee(s, plan) &&
        selectedStudents.includes(s.id)
      );
      try { commit(assignFeeStructure(state, plan.id, chosen)); }
      catch (reason) { showError(reason.message); return; }
      showSuccess(`Assigned fee plan to ${chosen.length} students.`);
      navigate("/fees/students");
    };

    return (
      <div className="fm-create-plan-container">
        <header className="fm-page-header">
          <div>
            <button
              type="button"
              className="fm-back-btn"
              onClick={() => navigate("/fees/students")}
            >
              <FiArrowLeft /> Back to Student Fees
            </button>
            <h1>Assign Fee Plan</h1>
            <p>Assign published fee plans to eligible student cohorts.</p>
          </div>
        </header>

        <div className="fm-form-surface">
          {/* Step 1: Select Fee Plan */}
          <section className="fm-form-section">
            <div className="fm-section-header">
              <h2>1. Select Fee Plan</h2>
              <p>Choose the fee plan to assign.</p>
            </div>

            <div className="fm-form-grid">
              <FeeSelect
                label="Fee Plan *"
                value={selectedPlanId}
                options={[
                  { id: "", name: "Select an active fee plan" },
                  ...publishedPlans.map((p) => ({
                    id: p.id,
                    name: `${p.name} · ${p.academicYearName} (₹${feeTotal(p)})`,
                  })),
                ]}
                onChange={(id) => {
                  setSelectedPlanId(id);
                  setSelectedStudents([]);
                }}
              />
            </div>
          </section>

          {/* Step 2: Select Students */}
          {plan && (
            <section className="fm-form-section">
              <div className="fm-section-header">
                <h2>2. Select Students ({eligibleStudents.length} Eligible)</h2>
                <p>Pick students matching {plan.courseName} / {plan.branchName} / {plan.batch}.</p>
              </div>

              <div className="fm-search-bar" style={{ maxWidth: "400px", marginBottom: "16px" }}>
                <FiSearch />
                <input
                  type="text"
                  placeholder="Filter eligible students..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                />
              </div>

              <FeeTable
                rows={eligibleStudents}
                empty="No eligible students found matching this fee plan scope."
                columns={[
                  {
                    label: (
                      <input
                        type="checkbox"
                        aria-label="Select all matching students"
                        checked={
                          eligibleStudents.length > 0 &&
                          eligibleStudents.every(student => selectedStudents.includes(student.id))
                        }
                        onChange={(e) =>
                          setSelectedStudents(
                            e.target.checked ? [...new Set([...selectedStudents, ...eligibleStudents.map(s => s.id)])] : selectedStudents.filter(id => !eligibleStudents.some(s => s.id === id))
                          )
                        }
                      />
                    ),
                    render: (s) => (
                      <input
                        type="checkbox"
                        aria-label={"Select " + s.name}
                        checked={selectedStudents.includes(s.id)}
                        onChange={(e) =>
                          setSelectedStudents((prev) =>
                            e.target.checked
                              ? [...prev, s.id]
                              : prev.filter((id) => id !== s.id)
                          )
                        }
                      />
                    ),
                  },
                  { label: "Student Name", key: "name" },
                  { label: "Roll Number", key: "roll" },
                  { label: "Course", key: "courseName" },
                  { label: "Branch", key: "branchName" },
                  { label: "Batch", key: "batch" },
                  { label: "Category", render: (s) => s.category || "General" },
                ]}
              />
            </section>
          )}

          {/* Step 3: Review & Step 4: Confirm */}
          {plan && selectedStudents.length > 0 && (
            <section className="fm-form-section">
              <div className="fm-section-header">
                <h2>3. Review &amp; Confirm</h2>
              </div>
              <div className="fm-summary-calculation">
                <div className="fm-calc-row">
                  <span>Selected Fee Plan</span>
                  <strong>{plan.name}</strong>
                </div>
                <div className="fm-calc-row">
                  <span>Fee Amount per Student</span>
                  <strong>{feeMoney(feeTotal(plan))}</strong>
                </div>
                <div className="fm-calc-row">
                  <span>Students Selected</span>
                  <strong>{selectedStudents.length}</strong>
                </div>
                <div className="fm-calc-total-row">
                  <span>Total Scheduled Charges</span>
                  <strong>{feeMoney(feeTotal(plan) * selectedStudents.length)}</strong>
                </div>
              </div>
            </section>
          )}
        </div>

        {plan && selectedStudents.length > 0 && (
          <footer className="fm-sticky-footer">
            <button
              type="button"
              className="erp-btn erp-btn--secondary"
              onClick={() => navigate("/fees/students")}
            >
              Cancel
            </button>
            <button
              type="button"
              className="erp-btn erp-btn--primary"
              onClick={handleConfirm}
            >
              Confirm &amp; Assign to {selectedStudents.length} Students
            </button>
          </footer>
        )}
      </div>
    );
  }

  // Adjustments & Concessions
  function Adjustments({ state, commit }) {
    const navigate = useNavigate();
    return (
      <div className="fm-page-container">
        <header className="fm-page-header">
          <div>
            <button type="button" className="fm-back-btn" onClick={() => navigate("/fees/students")}>
              <FiArrowLeft /> Back to Student Fees
            </button>
            <h1>Adjustments &amp; Concessions</h1>
            <p>Manage student fee reductions, waivers and approved concessions.</p>
          </div>
        </header>
        <div className="fm-workspace">
          <p className="fm-empty-text">Saved concessions and fee adjustments will appear here.</p>
        </div>
      </div>
    );
  }

  // Dues & Penalties
  function Dues({ academic }) {
    const navigate = useNavigate();
    return (
      <div className="fm-page-container">
        <header className="fm-page-header">
          <div>
            <button type="button" className="fm-back-btn" onClick={() => navigate("/fees/students")}>
              <FiArrowLeft /> Back to Student Fees
            </button>
            <h1>Dues &amp; Penalties</h1>
            <p>Review overdue student fee balances and assess late fees.</p>
          </div>
        </header>
        <div className="fm-workspace">
          <p className="fm-empty-text">Dues and penalties records.</p>
        </div>
      </div>
    );
  }

  // Refunds
  function Refunds() {
    const navigate = useNavigate();
    return (
      <div className="fm-page-container">
        <header className="fm-page-header">
          <div>
            <button type="button" className="fm-back-btn" onClick={() => navigate("/fees/receipts")}>
              <FiArrowLeft /> Back to Payments
            </button>
            <h1>Refunds</h1>
            <p>Process approved student fee refunds and reversals.</p>
          </div>
        </header>
        <div className="fm-workspace">
          <p className="fm-empty-text">No pending refund requests.</p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // ROOT WORKSPACE: ORCHESTRATOR FOR ALL 5 DESTINATIONS
  // ==========================================================================
  function FeeWorkspace() {
    const academic = useAcademic();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const [state, setState] = useState(emptyFeeWorkspace);
    const [storageError, setStorageError] = useState("");
    const [workspaceReady, setWorkspaceReady] = useState(false);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filter, setFilter] = useState({
      academicYearId: academic.selectedAcademicYearId || "",
      courseId: "",
      branchId: "",
      batch: "",
    });

    useEffect(() => {
      try {
        setState(readFeeWorkspace(academic.selectedCollegeId));
        setStorageError("");
      } catch (e) {
        setStorageError(e.message);
      } finally { setWorkspaceReady(true); }
    }, [academic.selectedCollegeId]);

    useEffect(() => {
      let active = true;
      studentProfilesApi
        .getAll({ collegeId: academic.selectedCollegeId })
        .then((rows) => {
          if (active) setStudents((rows || []).map(studentRecord));
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [academic.selectedCollegeId]);

    const commit = (next) => {
      const saved = writeFeeWorkspace(next, academic.selectedCollegeId);
      setState(saved);
      showSuccess("Fee configuration saved.");
    };

    const masters = {
      years: (academic.academicYears || []).map((y) => ({
        id: String(y.academicYearId || y.id),
        name: y.academicYearName || y.name,
      })),
      courses: (academic.courses || []).map((c) => ({
        id: String(c.courseId || c.id),
        name: c.courseName || c.name,
      })),
      branches: (academic.branches || []).map((b) => ({
        id: String(b.branchId || b.id),
        name: b.branchName || b.name,
        courseId: String(b.courseId || ""),
      })),
      semesters: (academic.semesters || []).map((s) => ({
        id: String(s.semesterId || s.id),
        name: s.semesterName || s.name,
        courseId: String(s.courseId || ""),
        branchId: String(s.branchId || ""),
        academicYearId: String(s.academicYearId || ""),
      })),
      batches: [
        ...new Set([
          ...students.map((s) => s.batch).filter(Boolean),
          ...state.structures.map((s) => s.batch).filter(Boolean),
        ]),
      ],
      batchScopes: students.map(({ academicYearId, courseId, branchId, batch }) => ({
        academicYearId,
        courseId,
        branchId,
        batch,
      })),
      categories: ["Convener", "Management", "NRI", "Lateral Entry"],
    };

    const ledgers = state.assignments.map((a) => ({
      ...a,
      ledger: feeLedger(state, a),
    }));

    return (
      <DashboardLayout>
        <main className="fs-page fm-page">
          <nav className="fm-main-nav" aria-label="Fee Management">
            {feeNavigationModule.feeNavigation.map(item => (
              <Link key={item.to} to={item.to}
                className={feeNavigationModule.feeNavigationItem(pathname) === item ? "active" : ""}
                aria-current={feeNavigationModule.feeNavigationItem(pathname) === item ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          <FeeRequestState loading={!workspaceReady} error={storageError}>
          <Routes>
            <Route index element={<Navigate to="/fees/overview" replace />} />

            {/* 1. OVERVIEW */}
            <Route
              path="overview"
              element={
                <ServerFeeCollection
                  overview
                  academic={academic}
                  configuration={state}
                />
              }
            />

            {/* 2. FEE PLANS */}
            <Route
              path="structures"
              element={
                <FeeStructureConfiguration
                  masters={masters}
                  state={state}
                  workflow={{ rows: state.structures, assignments: state.assignments,
                    duplicate: row => { try { commit(saveWorkflowStructure(state, { ...structuredClone(row), id: "", name: row.name + " (Copy)" }, "Draft", "Admin")); } catch (reason) { showError(reason.message); } },
                    transition: (id, status) => { try { commit(transitionFeeStructure(state, id, status, "Admin")); } catch (reason) { showError(reason.message); } },
                    remove: id => { try { commit({ ...state, structures: state.structures.filter(row => row.id !== id) }); } catch (reason) { showError(reason.message); } },
                  }}
                />
              }
            />
            <Route
              path="components"
              element={<ManageCharges state={state} commit={commit} />}
            />
            <Route
              path="structures/create"
              element={
                <CreateAcademicFeePlan
                  key={pathname}
                  value={{
                    ...newFeeStructure(filter.academicYearId),
                    academicYearName:
                      masters.years.find((y) => y.id === String(filter.academicYearId))
                        ?.name || "",
                  }}
                  masters={masters}
                  components={state.components}
                  students={students}
                  close={() => navigate("/fees/structures")}
                  save={(form, status) => {
                    commit(saveWorkflowStructure(state, form, status, "Admin"));
                    navigate("/fees/structures");
                  }}
                />
              }
            />
            <Route
              path="structures/:structureId/edit"
              element={
                <CreateAcademicFeePlan
                  key={pathname}
                  value={
                    state.structures.find(
                      (s) => s.id === window.location.pathname.split("/")[3]
                    ) || newFeeStructure()
                  }
                  masters={masters}
                  components={state.components}
                  students={students}
                  close={() => navigate("/fees/structures")}
                  save={(form, status) => {
                    commit(saveWorkflowStructure(state, form, status, "Admin"));
                    navigate("/fees/structures");
                  }}
                />
              }
            />
            {["hostel", "transport"].map((type) => (
              <Route key={type} path={`structures/${type}`}>
                <Route
                  path="create"
                  element={<FeeStructureConfiguration facilityType={type} />}
                />
                <Route
                  path=":facilityId/edit"
                  element={<FeeStructureConfiguration facilityType={type} />}
                />
              </Route>
            ))}

            {/* 3. STUDENT FEES */}
            <Route
              path="students"
              element={
                <StudentFees
                  academic={academic}
                  ledgers={ledgers}
                  assignments={state.assignments}
                  masters={masters}
                />
              }
            />
            <Route
              path="accounts/:studentId"
              element={
                <StudentFeeDetails
                  academic={academic}
                  state={state}
                  ledgers={ledgers}
                />
              }
            />
            <Route
              path="ledger/:assignmentId"
              element={
                <StudentFeeDetails
                  academic={academic}
                  state={state}
                  ledgers={ledgers}
                />
              }
            />
            <Route
              path="assignments"
              element={
                <AssignFeePlan
                  state={state}
                  commit={commit}
                  students={students}
                  masters={masters}
                  filter={filter}
                  setFilter={setFilter}
                />
              }
            />
            <Route
              path="concessions"
              element={<Adjustments state={state} commit={commit} />}
            />
            <Route path="dues" element={<Dues academic={academic} />} />

            {/* 4. PAYMENTS */}
            <Route
              path="receipts"
              element={<ServerFeeCollection page="receipts" academic={academic} />}
            />
            <Route
              path="collection"
              element={
                <ServerFeeCollection page="collection" academic={academic} />
              }
            />
            <Route path="refunds" element={<Refunds />} />

            {/* 5. REPORTS */}
            <Route
              path="reports"
              element={
                <ServerFeeCollection
                  page="reports"
                  academic={academic}
                  configuration={state}
                />
              }
            />

            <Route path="*" element={<Navigate to="/fees/overview" replace />} />
          </Routes>
          </FeeRequestState>
        </main>
      </DashboardLayout>
    );
  }

  function FeeManagement() {
    return (
      <Routes>
        <Route path="legacy" element={<Navigate to="/fees/structures" replace />} />
        <Route path="*" element={<FeeWorkspace />} />
      </Routes>
    );
  }

  return {
    get default() {
      return FeeManagement;
    },
    get StudentFees() {
      return StudentFees;
    },
    get FeeWorkspace() {
      return FeeWorkspace;
    },
  };
})();

// Re-export the primary modules
export const FeeStructureWizard = FeeStructureWizardModule.default;
export const FeeStructure = FeeStructureModule.default;
export const ServerFeeCollection = ServerFeeCollectionModule.default;
export const FeeManagement = FeeManagementModule.default;
