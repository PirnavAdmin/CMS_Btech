import '../admin-management/AdminManagement.css'
import './fees.css'
import { ProjectSelect } from '../../components/SearchableSelect'
import { TableActionButton } from '../../components/TableActionButton';
// Comprehensive Fee Management Module: Overview, Fee Plans, Student Fees, Payments, Reports
import * as external0 from "react";
import * as external1 from "react-router-dom";
import * as external2 from "react-dom";
import * as external3 from "react-icons/fi";
import * as PageHeaderModule from '../../components/PageHeader';
import * as FilterPanelModule from '../../components/FilterPanel';
import * as SearchableSelectModule from '../../components/SearchableSelect';
import * as TablePaginationModule from '../../components/TablePagination';
import * as EmptyStateModule from '../../components/EmptyState';
import * as DirectoryEmptyStateModule from '../../components/DirectoryEmptyState';
import * as useToastStateModule from '../../hooks/useToastState';
import * as ExportMenuModule from '../../components/ExportMenu';
import * as DashboardLayoutModule from '../../layouts/DashboardLayout';
import * as AcademicContextModule from '../../context/AcademicContext';
import * as feeStructureServiceModule from '../../services/feeStructureService';
import * as recordDetailSectionsModule from '../../utils/recordDetailSections';
import * as toastModule from '../../utils/toast';
import * as exportColumnsModule from '../../utils/exportColumns';
import * as academicYearUtilsModule from '../../utils/academicYearUtils';
import * as exportUtilsModule from '../../utils/exportUtils';
import * as apiEndpointsModule from '../../api/apiEndpoints';
import * as collegeApiModule from '../../auth/collegeApi';
import * as authModule from '../../auth/auth';
import * as collegeScopeModule from '../../utils/collegeScope';

function FeeRequestState({ loading, error, children }) {
  if (loading) return <div className="fm-request-state" role="status">Loading fee records...</div>;
  if (error) return <div className="fm-error-banner" role="alert">{error}</div>;
  return children;
}

const date = (val) => (val ? String(val).slice(0, 10) : "—");

// Configuration forms require active years; upcoming years are not a fallback.
const activeFeeYearOptions = (years) => academicYearUtilsModule
  .getSelectableAcademicYears(years)
  .filter((year) => year.status === "ACTIVE");

function calculatedFeeBatch(year, course) {
  if (!year || !course) return "";
  const startYear = Number(String(year.startDate || year.academicYearName || year.name || "").match(/\b(?:19|20)\d{2}\b/)?.[0]);
  const rawDuration = course.durationYears ?? course.durationValue ?? course.duration;
  const durationText = String(rawDuration ?? "").trim();
  const duration = Number(durationText.match(/^\d+(?:\.\d+)?/)?.[0]);
  const unit = String(course.durationUnit || durationText).toLowerCase();
  const years = duration > 0
    ? /month/.test(unit) ? duration / 12 : /semester/.test(unit) ? duration / 2 : duration
    : Number(course.totalSemesters || course.semesters || 0) / 2;
  if (!startYear || !Number.isFinite(years) || years <= 0 || years > 10) return "";
  return `${startYear}-${startYear + Math.ceil(years)}`;
}

function FeePageHeading({ title, description, icon: Icon = external3.FiCreditCard, children }) {
  return <header className="fm-page-header">
    <div className="fm-heading-identity">
      <span className="fm-heading-icon" aria-hidden="true"><Icon /></span>
      <div><span className="fm-eyebrow">Finance workspace</span><h1>{title}</h1><p>{description}</p></div>
    </div>
    {children && <div className="fm-header-actions">{children}</div>}
  </header>;
}

function FeeMetric({ label, value, meta, tone = "blue", icon: Icon = external3.FiBarChart2 }) {
  return <div className={`fm-metric fm-tone--${tone}`}>
    <div className="fm-metric-heading"><span>{label}</span><span className="fm-metric-icon" aria-hidden="true"><Icon /></span></div>
    <strong className="fm-metric-value">{value}</strong>
    {meta && <span className="fm-metric-meta">{meta}</span>}
  </div>;
}

function FeeSectionHeading({ number, title, description }) {
  return <div className="fm-section-header">
    <span className="fm-section-number" aria-hidden="true">{number}</span>
    <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
  </div>;
}

function FeeIdentity({ name, detail }) {
  return <div className="fm-person"><span className="fm-avatar" aria-hidden="true">{String(name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("")}</span><div><strong>{name || "—"}</strong>{detail && <small className="fm-cell-sub">{detail}</small>}</div></div>;
}

function FeePaymentMethod({ value }) {
  const Icon = value === "CASH" ? external3.FiDollarSign : value === "BANK_TRANSFER" ? external3.FiBriefcase : external3.FiCreditCard;
  return <span className="fm-payment-method"><Icon aria-hidden="true" />{String(value || "—").replaceAll("_", " ")}</span>;
}

// Shared editors keep category forms consistent without changing their persistence contracts.
const feeHeadName = value => String(value || "").trim().replace(/\s+/g, " ");
const validFeeHeadAmount = value => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 100000000 && Math.abs(Number(value) * 100 - feeStructureServiceModule.cents(value)) < 0.00001;
function feeHeadsError(rows) {
  const names = rows.map(row => feeHeadName(row.name).toLowerCase());
  if (names.some(name => !name)) return "Enter a name for every fee head.";
  if (new Set(names).size !== names.length) return "Fee head names must be unique.";
  if (rows.some(row => !validFeeHeadAmount(row.amount))) return "Fee heads require positive amounts with at most two decimal places.";
  return "";
}
function FeeBreakdownEditor({ category, rows, onChange, total, frequency = "Yearly", suggestions = [] }) {
  const listId = external0.useId();
  const update = (index, change) => onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...change } : row));
  return <div className="fm-breakdown-container">
    <datalist id={listId}>{suggestions.map(head => <option key={head.id} value={head.name} />)}</datalist>
    {!rows.length ? <div className="fm-breakdown-empty">No fee heads yet. Select Add Fee Head to build the breakdown.</div> : <div className="fm-breakdown-list">
      <div className="fm-breakdown-head"><span>Fee Head Name</span><span className="fm-text-right">Amount (&#8377;)</span><span /></div>
      {rows.map((row, index) => <div key={index} className="fm-breakdown-row">
        <input className="fm-fee-head-input" aria-label={"Fee head " + (index + 1) + " name"} placeholder="Enter fee head name" value={row.name} list={listId} onChange={event => update(index, { name: event.target.value })} />
        <div className="fm-amount-input-wrap"><span className="fm-currency-symbol" aria-hidden="true">&#8377;</span><input type="number" min="0.01" max="100000000" step="0.01" placeholder="0.00" aria-label={"Fee head " + (index + 1) + " amount"} value={row.amount} onChange={event => update(index, { amount: event.target.value })} /></div>
        <button type="button" className="fm-remove-btn" aria-label={"Remove fee head " + (index + 1)} onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}><external3.FiTrash2 /></button>
      </div>)}
    </div>}
    <button type="button" className="erp-btn erp-btn--secondary fm-add-charge-btn" onClick={() => onChange([...rows, { masterId: "", name: "", category, frequency, amount: "", mandatory: true, refundable: false, recurring: true }])}><external3.FiPlus /> Add Fee Head</button>
    <div className="fm-total-fee-row"><span className="fm-total-label">Total {category} Fee</span><strong className="fm-total-value">{feeStructureServiceModule.feeMoney(total)}</strong></div>
  </div>;
}
function FeePaymentScheduleEditor({ value, onChange, total }) {
  const radioName = external0.useId();
  const { cents, rupees, feeMoney, uid } = feeStructureServiceModule;
  const installments = value.installments || [];
  const scheduled = rupees(installments.reduce((sum, row) => sum + cents(row.amount), 0));
  const difference = rupees(cents(total) - cents(scheduled));
  const add = () => ({ id: uid("INST"), name: "Payment " + (installments.length + 1), dueDate: "", amount: installments.length ? "" : String(total) });
  const update = (index, change) => onChange({ installments: installments.map((row, rowIndex) => rowIndex === index ? { ...row, ...change } : row) });
  return <div className="fm-schedule-editor">
    <div className="fm-radio-group">{[["Full Payment", "Pay in Full"], ["Installment Plan", "Pay in Installments"]].map(([plan, label]) => <label key={plan} className={"fm-radio-card " + (value.plan === plan ? "active" : "")}><input type="radio" name={radioName} checked={value.plan === plan} onChange={() => onChange({ plan, ...(plan === "Installment Plan" && !installments.length ? { installments: [add()] } : {}) })} /><strong>{label}</strong></label>)}</div>
    {value.plan === "Full Payment" ? <div className="fm-form-grid"><label className="fs-field"><span>Due Date <b className="required-mark">*</b></span><input type="date" value={value.dueDate || ""} onChange={event => onChange({ dueDate: event.target.value })} /></label><div className="fm-static-field"><span className="fs-field-label">Amount</span><div className="fm-static-value">{feeMoney(total)}</div></div></div> : value.plan === "Installment Plan" ? <div className="fm-installments-container">
      <div className="fm-installments-list"><div className="fm-installments-head"><span>Payment</span><span>Due Date</span><span className="fm-text-right">Amount</span><span /></div>{installments.map((row, index) => <div key={row.id} className="fm-installment-row">
        <input className="fm-inst-name-input" aria-label={"Payment " + (index + 1) + " name"} value={row.name || ""} onChange={event => update(index, { name: event.target.value })} />
        <input type="date" className="fm-inst-date-input" aria-label={"Payment " + (index + 1) + " due date"} value={row.dueDate || ""} onChange={event => update(index, { dueDate: event.target.value })} />
        <div className="fm-amount-input-wrap"><span className="fm-currency-symbol" aria-hidden="true">&#8377;</span><input type="number" min="0.01" max="100000000" step="0.01" aria-label={"Payment " + (index + 1) + " amount"} value={row.amount} onChange={event => update(index, { amount: event.target.value })} /></div>
        <button type="button" className="fm-remove-btn" aria-label={"Remove payment " + (index + 1)} disabled={installments.length <= 1} onClick={() => onChange({ installments: installments.filter((_, rowIndex) => rowIndex !== index) })}><external3.FiTrash2 /></button>
      </div>)}</div>
      <button type="button" className="erp-btn erp-btn--secondary fm-add-inst-btn" onClick={() => onChange({ installments: [...installments, add()] })}><external3.FiPlus /> Add Installment</button>
      <div className="fm-installment-totals"><div className="fm-inst-totals-row"><span>Scheduled / Total</span><strong>{feeMoney(scheduled)} / {feeMoney(total)}</strong></div><div className={difference === 0 && installments.length ? "fm-balanced-notice" : "fm-unbalanced-notice"}>{difference === 0 && installments.length ? "Payment schedule matches the total fee." : "Remaining: " + feeMoney(difference)}</div></div>
    </div> : null}
  </div>;
}
const validFeeDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || "") && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
function facilityScheduleError(form) {
  if (form.effectiveFrom && !validFeeDate(form.effectiveFrom) || form.effectiveTo && !validFeeDate(form.effectiveTo)) return "Enter valid effective dates.";
  if (form.effectiveFrom && form.effectiveTo && form.effectiveTo < form.effectiveFrom) return "Effective To cannot precede Effective From.";
  if (form.plan === "Full Payment") return validFeeDate(form.dueDate) ? "" : "Enter a valid payment due date.";
  if (form.plan !== "Installment Plan") return "Choose a payment schedule.";
  if (!form.installments?.length || form.installments.some(row => !validFeeDate(row.dueDate) || !validFeeHeadAmount(row.amount))) return "Every installment requires a valid due date and positive amount.";
  if (form.installments.some((row, index) => index > 0 && row.dueDate < form.installments[index - 1].dueDate)) return "Installment due dates must be in chronological order.";
  if (form.installments.reduce((sum, row) => sum + feeStructureServiceModule.cents(row.amount), 0) !== feeStructureServiceModule.cents(form.fee)) return "Installment amounts must equal the total fee exactly.";
  return "";
}

function feeHeadPreviewRows(heads, money) {
  return heads.filter(head => head.name?.trim() || String(head.amount ?? "").trim() !== "").map((head, index) => [head.name?.trim() || "Fee Head " + (index + 1), String(head.amount ?? "").trim() === "" ? "Amount not entered" : money(head.amount)]);
}
const hostelRoomKey = room => [room.roomType, room.occupancy, room.acType].map(feeHeadName).map(value => value.toLowerCase()).join("|");
const hostelRoomTotal = room => feeStructureServiceModule.rupees((room.components || []).reduce((sum, head) => sum + feeStructureServiceModule.cents(head.amount), 0));
function hostelPriceLabel(plan) {
  const amounts = plan.roomPricing?.length ? plan.roomPricing.map(hostelRoomTotal) : [Number(plan.fee || 0)];
  const min = Math.min(...amounts), max = Math.max(...amounts);
  const money = feeStructureServiceModule.feeMoney;
  return min === max ? money(min) : money(min) + " - " + money(max);
}
function hostelPricingError(form, status) {
  if (!form.roomPricing?.length) return "Add at least one room category.";
  const keys = new Set();
  for (const room of form.roomPricing) {
    if (!room.roomType?.trim() || !room.acType || !Number.isInteger(Number(room.occupancy)) || Number(room.occupancy) < 1) return "Each room category needs a name, positive whole-number occupancy and AC category.";
    const key = hostelRoomKey(room);
    if (keys.has(key)) return "Duplicate room category, occupancy and AC configuration.";
    keys.add(key);
    const error = feeHeadsError(room.components || []);
    if (error || !room.components?.length) return error || "Add fee heads for each room category.";
    if (status !== "Draft" || room.dueDate || room.installments?.length) {
      const scheduleError = facilityScheduleError({ ...room, fee: hostelRoomTotal(room) });
      if (scheduleError) return room.roomType + ": " + scheduleError;
    }
  }
  return "";
}

function normalizeFacilityPlan(value, type) {
  const saved = structuredClone(value);
  const category = type === "hostel" ? "Hostel" : "Transport";
  const components = Array.isArray(saved.components) ? saved.components : Number(saved.fee) > 0 ? [{ name: type === "hostel" ? "Accommodation Fee" : "Transport Fee", amount: saved.fee, category }] : [];
  const roomPricing = type === "hostel" ? Array.isArray(saved.roomPricing) ? saved.roomPricing : saved.id ? [{ roomType: saved.roomType || "", occupancy: saved.occupancy || "", acType: saved.acType || "", components, plan: saved.plan || "Full Payment", dueDate: saved.dueDate || "", installments: saved.installments || [] }] : [] : undefined;
  return { ...saved, ...(type === "hostel" ? { roomPricing } : {}), components, plan: saved.plan === "Installments" ? "Installment Plan" : saved.plan || (saved.id ? "Full Payment" : ""), dueDate: saved.dueDate || "", installments: saved.installments || [] };
}
function validateFacilityPlan(form, type, years, status) {
  if (!years.some(year => String(year.id) === String(form.academicYearId))) return { tab: "details", message: "Select an active academic year." };
  if (type === "hostel" ? !form.hostelName?.trim() : !form.route?.trim() || !form.pickupPoint?.trim()) return { tab: "details", message: type === "hostel" ? "Enter hostel name and room type." : "Enter route name and boarding stop." };
  if (type === "hostel") {
    if (!form.frequency) return { tab: "details", message: "Select a fee cycle." };
    const message = hostelPricingError(form, status);
    if (message) return { tab: /payment|installment|due date|chronological/i.test(message) ? "schedule" : "breakdown", message };
    if (form.effectiveFrom && form.effectiveTo && form.effectiveTo < form.effectiveFrom) return { tab: "schedule", message: "Effective To cannot precede Effective From." };
    return null;
  }
  const error = feeHeadsError(form.components);
  if (error || !form.components.length) return { tab: "breakdown", message: error || "Add at least one fee head." };
  if (status !== "Draft" || form.dueDate || form.installments.length || form.effectiveFrom || form.effectiveTo) {
    const total = feeStructureServiceModule.rupees(form.components.reduce((sum, row) => sum + feeStructureServiceModule.cents(row.amount), 0));
    const message = facilityScheduleError({ ...form, fee: total });
    if (message) return { tab: "schedule", message };
  }
  return null;
}
function facilityPlanPayload(form, type, years, status) {
  const error = validateFacilityPlan(form, type, years, status);
  if (error) throw new Error(error.message);
  if (type === "hostel") {
    const roomPricing = form.roomPricing.map(room => ({ ...room, roomType: feeHeadName(room.roomType), occupancy: Number(room.occupancy), components: room.components.map(head => ({ ...head, name: feeHeadName(head.name), amount: Number(head.amount), category: "Hostel" })), fee: hostelRoomTotal(room) }));
    const first = roomPricing[0];
    return { ...form, roomPricing, roomType: first.roomType, occupancy: first.occupancy, acType: first.acType, components: first.components, fee: first.fee, plan: first.plan, dueDate: first.dueDate, installments: first.installments || [], status, academicYearName: years.find(year => String(year.id) === String(form.academicYearId))?.name || form.academicYearName };
  }
  const category = type === "hostel" ? "Hostel" : "Transport";
  const components = form.components.map(row => ({ ...row, name: feeHeadName(row.name), amount: Number(row.amount), category }));
  return { ...form, components, fee: feeStructureServiceModule.rupees(components.reduce((sum, row) => sum + feeStructureServiceModule.cents(row.amount), 0)), status, academicYearName: years.find(year => String(year.id) === String(form.academicYearId))?.name || form.academicYearName };
}

function FeePlanDetailsPage({ row, category = "Academic", masters, close, edit, canEdit }) {
  const { FeeBadge, FeeTable } = FeeStructureWizardModule;
  const { feeMoney, feeTotal, componentTotals } = feeStructureServiceModule;
  const academic = category === "Academic";
  const heads = row.components || row.feeComponents || [];
  const payment = row.paymentPlan || {};
  const fine = row.fineRules || {};
  const installments = row.installments || payment.installments || [];
  const total = academic ? row.components ? feeTotal(row) : componentTotals(heads).total : Number(row.fee || 0);
  const lookup = (items, id, fallback) => fallback || items?.find(item => String(item.id) === String(id))?.name;
  const yesNo = value => value === true || value === "Refundable" ? "Yes" : "No";
  const details = [
    ["Academic Year", lookup(masters.years, row.academicYearId, row.academicYearName)],
    ...(academic ? [["Course", lookup(masters.courses, row.courseId, row.courseName)], ["Branch", lookup(masters.branches, row.branchId, row.branchName)], ["Department", lookup(masters.departments, row.departmentId, row.departmentName)], ["Batch", row.batch], ["Student Category / Quota", row.category || row.studentCategory || row.quota || "All Students"], ["Applicability", row.applicableTo], ["Admission Type", row.admissionType], ["Fee Cycle", row.cycle || row.feePeriod], ["Semester", lookup(masters.semesters, row.semesterId, row.semesterName)], ["Year of Study", row.yearOfStudy]]
      : category === "Hostel" ? [["Hostel", row.hostelName], ["Hostel Type", row.hostelType], ["Room Type", row.roomType], ["AC Category", row.acType], ["Mess Plan", row.messPlan], ["Fee Cycle", row.frequency], ["Fee Inclusions", row.componentsText]]
      : [["Route", row.route], ["Route Code", row.routeCode], ["Boarding Stop", row.pickupPoint], ["Distance (km)", row.distance], ["Fee Cycle", row.frequency]]),
    ["Effective From", row.effectiveFrom], ["Effective To", row.effectiveTo],
  ];
  const paymentRows = [["Payment Mode", row.plan || payment.mode], ["Due Date", row.dueDate || payment.dueDate], ["Allocation Mode", payment.allocationMode], ["Include Refundable Charges", payment.includeRefundable == null ? null : yesNo(payment.includeRefundable)], ["Discount / Concession", row.discount == null ? null : feeMoney(row.discount)]];
  const penaltyType = row.penaltyType || fine.type;
  const penaltyValue = row.penaltyValue ?? fine.value;
  const rules = [["Grace Period (days)", row.grace ?? fine.gracePeriod], ["Penalty Type", penaltyType], ["Penalty Value", penaltyValue === "" || penaltyValue == null ? null : /percent/i.test(penaltyType || "") ? penaltyValue + "%" : feeMoney(penaltyValue)], ["Maximum Penalty", (row.maximumPenalty ?? fine.maximumFine) === "" || (row.maximumPenalty ?? fine.maximumFine) == null ? null : feeMoney(row.maximumPenalty ?? fine.maximumFine)]];
  const visibleRows = rows => rows.filter(([, value]) => value != null && value !== "");
  const fields = rows => {
    const visible = visibleRows(rows);
    return visible.length ? <dl className="fm-detail-fields cm-info-rows">{visible.map(([label, value]) => <div key={label} className="cm-info-row"><dt className="cm-info-label">{label}</dt><dd className="cm-info-val">{value}</dd></div>)}</dl> : null;
  };
  const cardHeader = (heading, Icon, badge) => <div className="cm-info-card-header"><div className="cm-panel-title-wrap"><span className="cm-panel-icon" aria-hidden="true"><Icon /></span><h2>{heading}</h2></div>{badge}</div>;
  const countBadge = count => count > 0 ? <span className="cm-card-count-badge">{count} {count === 1 ? "item" : "items"}</span> : null;
  const breakdownRows = heads.length ? heads : !academic && row.fee != null ? [{ name: category + " Fee", amount: row.fee }] : [];
  const title = row.name || row.hostelName || row.route || category + " Fee Plan";
  return <div className="fm-page-container fm-detail-page cm-profile-view">
    <div className="fm-detail-toolbar cm-profile-top-bar"><button type="button" className="erp-btn erp-btn--secondary cm-secondary-btn" onClick={close}><external3.FiArrowLeft /> Back to Fee Plans</button>{canEdit && <button type="button" className="erp-btn erp-btn--primary cm-primary-btn" onClick={edit}><external3.FiEdit2 /> Edit Fee Plan</button>}</div>
    <article className="fm-detail-profile cm-profile-card">
      <header className="fm-detail-banner cm-profile-banner"><div className="cm-profile-avatar-wrap"><span className="fm-heading-icon cm-profile-logo cm-logo-emblem"><external3.FiLayers /></span></div><div className="fm-detail-identity cm-profile-header-info"><div className="fm-detail-badges cm-profile-badges"><span className="fm-count-chip cm-badge">{category} Fees</span><FeeBadge value={row.status} /></div><h1 className="cm-profile-title">{title}</h1><p className="cm-profile-subtitle">Fee plan details, charges and payment terms</p></div><div className="fm-detail-total"><span>Total {category} Fee</span><strong>{category === "Hostel" ? hostelPriceLabel(row) : feeMoney(total)}</strong></div></header>
      <div className="cm-profile-grid">
        <section className="fm-detail-section cm-info-card">{cardHeader(category + " Details", external3.FiFileText, countBadge(visibleRows(details).length))}{fields(details)}</section>
        {category === "Hostel" && row.roomPricing?.length ? row.roomPricing.map((room, index) => <section key={index} className="fm-detail-section cm-info-card">{cardHeader(`${room.roomType} / ${room.occupancy} sharing / ${room.acType}`, external3.FiHome, <div className="fm-total-fee-row"><span>Total Category Fee</span><strong>{feeMoney(hostelRoomTotal(room))}</strong></div>)}{fields([["Payment Mode", room.plan], ["Due Date", room.dueDate]])}<FeeTable rows={room.components} rowKey={item => item.name} columns={[{ label: "Fee Head", key: "name" }, { label: "Amount", align: "right", render: item => feeMoney(item.amount) }]} />{room.installments?.length > 0 && <FeeTable rows={room.installments} columns={[{ label: "Payment", key: "name" }, { label: "Due Date", key: "dueDate" }, { label: "Amount", align: "right", render: item => feeMoney(item.amount) }]} />}</section>) : <>
        <section className="fm-detail-section cm-info-card">{cardHeader(category + " Fee Breakdown", external3.FiCreditCard, countBadge(breakdownRows.length))}<FeeTable rows={breakdownRows} columns={[{ label: "Fee Head", key: "name" }, { label: "Category", render: head => head.category || category }, { label: "Frequency", render: head => head.frequency || row.cycle || row.frequency || "Not specified" }, { label: "Mandatory", render: head => head.mandatory == null && !head.requirement ? "Not specified" : head.mandatory === false || head.requirement === "Optional" ? "No" : "Yes" }, { label: "Refundable", render: head => head.refundable == null ? "Not specified" : yesNo(head.refundable) }, { label: "Amount", align: "right", render: head => feeMoney(head.amount) }]} /></section>
        <section className="fm-detail-section cm-info-card">{cardHeader("Payment Schedule", external3.FiCalendar, countBadge(visibleRows(paymentRows).length + installments.length))}{fields(paymentRows)}{installments.length > 0 && <FeeTable rows={installments.map((item, index) => ({ ...item, viewKey: index }))} rowKey={item => item.viewKey} columns={[{ label: "Payment", render: (item) => item.name || "Installment" }, { label: "Due Date", key: "dueDate" }, { label: "Amount", align: "right", render: item => feeMoney(item.amount) }, ...(payment.allocationMode === "Percentage" ? [{ label: "Percentage", render: item => item.percentage + "%" }] : [])]} />}</section>
        </>}
        {academic && visibleRows(rules).length > 0 && <section className="fm-detail-section cm-info-card">{cardHeader("Late Fee & Penalty Rules", external3.FiClock, countBadge(visibleRows(rules).length))}{fields(rules)}</section>}
      </div>
    </article>
  </div>;
}

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
        {items.map(([label, value, meta], index) => (
          <FeeMetric key={label} label={label} value={value} meta={meta} tone={["blue", "green", "amber", "teal"][index % 4]} />
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
            <div className="fm-table-footer">
              <span>{(current - 1) * pageSize + 1}–{Math.min(current * pageSize, rows.length)} of {rows.length} records</span>
              {pages > 1 && <TablePagination
                currentPage={current}
                totalPages={pages}
                onPageChange={setPage}
              />}
            </div>
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

  function FeePlanPreview({ title, groups, total, status = "Draft", hasContent = true }) {
    const visibleGroups = groups.map(group => ({ ...group, rows: group.rows.filter(([name, value]) => name && value !== "" && value != null) })).filter(group => group.rows.length);
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
          {!hasContent ? <div className="fm-preview-placeholder"><external3.FiFileText aria-hidden="true" /><strong>Your fee plan preview</strong><p>Enter plan details to see the live preview here.</p></div> : <>
          {total > 0 && <div className="fm-preview-amount"><span>Plan total</span><strong>{feeMoney(total)}</strong><h3>{title}</h3></div>}
          {visibleGroups.map(({ label, rows }) => (
            <section className="fm-preview-section" key={label}>
              <h4>{label}</h4>
              <dl>
                {rows.map(([name, value], index) => (
                  <div key={`${name}-${index}`}>
                    <dt>{name}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
          </>}
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
              maxHeight: Math.max(0, window.innerHeight - 16),
              overflowY: "auto",
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
    const [previewStarted, setPreviewStarted] = useState(Boolean(value.id));
    const [previewFields, setPreviewFields] = useState({});
    const [advancedOpen, setAdvancedOpen] = useState(true);
    const [formTab, setFormTab] = useState("applicability");
    const formTabId = useId();
    const formTabs = [["applicability", "Academic Details"], ["breakdown", "Fee Breakdown"], ["schedule", "Payment Schedule"]];

    const patch = (change) => {
      setPreviewStarted(true);
      setPreviewFields(current => ({ ...current, ...Object.fromEntries(Object.keys(change).map(key => [key, true])) }));
      set((curr) => {
        const next = { ...curr, ...change };
        if (Object.hasOwn(change, "courseId") || Object.hasOwn(change, "academicYearId")) {
          next.batch = calculatedFeeBatch(
            masters.years.find(year => String(year.id) === String(next.academicYearId)),
            masters.courses.find(course => String(course.id) === String(next.courseId))
          );
        }
        return next;
      });
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
    const generatedBatch = calculatedFeeBatch(
      masters.years.find(year => String(year.id) === String(s.academicYearId)),
      masters.courses.find(course => String(course.id) === String(s.courseId))
    );
    useEffect(() => {
      if (generatedBatch) set(current => current.batch ? current : { ...current, batch: generatedBatch });
    }, [generatedBatch]);

    const existingBatches = masters.batchScopes
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
      : masters.batches || [];
    const batches = [...new Set([generatedBatch, s.batch, ...existingBatches].filter(Boolean))];

    const total = feeTotal(s);
    const scheduled = s.installments.reduce(
      (sum, i) => sum + (Number(i.amount) || 0),
      0
    );
    const remaining = total - scheduled;

    const validate = (targetStatus) => {
      if (!s.academicYearId || !masters.years.some(year => String(year.id) === String(s.academicYearId))) return "Select an active academic year.";
      if (!s.courseId) return "Select a program / course.";
      if (!s.branchId) return "Select a branch.";
      if (!s.batch?.trim()) return "Select a batch.";
      if (s.applicableTo === "Selected Category" && !s.category)
        return "Select a student category / quota.";

      const breakdownError = feeHeadsError(s.components);
      if (breakdownError) return breakdownError;
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
        if (!s.academicYearId || !masters.years.some(year => String(year.id) === String(s.academicYearId)) || !s.courseId || !s.branchId || !s.batch?.trim() || (s.applicableTo === "Selected Category" && !s.category)) setFormTab("applicability");
        else if (/fee head|charge|breakdown/i.test(err)) setFormTab("breakdown");
        else setFormTab("schedule");
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
      <div className="fm-create-plan-container fm-academic-plan-editor">
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
        <div className="fm-tabs-bar fm-plan-form-tabs" role="tablist" aria-label="Fee plan configuration">
          {formTabs.map(([key, label], index) => <button key={key} type="button" role="tab" id={formTabId + "-tab-" + key} aria-controls={formTabId + "-panel-" + key} aria-selected={formTab === key} tabIndex={formTab === key ? 0 : -1} className={"fm-tab-btn " + (formTab === key ? "active" : "")} onClick={() => setFormTab(key)} onKeyDown={event => {
            let next;
            if (event.key === "ArrowRight") next = (index + 1) % formTabs.length;
            else if (event.key === "ArrowLeft") next = (index + formTabs.length - 1) % formTabs.length;
            else if (event.key === "Home") next = 0;
            else if (event.key === "End") next = formTabs.length - 1;
            else return;
            event.preventDefault(); setFormTab(formTabs[next][0]);
            event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();
          }}><span className="fm-form-tab-number" aria-hidden="true">{index + 1}</span>{label}</button>)}
        </div>
        <div className="fm-create-form-body">
          {/* SECTION 1: Who should pay this fee? */}
          <section className="fm-form-section" hidden={formTab !== "applicability"} role="tabpanel" id={formTabId + "-panel-applicability"} aria-labelledby={formTabId + "-tab-applicability"} tabIndex={0}>
            <FeeSectionHeading number="01" title="Academic Details" description="Choose the student group this fee applies to." />

            <div className="fm-form-grid fm-applicability-grid">
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
          <section className="fm-form-section" hidden={formTab !== "breakdown"} role="tabpanel" id={formTabId + "-panel-breakdown"} aria-labelledby={formTabId + "-tab-breakdown"} tabIndex={0}>
            <FeeSectionHeading number="02" title="Academic Fee Breakdown" description="Add or edit fee head names and amounts for this plan." />

            <FeeBreakdownEditor category="Academic" frequency={s.cycle} rows={s.components} onChange={components => patch({ components })} total={total} suggestions={components.filter(head => head.status === "Active" && academicFeeComponent(head))} />
          </section>

          {/* SECTION 3: When should they pay? */}
          <section className="fm-form-section" hidden={formTab !== "schedule"} role="tabpanel" id={formTabId + "-panel-schedule"} aria-labelledby={formTabId + "-tab-schedule"} tabIndex={0}>
            <FeeSectionHeading number="03" title="Payment Schedule" description="Choose full payment or scheduled installments." />

            <FeePaymentScheduleEditor value={s} onChange={patch} total={total} />
          </section>

          {/* Advanced Options (Collapsible) */}
          <section className="fm-form-section fm-advanced-section" hidden={formTab !== "schedule"}>
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
          hasContent={previewStarted}
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
              ["Fee Cycle", s.cycle],
              ["Semester", s.semesterId ? masters.semesters.find(item => String(item.id) === String(s.semesterId))?.name || s.semesterName : ""],
              ["Category", s.applicableTo === "Selected Category" ? s.category : "All Students"],
            ] },
            { label: "Fee Breakdown", rows: s.components.length
              ? feeHeadPreviewRows(s.components, feeMoney)
              : [] },
            { label: "Payment", rows: s.plan === "Full Payment"
              ? [["Payment Type", "Pay in Full"], ["Due Date", s.dueDate], ["Amount", total > 0 ? feeMoney(total) : ""]]
              : [["Payment Type", `${s.installments.length} Installments`], ...s.installments.map((i, index) => [
                i.name || `Payment ${index + 1}`,
                <><strong>{i.amount === "" ? "Amount not entered" : feeMoney(i.amount)}</strong><small>{i.dueDate || "Date not selected"}</small></>,
              ])] },
            { label: "Advanced Rules & Validity", rows: [
              ["Grace Period (days)", value.id || previewFields.grace ? s.grace : ""],
              ["Penalty Type", value.id || previewFields.penaltyType ? s.penaltyType : ""],
              ["Penalty Value", s.penaltyType !== "None" && (value.id || previewFields.penaltyValue) ? s.penaltyType === "Percentage" ? s.penaltyValue + "%" : feeMoney(s.penaltyValue) : ""],
              ["Maximum Penalty", s.penaltyType !== "None" && s.maximumPenalty !== "" && s.maximumPenalty != null ? feeMoney(s.maximumPenalty) : ""],
              ["Effective From", s.effectiveFrom], ["Effective To", s.effectiveTo],
            ] },
          ]}
        />
        </div>


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
  const { default: FilterPanel } = FilterPanelModule;
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
    let current = response;
    let list = null;
    for (let depth = 0; depth < 5; depth += 1) {
      if (Array.isArray(current)) {
        list = current;
        break;
      }
      if (!current || typeof current !== "object") break;
      const rows = [current.items, current.content, current.records, current.results, current.semesters, current.rows].find(Array.isArray);
      if (rows) {
        list = rows;
        break;
      }
      current = current.data;
    }
    if (!list) throw new Error("Unable to read the semester list. Please refresh and try again.");
    return list
      .filter((x) => x && typeof x === "object")
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
  function FacilityEditor({ type, value, masters, close, save, existingHostels = [] }) {
    const hostel = type === "hostel";
    const category = hostel ? "Hostel" : "Transport";
    const tabId = external0.useId();
    const [formTab, setFormTab] = useState("details");
    const tabs = [["details", category + " Details"], ["breakdown", category + " Fee Breakdown"], ["schedule", "Payment Schedule"]];
    const [form, setForm] = useState(() => normalizeFacilityPlan(value, type));
    const [roomIndex, setRoomIndex] = useState(0);
    const activeRoom = form.roomPricing?.[roomIndex];
    const total = hostel ? activeRoom ? hostelRoomTotal(activeRoom) : 0 : feeStructureServiceModule.rupees(form.components.reduce((sum, row) => sum + feeStructureServiceModule.cents(row.amount), 0));
    const [error, setError] = useState("");
    const [previewStarted, setPreviewStarted] = useState(Boolean(value.id));

    const patch = (change) => {
      setPreviewStarted(true);
      setForm((curr) => { const next = { ...curr, ...change }; if (change.components) next.fee = feeStructureServiceModule.rupees(change.components.reduce((sum, row) => sum + feeStructureServiceModule.cents(row.amount), 0)); return next; });
      setError("");
    };

    const updateRoom = change => patch({ roomPricing: form.roomPricing.map((room, index) => index === roomIndex ? { ...room, ...change } : room) });
    const addRoom = () => {
      setRoomIndex(form.roomPricing.length);
      patch({ roomPricing: [...form.roomPricing, { roomType: "", occupancy: "", acType: "", plan: "", dueDate: "", installments: [], components: ["Room Rent", "Mess Fee", "Maintenance"].map(name => ({ name, amount: "", category: "Hostel", mandatory: true, refundable: false })) }] });
    };
    const submit = (status = "Active") => {
      const err = validateFacilityPlan(form, type, masters.years, status);
      if (err) {
        setError(err.message);
        setFormTab(err.tab);
        return;
      }
      try { save(type, facilityPlanPayload(form, type, masters.years, status)); } catch (reason) { setError(reason.message || "Unable to save this fee plan."); }
    };

    return (
      <div className="fm-create-plan-container fm-academic-plan-editor">
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
        <div className="fm-tabs-bar fm-plan-form-tabs" role="tablist" aria-label={category + " fee plan configuration"}>{tabs.map(([key, label], index) => <button key={key} type="button" role="tab" id={tabId + "-tab-" + key} aria-controls={tabId + "-panel-" + key} aria-selected={formTab === key} tabIndex={formTab === key ? 0 : -1} className={"fm-tab-btn " + (formTab === key ? "active" : "")} onClick={() => setFormTab(key)} onKeyDown={event => {
          let next;
          if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
          else if (event.key === "ArrowLeft") next = (index + tabs.length - 1) % tabs.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = tabs.length - 1;
          else return;
          event.preventDefault(); setFormTab(tabs[next][0]); event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();
        }}><span className="fm-form-tab-number" aria-hidden="true">{index + 1}</span>{label}</button>)}</div>
        <div className="fm-create-form-body">
          {/* Section 1 */}
          <section className="fm-form-section" hidden={formTab !== "details"} role="tabpanel" id={tabId + "-panel-details"} aria-labelledby={tabId + "-tab-details"} tabIndex={0}>
            <FeeSectionHeading number="01" title={category + " Details"} description="Configure the applicable service and academic year." />

            <div className="fm-form-grid">
              <FeeSelect
                label="Academic Year *"
                value={form.academicYearId || ""}
                options={[{ id: "", name: "Select Academic Year" }, ...masters.years]}
                onChange={(academicYearId) => patch({ academicYearId })}
              />

              {hostel ? (
                <>
                  <datalist id={tabId + "-hostel-names"}>{[...new Set(existingHostels.map(item => item.hostelName).filter(Boolean))].map(name => <option key={name} value={name} />)}</datalist>
                  <FeeInput
                    list={tabId + "-hostel-names"}
                    label="Hostel Name *"
                    placeholder="e.g. Cauvery Bhavan (Boys)"
                    value={form.hostelName || ""}
                    onChange={(hostelName) => patch({ hostelName })}
                  />
                  <FeeSelect
                    label="Hostel Type"
                    value={form.hostelType || ""}
                    options={[
                      { id: "", name: "Select Hostel Type" },
                      { id: "Boys Hostel", name: "Boys Hostel" },
                      { id: "Girls Hostel", name: "Girls Hostel" },
                      { id: "Co-ed Residence", name: "Co-ed Residence" },
                    ]}
                    onChange={(hostelType) => patch({ hostelType })}
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
              <FeeSelect label="Fee Cycle" value={form.frequency || ""} options={[{ id: "", name: "Select Fee Cycle" },{ id: "Annual", name: "Annual / Per Academic Year" }, { id: "Per Semester", name: "Per Semester" }, { id: "Monthly", name: "Monthly" }]} onChange={frequency => patch({ frequency })} />
            </div>
          </section>

          <section className="fm-form-section" hidden={formTab !== "breakdown"} role="tabpanel" id={tabId + "-panel-breakdown"} aria-labelledby={tabId + "-tab-breakdown"} tabIndex={0}>
            <FeeSectionHeading number="02" title={category + " Fee Breakdown"} description="Add or edit category-specific fee heads and amounts." />
            {hostel ? <div className="fm-hostel-pricing">
              <div className="fm-workspace-heading"><p>Configure each room category separately. Prices are alternatives, not added together.</p><button type="button" className="erp-btn erp-btn--secondary" onClick={addRoom}><FiPlus /> Add Room Category</button></div>
              {form.roomPricing.length > 0 && <div className="fm-room-summary">{form.roomPricing.map((room, index) => <button type="button" key={index} className={"fm-room-price " + (index === roomIndex ? "active" : "")} onClick={() => setRoomIndex(index)}><strong>{room.roomType || "Room Category " + (index + 1)}</strong><span>{[room.occupancy ? room.occupancy + " sharing" : "", room.acType].filter(Boolean).join(" / ")}</span><b>{money(hostelRoomTotal(room))}</b></button>)}</div>}
              {activeRoom && <><div className="fm-form-grid"><FeeInput label="Room Category *" value={activeRoom.roomType} onChange={roomType => updateRoom({roomType})} /><FeeInput label="Occupancy *" type="number" min="1" step="1" value={activeRoom.occupancy} onChange={occupancy => updateRoom({occupancy})} /><FeeSelect label="AC Category *" value={activeRoom.acType} options={[{id:"",name:"Select AC Category"},{id:"AC Room",name:"AC Room"},{id:"Non-AC",name:"Non-AC"}]} onChange={acType => updateRoom({acType})} /><button type="button" className="erp-btn erp-btn--secondary" onClick={() => {patch({roomPricing:form.roomPricing.filter((_,index) => index !== roomIndex)});setRoomIndex(0);}}>Remove Room Category</button></div><FeeBreakdownEditor category="Hostel" frequency={form.frequency} rows={activeRoom.components} onChange={components => updateRoom({components})} total={total} /></>}
            </div> : <FeeBreakdownEditor category={category} frequency={form.frequency || (hostel ? "Annual" : "Per Semester")} rows={form.components} onChange={components => patch({ components })} total={total} />}
            {hostel && <FeeInput label="Fee Inclusions Description" value={form.componentsText || ""} onChange={componentsText => patch({ componentsText })} />}
          </section>
          <section className="fm-form-section" hidden={formTab !== "schedule"} role="tabpanel" id={tabId + "-panel-schedule"} aria-labelledby={tabId + "-tab-schedule"} tabIndex={0}>
            <FeeSectionHeading number="03" title="Payment Schedule" description="Configure full payment or installments and service validity." />
            {hostel ? activeRoom ? <><FeeSelect label="Room Category" value={String(roomIndex)} options={form.roomPricing.map((room,index) => ({id:String(index),name:room.roomType || "Room Category " + (index + 1)}))} onChange={index => setRoomIndex(Number(index))} /><FeePaymentScheduleEditor value={activeRoom} onChange={updateRoom} total={total} /></> : <p className="fm-empty-text">Add a room category in Fee Breakdown first.</p> : <FeePaymentScheduleEditor value={form} onChange={patch} total={total} />}
            <div className="fm-form-grid"><FeeInput label="Effective From" type="date" value={form.effectiveFrom || ""} onChange={effectiveFrom => patch({ effectiveFrom })} /><FeeInput label="Effective To" type="date" value={form.effectiveTo || ""} onChange={effectiveTo => patch({ effectiveTo })} /></div>
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
          hasContent={previewStarted}
          title={hostel ? "Hostel Fee Plan" : "Transport Fee Plan"}
          status={form.status}
          total={total}
          groups={hostel ? [
            {label:"Hostel Details",rows:[["Hostel",form.hostelName],["Academic Year",masters.years.find(year => String(year.id) === String(form.academicYearId))?.name || form.academicYearName],["Hostel Type",form.hostelType],["Mess Plan",form.messPlan],["Fee Cycle",form.frequency],["Fee Inclusions",form.componentsText],["Effective From",form.effectiveFrom],["Effective To",form.effectiveTo]]},
            ...form.roomPricing.map(room => ({label:room.roomType || "Room Category",rows:[["Occupancy",room.occupancy],["AC Category",room.acType],...feeHeadPreviewRows(room.components, money),["Category Total",hostelRoomTotal(room)>0?money(hostelRoomTotal(room)):""],["Payment Mode",room.plan],["Due Date",room.dueDate],...(room.installments || []).map((item,index) => [item.name || "Payment " + (index+1),(String(item.amount ?? "").trim() ? money(item.amount) : "Amount not entered")+" / "+(item.dueDate || "Date not set")])]}))
          ] : [
            { label: hostel ? "Accommodation Details" : "Transport Details", rows: [
              ["Plan Type", hostel ? "Hostel Fee" : "Transport Fee"],
              ["Academic Year", masters.years.find(y => String(y.id) === String(form.academicYearId))?.name || form.academicYearName],
              ...(hostel
                ? [["Hostel", form.hostelName], ["Hostel Type", form.hostelType], ["Room / Occupancy", form.roomType], ["AC Category", form.acType], ["Mess Plan", form.messPlan]]
                : [["Route", form.route], ["Route Code", form.routeCode], ["Boarding Stop", form.pickupPoint], ["Distance", form.distance ? `${form.distance} km` : ""]]),
            ] },
            { label: category + " Fee Breakdown", rows: form.components.length ? feeHeadPreviewRows(form.components, money) : [] },
            { label: "Payment", rows: [
              ["Fee Cycle", form.frequency],
              ["Payment Type", form.plan === "Full Payment" ? "Pay in Full" : form.plan === "Installment Plan" ? "Installments" : ""],
              ...(form.plan === "Full Payment" ? [["Due Date", form.dueDate], ["Amount", total > 0 ? money(total) : ""]] : form.installments.map((row, index) => [row.name || "Payment " + (index + 1), <><strong>{money(row.amount)}</strong><small>{row.dueDate || "Date not selected"}</small></>])),
              ["Effective From", form.effectiveFrom], ["Effective To", form.effectiveTo],
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
          {value.components?.length > 0 && <div><h3>Fee Breakdown</h3><FeeTable rows={value.components} columns={[{ label: "Fee Head", key: "name" }, { label: "Amount", align: "right", render: row => money(row.amount) }]} /></div>}
          {value.plan && <div><h3>Payment Schedule</h3>{value.plan === "Full Payment" ? <p>Full payment: {money(value.fee)} ? Due {value.dueDate || "Not set"}</p> : <FeeTable rows={value.installments || []} columns={[{ label: "Payment", key: "name" }, { label: "Due Date", key: "dueDate" }, { label: "Amount", align: "right", render: row => money(row.amount) }]} />}</div>}
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
    viewPlan = false,
  }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { facilityId, structureId } = useParams();
    const { scopeRecords, academicYears, selectedCollegeId, selectedAcademicYearId, selectedAcademicYear } =
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

    const masters = {
      ...allMasters,
      years: activeFeeYearOptions(academicYears || []),
      ...Object.fromEntries(
        ["departments", "courses", "branches", "semesters"].map((type) => [
          type,
          scopeRecords(allMasters[type]),
        ])
      ),
    };

    useEffect(() => {
      let active = true;
      setLoading(true);
      setLookupError("");
      const lookups = [departmentApi.getAll(), courseApi.getAll(), branchApi.getAll(), getSemesters()];
      Promise.allSettled(lookups)
        .then(results => {
          if (!active) return;
          const keys = ["departments", "courses", "branches", "semesters"];
          const errors = [];
          const loaded = {};
          results.forEach((result, index) => {
            const key = keys[index];
            try {
              if (result.status === "rejected") throw result.reason;
              loaded[key] = key === "semesters" ? normSemesters(result.value) : norm(result.value, [key === "departments" ? "departmentId" : key === "courses" ? "courseId" : "branchId", "id"], [key === "departments" ? "departmentName" : key === "courses" ? "courseName" : "branchName", "name"]);
            } catch (reason) {
              loaded[key] = [];
              errors.push(reason?.message || "Unable to load " + key + ".");
            }
          });
          setMasters(previous => ({ ...previous, ...loaded }));
          setLookupError(errors.join(" "));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [selectedCollegeId]);

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
      if (type === "hostel") {
        const conflict = hostels.some(existing => existing.id !== val.id && existing.status !== "Inactive" && String(existing.academicYearId) === String(val.academicYearId) && feeHeadName(existing.hostelName).toLowerCase() === feeHeadName(val.hostelName).toLowerCase() && existing.frequency === val.frequency && (existing.roomPricing || [existing]).some(room => val.roomPricing.some(next => hostelRoomKey(room) === hostelRoomKey(next))));
        if (conflict) throw new Error("Pricing already exists for this hostel, academic year, room category and fee cycle. Edit the existing plan.");
      }
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

    if (viewPlan) {
      const category = facilityType === "hostel" ? "Hostel" : facilityType === "transport" ? "Transport" : "Academic";
      const row = facilityType ? (facilityType === "hostel" ? hostels : transports).find(item => String(item.id) === String(facilityId)) : (workflow?.rows || []).find(item => String(item.id) === String(structureId)) || rows.find(item => String(item.id) === String(structureId));
      if (!row) return <div className="fm-page-container"><FeePageHeading title="Fee Plan Not Found" description="This fee plan is unavailable in the selected college." /><button type="button" className="erp-btn erp-btn--secondary" onClick={() => navigate("/fees/structures")}>Back to Fee Plans</button></div>;
      const canEdit = facilityType ? true : row.status === "Draft" && !(workflow?.assignments || []).some(item => item.structureId === row.id);
      return <FeePlanDetailsPage row={row} category={category} masters={masters} close={() => navigate("/fees/structures")} canEdit={canEdit} edit={() => navigate(facilityType ? "/fees/structures/" + facilityType + "/" + row.id + "/edit" : "/fees/structures/" + row.id + "/edit", {state: {initialStructure: row}})} />;
    }

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
          academicYearId: "",
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
          existingHostels={hostels}
        />
      );
    }

    return (
      <div className="fm-page-container">
        {/* Page Header */}
        <FeePageHeading title="Fee Plans" description="Configure academic, accommodation and transport fees." icon={external3.FiLayers}>



        </FeePageHeading>

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
            <span>Academic Fees</span><small>{academicRows.length}</small>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "hostel"}
            className={`fm-fee-type-tab ${tab === "hostel" ? "active" : ""}`}
            onClick={() => switchTab("hostel")}
          >
            <FiHome />
            <span>Hostel Fees</span><small>{hostels.length}</small>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "transport"}
            className={`fm-fee-type-tab ${tab === "transport" ? "active" : ""}`}
            onClick={() => switchTab("transport")}
          >
            <FiTruck />
            <span>Transport Fees</span><small>{transports.length}</small>
          </button>
        </nav>

        {/* Main Workspace */}
        <div className={`fm-plan-workspace fm-category--${tab}`}>
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
            <div className="fm-workspace-actions">
            <button
              type="button"
              className="fm-btn-context-primary"
              onClick={handleCreate}
            >
              <FiPlus />
              <span>
                {tab === "academic"
                  ? "Create Academic Plan"
                  : tab === "hostel"
                  ? "Create Hostel Plan"
                  : "Create Transport Plan"}
              </span>
            </button>
            </div>
          </div>

          {/* Contextual Filter Toolbar */}
          {tab === "academic" && (
            <FilterPanel active={isAcademicFiltered} onClear={clearAcademicFilters}>
              <div className="course-toolbar">
                <label className="course-search">
                  <FiSearch />
                  <input
                    type="text"
                    aria-label="Search academic fee plans"
                    placeholder="Search fee plans..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>

                <select
                  aria-label="Filter by Academic Year"
                  value={filters.academicYearId}
                  onChange={(e) => setFilters((f) => ({ ...f, academicYearId: e.target.value }))}
                >
                  <option value="">All Years</option>
                  {masters.years.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Course"
                  value={filters.courseId}
                  onChange={(e) => setFilters((f) => ({ ...f, courseId: e.target.value, branchId: "" }))}
                >
                  <option value="">All Courses</option>
                  {masters.courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Branch"
                  value={filters.branchId}
                  onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
                >
                  <option value="">All Branches</option>
                  {masters.branches
                    .filter((b) => !filters.courseId || String(b.courseId) === String(filters.courseId))
                    .map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>

                <select
                  aria-label="Filter by Batch"
                  value={filters.batch}
                  onChange={(e) => setFilters((f) => ({ ...f, batch: e.target.value }))}
                >
                  <option value="">All Batches</option>
                  {uniqueBatches.map((batch) => (
                    <option key={batch} value={batch}>{batch}</option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Status"
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Inactive">Inactive</option>
                  {["Pending Approval", "Approved", "Published", "Archived"].map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
            </FilterPanel>
          )}

          {tab === "hostel" && (
            <FilterPanel active={isHostelFiltered} onClear={clearHostelFilters}>
              <div className="course-toolbar">
                <label className="course-search">
                  <FiSearch />
                  <input
                    type="text"
                    aria-label="Search hostel fee plans"
                    placeholder="Search hostel or room..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>

                <select
                  aria-label="Filter by Academic Year"
                  value={hostelFilters.academicYearId}
                  onChange={(e) => setHostelFilters((f) => ({ ...f, academicYearId: e.target.value }))}
                >
                  <option value="">All Years</option>
                  {masters.years.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Hostel"
                  value={hostelFilters.hostelName}
                  onChange={(e) => setHostelFilters((f) => ({ ...f, hostelName: e.target.value }))}
                >
                  <option value="">All Hostels</option>
                  {uniqueHostelNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Room Type"
                  value={hostelFilters.roomType}
                  onChange={(e) => setHostelFilters((f) => ({ ...f, roomType: e.target.value }))}
                >
                  <option value="">All Room Types</option>
                  {uniqueRoomTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Status"
                  value={hostelFilters.status}
                  onChange={(e) => setHostelFilters((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </FilterPanel>
          )}

          {tab === "transport" && (
            <FilterPanel active={isTransportFiltered} onClear={clearTransportFilters}>
              <div className="course-toolbar">
                <label className="course-search">
                  <FiSearch />
                  <input
                    type="text"
                    aria-label="Search transport fee plans"
                    placeholder="Search route or stop..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>

                <select
                  aria-label="Filter by Academic Year"
                  value={transportFilters.academicYearId}
                  onChange={(e) => setTransportFilters((f) => ({ ...f, academicYearId: e.target.value }))}
                >
                  <option value="">All Years</option>
                  {masters.years.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Route"
                  value={transportFilters.route}
                  onChange={(e) => setTransportFilters((f) => ({ ...f, route: e.target.value }))}
                >
                  <option value="">All Routes</option>
                  {uniqueRoutes.map((route) => (
                    <option key={route} value={route}>{route}</option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Boarding Point"
                  value={transportFilters.pickupPoint}
                  onChange={(e) => setTransportFilters((f) => ({ ...f, pickupPoint: e.target.value }))}
                >
                  <option value="">All Stops</option>
                  {uniqueStops.map((stop) => (
                    <option key={stop} value={stop}>{stop}</option>
                  ))}
                </select>

                <select
                  aria-label="Filter by Status"
                  value={transportFilters.status}
                  onChange={(e) => setTransportFilters((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </FilterPanel>
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
                  className="fm-plan-table"
                  columns={[
                    {
                      label: "Plan Name",
                      render: (r) => (
                        <div className="fm-plan-identity">
                          <strong title={r.name}>{r.courseName || r.name}</strong>
                          {(r.branchName || r.batch) && <span className="fm-plan-context">{[r.branchName, r.batch].filter(Boolean).join(" · ")}</span>}
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
                            onClick={() => navigate(`/fees/structures/${r.id}/view`)}
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
                  className="fm-plan-table"
                  columns={[
                    {
                      label: "Plan Name",
                      render: (h) => (
                        <div className="fm-plan-identity">
                          <strong title={h.hostelName}>{h.hostelName}</strong>
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
                      render: (h) => <strong>{hostelPriceLabel(h)}</strong>,
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
                            onClick={() => navigate(`/fees/structures/hostel/${h.id}/view`)}
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
                  className="fm-plan-table"
                  columns={[
                    {
                      label: "Plan Name",
                      render: (t) => (
                        <div className="fm-plan-identity">
                          <strong title={t.route}>{t.route}</strong>
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
                            onClick={() => navigate(`/fees/structures/transport/${t.id}/view`)}
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
    FiArrowLeft,
    FiCheck,
    FiCheckCircle,
    FiClock,
    FiCreditCard,
    FiDollarSign,
    FiDownload,
    FiEdit2,
    FiFileText,
    FiFilter,
    FiLayers,
    FiPieChart,
    FiPlus,
    FiPrinter,
    FiRefreshCw,
    FiSearch,
    FiSliders,
    FiTrendingUp,
    FiUsers,
    FiX,
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
  const { default: FilterPanel } = FilterPanelModule;
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
  // DESTINATION 1: FINANCE OVERVIEW (DASHBOARD + EMBEDDED REPORTS & EXPORTS)
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
    return str;
  }

  function FinanceOverview({ academic, configuration }) {
    const navigate = useNavigate();
    const [trendPeriod, setTrendPeriod] = useState("30");
    const [dashData, setDashData] = useState(null);
    const [recentPayments, setRecentPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedYear, setSelectedYear] = useState(
      academic.selectedAcademicYearId || ""
    );
    const [receiptView, setReceiptView] = useState(null);

    // Reports Section State
    const [reportType, setReportType] = useState("summary");
    const [reportFromDate, setReportFromDate] = useState("");
    const [reportToDate, setReportToDate] = useState("");
    const [reportResult, setReportResult] = useState(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState("");

    const yearOptions = (academic.academicYears || []).map((y) => ({
      id: String(y.academicYearId || y.id),
      name: y.academicYearName || y.name,
    }));

    const fetchDashboard = () => {
      let active = true;
      setLoading(true);
      setError("");
      Promise.allSettled([
        feeCollectionApi.dashboard({
          academicYearId: selectedYear,
        }),
        feeCollectionApi.history({ page: 1, pageSize: 6 }),
      ])
        .then(([dashRes, histRes]) => {
          if (!active) return;
          const failures = [dashRes, histRes].filter((res) => res.status === "rejected");
          if (failures.length) {
            setError(failures.map((res) => res.reason?.message || "Unable to load financial records.").join(" "));
          }
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
    };

    useEffect(() => {
      return fetchDashboard();
    }, [selectedYear, academic.selectedCollegeId]);

    // Fetch reports when report parameters change
    useEffect(() => {
      let active = true;
      setReportLoading(true);
      setReportError("");
      setReportResult(null);

      const isOutstanding = reportType === "outstanding" || reportType === "overdue";
      const isTx = reportType === "transactions";

      const req = isOutstanding
        ? feeCollectionApi.allPending({
            academicYearId: selectedYear,
            overdueOnly: reportType === "overdue",
            dueFrom: reportFromDate,
            dueTo: reportToDate,
          })
        : isTx
        ? feeCollectionApi.allHistory({
            fromDate: reportFromDate,
            toDate: reportToDate,
          })
        : feeCollectionApi.dashboard({
            academicYearId: selectedYear,
            fromDate: reportFromDate,
            toDate: reportToDate,
          });

      req
        .then((data) => {
          if (active) setReportResult(data);
        })
        .catch((err) => {
          if (active) setReportError(err.message || "Unable to load report data.");
        })
        .finally(() => {
          if (active) setReportLoading(false);
        });

      return () => {
        active = false;
      };
    }, [reportType, selectedYear, reportFromDate, reportToDate, academic.selectedCollegeId]);

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
    const trendPoints =
      trendPeriod === "year"
        ? [...dailyMap].sort(([a], [b]) => a.localeCompare(b)).map(([date, amount]) => ({ date, amount }))
        : recentTrendPoints;
    const maxVal = Math.max(1, ...trendPoints.map((p) => p.amount));

    // Reports processing
    const reportTitle =
      reportType === "summary"
        ? "Monthly Collection Summary"
        : reportType === "daily"
        ? "Daily Collections"
        : reportType === "outstanding"
        ? "Outstanding Fee Report"
        : reportType === "overdue"
        ? "Overdue Fee Report"
        : reportType === "category"
        ? "Category-wise Collections"
        : reportType === "mode"
        ? "Payment Methods Report"
        : "Transaction History Report";

    let reportRows = [];
    let reportColumns = [];
    let reportTotalRow = null;
    let reportSummaryMetrics = null;

    if (reportType === "outstanding" || reportType === "overdue") {
      reportRows = Array.isArray(reportResult) ? reportResult : [];
      reportColumns = [
        { label: "Student", render: (r) => <FeeIdentity name={r.studentName} detail={r.studentCode} /> },
        { label: "Category", render: (r) => r.feeCategory || "Academic" },
        { label: "Due Date", render: (r) => formatReportDate(r.dueDate) },
        { label: "Total Fee", align: "right", render: (r) => feeMoney(r.payableAmount) },
        { label: "Paid", align: "right", render: (r) => feeMoney(r.paidAmount) },
        {
          label: "Balance",
          align: "right",
          render: (r) => (
            <strong style={{ color: Number(r.balanceAmount) > 0 ? "var(--fee-warning, #F59E0B)" : "inherit" }}>
              {feeMoney(r.balanceAmount)}
            </strong>
          ),
        },
      ];
      if (reportRows.length > 0) {
        const totalPayable = reportRows.reduce((sum, r) => sum + (Number(r.payableAmount) || 0), 0);
        const totalPaid = reportRows.reduce((sum, r) => sum + (Number(r.paidAmount) || 0), 0);
        const totalBalance = reportRows.reduce((sum, r) => sum + (Number(r.balanceAmount) || 0), 0);
        reportTotalRow = {
          studentName: <strong>Total</strong>,
          payableAmount: <strong>{feeMoney(totalPayable)}</strong>,
          paidAmount: <strong>{feeMoney(totalPaid)}</strong>,
          balanceAmount: <strong>{feeMoney(totalBalance)}</strong>,
        };
        reportSummaryMetrics = [
          { label: "Total Payable", value: feeMoney(totalPayable) },
          { label: "Total Paid", value: feeMoney(totalPaid) },
          { label: reportType === "overdue" ? "Total Overdue" : "Total Outstanding", value: feeMoney(totalBalance) },
        ];
      }
    } else if (reportType === "transactions") {
      reportRows = Array.isArray(reportResult) ? reportResult : [];
      reportColumns = [
        { label: "Receipt #", render: (r) => <button type="button" className="fm-text-link" onClick={() => setReceiptView(r)}>{r.receiptNumber || `REC-${r.receiptId || r.paymentId}`}</button> },
        { label: "Student", render: (r) => <FeeIdentity name={r.studentName} detail={r.studentCode} /> },
        { label: "Payment Date", render: (r) => formatReportDate(r.paymentDate || r.issuedAt) },
        { label: "Payment Mode", render: (r) => <FeePaymentMethod value={r.paymentMode} /> },
        { label: "Reference", render: (r) => r.transactionReference || "—" },
        { label: "Amount Paid", align: "right", render: (r) => <strong style={{ color: "var(--fee-success, #10B981)" }}>{feeMoney(r.totalAmount || r.feeAmount)}</strong> },
      ];
      if (reportRows.length > 0) {
        const totalPaid = reportRows.reduce((sum, r) => sum + (Number(r.totalAmount || r.feeAmount) || 0), 0);
        reportTotalRow = {
          receiptNumber: <strong>Total</strong>,
          totalAmount: <strong>{feeMoney(totalPaid)}</strong>,
        };
        reportSummaryMetrics = [
          { label: "Total Transactions", value: reportRows.length.toLocaleString() },
          { label: "Total Collected", value: feeMoney(totalPaid) },
        ];
      }
    } else if (reportType === "category") {
      reportRows = reportResult?.byCategory || [];
      reportColumns = [
        { label: "Fee Category", render: (r) => <strong>{r.categoryName}</strong> },
        { label: "Assigned Demand", align: "right", render: (r) => feeMoney(r.assigned) },
        { label: "Collected", align: "right", render: (r) => <span style={{ color: "var(--fee-success, #10B981)" }}>{feeMoney(r.collected)}</span> },
        { label: "Pending", align: "right", render: (r) => <span style={{ color: "var(--fee-warning, #F59E0B)" }}>{feeMoney(r.pending)}</span> },
      ];
      if (reportRows.length > 0) {
        const totAssigned = reportRows.reduce((sum, r) => sum + (Number(r.assigned) || 0), 0);
        const totCollected = reportRows.reduce((sum, r) => sum + (Number(r.collected) || 0), 0);
        const totPending = reportRows.reduce((sum, r) => sum + (Number(r.pending) || 0), 0);
        reportTotalRow = {
          categoryName: <strong>Total</strong>,
          assigned: <strong>{feeMoney(totAssigned)}</strong>,
          collected: <strong>{feeMoney(totCollected)}</strong>,
          pending: <strong>{feeMoney(totPending)}</strong>,
        };
        reportSummaryMetrics = [
          { label: "Total Assigned", value: feeMoney(totAssigned) },
          { label: "Total Collected", value: feeMoney(totCollected) },
          { label: "Total Pending", value: feeMoney(totPending) },
        ];
      }
    } else if (reportType === "mode") {
      reportRows = reportResult?.byPaymentMode || [];
      reportColumns = [
        { label: "Payment Method", render: (r) => <FeePaymentMethod value={r.paymentMode} /> },
        { label: "Transactions", align: "right", render: (r) => Number(r.paymentCount || 0).toLocaleString() },
        { label: "Collected Amount", align: "right", render: (r) => <strong>{feeMoney(r.amount)}</strong> },
      ];
      if (reportRows.length > 0) {
        const totTx = reportRows.reduce((sum, r) => sum + (Number(r.paymentCount) || 0), 0);
        const totAmount = reportRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        reportTotalRow = {
          paymentMode: <strong>Total</strong>,
          paymentCount: <strong>{totTx.toLocaleString()}</strong>,
          amount: <strong>{feeMoney(totAmount)}</strong>,
        };
        reportSummaryMetrics = [
          { label: "Total Collected", value: feeMoney(totAmount) },
          { label: "Total Transactions", value: totTx.toLocaleString() },
        ];
      }
    } else {
      // "summary" or "daily"
      const groups = new Map();
      for (const row of reportResult?.collectionTrend || []) {
        const periodKey = date(row.date).slice(0, reportType === "summary" ? 7 : 10);
        const prev = groups.get(periodKey) || { period: periodKey, amount: 0, paymentCount: 0 };
        prev.amount += Number(row.amount || 0);
        prev.paymentCount += Number(row.paymentCount || 0);
        groups.set(periodKey, prev);
      }
      reportRows = [...groups.values()].sort((a, b) => a.period.localeCompare(b.period));
      reportColumns = [
        {
          label: reportType === "summary" ? "Month" : "Date",
          render: (r) => (reportType === "summary" ? formatReportMonth(r.period) : formatReportDate(r.period)),
        },
        {
          label: "Transactions",
          align: "right",
          render: (r) => Number(r.paymentCount || 0).toLocaleString(),
        },
        {
          label: "Collected Amount",
          align: "right",
          render: (r) => <strong>{feeMoney(r.amount)}</strong>,
        },
      ];
      if (reportRows.length > 0) {
        const totTx = reportRows.reduce((sum, r) => sum + Number(r.paymentCount || 0), 0);
        const totAmount = reportRows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
        const avgTx = totTx > 0 ? Math.round(totAmount / totTx) : 0;
        reportTotalRow = {
          period: <strong>Total</strong>,
          paymentCount: <strong>{totTx.toLocaleString()}</strong>,
          amount: <strong>{feeMoney(totAmount)}</strong>,
        };
        reportSummaryMetrics = [
          { label: "Total Collected", value: feeMoney(totAmount) },
          { label: "Total Transactions", value: totTx.toLocaleString() },
          { label: "Average per Transaction", value: feeMoney(avgTx) },
        ];
      }
    }

    return (
      <div className="fm-page-container">
        {/* Page Header */}
        <FeePageHeading
          title="Fee Management Overview"
          description="Financial analytics, collection performance, category breakdown, and executive reports."
          icon={FiPieChart}
        >
          <div className="fm-header-year-select">
            <select
              aria-label="Filter by Academic Year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">All Academic Years</option>
              {yearOptions.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="erp-btn erp-btn--secondary"
            onClick={fetchDashboard}
            disabled={loading}
            title="Refresh overview metrics"
          >
            <FiRefreshCw className={loading ? "fm-spin" : ""} /> Refresh
          </button>
        </FeePageHeading>

        <FeeRequestState loading={loading} error={error}>
          {/* Four Colorful KPI Cards */}
          <div className="fm-summary-cards-grid">
            {/* 1. Total Fee Demand - Blue */}
            <div className="fm-summary-card fm-summary-card--blue">
              <div className="fm-summary-card__header">
                <span className="fm-summary-card__label">Total Fee Demand</span>
                <span className="fm-summary-card__icon-box">
                  <FiLayers />
                </span>
              </div>
              <strong className="fm-summary-card__value">
                {feeMoney(totalFees)}
              </strong>
              <span className="fm-summary-card__meta">Total assigned student fee demand</span>
            </div>

            {/* 2. Total Collected - Emerald Green */}
            <div className="fm-summary-card fm-summary-card--green">
              <div className="fm-summary-card__header">
                <span className="fm-summary-card__label">Total Collected</span>
                <span className="fm-summary-card__icon-box">
                  <FiCheckCircle />
                </span>
              </div>
              <strong className="fm-summary-card__value">
                {feeMoney(collected)}
              </strong>
              <span className="fm-summary-card__meta">{collectionPct}% of assigned fee demand</span>
            </div>

            {/* 3. Outstanding Balance - Amber */}
            <div className="fm-summary-card fm-summary-card--amber">
              <div className="fm-summary-card__header">
                <span className="fm-summary-card__label">Outstanding Balance</span>
                <span className="fm-summary-card__icon-box">
                  <FiClock />
                </span>
              </div>
              <strong className="fm-summary-card__value">
                {feeMoney(balance)}
              </strong>
              <span className="fm-summary-card__meta">{pendingStudents} students with pending dues</span>
            </div>

            {/* 4. Overdue Amount - Soft Red */}
            <div className="fm-summary-card fm-summary-card--red">
              <div className="fm-summary-card__header">
                <span className="fm-summary-card__label">Overdue Amount</span>
                <span className="fm-summary-card__icon-box">
                  <FiAlertCircle />
                </span>
              </div>
              <strong className="fm-summary-card__value">
                {feeMoney(overdue)}
              </strong>
              <span className="fm-summary-card__meta">{overdueStudents} students with overdue accounts</span>
            </div>
          </div>

          {/* COLLECTION PROGRESS BAR */}
          <div className="fm-progress-card">
            <div className="fm-progress-card__header">
              <div className="fm-progress-label">
                <FiTrendingUp />
                <div>
                  <h2>Collection Performance</h2>
                  <p>Overall collection progress against assigned institutional fee demand</p>
                </div>
              </div>
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

          {/* OVERVIEW CONTENT GRID: LEFT (65%) / RIGHT (35%) */}
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
                {!trendPoints.some((p) => p.amount > 0) ? (
                  <div className="fm-chart-empty">
                    <FiLayers />
                    <strong>No collections in this period</strong>
                    <span>Choose another range to explore recorded payment activity.</span>
                  </div>
                ) : (
                  <svg viewBox="0 0 640 210" className="fm-trend-svg" role="img" aria-label="Collection trend chart">
                    {[0, 0.5, 1].map((fraction) => (
                      <g key={fraction}>
                        <line x1="95" y1={165 - fraction * 125} x2="615" y2={165 - fraction * 125} className="fm-axis" />
                        <text x="85" y={169 - fraction * 125} textAnchor="end" className="fm-chart-label">
                          {feeMoney(maxVal * fraction)}
                        </text>
                      </g>
                    ))}
                    <polyline
                      fill="none"
                      stroke="var(--fee-teal, #0D9488)"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      points={trendPoints
                        .map((point, index) => [
                          95 + (index / Math.max(1, trendPoints.length - 1)) * 520,
                          165 - (point.amount / maxVal) * 125,
                        ].join(","))
                        .join(" ")}
                    />
                    {trendPoints.map((point, index) => (
                      <circle
                        key={point.date}
                        cx={95 + (index / Math.max(1, trendPoints.length - 1)) * 520}
                        cy={165 - (point.amount / maxVal) * 125}
                        r={trendPoints.length > 35 ? 2 : 3.5}
                        fill="var(--fee-teal, #0D9488)"
                      >
                        <title>{point.date}: {feeMoney(point.amount)}</title>
                      </circle>
                    ))}
                    <text x="95" y="195" className="fm-chart-label">{trendPoints[0]?.date}</text>
                    <text x="615" y="195" textAnchor="end" className="fm-chart-label">{trendPoints.at(-1)?.date}</text>
                  </svg>
                )}
              </div>
            </div>

            {/* Right: Fee Status & Category Breakdown */}
            <div className="fm-status-breakdown-card">
              <div className="fm-card-header">
                <h2>Fee Status & Collections</h2>
              </div>
              <div className="fm-status-visual">
                <div
                  className="fm-status-ring"
                  style={{ "--fm-collected-angle": `${Math.min(100, Math.max(0, Number(collectionPct)))}%` }}
                >
                  <div>
                    <strong>{collectionPct}%</strong>
                    <span>collected</span>
                  </div>
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
                      <span className="fm-status-dot fm-status-dot--due" />
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
                      <span className="fm-status-dot" style={{ background: "var(--fee-danger, #EF4444)" }} />
                      <span>Overdue</span>
                    </div>
                    <strong>{overdueStudents} students</strong>
                  </div>
                </div>
              </div>

              {/* Category-wise Collections list */}
              {dashData?.byCategory?.length > 0 && (
                <div className="fm-category-breakdown-list">
                  <h4>Category-wise Collections</h4>
                  {dashData.byCategory.map((cat) => {
                    const catPct = cat.assigned > 0 ? Math.round((cat.collected / cat.assigned) * 100) : 0;
                    return (
                      <div key={cat.categoryName} className="fm-category-item">
                        <div className="fm-category-item-head">
                          <span>{cat.categoryName}</span>
                          <strong>{feeMoney(cat.collected)} / {feeMoney(cat.assigned)} ({catPct}%)</strong>
                        </div>
                        <div className="fm-category-track">
                          <div
                            className="fm-category-fill"
                            style={{ width: `${Math.min(100, Math.max(0, catPct))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="fm-overdue-note">
                <FiAlertCircle />
                <div>
                  <strong>{feeMoney(overdue)} overdue</strong>
                  <span>Included in outstanding balances</span>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Needs Attention Card */}
          {(overdueStudents > 0 || pendingStudents > 0) && (
            <div className="fm-attention-card">
              <div className="fm-card-header">
                <h2>Needs Attention</h2>
              </div>
              <div className="fm-attention-items">
                {overdueStudents > 0 && (
                  <Link to="/fees/students" state={{ status: "Overdue" }} className="fm-attention-row">
                    <FeeBadge value="Overdue" />
                    <span>{overdueStudents} students have overdue payments</span>
                    <span className="fm-action-hint">Review in Student Fees →</span>
                  </Link>
                )}
                {pendingStudents > 0 && (
                  <Link to="/fees/students" state={{ status: "Pending" }} className="fm-attention-row">
                    <FeeBadge value="Pending" />
                    <span>{pendingStudents} students have pending fee installments</span>
                    <span className="fm-action-hint">Review in Student Fees →</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Recent Payments Section */}
          <div className="fm-recent-payments-card">
            <div className="fm-card-header">
              <h2>Recent Payments</h2>
              <Link to="/fees/students" state={{ tab: "transactions" }} className="fm-link-more">
                View All Transactions in Student Fees →
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
                { label: "Student", render: (r) => <FeeIdentity name={r.studentName} detail={r.studentCode} /> },
                { label: "Payment Method", render: (r) => <FeePaymentMethod value={r.paymentMode} /> },
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

          {/* FINANCIAL REPORTS & EXPORTS SECTION */}
          <div className="fm-workspace fm-reports-section" id="fm-reports-section">
            <div className="fm-workspace-heading">
              <div>
                <h2>Financial Reports & Exports</h2>
                <p>Generate collection summaries, overdue balances, and export audit sheets.</p>
              </div>
              <div className="fm-workspace-actions">
                <ExportMenu
                  data={reportRows}
                  columns={reportColumns.map((c) => ({ label: c.label, key: c.label }))}
                  fileName={`Fee_Report_${reportType}_${feeToday()}`}
                  title={reportTitle}
                />
              </div>
            </div>

            {/* Compact Report Toolbar */}
            <FilterPanel
              active={Boolean(reportFromDate || reportToDate || reportType !== "summary")}
              onClear={() => {
                setReportType("summary");
                setReportFromDate("");
                setReportToDate("");
              }}
            >
              <div className="course-toolbar">
                <select
                  aria-label="Report Type"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <option value="summary">Monthly Collection Summary</option>
                  <option value="daily">Daily Collections</option>
                  <option value="outstanding">Outstanding Fee Report</option>
                  <option value="overdue">Overdue Fee Report</option>
                  <option value="category">Category-wise Collections</option>
                  <option value="mode">Payment Methods Report</option>
                  <option value="transactions">Transaction History Report</option>
                </select>

                <select
                  aria-label="Academic Year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  <option value="">All Academic Years</option>
                  {yearOptions.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  aria-label="From Date"
                  value={reportFromDate}
                  onChange={(e) => setReportFromDate(e.target.value)}
                />

                <input
                  type="date"
                  aria-label="To Date"
                  value={reportToDate}
                  onChange={(e) => setReportToDate(e.target.value)}
                />
              </div>
            </FilterPanel>

            {/* Summary Strip */}
            {reportSummaryMetrics && (
              <div className="fm-report-summary-strip">
                {reportSummaryMetrics.map((m) => (
                  <div key={m.label} className="fm-report-summary-chip">
                    <span>{m.label}</span>
                    <strong>{m.value}</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Report Table */}
            <FeeTable
              loading={reportLoading}
              error={reportError}
              rows={reportRows}
              columns={reportColumns}
              pageSize={10}
              totalRow={reportTotalRow}
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
        <FeePageHeading title="Payments" description="Review collections, transaction references and student receipts." icon={external3.FiCreditCard} />

        <div className="fm-summary-strip">
          <FeeMetric label="Collected Today" value={feeMoney(dailySummary?.totalCollected || 0)} meta="Today's collections" tone="green" icon={external3.FiDollarSign} />
          <FeeMetric label="Payments Today" value={dailySummary?.paymentsCount || 0} meta="Recorded transactions today" icon={external3.FiCreditCard} />
          <FeeMetric label="Receipts Issued" value={dailySummary?.receiptsCount || 0} meta="Receipts issued today" tone="lavender" icon={external3.FiFileText} />
        </div>

        {/* Main Content Surface */}
        <div className="fm-workspace">
          <div className="fm-workspace-heading">
            <div>
              <h2>Payment register</h2>
              <p>Search recorded transactions and open student receipts.</p>
            </div>
          </div>

          {/* Search / Filter Toolbar */}
          <FilterPanel
            active={Boolean(search || paymentMode || fromDate || toDate)}
            onClear={() => {
              setSearch("");
              setPaymentMode("");
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
          >
            <div className="course-toolbar">
              <label className="course-search">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Search student, roll no, or receipt no..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  aria-label="Search payments"
                />
              </label>

              <select
                aria-label="Filter by Payment Method"
                value={paymentMode}
                onChange={(e) => {
                  setPaymentMode(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Methods</option>
                {MODES.map((m) => (
                  <option key={m.id || m} value={m.id || m}>{m.name || m}</option>
                ))}
              </select>

              <input
                type="date"
                aria-label="From Date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
              />

              <input
                type="date"
                aria-label="To Date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </FilterPanel>

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
              { label: "Student", render: r => <FeeIdentity name={r.studentName} detail={r.studentCode} /> },
              { label: "Date", render: (r) => date(r.paymentDate) },
              { label: "Payment Method", render: r => <FeePaymentMethod value={r.paymentMode} /> },
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
              <FeeSectionHeading number="01" title="Find Student" description="Search by student name, roll number or admission number." />

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
                <FeeSectionHeading number="02" title="Review Balance" description="Choose the fee installment or charges to settle." />

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
                <FeeSectionHeading number="03" title="Payment Details" description="Specify the amount and payment mode." />

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
    const [reportSearch, setReportSearch] = useState("");
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

    const filteredRows = useMemo(() => {
      if (!reportSearch.trim()) return rows;
      const q = reportSearch.toLowerCase().trim();
      return rows.filter((r) =>
        columns.some((col) => {
          const val = typeof col.value === "function" ? col.value(r) : r[col.value];
          return String(val || "").toLowerCase().includes(q);
        })
      );
    }, [rows, reportSearch, columns]);

    return (
      <div className="fm-page-container fm-reports-container">
        <FeePageHeading title="Fee Reports" description="Review financial performance and export scoped fee records." icon={external3.FiFileText}>
          <ExportMenu rows={filteredRows} columns={columns} filename={"fee-report-" + type} title={title} loading={loading} unavailable={rangeError} />
        </FeePageHeading>

        <div className="fm-workspace fm-reports-workspace">
          {/* 2. Standard report filter toolbar */}
          <FilterPanel
            active={Boolean(academicYearId || fromDate || toDate || studentId || reportSearch)}
            onClear={() => {
              setAcademicYearId("");
              setFromDate("");
              setToDate("");
              setStudentId("");
              setReportSearch("");
            }}
          >
            <div className="course-toolbar">
              <label className="course-search">
                <FiSearch />
                <input
                  type="text"
                  placeholder="Search report records..."
                  value={reportSearch}
                  onChange={(e) => setReportSearch(e.target.value)}
                  aria-label="Search report records"
                />
              </label>

              <select
                aria-label="Report Type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setReportSearch("");
                }}
              >
                {reportTypes.map((rt) => (
                  <option key={rt.id} value={rt.id}>{rt.name}</option>
                ))}
              </select>

              {type === "ledger" ? (
                <input
                  type="text"
                  placeholder="Enter student ID..."
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  aria-label="Student ID"
                />
              ) : (
                <select
                  aria-label="Academic Year"
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                >
                  <option value="">All Years</option>
                  {(academic.academicYears || []).map((y) => (
                    <option key={String(y.academicYearId || y.id)} value={String(y.academicYearId || y.id)}>
                      {y.academicYearName || y.name}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="date"
                aria-label="From Date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
              />

              <input
                type="date"
                aria-label="To Date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </FilterPanel>

          {/* 3. Relevant report summary strip */}
          {summaryMetrics && !loading && !rangeError && rows.length > 0 && (
            <div className="fm-report-summary-strip" role="region" aria-label="Report summary">
              {summaryMetrics.map((item, idx) => (
                <FeeMetric key={item.label} label={item.label} value={item.value} tone={["blue", "green", "amber", "teal"][idx % 4]} />
              ))}
            </div>
          )}

          {/* 4. Report title and record count */}
          <div className="fm-report-context">
            <strong>{title}</strong>
            <span>
              {filteredRows.length} {filteredRows.length === 1 ? "record" : "records"} |{" "}
              {outstanding
                ? "Dates filter installment due dates"
                : "Dates filter payment dates"}
            </span>
          </div>

          {/* 5. Properly aligned report table */}
          <FeeTable
            columns={tableColumns}
            rows={filteredRows}
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
    FiAlertCircle,
    FiArrowLeft,
    FiCheck,
    FiCheckCircle,
    FiClock,
    FiCopy,
    FiCreditCard,
    FiDollarSign,
    FiDownload,
    FiEdit2,
    FiEye,
    FiFileText,
    FiFilter,
    FiLayers,
    FiPlus,
    FiPrinter,
    FiRefreshCw,
    FiSearch,
    FiSettings,
    FiTrash2,
    FiUser,
    FiUsers,
    FiX,
  } = external3;
  const { default: DashboardLayout } = DashboardLayoutModule;
  const { default: PageHeader } = PageHeaderModule;
  const { default: FilterPanel } = FilterPanelModule;
  const { default: ExportMenu } = ExportMenuModule;
  const { default: TablePagination } = TablePaginationModule;
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

  // Resolve fee heads through the existing local master model. Never send local IDs to an API.
  function saveAcademicPlanWithHeads(state, form, status) {
    const normalizeName = name => String(name || "").trim().replace(/\s+/g, " ");
    const heads = [...state.components];
    const seen = new Set();
    const planComponents = form.components.map(row => {
      const name = normalizeName(row.name);
      const key = name.toLowerCase();
      if (!name || seen.has(key)) throw new Error("Enter unique, non-empty fee head names.");
      seen.add(key);
      const amount = Number(row.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000 || Math.abs(amount * 100 - cents(amount)) > 0.00001) throw new Error("Fee heads require positive amounts with at most two decimal places.");
      const existing = heads.find(head => head.status === "Active" && feeStructureServiceModule.academicFeeComponent(head) && normalizeName(head.name).toLowerCase() === key);
      let master = existing;
      // Preserve an unchanged saved reference, including legacy total-fee rows.
      const original = state.structures.find(plan => plan.id === form.id)?.components.find(component => component.masterId === row.masterId && normalizeName(component.name).toLowerCase() === key);
      if (original) master = heads.find(head => head.id === original.masterId) || master;
      if (!master && original && row.masterId === "structure-total-fee") return { ...row, name, amount };
      if (!master && original) throw new Error("A saved fee head is missing from the master records. Restore it before saving this plan.");
      if (!master) {
        master = { ...feeStructureServiceModule.feeComponent(), name, category: row.category || "Academic", frequency: row.frequency || form.cycle, mandatory: row.mandatory ?? true, refundable: row.refundable ?? false, recurring: row.recurring ?? true, status: "Active" };
        heads.push(master);
      }
      return { ...row, name, amount, masterId: master.id };
    });
    return saveWorkflowStructure({ ...state, components: heads }, { ...form, components: planComponents }, status, "Admin");
  }

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
  // Convert number to Indian Rupee Words
  function inrWords(num) {
    const n = Math.floor(Math.abs(Number(num) || 0));
    if (n === 0) return "Zero Rupees Only";
    const units = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
    ];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    function twoDigits(val) {
      if (val < 20) return units[val];
      const u = val % 10;
      return tens[Math.floor(val / 10)] + (u ? " " + units[u] : "");
    }

    function threeDigits(val) {
      if (val === 0) return "";
      const h = Math.floor(val / 100);
      const rem = val % 100;
      let res = "";
      if (h > 0) res += units[h] + " Hundred";
      if (rem > 0) res += (res ? " " : "") + twoDigits(rem);
      return res;
    }

    const crore = Math.floor(n / 10000000);
    let rem = n % 10000000;
    const lakh = Math.floor(rem / 100000);
    rem = rem % 100000;
    const thousand = Math.floor(rem / 1000);
    rem = rem % 1000;
    const hundreds = rem;

    const parts = [];
    if (crore > 0) parts.push(threeDigits(crore) + " Crore");
    if (lakh > 0) parts.push(twoDigits(lakh) + " Lakh");
    if (thousand > 0) parts.push(twoDigits(thousand) + " Thousand");
    if (hundreds > 0) parts.push(threeDigits(hundreds));

    return parts.filter(Boolean).join(" ") + " Rupees Only";
  }

  // ==========================================================================
  // OFFICIAL ERP STUDENT FEE RECEIPT MODAL
  // ==========================================================================
  function StudentReceiptModal({ receipt, student, academic, onClose }) {
    const collegeName = academic?.collegeName || academic?.currentCollege?.name || "Academic ERP Institute";
    const amountVal = Number(receipt?.feeAmount || receipt?.totalAmount || 0);
    const balanceVal = Number(receipt?.balanceAmount ?? receipt?.remainingBalance ?? 0);
    const receiptNum = receipt?.receiptNumber || `REC-${receipt?.receiptId || Date.now().toString().slice(-6)}`;
    const dateStr = receipt?.issuedAt || receipt?.paymentDate || feeToday();

    const handlePrint = () => {
      try {
        const rows = [
          ["Receipt Number", receiptNum],
          ["Student Name", receipt?.studentName || student?.name || "—"],
          ["Admission / Roll No", receipt?.studentCode || student?.roll || "—"],
          ["Course / Program", receipt?.courseName || student?.courseName || "—"],
          ["Branch", receipt?.branchName || student?.branchName || "—"],
          ["Payment Date", dateStr],
          ["Payment Mode", receipt?.paymentMode || "CASH"],
          ["Transaction Ref", receipt?.transactionReference || "—"],
          ["Amount Paid", feeMoney(amountVal)],
          ["Amount in Words", inrWords(amountVal)],
          ["Remaining Balance", feeMoney(balanceVal)],
          ["Collected By", receipt?.issuedByName || "Accounts Desk"],
        ];
        printSingleRecord({
          title: `Fee Receipt - ${receiptNum}`,
          sections: [{ title: "Receipt Details", rows }],
        });
      } catch {
        window.print();
      }
    };

    return (
      <FeeDialog
        title={`Receipt Preview — ${receiptNum}`}
        close={onClose}
        wide
        footer={
          <>
            <button type="button" className="erp-btn erp-btn--secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="erp-btn erp-btn--primary" onClick={handlePrint}>
              <FiPrinter /> Print Receipt
            </button>
          </>
        }
      >
        <div className="fm-receipt-wrap">
          <div className="fm-receipt-card" id="fm-printable-receipt">
            <div className="fm-receipt-top">
              <div className="fm-receipt-college">
                <h2>{collegeName}</h2>
                <p>Fee Collection & Accounts Department · Official Receipt</p>
              </div>
              <div className="fm-receipt-badge-col">
                <span className="fm-receipt-badge">FEE RECEIPT</span>
                <div className="fm-receipt-no">#{receiptNum}</div>
                <div className="fm-receipt-date">Date: {dateStr}</div>
              </div>
            </div>

            <dl className="fm-receipt-meta-grid">
              <div className="fm-receipt-meta-item">
                <dt>Student Name</dt>
                <dd>{receipt?.studentName || student?.name || "—"}</dd>
              </div>
              <div className="fm-receipt-meta-item">
                <dt>Admission / Roll No</dt>
                <dd>{receipt?.studentCode || student?.roll || "—"}</dd>
              </div>
              <div className="fm-receipt-meta-item">
                <dt>Program / Course</dt>
                <dd>{receipt?.courseName || student?.courseName || "—"}</dd>
              </div>
              <div className="fm-receipt-meta-item">
                <dt>Branch & Batch</dt>
                <dd>{[receipt?.branchName || student?.branchName, student?.batch].filter(Boolean).join(" · ") || "—"}</dd>
              </div>
            </dl>

            <div className="fm-receipt-table-wrap">
              <table className="fm-receipt-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fee Category / Description</th>
                    <th>Payment Mode & Reference</th>
                    <th className="text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td>{receipt?.feeCategory || receipt?.planName || "Academic Tuition & Institutional Fee"}</td>
                    <td>
                      {receipt?.paymentMode || "CASH"}
                      {receipt?.transactionReference && receipt.transactionReference !== "Cash payment" ? ` · Ref: ${receipt.transactionReference}` : ""}
                    </td>
                    <td className="text-right">
                      <strong>{feeMoney(amountVal)}</strong>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3">Total Received</td>
                    <td className="text-right">{feeMoney(amountVal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="fm-receipt-words-box">
              <strong>Amount in Words:</strong>
              <span>{inrWords(amountVal)}</span>
            </div>

            <div className="fm-collect-calc-strip" style={{ marginBottom: 16 }}>
              <div className="fm-collect-calc-item">
                <span>Amount Paid</span>
                <strong style={{ color: "#059669" }}>{feeMoney(amountVal)}</strong>
              </div>
              <div className="fm-collect-calc-item">
                <span>Payment Mode</span>
                <strong>{receipt?.paymentMode || "CASH"}</strong>
              </div>
              <div className="fm-collect-calc-item">
                <span>Remaining Balance</span>
                <strong style={{ color: balanceVal > 0 ? "#b45309" : "#059669" }}>{feeMoney(balanceVal)}</strong>
              </div>
            </div>

            <div className="fm-receipt-footer-grid">
              <div className="fm-receipt-barcode-box">
                <div className="fm-receipt-barcode" aria-hidden="true" />
                <span className="fm-receipt-barcode-text">VERIFIED · {receiptNum}</span>
              </div>
              <div className="fm-receipt-signature">
                <div>Authorized Signatory / Cashier</div>
                <small style={{ color: "#64748b" }}>{receipt?.issuedByName || "Accounts Section"}</small>
              </div>
            </div>
          </div>
        </div>
      </FeeDialog>
    );
  }

  // ==========================================================================
  // CASHIER IN-ROW COLLECT PAYMENT MODAL
  // ==========================================================================
  function CollectPaymentModal({ student, academic, onClose, onSuccess }) {
    const [amount, setAmount] = useState(String(student.balance || ""));
    const [paymentMode, setPaymentMode] = useState("CASH");
    const [paymentDate, setPaymentDate] = useState(feeToday());
    const [reference, setReference] = useState("");
    const [remarks, setRemarks] = useState("");
    const [studentDues, setStudentDues] = useState([]);
    const [selectedDueId, setSelectedDueId] = useState(student.studentFeeId || "");
    const [loadingDues, setLoadingDues] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
      let active = true;
      if (student.id) {
        setLoadingDues(true);
        feeCollectionApi
          .allPending({ studentId: student.id })
          .then((dues) => {
            if (!active) return;
            const items = dues || [];
            setStudentDues(items);
            if (items.length > 0) {
              setSelectedDueId(items[0].studentFeeId);
              const defaultBal = Number(items[0].balanceAmount || student.balance || 0);
              setAmount(String(defaultBal > 0 ? defaultBal : student.balance));
            }
          })
          .catch(() => {})
          .finally(() => {
            if (active) setLoadingDues(false);
          });
      }
      return () => {
        active = false;
      };
    }, [student.id, student.balance]);

    const activeDue = studentDues.find((d) => d.studentFeeId === selectedDueId) || studentDues[0];
    const maxBalance = activeDue ? Number(activeDue.balanceAmount || student.balance || 0) : Number(student.balance || 0);
    const numAmount = Number(amount) || 0;
    const balanceAfter = Math.max(0, maxBalance - numAmount);

    const handleSubmit = async (e) => {
      e?.preventDefault();
      if (submitting) return;
      setError("");

      const targetFeeId = selectedDueId || activeDue?.studentFeeId || student.studentFeeId;
      if (!targetFeeId) {
        setError("No valid assigned fee installment found for this student. Please ensure fees are assigned before collecting payments.");
        return;
      }
      if (maxBalance <= 0) {
        setError("This student has no outstanding fee balance to collect.");
        return;
      }
      if (numAmount <= 0) {
        setError("Please enter a valid payment amount greater than zero.");
        return;
      }
      if (numAmount > maxBalance) {
        setError(`Payment amount cannot exceed the outstanding balance of ${feeMoney(maxBalance)}.`);
        return;
      }
      if (paymentMode !== "CASH" && !reference.trim()) {
        setError("Please enter transaction reference / cheque / UPI reference.");
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          studentFeeId: Number(targetFeeId),
          feeAmount: numAmount,
          fineAmount: 0,
          paymentMode,
          transactionReference: reference.trim() || "Cash payment",
          paymentDate: paymentDate || feeToday(),
          remarks: remarks.trim() || undefined,
        };
        const receipt = await feeCollectionApi.collect(payload);
        showSuccess(`Payment of ${feeMoney(numAmount)} recorded successfully!`);
        onSuccess(
          receipt || {
            receiptNumber: `REC-${student.roll || student.id}`,
            studentName: student.name,
            studentCode: student.roll,
            courseName: student.courseName,
            branchName: student.branchName,
            feeAmount: numAmount,
            totalAmount: numAmount,
            balanceAmount: balanceAfter,
            paymentMode,
            transactionReference: reference.trim() || "Cash payment",
            paymentDate,
            feeCategory: student.feeCategory || "Academic Fee",
          },
          student
        );
      } catch (err) {
        setError(err.message || "Failed to record payment. Please check network and try again.");
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <FeeDialog
        title={`Collect Payment — ${student.name}`}
        close={onClose}
        footer={
          <>
            <button type="button" className="erp-btn erp-btn--secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="button"
              className="erp-btn erp-btn--primary"
              onClick={handleSubmit}
              disabled={submitting || numAmount <= 0 || numAmount > maxBalance || maxBalance <= 0}
            >
              <FiCheck /> {submitting ? "Processing..." : `Collect ${numAmount > 0 ? feeMoney(numAmount) : "Payment"}`}
            </button>
          </>
        }
      >
        <div className="fm-collect-modal">
          {error && <div className="fm-error-banner" role="alert">{error}</div>}

          {/* Student Summary Strip */}
          <div className="fm-collect-student-summary">
            <div className="fm-collect-student-info">
              <h3>{student.name}</h3>
              <p>
                {student.roll} · {student.courseName || "Program"} ({student.branchName || "Branch"}) · {student.batch}
              </p>
            </div>
            <div className="fm-collect-student-kpis">
              <div className="fm-collect-student-kpi">
                <small>Total Fee</small>
                <strong>{feeMoney(student.totalFee)}</strong>
              </div>
              <div className="fm-collect-student-kpi">
                <small>Paid So Far</small>
                <strong style={{ color: "#059669" }}>{feeMoney(student.paid)}</strong>
              </div>
              <div className="fm-collect-student-kpi fm-highlight-balance">
                <small>Current Outstanding</small>
                <strong>{feeMoney(maxBalance)}</strong>
              </div>
            </div>
          </div>

          {/* Dues Breakdown Selector */}
          {studentDues.length > 1 && (
            <label className="fs-field">
              <span>Select Installment / Fee Item <b className="required-mark">*</b></span>
              <ProjectSelect
                value={selectedDueId}
                onChange={(e) => {
                  setSelectedDueId(e.target.value);
                  const selected = studentDues.find((d) => d.studentFeeId === e.target.value);
                  if (selected) setAmount(String(selected.balanceAmount || ""));
                }}
              >
                {studentDues.map((d) => (
                  <option key={d.studentFeeId} value={d.studentFeeId}>
                    {d.feePlanName || d.feeCategory || "Installment"} — Due: {feeMoney(d.balanceAmount)} (Due Date: {date(d.dueDate)})
                  </option>
                ))}
              </ProjectSelect>
            </label>
          )}

          {/* Payment Form Fields */}
          <div className="fm-collect-form-grid">
            <label className="fs-field">
              <span>
                Amount to Collect (₹) <b className="required-mark">*</b>
              </span>
              <input
                type="number"
                min="1"
                max={maxBalance}
                step="any"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={submitting}
                autoFocus
              />
              <div className="fm-quick-presets">
                <button
                  type="button"
                  className="fm-preset-btn"
                  onClick={() => setAmount(String(maxBalance))}
                  disabled={submitting}
                >
                  Pay Full ({feeMoney(maxBalance)})
                </button>
                {maxBalance > 1000 && (
                  <button
                    type="button"
                    className="fm-preset-btn"
                    onClick={() => setAmount(String(Math.round(maxBalance / 2)))}
                    disabled={submitting}
                  >
                    Pay Half ({feeMoney(Math.round(maxBalance / 2))})
                  </button>
                )}
              </div>
            </label>

            <label className="fs-field">
              <span>Payment Mode <b className="required-mark">*</b></span>
              <ProjectSelect value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} disabled={submitting}>
                <option value="CASH">Cash</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="CHEQUE">Cheque / Demand Draft</option>
              </ProjectSelect>
            </label>

            <label className="fs-field">
              <span>Payment Date <b className="required-mark">*</b></span>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                disabled={submitting}
              />
            </label>

            <label className="fs-field">
              <span>
                Transaction Ref / Cheque No {paymentMode !== "CASH" && <b className="required-mark">*</b>}
              </span>
              <input
                type="text"
                placeholder={paymentMode === "CASH" ? "Optional for cash" : "e.g. UTR / Txn ID / Cheque #"}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                disabled={submitting}
              />
            </label>

            <label className="fs-field full-span">
              <span>Remarks / Note</span>
              <input
                type="text"
                placeholder="Optional notes or receipt remark"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={submitting}
              />
            </label>
          </div>

          {/* Payment Calculation Strip */}
          <div className="fm-collect-calc-strip">
            <div className="fm-collect-calc-item">
              <span>Current Outstanding</span>
              <strong style={{ color: "#b45309" }}>{feeMoney(maxBalance)}</strong>
            </div>
            <div className="fm-collect-calc-item">
              <span>Amount Being Paid</span>
              <strong style={{ color: "#1d4ed8" }}>{feeMoney(numAmount)}</strong>
            </div>
            <div className="fm-collect-calc-item">
              <span>Balance After Payment</span>
              <strong style={{ color: balanceAfter > 0 ? "#b45309" : "#059669" }}>
                {feeMoney(balanceAfter)}
              </strong>
            </div>
          </div>
        </div>
      </FeeDialog>
    );
  }

  // ==========================================================================
  // STUDENT FEE DETAILS MODAL
  // ==========================================================================
  function StudentFeeDetailsModal({ student, academic, onClose, onCollect, onOpenReceipt }) {
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState({ dues: [], payments: [] });
    const [error, setError] = useState("");

    useEffect(() => {
      let active = true;
      setLoading(true);
      setError("");
      Promise.allSettled([
        feeCollectionApi.allPending({ studentId: student.id }),
        feeCollectionApi.allHistory({ studentId: student.id }),
      ])
        .then(([pRes, hRes]) => {
          if (!active) return;
          const dues = pRes.status === "fulfilled" ? pRes.value || [] : [];
          const payments = hRes.status === "fulfilled" ? hRes.value || [] : [];
          setDetails({ dues, payments });
        })
        .catch((err) => {
          if (active) setError(err.message || "Unable to load student history.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });

      return () => {
        active = false;
      };
    }, [student.id]);

    const dues = details.dues;
    const payments = details.payments.length > 0 ? details.payments : (student.paymentHistory || []);

    const categorySummary = useMemo(() => {
      const cats = {
        academic: { label: "Academic Fees", payable: 0, paid: 0, balance: 0, count: 0 },
        hostel: { label: "Hostel Fees", payable: 0, paid: 0, balance: 0, count: 0 },
        transport: { label: "Transport Fees", payable: 0, paid: 0, balance: 0, count: 0 },
      };
      if (dues && dues.length > 0) {
        dues.forEach((d) => {
          const catName = String(d.feeCategory || d.category || d.feePlanName || "").toLowerCase();
          let target = cats.academic;
          if (catName.includes("hostel")) target = cats.hostel;
          else if (catName.includes("transport")) target = cats.transport;
          target.payable += Number(d.payableAmount || 0);
          target.paid += Number(d.paidAmount || 0);
          target.balance += Number(d.balanceAmount || 0);
          target.count += 1;
        });
      } else {
        const cat = String(student.feeCategory || student.planName || "Academic").toLowerCase();
        let target = cats.academic;
        if (cat.includes("hostel")) target = cats.hostel;
        else if (cat.includes("transport")) target = cats.transport;
        target.payable = Number(student.totalFee || 0);
        target.paid = Number(student.paid || 0);
        target.balance = Number(student.balance || 0);
        target.count = 1;
      }
      return [cats.academic, cats.hostel, cats.transport];
    }, [dues, student]);

    return (
      <FeeDialog
        title={`Student Fee Profile — ${student.name}`}
        close={onClose}
        wide
        footer={
          <>
            <button type="button" className="erp-btn erp-btn--secondary" onClick={onClose}>
              Close
            </button>
            {student.balance > 0 && student.status !== "Fee Not Assigned" && (
              <button
                type="button"
                className="erp-btn erp-btn--primary"
                onClick={() => {
                  onClose();
                  onCollect(student);
                }}
              >
                <FiDollarSign /> Collect Payment
              </button>
            )}
          </>
        }
      >
        <div className="fm-student-detail-modal">
          {error && <div className="fm-error-banner" role="alert">{error}</div>}

          {/* Profile Card */}
          <div className="fm-student-detail-profile">
            <div className="fm-avatar">
              {String(student.name || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("")}
            </div>
            <div>
              <h3>{student.name}</h3>
              <p>
                Roll / ID: <strong>{student.roll}</strong> · Course: <strong>{student.courseName || "—"}</strong> · Branch: <strong>{student.branchName || "—"}</strong> · Batch: <strong>{student.batch || "—"}</strong>
              </p>
            </div>
          </div>

          {/* 4 KPIs */}
          <div className="fm-detail-kpis">
            <div className="fm-detail-kpi-box">
              <small>Total Demand</small>
              <strong style={{ color: "#1d4ed8" }}>{feeMoney(student.totalFee)}</strong>
            </div>
            <div className="fm-detail-kpi-box">
              <small>Discount / Concession</small>
              <strong style={{ color: "#475569" }}>{student.discount > 0 ? `-${feeMoney(student.discount)}` : "—"}</strong>
            </div>
            <div className="fm-detail-kpi-box">
              <small>Total Paid</small>
              <strong style={{ color: "#059669" }}>{feeMoney(student.paid)}</strong>
            </div>
            <div className="fm-detail-kpi-box">
              <small>Outstanding Balance</small>
              <strong style={{ color: student.balance > 0 ? "#b45309" : "#059669" }}>
                {feeMoney(student.balance)}
              </strong>
            </div>
          </div>

          {/* Category Breakdown Cards */}
          <div>
            <div className="fm-detail-section-title">
              <span>Category-Wise Distribution</span>
            </div>
            <div className="fm-detail-categories-grid">
              {categorySummary.map((cat) => (
                <div key={cat.label} className="fm-detail-category-card">
                  <div className="fm-detail-category-header">
                    <h4>{cat.label}</h4>
                    <span className="fm-count-chip">{cat.count > 0 ? `${cat.count} schedule${cat.count > 1 ? "s" : ""}` : "Not Enrolled"}</span>
                  </div>
                  <div className="fm-detail-category-body">
                    <div className="fm-detail-category-row">
                      <span>Payable</span>
                      <strong>{feeMoney(cat.payable)}</strong>
                    </div>
                    <div className="fm-detail-category-row">
                      <span>Paid</span>
                      <strong style={{ color: "#059669" }}>{feeMoney(cat.paid)}</strong>
                    </div>
                    <div className="fm-detail-category-row">
                      <span>Balance</span>
                      <strong style={{ color: cat.balance > 0 ? "#b45309" : "#059669" }}>
                        {feeMoney(cat.balance)}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dues Schedule */}
          <div>
            <div className="fm-detail-section-title">
              <span>Installment & Due Schedule</span>
              <span className="fm-count-chip">{dues.length || 1} records</span>
            </div>
            <div className="fm-table-wrap" style={{ maxHeight: 200, overflow: "auto" }}>
              <table className="fm-table">
                <thead>
                  <tr>
                    <th>Fee Item / Plan</th>
                    <th>Due Date</th>
                    <th className="text-right">Payable</th>
                    <th className="text-right">Paid</th>
                    <th className="text-right">Balance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dues.length > 0 ? (
                    dues.map((d, idx) => (
                      <tr key={d.studentFeeId || idx}>
                        <td><strong>{d.feePlanName || d.feeCategory || "Academic Fee"}</strong></td>
                        <td>{date(d.dueDate)}</td>
                        <td className="text-right">{feeMoney(d.payableAmount)}</td>
                        <td className="text-right">{feeMoney(d.paidAmount)}</td>
                        <td className="text-right">
                          <strong style={{ color: d.balanceAmount > 0 ? "#b45309" : "#059669" }}>
                            {feeMoney(d.balanceAmount)}
                          </strong>
                        </td>
                        <td>
                          <FeeBadge value={d.overdue ? "Overdue" : Number(d.balanceAmount) === 0 ? "Paid" : Number(d.paidAmount) > 0 ? "Partially Paid" : "Pending"} />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td><strong>{student.planName || "Academic Fee Plan"}</strong></td>
                      <td>{student.nextDue || "—"}</td>
                      <td className="text-right">{feeMoney(student.totalFee)}</td>
                      <td className="text-right">{feeMoney(student.paid)}</td>
                      <td className="text-right">
                        <strong style={{ color: student.balance > 0 ? "#b45309" : "#059669" }}>
                          {feeMoney(student.balance)}
                        </strong>
                      </td>
                      <td><FeeBadge value={student.status} /></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment & Receipt History */}
          <div>
            <div className="fm-detail-section-title">
              <span>Payment & Receipt History</span>
              <span className="fm-count-chip">{payments.length} transactions</span>
            </div>
            {payments.length > 0 ? (
              <div className="fm-table-wrap" style={{ maxHeight: 200, overflow: "auto" }}>
                <table className="fm-table">
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Date</th>
                      <th>Mode</th>
                      <th>Reference</th>
                      <th className="text-right">Amount Paid</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, idx) => (
                      <tr key={p.paymentId || p.receiptId || idx}>
                        <td><strong>{p.receiptNumber || `REC-${p.receiptId || idx + 1}`}</strong></td>
                        <td>{date(p.issuedAt || p.paymentDate)}</td>
                        <td>{p.paymentMode || "CASH"}</td>
                        <td>{p.transactionReference || "—"}</td>
                        <td className="text-right" style={{ color: "#059669", fontWeight: 700 }}>
                          {feeMoney(p.feeAmount || p.totalAmount)}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="erp-btn erp-btn--secondary erp-btn--sm"
                            onClick={() => onOpenReceipt(p, student)}
                          >
                            <FiPrinter /> Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="fm-breakdown-empty">No payments recorded yet for this student.</div>
            )}
          </div>
        </div>
      </FeeDialog>
    );
  }

  // ==========================================================================
  // STUDENT FEES MAIN DIRECTORY PAGE (`/fees/students`)
  // ==========================================================================
  function StudentFees({ academic, ledgers, assignments, masters, students = [], structures = [] }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [activeView, setActiveView] = useState(
      location.state?.tab === "transactions" ? "transactions" : "directory"
    );

    useEffect(() => {
      if (location.state?.tab === "transactions") {
        setActiveView("transactions");
      }
    }, [location.state?.tab]);

    const [query, setQuery] = useState("");
    const [academicYearId, setAcademicYearId] = useState(
      academic.selectedAcademicYearId || ""
    );
    const [courseId, setCourseId] = useState("");
    const [branchId, setBranchId] = useState("");
    const [semesterId, setSemesterId] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState(
      location.state?.status || "All"
    );

    const [serverRows, setServerRows] = useState([]);
    const [serverHistory, setServerHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Transaction Register State
    const [txQuery, setTxQuery] = useState("");
    const [txMode, setTxMode] = useState("");
    const [txFromDate, setTxFromDate] = useState("");
    const [txToDate, setTxToDate] = useState("");
    const [txPage, setTxPage] = useState(1);
    const [txData, setTxData] = useState({ items: [], total: 0, totalPages: 1 });
    const [txLoading, setTxLoading] = useState(false);
    const [txError, setTxError] = useState("");

    // Action Modals State
    const [collectModalStudent, setCollectModalStudent] = useState(null);
    const [receiptModalData, setReceiptModalData] = useState(null);
    const [detailsModalStudent, setDetailsModalStudent] = useState(null);

    const fetchRecords = () => {
      let active = true;
      setLoading(true);
      setError("");
      Promise.allSettled([
        feeCollectionApi.allPending({
          academicYearId,
          courseId,
          branchId,
          search: query,
        }),
        feeCollectionApi.allHistory({
          academicYearId,
          courseId,
          branchId,
          search: query,
        }),
      ])
        .then(([pendingRes, historyRes]) => {
          if (!active) return;
          if (pendingRes.status === "fulfilled") {
            setServerRows(pendingRes.value || []);
          } else if (historyRes.status !== "fulfilled") {
            setError(pendingRes.reason?.message || "Unable to load fee records. Please try again.");
          }
          if (historyRes.status === "fulfilled") {
            setServerHistory(historyRes.value || []);
          }
        })
        .catch((reason) => {
          if (active) setError(reason.message || "Unable to load fee records. Please try again.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    };

    useEffect(() => {
      return fetchRecords();
    }, [academicYearId, courseId, branchId, query, academic.selectedCollegeId]);

    // Unified student rows merging live server fee records, payment history, student profiles, and fee plans
    const studentRows = useMemo(() => {
      // 1. Group server fee pending items by studentId and studentCode
      const serverMap = new Map();
      const serverCodeMap = new Map();
      serverRows.forEach((r) => {
        const sid = String(r.studentId || "");
        if (sid) {
          if (!serverMap.has(sid)) serverMap.set(sid, []);
          serverMap.get(sid).push(r);
        }
        const code = String(r.studentCode || "").trim().toLowerCase();
        if (code) {
          if (!serverCodeMap.has(code)) serverCodeMap.set(code, []);
          serverCodeMap.get(code).push(r);
        }
      });

      // 2. Group confirmed server payments by studentId and studentCode
      const historyMap = new Map();
      const historyCodeMap = new Map();
      serverHistory.forEach((h) => {
        const sid = String(h.studentId || "");
        if (sid) {
          if (!historyMap.has(sid)) historyMap.set(sid, []);
          historyMap.get(sid).push(h);
        }
        const code = String(h.studentCode || "").trim().toLowerCase();
        if (code) {
          if (!historyCodeMap.has(code)) historyCodeMap.set(code, []);
          historyCodeMap.get(code).push(h);
        }
      });

      // 3. Map workspace assignment ledgers by student id
      const ledgerMap = new Map();
      (ledgers || []).forEach((a) => {
        const sid = String(a.student?.id || a.student?.studentId || "");
        if (sid) ledgerMap.set(sid, a);
      });

      const rows = [];
      const handledStudentIds = new Set();
      const handledCodes = new Set();

      const buildServerRow = (rList, baseStudent = null, studentHistory = []) => {
        const r = rList[0];
        const payable = rList.reduce((sum, item) => sum + Number(item.payableAmount || 0), 0);
        const serverPaid = rList.reduce((sum, item) => sum + Number(item.paidAmount || 0), 0);
        const histPaid = studentHistory.reduce((sum, item) => sum + Number(item.feeAmount || item.totalAmount || 0), 0);
        const paid = Math.max(serverPaid, histPaid);
        const balance = Math.max(0, rList.reduce((sum, item) => sum + Number(item.balanceAmount || 0), 0));
        const isOverdue = rList.some((item) =>
          Boolean(item.overdue || (item.dueDate && new Date(item.dueDate) < new Date() && Number(item.balanceAmount || 0) > 0))
        );
        const status = isOverdue
          ? "Overdue"
          : balance === 0 && payable > 0
          ? "Paid"
          : paid > 0
          ? "Partially Paid"
          : "Pending";
        const statusSlug = status.toLowerCase().replace(/\s+/g, "-");

        return {
          id: r.studentId || baseStudent?.id,
          studentFeeId: r.studentFeeId,
          planName: r.feePlanName || r.structureName || r.feeCategory || "Academic Fee",
          feeCategory: r.feeCategory || "Academic",
          name: baseStudent?.name || r.studentName,
          roll: baseStudent?.roll || r.studentCode,
          admissionNumber: baseStudent?.application || r.studentCode,
          application: baseStudent?.application || r.studentCode,
          courseId: String(baseStudent?.courseId || r.courseId || ""),
          courseName: baseStudent?.courseName || r.courseName,
          branchId: String(baseStudent?.branchId || r.branchId || ""),
          branchName: baseStudent?.branchName || r.branchName,
          semesterId: String(baseStudent?.semesterId || r.semesterId || ""),
          semesterName: baseStudent?.semesterName || r.semesterName,
          batch: baseStudent?.batch || r.batch || "—",
          totalFee: payable,
          discount: rList.reduce((sum, item) => sum + Number(item.concessionAmount || 0), 0),
          paid,
          balance,
          nextDue: date(r.dueDate),
          overdue: isOverdue,
          status,
          statusSlug,
          receiptId: r.receiptId || r.lastReceiptId || studentHistory[0]?.receiptId,
          paymentHistory: studentHistory,
        };
      };

      const buildSettledHistoryRow = (hList, baseStudent = null) => {
        const first = hList[0];
        const totalPaid = hList.reduce((sum, item) => sum + Number(item.feeAmount || item.totalAmount || 0), 0);
        return {
          id: first.studentId || baseStudent?.id,
          studentFeeId: first.studentFeeId || baseStudent?.studentFeeId || null,
          planName: first.feeCategory || "Academic Tuition Fee",
          feeCategory: first.feeCategory || "Academic",
          name: baseStudent?.name || first.studentName,
          roll: baseStudent?.roll || first.studentCode,
          admissionNumber: baseStudent?.application || first.studentCode,
          application: baseStudent?.application || first.studentCode,
          courseId: String(baseStudent?.courseId || first.courseId || ""),
          courseName: baseStudent?.courseName || first.courseName,
          branchId: String(baseStudent?.branchId || first.branchId || ""),
          branchName: baseStudent?.branchName || first.branchName,
          semesterId: String(baseStudent?.semesterId || first.semesterId || ""),
          semesterName: baseStudent?.semesterName || first.semesterName,
          batch: baseStudent?.batch || first.batch || "—",
          totalFee: totalPaid,
          discount: 0,
          paid: totalPaid,
          balance: 0,
          nextDue: "—",
          overdue: false,
          status: "Paid",
          statusSlug: "paid",
          receiptId: first.receiptId || first.paymentId,
          paymentHistory: hList,
        };
      };

      // 4. Process admitted students from institution profiles
      if (Array.isArray(students) && students.length > 0) {
        students.forEach((st) => {
          const sid = String(st.id || "");
          const code = String(st.code || st.roll || st.application || "").trim().toLowerCase();
          if (sid) handledStudentIds.add(sid);
          if (code) handledCodes.add(code);

          const studentHistory = (sid && historyMap.get(sid)) || (code && historyCodeMap.get(code)) || [];

          // Priority 1: Live server fee pending records
          const serverItems = (sid && serverMap.get(sid)) || (code && serverCodeMap.get(code)) || null;
          if (serverItems && serverItems.length > 0) {
            rows.push(buildServerRow(serverItems, st, studentHistory));
            return;
          }

          // Priority 2: Confirmed payments from history (Fully Paid settled student)
          if (studentHistory.length > 0) {
            rows.push(buildSettledHistoryRow(studentHistory, st));
            return;
          }

          // Priority 3: Workspace assignment ledger
          const ledgerItem = sid ? ledgerMap.get(sid) : null;
          if (ledgerItem) {
            const bal = rupees(ledgerItem.ledger.outstanding);
            const isOverdue = Boolean(ledgerItem.ledger.overdue);
            const total = rupees(ledgerItem.ledger.total);
            const paid = rupees(ledgerItem.ledger.paid);
            const status = isOverdue
              ? "Overdue"
              : bal === 0 && total > 0
              ? "Paid"
              : paid > 0
              ? "Partially Paid"
              : total > 0
              ? "Pending"
              : "Fee Not Assigned";
            const statusSlug = status.toLowerCase().replace(/\s+/g, "-");
            rows.push({
              id: st.id,
              assignmentId: ledgerItem.id,
              planName: ledgerItem.structure.name,
              feeCategory: ledgerItem.structure.category || "Academic",
              name: st.name,
              roll: st.roll || st.code,
              admissionNumber: st.application || st.roll || st.code,
              application: st.application || st.code,
              courseId: String(st.courseId || ledgerItem.structure.courseId || ""),
              courseName: st.courseName || ledgerItem.structure.courseName,
              branchId: String(st.branchId || ledgerItem.structure.branchId || ""),
              branchName: st.branchName || ledgerItem.structure.branchName,
              semesterId: String(st.semesterId || ""),
              semesterName: st.semesterName,
              batch: st.batch || ledgerItem.structure.batch,
              totalFee: total,
              discount: rupees(ledgerItem.ledger.concession),
              paid,
              balance: bal,
              nextDue: "—",
              overdue: isOverdue,
              status,
              statusSlug,
              receiptId: ledgerItem.ledger.payments?.[0]?.receiptId,
              paymentHistory: ledgerItem.ledger.payments || [],
            });
            return;
          }

          // Priority 4: Student profile embedded fees
          if (st.fees && (Number(st.fees.totalFee || 0) > 0 || st.fees.configured)) {
            const total = Number(st.fees.totalFee || 0);
            const paid = Number(st.fees.paidAmount || (st.fees.paymentStatus === "Paid" ? total : 0));
            const bal = Math.max(0, total - paid);
            const isOverdue = st.fees.paymentStatus === "Overdue";
            const status = total === 0
              ? "Fee Not Assigned"
              : isOverdue
              ? "Overdue"
              : bal === 0 && total > 0
              ? "Paid"
              : paid > 0
              ? "Partially Paid"
              : "Pending";
            const statusSlug = status.toLowerCase().replace(/\s+/g, "-");
            rows.push({
              id: st.id,
              planName: total === 0 ? "Fee Not Assigned" : (st.fees.planName || st.fees.structureName || "Academic Fee"),
              feeCategory: "Academic",
              name: st.name,
              roll: st.roll || st.code,
              admissionNumber: st.application || st.roll || st.code,
              application: st.application || st.code,
              courseId: String(st.courseId || ""),
              courseName: st.courseName,
              branchId: String(st.branchId || ""),
              branchName: st.branchName,
              semesterId: String(st.semesterId || ""),
              semesterName: st.semesterName,
              batch: st.batch,
              totalFee: total,
              discount: Number(st.fees.scholarshipAmount || 0),
              paid,
              balance: bal,
              nextDue: st.fees.dueDate ? date(st.fees.dueDate) : "—",
              overdue: isOverdue,
              status,
              statusSlug,
              receiptId: st.fees.receiptId,
              paymentHistory: [],
            });
            return;
          }

          // Priority 5: Unassigned student (Fee Not Assigned with zero liability)
          rows.push({
            id: st.id,
            planName: "Fee Not Assigned",
            feeCategory: "Academic",
            name: st.name,
            roll: st.roll || st.code,
            admissionNumber: st.application || st.roll || st.code,
            application: st.application || st.code,
            courseId: String(st.courseId || ""),
            courseName: st.courseName,
            branchId: String(st.branchId || ""),
            branchName: st.branchName,
            semesterId: String(st.semesterId || ""),
            semesterName: st.semesterName,
            batch: st.batch,
            totalFee: 0,
            discount: 0,
            paid: 0,
            balance: 0,
            nextDue: "—",
            overdue: false,
            status: "Fee Not Assigned",
            statusSlug: "unassigned",
            receiptId: null,
            paymentHistory: [],
          });
        });
      }

      // 5. Any serverRows that were not covered by students list
      serverMap.forEach((rList, sid) => {
        if (!handledStudentIds.has(sid)) {
          const first = rList[0];
          const code = String(first.studentCode || "").trim().toLowerCase();
          if (!code || !handledCodes.has(code)) {
            const studentHistory = historyMap.get(sid) || (code && historyCodeMap.get(code)) || [];
            rows.push(buildServerRow(rList, null, studentHistory));
            handledStudentIds.add(sid);
            if (code) handledCodes.add(code);
          }
        }
      });

      // 6. Any historyMap settled payments not yet covered
      historyMap.forEach((hList, sid) => {
        if (!handledStudentIds.has(sid)) {
          const first = hList[0];
          const code = String(first.studentCode || "").trim().toLowerCase();
          if (!code || !handledCodes.has(code)) {
            rows.push(buildSettledHistoryRow(hList));
            handledStudentIds.add(sid);
            if (code) handledCodes.add(code);
          }
        }
      });

      // 7. If both serverRows, history, and students were empty, fallback to workspace ledgers
      if (rows.length === 0 && Array.isArray(ledgers)) {
        ledgers.forEach((a) => {
          const bal = rupees(a.ledger.outstanding);
          const isOverdue = Boolean(a.ledger.overdue);
          const total = rupees(a.ledger.total);
          const paid = rupees(a.ledger.paid);
          const status = isOverdue
            ? "Overdue"
            : bal === 0 && total > 0
            ? "Paid"
            : paid > 0
            ? "Partially Paid"
            : total > 0
            ? "Pending"
            : "Fee Not Assigned";
          const statusSlug = status.toLowerCase().replace(/\s+/g, "-");
          rows.push({
            id: a.student.id,
            assignmentId: a.id,
            planName: a.structure.name,
            feeCategory: a.structure.category || "Academic",
            name: a.student.name,
            roll: a.student.roll || a.student.code,
            admissionNumber: a.student.application || a.student.code,
            application: a.student.application || a.student.code,
            courseId: String(a.student.courseId || a.structure.courseId || ""),
            courseName: a.structure.courseName || a.student.courseName,
            branchId: String(a.student.branchId || a.structure.branchId || ""),
            branchName: a.structure.branchName || a.student.branchName,
            semesterId: String(a.student.semesterId || ""),
            semesterName: a.student.semesterName,
            batch: a.structure.batch || a.student.batch,
            totalFee: total,
            discount: rupees(a.ledger.concession),
            paid,
            balance: bal,
            nextDue: "—",
            overdue: isOverdue,
            status,
            statusSlug,
            receiptId: a.ledger.payments?.[0]?.receiptId,
            paymentHistory: a.ledger.payments || [],
          });
        });
      }

      return rows;
    }, [serverRows, serverHistory, students, ledgers]);

    const filteredStudents = useMemo(() => {
      return studentRows.filter((st) => {
        const text = `${st.name} ${st.roll} ${st.application}`.toLowerCase();
        const matchesQuery = !query || text.includes(query.toLowerCase());
        const matchesCourse =
          !courseId ||
          String(st.courseId) === String(courseId) ||
          (st.courseName && masters.courses.find((c) => c.id === courseId)?.name === st.courseName);
        const matchesBranch =
          !branchId ||
          String(st.branchId) === String(branchId) ||
          (st.branchName && masters.branches.find((b) => b.id === branchId)?.name === st.branchName);
        const matchesSemester =
          !semesterId || String(st.semesterId) === String(semesterId);
        const matchesCategory =
          !categoryFilter ||
          categoryFilter === "All" ||
          (st.feeCategory && st.feeCategory.toLowerCase() === categoryFilter.toLowerCase()) ||
          (st.planName && st.planName.toLowerCase().includes(categoryFilter.toLowerCase()));
        const matchesStatus =
          !statusFilter || statusFilter === "All"
            ? true
            : st.status === statusFilter;
        return matchesQuery && matchesCourse && matchesBranch && matchesSemester && matchesCategory && matchesStatus;
      });
    }, [studentRows, query, courseId, branchId, semesterId, categoryFilter, statusFilter, masters]);

    // Financial Summary KPI metrics calculated from active filtered student records
    const summaryMetrics = useMemo(() => {
      const payable = filteredStudents.reduce((sum, s) => sum + (s.totalFee || 0), 0);
      const collected = filteredStudents.reduce((sum, s) => sum + (s.paid || 0), 0);
      const balance = filteredStudents.reduce((sum, s) => sum + (s.balance || 0), 0);
      const overdue = filteredStudents.reduce((sum, s) => sum + (s.overdue ? s.balance : 0), 0);
      return { payable, collected, balance, overdue };
    }, [filteredStudents]);

    // Open receipt modal for a student
    const handleOpenReceipt = async (st, specificReceipt = null) => {
      if (specificReceipt) {
        setReceiptModalData({ receipt: specificReceipt, student: st });
        return;
      }
      try {
        if (st.receiptId) {
          const res = await feeCollectionApi.receipt(st.receiptId);
          if (res) {
            setReceiptModalData({ receipt: res, student: st });
            return;
          }
        }
        const hist = await feeCollectionApi.allHistory({ studentId: st.id });
        if (hist && hist.length > 0) {
          setReceiptModalData({ receipt: hist[0], student: st });
          return;
        }
      } catch {}
      // Synthesize fallback receipt if offline/mock
      setReceiptModalData({
        receipt: {
          receiptNumber: `REC-${st.roll || st.id}`,
          studentName: st.name,
          studentCode: st.roll,
          courseName: st.courseName,
          branchName: st.branchName,
          feeAmount: st.paid,
          totalAmount: st.paid,
          balanceAmount: st.balance,
          paymentMode: "CASH",
          paymentDate: feeToday(),
          issuedAt: feeToday(),
          feeCategory: st.feeCategory || st.planName || "Academic Fee",
        },
        student: st,
      });
    };

    const fetchTransactions = () => {
      let active = true;
      setTxLoading(true);
      setTxError("");
      feeCollectionApi
        .history({
          page: txPage,
          pageSize: 10,
          search: txQuery,
          paymentMode: txMode,
          fromDate: txFromDate,
          toDate: txToDate,
        })
        .then((res) => {
          if (active) setTxData(res || { items: [], total: 0, totalPages: 1 });
        })
        .catch((reason) => {
          if (active) setTxError(reason.message || "Unable to load transaction register.");
        })
        .finally(() => {
          if (active) setTxLoading(false);
        });
      return () => {
        active = false;
      };
    };

    useEffect(() => {
      if (activeView === "transactions") {
        return fetchTransactions();
      }
    }, [activeView, txPage, txQuery, txMode, txFromDate, txToDate, academic.selectedCollegeId]);

    const handleOpenTxReceipt = async (tx) => {
      try {
        if (tx.receiptId) {
          const full = await feeCollectionApi.receipt(tx.receiptId);
          if (full) {
            setReceiptModalData({
              receipt: full,
              student: { name: tx.studentName, roll: tx.studentCode, ...tx },
            });
            return;
          }
        }
      } catch {}
      setReceiptModalData({
        receipt: tx,
        student: {
          name: tx.studentName,
          roll: tx.studentCode,
          courseName: tx.courseName,
          branchName: tx.branchName,
        },
      });
    };

    const handlePaymentSuccess = (receipt, student) => {
      setCollectModalStudent(null);
      fetchRecords();
      if (activeView === "transactions") fetchTransactions();
      setReceiptModalData({ receipt, student });
    };

    const paymentModes = [
      { id: "", name: "All Payment Modes" },
      { id: "CASH", name: "Cash" },
      { id: "UPI", name: "UPI" },
      { id: "NET_BANKING", name: "Net Banking" },
      { id: "CARD", name: "Debit / Credit Card" },
      { id: "CHEQUE", name: "Cheque" },
      { id: "DEMAND_DRAFT", name: "Demand Draft" },
    ];

    return (
      <div className="fm-page-container">
        {/* Page Header */}
        <FeePageHeading
          title="Student Fees"
          description="Manage student fee balances, collections, and receipts."
          icon={FiUsers}
        >
          <div className="fm-header-year-select">
            <ProjectSelect
              aria-label="Filter by Academic Year"
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
            >
              <option value="">All Academic Years</option>
              {masters.years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </ProjectSelect>
          </div>
          <button
            type="button"
            className="erp-btn erp-btn--secondary"
            onClick={() => {
              if (activeView === "directory") fetchRecords();
              else fetchTransactions();
            }}
            disabled={activeView === "directory" ? loading : txLoading}
            title="Refresh fee records"
          >
            <FiRefreshCw className={(activeView === "directory" ? loading : txLoading) ? "fm-spin" : ""} /> Refresh
          </button>
        </FeePageHeading>

        {/* Workspace View Switcher */}
        <div className="fm-workspace-header-row">
          <div className="fm-workspace-tabs" role="tablist" aria-label="Student Fees Workspace Views">
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "directory"}
              className={`fm-workspace-tab ${activeView === "directory" ? "is-active" : ""}`}
              onClick={() => setActiveView("directory")}
            >
              <FiUsers /> Student Fee Directory
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === "transactions"}
              className={`fm-workspace-tab ${activeView === "transactions" ? "is-active" : ""}`}
              onClick={() => setActiveView("transactions")}
            >
              <FiCreditCard /> Transaction Register
            </button>
          </div>
          <span className="fm-count-chip">
            {activeView === "directory"
              ? `${filteredStudents.length} Students`
              : `${txData.total || txData.items?.length || 0} Transactions`}
          </span>
        </div>

        {/* DIRECTORY VIEW: SUMMARY CARDS + STUDENT TABLE */}
        {activeView === "directory" && (
          <>
            {/* 4 Colorful Financial Summary Cards */}
            <div className="fm-summary-cards-grid">
              {/* 1. Total Payable - Royal Blue */}
              <div className="fm-summary-card fm-summary-card--blue">
                <div className="fm-summary-card__header">
                  <span className="fm-summary-card__label">Total Payable</span>
                  <span className="fm-summary-card__icon-box">
                    <FiLayers />
                  </span>
                </div>
                <strong className="fm-summary-card__value">
                  {feeMoney(summaryMetrics.payable)}
                </strong>
                <span className="fm-summary-card__meta">Total student fee demand</span>
              </div>

              {/* 2. Total Collected - Emerald Green */}
              <div className="fm-summary-card fm-summary-card--green">
                <div className="fm-summary-card__header">
                  <span className="fm-summary-card__label">Total Collected</span>
                  <span className="fm-summary-card__icon-box">
                    <FiCheckCircle />
                  </span>
                </div>
                <strong className="fm-summary-card__value">
                  {feeMoney(summaryMetrics.collected)}
                </strong>
                <span className="fm-summary-card__meta">Total payments received</span>
              </div>

              {/* 3. Outstanding Balance - Amber */}
              <div className="fm-summary-card fm-summary-card--amber">
                <div className="fm-summary-card__header">
                  <span className="fm-summary-card__label">Outstanding Balance</span>
                  <span className="fm-summary-card__icon-box">
                    <FiClock />
                  </span>
                </div>
                <strong className="fm-summary-card__value">
                  {feeMoney(summaryMetrics.balance)}
                </strong>
                <span className="fm-summary-card__meta">Remaining student fee balance</span>
              </div>

              {/* 4. Overdue Amount - Soft Red */}
              <div className="fm-summary-card fm-summary-card--red">
                <div className="fm-summary-card__header">
                  <span className="fm-summary-card__label">Overdue Amount</span>
                  <span className="fm-summary-card__icon-box">
                    <FiAlertCircle />
                  </span>
                </div>
                <strong className="fm-summary-card__value">
                  {feeMoney(summaryMetrics.overdue)}
                </strong>
                <span className="fm-summary-card__meta">Total overdue amount</span>
              </div>
            </div>

            {/* Main Content Workspace */}
            <div className="fm-workspace">
              <div className="fm-workspace-heading">
                <div>
                  <h2>Student Fee Register</h2>
                  <p>Search students, inspect individual dues, collect payments, and print receipts.</p>
                </div>
                <span className="fm-count-chip">{filteredStudents.length} Students</span>
              </div>

              {/* Clean Horizontal Filter Toolbar */}
              <FilterPanel
                active={Boolean(
                  query ||
                    courseId ||
                    branchId ||
                    semesterId ||
                    (categoryFilter && categoryFilter !== "All") ||
                    (statusFilter && statusFilter !== "All")
                )}
                onClear={() => {
                  setQuery("");
                  setCourseId("");
                  setBranchId("");
                  setSemesterId("");
                  setCategoryFilter("All");
                  setStatusFilter("All");
                }}
              >
                <div className="course-toolbar">
                  <label className="course-search">
                    <FiSearch />
                    <input
                      type="text"
                      placeholder="Search student name, roll or admission no..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label="Search student fees"
                    />
                  </label>

                  <ProjectSelect
                    aria-label="Filter by Course"
                    value={courseId}
                    onChange={(e) => {
                      setCourseId(e.target.value);
                      setBranchId("");
                      setSemesterId("");
                    }}
                  >
                    <option value="">All Courses</option>
                    {masters.courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </ProjectSelect>

                  <ProjectSelect
                    aria-label="Filter by Branch"
                    value={branchId}
                    onChange={(e) => {
                      setBranchId(e.target.value);
                      setSemesterId("");
                    }}
                  >
                    <option value="">All Branches</option>
                    {masters.branches
                      .filter((b) => !courseId || String(b.courseId) === String(courseId))
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                  </ProjectSelect>

                  <ProjectSelect
                    aria-label="Filter by Semester"
                    value={semesterId}
                    onChange={(e) => setSemesterId(e.target.value)}
                  >
                    <option value="">All Semesters</option>
                    {masters.semesters
                      .filter(
                        (s) =>
                          (!courseId || String(s.courseId) === String(courseId)) &&
                          (!branchId || String(s.branchId) === String(branchId))
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </ProjectSelect>

                  <ProjectSelect
                    aria-label="Filter by Fee Category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="All">All Categories</option>
                    <option value="Academic">Academic</option>
                    <option value="Hostel">Hostel</option>
                    <option value="Transport">Transport</option>
                  </ProjectSelect>

                  <ProjectSelect
                    aria-label="Filter by Payment Status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Paid">Paid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Fee Not Assigned">Fee Not Assigned</option>
                  </ProjectSelect>
                </div>
              </FilterPanel>

              {/* Student Fees Table */}
              <FeeTable
                wrapClassName="fm-student-accounts-table"
                loading={loading}
                error={error}
                rows={filteredStudents}
                rowKey={(st) => st.studentFeeId || st.assignmentId || st.id}
                pageSize={10}
                columns={[
                  {
                    label: "Student Name",
                    render: (st) => (
                      <FeeIdentity
                        name={st.name}
                        detail=""
                      />
                    ),
                  },
                  {
                    label: "Admission No.",
                    render: (st) => (
                      <span style={{ fontWeight: 600, color: "var(--text-secondary, #334155)" }}>
                        {st.roll || st.admissionNumber || st.application || "—"}
                      </span>
                    ),
                  },
                  {
                    label: "Course / Branch",
                    render: (st) => (
                      <div>
                        <span style={{ fontWeight: 600 }}>{st.courseName || "—"}</span>
                        <small className="fm-cell-sub">
                          {[st.branchName, st.semesterName || st.batch].filter(Boolean).join(" · ")}
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
                    label: "Paid Amount",
                    align: "right",
                    render: (st) => (
                      <span style={{ color: "#059669", fontWeight: 700 }}>
                        {feeMoney(st.paid)}
                      </span>
                    ),
                  },
                  {
                    label: "Pending Balance",
                    align: "right",
                    render: (st) => (
                      <strong
                        style={{
                          color: st.balance > 0 ? "#b45309" : "#059669",
                          fontWeight: 800,
                        }}
                      >
                        {feeMoney(st.balance)}
                      </strong>
                    ),
                  },
                  {
                    label: "Fee Status",
                    render: (st) => (
                      <span className={`fm-badge fm-badge--${st.statusSlug}`}>
                        {st.status}
                      </span>
                    ),
                  },
                  {
                    label: "Actions",
                    align: "right",
                    render: (st) => (
                      <div className="fm-account-actions">
                        <TableActionButton
                          type="view"
                          title="View Details"
                          ariaLabel={`View fee details for ${st.name}`}
                          onClick={() => setDetailsModalStudent(st)}
                        />
                        {st.balance > 0 && st.status !== "Fee Not Assigned" ? (
                          <TableActionButton
                            type="collect"
                            icon={FiDollarSign}
                            title="Collect Payment"
                            ariaLabel={`Collect payment for ${st.name}`}
                            onClick={() => setCollectModalStudent(st)}
                          />
                         ) : null}
                        {st.paid > 0 ? (
                          <TableActionButton
                            type="receipt"
                            icon={FiPrinter}
                            title="Print Receipt"
                            ariaLabel={`Print receipt for ${st.name}`}
                            onClick={() => handleOpenReceipt(st)}
                          />
                         ) : null}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </>
        )}

        {/* TRANSACTIONS VIEW: AUDIT REGISTER + FILTERS + RECEIPT ACTIONS */}
        {activeView === "transactions" && (
          <div className="fm-workspace">
            <div className="fm-workspace-heading">
              <div>
                <h2>Payment Transaction Register</h2>
                <p>Audit trail of all recorded student fee payments, receipts, and payment channels.</p>
              </div>
              <span className="fm-count-chip">{txData.total || txData.items?.length || 0} Records</span>
            </div>

            {/* Filter Toolbar for Transactions */}
            <FilterPanel
              active={Boolean(txQuery || txMode || txFromDate || txToDate)}
              onClear={() => {
                setTxQuery("");
                setTxMode("");
                setTxFromDate("");
                setTxToDate("");
                setTxPage(1);
              }}
            >
              <div className="course-toolbar">
                <label className="course-search">
                  <FiSearch />
                  <input
                    type="text"
                    placeholder="Search receipt #, student name, roll no, transaction ref..."
                    value={txQuery}
                    onChange={(e) => {
                      setTxQuery(e.target.value);
                      setTxPage(1);
                    }}
                    aria-label="Search payment transactions"
                  />
                </label>

                <ProjectSelect
                  aria-label="Filter by Payment Mode"
                  value={txMode}
                  onChange={(e) => {
                    setTxMode(e.target.value);
                    setTxPage(1);
                  }}
                >
                  {paymentModes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </ProjectSelect>

                <input
                  type="date"
                  aria-label="From Date"
                  value={txFromDate}
                  onChange={(e) => {
                    setTxFromDate(e.target.value);
                    setTxPage(1);
                  }}
                  title="From Date"
                />

                <input
                  type="date"
                  aria-label="To Date"
                  value={txToDate}
                  onChange={(e) => {
                    setTxToDate(e.target.value);
                    setTxPage(1);
                  }}
                  title="To Date"
                />
              </div>
            </FilterPanel>

            {/* Transactions Table */}
            <FeeTable
              loading={txLoading}
              error={txError}
              rows={txData?.items || []}
              rowKey={(r) => r.paymentId || r.receiptId || r.receiptNumber}
              pageSize={10}
              columns={[
                {
                  label: "Receipt #",
                  render: (r) => (
                    <button
                      type="button"
                      className="fm-text-link"
                      onClick={() => handleOpenTxReceipt(r)}
                    >
                      {r.receiptNumber || `REC-${r.receiptId || r.paymentId}`}
                    </button>
                  ),
                },
                {
                  label: "Date",
                  render: (r) => date(r.paymentDate || r.issuedAt),
                },
                {
                  label: "Student",
                  render: (r) => (
                    <FeeIdentity name={r.studentName} detail={r.studentCode} />
                  ),
                },
                {
                  label: "Payment Method",
                  render: (r) => <FeePaymentMethod value={r.paymentMode} />,
                },
                {
                  label: "Transaction Ref",
                  render: (r) => r.transactionReference || "—",
                },
                {
                  label: "Amount",
                  align: "right",
                  render: (r) => (
                    <strong style={{ color: "#059669", fontWeight: 700 }}>
                      {feeMoney(r.totalAmount || r.feeAmount)}
                    </strong>
                  ),
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
                      onClick={() => handleOpenTxReceipt(r)}
                      title="View and print official receipt"
                    >
                      <FiPrinter /> Receipt
                    </button>
                  ),
                },
              ]}
            />

            {txData?.totalPages > 1 && (
              <TablePagination
                currentPage={txPage}
                totalPages={txData.totalPages}
                onPageChange={setTxPage}
              />
            )}
          </div>
        )}

        {/* Collect Payment Modal */}
        {collectModalStudent && (
          <CollectPaymentModal
            student={collectModalStudent}
            academic={academic}
            onClose={() => setCollectModalStudent(null)}
            onSuccess={handlePaymentSuccess}
          />
        )}

        {/* Receipt Preview & Print Modal */}
        {receiptModalData && (
          <StudentReceiptModal
            receipt={receiptModalData.receipt}
            student={receiptModalData.student}
            academic={academic}
            onClose={() => setReceiptModalData(null)}
          />
        )}

        {/* Student Fee Details Modal */}
        {detailsModalStudent && (
          <StudentFeeDetailsModal
            student={detailsModalStudent}
            academic={academic}
            onClose={() => setDetailsModalStudent(null)}
            onCollect={(st) => setCollectModalStudent(st)}
            onOpenReceipt={(rec, st) => setReceiptModalData({ receipt: rec, student: st })}
          />
        )}
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
              to="/fees/students"
              state={{ studentSearch: s?.code || s?.studentCode }}
              className="erp-btn erp-btn--primary"
            >
              <FiPlus /> Collect Payment
            </Link>
          </div>
        </header>

        <FeeRequestState loading={loading} error={error}>
        <div className="fm-kpis-grid">
          <FeeMetric label="Total Fee" value={feeMoney(totalFee)} icon={external3.FiLayers} />
          <FeeMetric label="Discount" value={feeMoney(discount)} tone="lavender" icon={external3.FiTag} />
          <FeeMetric label="Paid" value={feeMoney(paid)} tone="green" icon={external3.FiCheckCircle} />
          <FeeMetric label="Balance" value={feeMoney(balance)} tone="amber" icon={external3.FiClock} />
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
    const location = useLocation();
    const targetStudentId = location.state?.feeStudentId;
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
        return matchesPlan && matchesSearch && (!targetStudentId || String(s.id) === String(targetStudentId) || String(s.studentId) === String(targetStudentId));
      });
    }, [plan, students, searchStudent, targetStudentId]);

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
            <FeeSectionHeading number="01" title="Select Fee Plan" description="Choose the fee plan to assign." />

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
                  const selectedPlan = publishedPlans.find(p => String(p.id) === String(id));
                  setSelectedStudents(targetStudentId && selectedPlan ? students.filter(s => (String(s.id) === String(targetStudentId) || String(s.studentId) === String(targetStudentId)) && studentMatchesFee(s, selectedPlan)).map(s => s.id) : []);
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
      years: activeFeeYearOptions(academic.academicYears || []),
      courses: (academic.courses || []).map((c) => ({
        ...c,
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
              element={<Navigate to="/fees/structures" replace />}
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
                    commit(saveAcademicPlanWithHeads(state, form, status));
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
                    commit(saveAcademicPlanWithHeads(state, form, status));
                    navigate("/fees/structures");
                  }}
                />
              }
            />
            <Route path="structures/:structureId/view" element={<FeeStructureConfiguration viewPlan workflow={{ rows: state.structures, assignments: state.assignments }} />} />
            {["hostel", "transport"].map((type) => (
              <Route key={type} path={`structures/${type}`}><Route path=":facilityId/view" element={<FeeStructureConfiguration facilityType={type} viewPlan />} />
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
                  students={students}
                  structures={state.structures}
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
              element={<Navigate to="/fees/students" replace state={{ tab: "transactions" }} />}
            />
            <Route
              path="collection"
              element={<Navigate to="/fees/students" replace />}
            />
            <Route path="refunds" element={<Refunds />} />

            {/* 5. REPORTS */}
            <Route
              path="reports"
              element={<Navigate to="/fees/overview" replace />}
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

export default FeeManagement;

function structureDraftAssigned(state, id) {
  return state.assignments.some(a => a.structureId === id || a.structure?.id === id)
}
function structureDraftDeleteBlocked(state, id) {
  const s = state.structures.find(s => s.id === id)
  if (!s) return 'Fee structure not found.'
  if (s.status !== 'Draft') return 'Only drafts can be deleted.'
  if (structureDraftAssigned(state, id)) return 'Drafts with student assignments cannot be deleted.'
  if (state.structures.some(s => s.parentId === id)) return 'Drafts referenced by revisions cannot be deleted.'
  return ''
}
function deleteStructureDraft(state, id) {
  const reason = structureDraftDeleteBlocked(state, id)
  if (reason) throw new Error(reason)
  return { ...state, structures: state.structures.filter(s => s.id !== id) }
}
function StructureRowActions() {}

