import DirectoryEmptyStateImports_default from '../../components/DirectoryEmptyState'
import { facultyForCollege } from '../../utils/departmentFaculty.js'
import { newestFirst as newestFirstImports_newestFirst, rememberCreated as newestFirstImports_rememberCreated } from '../../utils/newestFirst'
import { showWarning as toastImports_showWarning, showSuccess as toastImports_showSuccess, showError as toastImports_showError } from '../../utils/toast'
import useToastStateImports_default from '../../hooks/useToastState'
import { useEffect as reactImports_useEffect, useMemo as reactImports_useMemo, useState as reactImports_useState, useRef as reactImports_useRef, Fragment as reactImports_Fragment, useCallback as reactImports_useCallback } from 'react'
import ExportMenuImports_default, { PrintDetailsButton as ExportMenuImports_PrintDetailsButton } from '../../components/ExportMenu'
import { yearColumns as exportColumnsImports_yearColumns, collegeColumns as exportColumnsImports_collegeColumns, collegeSettingsColumns as exportColumnsImports_collegeSettingsColumns, departmentColumns as exportColumnsImports_departmentColumns } from '../../utils/exportColumns'
import DashboardLayoutImports_default from '../../layouts/DashboardLayout'
import PageHeaderImports_default from '../../components/PageHeader'
import StatusBadgeImports_default from '../../components/StatusBadge'
import FilterPanelImports_default from '../../components/FilterPanel'
import TablePaginationImports_default, { PAGE_SIZE as TablePaginationImports_PAGE_SIZE } from '../../components/TablePagination'
import StatusConfirmDialogImports_default from '../../components/StatusConfirmDialog'
import InfoCardImports_default from '../../components/InfoCard'
import { academicYearApi as apiEndpointsImports_academicYearApi, studentApi as apiEndpointsImports_studentApi, facultyApi as apiEndpointsImports_facultyApi, courseApi as apiEndpointsImports_courseApi, roleApi as apiEndpointsImports_roleApi, sectionApi as apiEndpointsImports_sectionApi, sectionAssignmentApi as apiEndpointsImports_sectionAssignmentApi } from '../../api/apiEndpoints'
import eventBusImports_default, { ERP_EVENTS as eventBusImports_ERP_EVENTS } from '../../services/eventBus'
import { showDeactivationBlocked as DeactivationBlockedDialogImports_showDeactivationBlocked } from '../../components/DeactivationBlockedDialog'
import { FiEye as fiImports_FiEye, FiEdit2 as fiImports_FiEdit2, FiToggleLeft as fiImports_FiToggleLeft, FiToggleRight as fiImports_FiToggleRight, FiPlus as fiImports_FiPlus, FiCalendar as fiImports_FiCalendar, FiClock as fiImports_FiClock, FiSearch as fiImports_FiSearch, FiX as fiImports_FiX, FiCheck as fiImports_FiCheck, FiArrowLeft as fiImports_FiArrowLeft, FiAlertCircle as fiImports_FiAlertCircle, FiHome as fiImports_FiHome, FiFilter as fiImports_FiFilter, FiTrash2 as fiImports_FiTrash2, FiUserPlus as fiImports_FiUserPlus, FiLayers as fiImports_FiLayers, FiBookOpen as fiImports_FiBookOpen, FiUser as fiImports_FiUser, FiUserCheck as fiImports_FiUserCheck, FiShield as fiImports_FiShield, FiAward as fiImports_FiAward, FiUsers as fiImports_FiUsers, FiKey as fiImports_FiKey, FiSliders as fiImports_FiSliders, FiChevronLeft as fiImports_FiChevronLeft, FiChevronRight as fiImports_FiChevronRight, FiInfo as fiImports_FiInfo, FiRotateCcw as fiImports_FiRotateCcw, FiGrid as fiImports_FiGrid, FiCheckCircle as fiImports_FiCheckCircle, FiBookmark as fiImports_FiBookmark, FiLink as fiImports_FiLink, FiUnlock as fiImports_FiUnlock, FiCpu as fiImports_FiCpu, FiMonitor as fiImports_FiMonitor, FiMapPin as fiImports_FiMapPin, FiAlertTriangle as fiImports_FiAlertTriangle, FiSlash as fiImports_FiSlash } from 'react-icons/fi'
import SearchableSelectImports_default, { ProjectSelect as SearchableSelectImports_ProjectSelect } from '../../components/SearchableSelect'
import { GENERIC_ERROR_MESSAGE as userErrorImports_GENERIC_ERROR_MESSAGE } from '../../utils/userError.js'
import { collegeLogoValue as collegeLogoImports_collegeLogoValue } from '../../utils/collegeLogo'
import { useNavigate as react_router_domImports_useNavigate, useSearchParams as react_router_domImports_useSearchParams, useParams as react_router_domImports_useParams } from 'react-router-dom'
import { cacheCollegeLogo as collegeApiImports_cacheCollegeLogo, cacheCollegeDates as collegeApiImports_cacheCollegeDates, createCollege as collegeApiImports_createCollege, fetchCollegeLogo as collegeApiImports_fetchCollegeLogo, getCollegeById as collegeApiImports_getCollegeById, getCollegeLogoUrl as collegeApiImports_getCollegeLogoUrl, getColleges as collegeApiImports_getColleges, isBackendCollegeLogo as collegeApiImports_isBackendCollegeLogo, isValidWebsite as collegeApiImports_isValidWebsite, normalizeWebsite as collegeApiImports_normalizeWebsite, readCachedCollegeLogo as collegeApiImports_readCachedCollegeLogo, readCachedCollegeDates as collegeApiImports_readCachedCollegeDates, readCollegeExtendedDetails as collegeApiImports_readCollegeExtendedDetails, unwrapCollegeRecord as collegeApiImports_unwrapCollegeRecord, updateCollege as collegeApiImports_updateCollege, uploadCollegeLogo as collegeApiImports_uploadCollegeLogo, WEBSITE_VALIDATION_MESSAGE as collegeApiImports_WEBSITE_VALIDATION_MESSAGE, createCollegeSettings as collegeApiImports_createCollegeSettings, getCollegeLogoEndpoint as collegeApiImports_getCollegeLogoEndpoint, getCollegeDeactivationImpact as collegeApiImports_getCollegeDeactivationImpact, getCollegeSettings as collegeApiImports_getCollegeSettings, searchColleges as collegeApiImports_searchColleges, updateCollegeSettings as collegeApiImports_updateCollegeSettings, updateCollegeStatus as collegeApiImports_updateCollegeStatus, createDepartment as collegeApiImports_createDepartment, getDepartmentById as collegeApiImports_getDepartmentById, getDepartments as collegeApiImports_getDepartments, searchDepartments as collegeApiImports_searchDepartments, updateDepartment as collegeApiImports_updateDepartment, updateDepartmentStatus as collegeApiImports_updateDepartmentStatus } from '../../auth/collegeApi'
import { normalizeCollegeImpact as collegeImpactImports_normalizeCollegeImpact, countCollegeFaculty as collegeImpactImports_countCollegeFaculty } from '../../utils/collegeImpact'
import CompactSummaryImports_default from '../../components/CompactSummary'
import facultyServiceImports_default, { normalizeFaculty as facultyServiceImports_normalizeFaculty } from '../../services/facultyService'
import { useAcademic as AcademicContextImports_useAcademic } from '../../context/AcademicContext'
import useCollegeStateImports_default from '../../hooks/useCollegeState'
import { collegeStorageKey as collegeScopeImports_collegeStorageKey } from '../../utils/collegeScope.js'
import academicServiceImports_default from '../../services/academicService'
import EmptyStateImports_default from '../../components/EmptyState'
import roomServiceImports_default, { ROOM_TYPES as roomServiceImports_ROOM_TYPES, BUILDING_BLOCKS as roomServiceImports_BUILDING_BLOCKS, FLOORS as roomServiceImports_FLOORS, ROOM_FACILITIES as roomServiceImports_ROOM_FACILITIES } from '../../services/roomService'
import '../../styles/directory-search.css'
import './AdminManagement.css'
import { selectedCollegeId as readSelectedCollegeId, createCollegeScope } from '../../utils/collegeScope.js'

// AcademicYearManagement screen and private helpers.
const AcademicYearManagementScreen = (() => {
const DirectoryEmptyState = DirectoryEmptyStateImports_default
const newestFirst = newestFirstImports_newestFirst
const rememberCreated = newestFirstImports_rememberCreated
const showWarning = toastImports_showWarning
const useToastState = useToastStateImports_default
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useState = reactImports_useState
const PrintDetailsButton = ExportMenuImports_PrintDetailsButton
const ExportMenu = ExportMenuImports_default
const yearColumns = exportColumnsImports_yearColumns
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const StatusBadge = StatusBadgeImports_default
const FilterPanel = FilterPanelImports_default
const PAGE_SIZE = TablePaginationImports_PAGE_SIZE
const TablePagination = TablePaginationImports_default
const StatusConfirmDialog = StatusConfirmDialogImports_default
const InfoCard = InfoCardImports_default
const academicYearApi = apiEndpointsImports_academicYearApi
const studentApi = apiEndpointsImports_studentApi
const ERP_EVENTS = eventBusImports_ERP_EVENTS
const eventBus = eventBusImports_default
const showDeactivationBlocked = DeactivationBlockedDialogImports_showDeactivationBlocked
const FiEye = fiImports_FiEye
const FiEdit2 = fiImports_FiEdit2
const FiToggleLeft = fiImports_FiToggleLeft
const FiToggleRight = fiImports_FiToggleRight
const FiPlus = fiImports_FiPlus
const FiCalendar = fiImports_FiCalendar
const FiClock = fiImports_FiClock
const FiSearch = fiImports_FiSearch
const FiX = fiImports_FiX

const DAY = 864e5;
const states = ['UPCOMING', 'ACTIVE', 'ARCHIVED'];
const blank = { name: '', startDate: '', endDate: '', autoActivate: false };

const normalizeDate = (val) => {
  if (!val) return '';
  const str = String(val).trim();
  const ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const dmy = str.match(/^(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return str.slice(0, 10);
};

const d = (x) => {
  const norm = normalizeDate(x);
  if (!norm) return new Date(NaN);
  let z = new Date(`${norm}T00:00:00`);
  z.setHours(0, 0, 0, 0);
  return z;
};
const now = () => {
  let z = new Date();
  z.setHours(0, 0, 0, 0);
  return z;
};
const isPresentYear = (x) => {
  if (!x?.startDate || !x?.endDate) return false;
  const start = d(x.startDate);
  const end = d(x.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  return now() >= start && now() <= end;
};
const isPastYear = (x) => {
  if (!x?.endDate) return false;
  const end = d(x.endDate);
  if (isNaN(end.getTime())) return false;
  return now() > end;
};
const formatDate = (x) => {
  if (!x) return '-';
  const parsed = d(x);
  return isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const days = (x) => Math.ceil((d(x) - now()) / DAY);
const duration = (a, b) => {
  const start = d(a);
  const end = d(b);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  return Math.round((end - start) / DAY) + 1;
};
const progress = (a, b) => {
  const start = d(a);
  const end = d(b);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;
  return Math.max(0, Math.min(100, Math.round(((now() - start) * 100) / (end - start))));
};
const autoStatus = (a, b) => {
  const start = d(a);
  const end = d(b);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'UPCOMING';
  return now() < start ? 'UPCOMING' : now() > end ? 'ARCHIVED' : 'ACTIVE';
};
const nextCycle = (year) => {
  if (!year) return null;
  const start = d(year.endDate);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  return {
    name: `${start.getFullYear()} - ${end.getFullYear()}`,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    status: 'UPCOMING',
    autoActivate: false,
  };
};

const ACADEMIC_YEAR_DATES_KEY = 'academic_year_dates_cache';

const readCachedYearDates = (id, name) => {
  try {
    const raw = localStorage.getItem(ACADEMIC_YEAR_DATES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const key = [id, name].filter(Boolean).map(String).find((candidate) => parsed[candidate]);
    return key ? (parsed[key] || {}) : {};
  } catch {
    return {};
  }
};

const cacheYearDates = (id, name, dates) => {
  if (!dates || (!dates.startDate && !dates.endDate)) return;
  try {
    const raw = localStorage.getItem(ACADEMIC_YEAR_DATES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const keys = [id, name].filter(Boolean).map(String);
    keys.forEach((k) => {
      parsed[k] = {
        startDate: dates.startDate || parsed[k]?.startDate || '',
        endDate: dates.endDate || parsed[k]?.endDate || '',
      };
    });
    localStorage.setItem(ACADEMIC_YEAR_DATES_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore storage errors
  }
};

const mapYear = (x) => {
  if (!x) return blank;
  const id = String(x.academicYearId ?? x.AcademicYearId ?? x.id ?? '');
  const name = String(x.academicYearName ?? x.AcademicYearName ?? x.name ?? '').trim();
  const cachedDates = readCachedYearDates(id, name);
  const rawStart = x.startDate ?? x.StartDate ?? x.start_date ?? x.fromDate ?? x.FromDate ?? x.academicYearStartDate ?? x.AcademicYearStartDate ?? cachedDates.startDate ?? '';
  const rawEnd = x.endDate ?? x.EndDate ?? x.end_date ?? x.toDate ?? x.ToDate ?? x.academicYearEndDate ?? x.AcademicYearEndDate ?? cachedDates.endDate ?? '';
  const startDate = normalizeDate(rawStart);
  const endDate = normalizeDate(rawEnd);

  if (startDate || endDate) {
    cacheYearDates(id, name, { startDate, endDate });
  }

  return {
    id,
    name,
    startDate,
    endDate,
    status:
      x.isActive === true || x.IsActive === true || Number(x.isActive ?? x.IsActive) === 1 ||
      x.isCurrent === true || x.IsCurrent === true ||
      ['active', 'current', '1', 'true'].includes(String(x.status ?? x.Status ?? x.academicYearStatus ?? '').trim().toLowerCase())
        ? 'ACTIVE'
        : autoStatus(startDate, endDate),
    autoActivate: Boolean(x.autoActivate ?? x.AutoActivate ?? false),
  };
};

function AcademicYear() {
  const { selectedCollegeId, selectedCollege, loading: contextLoading } = AcademicContextImports_useAcademic();
  const [years, setYears] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [modal, setModal] = useState(null); // 'add' | 'edit' | 'view' | 'generate'
  const [confirmStatus, setConfirmStatus] = useState(null); // { year, targetStatus }
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(blank);
  const [errors, setErrors] = useToastState({}, 'error');
  const [, setNoticeValue] = useToastState('', 'success');
  const [noticeTone, setNoticeTone] = useState('info');
  const [exportLoading, setExportLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstYearStart, setFirstYearStart] = useState(() => {
    const today = new Date();
    return `${today.getFullYear() - (today.getMonth() < 5 ? 1 : 0)}-06-01`;
  });
  const [page, setPage] = useState(1);

  const close = () => {
    setForm({ ...blank });
    setModal(null);
    setSelected(null);
    setErrors({});
  };

  const setNotice = (message, tone = 'info') => {
    setNoticeValue(message, tone);
    setNoticeTone(tone);
  };

  const loadYears = async () => {
    if (!selectedCollegeId) {
      setYears([]);
      setExportLoading(false);
      return;
    }
    setExportLoading(true);
    try {
      const data = await academicYearApi.getAll();
      if (String(selectedCollegeId) !== readSelectedCollegeId()) return;
      const list = Array.isArray(data) ? data : data?.records || data?.items || [];
      const scoped = createCollegeScope(selectedCollegeId)(list);
      setYears(newestFirst('academic-years', scoped).map(mapYear));
      eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED);
    } catch (error) {
      setNotice(error.message || 'Unable to load academic years.', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    setYears([]);
    close();
    loadYears();
  }, [selectedCollegeId]);

  const active = years.find((x) => x.status === 'ACTIVE' || isPresentYear(x));
  const next = years
    .filter((x) => x.status === 'UPCOMING')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const generationBase = years.reduce(
    (latest, year) => (!latest || year.endDate > latest.endDate ? year : latest),
    null
  );
  const generatedCycle = generationBase ? nextCycle(generationBase) : (() => {
    if (!firstYearStart) return null;
    const start = d(firstYearStart);
    if (isNaN(start.getTime())) return null;
    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);
    end.setDate(end.getDate() - 1);
    const localDate = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    return { name: `${start.getFullYear()} - ${end.getFullYear()}`, startDate: firstYearStart, endDate: localDate(end), autoActivate: false };
  })();

  const shown = useMemo(
    () =>
      years.filter(
        (x) =>
          `${x.name} ${x.status}`.toLowerCase().includes(search.toLowerCase().trim()) &&
          (filter === 'ALL' || x.status === filter)
      ),
    [years, search, filter]
  );

  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => setPage(1), [search, filter]);

  const openAdd = () => {
    if (!selectedCollegeId || contextLoading) {
      showWarning('Select a college before adding an academic year.');
      return;
    }
    setSelected(null);
    setForm(blank);
    setErrors({});
    setModal('add');
  };

  const edit = (x) => {
    if (isPresentYear(x)) {
      setNotice('Present academic year cannot be edited directly.', 'error');
      return;
    }
    const item = mapYear(x);
    setSelected(item);
    setForm({
      name: item.name,
      startDate: item.startDate,
      endDate: item.endDate,
      autoActivate: item.autoActivate || false,
    });
    setErrors({});
    setModal('edit');
  };

  function validate() {
    let e = {},
      others = years.filter((x) => x.id !== selected?.id);
    if (!selectedCollegeId) e.form = 'Select a college before adding an academic year.';
    if (!form.name.trim()) e.name = 'Academic year title is required.';
    if (!form.startDate) e.startDate = 'Start date is required.';
    if (!form.endDate) e.endDate = 'End date is required.';
    if (form.startDate && form.endDate && d(form.endDate) <= d(form.startDate))
      e.endDate = 'End date must be after start date.';
    if (form.name.trim() && others.some((x) => x.name.toLowerCase() === form.name.trim().toLowerCase()))
      e.name = 'This academic year already exists.';
    if (
      form.startDate &&
      form.endDate &&
      others.some((x) => d(form.startDate) <= d(x.endDate) && d(form.endDate) >= d(x.startDate))
    )
      e.range = 'This date range overlaps an existing academic year.';
    setErrors(e);
    if (Object.keys(e).length) showWarning('Correct the highlighted academic year fields.');
    return !Object.keys(e).length;
  }

  async function save(e) {
    e.preventDefault();
    if (selected && isPresentYear(selected)) {
      setErrors({ form: 'Present academic year cannot be modified.' });
      return;
    }
    if (!validate() || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        academicYearName: form.name.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        StartDate: form.startDate,
        EndDate: form.endDate,
        autoActivate: form.autoActivate,
      };
      const data = selected ? await academicYearApi.update(selected.id, payload) : await academicYearApi.create(payload);
      const targetId = data?.academicYearId ?? data?.id ?? selected?.id;
      cacheYearDates(targetId, payload.name, { startDate: form.startDate, endDate: form.endDate });
      const item = data
        ? mapYear(data)
        : {
            ...form,
            id: selected?.id || Date.now().toString(),
            name: form.name.trim(),
            startDate: form.startDate,
            endDate: form.endDate,
            status: autoStatus(form.startDate, form.endDate),
          };
      if (!selected) { rememberCreated('academic-years', item); setSearch(''); setFilter('ALL'); setPage(1); }
      setYears((x) => (selected ? x.map((y) => (y.id === selected.id ? item : y)) : [item, ...x]));
      setNotice(`${item.name} has been ${selected ? 'updated' : 'created'} successfully.`, 'success');
      close();
      await loadYears();
    } catch (error) {
      setErrors({ form: error.message || 'Unable to save the academic year.' });
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusConfirm() {
    if (!confirmStatus || saving) return;
    const { year, targetStatus } = confirmStatus;
    setSaving(true);
    try {
      if (targetStatus === 'ACTIVE') {
        await academicYearApi.activate(year.id);
      } else {
        await academicYearApi.deactivate(year.id);
      }
      setNotice(`${year.name} has been ${targetStatus === 'ACTIVE' ? 'activated' : 'archived'} successfully.`, 'success');
      setConfirmStatus(null);
      await loadYears();
    } catch (error) {
      setNotice(error.message || 'Unable to update academic year status.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function requestStatusChange(year, targetStatus) {
    if (targetStatus === 'ARCHIVED') {
      try {
        const students = await studentApi.getAll({ AcademicYearId: Number(year.id) });
        if (students.length > 0) {
          showDeactivationBlocked(`Cannot deactivate ${year.name}. ${students.length} student${students.length === 1 ? '' : 's'} are associated with this academic year.`);
          return;
        }
      } catch (error) {
        setNotice(error.message || 'Unable to verify associated students. The academic year was not deactivated.', 'error');
        return;
      }
    }
    setConfirmStatus({ year, targetStatus });
  }

  async function generate() {
    if (!selectedCollegeId || contextLoading || !generatedCycle || saving) return;
    const item = generatedCycle;
    if (years.some((x) => x.name === item.name)) {
      setNotice(`${item.name} already exists, so no duplicate was created.`, 'info');
    } else {
      setSaving(true);
      try {
        const genResult = await academicYearApi.create(item);
        cacheYearDates(genResult?.academicYearId ?? genResult?.id, item.name, { startDate: item.startDate, endDate: item.endDate });
        rememberCreated('academic-years', genResult);
        setSearch(''); setFilter('ALL'); setPage(1);
        setNotice(`${item.name} was generated successfully.`, 'success');
        await loadYears();
      } catch (error) {
        setNotice(error.message || 'Unable to generate next academic year.', 'error');
      } finally {
        setSaving(false);
      }
    }
    close();
  }

  const openView = async (x) => {
    setSelected(x);
    setModal('view');
    try {
      const data = await academicYearApi.getById(x.id);
      if (data) setSelected(mapYear(data));
    } catch (error) {
      setNotice(error.message || 'Unable to load academic year details.', 'error');
    }
  };

  return (
    <DashboardLayout>
      <main className="ay">
        {modal !== 'view' && <PageHeader
          title="Academic Year"
          subtitle="Add and manage academic years separately for each college."
        />}
        {modal === 'view' && selected ? (
          <div className="cm-profile-view ay-details-view" data-export-record>
            <div className="cm-profile-top-bar">
          <ExportMenu mode="single" title="Academic Year Details" filename={`academic-year_${selected.name || selected.id}`} />
              <button type="button" className="erp-btn erp-btn--secondary" onClick={close}>
                &larr; Back 
              </button>
            </div>

            <div className="cm-profile-card">
              <div className="cm-profile-banner">
                <div className="cm-profile-avatar-wrap">
                  <div className="cm-profile-placeholder">
                    <FiCalendar />
                  </div>
                </div>
                <div className="cm-profile-header-info">
                  <div className="cm-profile-badges">
                    <span className="cm-badge cm-badge-code">Cycle</span>
                    <span className={`cm-status-badge ${String(selected.status).toLowerCase()}`}>
                      {selected.status}
                    </span>
                  </div>
                  <h1 className="cm-profile-title">{selected.name}</h1>
                  <p className="cm-profile-subtitle">
                    <span>Duration: </span>
                    <strong>{duration(selected.startDate, selected.endDate)} days</strong>
                    <span> ({formatDate(selected.startDate)} - {formatDate(selected.endDate)})</span>
                  </p>
                </div>
              </div>

              <div className="cm-profile-grid ay-profile-grid">
                <InfoCard
                  title="Cycle Information"
                  icon={FiCalendar}
                  items={[
                    { label: 'Academic Year', value: selected.name },
                    { label: 'Start Date', value: formatDate(selected.startDate) },
                    { label: 'End Date', value: formatDate(selected.endDate) },
                    { label: 'Duration', value: `${duration(selected.startDate, selected.endDate)} days` },
                  ]}
                />
                <InfoCard
                  title="Lifecycle & Governance"
                  icon={FiClock}
                  items={[
                    { label: 'Status', value: selected.status },
                    { label: 'Auto Activation', value: selected.autoActivate ? 'Enabled' : 'Manual' },
                    { label: 'Present Active Cycle', value: isPresentYear(selected) ? 'Yes (Current Ongoing)' : 'No' },
                    { label: 'Historical Record', value: isPastYear(selected) ? 'Yes (Past Cycle)' : 'No' },
                  ]}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            {active ? (
              <section className="hero">
                <div>
                  <p className="eyebrow">Active Academic Context</p>
                  <h2>{active.name}</h2>
                  <p>
                    {formatDate(active.startDate)} - {formatDate(active.endDate)}
                  </p>
                  <StatusBadge status="ACTIVE" />
                </div>
                <div className="metrics">
                  <p>
                    <b>{Math.max(0, days(active.endDate))}</b>Days remaining
                  </p>
                  <p>
                    <b>{progress(active.startDate, active.endDate)}%</b>Year progress
                  </p>
                </div>
                <div className="bar">
                  <span style={{ width: `${progress(active.startDate, active.endDate)}%` }} />
                </div>
              </section>
            ) : (
              <section className="hero">
                <h2>No active academic year</h2>
                <p>Activate an upcoming academic year to establish current college operations context.</p>
              </section>
            )}

            <section className="cm-panel course-directory">
              <header className="course-directory-heading">
                <div>
                  <span className="cm-eyebrow">Academic Year Directory</span>
                  <p>{shown.length} records</p>
                </div>
                <div className="directory-export-actions">
                  <ExportMenu
                    rows={shown}
                    columns={yearColumns}
                    title="Academic Years"
                    filename="academic-years"
                    loading={exportLoading || noticeTone === 'error'}
                  />
                  <button type="button" className="cm-button secondary" disabled={!selectedCollegeId || contextLoading || exportLoading} onClick={() => setModal('generate')}>
                    {generationBase ? 'Generate Next Year' : 'Generate Academic Year'}
                  </button>
                  <button type="button" className="cm-button" disabled={!selectedCollegeId || contextLoading} onClick={openAdd}>
                    <FiPlus /> Add Academic Year
                  </button>
                </div>
              </header>

              <FilterPanel
                active={Boolean(search || filter !== 'ALL')}
                onClear={() => {
                  setSearch('');
                  setFilter('ALL');
                  setPage(1);
                }}
              >
                <div className="course-toolbar">
                  <label className="course-search">
                    <FiSearch />
                    <input
                      aria-label="Search academic years"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search year title or status..."
                    />
                  </label>
                  <div className="erp-filter-buttons" role="group" aria-label="Academic year status">
                    {['ALL', ...states].map((x) => (
                      <button
                        key={x}
                        type="button"
                        className={`erp-pill ${filter === x ? 'active' : ''}`}
                        aria-pressed={filter === x}
                        onClick={() => setFilter(x)}
                      >
                        {x === 'ALL' ? 'All' : x.charAt(0) + x.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </FilterPanel>

              <div className="erp-table-responsive">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th className="table-center" style={{ minWidth: '180px' }}>Academic Year</th>
                      <th className="table-center" style={{ width: '130px' }}>Start Date</th>
                      <th className="table-center" style={{ width: '130px' }}>End Date</th>
                      <th className="table-center" style={{ width: '120px' }}>Status</th>
                      <th className="table-center" style={{ width: '120px' }}>Duration</th>
                      <th className="table-center" style={{ width: '140px' }}>Auto Activation</th>
                      <th className="table-center" style={{ width: '140px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((x) => (
                      <tr key={x.id}>
                        <td className="table-center" style={{ minWidth: '180px' }}>
                          <button
                            type="button"
                            className="ay-name-link table-cell-truncate"
                            title={`Click to view details for ${x.name || 'Academic Year'}`}
                            onClick={() => openView(x)}
                          >
                            {x.name}
                          </button>
                        </td>
                        <td className="table-center" style={{ width: '130px' }}>{formatDate(x.startDate)}</td>
                        <td className="table-center" style={{ width: '130px' }}>{formatDate(x.endDate)}</td>
                        <td className="table-center" style={{ width: '120px' }}>
                          <StatusBadge value={x.status} />
                        </td>
                        <td className="table-center" style={{ width: '120px' }}>{duration(x.startDate, x.endDate)} days</td>
                        <td className="table-center" style={{ width: '140px' }}>{x.autoActivate ? 'Enabled' : 'Manual'}</td>
                        <td className="table-center" style={{ width: '140px' }}>
                          <div className="erp-row-actions table-actions-group">
                            <button
                              type="button"
                              className="table-action-btn action-edit erp-action-btn"
                              title={`Edit ${x.name || 'Academic Year'}`}
                              aria-label={`Edit ${x.name || 'Academic Year'}`}
                              onClick={() => edit(x)}
                              disabled={x.status === 'ARCHIVED' || isPresentYear(x)}
                            >
                              <FiEdit2 />
                            </button>
                            {x.status === 'UPCOMING' && (
                              <button
                                type="button"
                                className="table-action-btn action-activate erp-action-btn erp-action-btn--danger"
                                title={`Activate ${x.name || 'Academic Year'}`}
                                aria-label={`Activate ${x.name || 'Academic Year'}`}
                                onClick={() => requestStatusChange(x, 'ACTIVE')}
                              >
                                <FiToggleLeft data-status="inactive" />
                              </button>
                            )}
                            {(x.status === 'ACTIVE' || (isPastYear(x) && x.status !== 'ARCHIVED')) && (
                              <button
                                type="button"
                                className="table-action-btn action-deactivate erp-action-btn erp-action-btn--success"
                                title={`Deactivate ${x.name || 'Academic Year'}`}
                                aria-label={`Deactivate ${x.name || 'Academic Year'}`}
                                onClick={() => requestStatusChange(x, 'ARCHIVED')}
                              >
                                <FiToggleRight data-status="active" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!shown.length && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '32px' }}>
                          <DirectoryEmptyState title="No academic years found." actionLabel="Add Academic Year" onAction={openAdd} />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!!shown.length && (
                <TablePagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
              )}
            </section>
          </>
        )}

        {/* Add/Edit Modal */}
        {(modal === 'add' || modal === 'edit') && (
          <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
            <section className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title">
              <button type="button" className="x" aria-label="Close dialog" onClick={close}>
                <FiX aria-hidden="true" />
              </button>
              <h2 id="form-title">{modal === 'add' ? 'Add Academic Year' : 'Edit Academic Year'}</h2>
              <form onSubmit={save} noValidate>
                <p>College: <strong>{selectedCollege?.name || selectedCollege?.collegeName || 'Selected college'}</strong></p>
                <label>
                  <span>Academic Year Title <b className="required-mark">*</b></span>
                  <input
                    autoFocus
                    placeholder="e.g. 2025 - 2026"
                    value={form.name}
                    onChange={(e) => setForm((x) => ({ ...x, name: e.target.value }))}
                  />
                  {errors.name && (
                    <em className="field-error" role="alert">
                      {errors.name}
                    </em>
                  )}
                </label>
                <div className="formgrid">
                  <label>
                    <span>Start Date <b className="required-mark">*</b></span>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm((x) => ({ ...x, startDate: e.target.value }))}
                    />
                    {errors.startDate && (
                      <em className="field-error" role="alert">
                        {errors.startDate}
                      </em>
                    )}
                  </label>
                  <label>
                    <span>End Date <b className="required-mark">*</b></span>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm((x) => ({ ...x, endDate: e.target.value }))}
                    />
                    {errors.endDate && (
                      <em className="field-error" role="alert">
                        {errors.endDate}
                      </em>
                    )}
                  </label>
                </div>
                {errors.range && (
                  <em className="field-error" role="alert">
                    {errors.range}
                  </em>
                )}
                {errors.form && (
                  <em className="field-error" role="alert">
                    {errors.form}
                  </em>
                )}
                {modal === 'add' && (
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={form.autoActivate}
                      onChange={(e) => setForm((x) => ({ ...x, autoActivate: e.target.checked }))}
                    />
                    <span>Enable auto activation</span>
                    <small>Display preference only; manual status confirmation applies.</small>
                  </label>
                )}
                <footer>
                  <button type="button" className="erp-btn erp-btn--secondary" onClick={close}>
                    Cancel
                  </button>
                  <button type="submit" className="erp-btn erp-btn--primary" disabled={saving}>
                    {saving ? 'Saving...' : modal === 'add' ? 'Add Academic Year' : 'Save Changes'}
                  </button>
                </footer>
              </form>
            </section>
          </div>
        )}

        {/* Generate Next Year Modal */}
        {modal === 'generate' && (
          <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
            <section className="modal" role="dialog" aria-modal="true" aria-labelledby="gen-title">
              <button type="button" className="x" aria-label="Close dialog" onClick={close}>
                <FiX aria-hidden="true" />
              </button>
              <h2 id="gen-title">{generationBase ? 'Generate Next Academic Year' : 'Generate First Academic Year'}</h2>
              <p>College: <strong>{selectedCollege?.name || selectedCollege?.collegeName || 'Selected college'}</strong></p>
              {!generationBase && <label className="field">
                <span>Academic year start date</span>
                <input type="date" value={firstYearStart} onChange={(event) => setFirstYearStart(event.target.value)} required />
              </label>}
              <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>
                {generationBase ? `Generate the next annual cycle after ${generationBase.name}.` : 'Generate a new annual academic cycle for this college.'}
                {generatedCycle && <> <strong>{generatedCycle.name}</strong> ({formatDate(generatedCycle.startDate)} – {formatDate(generatedCycle.endDate)}).</>}
              </p>
              <footer>
                <button type="button" className="erp-btn erp-btn--secondary" onClick={close}>
                  Cancel
                </button>
                <button type="button" className="erp-btn erp-btn--primary" onClick={generate} disabled={saving || !generatedCycle || !selectedCollegeId || contextLoading}>
                  {saving ? 'Generating...' : 'Generate Cycle'}
                </button>
              </footer>
            </section>
          </div>
        )}

        {/* Status Confirmation Dialog */}
        {confirmStatus && (
          <StatusConfirmDialog
            entity="Academic Year"
            name={confirmStatus.year.name}
            nextStatus={confirmStatus.targetStatus}
            onCancel={() => setConfirmStatus(null)}
            onConfirm={handleStatusConfirm}
            busy={saving}
            description={
              confirmStatus.targetStatus === 'ACTIVE'
                ? 'Activating this academic year sets it as the current active operational cycle for the institution.'
                : 'Archiving marks this academic cycle as historical records.'
            }
          />
        )}
      </main>
    </DashboardLayout>
  );
}

return { default: AcademicYear }
})()

// AddCollege screen and private helpers.
const AddCollegeScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const GENERIC_ERROR_MESSAGE = userErrorImports_GENERIC_ERROR_MESSAGE
const collegeLogoValue = collegeLogoImports_collegeLogoValue
const rememberCreated = newestFirstImports_rememberCreated
const useToastState = useToastStateImports_default
const useEffect = reactImports_useEffect
const useRef = reactImports_useRef
const useState = reactImports_useState
const useNavigate = react_router_domImports_useNavigate
const useSearchParams = react_router_domImports_useSearchParams
const FiCheck = fiImports_FiCheck
const FiArrowLeft = fiImports_FiArrowLeft
const DashboardLayout = DashboardLayoutImports_default
const SearchableSelect = SearchableSelectImports_default
const cacheCollegeLogo = collegeApiImports_cacheCollegeLogo
const cacheCollegeDates = collegeApiImports_cacheCollegeDates
const createCollege = collegeApiImports_createCollege
const fetchCollegeLogo = collegeApiImports_fetchCollegeLogo
const getCollegeById = collegeApiImports_getCollegeById
const getCollegeLogoUrl = collegeApiImports_getCollegeLogoUrl
const getColleges = collegeApiImports_getColleges
const isBackendCollegeLogo = collegeApiImports_isBackendCollegeLogo
const isValidWebsite = collegeApiImports_isValidWebsite
const normalizeWebsite = collegeApiImports_normalizeWebsite
const readCachedCollegeLogo = collegeApiImports_readCachedCollegeLogo
const readCachedCollegeDates = collegeApiImports_readCachedCollegeDates
const readCollegeExtendedDetails = collegeApiImports_readCollegeExtendedDetails
const unwrapCollegeRecord = collegeApiImports_unwrapCollegeRecord
const updateCollege = collegeApiImports_updateCollege
const uploadCollegeLogo = collegeApiImports_uploadCollegeLogo
const WEBSITE_VALIDATION_MESSAGE = collegeApiImports_WEBSITE_VALIDATION_MESSAGE

const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== ''
const dateInputValue = (value) => value ? String(value).slice(0, 10) : ''

const TYPES = ['Engineering College', 'University', 'Autonomous College', 'Affiliated College', 'Deemed University', 'Other']
const ACCREDITATION_STATUSES = ['Accredited', 'Not Accredited', 'Under Review', 'Expired']
const FORM_TABS = [
  { id: 'college', label: 'College Information', shortLabel: 'College' },
  { id: 'address', label: 'Address', shortLabel: 'Address' },
  { id: 'contact', label: 'Contact Information', shortLabel: 'Contact' },
  { id: 'administration', label: 'Administration', shortLabel: 'Admin' },
  { id: 'accreditation', label: 'Accreditation Details', shortLabel: 'Accreditation' },
]
const TAB_FIELDS = {
  college: ['collegeName', 'collegeCode', 'collegeType', 'collegeTypeOther', 'universityName', 'startDate', 'endDate'],
  address: ['addressLine1', 'addressLine2', 'area', 'district', 'city', 'state', 'pincode', 'country'],
  contact: ['contactNumber', 'alternateContactNumber', 'email', 'website'],
  administration: ['principalName', 'principalEmail', 'principalContact'],
  accreditation: ['accreditationBody', 'accreditationStatus', 'accreditationGrade', 'accreditationNumber', 'validFrom', 'validUntil'],
}
const initialValues = {
  collegeName: '', collegeCode: '', collegeType: '', collegeTypeOther: '', universityName: '', logo: '', logoName: '',
  addressLine1: '', addressLine2: '', area: '', district: '', city: '', state: '', pincode: '', country: 'India',
  contactNumber: '', alternateContactNumber: '', email: '', website: '',
  principalName: '', principalEmail: '', principalContact: '',
  accreditationBody: '', accreditationStatus: '', accreditationGrade: '',
  accreditationNumber: '', validFrom: '', validUntil: '', startDate: '', endDate: '',
}
const requiredDraftFields = ['collegeName', 'collegeCode', 'collegeType', 'universityName', 'addressLine1', 'city', 'state', 'pincode', 'contactNumber', 'email', 'principalName']
const draftKey = (editId) => `pirnav-college-draft-${editId || 'new'}`
const draftProgress = (values) => Math.round(requiredDraftFields.filter((field) => String(values[field] || '').trim()).length / requiredDraftFields.length * 100)

const phonePattern = /^[6-9]\d{9}$/
const contactPattern = /^(?:[6-9]\d{9}|0[1-9]\d{7,9}|[1-9]\d{7,10})$/
const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/
const codePattern = /^[A-Z0-9]{2,12}$/
const personNamePattern = /^[a-zA-Z\s.'-]+$/
const institutionNamePattern = /^[a-zA-Z\s.,&'()-]+$/

const getApiErrorMessage = (error) => {
  const data = error?.response?.data
  let parsedData = data
  if (typeof data === 'string') {
    try { parsedData = JSON.parse(data) } catch { parsedData = null }
  }
  const rawError = `${typeof data === 'string' ? data : ''} ${error?.message || ''}`
  const validationFields = parsedData && typeof parsedData === 'object' ? Object.keys(parsedData.errors || {}) : []
  if (/PrincipalEmail/i.test(rawError)) return 'Please enter a valid principal email address.'
  if (validationFields.some((field) => field.toLowerCase() === 'principalemail')) return 'Please enter a valid principal email address.'
  if (validationFields.length) return 'Please check the entered college details and try again.'
  const apiMessage = parsedData && typeof parsedData === 'object'
    ? parsedData.message || parsedData.error || (parsedData.title === 'One or more validation errors occurred.' ? '' : parsedData.title) || parsedData.detail
    : typeof data === 'string' && !/^\s*[{[]/.test(data) ? data : ''
  if (apiMessage) return apiMessage

  const technicalMessage = /<!doctype|<html|ngrok|err_ngrok|failed to fetch|networkerror|https?:\/\//i.test(String(error?.message || ''))
  return technicalMessage || error?.response?.status >= 500
    ? GENERIC_ERROR_MESSAGE
    : error?.message || 'The college could not be saved. Please try again.'
}

function validate(values) {
  const errors = {}
  const name = values.collegeName.trim()
  if (!name) errors.collegeName = 'College name is required.'
  else if (/\d/.test(name) || !institutionNamePattern.test(name)) errors.collegeName = 'College name cannot contain numbers.'
  else if (name.length < 3 || name.length > 120) errors.collegeName = 'Use between 3 and 120 characters.'
  if (!values.collegeCode) errors.collegeCode = 'College code is required.'
  else if (!codePattern.test(values.collegeCode)) errors.collegeCode = 'Use 2-12 uppercase letters and numbers only.'
  if (!values.collegeType) errors.collegeType = 'Select a college type.'
  else if (values.collegeType === 'Other' && !values.collegeTypeOther.trim()) errors.collegeTypeOther = 'Enter the college type.'
  const university = values.universityName.trim()
  if (!university) errors.universityName = 'University name is required.'
  else if (/\d/.test(university) || !institutionNamePattern.test(university)) errors.universityName = 'University name cannot contain numbers.'
  else if (university.length < 3 || university.length > 120) errors.universityName = 'Use between 3 and 120 characters.'
  if (!values.addressLine1.trim()) errors.addressLine1 = 'Address line 1 is required.'
  if (!values.city.trim()) errors.city = 'City is required.'
  else if (!personNamePattern.test(values.city.trim())) errors.city = 'City can only contain letters and spaces.'
  if (!values.state.trim()) errors.state = 'State is required.'
  else if (!personNamePattern.test(values.state.trim())) errors.state = 'State can only contain letters and spaces.'
  if (!/^[1-9]\d{5}$/.test(values.pincode.trim())) errors.pincode = 'Enter a valid 6-digit Indian pincode (cannot start with 0).'
  const cleanContact = String(values.contactNumber || '').replace(/\D/g, '')
  if (!cleanContact) errors.contactNumber = 'Official contact number is required.'
  else if (!contactPattern.test(cleanContact)) errors.contactNumber = 'Enter a valid 10-digit mobile number or landline number with STD code.'
  const cleanAltContact = String(values.alternateContactNumber || '').replace(/\D/g, '')
  if (values.alternateContactNumber && !contactPattern.test(cleanAltContact)) errors.alternateContactNumber = 'Enter a valid 10-digit mobile number or landline number with STD code.'
  if (!values.email.trim()) errors.email = 'Official email is required.'
  else if (!emailPattern.test(values.email.trim())) errors.email = 'Enter a valid email address.'
  if (!values.principalName.trim()) errors.principalName = 'Principal name is required.'
  else if (!personNamePattern.test(values.principalName.trim())) errors.principalName = 'Principal name can only contain letters, spaces, and dots.'
  else if (values.principalName.trim().length < 2) errors.principalName = 'Principal name must be at least 2 characters.'
  const website = normalizeWebsite(values.website)
  if (values.website.trim() && !isValidWebsite(website)) errors.website = WEBSITE_VALIDATION_MESSAGE
  if (!values.principalEmail.trim()) errors.principalEmail = 'Principal email is required.'
  else if (!emailPattern.test(values.principalEmail.trim())) errors.principalEmail = 'Enter a valid email address.'
  if (!values.principalContact) errors.principalContact = 'Principal contact number is required.'
  else if (!phonePattern.test(values.principalContact)) errors.principalContact = 'Enter a valid 10-digit Indian mobile number.'
  if (values.validFrom && values.validUntil && values.validUntil <= values.validFrom) errors.validUntil = 'Valid until must be after valid from.'
  return errors
}

function Field({ label, name, values, errors, touched, onChange, required, maxLength, ...props }) {
  const error = (touched?.[name] || Boolean(values?.[name])) && errors?.[name]
  return <label className="ac-field" htmlFor={`ac-${name}`}>
    <span>{label}{required && <b aria-hidden="true"> *</b>}</span>
    <input id={`ac-${name}`} name={name} value={values[name]} onChange={onChange} required={required} maxLength={maxLength} aria-invalid={Boolean(error)} aria-describedby={error ? `ac-${name}-error` : undefined} {...props} />
    {maxLength && <small className="ac-counter">{values[name].length}/{maxLength}</small>}
    {error && <small id={`ac-${name}-error`} className="ac-error" role="alert">{error}</small>}
  </label>
}

function Dialog({ title, children, actions, onClose, labelledBy = 'ac-dialog-title' }) {
  return <div className="ac-dialog-layer" role="presentation"><div className="ac-dialog" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
    <button type="button" className="ac-dialog-close" onClick={onClose} aria-label="Close dialog">×</button>
    <h2 id={labelledBy}>{title}</h2>{children}<div className="ac-dialog-actions">{actions}</div>
  </div></div>
}

function AddCollege() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const fileRef = useRef(null)
  const logoObjectUrlRef = useRef('')
  const tabsNavRef = useRef(null)
  const [storedValues, setValues] = useState(initialValues)
  const values = storedValues.collegeType === 'Deemed University'
    ? { ...storedValues, universityName: storedValues.collegeName }
    : storedValues
  const [logoFile, setLogoFile] = useState(null)
  const [removeExistingLogo, setRemoveExistingLogo] = useState(false)
  const [pendingLogoCollegeId, setPendingLogoCollegeId] = useState(null)
  const [existingCollegeCodes, setExistingCollegeCodes] = useState([])
  const [existingColleges, setExistingColleges] = useState([])
  const [touched, setTouched] = useState({})
  const [logoError, setLogoError] = useToastState('', 'error')
  const [dirty, setDirty] = useState(false)
  const [dialog, setDialog] = useState(null)
  const [, setNotice] = useToastState('', 'success')
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState(editId ? 'college' : 'college')
  const [highestUnlockedTab, setHighestUnlockedTab] = useState(editId ? FORM_TABS.length - 1 : 0)
  const [loadingCollege, setLoadingCollege] = useState(Boolean(editId))
  const [postOffices, setPostOffices] = useState([])
  const [pincodeStatus, setPincodeStatus] = useState('')
  const [saved, setSaved] = useState(false)
  const redirectTimer = useRef(null)
  const originalEditValues = useRef(null)
  const errors = validate(values)
  const normalizeDuplicate = (value) => String(value || '').trim().toLowerCase()
  const currentId = normalizeDuplicate(editId)
  const currentCode = normalizeDuplicate(values.collegeCode)
  const original = originalEditValues.current || {}
  const changedFromOriginal = (field) => !editId || normalizeDuplicate(values[field]) !== normalizeDuplicate(original[field])
  const duplicateCandidates = existingColleges.filter((college) => {
    const collegeId = normalizeDuplicate(college.id ?? college.collegeId ?? college.CollegeId ?? college.Id)
    const collegeCode = normalizeDuplicate(college.code ?? college.collegeCode ?? college.CollegeCode)
    const isCurrentById = currentId && collegeId === currentId
    const isCurrentByCode = editId && currentCode && collegeCode === currentCode
    return !isCurrentById && !isCurrentByCode
  })
  const duplicateCode = normalizeDuplicate(values.collegeCode) && duplicateCandidates.some((college) => normalizeDuplicate(college.code ?? college.collegeCode) === normalizeDuplicate(values.collegeCode))
  const duplicateName = changedFromOriginal('collegeName') && normalizeDuplicate(values.collegeName) && duplicateCandidates.some((college) => normalizeDuplicate(college.name ?? college.collegeName) === normalizeDuplicate(values.collegeName))
  const duplicateEmail = changedFromOriginal('email') && normalizeDuplicate(values.email) && duplicateCandidates.some((college) => normalizeDuplicate(college.email ?? college.collegeEmail) === normalizeDuplicate(values.email))
  const duplicateContact = changedFromOriginal('contactNumber') && normalizeDuplicate(values.contactNumber) && duplicateCandidates.some((college) => normalizeDuplicate(college.contact ?? college.contactNumber ?? college.phoneNumber) === normalizeDuplicate(values.contactNumber))
  const identityChanged = ['collegeName', 'addressLine1', 'city', 'state', 'pincode'].some(changedFromOriginal)
  const duplicateIdentity = identityChanged && [values.collegeName, values.addressLine1, values.city, values.state, values.pincode].every((value) => normalizeDuplicate(value)) && duplicateCandidates.some((college) => [college.name ?? college.collegeName, college.addressLine1 ?? college.address, college.city, college.state, college.pincode].map(normalizeDuplicate).join('|') === [values.collegeName, values.addressLine1, values.city, values.state, values.pincode].map(normalizeDuplicate).join('|'))
  const duplicateReason = duplicateName ? 'A college with this name already exists.' : duplicateCode ? 'This college code already exists.' : duplicateEmail ? 'This college email already exists.' : duplicateContact ? 'This college contact number already exists.' : duplicateIdentity ? 'A college with the same name and address already exists.' : ''
  const duplicateTab = duplicateName || duplicateCode ? 'college' : duplicateIdentity ? 'address' : duplicateEmail || duplicateContact ? 'contact' : ''
  const duplicateReasonForTab = activeTab === 'college'
    ? (duplicateName ? 'A college with this name already exists.' : duplicateCode ? 'This college code already exists.' : '')
    : activeTab === 'address'
      ? (duplicateIdentity ? 'A college with the same name, university, and address already exists.' : '')
      : activeTab === 'contact'
        ? (duplicateEmail ? 'This college email already exists.' : duplicateContact ? 'This college contact number already exists.' : '')
        : ''
  const hasDuplicate = Boolean(duplicateReason)
  const isValid = Object.keys(errors).length === 0 && !logoError && !hasDuplicate
  const firstInvalidTab = duplicateTab || FORM_TABS.find((tab) => TAB_FIELDS[tab.id]?.some((field) => errors[field]))?.id || ''
  const invalidMessage = duplicateReason || Object.values(errors)[0] || logoError || 'Please complete the highlighted fields before continuing.'
  const progress = draftProgress(values)

  useEffect(() => {
    if (logoObjectUrlRef.current) {
      URL.revokeObjectURL(logoObjectUrlRef.current)
      logoObjectUrlRef.current = ''
    }
    // Reset wizard state whenever the edited college changes so a previous save/preview doesn't carry over.
    window.clearTimeout(redirectTimer.current)
    setActiveTab('college')
    setHighestUnlockedTab(editId ? FORM_TABS.length - 1 : 0)
    setTouched({})
    setDirty(false)
    setNotice('')
    setSaved(false)
    setDialog(null)
    setLoadingCollege(Boolean(editId))
    setLogoFile(null)
    setRemoveExistingLogo(false)
    setPendingLogoCollegeId(null)
    if (!editId) {
      originalEditValues.current = null
      setValues({ ...initialValues })
      return undefined
    }
    let active = true
    getCollegeById(editId).then((response) => {
      if (!active) return
      const record = unwrapCollegeRecord(response)
      const addressRecord = record.addressDetails ?? record.addressInfo ?? {}
      const contactRecord = record.contactDetails ?? record.contactInfo ?? {}
      const principalRecord = record.administration ?? record.principalDetails ?? {}
      const accreditationRecord = record.accreditationDetails && typeof record.accreditationDetails === 'object' ? record.accreditationDetails : {}
      const extended = readCollegeExtendedDetails(record)
      const addressParts = String(record.address ?? '').split(',').map((part) => part.trim())
      const rawType = record.type ?? record.collegeType ?? record.institutionType ?? ''
      const isKnownType = TYPES.includes(rawType)
      const loadedLogo = collegeLogoValue(record) || readCachedCollegeLogo(editId) || (record.code ? readCachedCollegeLogo(record.code) : '') || (record.collegeCode ? readCachedCollegeLogo(record.collegeCode) : '') || (record.name ? readCachedCollegeLogo(record.name) : '') || (record.collegeName ? readCachedCollegeLogo(record.collegeName) : '') || ''
      const logoUrl = getCollegeLogoUrl(editId, loadedLogo)
      // Backend logo URLs need an authorization header, which an <img> element
      // cannot send. They are fetched below and displayed as a blob URL.
      const resolvedLogo = logoUrl && !isBackendCollegeLogo(logoUrl) ? logoUrl : ''
      const cachedDates = readCachedCollegeDates(editId) ||
        (record.code ? readCachedCollegeDates(record.code) : null) ||
        (record.collegeCode ? readCachedCollegeDates(record.collegeCode) : null) ||
        (record.name ? readCachedCollegeDates(record.name) : null) ||
        (record.collegeName ? readCachedCollegeDates(record.collegeName) : null) || {}
      const loadedStartDate = dateInputValue(record.startDate ?? record.StartDate ?? record.start_date ?? extended.startDate ?? cachedDates?.startDate)
      const loadedEndDate = dateInputValue(record.endDate ?? record.EndDate ?? record.end_date ?? extended.endDate ?? cachedDates?.endDate)
      const loadedValues = { ...initialValues, collegeName: record.name ?? record.collegeName ?? record.CollegeName ?? '', collegeCode: record.code ?? record.collegeCode ?? record.CollegeCode ?? '', collegeType: rawType && !isKnownType ? 'Other' : rawType, collegeTypeOther: rawType && !isKnownType ? rawType : '', universityName: record.university ?? record.universityName ?? record.UniversityName ?? '', startDate: loadedStartDate, endDate: loadedEndDate, addressLine1: record.addressLine1 ?? addressRecord.addressLine1 ?? addressParts[0] ?? '', addressLine2: record.addressLine2 ?? addressRecord.addressLine2 ?? addressParts.slice(1).join(', '), area: record.area ?? addressRecord.area ?? extended.area ?? '', district: record.district ?? addressRecord.district ?? extended.district ?? '', city: record.city ?? addressRecord.city ?? record.City ?? '', state: record.state ?? addressRecord.state ?? record.State ?? '', pincode: String(record.pincode ?? addressRecord.pincode ?? record.Pincode ?? ''), country: record.country ?? addressRecord.country ?? 'India', contactNumber: String(record.contact ?? record.contactNumber ?? record.phoneNumber ?? record.mobile ?? record.phone ?? contactRecord.contactNumber ?? contactRecord.phoneNumber ?? contactRecord.mobile ?? contactRecord.phone ?? record.Contact ?? ''), alternateContactNumber: String(record.alternateContact ?? record.alternateContactNumber ?? record.alternatePhoneNumber ?? contactRecord.alternateContactNumber ?? extended.alternateContactNumber ?? ''), email: record.email ?? record.collegeEmail ?? contactRecord.email ?? record.Email ?? '', website: record.website ?? record.Website ?? contactRecord.website ?? contactRecord.Website ?? '', principalName: record.principal ?? record.principalName ?? principalRecord.principalName ?? record.PrincipalName ?? '', principalEmail: record.principalEmail ?? principalRecord.principalEmail ?? extended.principalEmail ?? '', principalContact: String(record.principalContact ?? record.principalPhone ?? principalRecord.principalContact ?? extended.principalContact ?? ''), accreditationBody: record.accreditationBody ?? accreditationRecord.body ?? accreditationRecord.accreditationBody ?? extended.accreditationBody ?? '', accreditationStatus: record.accreditationStatus ?? accreditationRecord.status ?? '', accreditationGrade: record.accreditationGrade ?? accreditationRecord.grade ?? extended.accreditationGrade ?? '', accreditationNumber: record.accreditationNumber ?? accreditationRecord.number ?? extended.accreditationNumber ?? '', validFrom: dateInputValue(record.validFrom ?? record.accreditationValidFrom ?? accreditationRecord.validFrom ?? extended.validFrom), validUntil: dateInputValue(record.validUntil ?? record.accreditationValidUntil ?? accreditationRecord.validUntil ?? extended.validUntil), logo: resolvedLogo, logoName: record.logoName ?? extended.logoName ?? '' }
      setValues(loadedValues)
      originalEditValues.current = loadedValues
      if (logoUrl && isBackendCollegeLogo(logoUrl)) {
        fetchCollegeLogo(logoUrl).then((blob) => {
          if (!active) return
          const objectUrl = URL.createObjectURL(blob)
          logoObjectUrlRef.current = objectUrl
          setValues((current) => ({ ...current, logo: objectUrl }))
          originalEditValues.current = { ...originalEditValues.current, logo: objectUrl }
        }).catch(() => {
          // Some deployments expose the logo URL to the browser but reject a
          // cross-origin fetch. Let the image element make that final request
          // instead of hiding an existing saved logo.
          if (active) setValues((current) => ({ ...current, logo: logoUrl }))
        })
      }
    }).catch((error) => { if (active) setNotice(error.message || 'Unable to load college details.', 'error') }).finally(() => { if (active) setLoadingCollege(false) })
    return () => {
      active = false
      if (logoObjectUrlRef.current) {
        URL.revokeObjectURL(logoObjectUrlRef.current)
        logoObjectUrlRef.current = ''
      }
    }
  }, [editId, setNotice])

  useEffect(() => {
    if (!dirty) return
    localStorage.setItem(draftKey(editId), JSON.stringify({ values, activeTab, progress: draftProgress(values), savedAt: new Date().toISOString() }))
  }, [values, activeTab, dirty, editId])

  useEffect(() => {
    getColleges()
      .then((response) => {
        const records = response?.data?.data ?? response?.data ?? response
        const colleges = Array.isArray(records) ? records : Array.isArray(records?.items) ? records.items : []
        setExistingColleges(colleges)
        setExistingCollegeCodes(colleges.map((college) => String(college.code ?? college.collegeCode ?? '').trim().toUpperCase()).filter(Boolean))
      })
      .catch(() => setExistingCollegeCodes([]))
  }, [])

  useEffect(() => {
    const warn = (event) => { if (dirty) event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => () => window.clearTimeout(redirectTimer.current), [])

  useEffect(() => {
    if (values.pincode.length !== 6) return undefined
    const controller = new AbortController()
    setPincodeStatus('Looking up location...')
    fetch(`https://api.postalpincode.in/pincode/${values.pincode}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Lookup failed'); return response.json() })
      .then(([result]) => {
        const offices = result?.Status === 'Success' && Array.isArray(result.PostOffice) ? result.PostOffice : []
        if (!offices.length) throw new Error('Not found')
        const first = offices[0]
        setPostOffices(offices)
        setValues((current) => ({ ...current, area: current.area || first.Name || '', district: current.district || first.District || '', city: current.city || first.Block || first.District || '', state: current.state || first.State || '', country: current.country || first.Country || 'India' }))
        setPincodeStatus('Location found. Select the area if required; all fields remain editable.')
      })
      .catch((error) => {
        if (error.name !== 'AbortError') { setPostOffices([]); setPincodeStatus('Location not found. Enter the address manually.') }
      })
    return () => controller.abort()
  }, [values.pincode])

  const update = ({ target: { name, value } }) => {
    let next = value
    if (name === 'collegeCode') next = value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (['pincode', 'principalContact'].includes(name)) next = value.replace(/\D/g, '').slice(0, name === 'pincode' ? 6 : 10)
    if (['contactNumber', 'alternateContactNumber'].includes(name)) next = value.replace(/\D/g, '').slice(0, 12)
    if (['principalName', 'city', 'state', 'district'].includes(name)) next = value.replace(/[^a-zA-Z\s.'-]/g, '')
    if (['collegeName', 'universityName'].includes(name)) next = value.replace(/[0-9]/g, '')
    setValues((current) => name === 'pincode' ? { ...current, pincode: next, area: '', district: '', city: '', state: '' } : { ...current, [name]: next })
    if (name === 'pincode') { setPostOffices([]); setPincodeStatus('') }
    setTouched((current) => ({ ...current, [name]: true }))
    setDirty(true); setNotice(''); setSaved(false)
  }

  const normalizeWebsiteField = () => {
    setValues((current) => {
      const website = normalizeWebsite(current.website)
      return website === current.website ? current : { ...current, website }
    })
  }

  const selectLogo = (file) => {
    setLogoError('')
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setLogoError('Choose a PNG, JPG, JPEG, or WEBP image.')
    if (file.size > 2 * 1024 * 1024) {
      setLogoFile(null)
      setValues((current) => ({ ...current, logo: '', logoName: '' }))
      if (fileRef.current) fileRef.current.value = ''
      setLogoError('Logo must be 2 MB or smaller. Save was stopped.')
      setDirty(true)
      return
    }
    setLogoFile(file)
    setRemoveExistingLogo(false)
    const reader = new FileReader()
    reader.onload = () => { setValues((current) => ({ ...current, logo: reader.result, logoName: file.name })); setDirty(true) }
    reader.onerror = () => { setLogoFile(null); setLogoError('The image could not be read. Please try another file.') }
    reader.readAsDataURL(file)
  }

  const touchAll = () => setTouched(Object.keys(initialValues).reduce((all, key) => ({ ...all, [key]: true }), {}))
  const reset = () => { setValues(initialValues); setLogoFile(null); setRemoveExistingLogo(false); setPendingLogoCollegeId(null); setTouched({}); setLogoError(''); setDirty(false); setActiveTab('college'); setHighestUnlockedTab(0); setDialog(null); setNotice('Form reset successfully.') }
  const saveDraft = () => { localStorage.setItem(draftKey(editId), JSON.stringify({ values, activeTab, progress: draftProgress(values), savedAt: new Date().toISOString() })) }
  const requestLeave = () => { if (dirty) { saveDraft(); setNotice(`Draft saved | ${progress}% complete.`); setDialog('leave'); return } navigate('/college-institution-management') }
  const showTab = (tabId) => {
    setActiveTab(tabId)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }

  const goPrevious = () => {
    const currentIndex = FORM_TABS.findIndex((tab) => tab.id === activeTab)
    if (currentIndex > 0) {
      showTab(FORM_TABS[currentIndex - 1].id)
    }
  }

  useEffect(() => {
    if (tabsNavRef.current) {
      const navContainer = tabsNavRef.current
      const activeButton = navContainer.querySelector('button.active')
      if (activeButton) {
        const offsetLeft = activeButton.offsetLeft
        const buttonWidth = activeButton.offsetWidth
        const containerWidth = navContainer.clientWidth
        const targetScrollLeft = offsetLeft - (containerWidth / 2) + (buttonWidth / 2)

        navContainer.scrollTo({
          left: Math.max(0, targetScrollLeft),
          behavior: 'smooth',
        })
      }
    }
  }, [activeTab])
  const saveAndNext = () => {
    const fields = TAB_FIELDS[activeTab]
    setTouched((current) => fields.reduce((next, field) => ({ ...next, [field]: true }), { ...current }))
    if (duplicateReasonForTab) {
      setNotice(duplicateReasonForTab, 'warning')
      return
    }
    if (fields.some((field) => errors[field])) {
      setNotice(errors[fields.find((field) => errors[field])] || 'Please correct the highlighted fields before continuing.', 'warning')
      return
    }
    const currentIndex = FORM_TABS.findIndex((tab) => tab.id === activeTab)
    const nextIndex = currentIndex + 1
    if (nextIndex < FORM_TABS.length) {
      setHighestUnlockedTab((current) => Math.max(current, nextIndex))
      setActiveTab(FORM_TABS[nextIndex].id)
      setNotice('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const submit = async () => {
    touchAll()
    if (logoError || !isValid || submitting) { setDialog(null); return }
    setSubmitting(true)
    let collegeId = editId || pendingLogoCollegeId
    try {
      // Re-read the directory immediately before writing.  The form-level
      // checks are useful feedback, but this closes the gap when another user
      // creates the same college while this form is open.
      const latestResponse = await getColleges()
      const latestData = latestResponse?.data?.data ?? latestResponse?.data ?? latestResponse
      const latestColleges = Array.isArray(latestData) ? latestData : Array.isArray(latestData?.items) ? latestData.items : []
      const normalized = (item) => String(item || '').trim().toLowerCase()
      const duplicate = latestColleges.find((item) => {
        const itemId = normalized(item.id ?? item.collegeId)
        if (editId && itemId === normalized(editId)) return false
        return normalized(item.code ?? item.collegeCode) === normalized(values.collegeCode)
          || normalized(item.name ?? item.collegeName) === normalized(values.collegeName)
          || normalized(item.email ?? item.collegeEmail) === normalized(values.email)
          || normalized(item.contact ?? item.contactNumber ?? item.phoneNumber) === normalized(values.contactNumber)
      })
      if (duplicate) throw new Error('A college with the same name, code, email, or contact number already exists.')
      const website = normalizeWebsite(values.website)
      const college = {
        name: values.collegeName.trim(), code: values.collegeCode, type: values.collegeType === 'Other' ? values.collegeTypeOther.trim() : values.collegeType,
        university: values.universityName.trim(), address: [values.addressLine1, values.addressLine2].map(part => part.trim()).filter(Boolean).join(', '),
        addressLine1: values.addressLine1.trim(), addressLine2: values.addressLine2.trim(),
        area: values.area.trim(), district: values.district.trim(), country: values.country.trim(),
        city: values.city.trim(), state: values.state.trim(), pincode: values.pincode.trim(), contact: values.contactNumber,
        email: values.email.trim(), logo: values.logo || '', clearLogo: Boolean(editId && removeExistingLogo && !logoFile), logoName: values.logoName, principal: values.principalName.trim(),
        accreditation: [values.accreditationBody, values.accreditationGrade, values.accreditationNumber].filter(Boolean).join(' - '),
        accreditationStatus: values.accreditationStatus, accreditationBody: values.accreditationBody.trim(),
        accreditationGrade: values.accreditationGrade.trim(), accreditationNumber: values.accreditationNumber.trim(),
        startDate: values.startDate ? values.startDate.trim() : '',
        endDate: values.endDate ? values.endDate.trim() : '',
        ...(website ? { Website: website } : {}),
        ...(values.alternateContactNumber ? { alternateContactNumber: values.alternateContactNumber } : {}),
        ...(values.principalEmail.trim() ? { principalEmail: values.principalEmail.trim() } : {}),
        ...(values.principalContact ? { principalContact: values.principalContact } : {}),
        ...(values.validFrom ? { validFrom: values.validFrom } : {}),
        ...(values.validUntil ? { validUntil: values.validUntil } : {}),
      }
      if (!collegeId) {
        const response = await createCollege(college)
        const created = unwrapCollegeRecord(response)
        collegeId = created.id ?? created.collegeId ?? response?.data?.id ?? response?.data?.collegeId
        if (!collegeId) throw new Error('College was created, but its identifier was not returned for logo upload.')
        setPendingLogoCollegeId(collegeId)
        rememberCreated('colleges', collegeId)
        academicServiceImports_default?.registerNewCollege?.({
          ...college,
          ...created,
          id: collegeId,
          collegeId,
          name: values.collegeName.trim(),
          collegeName: values.collegeName.trim(),
          code: values.collegeCode,
          collegeCode: values.collegeCode,
          status: 'Active',
        })
        academicServiceImports_default?.clearCache?.()
        eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { collegeId, college: created })
      } else if (editId) {
        await updateCollege(editId, college)
        academicServiceImports_default?.clearCache?.()
        eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { collegeId: editId })
      }
      if (values.startDate || values.endDate) {
        cacheCollegeDates(collegeId, { startDate: values.startDate, endDate: values.endDate }, [values.collegeCode, values.collegeName, college?.code, college?.name])
      } else if (editId) {
        cacheCollegeDates(collegeId, { startDate: '', endDate: '' }, [values.collegeCode, values.collegeName])
      }
      if (values.logo) {
        if (logoFile) {
          try {
            await uploadCollegeLogo(collegeId, logoFile)
          } catch (logoErr) {
            console.warn('Backend logo upload notice:', logoErr.message)
          }
        }
        // Persist the authenticated API endpoint, not the temporary data URL.
        // This keeps the sidebar logo working after a refresh or a new session.
        cacheCollegeLogo(collegeId, getCollegeLogoUrl(collegeId, ''), [values.collegeCode, values.collegeName, college?.code, college?.name])
      } else if (editId && removeExistingLogo) {
        cacheCollegeLogo(collegeId, '', [values.collegeCode, values.collegeName])
      }

      // The list route fetches from the backend when it mounts, so navigating
      // after the success message ensures the new row uses server data and the
      // list's established ordering and pagination rules.
      if (!editId) rememberCreated('colleges', collegeId)
      setDirty(false)
      localStorage.removeItem(draftKey(editId))
      setDialog(null)
      setSaved(true)
      setNotice(editId ? 'College updated successfully.' : 'College added successfully!')
      setPendingLogoCollegeId(null)
      if (!editId) {
        // Reset the wizard to its first step before clearing values. Otherwise
        // the Preview-tab validation sees the fresh blank form and incorrectly
        // raises a "College name is required" toast after a successful save.
        setActiveTab('college')
        setHighestUnlockedTab(0)
        setValues(initialValues)
        setLogoFile(null)
        setRemoveExistingLogo(false)
        setTouched({})
        setLogoError('')
        if (fileRef.current) fileRef.current.value = ''
      }
      window.clearTimeout(redirectTimer.current)
      redirectTimer.current = window.setTimeout(() => navigate('/college-institution-management'), 1000)
    } catch (error) {
      const partialSave = !editId && collegeId
      setNotice(partialSave
        ? `College was created, but the logo upload failed: ${getApiErrorMessage(error)} Submit again to retry the logo upload.`
        : getApiErrorMessage(error), 'error')
      setDialog(null)
    }
    finally { setSubmitting(false) }
  }

  const section = (title, subtitle, content) => <section className="ac-section"><header><h2>{title}</h2><p>{subtitle}</p></header><div className="ac-grid">{content}</div></section>

  return <DashboardLayout><main className="add-college">
    <header className="ac-page-header"><div><h1>{editId ? 'Edit College' : 'Add College'}</h1><p>{editId ? 'Update the college information below.' : 'Create and configure a new college in the college management system.'}</p><span className="ac-draft-progress">Draft progress: <b>{progress}%</b></span></div><button className="ac-back" type="button" onClick={requestLeave}><FiArrowLeft aria-hidden="true" />Back</button></header>
    {loadingCollege && <div className="ac-notice" role="status">Loading college details...</div>}
    <div className="college-form-layout">
      <form className="college-form-main" onSubmit={(event) => event.preventDefault()} noValidate>
        <nav ref={tabsNavRef} className="ac-tabs erp-tabs-bar" aria-label="College form sections" role="tablist">
          {FORM_TABS.map((tab, index) => {
            const isCompleted = index < highestUnlockedTab
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={tab.label}
                title={tab.label}
                aria-disabled={index > highestUnlockedTab}
                disabled={index > highestUnlockedTab}
                className={isActive ? 'active' : isCompleted ? 'completed' : ''}
                onClick={() => showTab(tab.id)}
              >
                <span>{isCompleted ? <FiCheck /> : index + 1}</span>
                {tab.shortLabel || tab.label}
              </button>
            )
          })}
        </nav>
        {activeTab === 'college' && <>
        {section('College Information', 'Core identity and affiliation details.', <>
          <Field label="College Name" name="collegeName" values={values} errors={{ ...errors, ...(duplicateName ? { collegeName: 'A college with this name already exists.' } : {}) }} touched={touched} onChange={update} required maxLength={120} placeholder="e.g. Crescent Institute of Technology" />
          <Field label="College Code" name="collegeCode" values={values} errors={{ ...errors, ...(duplicateCode ? { collegeCode: 'This college code already exists.' } : {}) }} touched={touched} onChange={update} required maxLength={12} placeholder="e.g. CIT2026" />
          <label className="ac-field" htmlFor="ac-collegeType"><span>College Type <b>*</b></span><ProjectSelect id="ac-collegeType" name="collegeType" value={values.collegeType} onChange={update} onBlur={() => setTouched((current) => ({ ...current, collegeType: true }))} aria-invalid={Boolean((touched.collegeType || Boolean(values.collegeType)) && errors.collegeType)}><option value="">Select type</option>{TYPES.map((type) => <option key={type}>{type}</option>)}</ProjectSelect>{(touched.collegeType || Boolean(values.collegeType)) && errors.collegeType && <small className="ac-error" role="alert">{errors.collegeType}</small>}</label>
          {values.collegeType === 'Other' && <Field label="Specify College Type" name="collegeTypeOther" values={values} errors={errors} touched={touched} onChange={update} required maxLength={60} placeholder="e.g. Community College" />}
          <Field label="University Name" name="universityName" values={values} errors={errors} touched={touched} onChange={update} required maxLength={120} placeholder="Affiliated university" readOnly={values.collegeType === 'Deemed University'} />
          <Field label="Start Date" name="startDate" type="date" values={values} errors={errors} touched={touched} onChange={update} />
          <Field label="End Date" name="endDate" type="date" values={values} errors={errors} touched={touched} onChange={update} />
          <div className="ac-upload ac-span-2" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); selectLogo(e.dataTransfer.files[0]) }}>
            <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp" onChange={(e) => selectLogo(e.target.files?.[0])} hidden />
            {values.logo ? (
              <div className="ac-logo-preview">
                <img src={values.logo} alt="College logo preview" onError={() => setValues((v) => ({ ...v, logo: '' }))} />
                <div>
                  <strong>{values.logoName || (logoFile ? logoFile.name : 'College logo')}</strong>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                    <button type="button" className="ac-change-btn" onClick={() => fileRef.current?.click()}>Change image</button>
                    <button type="button" onClick={() => { setLogoFile(null); setRemoveExistingLogo(Boolean(editId)); setValues((v) => ({ ...v, logo: '', logoName: '' })); if (fileRef.current) fileRef.current.value = ''; setDirty(true) }}>Remove image</button>
                  </div>
                </div>
              </div>
            ) : (
              <button type="button" className="ac-upload-button" onClick={() => fileRef.current?.click()}>
                <strong>Upload college logo</strong>
                <span>Click or drag and drop PNG, JPG, JPEG, or WEBP | Max 2 MB</span>
              </button>
            )}
            {logoError && <small className="ac-error" role="alert">{logoError}</small>}
          </div>
        </>)}
        </>}
        {activeTab === 'address' && <>
        {section('Address', 'Official postal address of the college.', <>
          <Field label="Address Line 1" name="addressLine1" values={values} errors={errors} touched={touched} onChange={update} required maxLength={150} placeholder="Building, street, locality" />
          <Field label="Land Mark" name="addressLine2" values={values} errors={errors} touched={touched} onChange={update} maxLength={150} placeholder="Landmark or area (optional)" />
          <Field label="City" name="city" values={values} errors={errors} touched={touched} onChange={update} required maxLength={60} />
          <Field label="State" name="state" values={values} errors={errors} touched={touched} onChange={update} required maxLength={60} />
          <Field label="Pincode" name="pincode" values={values} errors={errors} touched={touched} onChange={update} required maxLength={6} inputMode="numeric" />
          <Field label="Country" name="country" values={values} errors={errors} touched={touched} onChange={update} readOnly />
          <label className="ac-field" htmlFor="ac-area"><span>Area / Post Office</span><SearchableSelect label="Area / Post Office" value={values.area} options={postOffices.map((office) => ({ id: office.Name, name: office.Name, code: office.BranchType || '' }))} onChange={(value) => update({ target: { name: 'area', value } })} placeholder={postOffices.length ? 'Select area' : 'Enter pincode first'} searchPlaceholder="Search area..." noOptionsMessage="No area found." disabled={!postOffices.length} /></label>
          <Field label="District" name="district" values={values} errors={errors} touched={touched} onChange={update} maxLength={60} />
          {pincodeStatus && <p className="ac-lookup-status ac-span-2" role="status">{pincodeStatus}</p>}
        </>)}
        </>}
        {activeTab === 'contact' && section('Contact Information', 'Public college contact channels.', <>
          <Field label="Official Contact Number" name="contactNumber" values={values} errors={{ ...errors, ...(duplicateContact ? { contactNumber: 'This contact number already exists.' } : {}) }} touched={touched} onChange={update} required maxLength={12} inputMode="tel" placeholder="Mobile or Landline with STD code" />
          <Field label="Alternate Contact Number" name="alternateContactNumber" values={values} errors={errors} touched={touched} onChange={update} maxLength={12} inputMode="tel" placeholder="Optional alternate mobile or landline" />
          <Field label="Official Email" name="email" type="email" values={values} errors={{ ...errors, ...(duplicateEmail ? { email: 'This college email already exists.' } : {}) }} touched={touched} onChange={update} required maxLength={120} placeholder="office@college.edu" />
          <Field label="Website" name="website" type="url" values={values} errors={errors} touched={touched} onChange={update} onBlur={normalizeWebsiteField} maxLength={160} placeholder="https://college.edu" />
        </>)}
        {activeTab === 'administration' && section('Administration', 'Principal or institutional head details.', <>
          <Field label="Principal Name" name="principalName" values={values} errors={errors} touched={touched} onChange={update} required maxLength={100} />
          <Field label="Principal Email" name="principalEmail" type="email" values={values} errors={errors} touched={touched} onChange={update} required maxLength={120} />
          <Field label="Principal Contact Number" name="principalContact" values={values} errors={errors} touched={touched} onChange={update} required maxLength={10} inputMode="tel" />
        </>)}
        {activeTab === 'accreditation' && section('Accreditation Details', 'Current accreditation standing and validity.', <>
          <label className="ac-field" htmlFor="ac-accreditationStatus"><span>Accreditation Status</span><ProjectSelect id="ac-accreditationStatus" name="accreditationStatus" value={values.accreditationStatus} onChange={update}><option value="">Select Accreditation Status</option>{ACCREDITATION_STATUSES.map((status) => <option key={status}>{status}</option>)}</ProjectSelect></label>
          <Field label="Accreditation Grade" name="accreditationGrade" values={values} errors={errors} touched={touched} onChange={update} maxLength={20} placeholder="e.g. A+" />
          <Field label="Accreditation Number" name="accreditationNumber" values={values} errors={errors} touched={touched} onChange={update} maxLength={50} />
          <Field label="Valid From" name="validFrom" type="date" values={values} errors={errors} touched={touched} onChange={update} />
          <Field label="Valid Until" name="validUntil" type="date" values={values} errors={errors} touched={touched} onChange={update} />
          {values.accreditationStatus === 'Accredited' && <p className="ac-hint ac-span-2">Complete the accreditation grade, number, and validity dates for a comprehensive record.</p>}
        </>)}
        <footer className="ac-actions ac-next-actions">
          {FORM_TABS.findIndex((tab) => tab.id === activeTab) > 0 && (
            <button type="button" className="ac-secondary" onClick={goPrevious}>
              ← Previous
            </button>
          )}
          {activeTab !== 'accreditation' ? (
            <button type="button" className="ac-primary" onClick={saveAndNext}>
              Save &amp; Next →
            </button>
          ) : (
            <button
              type="button"
              className="ac-primary"
              onClick={submit}
              disabled={!isValid || submitting || loadingCollege || saved}
            >
              {submitting ? 'Saving...' : saved ? 'Saved. Redirecting...' : editId ? 'Save Changes' : 'Submit College'}
            </button>
          )}
        </footer>
      </form>

      <aside className="college-live-preview" aria-label="College live preview">
        <header className="preview-top-bar">
          <span className="preview-live-tag">
            <span className="live-dot" /> LIVE PREVIEW
          </span>
          <span className="preview-sync-hint">Real-time sync</span>
        </header>
        <div className="preview-body-container">
          <div className="preview-hero">
            {values.logo ? (
              <img src={values.logo} alt="College Logo" className="college-preview-logo" />
            ) : (
              <div className="preview-hero-badge">
                {values.collegeCode ? values.collegeCode.slice(0, 4).toUpperCase() : (values.collegeName ? values.collegeName.slice(0, 4).toUpperCase() : 'COL')}
              </div>
            )}
            <div className="preview-hero-details">
              <h3 className="preview-course-title">{values.collegeName.trim() || 'College name preview'}</h3>
              {([values.collegeCode, values.collegeType === 'Other' ? values.collegeTypeOther : values.collegeType, values.universityName].some((value) => String(value || '').trim())) && (
                <p className="preview-course-meta">{[values.collegeCode, values.collegeType === 'Other' ? values.collegeTypeOther : values.collegeType, values.universityName].filter((value) => String(value || '').trim()).join(' - ')}</p>
              ) || <p className="preview-course-meta">College code, type, and university will appear here.</p>}
            </div>
          </div>

          {(() => {
            const collegeTypeDisplay = values.collegeType === 'Other' ? values.collegeTypeOther : values.collegeType
            const hasAddressInput = [values.addressLine1, values.addressLine2, values.area, values.district, values.city, values.state, values.pincode].some((v) => String(v || '').trim())
            const sections = [
              {
                title: 'College Information',
                fields: [
                  ['College Name', values.collegeName],
                  ['College Code', values.collegeCode],
                  ['College Type', collegeTypeDisplay],
                  ['University', values.universityName],
                  ['Start Date', values.startDate],
                  ['End Date', values.endDate],
                ],
              },
              {
                title: 'Address & Location',
                fields: [
                  ['Address Line 1', values.addressLine1],
                  ['Landmark', values.addressLine2],
                  ['Area / Post Office', values.area],
                  ['District', values.district],
                  ['City', values.city],
                  ['State', values.state],
                  ['Pincode', values.pincode],
                  ['Country', hasAddressInput ? values.country : ''],
                ],
              },
              {
                title: 'Contact Information',
                fields: [
                  ['Official Contact', values.contactNumber],
                  ['Alternate Contact', values.alternateContactNumber],
                  ['Official Email', values.email],
                  ['Website', values.website],
                ],
              },
              {
                title: 'Administration',
                fields: [
                  ['Principal Name', values.principalName],
                  ['Principal Email', values.principalEmail],
                  ['Principal Contact', values.principalContact],
                ],
              },
              {
                title: 'Accreditation Details',
                fields: [
                  ['Accreditation Status', values.accreditationStatus],
                  ['Accreditation Body', values.accreditationBody],
                  ['Accreditation Grade', values.accreditationGrade],
                  ['Accreditation Number', values.accreditationNumber],
                  ['Valid From', values.validFrom],
                  ['Valid Until', values.validUntil],
                ],
              },
            ].map((sec) => ({
              ...sec,
              fields: sec.fields.filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== ''),
            })).filter((sec) => sec.fields.length > 0)

            if (sections.length === 0) return <div className="preview-empty-hint">Start entering college details. Your live preview updates as you fill in the form.</div>

            return sections.map((sec) => (
              <div key={sec.title} className="preview-section-group">
                <span className="preview-section-title">{sec.title}</span>
                <div className="preview-kv-grid">
                  {sec.fields.map(([label, text]) => (
                    <div key={label} className="preview-kv-item">
                      <span className="kv-label">{label}</span>
                      <strong className="kv-val" title={String(text).trim()}>{String(text).trim()}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))
          })()}
        </div>
      </aside>
    </div>

    {dialog === 'reset' && <Dialog title="Reset College Form?" onClose={() => setDialog(null)} actions={<><button className="ac-secondary" onClick={() => setDialog(null)}>Cancel</button><button className="ac-danger-btn" onClick={reset}>Reset</button></>}><p>All entered information will be cleared.</p></Dialog>}
    {dialog === 'leave' && <Dialog title="Unsaved Changes" onClose={() => setDialog(null)} actions={<><button className="ac-secondary" onClick={() => setDialog(null)}>Stay</button><button className="ac-danger-btn" onClick={() => navigate('/college-institution-management')}>Leave</button></>}><p>You have unsaved college information. Leave without saving?</p></Dialog>}
  </main></DashboardLayout>
}

return { default: AddCollege }
})()

// CollegeInstitutionManagement screen and private helpers.
const CollegeInstitutionManagementScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const collegeLogoValue = collegeLogoImports_collegeLogoValue
const normalizeCollegeImpact = collegeImpactImports_normalizeCollegeImpact
const countCollegeFaculty = collegeImpactImports_countCollegeFaculty
const facultyApi = apiEndpointsImports_facultyApi
const newestFirst = newestFirstImports_newestFirst
const rememberCreated = newestFirstImports_rememberCreated
const showSuccess = toastImports_showSuccess
const useToastState = useToastStateImports_default
const PrintDetailsButton = ExportMenuImports_PrintDetailsButton
const ExportMenu = ExportMenuImports_default
const collegeColumns = exportColumnsImports_collegeColumns
const collegeSettingsColumns = exportColumnsImports_collegeSettingsColumns
const useState = reactImports_useState
const useEffect = reactImports_useEffect
const useRef = reactImports_useRef
const useNavigate = react_router_domImports_useNavigate
const FiAlertCircle = fiImports_FiAlertCircle
const FiArrowLeft = fiImports_FiArrowLeft
const EyeIcon = fiImports_FiEye
const EditIcon = fiImports_FiEdit2
const FiHome = fiImports_FiHome
const Plus = fiImports_FiPlus
const FiToggleLeft = fiImports_FiToggleLeft
const FiToggleRight = fiImports_FiToggleRight
const FiSearch = fiImports_FiSearch
const FiFilter = fiImports_FiFilter
const FiTrash2 = fiImports_FiTrash2
const DashboardLayout = DashboardLayoutImports_default
const FilterPanel = FilterPanelImports_default
const PAGE_SIZE = TablePaginationImports_PAGE_SIZE
const TablePagination = TablePaginationImports_default
const StatusConfirmDialog = StatusConfirmDialogImports_default
const StatusBadge = StatusBadgeImports_default
const ERP_EVENTS = eventBusImports_ERP_EVENTS
const eventBus = eventBusImports_default
const InfoCard = InfoCardImports_default
const CompactSummary = CompactSummaryImports_default
const createCollegeSettings = collegeApiImports_createCollegeSettings
const cacheCollegeLogo = collegeApiImports_cacheCollegeLogo
const cacheCollegeDates = collegeApiImports_cacheCollegeDates
const fetchCollegeLogo = collegeApiImports_fetchCollegeLogo
const isBackendCollegeLogo = collegeApiImports_isBackendCollegeLogo
const getCollegeLogoUrl = collegeApiImports_getCollegeLogoUrl
const getCollegeLogoEndpoint = collegeApiImports_getCollegeLogoEndpoint
const getCollegeById = collegeApiImports_getCollegeById
const getCollegeDeactivationImpact = collegeApiImports_getCollegeDeactivationImpact
const getCollegeSettings = collegeApiImports_getCollegeSettings
const getColleges = collegeApiImports_getColleges
const isValidWebsite = collegeApiImports_isValidWebsite
const normalizeWebsite = collegeApiImports_normalizeWebsite
const readCollegeExtendedDetails = collegeApiImports_readCollegeExtendedDetails
const readCachedCollegeLogo = collegeApiImports_readCachedCollegeLogo
const readCachedCollegeDates = collegeApiImports_readCachedCollegeDates
const unwrapCollegeRecord = collegeApiImports_unwrapCollegeRecord
const searchColleges = collegeApiImports_searchColleges
const updateCollege = collegeApiImports_updateCollege
const updateCollegeSettings = collegeApiImports_updateCollegeSettings
const updateCollegeStatus = collegeApiImports_updateCollegeStatus
const uploadCollegeLogo = collegeApiImports_uploadCollegeLogo
const WEBSITE_VALIDATION_MESSAGE = collegeApiImports_WEBSITE_VALIDATION_MESSAGE
const showDeactivationBlocked = DeactivationBlockedDialogImports_showDeactivationBlocked

const COLLEGE_TYPES = ['Engineering', 'Arts & Science', 'Medical', 'Management', 'Polytechnic', 'Other']
const NEW_COLLEGE_DRAFT_KEY = 'pirnav-college-draft-new'
const readNewCollegeDraft = () => {
  try { return JSON.parse(localStorage.getItem(NEW_COLLEGE_DRAFT_KEY) || 'null') } catch { return null }
}

const emptyCollege = {
  id: null,
  name: '',
  code: '',
  type: COLLEGE_TYPES[0],
  university: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  contact: '',
  email: '',
  website: '',
  logo: '',
  principal: '',
  accreditation: '',
  status: 'active',
}

// Matches CollegeSettingRequestDto from the Swagger doc
const emptySettingsForm = {
  collegeName: '',
  collegeCode: '',
  collegeEmail: '',
  phoneNumber: '',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  academicYear: '',
  semester: '',
  institutionType: COLLEGE_TYPES[0],
  dateFormat: 'dd-MM-yyyy',
  timeZone: 'Asia/Kolkata',
  status: 1,
}

function AcademicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}

function ContactIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function validateCollege(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'College name is required.'
  if (!values.code.trim()) errors.code = 'College code is required.'
  if (!values.university.trim()) errors.university = 'University name is required.'
  if (!values.city.trim()) errors.city = 'City is required.'
  if (!values.state.trim()) errors.state = 'State is required.'
  if (!values.pincode.trim()) {
    errors.pincode = 'Pincode is required.'
  } else if (!/^\d{6}$/.test(values.pincode.trim())) {
    errors.pincode = 'Pincode must be exactly 6 digits.'
  }
  if (!values.contact.trim()) {
    errors.contact = 'Contact number is required.'
  } else if (!/^\d{10}$/.test(values.contact.trim())) {
    errors.contact = 'Contact number must be exactly 10 digits.'
  }
  if (!values.email.trim()) {
    errors.email = 'Email is required.'
  } else if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (values.website.trim() && !isValidWebsite(normalizeWebsite(values.website))) {
    errors.website = WEBSITE_VALIDATION_MESSAGE
  }
  if (!values.principal.trim()) errors.principal = "Principal's name is required."
  return errors
}

function validateSettings(values) {
  const errors = {}
  if (!values.collegeName.trim()) errors.collegeName = 'College name is required.'
  if (!values.collegeCode.trim()) errors.collegeCode = 'College code is required.'
  if (!values.collegeEmail.trim()) {
    errors.collegeEmail = 'College email is required.'
  } else if (!/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/.test(values.collegeEmail.trim())) {
    errors.collegeEmail = 'Enter a valid email address.'
  }
  return errors
}

const getResponseList = (responseData) => {
  const data = responseData?.data ?? responseData
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.records)) return data.records
  if (data && typeof data === 'object') return [data]
  return []
}

const getApiErrorMessage = (error, fallback) => {
  if (error?.response?.status === 401) return 'Your session has expired. Please sign in again.'
  if (error?.response?.status === 403) return "You don't have permission to manage colleges."
  const responseData = error?.response?.data
  let parsedData = responseData
  if (typeof responseData === 'string') {
    try { parsedData = JSON.parse(responseData) } catch { parsedData = null }
  }
  const rawError = `${typeof responseData === 'string' ? responseData : ''} ${error?.message || ''}`
  const validationFields = Object.keys(parsedData?.errors || {})
  if (/PrincipalEmail/i.test(rawError)) return 'Please enter a valid principal email address.'
  if (validationFields.some((field) => field.toLowerCase() === 'principalemail')) return 'Please enter a valid principal email address.'
  if (validationFields.length) return 'Please check the entered college details and try again.'
  const responseMessage = parsedData?.message || parsedData?.error || (parsedData?.title === 'One or more validation errors occurred.' ? '' : parsedData?.title)
  const errorMessage = /^\s*[{[]/.test(String(error?.message || '')) ? '' : error?.message
  return responseMessage || errorMessage || fallback
}

const getCollegeRecords = (responseData) => {
  const data = responseData?.data ?? responseData
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) return data.items
  if (Array.isArray(data?.colleges)) return data.colleges
  if (Array.isArray(data?.records)) return data.records
  if (Array.isArray(data?.result)) return data.result
  if (Array.isArray(data?.data)) return data.data
  return data && typeof data === 'object' ? [data] : []
}

const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== ''
const displayValue = (value) => hasValue(value) ? value : 'Not provided'

const toFiniteNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

const extractSummaryValue = (source, keys) => {
  if (!source || typeof source !== 'object') return null
  const seen = new Set()
  const queue = [source]

  while (queue.length) {
    const current = queue.shift()
    if (!current || typeof current !== 'object') continue
    const identity = typeof current === 'object' ? JSON.stringify(current) : String(current)
    if (seen.has(identity)) continue
    seen.add(identity)

    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        const value = toFiniteNumber(current[key])
        if (value !== null) return value
      }
    }

    Object.values(current).forEach((entry) => {
      if (entry && typeof entry === 'object') queue.push(entry)
    })
  }

  return null
}

const deriveCollegeSummary = (source, records = []) => {
  const normalizedSource = source?.data ?? source ?? {}
  const defaultCounts = {
    total: records.length,
    active: records.filter((college) => college.status === 'active').length,
    inactive: records.filter((college) => college.status === 'inactive').length,
  }

  const total = extractSummaryValue(normalizedSource, ['totalElements', 'total', 'count', 'totalCount', 'totalRecords']) ?? defaultCounts.total
  const active = extractSummaryValue(normalizedSource, ['activeCount', 'activeTotal', 'active', 'totalActive', 'activeElements']) ?? defaultCounts.active
  const inactive = extractSummaryValue(normalizedSource, ['inactiveCount', 'inactiveTotal', 'inactive', 'totalInactive', 'inactiveElements']) ?? Math.max(total - active, 0)

  return {
    total,
    active,
    inactive,
    hasGlobalMeta: extractSummaryValue(normalizedSource, ['totalElements', 'total', 'count', 'totalCount', 'totalRecords']) !== null || extractSummaryValue(normalizedSource, ['activeCount', 'activeTotal', 'active', 'totalActive', 'activeElements']) !== null || extractSummaryValue(normalizedSource, ['inactiveCount', 'inactiveTotal', 'inactive', 'totalInactive', 'inactiveElements']) !== null,
  }
}

const mapCollege = (record) => {
  const id = record.id ?? record.collegeId ?? record.CollegeId ?? record.Id
  const code = record.code ?? record.collegeCode ?? record.CollegeCode ?? ''
  const name = record.name ?? record.collegeName ?? record.CollegeName ?? ''
  const logoValue = collegeLogoValue(record)
  const cachedLogo = (id ? readCachedCollegeLogo(id) : '') || (code ? readCachedCollegeLogo(code) : '') || (name ? readCachedCollegeLogo(name) : '') || (record.collegeName ? readCachedCollegeLogo(record.collegeName) : '') || (record.collegeCode ? readCachedCollegeLogo(record.collegeCode) : '')
  if (logoValue) {
    cacheCollegeLogo(id, logoValue, [code, name, record.collegeCode, record.collegeName])
  }
  const address = record.addressDetails ?? record.addressInfo ?? {}
  const contact = record.contactDetails ?? record.contactInfo ?? {}
  const administration = record.administration ?? record.principalDetails ?? {}
  const accreditation = record.accreditationDetails && typeof record.accreditationDetails === 'object' ? record.accreditationDetails : {}
  const extended = readCollegeExtendedDetails(record)
  const cachedDates = (id ? readCachedCollegeDates(id) : null) || (code ? readCachedCollegeDates(code) : null) || (name ? readCachedCollegeDates(name) : null) || (record.collegeName ? readCachedCollegeDates(record.collegeName) : null) || (record.collegeCode ? readCachedCollegeDates(record.collegeCode) : null) || {}
  const startDate = record.startDate ?? record.StartDate ?? record.start_date ?? extended.startDate ?? cachedDates?.startDate ?? ''
  const endDate = record.endDate ?? record.EndDate ?? record.end_date ?? extended.endDate ?? cachedDates?.endDate ?? ''
  if (startDate || endDate) {
    cacheCollegeDates(id, { startDate, endDate }, [code, name, record.collegeCode, record.collegeName])
  }
  return ({
  id,
  name: record.name ?? record.collegeName ?? record.CollegeName ?? '',
  code: record.code ?? record.collegeCode ?? record.CollegeCode ?? '',
  type: record.type ?? record.collegeType ?? record.CollegeType ?? record.institutionType ?? COLLEGE_TYPES[0],
  university: record.university ?? record.universityName ?? record.UniversityName ?? '',
  startDate,
  endDate,
  address: record.address ?? record.addressLine1 ?? record.Address ?? '',
  addressLine1: record.addressLine1 ?? address.addressLine1 ?? record.address ?? '',
  addressLine2: record.addressLine2 ?? address.addressLine2 ?? '',
  area: record.area ?? address.area ?? extended.area ?? '',
  district: record.district ?? address.district ?? extended.district ?? '',
  country: record.country ?? address.country ?? '',
  city: record.city ?? address.city ?? record.City ?? '',
  state: record.state ?? address.state ?? record.State ?? '',
  pincode: String(record.pincode ?? address.pincode ?? record.Pincode ?? ''),
  contact: String(record.contact ?? record.contactNumber ?? record.phoneNumber ?? record.mobile ?? record.phone ?? contact.contactNumber ?? contact.phoneNumber ?? contact.mobile ?? contact.phone ?? record.Contact ?? ''),
  alternateContact: String(record.alternateContact ?? record.alternateContactNumber ?? record.alternatePhoneNumber ?? contact.alternateContactNumber ?? extended.alternateContactNumber ?? ''),
  email: record.email ?? record.collegeEmail ?? contact.email ?? record.Email ?? '',
  website: record.website ?? record.Website ?? contact.website ?? contact.Website ?? '',
  logo: getCollegeLogoUrl(id, logoValue || cachedLogo, [code, name, record.collegeCode, record.collegeName]),
  principal: record.principal ?? record.principalName ?? administration.principalName ?? record.PrincipalName ?? '',
  principalEmail: record.principalEmail ?? administration.principalEmail ?? extended.principalEmail ?? '',
  principalContact: record.principalContact ?? record.principalPhone ?? administration.principalContact ?? extended.principalContact ?? '',
  accreditation: extended.accreditationSummary ?? '',
  accreditationStatus: record.accreditationStatus ?? accreditation.status ?? extended.accreditationStatus ?? '',
  accreditationBody: record.accreditationBody ?? accreditation.body ?? accreditation.accreditationBody ?? extended.accreditationBody ?? '',
  accreditationGrade: record.accreditationGrade ?? accreditation.grade ?? extended.accreditationGrade ?? '',
  accreditationNumber: record.accreditationNumber ?? accreditation.number ?? extended.accreditationNumber ?? '',
  validFrom: record.validFrom ?? record.accreditationValidFrom ?? accreditation.validFrom ?? extended.validFrom ?? '',
  validUntil: record.validUntil ?? record.accreditationValidUntil ?? accreditation.validUntil ?? extended.validUntil ?? '',
  status: String(record.status ?? (record.isActive === false ? 'inactive' : 'active')).toLowerCase() === 'active' || record.isActive === true || Number(record.status) === 1 ? 'active' : 'inactive',
  })
}

function CollegeEmblemBadge({ name, code, className = 'cm-logo-thumb' }) {
  const cleanCode = String(code || '').trim().toUpperCase()
  const cleanName = String(name || '').trim()
  const displayCode = cleanCode || cleanName.split(/\s+/).filter(Boolean).map(w => w[0]).join('').slice(0, 3).toUpperCase() || 'COL'

  const seed = Array.from(cleanCode || cleanName).reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const palettes = [
    { bg1: '#0F172A', bg2: '#0F172A', accent: '#f2bc35', text: '#ffffff' },
    { bg1: '#064e3b', bg2: '#059669', accent: '#34d399', text: '#ffffff' },
    { bg1: '#123F73', bg2: '#1769C2', accent: '#A9D3F7', text: '#ffffff' },
    { bg1: '#831843', bg2: '#db2777', accent: '#fbcfe8', text: '#ffffff' },
    { bg1: '#0F172A', bg2: '#1769C2', accent: '#C7DFFF', text: '#ffffff' },
    { bg1: '#78350f', bg2: '#1769C2', accent: '#C7DFFF', text: '#ffffff' },
  ]
  const palette = palettes[seed % palettes.length]

  return (
    <div
      className={`cm-logo-emblem ${className}`}
      title={`${cleanName}${cleanCode ? ` (${cleanCode})` : ''}`}
      style={{
        background: `linear-gradient(135deg, ${palette.bg1} 0%, ${palette.bg2} 100%)`,
        borderColor: `${palette.accent}88`,
        color: palette.text,
      }}
    >
      <svg className="cm-emblem-icon" viewBox="0 0 24 24" fill="none" stroke={palette.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
      <span className="cm-emblem-code">{displayCode}</span>
    </div>
  )
}

function CollegeLogoImage({ src, fallbackSrc = '', alt, code, className = 'cm-logo-thumb', onError }) {
  const [objectUrl, setObjectUrl] = useState('')
  const [hasError, setHasError] = useState(false)
  const [failedSource, setFailedSource] = useState('')
  const source = !src || failedSource === src ? fallbackSrc : src
  const retryFallback = () => {
    if (fallbackSrc && source !== fallbackSrc) setFailedSource(src)
    else { setHasError(true); onErrorRef.current?.() }
  }
  const onErrorRef = useRef(onError)
  const isProtectedLogo = Boolean(source) && isBackendCollegeLogo(source)
  const isDirectImage = Boolean(source) && !isProtectedLogo

  useEffect(() => { onErrorRef.current = onError }, [onError])

  useEffect(() => {
    setHasError(false)
    if (!isProtectedLogo) {
      setObjectUrl('')
      return undefined
    }

    setObjectUrl('')
    let active = true
    let nextObjectUrl = ''
    fetchCollegeLogo(source)
      .then((image) => {
        nextObjectUrl = URL.createObjectURL(image)
        if (active) setObjectUrl(nextObjectUrl)
      })
      .catch(() => {
        if (active) {
          if (fallbackSrc && source !== fallbackSrc) setFailedSource(src)
          else { setHasError(true); onErrorRef.current?.() }
        }
      })

    return () => {
      active = false
      if (nextObjectUrl) URL.revokeObjectURL(nextObjectUrl)
    }
  }, [src, source, fallbackSrc, isProtectedLogo])

  if (isDirectImage && !hasError) {
    return (
      <img
        src={source}
        alt={alt}
        className={className}
        onError={retryFallback}
      />
    )
  }

  if (isProtectedLogo && objectUrl && !hasError) {
    return (
      <img
        src={objectUrl}
        alt={alt}
        className={className}
        onError={retryFallback}
      />
    )
  }

  return <CollegeEmblemBadge name={alt} code={code} className={className} />
}

const collegePayload = (college, hasNewLogo = false) => ({
  name: college.name.trim(),
  code: college.code.trim(),
  type: college.type,
  university: college.university.trim(),
  address: college.address.trim(),
  city: college.city.trim(),
  state: college.state.trim(),
  pincode: college.pincode.trim(),
  contact: college.contact.trim(),
  email: college.email.trim(),
  ...(normalizeWebsite(college.website) ? { Website: normalizeWebsite(college.website) } : {}),
  logo: college.logo || '',
  principal: college.principal.trim(),
  accreditation: college.accreditation.trim(),
})

const mapRecordToForm = (record) => ({
  collegeName: record.collegeName ?? '',
  collegeCode: record.collegeCode ?? '',
  collegeEmail: record.collegeEmail ?? '',
  phoneNumber: record.phoneNumber ?? '',
  website: record.website ?? record.Website ?? '',
  addressLine1: record.addressLine1 ?? '',
  addressLine2: record.addressLine2 ?? '',
  city: record.city ?? '',
  state: record.state ?? '',
  pincode: record.pincode ?? '',
  academicYear: record.academicYear ?? '',
  semester: record.semester ?? '',
  institutionType: record.institutionType || COLLEGE_TYPES[0],
  dateFormat: record.dateFormat ?? 'dd-MM-yyyy',
  timeZone: record.timeZone ?? 'Asia/Kolkata',
  status: record.status ?? 1,
})

function CollegeInstitutionManagement({ initialView = 'list' }) {
  const navigate = useNavigate()
  const [colleges, setColleges] = useState([])
  const [isCollegesLoading, setIsCollegesLoading] = useState(true)
  const [collegeError, setCollegeError] = useToastState('', 'error')
  const [isCollegeSaving, setIsCollegeSaving] = useState(false)
  const [isCollegeDetailsLoading, setIsCollegeDetailsLoading] = useState(false)

  const [viewMode, setViewMode] = useState(initialView) // list | edit | details | settings | settings-form
  const [activeId, setActiveId] = useState(null)
  const [formValues, setFormValues] = useState(emptyCollege)
  const [editLogoFile, setEditLogoFile] = useState(null)
  const [errors, setErrors] = useToastState({}, 'error')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [collegeDraft, setCollegeDraft] = useState(readNewCollegeDraft)

  // College Settings state - real list from the backend
  const [settingsList, setSettingsList] = useState([])
  const [isSettingsLoading, setIsSettingsLoading] = useState(false)
  const [settingsListError, setSettingsListError] = useToastState('', 'error')

  const [settingsForm, setSettingsForm] = useState(emptySettingsForm)
  const [settingsErrors, setSettingsErrors] = useToastState({}, 'error')
  const [activeSettingsId, setActiveSettingsId] = useState(null)
  const [isSettingsSaving, setIsSettingsSaving] = useState(false)
  const [settingsSubmitError, setSettingsSubmitError] = useToastState('', 'error')
  const [settingsPage, setSettingsPage] = useState(1)
  const statusLock = useRef(false)
  const [statusError, setStatusError] = useToastState('', 'error')
  const [, setStatusNotice] = useToastState('', 'success')
  const [pendingStatus, setPendingStatus] = useState(null)
  const [collegeImpact, setCollegeImpact] = useState(null)
  const [isStatusSaving, setIsStatusSaving] = useState(false)
  const [collegeSummary, setCollegeSummary] = useState({ total: null, active: null, inactive: null, loading: true, error: '' })

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  // Logos that failed to load (broken/invalid URLs) fall back to the initial-letter avatar
  const [brokenLogoIds, setBrokenLogoIds] = useState(() => new Set())
  const markLogoBroken = (id) => setBrokenLogoIds((current) => new Set(current).add(id))

  const activeCollege = colleges.find((c) => String(c.id) === String(activeId)) || null

  const refreshCollegeSummary = async () => {
    try {
      const response = await getColleges()
      const records = newestFirst('colleges', getCollegeRecords(response?.data ?? response)).map(mapCollege)
      const summary = deriveCollegeSummary(response?.data ?? response, records)
      setCollegeSummary({
        total: summary.total,
        active: summary.active,
        inactive: summary.inactive,
        loading: false,
        error: '',
      })
      return records
    } catch (error) {
      setCollegeSummary({ total: null, active: null, inactive: null, loading: false, error: getApiErrorMessage(error, 'Unable to load college summary.') })
      return []
    }
  }

  const filteredColleges = colleges.filter((college) =>
    (!typeFilter || college.type === typeFilter) &&
    (!statusFilter || college.status === statusFilter)
  )
  const availableCollegeTypes = [...new Set(colleges.map((college) => college.type).filter(Boolean))]

  // Calculate pagination details
  const totalPages = Math.max(1, Math.ceil(filteredColleges.length / itemsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredColleges.length)
  const displayedColleges = filteredColleges.slice(startIndex, endIndex)
  const settingsTotalPages = Math.max(1, Math.ceil(settingsList.length / PAGE_SIZE))
  const currentSettingsPage = Math.min(settingsPage, settingsTotalPages)
  const displayedSettings = settingsList.slice((currentSettingsPage - 1) * PAGE_SIZE, currentSettingsPage * PAGE_SIZE)

  const loadColleges = async (term = '') => {
    setIsCollegesLoading(true)
    setCollegeError('')
    try {
      const response = term.trim() ? await searchColleges(term.trim()) : await getColleges()
      const records = newestFirst('colleges', getCollegeRecords(response?.data ?? response)).map(mapCollege)
      setColleges(newestFirst('colleges', records))

      if (!term.trim()) {
        const summary = deriveCollegeSummary(response?.data ?? response, records)
        setCollegeSummary({
          total: summary.total,
          active: summary.active,
          inactive: summary.inactive,
          loading: false,
          error: '',
        })
      }
    } catch (error) {
      setColleges([])
      setCollegeError(getApiErrorMessage(error, 'Unable to load colleges. Please try again.'))
      if (!searchTerm.trim()) {
        setCollegeSummary({ total: null, active: null, inactive: null, loading: false, error: getApiErrorMessage(error, 'Unable to load college summary.') })
      }
    } finally {
      setIsCollegesLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => loadColleges(searchTerm), searchTerm.trim() ? 300 : 0)
    return () => window.clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const refreshDraft = () => setCollegeDraft(readNewCollegeDraft())
    window.addEventListener('storage', refreshDraft)
    const timer = window.setInterval(refreshDraft, 1000)
    return () => { window.removeEventListener('storage', refreshDraft); window.clearInterval(timer) }
  }, [])

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  const updateField = ({ target: { name, value } }) => {
    setFormValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: '' }))
  }

  const normalizeEditWebsite = () => {
    setFormValues((current) => ({ ...current, website: normalizeWebsite(current.website) }))
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    // Use the same server-safe image rules as the Add College screen. The
    // edit panel previously accepted any file and only failed after it had
    // been submitted to the logo endpoint.
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      e.target.value = ''
      setCollegeError('Choose a PNG, JPG, JPEG, or WEBP image for the college logo.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      e.target.value = ''
      setCollegeError('College logo must be 2 MB or smaller.')
      return
    }
    setCollegeError('')
    setEditLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => {
      setFormValues((current) => ({ ...current, logo: reader.result }))
    }
    reader.onerror = () => {
      setEditLogoFile(null)
      setCollegeError('The selected college logo could not be read. Please choose another image.')
    }
    reader.readAsDataURL(file)
  }

  const openAdd = () => {
    navigate('/college-institution-management/add')
  }

  const openEdit = async (college) => {
    navigate(`/college-institution-management/add?edit=${encodeURIComponent(college.id)}`)
  }

  const openDetails = async (college) => {
    setIsCollegeDetailsLoading(true)
    setCollegeError('')
    setActiveId(college.id)
    setViewMode('details')
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    try {
      const response = await getCollegeById(college.id)
      const detailRecord = unwrapCollegeRecord(response)
      const detail = mapCollege(Object.keys(detailRecord).length ? detailRecord : college)
      setColleges((current) => current.map((item) => (String(item.id) === String(detail.id) ? detail : item)))
    } catch (error) {
      setCollegeError(getApiErrorMessage(error, 'Unable to load college details. Please try again.'))
    } finally {
      setIsCollegeDetailsLoading(false)
    }
  }

  const backToList = () => {
    if (initialView === 'settings') {
      navigate('/college-institution-management')
      return
    }
    setViewMode('list')
    setActiveId(null)
    setErrors({})
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const nextErrors = validateCollege(formValues)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    if (!activeId || isCollegeSaving) return

    setIsCollegeSaving(true)
    setCollegeError('')
    try {
      const response = await updateCollege(activeId, collegePayload(formValues, Boolean(editLogoFile)))
      if (editLogoFile || formValues.logo) {
        if (editLogoFile) {
          try {
            await uploadCollegeLogo(activeId, editLogoFile)
          } catch (logoErr) {
            console.warn('Backend logo upload notice:', logoErr.message)
          }
        }
        // The server persists only a filename. Cache its logo endpoint so the
        // sidebar can load the uploaded image after navigation/reload.
        cacheCollegeLogo(activeId, getCollegeLogoUrl(activeId, ''), [formValues.code, formValues.name, formValues.collegeCode, formValues.collegeName])
        setBrokenLogoIds((current) => { const next = new Set(current); next.delete(activeId); return next })
      }
      const updated = mapCollege((response.data?.data ?? response.data) || { ...formValues, id: activeId })
      setColleges((current) => current.map((college) => (college.id === activeId ? updated : college)))
      backToList()
      eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED, { collegeId: activeId })
      showSuccess('College updated successfully.'); await Promise.all([loadColleges(searchTerm), refreshCollegeSummary()])
    } catch (error) {
      setCollegeError(getApiErrorMessage(error, 'Unable to update this college. Please try again.'))
    } finally {
      setIsCollegeSaving(false)
    }
  }

  const loadCollegeImpact = async (collegeId) => {
    try {
      const response = await getCollegeDeactivationImpact(collegeId)
      const impact = response.data?.data
      const facultyCount = impact && impact.facultyCount == null
        ? await countCollegeFaculty(facultyApi.getAll, collegeId)
        : undefined
      return normalizeCollegeImpact(impact, facultyCount)
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Unable to verify associated data. The college was not deactivated. Please retry.'))
    }
  }

  const showCollegeBlocked = (college, impact) => showDeactivationBlocked({
    entity: 'college', name: college.name, ...impact,
  })

  const toggleStatus = async (college) => {
    if (statusLock.current) return
    setStatusError('')
    setStatusNotice('')
    const nextStatus = college.status === 'active' ? 'inactive' : 'active'
    setCollegeImpact(null)
    if (nextStatus === 'inactive') {
      try {
        const impact = await loadCollegeImpact(college.id)
        if (impact.totalCount > 0) {
          showCollegeBlocked(college, impact)
          return
        }
        setCollegeImpact(impact)
      } catch (error) {
        setStatusError(`${college.name}: ${error.message}`)
        return
      }
    }
    setPendingStatus({ college, nextStatus })
  }
  const confirmStatusChange = async () => {
    if (!pendingStatus || statusLock.current) return
    statusLock.current = true
    const { college, nextStatus } = pendingStatus
    if (nextStatus === 'inactive' && collegeImpact?.totalCount > 0) {
      setPendingStatus(null)
      showCollegeBlocked(college, collegeImpact)
      statusLock.current = false
      return
    }
    setIsStatusSaving(true)
    setStatusError('')
    try {
      const response = await updateCollegeStatus(college.id, nextStatus === 'active' ? 1 : 0)
      if (response.data?.success === false) throw new Error('College status could not be updated. Please try again.')
      eventBus.emit(ERP_EVENTS.ACADEMIC_UPDATED)
      setPendingStatus(null)
      setCollegeImpact(null)
      setStatusNotice(nextStatus === 'active' ? 'College activated successfully.' : 'College deactivated successfully.')
      await Promise.all([loadColleges(searchTerm), refreshCollegeSummary()])
    } catch (error) {
      if (error.response?.data?.impact) {
        setPendingStatus(null)
        showCollegeBlocked(college, error.response.data.impact)
        return
      }
      setStatusError(getApiErrorMessage(error, 'Unable to update college status. Please try again.'))
    } finally {
      statusLock.current = false
      setIsStatusSaving(false)
    }
  }

  // -- College Settings: list --
  const fetchSettingsList = async () => {
    setIsSettingsLoading(true)
    setSettingsListError('')
    try {
      const response = await getCollegeSettings()
      setSettingsList(newestFirst('college-settings', getResponseList(response.data)))
      setSettingsPage(1)
    } catch (error) {
      setSettingsListError(getApiErrorMessage(error, 'Unable to load college settings. Please try again.'))
    } finally {
      setIsSettingsLoading(false)
    }
  }

  useEffect(() => {
    if (initialView === 'settings') fetchSettingsList()
  }, [initialView])

  const backToSettingsList = () => {
    setSettingsForm({ ...emptySettingsForm })
    setViewMode('settings')
    setActiveSettingsId(null)
    setSettingsErrors({})
    setSettingsSubmitError('')
  }

  const openAddSettings = () => {
    setSettingsForm(emptySettingsForm)
    setActiveSettingsId(null)
    setSettingsErrors({})
    setSettingsSubmitError('')
    setViewMode('settings-form')
  }

  const openEditSettings = (record) => {
    setSettingsForm(mapRecordToForm(record))
    setActiveSettingsId(record.id ?? null)
    setSettingsErrors({})
    setSettingsSubmitError('')
    setViewMode('settings-form')
  }

  const updateSettingsField = ({ target: { name, value } }) => {
    setSettingsForm((current) => ({
      ...current,
      [name]: name === 'status' ? Number(value) : value,
    }))
    setSettingsErrors((current) => ({ ...current, [name]: '' }))
  }

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    const nextErrors = validateSettings(settingsForm)
    setSettingsErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSettingsSaving(true)
    setSettingsSubmitError('')
    try {
      if (activeSettingsId) {
        await updateCollegeSettings(activeSettingsId, settingsForm)
      } else {
        rememberCreated('college-settings', await createCollegeSettings(settingsForm))
        setSettingsPage(1)
      }
      showSuccess('College settings saved successfully.'); await fetchSettingsList()
      setSettingsForm({ ...emptySettingsForm })
    setViewMode('settings')
    } catch (error) {
      setSettingsSubmitError(getApiErrorMessage(error, 'Unable to save college settings. Please try again.'))
    } finally {
      setIsSettingsSaving(false)
    }
  }

  const summaryCards = [
    { label: 'Total', value: collegeSummary.total, tone: 'default' },
    { label: 'Active', value: collegeSummary.active, tone: 'active' },
    { label: 'Inactive', value: collegeSummary.inactive, tone: 'inactive' },
  ]

  return (
    <DashboardLayout>
      <div className="college-management">
        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <>
            <header className="cm-header management-page__heading">
              <div>
                <h1>College Management</h1>
                <p>Manage colleges, institutional details, and academic configurations.</p>
              </div>
              <CompactSummary
                label="College status summary"
                items={summaryCards.map(({ label, value, tone }) => ({
                  label,
                  value: collegeSummary.loading || value === null ? '—' : Number(value).toLocaleString('en-IN'),
                  tone,
                }))}
              />
            </header>

            {collegeSummary.error && !collegeError && (
              <p className="cm-summary-error" role="alert">{collegeSummary.error}</p>
            )}

            <section className="cm-panel course-directory">
              <header className="course-directory-heading">
                <div>
                  <span className="cm-eyebrow">College Directory</span>
                  <p>{filteredColleges.length} records</p>
                </div>
                <div className="directory-export-actions">
                  <ExportMenu
                    rows={filteredColleges}
                    columns={collegeColumns}
                    title="Colleges"
                    filename="colleges"
                    loading={isCollegesLoading || Boolean(collegeError)}
                    scope="Current filtered loaded results"
                  />
                  <button type="button" className="cm-button" onClick={openAdd}>
                    <Plus aria-hidden="true" /> Add College
                  </button>
                </div>
              </header>

              <FilterPanel active={Boolean(searchTerm || typeFilter || statusFilter)} onClear={() => { setSearchTerm(''); setTypeFilter(''); setStatusFilter(''); setCurrentPage(1); loadColleges('') }}>
                <div className="course-toolbar">
                  <label className="course-search">
                    <FiSearch />
                    <input
                      type="text"
                      placeholder="Search by name, code or city..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      aria-label="Search colleges"
                    />
                  </label>
                  <ProjectSelect aria-label="Filter colleges by type" value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setCurrentPage(1) }}>
                    <option value="">Select Type</option>
                    {availableCollegeTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </ProjectSelect>
                  <ProjectSelect aria-label="Filter colleges by status" value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setCurrentPage(1) }}>
                    <option value="">Select Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </ProjectSelect>
                </div>
              </FilterPanel>

            {isCollegesLoading ? (
              <div className="cm-empty">
                <p>Loading colleges...</p>
              </div>
            ) : collegeError ? (
              <div className="cm-empty cm-empty--error" role="alert">
                <p>{collegeError}</p>
                <button type="button" className="cm-secondary-btn" onClick={() => loadColleges(searchTerm)}>
                  Retry
                </button>
              </div>
            ) : filteredColleges.length === 0 && !collegeDraft?.values ? (
              <div className="cm-empty">
                <p>No colleges found.</p>
                <button type="button" className="cm-primary-btn" onClick={openAdd}>
                  <Plus aria-hidden="true" /> Add your first college
                </button>
              </div>
            ) : (
              <>
                <div className="cm-table-wrap">
                  <table className="cm-table">
                    <thead>
                      <tr>
                        <th className="col-logo table-center" style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}>Logo</th>
                        <th className="col-name table-left" style={{ width: '32%' }}>College Name</th>
                        <th className="col-code table-center" style={{ width: '120px' }}>Code</th>
                        <th className="col-type table-left" style={{ width: '24%' }}>Type</th>
                        <th className="col-status table-center" style={{ width: '130px' }}>Status</th>
                        <th className="col-actions table-center" style={{ width: '110px', minWidth: '110px', maxWidth: '110px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {collegeDraft?.values && (
                        <tr className="cm-draft-row">
                          <td className="col-logo table-center"><span className="cm-draft-row__mark">D</span></td>
                          <td className="col-name table-left">
                            <button
                              type="button"
                              className="cm-name-link table-cell-truncate cm-college-name"
                              onClick={() => navigate('/college-institution-management/add')}
                              title="Resume draft"
                            >
                              {collegeDraft.values.collegeName || 'New college draft'}
                            </button>
                            <small className="cm-draft-row__label">Draft saved</small>
                          </td>
                          <td className="col-code table-center"><code>{collegeDraft.values.collegeCode || '—'}</code></td>
                          <td className="col-type table-left"><span className="table-cell-truncate" style={{ textAlign: 'left', margin: 0 }} title={collegeDraft.values.institutionType || '—'}>{collegeDraft.values.institutionType || '—'}</span></td>
                          <td className="col-status table-center"><StatusBadge tone="pending">Pending</StatusBadge></td>
                          <td className="col-actions table-center"><div className="cm-actions table-actions-group"><button type="button" className="table-action-btn action-edit cm-action-icon-btn cm-edit-action" title="Resume draft" aria-label="Resume draft" onClick={() => navigate('/college-institution-management/add')}><EditIcon /></button><button type="button" className="table-action-btn action-deactivate cm-action-icon-btn cm-danger cm-discard-action" title="Discard draft" aria-label="Discard draft" onClick={() => { localStorage.removeItem(NEW_COLLEGE_DRAFT_KEY); setCollegeDraft(null) }}><FiTrash2 aria-hidden="true" /></button></div></td>
                        </tr>
                      )}
                      {displayedColleges.map((college) => (
                        <tr key={college.id}>
                          <td className="col-logo table-center">
                            <CollegeLogoImage
                              src={college.logo}
                              fallbackSrc={getCollegeLogoEndpoint(college.id)}
                              alt={college.name}
                              code={college.code}
                              className="cm-logo-thumb"
                              onError={() => markLogoBroken(college.id)}
                            />
                          </td>
                          <td className="col-name table-left">
                            <button
                              type="button"
                              className="cm-name-link table-cell-truncate cm-college-name"
                              onClick={() => openDetails(college)}
                              title={college.name}
                              aria-label={`View details for ${college.name}`}
                            >
                              {college.name}
                            </button>
                          </td>
                          <td className="col-code table-center"><code>{college.code}</code></td>
                          <td className="col-type table-left"><span className="table-cell-truncate" style={{ textAlign: 'left', margin: 0 }} title={college.type}>{college.type}</span></td>
                          <td className="col-status table-center">
                            <StatusBadge value={college.status === 'active' ? 'Active' : 'Inactive'} />
                          </td>
                          <td className="col-actions table-center">
                            <div className="cm-actions table-actions-group">
                              <button
                                type="button"
                                className="table-action-btn action-edit cm-action-icon-btn cm-edit-action"
                                title={`Edit ${college.name}`}
                                aria-label={`Edit ${college.name}`}
                                onClick={() => openEdit(college)}
                              >
                                <EditIcon />
                              </button>
                              <button
                                type="button"
                                className={`table-action-btn cm-action-icon-btn cm-status-action ${college.status === 'active' ? 'action-activate cm-success' : 'action-deactivate cm-danger'}`}
                                title={college.status === 'active' ? `Deactivate ${college.name}` : `Activate ${college.name}`}
                                aria-label={college.status === 'active' ? `Deactivate ${college.name}` : `Activate ${college.name}`}
                                onClick={() => toggleStatus(college)}
                              >
                                {college.status === 'active' ? <FiToggleRight data-status="active" /> : <FiToggleLeft data-status="inactive" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination Controls */}
                <div className="course-pagination">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={safeCurrentPage === 1}
                  >
                    Previous
                  </button>
                  <span className="pagination-status">Page {safeCurrentPage} of {totalPages}</span>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={safeCurrentPage === totalPages}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
            </section>
          </>
        )}

        {/* EDIT COLLEGE FORM MODAL */}
        {viewMode === 'edit' && (
          <>
            <button type="button" className="cm-modal-backdrop" aria-label="Close form dialog" onClick={backToList} />
            <form className="cm-form cm-modal-card" onSubmit={handleSave} noValidate>
              <header className="cm-header">
                <div>
                  <h1>Edit College</h1>
                  <p>Fill in the college's details below.</p>
                </div>
                <button type="button" className="cm-secondary-btn" onClick={backToList}>
                  <FiArrowLeft /> Back
                </button>
              </header>

              {isCollegeDetailsLoading && <p>Loading college details...</p>}
              {collegeError && <p className="cm-field-error" role="alert">{collegeError}</p>}

              <div className="cm-form-grid">
                <label>
                  <span>College Name *</span>
                  <input type="text" name="name" value={formValues.name} onChange={updateField} placeholder="e.g. Engineering College Name" />
                  {errors.name && <p className="cm-field-error">{errors.name}</p>}
                </label>

                <label>
                  <span>College Code *</span>
                  <input type="text" name="code" value={formValues.code} onChange={updateField} placeholder="e.g. ABCE001" />
                  {errors.code && <p className="cm-field-error">{errors.code}</p>}
                </label>

                <label>
                  <span>College Type *</span>
                  <ProjectSelect name="type" value={formValues.type} onChange={updateField}>
                    <option value="">Select College Type</option>
                    {COLLEGE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </ProjectSelect>
                </label>

                <label>
                  <span>University Name *</span>
                  <input type="text" name="university" value={formValues.university} onChange={updateField} placeholder="Affiliated university" />
                  {errors.university && <p className="cm-field-error">{errors.university}</p>}
                </label>

                <label className="cm-span-2">
                  <span>Address *</span>
                  <textarea name="address" value={formValues.address} onChange={updateField} rows={2} placeholder="Street, area, landmark" />
                </label>

                <label>
                  <span>City *</span>
                  <input type="text" name="city" value={formValues.city} onChange={updateField} />
                  {errors.city && <p className="cm-field-error">{errors.city}</p>}
                </label>

                <label>
                  <span>State *</span>
                  <input type="text" name="state" value={formValues.state} onChange={updateField} />
                  {errors.state && <p className="cm-field-error">{errors.state}</p>}
                </label>

                <label>
                  <span>Pincode *</span>
                  <input type="text" name="pincode" value={formValues.pincode} onChange={updateField} maxLength={6} placeholder="6-digit pincode" />
                  {errors.pincode && <p className="cm-field-error">{errors.pincode}</p>}
                </label>

                <label>
                  <span>Contact Number *</span>
                  <input type="text" name="contact" value={formValues.contact} onChange={updateField} maxLength={10} placeholder="10-digit mobile number" />
                  {errors.contact && <p className="cm-field-error">{errors.contact}</p>}
                </label>

                <label>
                  <span>Email *</span>
                  <input type="text" name="email" value={formValues.email} onChange={updateField} placeholder="college@example.edu" />
                  {errors.email && <p className="cm-field-error">{errors.email}</p>}
                </label>

                <label>
                  <span>Website</span>
                  <input type="text" name="website" value={formValues.website} onChange={updateField} onBlur={normalizeEditWebsite} placeholder="https://college.edu" />
                  {errors.website && <p className="cm-field-error">{errors.website}</p>}
                </label>

                <label>
                  <span>Principal Name *</span>
                  <input type="text" name="principal" value={formValues.principal} onChange={updateField} />
                  {errors.principal && <p className="cm-field-error">{errors.principal}</p>}
                </label>

                <label className="cm-span-2">
                  <span>Accreditation Details</span>
                  <textarea name="accreditation" value={formValues.accreditation} onChange={updateField} rows={2} placeholder="e.g. NAAC A+, NBA accredited programs" />
                </label>

                <label className="cm-span-2">
                  <span>College Logo</span>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} />
                  {(formValues.logo || activeId) && <CollegeLogoImage
                    src={formValues.logo}
                    fallbackSrc={activeId ? getCollegeLogoEndpoint(activeId) : ''}
                    alt={formValues.name || 'College logo'}
                    code={formValues.code}
                    className="cm-logo-preview"
                  />}
                </label>
              </div>

              <div className="cm-form-actions">
                <button type="button" className="cm-secondary-btn" onClick={backToList}>Cancel</button>
                <button type="submit" className="cm-primary-btn" disabled={isCollegeDetailsLoading || isCollegeSaving}>
                  {isCollegeSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* FULL COLLEGE DETAILS / PROFILE SCREEN */}
        {viewMode === 'details' && activeCollege && (
          <div className="cm-profile-view" data-export-record>
            <div className="cm-profile-top-bar">
          <ExportMenu mode="single" title="College Details" filename={`college_${activeCollege.code || activeCollege.id}`} loading={isCollegeDetailsLoading || Boolean(collegeError)} />
              <button type="button" className="cm-secondary-btn" onClick={backToList}>
                &larr; Back 
              </button>
            </div>

            {isCollegeDetailsLoading && <p>Loading college details...</p>}
            {collegeError && <p className="cm-field-error" role="alert">{collegeError}</p>}

            <div className="cm-profile-card">
              {/* Header Profile Banner */}
              <div className="cm-profile-banner cm-profile-banner--account">
                <div className="cm-account-identity">
                  <div className="cm-profile-avatar-wrap">
                    <CollegeLogoImage
                      src={activeCollege.logo}
                      fallbackSrc={getCollegeLogoEndpoint(activeCollege.id)}
                      alt={activeCollege.name}
                      code={activeCollege.code}
                      className="cm-profile-logo"
                      onError={() => markLogoBroken(activeCollege.id)}
                    />
                  </div>
                  <div className="cm-profile-header-info">
                    <h1 className="cm-profile-title"><span>{activeCollege.name}</span></h1>
                    <p className="cm-profile-subtitle"><span>Affiliated with </span><strong>{activeCollege.university}</strong></p>
                  </div>
                </div>
                <dl className="cm-account-facts">
                  <div><dt>College Code</dt><dd>{activeCollege.code || '—'}</dd></div>
                  <div><dt>College Type</dt><dd>{activeCollege.type || '—'}</dd></div>
                  <div><dt>Account Status</dt><dd><span className={`cm-account-status ${activeCollege.status === 'active' ? 'is-active' : 'is-inactive'}`}><i />{activeCollege.status === 'active' ? 'Active' : 'Inactive'}</span></dd></div>
                </dl>
              </div>

              {/* Profile Information Cards Grid */}
              <div className="cm-profile-grid">
                <InfoCard
                  title="Basic College Information"
                  icon={AcademicIcon}
                  items={[
                    { label: 'College Name', value: activeCollege.name },
                    { label: 'College Code', value: activeCollege.code },
                    { label: 'College Type', value: activeCollege.type },
                    { label: 'University Name', value: activeCollege.university },
                    { label: 'Start Date', value: activeCollege.startDate },
                    { label: 'End Date', value: activeCollege.endDate },
                    { label: 'College Status', value: activeCollege.status === 'active' ? 'Active' : 'Inactive' },
                  ]}
                />

                <InfoCard
                  title="Address Details"
                  icon={ContactIcon}
                  items={[
                    { label: 'Address Line 1', value: activeCollege.addressLine1 },
                    { label: 'Address Line 2', value: activeCollege.addressLine2 },
                    { label: 'Area', value: activeCollege.area },
                    { label: 'District', value: activeCollege.district },
                    { label: 'City', value: activeCollege.city },
                    { label: 'State', value: activeCollege.state },
                    { label: 'Pincode', value: activeCollege.pincode },
                    { label: 'Country', value: activeCollege.country },
                  ]}
                />

                <InfoCard
                  title="Contact Details"
                  icon={ContactIcon}
                  items={[
                    { label: 'Contact Number', value: activeCollege.contact },
                    { label: 'Alternate Contact Number', value: activeCollege.alternateContact },
                    { label: 'Email', value: activeCollege.email },
                    { label: 'Website', value: activeCollege.website },
                  ]}
                />

                <InfoCard
                  title="Administration"
                  icon={AcademicIcon}
                  items={[
                    { label: 'Principal Name', value: activeCollege.principal },
                    { label: 'Principal Email', value: activeCollege.principalEmail },
                    { label: 'Principal Contact', value: activeCollege.principalContact },
                  ]}
                />

                <InfoCard
                  title="Accreditation Details"
                  icon={AcademicIcon}
                  items={[
                    { label: 'Accreditation Status', value: activeCollege.accreditationStatus },
                    { label: 'Accreditation Body', value: activeCollege.accreditationBody },
                    { label: 'Accreditation Grade', value: activeCollege.accreditationGrade },
                    { label: 'Accreditation Number', value: activeCollege.accreditationNumber },
                    { label: 'Valid From', value: activeCollege.validFrom },
                    { label: 'Valid Until', value: activeCollege.validUntil },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* COLLEGE SETTINGS - LIST VIEW, backed by /api/college-settings */}
        {viewMode === 'settings' && (
          <div className="cm-settings">
            <header className="cm-header">
              <div>
                <h1>College Settings</h1>
                <p>Manage academic and college settings for every college.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <ExportMenu rows={settingsList} columns={collegeSettingsColumns} title="College Settings" filename="college-settings" loading={isSettingsLoading || Boolean(settingsListError)} /><button type="button" className="cm-primary-btn" onClick={openAddSettings}>
                  + Add Settings
                </button>
                <button type="button" className="cm-secondary-btn" onClick={backToList}>
                  <FiArrowLeft /> Back
                </button>
              </div>
            </header>

            {isSettingsLoading && <p>Loading college settings...</p>}

            {!isSettingsLoading && settingsListError && (
              <div className="cm-empty cm-empty--error" role="alert">
                <p>{settingsListError}</p>
                <button type="button" className="cm-secondary-btn" onClick={fetchSettingsList}>
                  Retry
                </button>
              </div>
            )}

            {!isSettingsLoading && !settingsListError && settingsList.length === 0 && (
              <div className="cm-empty">
                <p>No college settings found.</p>
                <button type="button" className="cm-primary-btn" onClick={openAddSettings}>
                  + Add your first settings record
                </button>
              </div>
            )}

            {!isSettingsLoading && !settingsListError && settingsList.length > 0 && (
              <div className="cm-table-wrap">
                <table className="cm-table">
                  <thead>
                    <tr>
                      <th>College Name</th>
                      <th className="table-center">Code</th>
                      <th>Email</th>
                      <th>City / State</th>
                      <th className="table-center">Academic Year</th>
                      <th className="table-center">Semester</th>
                      <th>Type</th>
                      <th className="table-center">Status</th>
                      <th className="table-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedSettings.map((item) => (
                      <tr key={item.id}>
                        <td>{item.collegeName}</td>
                        <td className="table-center">{item.collegeCode}</td>
                        <td>{item.collegeEmail}</td>
                        <td>{item.city}, {item.state}</td>
                        <td className="table-center">{item.academicYear}</td>
                        <td className="table-center">{item.semester}</td>
                        <td>{item.institutionType}</td>
                        <td className="table-center">
                          <span className={`cm-status-badge ${item.status === 1 ? 'active' : 'inactive'}`}>
                            {item.status === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="table-center">
                            <div className="cm-actions table-actions-group">
                              <button
                                type="button"
                                className="table-action-btn action-edit cm-action-icon-btn cm-edit-action"
                                title="Edit Settings"
                                aria-label="Edit Settings"
                                onClick={() => openEditSettings(item)}
                              >
                                <EditIcon />
                              </button>
                            </div>
                          </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePagination page={currentSettingsPage} totalPages={settingsTotalPages} onPageChange={setSettingsPage} />
              </div>
            )}
          </div>
        )}

        {/* COLLEGE SETTINGS - ADD / EDIT FORM MODAL */}
        {viewMode === 'settings-form' && (
          <>
            <button type="button" className="cm-modal-backdrop" aria-label="Close form dialog" onClick={backToSettingsList} />
            <form className="cm-form cm-modal-card" onSubmit={handleSaveSettings} noValidate>
              <header className="cm-header">
                <div>
                  <h1>{activeSettingsId ? 'Edit College Settings' : 'Add College Settings'}</h1>
                  <p>Fill in the settings details below.</p>
                </div>
                <button type="button" className="cm-secondary-btn" onClick={backToSettingsList}>
                  <FiArrowLeft /> Back
                </button>
              </header>

              <div className="cm-form-grid">
                <label>
                  <span>College Name *</span>
                  <input type="text" name="collegeName" value={settingsForm.collegeName} onChange={updateSettingsField} />
                  {settingsErrors.collegeName && <p className="cm-field-error">{settingsErrors.collegeName}</p>}
                </label>

                <label>
                  <span>College Code *</span>
                  <input type="text" name="collegeCode" value={settingsForm.collegeCode} onChange={updateSettingsField} />
                  {settingsErrors.collegeCode && <p className="cm-field-error">{settingsErrors.collegeCode}</p>}
                </label>

                <label>
                  <span>College Email *</span>
                  <input type="text" name="collegeEmail" value={settingsForm.collegeEmail} onChange={updateSettingsField} />
                  {settingsErrors.collegeEmail && <p className="cm-field-error">{settingsErrors.collegeEmail}</p>}
                </label>

                <label>
                  <span>Phone Number</span>
                  <input type="text" name="phoneNumber" value={settingsForm.phoneNumber} onChange={updateSettingsField} />
                </label>

                <label>
                  <span>Website</span>
                  <input type="text" name="website" value={settingsForm.website} onChange={updateSettingsField} placeholder="https://college.edu" />
                </label>

                <label>
                  <span>College Type</span>
                  <ProjectSelect name="institutionType" value={settingsForm.institutionType} onChange={updateSettingsField}>
                    <option value="">Select College Type</option>
                    {COLLEGE_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </ProjectSelect>
                </label>

                <label className="cm-span-2">
                  <span>Address Line 1</span>
                  <input type="text" name="addressLine1" value={settingsForm.addressLine1} onChange={updateSettingsField} />
                </label>

                <label className="cm-span-2">
                  <span>Address Line 2</span>
                  <input type="text" name="addressLine2" value={settingsForm.addressLine2} onChange={updateSettingsField} />
                </label>

                <label>
                  <span>City</span>
                  <input type="text" name="city" value={settingsForm.city} onChange={updateSettingsField} />
                </label>

                <label>
                  <span>State</span>
                  <input type="text" name="state" value={settingsForm.state} onChange={updateSettingsField} />
                </label>

                <label>
                  <span>Pincode</span>
                  <input type="text" name="pincode" value={settingsForm.pincode} onChange={updateSettingsField} />
                </label>

                <label>
                  <span>Academic Year</span>
                  <input type="text" name="academicYear" value={settingsForm.academicYear} onChange={updateSettingsField} placeholder="e.g. 2026-27" />
                </label>

                <label>
                  <span>Semester</span>
                  <input type="text" name="semester" value={settingsForm.semester} onChange={updateSettingsField} placeholder="e.g. Semester 2" />
                </label>

                <label>
                  <span>Date Format</span>
                  <input type="text" name="dateFormat" value={settingsForm.dateFormat} onChange={updateSettingsField} placeholder="e.g. dd-MM-yyyy" />
                </label>

                <label>
                  <span>Time Zone</span>
                  <input type="text" name="timeZone" value={settingsForm.timeZone} onChange={updateSettingsField} placeholder="e.g. Asia/Kolkata" />
                </label>

                <label>
                  <span>Status</span>
                  <ProjectSelect name="status" value={settingsForm.status} onChange={updateSettingsField}>
                    <option value="">Select Status</option>
                    <option value={1}>Active</option>
                    <option value={0}>Deactive</option>
                  </ProjectSelect>
                </label>
              </div>

              {settingsSubmitError && <p className="cm-field-error" role="alert">{settingsSubmitError}</p>}

              <div className="cm-form-actions">
                <button type="button" className="cm-secondary-btn" onClick={backToSettingsList}>Cancel</button>
                <button type="submit" className="cm-primary-btn" disabled={isSettingsSaving}>
                  {isSettingsSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      {pendingStatus && <StatusConfirmDialog entity="College" name={`${pendingStatus.college.name} (${pendingStatus.college.code})`} nextStatus={pendingStatus.nextStatus} onCancel={() => { setPendingStatus(null); setCollegeImpact(null) }} onConfirm={confirmStatusChange} busy={isStatusSaving} error={statusError}
        confirmLabel={pendingStatus.nextStatus === 'active' ? 'Activate College' : 'Deactivate College'}
        details={[
          ['College', pendingStatus.college.name],
          ['Current Status', pendingStatus.college.status === 'active' ? 'Active' : 'Inactive'],
          ...(pendingStatus.nextStatus === 'inactive' ? [['Students', collegeImpact?.studentCount], ['Faculty', collegeImpact?.facultyCount], ['Departments', collegeImpact?.departmentCount], ['Courses', collegeImpact?.courseCount], ['Sections', collegeImpact?.sectionCount], ['Admissions', collegeImpact?.admissionCount]] : []),
        ]}
        description={pendingStatus.nextStatus === 'active'
          ? 'This college will become active again for operations permitted for active colleges.'
          : 'No associated records were found in the dependency check. This college will be marked inactive.'} />}
    </DashboardLayout>
  )
}

return { default: CollegeInstitutionManagement }
})()

// DepartmentManagement screen and private helpers.
const DepartmentManagementScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const GENERIC_ERROR_MESSAGE = userErrorImports_GENERIC_ERROR_MESSAGE
const DirectoryEmptyState = DirectoryEmptyStateImports_default
const newestFirst = newestFirstImports_newestFirst
const rememberCreated = newestFirstImports_rememberCreated
const showSuccess = toastImports_showSuccess
const useToastState = useToastStateImports_default
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useState = reactImports_useState
const PrintDetailsButton = ExportMenuImports_PrintDetailsButton
const ExportMenu = ExportMenuImports_default
const departmentColumns = exportColumnsImports_departmentColumns
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const StatusBadge = StatusBadgeImports_default
const FilterPanel = FilterPanelImports_default
const StatusConfirmDialog = StatusConfirmDialogImports_default
const InfoCard = InfoCardImports_default
const createDepartment = collegeApiImports_createDepartment
const getColleges = collegeApiImports_getColleges
const getDepartmentById = collegeApiImports_getDepartmentById
const getDepartments = collegeApiImports_getDepartments
const searchDepartments = collegeApiImports_searchDepartments
const updateDepartment = collegeApiImports_updateDepartment
const updateDepartmentStatus = collegeApiImports_updateDepartmentStatus
const studentApi = apiEndpointsImports_studentApi
const courseApi = apiEndpointsImports_courseApi
const normalizeFaculty = facultyServiceImports_normalizeFaculty
const facultyService = facultyServiceImports_default
const showDeactivationBlocked = DeactivationBlockedDialogImports_showDeactivationBlocked
const FiEye = fiImports_FiEye
const FiEdit2 = fiImports_FiEdit2
const FiPlus = fiImports_FiPlus
const FiSearch = fiImports_FiSearch
const FiToggleLeft = fiImports_FiToggleLeft
const FiToggleRight = fiImports_FiToggleRight
const FiTrash2 = fiImports_FiTrash2
const FiUserPlus = fiImports_FiUserPlus
const FiLayers = fiImports_FiLayers
const FiArrowLeft = fiImports_FiArrowLeft
const FiBookOpen = fiImports_FiBookOpen
const FiUser = fiImports_FiUser
const FiUserCheck = fiImports_FiUserCheck
const FiCheck = fiImports_FiCheck
const FiX = fiImports_FiX
const SearchableSelect = SearchableSelectImports_default
const useAcademic = AcademicContextImports_useAcademic

const empty = {
  id: null,
  name: '',
  code: '',
  collegeId: '',
  hodUserId: '',
  hodName: '',
  description: '',
  startDate: '',
  endDate: '',
  status: '',
};

const HOD_NAMES_KEY = 'btech-department-hod-names';
const DEPT_DATES_KEY = 'pirnav-department-dates-map';

const savedHodNames = () => {
  try {
    return JSON.parse(localStorage.getItem(HOD_NAMES_KEY) || '{}');
  } catch {
    return {};
  }
};

const readCachedDeptDates = (id, code) => {
  try {
    const raw = localStorage.getItem(DEPT_DATES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const keyId = String(id || '').trim().toLowerCase();
    const keyCode = String(code || '').trim().toLowerCase();
    return map[keyId] || map[keyCode] || null;
  } catch {
    return null;
  }
};

const cacheDeptDates = (id, code, dates) => {
  try {
    const raw = localStorage.getItem(DEPT_DATES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    const dateObj = {
      startDate: dates?.startDate ? String(dates.startDate).slice(0, 10) : '',
      endDate: dates?.endDate ? String(dates.endDate).slice(0, 10) : '',
    };
    const hasDates = Boolean(dateObj.startDate || dateObj.endDate);
    const keys = [String(id || '').trim().toLowerCase(), String(code || '').trim().toLowerCase()].filter(Boolean);
    keys.forEach((k) => {
      if (hasDates) map[k] = dateObj;
      else delete map[k];
    });
    localStorage.setItem(DEPT_DATES_KEY, JSON.stringify(map));
  } catch {}
};

const apiError = (error, fallback) => {
  const status = error?.response?.status;
  const raw = error?.response?.data;
  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }
  if (status >= 500) return GENERIC_ERROR_MESSAGE;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return "You don't have permission to manage departments.";
  if (data?.errors && typeof data.errors === 'object') {
    const messages = Object.entries(data.errors)
      .flatMap(([field, values]) => (Array.isArray(values) ? values : [values]).map((v) => `${field}: ${v}`))
      .filter(Boolean);
    if (messages.length) return messages.join(' ');
  }
  return data?.message || data?.detail || (data?.title !== 'One or more validation errors occurred.' ? data?.title : '') || error?.message || fallback;
};

const listFrom = (response) => {
  const data = response?.data ?? response;
  return Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.data)
    ? data.data
    : data && typeof data === 'object'
    ? [data]
    : [];
};

const recordFrom = (response) => response?.data?.data ?? response?.data ?? response;

const resolveHodName = (record, facultyList = []) => {
  const departmentId = record.id ?? record.departmentId;
  const hodUserId = record.hodUserId ?? record.hodId ?? record.hod?.userId ?? record.hod?.id ?? '';
  const savedName = departmentId ? savedHodNames()[departmentId] : '';

  if (savedName && savedName.trim()) {
    return savedName.trim();
  }

  if (hodUserId && facultyList && facultyList.length) {
    const matched = facultyList.find((f) =>
      String(f.id) === String(hodUserId) ||
      String(f.facultyId) === String(hodUserId) ||
      String(f.userId) === String(hodUserId) ||
      String(f.employeeProfileId) === String(hodUserId)
    );
    if (matched?.fullName) {
      return matched.fullName;
    }
  }

  if (record.hod && typeof record.hod === 'object' && record.hod.fullName) {
    return record.hod.fullName;
  }

  const rawHodName = String(record.hodName ?? record.hod ?? '').trim();
  if (rawHodName && !['not assigned', 'none', 'null', 'undefined'].includes(rawHodName.toLowerCase())) {
    if (facultyList && facultyList.length) {
      const matchByName = facultyList.find((f) => f.fullName && f.fullName.toLowerCase() === rawHodName.toLowerCase());
      if (matchByName?.fullName) return matchByName.fullName;
    }
    return rawHodName;
  }

  return '';
};

const mapDepartment = (record, facultyList = []) => {
  const rawStatus = record.status ?? record.departmentStatus ?? (record.isActive !== undefined ? record.isActive : '');
  const active = rawStatus === true || Number(rawStatus) === 1 || String(rawStatus).toLowerCase() === 'active';
  const inactive = rawStatus === false || Number(rawStatus) === 0 || String(rawStatus).toLowerCase() === 'inactive';
  const hodUserId = record.hodUserId ?? record.hodId ?? '';
  const departmentId = record.id ?? record.departmentId;
  const hodName = resolveHodName(record, facultyList);
  // Faculty enrichment maps these rows again; preserve their original owner ID.
  const collegeId = record.collegeNumericId ?? record.collegeId ?? '';
  const collegeName = record.collegeName ?? record.college?.name ?? '';
  const cachedDates = readCachedDeptDates(departmentId, record.departmentCode ?? record.code ?? record.name) || {};
  const startDate = String(record.startDate ?? record.StartDate ?? record.start_date ?? cachedDates.startDate ?? '').slice(0, 10);
  const endDate = String(record.endDate ?? record.EndDate ?? record.end_date ?? cachedDates.endDate ?? '').slice(0, 10);
  if (startDate || endDate) {
    cacheDeptDates(departmentId, record.departmentCode ?? record.code ?? record.name, { startDate, endDate });
  }

  return {
    id: departmentId,
    name: record.departmentName ?? record.name ?? '',
    code: record.departmentCode ?? record.code ?? '',
    collegeId,
    collegeNumericId: collegeId,
    collegeName,
    hodUserId,
    hodName,
    description: record.description ?? '',
    startDate,
    endDate,
    hod: hodName || 'Not assigned',
    status: active ? 'Active' : inactive ? 'Inactive' : 'Active',
  };
};

const payloadFor = (value) => ({
  departmentName: value.name.trim(),
  departmentCode: value.code.trim().toUpperCase() || null,
  ...((value.collegeNumericId ?? value.collegeId) !== '' ? { collegeId: Number(value.collegeNumericId ?? value.collegeId) } : {}),
  ...(value.hodUserId !== '' ? { hodUserId: Number(value.hodUserId) } : {}),
  description: value.description.trim() || null,
  startDate: value.startDate ? value.startDate.slice(0, 10) : null,
  endDate: value.endDate ? value.endDate.slice(0, 10) : null,
  StartDate: value.startDate ? value.startDate.slice(0, 10) : null,
  EndDate: value.endDate ? value.endDate.slice(0, 10) : null,
  start_date: value.startDate ? value.startDate.slice(0, 10) : null,
  end_date: value.endDate ? value.endDate.slice(0, 10) : null,
});

function DepartmentManagement() {
  const { scopeRecords, selectedCollegeId, selectedCollege } = useAcademic();
  const [items, setItems] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [screen, setScreen] = useState('list'); // 'list' | 'form' | 'assign-hod' | 'details'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(() => ({ ...empty, collegeId: selectedCollegeId || '', collegeNumericId: selectedCollegeId || '' }));
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useToastState('', 'error');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isHodSaving, setIsHodSaving] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [colleges, setColleges] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const itemsPerPage = 5;

  const loadDepartments = async (searchTerm = query) => {
    setIsLoading(true);
    setError('');
    try {
      const response = searchTerm.trim() ? await searchDepartments(searchTerm.trim()) : await getDepartments();
      const mapped = newestFirst('departments', listFrom(response.data)).map((item) => mapDepartment(item, faculty));
      setAllDepartments(mapped);
      setItems(mapped);
    } catch (requestError) {
      setItems([]);
      setError(apiError(requestError, 'Unable to load departments right now. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments(query);
  }, [query]);

  useEffect(() => {
    getColleges()
      .then((response) => {
        const records = listFrom(response.data);
        setColleges(
          records.map((record) => ({
            id: record.id ?? record.collegeId,
            name: record.name ?? record.collegeName ?? 'Unnamed college',
            active: ['1', 'true', 'active'].includes(String(record.status ?? record.collegeStatus ?? record.isActive ?? '').toLowerCase()),
          }))
        );
      })
      .catch(() => setColleges([]));
  }, []);

  const scopedItems = useMemo(() => scopeRecords(items), [items, scopeRecords]);
  const scopedAllDepartments = useMemo(() => scopeRecords(allDepartments), [allDepartments, scopeRecords]);

  const visible = useMemo(
    () =>
      scopedItems.filter(
        (item) =>
          `${item.name} ${item.code} ${item.hod}`.toLowerCase().includes(query.toLowerCase()) &&
          (!statusFilter || item.status === statusFilter)
      ),
    [scopedItems, query, statusFilter]
  );

  const totalPages = Math.max(1, Math.ceil(visible.length / itemsPerPage));
  const currentPageClamped = Math.min(Math.max(currentPage, 1), totalPages);
  const pageItems = visible.slice((currentPageClamped - 1) * itemsPerPage, currentPageClamped * itemsPerPage);
  const countSource = scopedAllDepartments.length ? scopedAllDepartments : scopedItems;
  const activeCount = countSource.filter((item) => item.status === 'Active').length;
  const inactiveCount = countSource.filter((item) => item.status === 'Inactive').length;
  const totalCount = countSource.length;

  const closeToList = () => {
    setForm({ ...empty, collegeId: selectedCollegeId || '', collegeNumericId: selectedCollegeId || '' });
    setScreen('list');
    setSelected(null);
    setError('');
  };

  useEffect(() => {
    let active = true;
    setFaculty([]);
    setScreen('list');
    setSelected(null);
    setForm({ ...empty, collegeId: selectedCollegeId || '', collegeNumericId: selectedCollegeId || '' });
    facultyService.list({ collegeId: selectedCollegeId })
      .then((records) => {
        if (!active) return;
        const normalized = facultyForCollege(records.map(normalizeFaculty), selectedCollegeId, allDepartments);
        setFaculty(normalized);
        setItems((current) => current.map((item) => mapDepartment(item, normalized)));
        setAllDepartments((current) => current.map((item) => mapDepartment(item, normalized)));
      })
      .catch(() => { if (active) setFaculty([]); });
    return () => { active = false; };
  }, [selectedCollegeId]);

  const loadDetail = async (item, nextScreen) => {
    setScreen(nextScreen);
    setSelected(item);
    setForm(nextScreen === 'form' ? { ...item } : item);
    setError('');
    setIsDetailsLoading(true);
    try {
      const response = await getDepartmentById(item.id);
      let currentFaculty = faculty;
      if (nextScreen === 'assign-hod' || !currentFaculty.length) {
        const collegeId = item.collegeNumericId ?? item.collegeId ?? selectedCollegeId;
        const records = await facultyService.list({ collegeId });
        currentFaculty = facultyForCollege(records.map(normalizeFaculty), collegeId, allDepartments);
        setFaculty(currentFaculty);
      }
      const detail = mapDepartment(recordFrom(response), currentFaculty);
      setSelected(detail);
      setForm({
        ...detail,
        collegeId: detail.collegeNumericId ?? detail.collegeId,
      });
      setItems((current) => current.map((entry) => (entry.id === detail.id ? detail : entry)));
    } catch (requestError) {
      setError(apiError(requestError, 'Unable to load department details. Please try again.'));
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const hodCandidates = useMemo(() => {
    if (!faculty || !faculty.length) return [];

    const targetCollegeId = String(form.collegeNumericId ?? form.collegeId ?? selectedCollegeId ?? selectedCollege?.collegeId ?? selectedCollege?.id ?? '').trim();
    if (!targetCollegeId) return [];

    const activeFaculty = facultyForCollege(faculty, targetCollegeId, allDepartments).filter((member) => {
      const status = String(member.employmentStatus || member.status || '').trim().toLowerCase();
      return !['inactive', 'resigned', 'retired', 'terminated'].includes(status);
    });
    const targetDeptId = form.id !== undefined && form.id !== null ? String(form.id).trim() : '';
    const targetDeptName = String(form.name ?? '').trim().toLowerCase();
    const targetDeptCode = String(form.code ?? '').trim().toLowerCase();
    const directMatches = activeFaculty.filter((member) => {
      const memberDeptId = String(member.departmentId ?? member.department?.departmentId ?? member.department?.id ?? '').trim();
      const memberDeptName = String(member.departmentName ?? member.department ?? '').trim().toLowerCase();

      const matchId = targetDeptId && memberDeptId && memberDeptId === targetDeptId;
      const matchName = targetDeptName && memberDeptName && (
        memberDeptName === targetDeptName ||
        memberDeptName.includes(targetDeptName) ||
        targetDeptName.includes(memberDeptName)
      );
      const matchCode = targetDeptCode && memberDeptName && (
        memberDeptName === targetDeptCode ||
        memberDeptName.includes(`(${targetDeptCode})`) ||
        memberDeptName.includes(targetDeptCode)
      );

      return matchId || matchName || matchCode;
    });

    const candidateList = directMatches.length > 0 ? directMatches : activeFaculty;

    return candidateList
      .map((member) => ({
        ...member,
        hodId: member.userId ?? member.employeeProfileId ?? member.facultyId ?? member.id,
      }))
      .filter((member) => member.hodId !== undefined && member.hodId !== null && member.hodId !== '');
  }, [faculty, form.id, form.name, form.code, form.collegeNumericId, form.collegeId, selectedCollegeId, selectedCollege, allDepartments]);

  const toggleStatus = async (item) => {
    setError('');
    const nextStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    if (nextStatus === 'Inactive') {
      try {
        const targetDeptId = String(item.id ?? '').trim();
        const targetDeptName = String(item.name ?? '').trim().toLowerCase();
        const targetDeptCode = String(item.code ?? '').trim().toLowerCase();

        // 1. Calculate REAL Faculty assigned to this department
        let currentFaculty = faculty;
        if (!currentFaculty || !currentFaculty.length) {
          try {
            const collegeId = item.collegeNumericId ?? item.collegeId ?? selectedCollegeId;
            const facultyRecords = await facultyService.list({ collegeId });
            currentFaculty = facultyForCollege(facultyRecords.map(normalizeFaculty), collegeId, allDepartments);
            setFaculty(currentFaculty);
          } catch {
            currentFaculty = [];
          }
        }

        const activeDeptFaculty = (currentFaculty || []).filter((member) => {
          const mDeptId = String(member.departmentId ?? member.department?.departmentId ?? member.department?.id ?? '').trim();
          const mDeptName = String(member.departmentName ?? member.department ?? '').trim().toLowerCase();
          const matchesId = targetDeptId && mDeptId && mDeptId === targetDeptId;
          const matchesName = targetDeptName && mDeptName && (mDeptName === targetDeptName || mDeptName.includes(targetDeptName));
          const matchesCode = targetDeptCode && mDeptName && (mDeptName === targetDeptCode || mDeptName.includes(`(${targetDeptCode})`));
          const status = String(member.employmentStatus || member.status || '').trim().toLowerCase();
          const isActive = !['inactive', 'resigned', 'retired', 'terminated'].includes(status);
          return isActive && (matchesId || matchesName || matchesCode);
        });

        // 2. Calculate REAL Students associated with this department (via department courses or direct departmentId)
        let deptStudents = [];
        try {
          const [courseRows, allStudents] = await Promise.all([
            courseApi.getAll().catch(() => []),
            studentApi.getAll().catch(() => []),
          ]);

          const deptCourses = (courseRows || []).filter((c) => {
            const cDeptId = String(c.departmentId ?? c.department?.id ?? c.department?.departmentId ?? '').trim();
            const cDeptName = String(c.department ?? c.departmentName ?? '').trim().toLowerCase();
            return (cDeptId && cDeptId === targetDeptId) || (cDeptName && (cDeptName === targetDeptName || cDeptName === targetDeptCode));
          });

          const deptCourseIds = new Set(deptCourses.map((c) => String(c.id).trim()));

          deptStudents = (allStudents || []).filter((s) => {
            const sDeptId = String(s.departmentId ?? s.department?.id ?? '').trim();
            const sCourseId = String(s.courseId ?? s.course?.id ?? s.academic?.courseId ?? s.academicInformation?.courseId ?? '').trim();
            return (sDeptId && sDeptId === targetDeptId) || (sCourseId && deptCourseIds.has(sCourseId));
          });
        } catch {
          deptStudents = [];
        }

        const facultyCount = activeDeptFaculty.length;
        const studentCount = deptStudents.length;

        if (facultyCount > 0 || studentCount > 0) {
          const parts = [];
          if (facultyCount > 0) parts.push(`${facultyCount} active faculty ${facultyCount === 1 ? 'member' : 'members'}`);
          if (studentCount > 0) parts.push(`${studentCount} enrolled ${studentCount === 1 ? 'student' : 'students'}`);

          showDeactivationBlocked({
            message: `Cannot deactivate ${item.name}. ${parts.join(' and ')} are associated with this department.`,
            facultyCount,
            studentCount,
            name: item.name,
            entity: 'department',
          });
          return;
        }
      } catch (requestError) {
        setError(apiError(requestError, 'Unable to verify department dependencies.'));
        return;
      }
    }
    setPendingStatus({ item, nextStatus });
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus || isStatusSaving) return;
    const { item, nextStatus: status } = pendingStatus;
    setIsStatusSaving(true);
    setError('');
    try {
      const response = await updateDepartmentStatus(item.id, status === 'Active' ? 1 : 0);
      const result = recordFrom(response);
      if (!form.id) { rememberCreated('departments', result); setQuery(''); setStatusFilter(''); setCurrentPage(1); }
      const updated = result?.id || result?.departmentId ? mapDepartment(result) : { ...item, status };
      showSuccess(`Department ${status === 'Active' ? 'activated' : 'deactivated'} successfully.`);
      await loadDepartments(query);
      setItems((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
      setAllDepartments((current) => current.map((entry) => (entry.id === item.id ? updated : entry)));
      if (selected?.id === item.id) setSelected(updated);
      setPendingStatus(null);
    } catch (requestError) {
      const message = apiError(requestError, 'Unable to update department status. Please try again.');
      setPendingStatus(null);
      if (/dependent|associated|reassign|cannot deactivate/i.test(message)) {
        showDeactivationBlocked(`Cannot deactivate ${item.name}. Active dependent records exist. Reassign or deactivate them first.`);
      } else {
        setError(message);
      }
    } finally {
      setIsStatusSaving(false);
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Department name is required.');
    if (!form.code.trim()) return setError('Department code is required.');
    const effectiveCollegeId = String(form.collegeNumericId || form.collegeId || selectedCollegeId || colleges[0]?.id || '');
    if (!form.status) return setError('Select a status for this department.');
    if (form.hodUserId !== '' && (!Number.isInteger(Number(form.hodUserId)) || Number(form.hodUserId) < 0))
      return setError('Head / In-Charge user ID must be a valid number.');
    const normalizedName = form.name.trim().toLowerCase();
    const normalizedCode = form.code.trim().toUpperCase();
    const duplicate = allDepartments.find((item) =>
      String(item.id) !== String(form.id) &&
      (!effectiveCollegeId || String(item.collegeNumericId ?? item.collegeId) === effectiveCollegeId) &&
      (String(item.code || '').trim().toUpperCase() === normalizedCode || String(item.name || '').trim().toLowerCase() === normalizedName)
    );
    if (duplicate) {
      return setError(String(duplicate.code || '').trim().toUpperCase() === normalizedCode
        ? 'This department code already exists for this college.'
        : 'This department name already exists for this college.');
    }
    setIsSaving(true);
    setError('');
    try {
      const payload = {
        ...payloadFor(form),
        ...(effectiveCollegeId ? { collegeId: Number(effectiveCollegeId) } : {}),
      };
      const response = form.id ? await updateDepartment(form.id, payload) : await createDepartment(payload);
      const result = recordFrom(response);
      if (!form.id) { rememberCreated('departments', result); setQuery(''); setStatusFilter(''); setCurrentPage(1); }
      const id = result?.id ?? result?.departmentId ?? form.id;
      if (id) {
        cacheDeptDates(id, form.code, { startDate: form.startDate, endDate: form.endDate });
      }
      if (form.status === 'Inactive' && id) await updateDepartmentStatus(id, 0);
      showSuccess(`Department ${form.id ? 'updated' : 'created'} successfully.`);
      await loadDepartments('');
      closeToList();
    } catch (requestError) {
      setError(apiError(requestError, `Unable to ${form.id ? 'update' : 'create'} this department. Please try again.`));
    } finally {
      setIsSaving(false);
    }
  };

  const saveHod = async (event) => {
    event.preventDefault();
    if (!String(form.hodUserId || '').trim()) return setError('Select a faculty member as Head / In-Charge.');
    setIsHodSaving(true);
    setError('');
    try {
      const candidate = hodCandidates.find((m) => String(m.hodId) === String(form.hodUserId))
        || faculty.find((m) => String(m.id) === String(form.hodUserId) || String(m.facultyId) === String(form.hodUserId) || String(m.userId) === String(form.hodUserId));
      const chosenHodName = candidate?.fullName || form.hodName?.trim() || '';

      const names = savedHodNames();
      names[form.id] = chosenHodName;
      localStorage.setItem(HOD_NAMES_KEY, JSON.stringify(names));

      let updated = mapDepartment({
        ...form,
        hodUserId: form.hodUserId,
        hodName: chosenHodName,
        hod: chosenHodName,
      }, faculty);

      if (Number(form.hodUserId) > 0) {
        const response = await updateDepartment(form.id, payloadFor({
          ...form,
          hodUserId: Number(form.hodUserId),
        }));
        const result = recordFrom(response);
        if (!form.id) { rememberCreated('departments', result); setQuery(''); setStatusFilter(''); setCurrentPage(1); }
        updated = mapDepartment({
          ...form,
          ...(result || {}),
          id: form.id,
          hodUserId: result?.hodUserId ?? Number(form.hodUserId),
          hodName: chosenHodName,
          hod: chosenHodName,
        }, faculty);
      }

      setItems((current) => current.map((item) => (item.id === form.id ? updated : item)));
      setAllDepartments((current) => current.map((item) => (item.id === form.id ? updated : item)));
      setSelected(updated);
      showSuccess('Head / In-Charge assigned successfully.');
      closeToList();
    } catch (requestError) {
      setError(apiError(requestError, 'Unable to assign the Head / In-Charge. Please try again.'));
    } finally {
      setIsHodSaving(false);
    }
  };

  const summaryCards = [
    { label: 'Total Departments', value: totalCount },
    { label: 'Active', value: activeCount, tone: 'active' },
    { label: 'Inactive', value: inactiveCount, tone: 'inactive' },
  ];

  return (
    <DashboardLayout>
      <main className="department-management">
        {(screen === 'list' || screen === 'assign-hod') && (
          <>
            <PageHeader
              title="Department Management"
              subtitle="Organize academic departments, faculty leadership, and institutional branches."
              compactSummary={summaryCards}
            />

            <section className="erp-directory-card">
              <header className="course-directory-heading">
                <div>
                  <span className="cm-eyebrow">Department Directory</span>
                  <p>{visible.length} records</p>
                </div>
                <div className="directory-export-actions">
                  <ExportMenu
                    rows={visible.map((row) => ({
                      ...row,
                      collegeName: row.collegeName || colleges.find((c) => String(c.id) === String(row.collegeNumericId))?.name || '',
                    }))}
                    columns={departmentColumns}
                    title="Departments"
                    filename="departments"
                    loading={isLoading || Boolean(error)}
                  />
                  <button
                    type="button"
                    className="cm-button"
                    onClick={() => {
                      setForm({ ...empty, collegeId: selectedCollegeId || '', collegeNumericId: selectedCollegeId || '' });
                      setSelected(null);
                      setError('');
                      setScreen('form');
                    }}
                  >
                    <FiPlus /> Add Department
                  </button>
                </div>
              </header>

              <FilterPanel
                active={Boolean(query || statusFilter)}
                onClear={() => {
                  setQuery('');
                  setStatusFilter('');
                  setCurrentPage(1);
                }}
              >
                <div className="course-toolbar">
                  <label className="course-search">
                    <FiSearch />
                    <input
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search department name, code, or HOD..."
                      aria-label="Search departments"
                    />
                  </label>
                  <ProjectSelect
                    aria-label="Status"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="">Select Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </ProjectSelect>
                </div>
              </FilterPanel>

              {isLoading ? (
                <p className="department-no-results">Loading departments...</p>
              ) : error ? (
                <div className="department-no-results department-no-results--error" role="alert">
                  <p className="department-error">
                    {error}
                  </p>
                  <button type="button" className="erp-btn erp-btn--secondary" onClick={() => loadDepartments(query)}>
                    Retry
                  </button>
                </div>
              ) : !items.length ? (
                <div className="department-no-results">
                  <p>No departments have been added yet.</p>
                  <button
                    type="button"
                    className="erp-btn erp-btn--primary"
                    onClick={() => {
                      setForm(empty);
                      setScreen('form');
                    }}
                  >
                    Add Department
                  </button>
                </div>
              ) : (
                <>
                  <div className="erp-table-responsive department-table-wrap">
                    <table className="erp-table">
                      <thead>
                        <tr>
                          <th className="col-name table-center" style={{ width: '32%' }}>Department</th>
                          <th className="col-code table-center" style={{ width: '120px' }}>Code</th>
                          <th className="col-hod table-center" style={{ width: '26%' }}>Head / In-Charge</th>
                          <th className="col-status table-center" style={{ width: '130px' }}>Status</th>
                          <th className="col-actions table-center" style={{ width: '130px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageItems.map((item) => (
                          <tr key={item.id}>
                            <td className="col-name table-center">
                              <button
                                type="button"
                                className="dept-name-link table-cell-truncate"
                                title={`Click to view details for ${item.name}`}
                                onClick={() => loadDetail(item, 'details')}
                              >
                                {item.name}
                              </button>
                            </td>
                            <td className="col-code table-center">
                              <code>{item.code || '-'}</code>
                            </td>
                            <td className="col-hod table-center">
                              <span className="table-cell-truncate" title={item.hod || 'Unassigned'}>{item.hod || '-'}</span>
                            </td>
                            <td className="col-status table-center">
                              <StatusBadge value={item.status} />
                            </td>
                            <td className="col-actions table-center">
                              <div className="erp-row-actions table-actions-group">
                                <button
                                  type="button"
                                  className="table-action-btn action-edit erp-action-btn"
                                  title={`Edit ${item.name}`}
                                  aria-label={`Edit ${item.name}`}
                                  onClick={() => loadDetail(item, 'form')}
                                >
                                  <FiEdit2 />
                                </button>
                                <button
                                  type="button"
                                  className="table-action-btn action-assign erp-action-btn"
                                  title={`Assign Head / In-Charge for ${item.name}`}
                                  aria-label={`Assign Head for ${item.name}`}
                                  onClick={() => loadDetail(item, 'assign-hod')}
                                >
                                  <FiUserPlus />
                                </button>
                                <button
                                  type="button"
                                  className={`table-action-btn ${item.status === 'Active' ? 'action-activate erp-action-btn--success' : 'action-deactivate erp-action-btn--danger'}`}
                                  title={item.status === 'Active' ? `Deactivate ${item.name}` : `Activate ${item.name}`}
                                  aria-label={item.status === 'Active' ? `Deactivate ${item.name}` : `Activate ${item.name}`}
                                  onClick={() => toggleStatus(item)}
                                >
                                  {item.status === 'Active' ? (
                                    <FiToggleRight data-status="active" />
                                  ) : (
                                    <FiToggleLeft data-status="inactive" />
                                  )}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!visible.length && (
                    <DirectoryEmptyState title="No departments found." actionLabel="Add Department" onAction={() => { setForm(empty); setScreen('form'); }} />
                  )}
                  {!!visible.length && (
                    <div className="erp-table-pagination-wrap">
                      <div className="department-pagination">
                        <div className="pagination-controls">
                          <button
                            className="pagination-btn"
                            onClick={() => setCurrentPage((v) => Math.max(v - 1, 1))}
                            disabled={currentPageClamped === 1}
                          >
                            Previous
                          </button>
                          <span className="pagination-status">
                            Page {currentPageClamped} of {totalPages}
                          </span>
                          <button
                            className="pagination-btn"
                            onClick={() => setCurrentPage((v) => Math.min(v + 1, totalPages))}
                            disabled={currentPageClamped === totalPages}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}

        {screen === 'form' && (
          <div className="erp-form-page">
            <PageHeader
              title={form.id ? 'Edit Department' : 'Add Department'}
              subtitle="Enter the department information, code, college association, and status."
            >
              <button type="button" className="erp-btn erp-btn--secondary" onClick={closeToList}>
                <FiArrowLeft /> Back
              </button>
            </PageHeader>

            <div className="erp-two-column-layout">
              <section className="erp-card-main">
                <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div className="erp-form-scroll-body">
                    <div className="department-form-grid">
                      <label>
                        <span>
                          Department Name <b className="required-mark">*</b>
                        </span>
                        <input
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value.replace(/[0-9]/g, '') })}
                          placeholder="e.g. Computer Science & Engineering"
                          required
                        />
                      </label>

                      <label>
                        <span>
                          Department Code <b className="required-mark">*</b>
                        </span>
                        <input
                          value={form.code}
                          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                          placeholder="e.g. CSE"
                          required
                        />
                      </label>

                      <label>
                        <span>
                          Status <b className="required-mark">*</b>
                        </span>
                        <ProjectSelect
                          required
                          value={form.status}
                          onChange={(e) => setForm({ ...form, status: e.target.value })}
                        >
                          <option value="">Select Status</option>
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </ProjectSelect>
                      </label>

                      <label>
                        <span>Start Date</span>
                        <input
                          type="date"
                          value={form.startDate || ''}
                          onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        />
                      </label>

                      <label>
                        <span>End Date</span>
                        <input
                          type="date"
                          value={form.endDate || ''}
                          onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                        />
                      </label>

                      <label className="full-width">
                        <span>Description</span>
                        <textarea
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          placeholder="Describe this organizational department..."
                          rows={2}
                        />
                      </label>
                    </div>

                    {isDetailsLoading && <p className="department-no-results">Loading department details...</p>}
                    {error && (
                      <p className="department-error" role="alert" style={{ marginTop: '10px' }}>
                        {error}
                      </p>
                    )}
                  </div>

                  <div className="erp-actions-bar">
                    <button type="button" className="erp-btn erp-btn--secondary" onClick={closeToList} disabled={isSaving}>
                      Cancel
                    </button>
                    <button type="submit" className="erp-btn erp-btn--primary" disabled={isSaving}>
                      {isSaving ? 'Saving...' : form.id ? 'Save Changes' : 'Create Department'}
                    </button>
                  </div>
                </form>
              </section>

              <aside className="college-live-preview" aria-label="Department preview">
                <header className="preview-top-bar">
                  <span className="preview-live-tag">
                    <span className="live-dot" /> LIVE PREVIEW
                  </span>
                  <span className="preview-sync-hint">Real-time sync</span>
                </header>
                <div className="preview-body-container">
                  <div className="preview-hero">
                    <div className="preview-hero-badge">
                      {form.code ? form.code.slice(0, 4).toUpperCase() : (form.name ? form.name.slice(0, 4).toUpperCase() : 'DEPT')}
                    </div>
                    <div className="preview-hero-details">
                      <h3 className="preview-course-title">{form.name.trim() || 'Department Preview'}</h3>
                      <p className="preview-course-meta">
                        {[form.code, form.status || (form.name ? 'Active' : '')].filter(Boolean).join('   ') || 'Department details'}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const sections = [
                      {
                        title: 'Department Details',
                        fields: [
                          ['Department Name', form.name],
                          ['Department Code', form.code],
                          ['Status', form.name || form.code ? form.status || 'Active' : ''],
                          ['Start Date', form.startDate],
                          ['End Date', form.endDate],
                          ['Description', form.description],
                        ],
                      },
                    ].map((sec) => ({
                      ...sec,
                      fields: sec.fields.filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== '' && String(val).trim() !== '-'),
                    })).filter((sec) => sec.fields.length > 0)

                    if (sections.length === 0) {
                      return (
                        <div className="preview-empty-hint">
                          <span>Enter details in the form to preview here in real time.</span>
                        </div>
                      )
                    }

                    return sections.map((sec) => (
                      <div key={sec.title} className="preview-section-group">
                        <span className="preview-section-title">{sec.title}</span>
                        <div className="preview-kv-grid">
                          {sec.fields.map(([label, text]) => (
                            <div key={label} className="preview-kv-item" style={label === 'Description' ? { gridColumn: 'span 2' } : {}}>
                              <span className="kv-label">{label}</span>
                              <strong className="kv-val" title={String(text).trim()}>{String(text).trim()}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </aside>
            </div>
          </div>
        )}

        {screen === 'assign-hod' && (
          <div className="department-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !isHodSaving && closeToList()}>
            <section className="hod-modal-card" role="dialog" aria-modal="true" aria-labelledby="assign-hod-title">
              <form onSubmit={saveHod} className="hod-modal-form">
                {/* Modal Header */}
                <div className="hod-modal-header">
                  <div className="hod-modal-header-icon">
                    <FiUserCheck />
                  </div>
                  <div className="hod-modal-header-text">
                    <span className="hod-modal-eyebrow">DEPARTMENT LEADERSHIP</span>
                    <h2 id="assign-hod-title">Assign Head / In-Charge</h2>
                    <p>Designate an active faculty member to lead this department.</p>
                  </div>
                  <button type="button" className="hod-modal-close-btn" onClick={closeToList} disabled={isHodSaving} aria-label="Close dialog" title="Close">
                    <FiX />
                  </button>
                </div>

                {/* Department Info Banner */}
                <div className="hod-dept-card">
                  <div className="hod-dept-avatar">
                    {(form.code || form.name || 'DEP').slice(0, 3).toUpperCase()}
                  </div>
                  <div className="hod-dept-details">
                    <div className="hod-dept-title-row">
                      <h3 className="hod-dept-name">{form.name || 'Selected Department'}</h3>
                      {form.code && <span className="hod-dept-code-tag">{form.code}</span>}
                    </div>
                    <div className="hod-dept-meta-row">
                      <span><strong>College:</strong> {form.collegeName || selectedCollege?.name || 'Academic Institution'}</span>
                      {selected?.hod && selected.hod !== 'Not assigned' && (
                        <span className="hod-current-pill"><strong>Current Head:</strong> {selected.hod}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Searchable Select Field */}
                <div className="hod-form-field">
                  <div className="hod-field-header">
                    <label htmlFor="hod-faculty-search-select" className="hod-field-label">
                      Select Faculty Member <span className="required-star">*</span>
                    </label>
                    <span className="hod-candidate-count-badge">
                      {hodCandidates.length} Active Candidate{hodCandidates.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="hod-select-container">
                    <SearchableSelect
                      id="hod-faculty-search-select"
                      label="Select Faculty Member"
                      value={form.hodUserId ? String(form.hodUserId) : ''}
                      options={hodCandidates.map((member) => {
                        const code = member.employeeId ? `[${member.employeeId}]` : '';
                        const subLabel = [member.designation, member.department].filter(Boolean).join('   ');
                        const fullLabel = [
                          member.fullName,
                          code,
                          member.designation,
                          member.department ? `(${member.department})` : ''
                        ].filter(Boolean).join(' - ');

                        return {
                          value: String(member.hodId),
                          name: member.fullName,
                          label: member.fullName,
                          code,
                          subLabel,
                          fullLabel,
                        };
                      })}
                      onChange={(val) => {
                        const candidate = hodCandidates.find((m) => String(m.hodId) === String(val));
                        setForm({
                          ...form,
                          hodUserId: val,
                          hodName: candidate?.fullName || '',
                        });
                      }}
                      placeholder="-- Select or search faculty member --"
                      searchPlaceholder="Search by name, employee code, or designation..."
                      noOptionsMessage="No active faculty members found."
                    />
                  </div>
                  <p className="hod-field-hint">
                    Search by faculty name, employee code, or designation from active faculty members.
                  </p>
                </div>

                {/* Selected Faculty Details Card */}
                {(() => {
                  const selectedFaculty = hodCandidates.find((m) => String(m.hodId) === String(form.hodUserId));
                  if (!selectedFaculty) return null;
                  return (
                    <div className="hod-selected-preview-card">
                      <div className="hod-selected-avatar">
                        {(selectedFaculty.fullName || 'F').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="hod-selected-info">
                        <div className="hod-selected-name-row">
                          <h4 className="hod-selected-name">{selectedFaculty.fullName}</h4>
                          {selectedFaculty.employeeId && (
                            <span className="hod-selected-empid">{selectedFaculty.employeeId}</span>
                          )}
                          <span className="hod-selected-status-pill">Active Faculty</span>
                        </div>
                        <div className="hod-selected-meta-grid">
                          <div className="hod-selected-meta-item">
                            <span className="meta-label">Designation</span>
                            <strong className="meta-val">{selectedFaculty.designation || 'Faculty Member'}</strong>
                          </div>
                          <div className="hod-selected-meta-item">
                            <span className="meta-label">Department</span>
                            <strong className="meta-val">{selectedFaculty.department || form.name || 'Academic'}</strong>
                          </div>
                          {selectedFaculty.qualification && (
                            <div className="hod-selected-meta-item">
                              <span className="meta-label">Qualification</span>
                              <strong className="meta-val">{selectedFaculty.qualification}</strong>
                            </div>
                          )}
                          {selectedFaculty.email && (
                            <div className="hod-selected-meta-item">
                              <span className="meta-label">Official Email</span>
                              <strong className="meta-val">{selectedFaculty.email}</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {error && (
                  <div className="hod-error-banner" role="alert">
                    <span>{error}</span>
                  </div>
                )}

                {/* Actions Footer */}
                <div className="hod-modal-footer">
                  <button type="button" className="hod-btn hod-btn--cancel" onClick={closeToList} disabled={isHodSaving}>
                    Cancel
                  </button>
                  <button type="submit" className="hod-btn hod-btn--submit" disabled={isHodSaving || !form.hodUserId}>
                    <FiCheck />
                    {isHodSaving ? 'Saving Assignment...' : 'Assign Head'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {screen === 'details' && selected && (
          <div className="cm-profile-view" data-export-record>
            <div className="cm-profile-top-bar">
          <ExportMenu mode="single" title="Department Details" filename={`department_${selected.code || selected.id}`} />
              <button type="button" className="cm-secondary-btn erp-btn erp-btn--secondary" onClick={closeToList}>
                &larr; Back 
              </button>
            </div>

            <div className="cm-profile-card">
              {/* Header Profile Banner */}
              <div className="cm-profile-banner">
                <div className="cm-profile-avatar-wrap">
                  <div className="cm-profile-placeholder">
                    {(selected.code || selected.name).slice(0, 3).toUpperCase()}
                  </div>
                </div>
                <div className="cm-profile-header-info">
                  <div className="cm-profile-badges">
                    <span className="cm-badge cm-badge-code">Code: {selected.code || '-'}</span>
                    <span className="cm-badge cm-badge-type">Department</span>
                    <span className={`cm-status-badge ${String(selected.status).toLowerCase()}`}>
                      {selected.status}
                    </span>
                  </div>
                  <h1 className="cm-profile-title">{selected.name}</h1>
                  <p className="cm-profile-subtitle">
                    {selected.collegeName ? (
                      <>
                        <span>College: </span>
                        <strong>{selected.collegeName}</strong>
                      </>
                    ) : (
                      <span>Academic Department</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Profile Information Cards Grid */}
              <div className="cm-profile-grid">
                <InfoCard
                  title="Department Information"
                  icon={FiLayers}
                  items={[
                    { label: 'Department Name', value: selected.name },
                    { label: 'Department Code', value: selected.code },
                    { label: 'College', value: selected.collegeName || selected.collegeId },
                    { label: 'Start Date', value: selected.startDate },
                    { label: 'End Date', value: selected.endDate },
                    { label: 'Status', value: selected.status },
                    { label: 'Description', value: selected.description },
                  ]}
                />

                <InfoCard
                  title="Leadership & Faculty In-Charge"
                  icon={FiUser}
                  items={[
                    { label: 'Head / In-Charge Name', value: selected.hodName || selected.hod },
                    { label: 'Faculty ID', value: selected.hodUserId },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {pendingStatus && (
          <StatusConfirmDialog
            entity="Department"
            name={`${pendingStatus.item.name} (${pendingStatus.item.code})`}
            nextStatus={pendingStatus.nextStatus}
            onCancel={() => setPendingStatus(null)}
            onConfirm={confirmStatusChange}
            busy={isStatusSaving}
            description={
              pendingStatus.nextStatus === 'Active'
                ? 'The department will become active and available for college course configurations.'
                : 'Deactivating this department will mark it inactive in the institutional directory.'
            }
            confirmLabel={pendingStatus.nextStatus === 'Active' ? 'Activate Department' : 'Deactivate Department'}
          />
        )}
      </main>
    </DashboardLayout>
  );
}

return { default: DepartmentManagement }
})()

// RolesAndDesignations screen and private helpers.
const RolesAndDesignationsScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const useCollegeState = useCollegeStateImports_default
const collegeStorageKey = collegeScopeImports_collegeStorageKey
const useState = reactImports_useState
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const Fragment = reactImports_Fragment
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const ExportMenu = ExportMenuImports_default
const StatusBadge = StatusBadgeImports_default
const showSuccess = toastImports_showSuccess
const showError = toastImports_showError
const normalizeFaculty = facultyServiceImports_normalizeFaculty
const facultyService = facultyServiceImports_default
const academicService = academicServiceImports_default
const roleApi = apiEndpointsImports_roleApi
const FiShield = fiImports_FiShield
const FiAward = fiImports_FiAward
const FiUsers = fiImports_FiUsers
const FiKey = fiImports_FiKey
const FiPlus = fiImports_FiPlus
const FiEdit2 = fiImports_FiEdit2
const FiTrash2 = fiImports_FiTrash2
const FiSearch = fiImports_FiSearch
const FiCheck = fiImports_FiCheck
const FiX = fiImports_FiX
const FiSliders = fiImports_FiSliders
const FiUserCheck = fiImports_FiUserCheck
const FiChevronLeft = fiImports_FiChevronLeft
const FiChevronRight = fiImports_FiChevronRight
const FiInfo = fiImports_FiInfo
const FiAlertCircle = fiImports_FiAlertCircle
const FiRotateCcw = fiImports_FiRotateCcw

// ==========================================
// SYSTEM MODULES & PERMISSION SCHEMAS
// ==========================================
const SYSTEM_MODULES = [
  { id: 'colleges', name: 'Colleges & Institutions', description: 'Manage campus details, leadership & accreditation', category: 'Administration' },
  { id: 'departments', name: 'Departments & Leadership', description: 'Department HODs, academic streams & allocations', category: 'Administration' },
  { id: 'academic_years', name: 'Academic Years', description: 'Configure academic batches, terms & calendars', category: 'Administration' },
  { id: 'courses', name: 'Courses & Degrees', description: 'B.Tech / M.Tech degree programs & curricula', category: 'Academic Structure' },
  { id: 'branches', name: 'Branches / Streams', description: 'CSE, ECE, EEE, Mechanical & other specializations', category: 'Academic Structure' },
  { id: 'semesters', name: 'Semesters Management', description: 'Semester terms, session schedules & durations', category: 'Academic Structure' },
  { id: 'sections', name: 'Sections & Allocations', description: 'Student class sections, batches & capacities', category: 'Academic Structure' },
  { id: 'subjects', name: 'Subject Management', description: 'Core theory & lab subjects syllabus and codes', category: 'Curriculum' },
  { id: 'timetable', name: 'Timetable Scheduling', description: 'Weekly faculty-subject class periods & classrooms', category: 'Curriculum' },
  { id: 'credits', name: 'Credits & Syllabus', description: 'Credit points weightage, passing marks & units', category: 'Curriculum' },
  { id: 'electives', name: 'Elective Selection', description: 'Professional & open electives student allotments', category: 'Curriculum' },
  { id: 'faculty_directory', name: 'Faculty Directory', description: 'Faculty staff profiles, credentials & contact details', category: 'Staff & HR' },
  { id: 'faculty_attendance', name: 'Faculty Attendance', description: 'Daily biometric attendance & duty logs', category: 'Staff & HR' },
  { id: 'faculty_leaves', name: 'Faculty Leaves', description: 'Staff leave applications, approval & balance tracking', category: 'Staff & HR' },
  { id: 'faculty_payroll', name: 'Faculty Payroll', description: 'Salary slips, allowances, deductions & disbursal', category: 'Staff & HR' },
  { id: 'student_admissions', name: 'Student Admissions', description: 'New student admissions, document verification & enrollment', category: 'Students' },
  { id: 'student_profiles', name: 'Student Profiles', description: 'Student biodata, parent contact & academic records', category: 'Students' },
  { id: 'student_attendance', name: 'Student Attendance', description: 'Period-wise attendance marking & percentage tracking', category: 'Students' },
  { id: 'student_promotions', name: 'Student Promotions', description: 'Yearly/semester promotion, detention & batch upgrades', category: 'Students' },
  { id: 'marks', name: 'Marks & Internal Assessment', description: 'Mid exam marks, lab internals & assignment grading', category: 'Exams & Results' },
  { id: 'results', name: 'Semester Results & Grading', description: 'Final SGPA/CGPA generation, grade cards & publishing', category: 'Exams & Results' },
  { id: 'fees', name: 'Fee Structures & Collections', description: 'Tuition fees, dues, challans & payment receipts', category: 'Finance' },
  { id: 'roles_permissions', name: 'Roles & Access Control', description: 'Manage RBAC permissions matrix and security policies', category: 'System Settings' },
  { id: 'academic_settings', name: 'Academic Context Settings', description: 'Active academic year, college selection & global rules', category: 'System Settings' },
]

const PERMISSION_ACTIONS = [
  { id: 'view', label: 'View', icon: '👁️', desc: 'Read / View records' },
  { id: 'create', label: 'Create', icon: '➕', desc: 'Add new records' },
  { id: 'edit', label: 'Edit', icon: '✏️', desc: 'Modify existing data' },
  { id: 'delete', label: 'Delete', icon: '🗑️', desc: 'Remove records' },
  { id: 'export', label: 'Export', icon: '📤', desc: 'Download Excel/PDF' },
]

const fullAccessPermissions = () => {
  const perms = {}
  SYSTEM_MODULES.forEach((mod) => {
    perms[mod.id] = { view: true, create: true, edit: true, delete: true, export: true }
  })
  return perms
}

const readOnlyPermissions = () => {
  const perms = {}
  SYSTEM_MODULES.forEach((mod) => {
    perms[mod.id] = { view: true, create: false, edit: false, delete: false, export: true }
  })
  return perms
}

const hodPresetPermissions = () => {
  const perms = {}
  SYSTEM_MODULES.forEach((mod) => {
    const isAcademic = [
      'departments',
      'courses',
      'branches',
      'semesters',
      'sections',
      'subjects',
      'timetable',
      'electives',
      'faculty_directory',
      'faculty_attendance',
      'student_profiles',
      'student_attendance',
      'marks',
      'results',
    ].includes(mod.id)
    perms[mod.id] = {
      view: true,
      create: isAcademic,
      edit: isAcademic,
      delete: false,
      export: true,
    }
  })
  return perms
}

const facultyPresetPermissions = () => {
  const perms = {}
  SYSTEM_MODULES.forEach((mod) => {
    const isTeaching = ['subjects', 'timetable', 'student_attendance', 'marks'].includes(mod.id)
    const isViewable = ['courses', 'branches', 'semesters', 'sections', 'faculty_leaves', 'student_profiles', 'results'].includes(mod.id)
    perms[mod.id] = {
      view: isTeaching || isViewable,
      create: isTeaching,
      edit: isTeaching,
      delete: false,
      export: isTeaching,
    }
  })
  return perms
}

const DEFAULT_SYSTEM_ROLES = [
  {
    id: '1',
    roleId: '1',
    name: 'Super Administrator',
    code: 'SUPER_ADMIN',
    category: 'Administrative',
    level: 'Level 1 (Highest Governance)',
    description: 'Complete unrestricted access across all college entities, master configurations, finance, and security settings.',
    status: 'Active',
    isSystem: true,
    userCount: 3,
    permissions: fullAccessPermissions(),
  },
  {
    id: '2',
    roleId: '2',
    name: 'Academic Dean / Director',
    code: 'ACADEMIC_DEAN',
    category: 'Academic',
    level: 'Level 2 (Executive Leadership)',
    description: 'Institution-wide academic curriculum planning, faculty workload oversight, course approvals, and student promotions.',
    status: 'Active',
    isSystem: true,
    userCount: 2,
    permissions: hodPresetPermissions(),
  },
  {
    id: '3',
    roleId: '3',
    name: 'Department Head (HOD)',
    code: 'HOD_ROLE',
    category: 'Academic',
    level: 'Level 3 (Department Leadership)',
    description: 'Departmental faculty management, subject-period timetables, syllabus coverage, and internal exam approvals.',
    status: 'Active',
    isSystem: true,
    userCount: 8,
    permissions: hodPresetPermissions(),
  },
  {
    id: '4',
    roleId: '4',
    name: 'Teaching Faculty / Professor',
    code: 'TEACHING_FACULTY',
    category: 'Academic',
    level: 'Level 4 (Academic Staff)',
    description: 'Subject-wise class attendance marking, internal assignment & lab evaluations, and student mentoring.',
    status: 'Active',
    isSystem: true,
    userCount: 45,
    permissions: facultyPresetPermissions(),
  },
  {
    id: '5',
    roleId: '5',
    name: 'Examination Controller',
    code: 'EXAM_CONTROLLER',
    category: 'Administrative',
    level: 'Level 2 (Executive Leadership)',
    description: 'Semester examination hall tickets, mid-term & end-term marks entry lock, and SGPA/CGPA result publishing.',
    status: 'Active',
    isSystem: false,
    userCount: 4,
    permissions: readOnlyPermissions(),
  },
  {
    id: '6',
    roleId: '6',
    name: 'Finance & Accounts Officer',
    code: 'FINANCE_OFFICER',
    category: 'Administrative',
    level: 'Level 3 (Department Leadership)',
    description: 'Student fee structure setup, dues tracking, challan verification, and staff payroll disbursal.',
    status: 'Active',
    isSystem: false,
    userCount: 5,
    permissions: readOnlyPermissions(),
  },
]

const STANDARD_ROLE_TEMPLATES = [
  {
    name: 'Super Administrator',
    code: 'SUPER_ADMIN',
    category: 'Administrative',
    level: 'Level 1 (Highest Privileges)',
    description: 'Full unrestricted governance across all system configurations, security, faculty, and student records.',
    presetPerms: 'full',
  },
  {
    name: 'Academic Administrator',
    code: 'ACADEMIC_ADMIN',
    category: 'Academic',
    level: 'Level 2 (Executive Leadership)',
    description: 'Institution-wide academic curriculum planning, courses, branches, regulations, and semester approvals.',
    presetPerms: 'hod',
  },
  {
    name: 'Department Head (HOD)',
    code: 'HOD_ACCESS',
    category: 'Academic',
    level: 'Level 3 (Department Leadership)',
    description: 'Departmental faculty management, subject-period timetables, syllabus tracking, and internal exam approvals.',
    presetPerms: 'hod',
  },
  {
    name: 'Faculty Access',
    code: 'FACULTY_ACCESS',
    category: 'Academic',
    level: 'Level 4 (Academic Staff)',
    description: 'Subject teaching, daily student attendance marking, internal assignments & lab evaluations, and student mentoring.',
    presetPerms: 'faculty',
  },
  {
    name: 'Examination Controller',
    code: 'EXAM_CONTROLLER',
    category: 'Administrative',
    level: 'Level 2 (Executive Leadership)',
    description: 'Semester examination hall tickets, mid-term & end-term marks entry lock, and SGPA/CGPA result publishing.',
    presetPerms: 'read',
  },
  {
    name: 'Finance & Accounts Officer',
    code: 'FINANCE_OFFICER',
    category: 'Administrative',
    level: 'Level 3 (Department Leadership)',
    description: 'Student fee structure setup, dues tracking, fee receipts verification, and financial reporting.',
    presetPerms: 'read',
  },
  {
    name: 'Admissions Officer',
    code: 'ADMISSIONS_OFFICER',
    category: 'Administrative',
    level: 'Level 3 (Department Leadership)',
    description: 'Student enrollment, counseling, seat allocation, certificates verification, and branch allotting.',
    presetPerms: 'read',
  },
  {
    name: 'Training & Placement Officer (TPO)',
    code: 'TPO_OFFICER',
    category: 'Administrative',
    level: 'Level 3 (Department Leadership)',
    description: 'Campus placement drives, recruiter company relations, student placement eligibility, and internship records.',
    presetPerms: 'read',
  },
  {
    name: 'Librarian',
    code: 'LIBRARIAN',
    category: 'Administrative',
    level: 'Level 4 (Administrative Staff)',
    description: 'Library book cataloging, circulation, student issue/return records, and book overdue tracking.',
    presetPerms: 'read',
  },
  {
    name: 'Student Access',
    code: 'STUDENT_ACCESS',
    category: 'Student',
    level: 'Level 5 (End User)',
    description: 'Student self-service portal for viewing attendance, syllabus, internal marks, semester results, and dues.',
    presetPerms: 'read',
  },
]

const generateCodeFromName = (name) => {
  if (!name) return ''
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const validateRoleName = (name, currentRoleId, roleList = []) => {
  const trimmed = (name || '').trim()
  if (!trimmed) return 'Role Name is required.'
  if (trimmed.length < 3) return 'Role Name must be at least 3 characters long.'
  if (!/^[A-Za-z0-9\s&/\-_()]+$/.test(trimmed)) return 'Role Name can only contain letters, numbers, spaces, and & / - _ ( )'
  const duplicate = roleList.some((r) => String(r.id) !== String(currentRoleId) && (r.name || '').trim().toLowerCase() === trimmed.toLowerCase())
  if (duplicate) return 'A role with this name already exists.'
  return ''
}

const validateRoleCode = (code, currentRoleId, roleList = []) => {
  const trimmed = (code || '').trim().toUpperCase()
  if (!trimmed) return 'Role Code is required.'
  if (trimmed.length < 2) return 'Role Code must be at least 2 characters long.'
  if (!/^[A-Z0-9_]+$/.test(trimmed)) return 'Role Code can only contain uppercase letters, numbers, and underscores.'
  const duplicate = roleList.some((r) => String(r.id) !== String(currentRoleId) && (r.code || '').trim().toUpperCase() === trimmed)
  if (duplicate) return 'A role with this code already exists.'
  return ''
}

const validateDesTitle = (title, currentDesId, desList = []) => {
  const trimmed = (title || '').trim()
  if (!trimmed) return 'Designation Title is required.'
  if (trimmed.length < 3) return 'Designation Title must be at least 3 characters long.'
  const duplicate = desList.some((d) => String(d.id) !== String(currentDesId) && (d.title || '').trim().toLowerCase() === trimmed.toLowerCase())
  if (duplicate) return 'A designation with this title already exists.'
  return ''
}

const validateDesCode = (code, currentDesId, desList = []) => {
  const trimmed = (code || '').trim().toUpperCase()
  if (!trimmed) return 'Designation Code is required.'
  if (trimmed.length < 2) return 'Designation Code must be at least 2 characters long.'
  if (!/^[A-Z0-9_]+$/.test(trimmed)) return 'Designation Code can only contain uppercase letters, numbers, and underscores.'
  const duplicate = desList.some((d) => String(d.id) !== String(currentDesId) && (d.code || '').trim().toUpperCase() === trimmed)
  if (duplicate) return 'A designation with this code already exists.'
  return ''
}

const DEFAULT_DESIGNATIONS = [
  {
    id: '1',
    title: 'Professor & Head of Department (HOD)',
    code: 'PROF_HOD',
    category: 'Teaching',
    level: 'Band 1 (Leadership)',
    department: 'General / Shared',
    defaultRole: '3',
    status: 'Active',
  },
  {
    id: '2',
    title: 'Professor',
    code: 'PROF',
    category: 'Teaching',
    level: 'Band 2 (Senior Academic)',
    department: 'General / Shared',
    defaultRole: '4',
    status: 'Active',
  },
  {
    id: '3',
    title: 'Associate Professor',
    code: 'ASSOC_PROF',
    category: 'Teaching',
    level: 'Band 3 (Mid-level Academic)',
    department: 'General / Shared',
    defaultRole: '4',
    status: 'Active',
  },
  {
    id: '4',
    title: 'Assistant Professor',
    code: 'ASST_PROF',
    category: 'Teaching',
    level: 'Band 4 (Entry Academic)',
    department: 'General / Shared',
    defaultRole: '4',
    status: 'Active',
  },
  {
    id: '5',
    title: 'Lab Assistant / Instructor',
    code: 'LAB_ASST',
    category: 'Technical',
    level: 'Band 5 (Technical Staff)',
    department: 'General / Shared',
    defaultRole: '4',
    status: 'Active',
  },
  {
    id: '6',
    title: 'Administrative Officer',
    code: 'ADMIN_OFFICER',
    category: 'Administrative',
    level: 'Band 3 (Mid-level Academic)',
    department: 'General / Shared',
    defaultRole: '1',
    status: 'Active',
  },
]

const DEFAULT_DEPARTMENTS = [
  { id: '1', name: 'Computer Science & Engineering', code: 'CSE' },
  { id: '2', name: 'Electronics & Communication', code: 'ECE' },
  { id: '3', name: 'Electrical & Electronics', code: 'EEE' },
  { id: '4', name: 'Mechanical Engineering', code: 'MECH' },
  { id: '5', name: 'Civil Engineering', code: 'CIVIL' },
  { id: '6', name: 'Information Technology', code: 'IT' },
  { id: '7', name: 'Administration', code: 'ADMIN' },
]

const DEFAULT_STAFF_MEMBERS = [
  {
    id: '1',
    facultyId: '1',
    employeeId: 'EMP000001',
    fullName: 'Dr. Ramesh Sharma',
    email: 'ramesh.sharma@pirnav.edu',
    department: 'Computer Science & Engineering',
    departmentId: '1',
    designation: 'Professor & Head of Department (HOD)',
    employeeCategory: 'Teaching',
    status: 'Working',
  },
  {
    id: '2',
    facultyId: '2',
    employeeId: 'EMP000002',
    fullName: 'Dr. Priya Ananth',
    email: 'priya.ananth@pirnav.edu',
    department: 'Electronics & Communication',
    departmentId: '2',
    designation: 'Professor',
    employeeCategory: 'Teaching',
    status: 'Working',
  },
  {
    id: '3',
    facultyId: '3',
    employeeId: 'EMP000003',
    fullName: 'Dr. Suresh Kumar',
    email: 'suresh.kumar@pirnav.edu',
    department: 'Mechanical Engineering',
    departmentId: '3',
    designation: 'Associate Professor',
    employeeCategory: 'Teaching',
    status: 'Working',
  },
  {
    id: '4',
    facultyId: '4',
    employeeId: 'EMP000004',
    fullName: 'Ms. Anjali Verma',
    email: 'anjali.verma@pirnav.edu',
    department: 'Information Technology',
    departmentId: '4',
    designation: 'Assistant Professor',
    employeeCategory: 'Teaching',
    status: 'Working',
  },
  {
    id: '5',
    facultyId: '5',
    employeeId: 'EMP000005',
    fullName: 'Mr. Rajesh Patel',
    email: 'rajesh.patel@pirnav.edu',
    department: 'Computer Science & Engineering',
    departmentId: '1',
    designation: 'Lab Assistant / Instructor',
    employeeCategory: 'Technical',
    status: 'Working',
  },
  {
    id: '6',
    facultyId: '6',
    employeeId: 'EMP000006',
    fullName: 'Mr. Vikram Reddy',
    email: 'vikram.reddy@pirnav.edu',
    department: 'Administration',
    departmentId: '7',
    designation: 'Administrative Officer',
    employeeCategory: 'Administrative',
    status: 'Working',
  },
]

const STORAGE_KEY_ROLES = 'pirnav_erp_rbac_roles_clean_v1'
const STORAGE_KEY_DESIGNATIONS = 'pirnav_erp_rbac_designations_clean_v1'
const STORAGE_KEY_ASSIGNMENTS = 'pirnav_erp_rbac_assignments_clean_v1'

function RolesAndDesignations() {
  const [activeTab, setActiveTab] = useState('roles') // 'roles' | 'designations' | 'assignments'
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Real data state
  const [roles, setRoles] = useState(() => {
    try {
      const saved = localStorage.getItem(collegeStorageKey(STORAGE_KEY_ROLES))
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) && parsed.length >= DEFAULT_SYSTEM_ROLES.length ? parsed : DEFAULT_SYSTEM_ROLES
    } catch {
      return DEFAULT_SYSTEM_ROLES
    }
  })

  const [designations, setDesignations] = useState(() => {
    try {
      const saved = localStorage.getItem(collegeStorageKey(STORAGE_KEY_DESIGNATIONS))
      const parsed = saved ? JSON.parse(saved) : []
      return Array.isArray(parsed) && parsed.length >= DEFAULT_DESIGNATIONS.length ? parsed : DEFAULT_DESIGNATIONS
    } catch {
      return DEFAULT_DESIGNATIONS
    }
  })

  const [assignments, setAssignments] = useState(() => {
    try {
      const saved = localStorage.getItem(collegeStorageKey(STORAGE_KEY_ASSIGNMENTS))
      const parsed = saved ? JSON.parse(saved) : null
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        return parsed
      }
      return {}
    } catch {
      return {}
    }
  })

  const [facultyList, setFacultyList] = useCollegeState([])
  const [departments, setDepartments] = useCollegeState([])
  const [isLoadingFaculty, setIsLoadingFaculty] = useState(false)
  const [rolesLoadError, setRolesLoadError] = useState('')

  // Modals state
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [isSavingRole, setIsSavingRole] = useState(false)
  const [roleModalError, setRoleModalError] = useState('')
  const [isRoleCodeCustomized, setIsRoleCodeCustomized] = useState(false)
  const [roleFieldErrors, setRoleFieldErrors] = useState({})

  const [isDesModalOpen, setIsDesModalOpen] = useState(false)
  const [editingDesignation, setEditingDesignation] = useState(null)
  const [isDesCodeCustomized, setIsDesCodeCustomized] = useState(false)
  const [desFieldErrors, setDesFieldErrors] = useState({})

  const [isPermModalOpen, setIsPermModalOpen] = useState(false)
  const [editingPermissionsRole, setEditingPermissionsRole] = useState(null)
  const [isSavingPerms, setIsSavingPerms] = useState(false)
  const [permsModalError, setPermsModalError] = useState('')

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [assigningStaff, setAssigningStaff] = useState(null)
  const [selectedStaffRole, setSelectedStaffRole] = useState('')
  const [selectedStaffDesignation, setSelectedStaffDesignation] = useState('')
  const [selectedStaffScopeType, setSelectedStaffScopeType] = useState('Department') // 'Institution-wide' | 'Department' | 'Self / Assigned Classes'
  const [selectedStaffScopeDept, setSelectedStaffScopeDept] = useState('')

  // Lavender Delete Confirmation Modal State
  const [deletingRole, setDeletingRole] = useState(null)
  const [isDeletingRole, setIsDeletingRole] = useState(false)
  const [roleDeleteError, setRoleDeleteError] = useState('')

  const [deletingDesignation, setDeletingDesignation] = useState(null)

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem(collegeStorageKey(STORAGE_KEY_ROLES), JSON.stringify(roles))
  }, [roles])

  useEffect(() => {
    localStorage.setItem(collegeStorageKey(STORAGE_KEY_DESIGNATIONS), JSON.stringify(designations))
  }, [designations])

  useEffect(() => {
    localStorage.setItem(collegeStorageKey(STORAGE_KEY_ASSIGNMENTS), JSON.stringify(assignments))
  }, [assignments])

  // Load real live faculty, departments, and roles from backend
  const loadRoles = async () => {
    setRolesLoadError('')
    try {
      const apiRoles = await roleApi.getAll()
      if (Array.isArray(apiRoles) && apiRoles.length > 0) {
        const normalized = apiRoles.map((r) => {
          const id = String(r.roleId ?? r.RoleId ?? r.id ?? r.Id ?? '')
          const name = r.roleName ?? r.RoleName ?? r.name ?? r.Name ?? ''
          const code = r.roleCode ?? r.RoleCode ?? r.code ?? r.Code ?? (name ? name.toUpperCase().replace(/\s+/g, '_') : '')
          let permissions = r.permissions ?? r.Permissions
          if (typeof permissions === 'string') {
            try { permissions = JSON.parse(permissions) } catch { permissions = null }
          }
          if (!permissions || typeof permissions !== 'object') {
            permissions = readOnlyPermissions()
          }
          return {
            id: id || `ROLE-${name.toUpperCase().replace(/\s+/g, '_')}`,
            roleId: id,
            name,
            code,
            category: r.category ?? r.Category ?? 'Academic',
            level: r.level ?? r.Level ?? 'Level 4 (Academic Staff)',
            description: r.description ?? r.Description ?? '',
            status: (r.status === 0 || r.status === 'Inactive' || r.status === false || r.isActive === false || r.IsActive === false) ? 'Inactive' : 'Active',
            isSystem: Boolean(r.isSystem ?? r.IsSystem),
            userCount: Number(r.userCount ?? r.UserCount ?? 0),
            permissions,
          }
        }).filter(r => r.name)

        if (normalized.length > 0) {
          setRoles(normalized)
          return
        }
      }
    } catch (err) {
      setRolesLoadError(err?.message || 'Failed to load roles from server.')
      console.warn('Backend roles API request failed:', err?.message || err)
    }
  }

  useEffect(() => {
    loadRoles()

    setIsLoadingFaculty(true)
    facultyService.list()
      .then((records) => {
        const normalized = (records || []).map(normalizeFaculty).filter(r => r.fullName)
        if (normalized.length > 0) {
          setFacultyList(normalized)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingFaculty(false))

    academicService.getDepartments()
      .then((depts) => {
        if (Array.isArray(depts) && depts.length > 0) {
          setDepartments(depts)
        }
      })
      .catch(() => {})
  }, [])

  // Reset pagination on tab / search / filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, query, categoryFilter, pageSize])

  // Count helper: How many staff members have this role assigned
  const countStaffWithRole = (roleId) => {
    if (!roleId) return 0
    return facultyList.filter((staff) => {
      const assigned = assignments[staff.id]
      return String(assigned?.roleId) === String(roleId)
    }).length
  }

  // Count helper: How many staff members have this designation assigned
  const countStaffWithDesignation = (desId, desTitle) => {
    return facultyList.filter((staff) => {
      const assigned = assignments[staff.id]
      if (String(assigned?.designationId) === String(desId)) return true
      const staffDes = String(staff.designation || '').trim().toLowerCase()
      if (staffDes && desTitle && staffDes === desTitle.toLowerCase()) return true
      return false
    }).length
  }

  // ==========================================
  // 1. ROLES & PERMISSIONS HANDLERS
  // ==========================================
  const handleOpenCreateRole = () => {
    setRoleModalError('')
    setRoleFieldErrors({})
    setIsRoleCodeCustomized(false)
    setEditingRole({
      id: `ROLE-${String(Date.now()).slice(-4)}`,
      name: '',
      code: '',
      category: '',
      level: '',
      description: '',
      status: 'Active',
      isSystem: false,
      userCount: 0,
      permissions: readOnlyPermissions(),
    })
    setIsRoleModalOpen(true)
  }

  const handleOpenEditRole = (role) => {
    setRoleModalError('')
    setRoleFieldErrors({})
    setIsRoleCodeCustomized(true)
    setEditingRole({ ...role })
    setIsRoleModalOpen(true)
  }

  const handleRoleNameChange = (val) => {
    const nextName = val
    const autoCode = !isRoleCodeCustomized && !editingRole?.isSystem ? generateCodeFromName(nextName) : (editingRole?.code || '')
    setEditingRole((prev) => ({
      ...prev,
      name: nextName,
      code: autoCode,
    }))

    // Live validation
    const nameErr = validateRoleName(nextName, editingRole?.id, roles)
    const codeErr = validateRoleCode(autoCode, editingRole?.id, roles)
    setRoleFieldErrors((prev) => ({
      ...prev,
      name: nameErr,
      code: codeErr,
    }))
  }

  const handleRoleCodeChange = (val) => {
    const rawVal = val.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    setIsRoleCodeCustomized(true)
    setEditingRole((prev) => ({
      ...prev,
      code: rawVal,
    }))
    const codeErr = validateRoleCode(rawVal, editingRole?.id, roles)
    setRoleFieldErrors((prev) => ({ ...prev, code: codeErr }))
  }

  const handleResetRoleCodeToAuto = () => {
    const autoCode = generateCodeFromName(editingRole?.name || '')
    setIsRoleCodeCustomized(false)
    setEditingRole((prev) => ({
      ...prev,
      code: autoCode,
    }))
    const codeErr = validateRoleCode(autoCode, editingRole?.id, roles)
    setRoleFieldErrors((prev) => ({ ...prev, code: codeErr }))
  }

  const handleSelectRoleTemplate = (tmplName) => {
    if (!tmplName) return
    const tmpl = STANDARD_ROLE_TEMPLATES.find((t) => t.name === tmplName)
    if (!tmpl) return
    let perms = readOnlyPermissions()
    if (tmpl.presetPerms === 'full') perms = fullAccessPermissions()
    if (tmpl.presetPerms === 'hod') perms = hodPresetPermissions()
    if (tmpl.presetPerms === 'faculty') perms = facultyPresetPermissions()

    setIsRoleCodeCustomized(false)
    setEditingRole((prev) => ({
      ...prev,
      name: tmpl.name,
      code: tmpl.code,
      category: tmpl.category,
      level: tmpl.level,
      description: tmpl.description,
      status: 'Active',
      permissions: perms,
    }))
    setRoleFieldErrors({})
  }

  const handleSaveRole = async (e) => {
    e.preventDefault()
    setRoleModalError('')

    const nameErr = validateRoleName(editingRole.name, editingRole.id, roles)
    const codeErr = validateRoleCode(editingRole.code, editingRole.id, roles)
    const categoryErr = !editingRole.category ? 'Please select a category.' : ''
    const levelErr = !editingRole.level ? 'Please select a hierarchy level.' : ''
    const statusErr = !editingRole.status ? 'Please select a status.' : ''

    const newErrors = {
      name: nameErr,
      code: codeErr,
      category: categoryErr,
      level: levelErr,
      status: statusErr,
    }
    setRoleFieldErrors(newErrors)

    if (nameErr || codeErr || categoryErr || levelErr || statusErr) {
      const firstErr = nameErr || codeErr || categoryErr || levelErr || statusErr
      return showError(firstErr)
    }

    const normalizedCode = editingRole.code.trim().toUpperCase()
    const isBoolStatus = editingRole.status === 'Active' || editingRole.status === true || editingRole.status === 1
    const payload = {
      name: editingRole.name.trim(),
      roleName: editingRole.name.trim(),
      code: normalizedCode,
      roleCode: normalizedCode,
      category: editingRole.category,
      level: editingRole.level,
      description: editingRole.description || '',
      status: isBoolStatus,
      isActive: isBoolStatus,
      permissions: typeof editingRole.permissions === 'object' ? JSON.stringify(editingRole.permissions) : editingRole.permissions || '{}',
    }

    const isExistingNumeric = Number.isInteger(Number(editingRole.id)) && Number(editingRole.id) > 0
    let savedId = editingRole.id

    setIsSavingRole(true)
    try {
      if (isExistingNumeric) {
        await roleApi.update(editingRole.id, payload)
      } else {
        const created = await roleApi.create(payload)
        if (created?.roleId || created?.id || created?.data?.roleId || created?.data?.id) {
          savedId = String(created.roleId || created.id || created?.data?.roleId || created?.data?.id)
        }
      }

      // API succeeded -> Mutate state, notify, and close modal
      setRoles((current) => {
        const exists = current.some((r) => r.id === editingRole.id)
        const finalRole = { ...editingRole, id: savedId, roleId: savedId, code: normalizedCode }
        if (exists) {
          return current.map((r) => (r.id === editingRole.id ? finalRole : r))
        }
        return [...current, finalRole]
      })

      showSuccess(`Role "${editingRole.name}" saved successfully.`)
      setIsRoleModalOpen(false)
    } catch (err) {
      // API FAILED -> Keep modal open, do not mutate state, show proper error message, allow retry
      const errMsg = err?.message || 'Server failed to save role. Please check connection and retry.'
      setRoleModalError(errMsg)
      showError(errMsg)
    } finally {
      setIsSavingRole(false)
    }
  }

  const handleDeleteRole = (role) => {
    setRoleDeleteError('')
    if (role.isSystem) return showError('System default roles cannot be deleted.')
    const assignedStaffCount = countStaffWithRole(role.id)
    if (assignedStaffCount > 0) {
      return showError(`Cannot delete role "${role.name}" because it is currently assigned to ${assignedStaffCount} staff member(s). Reassign them first.`)
    }
    setDeletingRole(role)
  }

  const handleConfirmDeleteRole = async () => {
    if (!deletingRole) return
    if (deletingRole.isSystem) {
      setDeletingRole(null)
      return showError('System default roles cannot be deleted.')
    }

    const assignedStaffCount = countStaffWithRole(deletingRole.id)
    if (assignedStaffCount > 0) {
      setRoleDeleteError(`Cannot delete "${deletingRole.name}" because ${assignedStaffCount} staff member(s) are actively assigned to it.`)
      return showError(`Cannot delete "${deletingRole.name}" because it is currently assigned to ${assignedStaffCount} staff member(s).`)
    }

    const isNumeric = Number.isInteger(Number(deletingRole.id)) && Number(deletingRole.id) > 0
    setIsDeletingRole(true)
    try {
      if (isNumeric) {
        await roleApi.delete(deletingRole.id)
      }

      // API Succeeded -> Update state, show success, close modal
      setRoles((current) => current.filter((r) => r.id !== deletingRole.id))
      showSuccess(`Role "${deletingRole.name}" deleted successfully.`)
      setDeletingRole(null)
    } catch (err) {
      // API Failed -> Keep modal open, do not remove from UI, display error
      const errMsg = err?.message || 'Failed to delete role on server.'
      setRoleDeleteError(errMsg)
      showError(errMsg)
    } finally {
      setIsDeletingRole(false)
    }
  }

  // Permissions Matrix Handlers
  const handleOpenPermissions = (role) => {
    setPermsModalError('')
    setEditingPermissionsRole(JSON.parse(JSON.stringify(role)))
    setIsPermModalOpen(true)
  }

  const handleTogglePermission = (moduleId, actionId) => {
    setEditingPermissionsRole((prev) => {
      const currentMod = prev.permissions?.[moduleId] || { view: false, create: false, edit: false, delete: false, export: false }
      const nextVal = !currentMod[actionId]
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleId]: {
            ...currentMod,
            [actionId]: nextVal,
            // If Create, Edit, Delete, or Export is enabled, View must automatically be enabled
            ...(nextVal && actionId !== 'view' ? { view: true } : {}),
            // If View is disabled, all dependent permissions must automatically be disabled
            ...(!nextVal && actionId === 'view' ? { create: false, edit: false, delete: false, export: false } : {}),
          },
        },
      }
    })
  }

  const handleToggleRowAll = (moduleId) => {
    setEditingPermissionsRole((prev) => {
      const currentMod = prev.permissions?.[moduleId] || { view: false, create: false, edit: false, delete: false, export: false }
      const allActive = PERMISSION_ACTIONS.every((act) => currentMod[act.id])
      const nextVal = !allActive
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          [moduleId]: {
            view: nextVal,
            create: nextVal,
            edit: nextVal,
            delete: nextVal,
            export: nextVal,
          },
        },
      }
    })
  }

  const handleToggleCategoryAll = (category) => {
    setEditingPermissionsRole((prev) => {
      const categoryModules = SYSTEM_MODULES.filter((m) => m.category === category)
      const allCategoryActive = categoryModules.every((mod) => {
        const modPerm = prev.permissions?.[mod.id] || {}
        return PERMISSION_ACTIONS.every((act) => modPerm[act.id])
      })
      const nextVal = !allCategoryActive
      const updated = { ...prev.permissions }
      categoryModules.forEach((mod) => {
        updated[mod.id] = {
          view: nextVal,
          create: nextVal,
          edit: nextVal,
          delete: nextVal,
          export: nextVal,
        }
      })
      return {
        ...prev,
        permissions: updated,
      }
    })
  }

  const handleApplyPreset = (presetName) => {
    if (!editingPermissionsRole) return
    let newPerms = {}
    if (presetName === 'full') newPerms = fullAccessPermissions()
    if (presetName === 'read') newPerms = readOnlyPermissions()
    if (presetName === 'hod') newPerms = hodPresetPermissions()
    if (presetName === 'faculty') newPerms = facultyPresetPermissions()

    setEditingPermissionsRole((prev) => ({
      ...prev,
      permissions: newPerms,
    }))
    showSuccess(`Applied "${presetName.toUpperCase()}" permissions preset.`)
  }

  const handleSavePermissions = async () => {
    setPermsModalError('')
    const isBoolStatus = editingPermissionsRole.status === 'Active' || editingPermissionsRole.status === true || editingPermissionsRole.status === 1
    const payload = {
      name: editingPermissionsRole.name,
      roleName: editingPermissionsRole.name,
      code: editingPermissionsRole.code,
      roleCode: editingPermissionsRole.code,
      category: editingPermissionsRole.category,
      level: editingPermissionsRole.level,
      description: editingPermissionsRole.description || '',
      status: isBoolStatus,
      isActive: isBoolStatus,
      permissions: typeof editingPermissionsRole.permissions === 'object' ? JSON.stringify(editingPermissionsRole.permissions) : editingPermissionsRole.permissions || '{}',
    }
    const isExistingNumeric = Number.isInteger(Number(editingPermissionsRole.id)) && Number(editingPermissionsRole.id) > 0

    setIsSavingPerms(true)
    try {
      if (isExistingNumeric) {
        await roleApi.update(editingPermissionsRole.id, payload)
      } else {
        await roleApi.create(payload)
      }

      // API Succeeded -> Update state, notify, close modal
      setRoles((current) => current.map((r) => (r.id === editingPermissionsRole.id ? editingPermissionsRole : r)))
      showSuccess(`Access permissions updated for role "${editingPermissionsRole.name}".`)
      setIsPermModalOpen(false)
    } catch (err) {
      // API Failed -> Keep modal open, show error message, allow retry
      const errMsg = err?.message || 'Failed to save permissions on server. Please retry.'
      setPermsModalError(errMsg)
      showError(errMsg)
    } finally {
      setIsSavingPerms(false)
    }
  }

  // ==========================================
  // 2. DESIGNATIONS HANDLERS
  // ==========================================
  const handleOpenCreateDesignation = () => {
    setDesFieldErrors({})
    setIsDesCodeCustomized(false)
    setEditingDesignation({
      id: `DES-${String(Date.now()).slice(-4)}`,
      title: '',
      code: '',
      category: '',
      level: '',
      department: 'General / Shared',
      defaultRole: '',
      status: 'Active',
    })
    setIsDesModalOpen(true)
  }

  const handleOpenEditDesignation = (des) => {
    setDesFieldErrors({})
    setIsDesCodeCustomized(true)
    setEditingDesignation({ ...des })
    setIsDesModalOpen(true)
  }

  const handleDesTitleChange = (val) => {
    const nextTitle = val
    const autoCode = !isDesCodeCustomized ? generateCodeFromName(nextTitle) : (editingDesignation?.code || '')
    setEditingDesignation((prev) => ({
      ...prev,
      title: nextTitle,
      code: autoCode,
    }))

    const titleErr = validateDesTitle(nextTitle, editingDesignation?.id, designations)
    const codeErr = validateDesCode(autoCode, editingDesignation?.id, designations)
    setDesFieldErrors((prev) => ({
      ...prev,
      title: titleErr,
      code: codeErr,
    }))
  }

  const handleDesCodeChange = (val) => {
    const rawVal = val.toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    setIsDesCodeCustomized(true)
    setEditingDesignation((prev) => ({
      ...prev,
      code: rawVal,
    }))
    const codeErr = validateDesCode(rawVal, editingDesignation?.id, designations)
    setDesFieldErrors((prev) => ({ ...prev, code: codeErr }))
  }

  const handleResetDesCodeToAuto = () => {
    const autoCode = generateCodeFromName(editingDesignation?.title || '')
    setIsDesCodeCustomized(false)
    setEditingDesignation((prev) => ({
      ...prev,
      code: autoCode,
    }))
    const codeErr = validateDesCode(autoCode, editingDesignation?.id, designations)
    setDesFieldErrors((prev) => ({ ...prev, code: codeErr }))
  }

  const handleSaveDesignation = (e) => {
    e.preventDefault()

    const titleErr = validateDesTitle(editingDesignation.title, editingDesignation.id, designations)
    const codeErr = validateDesCode(editingDesignation.code, editingDesignation.id, designations)
    const categoryErr = !editingDesignation.category ? 'Please select a staff category.' : ''
    const levelErr = !editingDesignation.level ? 'Please select a hierarchy level band.' : ''
    const statusErr = !editingDesignation.status ? 'Please select a status.' : ''

    const newErrors = {
      title: titleErr,
      code: codeErr,
      category: categoryErr,
      level: levelErr,
      status: statusErr,
    }
    setDesFieldErrors(newErrors)

    if (titleErr || codeErr || categoryErr || levelErr || statusErr) {
      const firstErr = titleErr || codeErr || categoryErr || levelErr || statusErr
      return showError(firstErr)
    }

    const normalizedCode = editingDesignation.code.trim().toUpperCase()

    setDesignations((current) => {
      const exists = current.some((d) => d.id === editingDesignation.id)
      if (exists) {
        return current.map((d) => (d.id === editingDesignation.id ? { ...editingDesignation, code: normalizedCode } : d))
      }
      return [...current, { ...editingDesignation, code: normalizedCode }]
    })

    showSuccess(`Designation "${editingDesignation.title}" saved successfully.`)
    setIsDesModalOpen(false)
  }

  const handleDeleteDesignation = (des) => {
    const assignedStaffCount = countStaffWithDesignation(des.id, des.title)
    if (assignedStaffCount > 0) {
      return showError(`Cannot delete designation "${des.title}" because it is currently assigned to ${assignedStaffCount} staff member(s). Reassign them first.`)
    }
    setDeletingDesignation(des)
  }

  const handleConfirmDeleteDesignation = () => {
    if (!deletingDesignation) return
    const assignedStaffCount = countStaffWithDesignation(deletingDesignation.id, deletingDesignation.title)
    if (assignedStaffCount > 0) {
      return showError(`Cannot delete designation "${deletingDesignation.title}" because it is assigned to ${assignedStaffCount} staff member(s).`)
    }

    setDesignations((current) => current.filter((d) => d.id !== deletingDesignation.id))
    showSuccess(`Designation "${deletingDesignation.title}" deleted successfully.`)
    setDeletingDesignation(null)
  }

  // ==========================================
  // 3. STAFF ACCESS ASSIGNMENT HANDLERS
  // ==========================================
  const handleOpenAssignStaff = (staff) => {
    setAssigningStaff(staff)
    const assigned = assignments[staff.id]

    const staffDesText = String(staff.designation || '').trim().toLowerCase()
    const matchedDes = designations.find((d) =>
      (staffDesText && d.title.toLowerCase().includes(staffDesText)) ||
      (staffDesText && d.code.toLowerCase() === staffDesText)
    ) || designations[0]

    const initialDesId = assigned?.designationId || matchedDes?.id || (designations[0]?.id || '')
    const selectedDesObj = designations.find((d) => d.id === initialDesId) || matchedDes
    const initialRoleId = assigned?.roleId || selectedDesObj?.defaultRole || (roles[0]?.id || '')

    setSelectedStaffDesignation(initialDesId)
    setSelectedStaffRole(initialRoleId)

    // Scope resolution
    if (assigned?.scopeType) {
      setSelectedStaffScopeType(assigned.scopeType)
      setSelectedStaffScopeDept(assigned.scopeDepartmentId || assigned.scopeDepartmentName || staff.department || '')
    } else if (assigned?.scope?.startsWith('Department')) {
      setSelectedStaffScopeType('Department')
      setSelectedStaffScopeDept(assigned.scopeDepartmentId || staff.department || '')
    } else if (assigned?.scope === 'Institution-wide' || assigned?.scope === 'College-wide') {
      setSelectedStaffScopeType('Institution-wide')
      setSelectedStaffScopeDept('')
    } else if (assigned?.scope === 'Self / Assigned Classes') {
      setSelectedStaffScopeType('Self / Assigned Classes')
      setSelectedStaffScopeDept('')
    } else {
      setSelectedStaffScopeType('Department')
      setSelectedStaffScopeDept(staff.departmentId || staff.department || (departments[0]?.id || departments[0]?.name || ''))
    }

    setIsAssignModalOpen(true)
  }

  const handleDesignationSelect = (desId) => {
    setSelectedStaffDesignation(desId)
    const desObj = designations.find((d) => d.id === desId)
    if (desObj?.defaultRole && roles.some((r) => r.id === desObj.defaultRole)) {
      setSelectedStaffRole(desObj.defaultRole)
    }
  }

  const handleSaveStaffAssignment = (e) => {
    e.preventDefault()
    if (!assigningStaff) return
    if (!selectedStaffDesignation) return showError('Please select an official designation.')
    if (!selectedStaffRole) return showError('Please select a system access role.')
    if (!selectedStaffScopeType) return showError('Please select an access scope.')

    let formattedScope = selectedStaffScopeType
    let selectedDeptObj = null
    if (selectedStaffScopeType === 'Department') {
      selectedDeptObj = departments.find(d => String(d.id) === String(selectedStaffScopeDept) || d.name === selectedStaffScopeDept)
      const deptName = selectedDeptObj?.name || selectedStaffScopeDept || assigningStaff.department || 'Department'
      formattedScope = `Department: ${deptName}`
    }

    setAssignments((prev) => ({
      ...prev,
      [assigningStaff.id]: {
        roleId: selectedStaffRole,
        designationId: selectedStaffDesignation,
        scope: formattedScope,
        scopeType: selectedStaffScopeType,
        scopeDepartmentId: selectedDeptObj?.id || selectedStaffScopeDept || '',
        scopeDepartmentName: selectedDeptObj?.name || selectedStaffScopeDept || '',
        updatedAt: new Date().toISOString(),
      },
    }))

    const assignedRole = roles.find((r) => r.id === selectedStaffRole)
    const assignedDes = designations.find((d) => d.id === selectedStaffDesignation)
    showSuccess(`Updated access for ${assigningStaff.fullName} to "${assignedRole?.name || 'Assigned Role'}" (${assignedDes?.title || ''}).`)
    setIsAssignModalOpen(false)
  }

  // ==========================================
  // FILTERED DATA & PAGINATION
  // ==========================================
  const filteredRoles = useMemo(() => {
    return roles.filter((role) => {
      const matchesQuery = `${role.name} ${role.code} ${role.description} ${role.category}`.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = !categoryFilter || role.category === categoryFilter
      return matchesQuery && matchesCategory
    })
  }, [roles, query, categoryFilter])

  const filteredDesignations = useMemo(() => {
    return designations.filter((des) => {
      const matchesQuery = `${des.title} ${des.code} ${des.department} ${des.category}`.toLowerCase().includes(query.toLowerCase())
      const matchesCategory = !categoryFilter || des.category === categoryFilter
      return matchesQuery && matchesCategory
    })
  }, [designations, query, categoryFilter])

  const staffAssignmentRows = useMemo(() => {
    return facultyList.map((staff) => {
      const assigned = assignments[staff.id]
      const currentRole = roles.find((r) => r.id === assigned?.roleId) || null
      const currentDesignation = designations.find((d) => d.id === assigned?.designationId) || (staff.designation ? { title: staff.designation } : null)

      return {
        ...staff,
        currentRole,
        currentDesignation,
        scope: assigned?.scope || 'Department-scoped',
        isExplicitlyAssigned: Boolean(assigned),
      }
    }).filter((s) => {
      const matchesQuery = `${s.fullName} ${s.employeeId} ${s.department} ${s.currentRole?.name || ''} ${s.currentDesignation?.title || ''}`.toLowerCase().includes(query.toLowerCase())
      return matchesQuery
    })
  }, [facultyList, assignments, roles, designations, query])

  // Paginated Slices
  const activeDataset = activeTab === 'roles' ? filteredRoles : activeTab === 'designations' ? filteredDesignations : staffAssignmentRows
  const exportColumns = activeTab === 'roles' ? [
    { label: 'System Access Role', value: 'name' },
    { label: 'Description', value: 'description' },
    { label: 'Role Code', value: 'code' },
    { label: 'Category', value: 'category' },
    { label: 'Hierarchy Level', value: 'level' },
    { label: 'Status', value: 'status' },
  ] : activeTab === 'designations' ? [
    { label: 'Designation', value: 'title' },
    { label: 'Code', value: 'code' },
    { label: 'Category', value: 'category' },
    { label: 'Level', value: 'level' },
    { label: 'Department', value: row => row.department || 'All Departments' },
    { label: 'Status', value: 'status' },
  ] : [
    { label: 'Staff Name', value: 'fullName' },
    { label: 'Email', value: 'email' },
    { label: 'Employee ID', value: 'employeeId' },
    { label: 'Department', value: 'department' },
    { label: 'Designation', value: row => row.currentDesignation?.title || 'Not Assigned' },
    { label: 'Role', value: row => row.currentRole?.name || 'Not Assigned' },
    { label: 'Scope', value: row => row.isExplicitlyAssigned ? row.scope : 'Default Scope' },
  ]
  const totalItems = activeDataset.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return activeDataset.slice(start, start + pageSize)
  }, [activeDataset, currentPage, pageSize])

  // Group modules for permission modal
  const moduleCategories = useMemo(() => {
    const groups = {}
    SYSTEM_MODULES.forEach((mod) => {
      if (!groups[mod.category]) groups[mod.category] = []
      groups[mod.category].push(mod)
    })
    return Object.entries(groups)
  }, [])

  // Active permissions count in modal
  const totalPossiblePerms = useMemo(() => {
    return SYSTEM_MODULES.length * PERMISSION_ACTIONS.length
  }, [])

  const grantedPermsCount = useMemo(() => {
    if (!editingPermissionsRole?.permissions) return 0
    return Object.values(editingPermissionsRole.permissions).reduce((acc, p) => acc + Object.values(p || {}).filter(Boolean).length, 0)
  }, [editingPermissionsRole])

  // Correct ASSIGNED count: represents actual explicitly assigned staff records
  const assignedCount = useMemo(() => {
    return staffAssignmentRows.filter((s) => s.isExplicitlyAssigned || Boolean(s.currentRole)).length
  }, [staffAssignmentRows])

  const compactSummaryItems = useMemo(() => {
    return [
      { label: 'ROLES', value: roles.length, tone: 'default' },
      { label: 'DESIGNATIONS', value: designations.length, tone: 'default' },
      { label: 'ASSIGNED', value: assignedCount, tone: 'active' },
      { label: 'STAFF', value: facultyList.length, tone: 'default' },
    ]
  }, [roles.length, designations.length, assignedCount, facultyList.length])

  // Recommended role for currently selected designation in assignment modal
  const recommendedRoleForSelectedDes = useMemo(() => {
    const desObj = designations.find((d) => d.id === selectedStaffDesignation)
    if (!desObj?.defaultRole) return null
    return roles.find((r) => r.id === desObj.defaultRole) || null
  }, [designations, selectedStaffDesignation, roles])

  return (
    <DashboardLayout>
      <div className="rbac-page">
        {/* Page Header with Top-Right Compact Summary */}
        <PageHeader
          title="Roles & Designations Management"
          subtitle="Define organizational hierarchy, configure granular RBAC permission matrix across all modules, and govern staff access."
          compactSummary={compactSummaryItems}
        />

        {rolesLoadError && (
          <div className="rbac-load-error-strip" role="alert">
            <span>
              <FiAlertCircle /> Server Notice: {rolesLoadError}
            </span>
            <button type="button" onClick={loadRoles}>
              <FiRotateCcw /> Retry Server Sync
            </button>
          </div>
        )}

        {/* Main Card Container */}
        <div className="sa-directory rbac-main-card">
          {/* Tabs Navigation Header */}
          <div className="rbac-tabs-bar">
            <div className="rbac-tabs-list">
              <button
                type="button"
                className={`rbac-tab-btn ${activeTab === 'roles' ? 'is-active' : ''}`}
                onClick={() => { setActiveTab('roles'); setQuery(''); setCategoryFilter('') }}
              >
                <FiShield /> Roles & Permissions <span className="rbac-tab-count">{roles.length}</span>
              </button>
              <button
                type="button"
                className={`rbac-tab-btn ${activeTab === 'designations' ? 'is-active' : ''}`}
                onClick={() => { setActiveTab('designations'); setQuery(''); setCategoryFilter('') }}
              >
                <FiAward /> Designations <span className="rbac-tab-count">{designations.length}</span>
              </button>
              <button
                type="button"
                className={`rbac-tab-btn ${activeTab === 'assignments' ? 'is-active' : ''}`}
                onClick={() => { setActiveTab('assignments'); setQuery(''); setCategoryFilter('') }}
              >
                <FiUserCheck /> Staff Access <span className="rbac-tab-count">{staffAssignmentRows.length}</span>
              </button>
            </div>

            <div className="rbac-header-actions">
              {activeTab === 'roles' && (
                <button type="button" className="sa-primary rbac-action-btn" onClick={handleOpenCreateRole}>
                  <FiPlus /> Create New Role
                </button>
              )}
              {activeTab === 'designations' && (
                <button type="button" className="sa-primary rbac-action-btn" onClick={handleOpenCreateDesignation}>
                  <FiPlus /> Add Designation
                </button>
              )}
            </div>
          </div>

          {/* Controls Toolbar */}
          <div className="sa-toolbar rbac-toolbar">
            <div className="sa-search rbac-search">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                aria-label={activeTab === 'roles' ? 'Search system roles' : activeTab === 'designations' ? 'Search designations' : 'Search staff'}
                placeholder={activeTab === 'roles' ? 'Search system roles by name, code, description...' : activeTab === 'designations' ? 'Search designations by title, code...' : 'Search staff by name, employee ID, department...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className="rbac-clear-search" aria-label="Clear search" onClick={() => setQuery('')}>
                  <FiX />
                </button>
              )}
            </div>

            {activeTab !== 'assignments' && (
              <ProjectSelect
                className="rbac-filter-select"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Select Category / All</option>
                {activeTab === 'roles' ? (
                  <>
                    <option value="Academic">Academic</option>
                    <option value="Administrative">Administrative</option>
                    <option value="System">System</option>
                    <option value="Student">Student</option>
                  </>
                ) : (
                  <>
                    <option value="Teaching">Teaching</option>
                    <option value="Non-Teaching">Non-Teaching</option>
                  </>
                )}
              </ProjectSelect>
            )}

            <div className="rbac-toolbar-right">
              <ExportMenu
                rows={activeDataset}
                columns={exportColumns}
                filename={`export_${activeTab}_${new Date().toISOString().slice(0, 10)}`}
                title={`${activeTab.toUpperCase()} Directory`}
              />
            </div>
          </div>

          {/* ============================================================== */}
          {/* TAB 1: ROLES & PERMISSIONS TABLE */}
          {/* ============================================================== */}
          {activeTab === 'roles' && (
            <div className="sa-table-wrap rbac-table-wrap">
              <table className="rbac-data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '240px' }}>System Access Role</th>
                    <th style={{ minWidth: '120px' }}>Role Code</th>
                    <th style={{ minWidth: '120px' }}>Category</th>
                    <th style={{ minWidth: '170px' }}>Hierarchy Level</th>
                    <th style={{ minWidth: '160px' }}>Permission Matrix</th>
                    <th style={{ minWidth: '90px' }}>Status</th>
                    <th style={{ textAlign: 'center', minWidth: '110px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((role) => {
                    const activePermCount = Object.values(role.permissions || {}).reduce((acc, p) => acc + Object.values(p || {}).filter(Boolean).length, 0)
                    return (
                      <tr key={role.id}>
                        <td>
                          <div className="rbac-profile-cell">
                            <div className="rbac-avatar-box is-role">
                              <FiShield />
                            </div>
                            <div className="rbac-profile-info">
                              <strong className="rbac-profile-title">{role.name}</strong>
                              <p className="rbac-profile-subtitle">{role.description || 'No description provided'}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="rbac-code-badge">{role.code}</span>
                        </td>
                        <td>
                          <span className={`rbac-tag rbac-tag--${role.category ? role.category.toLowerCase() : 'academic'}`}>
                            {role.category || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className="rbac-level-text">{role.level}</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="rbac-perm-pill-btn"
                            onClick={() => handleOpenPermissions(role)}
                            title="Configure granular permissions matrix"
                          >
                            <FiSliders /> {activePermCount} Active Permissions
                          </button>
                        </td>
                        <td>
                          <StatusBadge status={role.status} />
                        </td>
                        <td>
                          <div className="rbac-table-row-actions">
                            <button
                              type="button"
                              onClick={() => handleOpenPermissions(role)}
                              title="Configure Permissions"
                              className="rbac-icon-btn is-matrix"
                            >
                              <FiKey />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditRole(role)}
                              title="Edit Role Details"
                              className="rbac-icon-btn is-edit"
                            >
                              <FiEdit2 />
                            </button>
                            {!role.isSystem && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRole(role)}
                                title="Delete Custom Role"
                                className="rbac-icon-btn is-delete"
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!paginatedData.length && (
                    <tr>
                      <td colSpan={7} className="rbac-empty-td">
                        <div className="sa-empty rbac-clean-empty">
                          <FiShield />
                          <h3>No Roles Created Yet</h3>
                          <p>Click "Create New Role" above to define system access profiles.</p>
                          <button type="button" className="sa-primary rbac-empty-create-btn" onClick={handleOpenCreateRole}>
                            <FiPlus /> Create New Role
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: DESIGNATIONS TABLE */}
          {/* ============================================================== */}
          {activeTab === 'designations' && (
            <div className="sa-table-wrap rbac-table-wrap">
              <table className="rbac-data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '240px' }}>Official Designation</th>
                    <th style={{ minWidth: '110px' }}>Code</th>
                    <th style={{ minWidth: '130px' }}>Category</th>
                    <th style={{ minWidth: '160px' }}>Hierarchy Band</th>
                    <th style={{ minWidth: '180px' }}>Applicable Department</th>
                    <th style={{ minWidth: '180px' }}>Default / Recommended Role</th>
                    <th style={{ minWidth: '90px' }}>Status</th>
                    <th style={{ textAlign: 'center', minWidth: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((des) => {
                    const mappedRole = roles.find((r) => r.id === des.defaultRole)
                    return (
                      <tr key={des.id}>
                        <td>
                          <div className="rbac-profile-cell">
                            <div className={`rbac-avatar-box ${des.category === 'Teaching' ? 'is-teaching' : 'is-nonteaching'}`}>
                              <FiAward />
                            </div>
                            <div className="rbac-profile-info">
                              <strong className="rbac-profile-title">{des.title}</strong>
                              <span className="rbac-profile-subtitle">{des.level}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="rbac-code-badge">{des.code}</span>
                        </td>
                        <td>
                          <span className={`rbac-tag ${des.category === 'Teaching' ? 'rbac-tag--teaching' : 'rbac-tag--nonteaching'}`}>
                            {des.category || 'N/A'}
                          </span>
                        </td>
                        <td>
                          <span className="rbac-level-text">{des.level}</span>
                        </td>
                        <td>
                          <span className="rbac-dept-pill">{des.department || 'All Departments'}</span>
                        </td>
                        <td>
                          {mappedRole ? (
                            <div className="rbac-role-preview-pill" title="Recommended system access role">
                              <FiShield /> {mappedRole.name}
                            </div>
                          ) : (
                            <span className="rbac-unassigned-tag">None</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={des.status} />
                        </td>
                        <td>
                          <div className="rbac-table-row-actions">
                            <button
                              type="button"
                              onClick={() => handleOpenEditDesignation(des)}
                              title="Edit Designation"
                              className="rbac-icon-btn is-edit"
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDesignation(des)}
                              title="Delete Designation"
                              className="rbac-icon-btn is-delete"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!paginatedData.length && (
                    <tr>
                      <td colSpan={8} className="rbac-empty-td">
                        <div className="sa-empty rbac-clean-empty">
                          <FiAward />
                          <h3>No Designations Created Yet</h3>
                          <p>Click "Add Designation" above to define official job titles and hierarchy levels.</p>
                          <button type="button" className="sa-primary rbac-empty-create-btn" onClick={handleOpenCreateDesignation}>
                            <FiPlus /> Add Designation
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: STAFF ACCESS ASSIGNMENTS TABLE */}
          {/* ============================================================== */}
          {activeTab === 'assignments' && (
            <div className="sa-table-wrap rbac-table-wrap">
              <table className="rbac-data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '240px' }}>Academic Staff Member</th>
                    <th style={{ minWidth: '120px' }}>Employee ID</th>
                    <th style={{ minWidth: '170px' }}>Department</th>
                    <th style={{ minWidth: '160px' }}>Official Designation</th>
                    <th style={{ minWidth: '180px' }}>System Access Role</th>
                    <th style={{ minWidth: '160px' }}>Access Scope</th>
                    <th style={{ textAlign: 'center', minWidth: '120px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((staff) => (
                    <tr key={staff.id}>
                      <td>
                        <div className="sa-student rbac-staff-profile-cell">
                          <div className="sa-profile-avatar rbac-staff-avatar">
                            {(staff.fullName || 'ST').slice(0, 2).toUpperCase()}
                          </div>
                          <div className="rbac-profile-info">
                            <strong className="rbac-profile-title">{staff.fullName}</strong>
                            <small className="rbac-profile-subtitle">{staff.email || 'No email registered'}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="rbac-code-badge">{staff.employeeId || 'N/A'}</span>
                      </td>
                      <td>
                        <span className="rbac-dept-name">{staff.department || 'Academic Department'}</span>
                      </td>
                      <td>
                        {staff.currentDesignation?.title ? (
                          <span className="rbac-tag rbac-tag--teaching">
                            {staff.currentDesignation.title}
                          </span>
                        ) : (
                          <span className="rbac-unassigned-tag">Not Assigned</span>
                        )}
                      </td>
                      <td>
                        {staff.currentRole ? (
                          <div className="rbac-role-pill-assigned">
                            <FiShield />
                            <strong>{staff.currentRole.name}</strong>
                          </div>
                        ) : (
                          <span className="rbac-unassigned-tag">Not Assigned</span>
                        )}
                      </td>
                      <td>
                        {staff.isExplicitlyAssigned ? (
                          <span className="rbac-scope-pill is-scoped">
                            {staff.scope}
                          </span>
                        ) : (
                          <span className="rbac-unassigned-tag">Default Scope</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="rbac-action-assign-btn"
                          onClick={() => handleOpenAssignStaff(staff)}
                        >
                          <FiUserCheck /> Assign Access
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!paginatedData.length && (
                    <tr>
                      <td colSpan={7} className="rbac-empty-td">
                        <div className="sa-empty rbac-clean-empty">
                          <FiUsers />
                          <h3>{isLoadingFaculty ? 'Loading Faculty Directory...' : 'No Staff Members Found'}</h3>
                          <p>{isLoadingFaculty ? 'Fetching active faculty records from backend...' : 'No faculty records matching filter criteria in directory.'}</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ============================================================== */}
          {/* PAGINATION BAR */}
          {/* ============================================================== */}
          <div className="sa-pagination rbac-pagination">
            <div className="rbac-pagination-size">
              <span>Show</span>
              <ProjectSelect value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </ProjectSelect>
              <span>entries (Showing {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems})</span>
            </div>

            <div className="rbac-pagination-controls">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                aria-label="Previous Page"
              >
                <FiChevronLeft />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                if (pg === 1 || pg === totalPages || (pg >= currentPage - 1 && pg <= currentPage + 1)) {
                  return (
                    <button
                      key={pg}
                      type="button"
                      className={currentPage === pg ? 'active' : ''}
                      onClick={() => setCurrentPage(pg)}
                    >
                      {pg}
                    </button>
                  )
                }
                if (pg === currentPage - 2 || pg === currentPage + 2) {
                  return <span key={pg} className="rbac-page-dots">...</span>
                }
                return null
              })}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                aria-label="Next Page"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* ============================================================== */}
        {/* MODAL 1: CREATE / EDIT ROLE */}
        {/* ============================================================== */}
        {isRoleModalOpen && editingRole && (
          <div className="rbac-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !isSavingRole && setIsRoleModalOpen(false)}>
            <div className="rbac-modal-window">
              <button type="button" className="rbac-modal-close" disabled={isSavingRole} onClick={() => setIsRoleModalOpen(false)}>
                <FiX />
              </button>

              <div className="rbac-modal-header">
                <span className="cm-eyebrow">SYSTEM ACCESS CONTROL</span>
                <h2>{editingRole.isSystem ? 'Edit System Role' : editingRole.id && !editingRole.id.startsWith('ROLE-') ? 'Edit Access Role' : 'Create Access Role'}</h2>
                <p>A Role represents system application access and permissions, distinct from employee job titles.</p>
              </div>

              {roleModalError && (
                <div className="rbac-modal-error-banner" role="alert">
                  <FiAlertCircle />
                  <span>{roleModalError}</span>
                </div>
              )}

              {!editingRole.isSystem && (
                <div className="rbac-template-banner">
                  <div className="rbac-template-header">
                    <FiShield />
                    <div>
                      <strong>Quick Select Standard Role Template</strong>
                      <p>Pick a predefined college access role to auto-populate settings, or customize from scratch.</p>
                    </div>
                  </div>
                  <ProjectSelect
                    className="rbac-template-select"
                    onChange={(e) => handleSelectRoleTemplate(e.target.value)}
                    defaultValue=""
                  >
                    <option value="">-- Choose Standard Role Preset (e.g. HOD, Faculty, Exam Controller) --</option>
                    {STANDARD_ROLE_TEMPLATES.map((tmpl) => (
                      <option key={tmpl.code} value={tmpl.name}>
                        {tmpl.name} ({tmpl.code}) | {tmpl.category} | {tmpl.level}
                      </option>
                    ))}
                  </ProjectSelect>
                </div>
              )}

              <form onSubmit={handleSaveRole}>
                <div className="rbac-modal-grid">
                  <div className={`sa-field ${roleFieldErrors.name ? 'has-error' : ''}`}>
                    <label>Role Name <b>*</b></label>
                    <input
                      type="text"
                      required
                      value={editingRole.name}
                      onChange={(e) => handleRoleNameChange(e.target.value)}
                      placeholder="e.g. Academic Administrator"
                    />
                    {roleFieldErrors.name && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {roleFieldErrors.name}
                      </span>
                    )}
                  </div>

                  <div className={`sa-field ${roleFieldErrors.code ? 'has-error' : ''}`}>
                    <div className="rbac-field-label-row">
                      <label>Role Code <b>*</b></label>
                      {!editingRole.isSystem && (
                        <span className={`rbac-code-badge-hint ${isRoleCodeCustomized ? 'is-custom' : 'is-auto'}`}>
                          {isRoleCodeCustomized ? (
                            <>
                              Manual Edit Active |{' '}
                              <button type="button" onClick={handleResetRoleCodeToAuto}>
                                Reset to Auto
                              </button>
                            </>
                          ) : (
                            '✨ Auto-generating'
                          )}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={editingRole.code}
                      onChange={(e) => handleRoleCodeChange(e.target.value)}
                      placeholder="e.g. ACADEMIC_ADMIN"
                      disabled={editingRole.isSystem}
                    />
                    {roleFieldErrors.code && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {roleFieldErrors.code}
                      </span>
                    )}
                    {!roleFieldErrors.code && (
                      <span className="rbac-field-tip">
                        Unique key used in backend authorizations (e.g. ACADEMIC_ADMIN).
                      </span>
                    )}
                  </div>

                  <div className={`sa-field ${roleFieldErrors.category ? 'has-error' : ''}`}>
                    <label>Category <b>*</b></label>
                    <ProjectSelect
                      required
                      value={editingRole.category}
                      onChange={(e) => {
                        setEditingRole({ ...editingRole, category: e.target.value })
                        setRoleFieldErrors((prev) => ({ ...prev, category: '' }))
                      }}
                    >
                      <option value="">Select Category</option>
                      <option value="Academic">Academic</option>
                      <option value="Administrative">Administrative</option>
                      <option value="System">System</option>
                      <option value="Student">Student</option>
                    </ProjectSelect>
                    {roleFieldErrors.category && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {roleFieldErrors.category}
                      </span>
                    )}
                  </div>

                  <div className={`sa-field ${roleFieldErrors.level ? 'has-error' : ''}`}>
                    <label>Hierarchy Level <b>*</b></label>
                    <ProjectSelect
                      required
                      value={editingRole.level}
                      onChange={(e) => {
                        setEditingRole({ ...editingRole, level: e.target.value })
                        setRoleFieldErrors((prev) => ({ ...prev, level: '' }))
                      }}
                    >
                      <option value="">Select Hierarchy Level</option>
                      <option value="Level 1 (Highest Privileges)">Level 1 (Highest Privileges)</option>
                      <option value="Level 2 (Executive Leadership)">Level 2 (Executive Leadership)</option>
                      <option value="Level 3 (Department Leadership)">Level 3 (Department Leadership)</option>
                      <option value="Level 4 (Academic Staff)">Level 4 (Academic Staff)</option>
                      <option value="Level 4 (Administrative Staff)">Level 4 (Administrative Staff)</option>
                      <option value="Level 5 (End User)">Level 5 (End User)</option>
                    </ProjectSelect>
                    {roleFieldErrors.level && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {roleFieldErrors.level}
                      </span>
                    )}
                  </div>

                  <div className="sa-field wide">
                    <label>Role Description</label>
                    <textarea
                      rows={3}
                      value={editingRole.description}
                      onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                      placeholder="Brief summary of duties and permissions for this access role..."
                    />
                  </div>

                  <div className={`sa-field ${roleFieldErrors.status ? 'has-error' : ''}`}>
                    <label>Status <b>*</b></label>
                    <ProjectSelect
                      required
                      value={editingRole.status}
                      onChange={(e) => {
                        setEditingRole({ ...editingRole, status: e.target.value })
                        setRoleFieldErrors((prev) => ({ ...prev, status: '' }))
                      }}
                    >
                      <option value="">Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </ProjectSelect>
                    {roleFieldErrors.status && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {roleFieldErrors.status}
                      </span>
                    )}
                  </div>
                </div>

                <footer className="rbac-modal-footer">
                  <button type="button" className="sa-secondary" disabled={isSavingRole} onClick={() => setIsRoleModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="sa-primary" disabled={isSavingRole}>
                    <FiCheck /> {isSavingRole ? 'Saving Role...' : 'Save Role Profile'}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 2: CREATE / EDIT DESIGNATION */}
        {/* ============================================================== */}
        {isDesModalOpen && editingDesignation && (
          <div className="rbac-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setIsDesModalOpen(false)}>
            <div className="rbac-modal-window">
              <button type="button" className="rbac-modal-close" onClick={() => setIsDesModalOpen(false)}>
                <FiX />
              </button>

              <div className="rbac-modal-header">
                <span className="cm-eyebrow">ORGANIZATIONAL JOB TITLE</span>
                <h2>{editingDesignation.id && !editingDesignation.id.startsWith('DES-') ? 'Edit Designation' : 'Add Designation'}</h2>
                <p>A Designation is an employment job title. It can suggest a default access role that admins can override.</p>
              </div>

              <form onSubmit={handleSaveDesignation}>
                <div className="rbac-modal-grid">
                  <div className={`sa-field ${desFieldErrors.title ? 'has-error' : ''}`}>
                    <label>Designation Title <b>*</b></label>
                    <input
                      type="text"
                      required
                      value={editingDesignation.title}
                      onChange={(e) => handleDesTitleChange(e.target.value)}
                      placeholder="e.g. Associate Professor"
                    />
                    {desFieldErrors.title && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {desFieldErrors.title}
                      </span>
                    )}
                  </div>

                  <div className={`sa-field ${desFieldErrors.code ? 'has-error' : ''}`}>
                    <div className="rbac-field-label-row">
                      <label>Designation Code <b>*</b></label>
                      <span className={`rbac-code-badge-hint ${isDesCodeCustomized ? 'is-custom' : 'is-auto'}`}>
                        {isDesCodeCustomized ? (
                          <>
                            Manual Edit Active |{' '}
                            <button type="button" onClick={handleResetDesCodeToAuto}>
                              Reset to Auto
                            </button>
                          </>
                        ) : (
                          '✨ Auto-generating'
                        )}
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      value={editingDesignation.code}
                      onChange={(e) => handleDesCodeChange(e.target.value)}
                      placeholder="e.g. ASSOC_PROF"
                    />
                    {desFieldErrors.code && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {desFieldErrors.code}
                      </span>
                    )}
                    {!desFieldErrors.code && (
                      <span className="rbac-field-tip">
                        Designation identifier code (e.g. ASSOC_PROF).
                      </span>
                    )}
                  </div>

                  <div className={`sa-field ${desFieldErrors.category ? 'has-error' : ''}`}>
                    <label>Staff Category <b>*</b></label>
                    <ProjectSelect
                      required
                      value={editingDesignation.category}
                      onChange={(e) => {
                        setEditingDesignation({ ...editingDesignation, category: e.target.value })
                        setDesFieldErrors((prev) => ({ ...prev, category: '' }))
                      }}
                    >
                      <option value="">Select Staff Category</option>
                      <option value="Teaching">Teaching Faculty</option>
                      <option value="Non-Teaching">Non-Teaching / Administrative Staff</option>
                    </ProjectSelect>
                    {desFieldErrors.category && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {desFieldErrors.category}
                      </span>
                    )}
                  </div>

                  <div className={`sa-field ${desFieldErrors.level ? 'has-error' : ''}`}>
                    <label>Hierarchy Level Band <b>*</b></label>
                    <ProjectSelect
                      required
                      value={editingDesignation.level}
                      onChange={(e) => {
                        setEditingDesignation({ ...editingDesignation, level: e.target.value })
                        setDesFieldErrors((prev) => ({ ...prev, level: '' }))
                      }}
                    >
                      <option value="">Select Hierarchy Level Band</option>
                      <option value="Band 1 (Executive)">Band 1 (Executive / Dean / Principal)</option>
                      <option value="Band 2 (Senior Academic)">Band 2 (Senior Academic / Professor / HOD)</option>
                      <option value="Band 3 (Faculty)">Band 3 (Faculty / Associate / Assistant Prof)</option>
                      <option value="Band 4 (Technical Support)">Band 4 (Technical Support / Lab Incharge)</option>
                      <option value="Band 4 (Administrative Support)">Band 4 (Administrative Support / Accounts)</option>
                      <option value="Band 5 (Auxiliary Support)">Band 5 (Auxiliary Support / Clerk)</option>
                    </ProjectSelect>
                    {desFieldErrors.level && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {desFieldErrors.level}
                      </span>
                    )}
                  </div>

                  <div className="sa-field">
                    <label>Applicable Department</label>
                    <ProjectSelect
                      value={editingDesignation.department}
                      onChange={(e) => setEditingDesignation({ ...editingDesignation, department: e.target.value })}
                    >
                      <option value="General / Shared">General / All Departments</option>
                      {departments.map((dept) => (
                        <option key={dept.id || dept.name} value={dept.name}>
                          {dept.name} {dept.code ? `(${dept.code})` : ''}
                        </option>
                      ))}
                    </ProjectSelect>
                  </div>

                  <div className="sa-field">
                    <label>Default / Recommended Role</label>
                    <ProjectSelect
                      value={editingDesignation.defaultRole}
                      onChange={(e) => setEditingDesignation({ ...editingDesignation, defaultRole: e.target.value })}
                    >
                      <option value="">Select Default Role (Optional)</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </ProjectSelect>
                    <small style={{ color: '#64748B', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      Recommended access profile. Can be overridden during staff access assignment.
                    </small>
                  </div>

                  <div className={`sa-field ${desFieldErrors.status ? 'has-error' : ''}`}>
                    <label>Status <b>*</b></label>
                    <ProjectSelect
                      required
                      value={editingDesignation.status}
                      onChange={(e) => {
                        setEditingDesignation({ ...editingDesignation, status: e.target.value })
                        setDesFieldErrors((prev) => ({ ...prev, status: '' }))
                      }}
                    >
                      <option value="">Select Status</option>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </ProjectSelect>
                    {desFieldErrors.status && (
                      <span className="rbac-field-error">
                        <FiAlertCircle /> {desFieldErrors.status}
                      </span>
                    )}
                  </div>
                </div>

                <footer className="rbac-modal-footer">
                  <button type="button" className="sa-secondary" onClick={() => setIsDesModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="sa-primary">
                    <FiCheck /> Save Designation
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 3: GRANULAR PERMISSIONS MATRIX */}
        {/* ============================================================== */}
        {isPermModalOpen && editingPermissionsRole && (
          <div className="rbac-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !isSavingPerms && setIsPermModalOpen(false)}>
            <div className="rbac-matrix-dialog">
              {/* Header Bar */}
              <div className="rbac-matrix-top-bar">
                <div className="rbac-matrix-title-group">
                  <span className="rbac-matrix-eyebrow">GRANULAR RBAC PERMISSIONS</span>
                  <div className="rbac-matrix-title-row">
                    <h2>Role: {editingPermissionsRole.name}</h2>
                    <span className="rbac-matrix-stats-badge">
                      <FiKey /> {grantedPermsCount} of {totalPossiblePerms} Actions Granted
                    </span>
                  </div>
                </div>

                <button type="button" className="rbac-modal-close" disabled={isSavingPerms} onClick={() => setIsPermModalOpen(false)}>
                  <FiX />
                </button>
              </div>

              {permsModalError && (
                <div className="rbac-modal-error-banner" style={{ margin: '10px 16px 0' }} role="alert">
                  <FiAlertCircle />
                  <span>{permsModalError}</span>
                </div>
              )}

              {/* Sub-Header Toolbar: Presets & Legend */}
              <div className="rbac-matrix-sub-toolbar">
                <div className="rbac-presets-strip">
                  <span className="rbac-preset-caption">Quick Presets:</span>
                  <button type="button" className="rbac-preset-chip" onClick={() => handleApplyPreset('full')}>
                    Full Access
                  </button>
                  <button type="button" className="rbac-preset-chip" onClick={() => handleApplyPreset('hod')}>
                    HOD Lead
                  </button>
                  <button type="button" className="rbac-preset-chip" onClick={() => handleApplyPreset('faculty')}>
                    Teaching Faculty
                  </button>
                  <button type="button" className="rbac-preset-chip" onClick={() => handleApplyPreset('read')}>
                    Read Only
                  </button>
                </div>

                <div className="rbac-legend-strip">
                  <span><strong>👁️ View:</strong> Read</span>
                  <span><strong>➕ Create:</strong> Add</span>
                  <span><strong>✏️ Edit:</strong> Update</span>
                  <span><strong>🗑️ Delete:</strong> Remove</span>
                  <span><strong>📤 Export:</strong> Download</span>
                </div>
              </div>

              {/* Matrix Table Viewport */}
              <div className="rbac-matrix-viewport">
                <table className="rbac-matrix-grid-table">
                  <colgroup>
                    <col style={{ width: '36%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '14%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="th-mod-name">ERP Module & Scope Description</th>
                      <th className="th-action-col">👁️ VIEW</th>
                      <th className="th-action-col">➕ CREATE</th>
                      <th className="th-action-col">✏️ EDIT</th>
                      <th className="th-action-col">🗑️ DELETE</th>
                      <th className="th-action-col">📤 EXPORT</th>
                      <th className="th-toggle-col">⚡ MODULE QUICK ALL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moduleCategories.map(([category, modules]) => {
                      const allCatChecked = modules.every((mod) => {
                        const perm = editingPermissionsRole.permissions?.[mod.id] || {}
                        return PERMISSION_ACTIONS.every((act) => perm[act.id])
                      })

                      return (
                        <Fragment key={category}>
                          <tr className="rbac-cat-header-row">
                            <td colSpan={7}>
                              <div className="rbac-cat-banner">
                                <div className="rbac-cat-title">
                                  <strong>{category}</strong>
                                  <span>({modules.length} Modules in Category)</span>
                                </div>
                                <button
                                  type="button"
                                  className="rbac-cat-bulk-btn"
                                  onClick={() => handleToggleCategoryAll(category)}
                                >
                                  {allCatChecked ? '✖ Deselect All in Category' : '✔ Grant All in Category'}
                                </button>
                              </div>
                            </td>
                          </tr>

                          {modules.map((mod) => {
                            const modPerm = editingPermissionsRole.permissions?.[mod.id] || {
                              view: false,
                              create: false,
                              edit: false,
                              delete: false,
                              export: false,
                            }
                            const isAllRowActive = PERMISSION_ACTIONS.every((act) => modPerm[act.id])

                            return (
                              <tr key={mod.id} className="rbac-mod-item-row">
                                <td className="rbac-mod-cell">
                                  <div className="rbac-mod-info-card">
                                    <strong className="rbac-mod-name-text">{mod.name}</strong>
                                    <p className="rbac-mod-desc-text">{mod.description}</p>
                                  </div>
                                </td>

                                {PERMISSION_ACTIONS.map((act) => {
                                  const isChecked = Boolean(modPerm[act.id])
                                  return (
                                    <td key={act.id} className="rbac-action-cell">
                                      <label className="rbac-custom-checkbox-wrapper" title={`${act.label} permission for ${mod.name}`}>
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => handleTogglePermission(mod.id, act.id)}
                                        />
                                        <span className={`rbac-checkbox-custom-mark ${isChecked ? 'is-granted' : ''}`}>
                                          {isChecked ? <FiCheck /> : null}
                                        </span>
                                      </label>
                                    </td>
                                  )
                                })}

                                <td className="rbac-toggle-cell">
                                  <button
                                    type="button"
                                    className={`rbac-module-toggle-btn ${isAllRowActive ? 'is-all-granted' : ''}`}
                                    onClick={() => handleToggleRowAll(mod.id)}
                                  >
                                    {isAllRowActive ? 'All Granted' : 'Toggle All'}
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer Actions */}
              <footer className="rbac-matrix-footer">
                <div className="rbac-footer-summary">
                  <strong>{grantedPermsCount}</strong> active permissions assigned out of <strong>{totalPossiblePerms}</strong> total module actions.
                </div>
                <div className="rbac-footer-btn-group">
                  <button type="button" className="sa-secondary rbac-btn-cancel" disabled={isSavingPerms} onClick={() => setIsPermModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="button" className="sa-primary rbac-btn-save-matrix" disabled={isSavingPerms} onClick={handleSavePermissions}>
                    <FiCheck /> {isSavingPerms ? 'Saving Matrix...' : 'Save & Apply Permission Matrix'}
                  </button>
                </div>
              </footer>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 4: ASSIGN ROLE & SCOPE TO STAFF */}
        {/* ============================================================== */}
        {isAssignModalOpen && assigningStaff && (
          <div className="rbac-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setIsAssignModalOpen(false)}>
            <div className="rbac-modal-window">
              <button type="button" className="rbac-modal-close" onClick={() => setIsAssignModalOpen(false)}>
                <FiX />
              </button>

              <div className="rbac-modal-header">
                <span className="cm-eyebrow">STAFF ACCESS GOVERNANCE</span>
                <h2>Staff Access Assignment</h2>
                <p>Authorize job designation, system access role, and departmental boundary for staff.</p>
              </div>

              {/* Staff Member Preview Card */}
              <div className="rbac-staff-preview-box">
                <div className="sa-profile-avatar">
                  {(assigningStaff.fullName || 'ST').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong>{assigningStaff.fullName}</strong>
                  <p>{assigningStaff.email || 'No email registered'} | Emp ID: {assigningStaff.employeeId || 'N/A'}</p>
                  <small>Department: {assigningStaff.department || 'Not Assigned'}</small>
                </div>
              </div>

              {roles.length === 0 || designations.length === 0 ? (
                <div className="rbac-no-roles-notice">
                  <FiAlertCircle />
                  <div>
                    <strong>Prerequisites Missing</strong>
                    <p>Please configure at least one Role and one Designation before assigning access to staff members.</p>
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleSaveStaffAssignment}>
                <div className="rbac-modal-grid">
                  <div className="sa-field wide">
                    <label>Official Designation (Job Title) <b>*</b></label>
                    <ProjectSelect
                      required
                      value={selectedStaffDesignation}
                      onChange={(e) => handleDesignationSelect(e.target.value)}
                    >
                      <option value="">Select Official Designation</option>
                      {designations.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title} ({d.category} | {d.level})
                        </option>
                      ))}
                    </ProjectSelect>
                  </div>

                  <div className="sa-field wide">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ margin: 0 }}>System Access Role (Permissions) <b>*</b></label>
                      {recommendedRoleForSelectedDes && (
                        <span style={{ fontSize: '11px', color: '#125AA8', fontWeight: 600 }}>
                          Recommended: {recommendedRoleForSelectedDes.name}
                        </span>
                      )}
                    </div>
                    <ProjectSelect
                      required
                      value={selectedStaffRole}
                      onChange={(e) => setSelectedStaffRole(e.target.value)}
                    >
                      <option value="">Select System Access Role</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.category} | {r.code})
                        </option>
                      ))}
                    </ProjectSelect>
                    <small style={{ color: '#64748B', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      System roles grant granular module permissions regardless of employee title.
                    </small>
                  </div>

                  <div className="sa-field wide">
                    <label>Access Scope <b>*</b></label>
                    <div className="rbac-scope-toggle-grid">
                      <label className={`rbac-scope-option ${selectedStaffScopeType === 'Institution-wide' ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="staffScopeType"
                          value="Institution-wide"
                          checked={selectedStaffScopeType === 'Institution-wide'}
                          onChange={() => setSelectedStaffScopeType('Institution-wide')}
                        />
                        <div className="rbac-scope-info">
                          <strong>Institution-wide Scope (Unrestricted)</strong>
                          <p>Permissions apply campus-wide across all departments, courses, and academic units.</p>
                        </div>
                      </label>

                      <label className={`rbac-scope-option ${selectedStaffScopeType === 'Department' ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="staffScopeType"
                          value="Department"
                          checked={selectedStaffScopeType === 'Department'}
                          onChange={() => setSelectedStaffScopeType('Department')}
                        />
                        <div className="rbac-scope-info">
                          <strong>Department-scoped Access (Standard)</strong>
                          <p>Permissions apply strictly to records within the selected academic/administrative department.</p>
                          {selectedStaffScopeType === 'Department' && (
                            <div className="rbac-scope-dept-select-wrap" onClick={(e) => e.stopPropagation()}>
                              <label>Select Target Department:</label>
                              <ProjectSelect
                                value={selectedStaffScopeDept}
                                onChange={(e) => setSelectedStaffScopeDept(e.target.value)}
                              >
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                  <option key={dept.id || dept.name} value={dept.id || dept.name}>
                                    {dept.name} {dept.code ? `(${dept.code})` : ''}
                                  </option>
                                ))}
                              </ProjectSelect>
                            </div>
                          )}
                        </div>
                      </label>

                      <label className={`rbac-scope-option ${selectedStaffScopeType === 'Self / Assigned Classes' ? 'is-selected' : ''}`}>
                        <input
                          type="radio"
                          name="staffScopeType"
                          value="Self / Assigned Classes"
                          checked={selectedStaffScopeType === 'Self / Assigned Classes'}
                          onChange={() => setSelectedStaffScopeType('Self / Assigned Classes')}
                        />
                        <div className="rbac-scope-info">
                          <strong>Self / Assigned Classes Scope</strong>
                          <p>Permissions restricted solely to self-assigned subject classes, timetable slots, and student evaluations.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <footer className="rbac-modal-footer">
                  <button type="button" className="sa-secondary" onClick={() => setIsAssignModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="sa-primary" disabled={roles.length === 0 || designations.length === 0}>
                    <FiCheck /> Save Assignment
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 5: DELETE ROLE CONFIRMATION */}
        {/* ============================================================== */}
        {deletingRole && (
          <div className="rbac-modal-backdrop" onClick={() => !isDeletingRole && setDeletingRole(null)}>
            <div className="rbac-delete-modal-window" onClick={(e) => e.stopPropagation()}>
              <div className="rbac-delete-modal-header">
                <div className="rbac-delete-icon-badge">
                  <FiTrash2 />
                </div>
                <div className="rbac-delete-header-texts">
                  <h3>Delete Role Confirmation</h3>
                  <p>Security access role governance & privilege revocation.</p>
                </div>
                <button
                  type="button"
                  className="rbac-modal-close"
                  disabled={isDeletingRole}
                  onClick={() => setDeletingRole(null)}
                >
                  <FiX />
                </button>
              </div>

              {roleDeleteError && (
                <div className="rbac-modal-error-banner" style={{ margin: '12px 16px 0' }} role="alert">
                  <FiAlertCircle />
                  <span>{roleDeleteError}</span>
                </div>
              )}

              <div className="rbac-delete-modal-body">
                <div className="rbac-delete-target-card">
                  <div className="rbac-delete-target-info">
                    <strong>{deletingRole.name}</strong>
                    <span>{deletingRole.category} | {deletingRole.level}</span>
                  </div>
                  <span className="rbac-delete-code-tag">{deletingRole.code}</span>
                </div>

                <p className="rbac-delete-prompt-text">
                  Are you sure you want to permanently delete role <strong>"{deletingRole.name}"</strong>? This action will remove the access profile from the system.
                </p>

                {countStaffWithRole(deletingRole.id) > 0 && (
                  <div className="rbac-delete-warning-banner">
                    <FiAlertCircle />
                    <span>
                      Notice: <strong>{countStaffWithRole(deletingRole.id)} staff members</strong> currently have this role assigned. Deletion is blocked until they are reassigned.
                    </span>
                  </div>
                )}
              </div>

              <div className="rbac-delete-modal-footer">
                <button
                  type="button"
                  className="rbac-btn-cancel"
                  disabled={isDeletingRole}
                  onClick={() => setDeletingRole(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rbac-btn-delete-confirm"
                  disabled={isDeletingRole || countStaffWithRole(deletingRole.id) > 0}
                  onClick={handleConfirmDeleteRole}
                >
                  <FiTrash2 /> {isDeletingRole ? 'Deleting on Server…' : 'Confirm & Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 6: DELETE DESIGNATION CONFIRMATION */}
        {/* ============================================================== */}
        {deletingDesignation && (
          <div className="rbac-modal-backdrop" onClick={() => setDeletingDesignation(null)}>
            <div className="rbac-delete-modal-window" onClick={(e) => e.stopPropagation()}>
              <div className="rbac-delete-modal-header">
                <div className="rbac-delete-icon-badge">
                  <FiTrash2 />
                </div>
                <div className="rbac-delete-header-texts">
                  <h3>Delete Designation Confirmation</h3>
                  <p>Official institutional designation & hierarchy removal.</p>
                </div>
                <button
                  type="button"
                  className="rbac-modal-close"
                  onClick={() => setDeletingDesignation(null)}
                >
                  <FiX />
                </button>
              </div>

              <div className="rbac-delete-modal-body">
                <div className="rbac-delete-target-card">
                  <div className="rbac-delete-target-info">
                    <strong>{deletingDesignation.title}</strong>
                    <span>{deletingDesignation.category} | {deletingDesignation.level}</span>
                  </div>
                  <span className="rbac-delete-code-tag">{deletingDesignation.code}</span>
                </div>

                <p className="rbac-delete-prompt-text">
                  Are you sure you want to permanently delete designation <strong>"{deletingDesignation.title}"</strong>?
                </p>

                {countStaffWithDesignation(deletingDesignation.id, deletingDesignation.title) > 0 && (
                  <div className="rbac-delete-warning-banner">
                    <FiAlertCircle />
                    <span>
                      Notice: <strong>{countStaffWithDesignation(deletingDesignation.id, deletingDesignation.title)} staff members</strong> currently have this designation. Deletion is blocked until they are reassigned.
                    </span>
                  </div>
                )}
              </div>

              <div className="rbac-delete-modal-footer">
                <button
                  type="button"
                  className="rbac-btn-cancel"
                  onClick={() => setDeletingDesignation(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rbac-btn-delete-confirm"
                  disabled={countStaffWithDesignation(deletingDesignation.id, deletingDesignation.title) > 0}
                  onClick={handleConfirmDeleteDesignation}
                >
                  <FiTrash2 /> Confirm & Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

return { SYSTEM_MODULES, PERMISSION_ACTIONS, fullAccessPermissions, readOnlyPermissions, hodPresetPermissions, facultyPresetPermissions, DEFAULT_SYSTEM_ROLES, STANDARD_ROLE_TEMPLATES, generateCodeFromName, validateRoleName, validateRoleCode, validateDesTitle, validateDesCode, DEFAULT_DESIGNATIONS, DEFAULT_DEPARTMENTS, DEFAULT_STAFF_MEMBERS, default: RolesAndDesignations }
})()

// RoomsManagement screen and private helpers.
const RoomsManagementScreen = (() => {
const ProjectSelect = SearchableSelectImports_ProjectSelect
const useCollegeState = useCollegeStateImports_default
const useState = reactImports_useState
const useEffect = reactImports_useEffect
const useMemo = reactImports_useMemo
const useCallback = reactImports_useCallback
const useNavigate = react_router_domImports_useNavigate
const useParams = react_router_domImports_useParams
const FiGrid = fiImports_FiGrid
const FiPlus = fiImports_FiPlus
const FiEdit2 = fiImports_FiEdit2
const FiTrash2 = fiImports_FiTrash2
const FiSearch = fiImports_FiSearch
const FiX = fiImports_FiX
const FiEye = fiImports_FiEye
const FiCheck = fiImports_FiCheck
const FiHome = fiImports_FiHome
const FiUsers = fiImports_FiUsers
const FiLayers = fiImports_FiLayers
const FiInfo = fiImports_FiInfo
const FiCheckCircle = fiImports_FiCheckCircle
const FiBookmark = fiImports_FiBookmark
const FiLink = fiImports_FiLink
const FiUnlock = fiImports_FiUnlock
const FiCpu = fiImports_FiCpu
const FiMonitor = fiImports_FiMonitor
const FiMapPin = fiImports_FiMapPin
const FiAlertTriangle = fiImports_FiAlertTriangle
const FiSlash = fiImports_FiSlash
const FiArrowLeft = fiImports_FiArrowLeft
const DashboardLayout = DashboardLayoutImports_default
const PageHeader = PageHeaderImports_default
const ExportMenu = ExportMenuImports_default
const FilterPanel = FilterPanelImports_default
const StatusBadge = StatusBadgeImports_default
const EmptyState = EmptyStateImports_default
const PAGE_SIZE = TablePaginationImports_PAGE_SIZE
const TablePagination = TablePaginationImports_default
const SearchableSelect = SearchableSelectImports_default
const sectionApi = apiEndpointsImports_sectionApi
const sectionAssignmentApi = apiEndpointsImports_sectionAssignmentApi
const ROOM_TYPES = roomServiceImports_ROOM_TYPES
const BUILDING_BLOCKS = roomServiceImports_BUILDING_BLOCKS
const FLOORS = roomServiceImports_FLOORS
const ROOM_FACILITIES = roomServiceImports_ROOM_FACILITIES
const roomService = roomServiceImports_default
const showSuccess = toastImports_showSuccess
const showError = toastImports_showError

// Export column definitions for ExportMenu
const roomExportColumns = [
  { label: 'Room Number', value: (r) => r.roomNumber },
  { label: 'Room Name', value: (r) => r.roomName },
  { label: 'Room Type', value: (r) => r.roomType },
  { label: 'Building Block', value: (r) => r.buildingBlock },
  { label: 'Floor Level', value: (r) => r.floor },
  { label: 'Capacity', value: (r) => r.capacity },
  { label: 'Allocated Section', value: (r) => r.assignedSection || 'None (Available)' },
  { label: 'Status', value: (r) => r.status },
  { label: 'Facilities', value: (r) => (r.facilities || []).join(', ') },
  { label: 'Remarks / Notes', value: (r) => r.description || '' },
]

const clean = (value) => value !== null && value !== undefined && !['', 'null', 'undefined', 'not provided', 'not set', '?'].includes(String(value).trim().toLowerCase())

function InfoRows({ rows }) {
  const visible = rows.filter(([, value]) => clean(value))
  if (!visible.length) return null
  return (
    <div className="cm-info-rows sa-detail-kv-grid erp-view-grid">
      {visible.map(([label, value]) => (
        <div className="cm-info-row sa-kv-cell erp-view-field" key={label}>
          <span className="cm-info-label sa-kv-label erp-view-label">{label}</span>
          <strong className="cm-info-val sa-kv-val erp-view-value">{value}</strong>
        </div>
      ))}
    </div>
  )
}

function InfoCard({ icon: Icon, title, rows, children }) {
  const visible = rows ? rows.filter(([, value]) => clean(value)) : []
  return (
    <section className="cm-info-card sa-detail-panel sa-modern-panel erp-view-section">
      <div className="cm-info-card-header sa-panel-header">
        <div className="sa-panel-title-wrap">
          {Icon && <span className="sa-panel-icon"><Icon aria-hidden="true" /></span>}
          <h2>{title}</h2>
        </div>
        {visible.length > 0 && <span className="sa-card-count-badge">{visible.length} items</span>}
      </div>
      {rows && <InfoRows rows={visible} />}
      {children}
    </section>
  )
}

function RoomsManagement({ formMode = false, viewMode = false }) {
  const navigate = useNavigate()
  const { roomId } = useParams()
  const [roomsLoaded, setRoomsLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const closeForm = () => navigate('/rooms-management')
  const [rooms, setRooms] = useCollegeState([])
  const [sections, setSections] = useCollegeState([])
  const [assignments, setAssignments] = useCollegeState([])
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [blockFilter, setBlockFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Modals state
  const [editingRoom, setEditingRoom] = useState(null)
  const [customRoomType, setCustomRoomType] = useState(false)
  const [customBuildingBlock, setCustomBuildingBlock] = useState(false)
  const [viewingRoom, setViewingRoom] = useState(null)
  const [allocatingRoom, setAllocatingRoom] = useState(null)
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [deletingRoom, setDeletingRoom] = useState(null)
  const [deallocatingRoom, setDeallocatingRoom] = useState(null)

  // Load Rooms, Sections, and Student Assignments
  const loadRooms = async () => {
    try {
      const list = await roomService.getRooms()
      setRooms(Array.isArray(list) ? list : [])
    } catch {
      setRooms(roomService.getStoredRooms())
    } finally {
      setRoomsLoaded(true)
    }
  }

  const loadData = async () => {
    try {
      const [secData, assignData] = await Promise.all([
        sectionApi.getAll().catch(() => []),
        sectionAssignmentApi.list().catch(() => []),
      ])
      if (Array.isArray(secData)) setSections(secData)
      if (Array.isArray(assignData)) setAssignments(assignData)
    } catch {
      setSections([])
      setAssignments([])
    }
  }

  useEffect(() => {
    loadRooms()
    loadData()
  }, [])

  // Section Student Count Map
  const sectionStudentCountMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(assignments)) {
      assignments.forEach((a) => {
        const secId = String(a.sectionId || a.section_id || '')
        if (secId) map.set(secId, (map.get(secId) || 0) + 1)
      })
    }
    if (Array.isArray(sections)) {
      sections.forEach((s) => {
        const id = String(s.id || s.sectionId || '')
        const name = String(s.sectionName || s.name || '').trim()
        const count = Math.max(
          map.get(id) || 0,
          Number(s.currentStrength ?? s.assignedStudents ?? s.studentCount ?? 0)
        )
        if (id) map.set(id, count)
        if (name) map.set(name, count)
      })
    }
    return map
  }, [assignments, sections])

  // Section Meta Map (Course, Branch, Semester Details)
  const sectionMetaMap = useMemo(() => {
    const map = new Map()
    if (Array.isArray(sections)) {
      sections.forEach((s) => {
        const name = String(s.sectionName || s.name || '').trim()
        const id = String(s.id || s.sectionId || '')
        const rawCourse = s.courseCode || s.courseName || s.course || ''
        const rawBranch = s.branchCode || s.branchName || s.branch || ''
        const sem = s.semesterName || s.semester || (s.semesterNumber ? `Sem ${s.semesterNumber}` : '')

        // Clean compact display (e.g. B.Tech - ECE - Sem 1)
        const compactCourse = /bachelor of technology/i.test(rawCourse) ? 'B.Tech' : rawCourse
        let compactBranch = rawBranch
        if (/electronics and communication/i.test(rawBranch)) compactBranch = 'ECE'
        else if (/computer science/i.test(rawBranch)) compactBranch = 'CSE'
        else if (/mechanical/i.test(rawBranch)) compactBranch = 'ME'
        else if (/civil/i.test(rawBranch)) compactBranch = 'Civil'
        else if (/electrical and electronics/i.test(rawBranch)) compactBranch = 'EEE'
        else if (/information technology/i.test(rawBranch)) compactBranch = 'IT'
        else if (/artificial intelligence/i.test(rawBranch)) compactBranch = 'AI&ML'

        const metaStr = [compactCourse, compactBranch, sem].filter(Boolean).join(' - ')
        const fullTitle = [s.courseName || rawCourse, s.branchName || rawBranch, sem].filter(Boolean).join(' - ')

        const info = {
          id,
          name,
          code: s.sectionCode || s.code || '',
          course: compactCourse,
          branch: compactBranch,
          sem,
          metaStr,
          fullTitle,
          capacity: s.capacity,
        }
        if (name) map.set(name.toLowerCase(), info)
        if (id) map.set(id, info)
      })
    }
    return map
  }, [sections])

  // Filtered Records
  const filteredRooms = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rooms.filter((r) => {
      const secMeta = r.assignedSection ? sectionMetaMap.get(r.assignedSection.toLowerCase()) : null
      const secMetaText = secMeta ? `${secMeta.course} ${secMeta.branch} ${secMeta.sem}`.toLowerCase() : ''

      const matchesSearch =
        !q ||
        (r.roomNumber && r.roomNumber.toLowerCase().includes(q)) ||
        (r.roomName && r.roomName.toLowerCase().includes(q)) ||
        (r.buildingBlock && r.buildingBlock.toLowerCase().includes(q)) ||
        (r.floor && r.floor.toLowerCase().includes(q)) ||
        (r.roomType && r.roomType.toLowerCase().includes(q)) ||
        (r.assignedSection && r.assignedSection.toLowerCase().includes(q)) ||
        secMetaText.includes(q)

      const matchesType = !typeFilter || r.roomType === typeFilter
      const matchesBlock = !blockFilter || r.buildingBlock === blockFilter
      const matchesStatus = !statusFilter || r.status === statusFilter

      return matchesSearch && matchesType && matchesBlock && matchesStatus
    })
  }, [rooms, query, typeFilter, blockFilter, statusFilter, sectionMetaMap])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE))
  const paginatedRooms = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredRooms.slice(start, start + PAGE_SIZE)
  }, [filteredRooms, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [query, typeFilter, blockFilter, statusFilter])

  // Header Compact Summary
  const compactSummaryItems = useMemo(() => {
    const total = rooms.length
    const available = rooms.filter((r) => r.status === 'Available').length
    const allocated = rooms.filter((r) => r.status === 'Allocated' || r.assignedSection).length
    const labs = rooms.filter((r) => /lab|workshop/i.test(r.roomType)).length

    return [
      { label: 'TOTAL', value: total, tone: 'default' },
      { label: 'AVAILABLE', value: available, tone: 'active' },
      { label: 'ALLOCATED', value: allocated, tone: 'upcoming' },
      { label: 'LABS', value: labs, tone: 'default' },
    ]
  }, [rooms])

  // Helper to generate section dropdown options without allowing double-allocation
  // Helper to generate section dropdown options without allowing double-allocation
  const getSectionDropdownOptions = (currentRoomId) => {
    // Collect sections already assigned to other rooms
    const otherAllocatedMap = new Map()
    rooms.forEach((r) => {
      if (r.id !== currentRoomId && r.assignedSection) {
        otherAllocatedMap.set(r.assignedSection.trim().toLowerCase(), r.roomNumber)
        if (r.sectionId) {
          otherAllocatedMap.set(String(r.sectionId), r.roomNumber)
        }
      }
    })

    return sections
      .filter((s) => s.status !== 'Inactive' && s.status !== 0 && s.status !== false && s.isActive !== false)
      .map((s) => {
        const secId = s.sectionId ?? s.id
        const name = s.sectionName || s.name || `Section ${secId}`
        const code = s.sectionCode || s.code || ''
        const branch = s.branchName || s.branch || ''
        const course = s.courseName || s.course || ''
        const sem = s.semesterName || s.semester || (s.semesterNumber ? `Sem ${s.semesterNumber}` : '')
        const count = sectionStudentCountMap.get(name) || sectionStudentCountMap.get(String(secId)) || 0
        const allocatedRoomNum = otherAllocatedMap.get(name.trim().toLowerCase()) || (secId ? otherAllocatedMap.get(String(secId)) : null)

        const details = [course, branch, sem].filter(Boolean).join(' - ')
        const isAlreadyAllocated = Boolean(allocatedRoomNum)

        return {
          id: String(secId || name),
          value: String(secId || name),
          name: isAlreadyAllocated
            ? `${name} ${code ? `(${code})` : ''} - ${details} [${count} Students] (Already Allocated to ${allocatedRoomNum})`
            : `${name} ${code ? `(${code})` : ''} - ${details} [${count} Students]`,
          code: details || 'Section',
          disabled: isAlreadyAllocated,
        }
      })
  }

  // Form Handlers
  const handleOpenCreate = () => navigate('/rooms-management/add')
  const initializeCreate = useCallback(() => {
    setCustomBuildingBlock(false)
    setCustomRoomType(false)
    setEditingRoom({
      id: '',
      roomNumber: '',
      roomName: '',
      buildingBlock: '',
      floor: '',
      roomType: '',
      capacity: '',
      facilities: [],
      department: 'General / Shared',
      status: '',
      assignedSection: '',
      sectionId: null,
      description: '',
    })
  }, [])

  const handleOpenEdit = (room) => navigate(`/rooms-management/${room.id}/edit`)
  const initializeEdit = useCallback((room) => {
    setCustomBuildingBlock(Boolean(room.buildingBlock && !BUILDING_BLOCKS.includes(room.buildingBlock)))
    setCustomRoomType(Boolean(room.roomType && !ROOM_TYPES.includes(room.roomType)))
    const foundSec = sections.find((s) => {
      const sId = s.sectionId ?? s.id
      if (room.sectionId && String(sId) === String(room.sectionId)) return true
      const sName = String(s.sectionName || s.name || '').trim().toLowerCase()
      const rName = String(room.assignedSection || '').trim().toLowerCase()
      return sName && rName && sName === rName
    })
    setEditingRoom({
      ...room,
      sectionId: foundSec ? (foundSec.sectionId ?? foundSec.id) : (room.sectionId || null),
      facilities: Array.isArray(room.facilities) ? [...room.facilities] : [],
    })
  }, [sections])

  useEffect(() => {
    if (!formMode || editingRoom) return
    if (!roomId) initializeCreate()
    else if (roomsLoaded) {
      const room = rooms.find(item => String(item.id) === String(roomId))
      if (room) initializeEdit(room)
    }
  }, [formMode, roomId, roomsLoaded, rooms, editingRoom, initializeCreate, initializeEdit])

  const handleToggleFacility = (facility) => {
    setEditingRoom((prev) => {
      if (!prev) return prev
      const current = prev.facilities || []
      const exists = current.includes(facility)
      return {
        ...prev,
        facilities: exists ? current.filter((f) => f !== facility) : [...current, facility],
      }
    })
  }

  const handleSaveRoom = async (e) => {
    e.preventDefault()
    if (saving) return
    if (!editingRoom.roomNumber?.trim()) return showError('Please enter a room number or code.')
    if (!editingRoom.roomName?.trim()) return showError('Please enter a room display name.')
    if (!editingRoom.buildingBlock?.trim()) return showError(customBuildingBlock ? 'Please enter the building block.' : 'Please select a building block.')
    if (!editingRoom.floor) return showError('Please select a floor.')
    if (!editingRoom.roomType?.trim()) return showError(customRoomType ? 'Please enter the room type.' : 'Please select a room type.')
    if (!editingRoom.status) return showError('Please select room availability status.')

    // Rule 1: Prevent double allocation of the same section to multiple rooms
    if (editingRoom.assignedSection) {
      const conflictRoom = rooms.find(
        (r) => r.id !== editingRoom.id && (
          (r.sectionId && editingRoom.sectionId && Number(r.sectionId) === Number(editingRoom.sectionId)) ||
          (r.assignedSection?.trim().toLowerCase() === editingRoom.assignedSection?.trim().toLowerCase())
        )
      )
      if (conflictRoom) {
        return showError(
          `Cannot allocate section "${editingRoom.assignedSection}": It is already assigned to room "${conflictRoom.roomNumber} (${conflictRoom.roomName})". A section can only have one assigned classroom.`
        )
      }
    }

    // Rule 2: Cannot set room to Inactive/Maintenance if assigned section has active enrolled students
    if (editingRoom.assignedSection && (editingRoom.status === 'Inactive' || editingRoom.status === 'Maintenance')) {
      const studentCount = sectionStudentCountMap.get(editingRoom.assignedSection) || 0
      if (studentCount > 0) {
        return showError(
          `Cannot deactivate room: Section "${editingRoom.assignedSection}" currently has ${studentCount} enrolled student${studentCount === 1 ? '' : 's'}. Please reallocate or transfer the section first.`
        )
      }
    }

    setSaving(true)
    try {
      let savedRoom = null
      if (editingRoom.id) {
        savedRoom = await roomService.updateRoom(editingRoom.id, editingRoom)
      } else {
        savedRoom = await roomService.createRoom(editingRoom)
      }

      const targetRoomId = savedRoom?.classroomId || savedRoom?.id || editingRoom.id
      if (editingRoom.sectionId) {
        const secId = Number(editingRoom.sectionId)
        if (secId > 0) {
          try {
            await roomService.allocateRoom(targetRoomId, editingRoom.assignedSection, secId)
          } catch (allocErr) {
            console.warn('Room saved, but section allocation API fallback:', allocErr)
          }
        }
      }

      showSuccess(`Room "${editingRoom.roomNumber}" saved successfully.`)
      await loadRooms()
      closeForm()
    } catch (err) {
      showError(err.message || 'Failed to save room.')
    } finally {
      setSaving(false)
    }
  }

  // Delete Room via Modal
  const handleConfirmDeleteRoom = async () => {
    if (!deletingRoom) return
    if (deletingRoom.assignedSection && deletingRoom.assignedSection.trim()) {
      const studentCount = sectionStudentCountMap.get(deletingRoom.assignedSection) || 0
      return showError(
        `Cannot delete room "${deletingRoom.roomNumber}": Section "${deletingRoom.assignedSection}" is currently allocated to this room${studentCount > 0 ? ` (${studentCount} students)` : ''}. Please deallocate or transfer the section first.`
      )
    }
    try {
      const targetRoomId = deletingRoom.classroomId || deletingRoom.id
      await roomService.deleteRoom(targetRoomId)
      showSuccess(`Room "${deletingRoom.roomNumber} - ${deletingRoom.roomName}" deleted successfully.`)
      setDeletingRoom(null)
      await loadRooms()
    } catch (err) {
      showError(err.message || 'Failed to delete room.')
    }
  }

  // Quick Allocation Handlers
  const handleOpenAllocate = (room) => {
    setAllocatingRoom(room)
    const foundSec = sections.find((s) => {
      const sId = s.sectionId ?? s.id
      if (room.sectionId && String(sId) === String(room.sectionId)) return true
      const sName = String(s.sectionName || s.name || '').trim().toLowerCase()
      const rName = String(room.assignedSection || '').trim().toLowerCase()
      return sName && rName && sName === rName
    })
    const secIdVal = foundSec ? (foundSec.sectionId ?? foundSec.id) : (room.sectionId || '')
    setSelectedSectionId(secIdVal ? String(secIdVal) : '')
  }

  const handleSaveAllocation = async (e) => {
    e.preventDefault()
    if (!allocatingRoom) return

    const targetRoomId = allocatingRoom.classroomId || allocatingRoom.id

    if (!selectedSectionId) {
      try {
        await roomService.allocateRoom(targetRoomId, '', null)
        showSuccess(`Room "${allocatingRoom.roomNumber}" is now unallocated and available.`)
        setAllocatingRoom(null)
        await loadRooms()
      } catch (err) {
        showError(err.message || 'Failed to update section allocation.')
      }
      return
    }

    const secObj = sections.find((s) => String(s.sectionId ?? s.id) === String(selectedSectionId) || String(s.sectionName || s.name) === String(selectedSectionId))
    const secId = Number(secObj?.sectionId ?? secObj?.id ?? selectedSectionId)
    const secName = secObj?.sectionName || secObj?.name || `Section ${secId}`

    if (!secId || isNaN(secId) || secId <= 0) {
      return showError('A valid section ID is required.')
    }

    // Rule: Prevent double allocation of the same section to multiple rooms
    const conflictRoom = rooms.find(
      (r) => r.id !== allocatingRoom.id && (
        (r.sectionId && Number(r.sectionId) === secId) ||
        (r.assignedSection?.trim().toLowerCase() === secName.trim().toLowerCase())
      )
    )
    if (conflictRoom) {
      return showError(
        `Section "${secName}" is already allocated to Room "${conflictRoom.roomNumber} (${conflictRoom.roomName})". Please choose an unallocated section.`
      )
    }

    try {
      await roomService.allocateRoom(targetRoomId, secName, secId)
      showSuccess(`Room "${allocatingRoom.roomNumber}" allocated to "${secName}".`)
      setAllocatingRoom(null)
      await loadRooms()
    } catch (err) {
      showError(err.message || 'Failed to update section allocation.')
    }
  }

  // Deallocate Room via Modal
  const handleConfirmDeallocate = async () => {
    if (!deallocatingRoom) return
    try {
      const targetRoomId = deallocatingRoom.classroomId || deallocatingRoom.id
      await roomService.allocateRoom(targetRoomId, '', null)
      showSuccess(`Room "${deallocatingRoom.roomNumber}" is now unallocated and available.`)
      setDeallocatingRoom(null)
      await loadRooms()
    } catch (err) {
      showError(err.message || 'Failed to free room.')
    }
  }

  const clearFilters = () => {
    setQuery('')
    setTypeFilter('')
    setBlockFilter('')
    setStatusFilter('')
  }

  const getRoomIcon = (type) => {
    const t = String(type || '').toLowerCase()
    if (t.includes('computer') || t.includes('computing')) return FiMonitor
    if (t.includes('electronic') || t.includes('dsp') || t.includes('vlsi')) return FiCpu
    if (t.includes('lab') || t.includes('workshop')) return FiLayers
    if (t.includes('seminar') || t.includes('auditorium')) return FiBookmark
    return FiHome
  }

  const isDetailsView = viewMode || (Boolean(roomId) && !formMode)
  const targetRoom = isDetailsView
    ? (rooms.find((r) => String(r.id) === String(roomId) || String(r.classroomId) === String(roomId)) || viewingRoom)
    : viewingRoom

  if (isDetailsView) {
    const RoomIcon = getRoomIcon(targetRoom?.roomType)
    const assignedStudentsCount = targetRoom?.assignedSection ? (sectionStudentCountMap.get(targetRoom.assignedSection) || 0) : 0
    const sectionMeta = targetRoom?.assignedSection ? sectionMetaMap.get(targetRoom.assignedSection.toLowerCase()) : null

    return (
      <DashboardLayout>
        <div className="rooms-page cm-profile-view" data-export-record>
          {/* Top Actions Bar */}
          <div className="cm-profile-top-bar">
            {targetRoom && (
              <ExportMenu
                mode="single"
                title={`Room Details - ${targetRoom.roomNumber}`}
                filename={`room_${targetRoom.roomNumber}`}
                rows={[targetRoom]}
                columns={roomExportColumns}
              />
            )}
            <button
              type="button"
              className="cm-button secondary"
              onClick={() => navigate('/rooms-management')}
            >
              &larr; Back 
            </button>
            {targetRoom && (
              <button
                type="button"
                className="rooms-submit-btn"
                onClick={() => handleOpenEdit(targetRoom)}
              >
                <FiEdit2 /> Edit Room
              </button>
            )}
          </div>

          {!targetRoom ? (
            <div className="erp-directory-card" style={{ padding: '40px' }}>
              <EmptyState
                icon={FiGrid}
                title={roomsLoaded ? 'Room Not Found' : 'Loading Room Details...'}
                description={roomsLoaded ? 'The requested classroom record does not exist in the spatial directory.' : 'Retrieving classroom information from campus directory...'}
              />
            </div>
          ) : (
            <article className="cm-profile-card">
              {/* Hero Banner with Lavender Palette & Gold Emblem */}
              <div className="cm-profile-banner">
                <div className="cm-profile-avatar-wrap">
                  <div className="cm-profile-placeholder">
                    <RoomIcon />
                  </div>
                </div>
                <div className="cm-profile-header-info">
                  <div className="cm-profile-badges">
                    <span className="cm-badge cm-badge-code">ROOM {targetRoom.roomNumber}</span>
                    <span className="cm-badge cm-badge-type">{targetRoom.roomType}</span>
                    <StatusBadge status={targetRoom.status} />
                  </div>
                  <h1 className="cm-profile-title">{targetRoom.roomNumber} - {targetRoom.roomName}</h1>
                  <p className="cm-profile-subtitle">
                    {[targetRoom.buildingBlock, targetRoom.floor, targetRoom.department || 'General / Shared Campus Facility'].filter(Boolean).join(' - ')}
                  </p>
                </div>
              </div>

              {/* Metric Summary Cards Bar */}
              <div className="rooms-detail-summary-bar">
                <div className="rooms-detail-metric-card">
                  <div className="metric-icon-box is-lavender">
                    <FiUsers />
                  </div>
                  <div>
                    <span className="metric-label">SEATING CAPACITY</span>
                    <strong className="metric-val">{targetRoom.capacity} Students</strong>
                  </div>
                </div>
                <div className="rooms-detail-metric-card">
                  <div className="metric-icon-box is-amber">
                    <FiLink />
                  </div>
                  <div>
                    <span className="metric-label">ALLOCATED SECTION</span>
                    <strong className="metric-val">{targetRoom.assignedSection || 'None (Available)'}</strong>
                  </div>
                </div>
                <div className="rooms-detail-metric-card">
                  <div className="metric-icon-box is-emerald">
                    <FiCheckCircle />
                  </div>
                  <div>
                    <span className="metric-label">ENROLLED STUDENTS</span>
                    <strong className="metric-val">{assignedStudentsCount} Enrolled</strong>
                  </div>
                </div>
                <div className="rooms-detail-metric-card">
                  <div className="metric-icon-box is-indigo">
                    <FiLayers />
                  </div>
                  <div>
                    <span className="metric-label">FACILITIES EQUIPPED</span>
                    <strong className="metric-val">{targetRoom.facilities?.length || 0} Amenities</strong>
                  </div>
                </div>
              </div>

              {/* Information Panels Grid */}
              <div className="cm-profile-grid" style={{ padding: '24px' }}>
                {/* 1. Spatial & Location Details */}
                <InfoCard
                  icon={FiHome}
                  title="Spatial & Location Details"
                  rows={[
                    ['Room Code / Number', targetRoom.roomNumber],
                    ['Display Name', targetRoom.roomName],
                    ['Room Classification', targetRoom.roomType],
                    ['Building Block', targetRoom.buildingBlock],
                    ['Floor Level', targetRoom.floor],
                    ['Managing Department', targetRoom.department || 'General / Shared'],
                    ['Seating Capacity', `${targetRoom.capacity} Seats`],
                    ['Operational Status', targetRoom.status],
                  ]}
                />

                {/* 2. Academic Section Allocation */}
                <section className="cm-info-card sa-detail-panel sa-modern-panel erp-view-section">
                  <div className="cm-info-card-header sa-panel-header">
                    <div className="sa-panel-title-wrap">
                      <span className="sa-panel-icon"><FiLink aria-hidden="true" /></span>
                      <h2>Academic Section Allocation</h2>
                    </div>
                    <span className="sa-card-count-badge">
                      {targetRoom.assignedSection ? 'Allocated' : 'Unallocated'}
                    </span>
                  </div>

                  <div className="cm-info-rows sa-detail-kv-grid erp-view-grid">
                    <div className="cm-info-row sa-kv-cell erp-view-field">
                      <span className="cm-info-label sa-kv-label erp-view-label">Assigned Section</span>
                      <strong className="cm-info-val sa-kv-val erp-view-value">
                        {targetRoom.assignedSection ? (
                          <span className="rooms-allocated-badge" style={{ fontSize: '13px', padding: '4px 10px' }}>
                            <FiCheckCircle /> {targetRoom.assignedSection}
                          </span>
                        ) : (
                          <span style={{ color: '#64748B' }}>None (Available for allocation)</span>
                        )}
                      </strong>
                    </div>

                    {sectionMeta?.metaStr && (
                      <div className="cm-info-row sa-kv-cell erp-view-field">
                        <span className="cm-info-label sa-kv-label erp-view-label">Academic Program Mapping</span>
                        <strong className="cm-info-val sa-kv-val erp-view-value">{sectionMeta.metaStr}</strong>
                      </div>
                    )}

                    <div className="cm-info-row sa-kv-cell erp-view-field">
                      <span className="cm-info-label sa-kv-label erp-view-label">Active Enrolled Students</span>
                      <strong className="cm-info-val sa-kv-val erp-view-value">
                        {assignedStudentsCount > 0 ? (
                          <span className="rooms-student-count-chip" style={{ fontSize: '12px', padding: '3px 10px' }}>
                            <FiUsers /> {assignedStudentsCount} Enrolled Students
                          </span>
                        ) : (
                          '0 Students'
                        )}
                      </strong>
                    </div>

                    <div className="cm-info-row sa-kv-cell erp-view-field">
                      <span className="cm-info-label sa-kv-label erp-view-label">Allocation Actions</span>
                      <div className="cm-info-val sa-kv-val erp-view-value" style={{ marginTop: '4px' }}>
                        {targetRoom.assignedSection ? (
                          <button
                            type="button"
                            className="rooms-deallocate-link"
                            onClick={() => setDeallocatingRoom(targetRoom)}
                            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px' }}
                          >
                            <FiUnlock /> Free / Deallocate Room
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="rooms-allocate-action-btn"
                            onClick={() => handleOpenAllocate(targetRoom)}
                            style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '8px' }}
                          >
                            <FiLink /> Allocate Class Section
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Equipped Facilities & Amenities */}
                <section className="cm-info-card sa-detail-panel sa-modern-panel erp-view-section" style={{ gridColumn: '1 / -1' }}>
                  <div className="cm-info-card-header sa-panel-header">
                    <div className="sa-panel-title-wrap">
                      <span className="sa-panel-icon"><FiCheckCircle aria-hidden="true" /></span>
                      <h2>Equipped Facilities & Amenities</h2>
                    </div>
                    <span className="sa-card-count-badge">
                      {targetRoom.facilities?.length || 0} Equipped
                    </span>
                  </div>

                  <div style={{ padding: '16px 20px' }}>
                    {targetRoom.facilities && targetRoom.facilities.length > 0 ? (
                      <div className="facility-tags-list" style={{ gap: '10px' }}>
                        {targetRoom.facilities.map((f) => (
                          <span key={f} className="facility-tag-item" style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '8px' }}>
                            <FiCheckCircle /> {f}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, color: '#64748B', fontSize: '13px' }}>
                        No specific facilities or special equipment tagged for this classroom.
                      </p>
                    )}
                  </div>
                </section>

                {/* 4. Description & Remarks */}
                {targetRoom.description && (
                  <section className="cm-info-card sa-detail-panel sa-modern-panel erp-view-section" style={{ gridColumn: '1 / -1' }}>
                    <div className="cm-info-card-header sa-panel-header">
                      <div className="sa-panel-title-wrap">
                        <span className="sa-panel-icon"><FiInfo aria-hidden="true" /></span>
                        <h2>Room Remarks & Equipment Notes</h2>
                      </div>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: 1.6, background: '#F8FAFC', padding: '12px 16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                        {targetRoom.description}
                      </p>
                    </div>
                  </section>
                )}
              </div>
            </article>
          )}

          {/* Quick Allocate Modal */}
          {allocatingRoom && (
            <div className="rooms-modal-backdrop" onClick={() => setAllocatingRoom(null)}>
              <div className="rooms-modal-card rooms-allocate-modal" onClick={(e) => e.stopPropagation()}>
                <div className="rooms-modal-header">
                  <div className="rooms-modal-header-icon">
                    <FiLink />
                  </div>
                  <div>
                    <h3 className="rooms-modal-title">Allocate Section to Room</h3>
                    <p className="rooms-modal-subtitle">
                      Assign {allocatingRoom.roomNumber} ({allocatingRoom.roomName}) to a B.Tech class section.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rooms-modal-close"
                    onClick={() => setAllocatingRoom(null)}
                  >
                    <FiX />
                  </button>
                </div>

                <form onSubmit={handleSaveAllocation}>
                  <div className="rooms-modal-body">
                    <div className="rooms-room-preview-box">
                      <div className="rooms-preview-left">
                        <span className="room-code-badge">{allocatingRoom.roomNumber}</span>
                        <strong>{allocatingRoom.roomName}</strong>
                      </div>
                      <div className="room-preview-meta">
                        <span>{allocatingRoom.buildingBlock} | {allocatingRoom.floor}</span>
                        <span><FiUsers /> Capacity: {allocatingRoom.capacity} Seats</span>
                      </div>
                    </div>

                    <div className="rooms-form-group" style={{ marginTop: '16px' }}>
                      <label>Select Section to Allocate</label>
                      <SearchableSelect
                        label="Section"
                        value={selectedSectionId}
                        options={[
                          { id: '', value: '', name: '- None (Leave Available / Unallocated) -', code: 'Free Room' },
                          ...getSectionDropdownOptions(allocatingRoom.id),
                        ]}
                        onChange={(value) => setSelectedSectionId(value)}
                        placeholder="Select an unallocated class section..."
                        searchPlaceholder="Search section, course, or branch..."
                        noOptionsMessage="No matching sections available."
                      />
                    </div>
                  </div>

                  <div className="rooms-modal-footer">
                    <button
                      type="button"
                      className="rooms-cancel-btn"
                      onClick={() => setAllocatingRoom(null)}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="rooms-submit-btn">
                      <FiCheck /> Confirm Allocation
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete confirmation modal */}
          {deletingRoom && (() => {
            const studentCount = deletingRoom.assignedSection ? (sectionStudentCountMap.get(deletingRoom.assignedSection) || 0) : 0
            const hasAssignedSection = Boolean(deletingRoom.assignedSection && deletingRoom.assignedSection.trim())
            const isBlocked = hasAssignedSection
            return (
              <div className="rooms-modal-backdrop" onClick={() => setDeletingRoom(null)}>
                <div className="rooms-modal-card rooms-confirm-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="rooms-modal-header delete-header">
                    <div className="rooms-modal-header-icon delete-icon">
                      <FiTrash2 />
                    </div>
                    <div>
                      <h3 className="rooms-modal-title">{isBlocked ? 'Deletion Blocked' : 'Delete Room Confirmation'}</h3>
                      <p className="rooms-modal-subtitle">
                        Campus spatial directory deletion governance.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rooms-modal-close"
                      onClick={() => setDeletingRoom(null)}
                    >
                      <FiX />
                    </button>
                  </div>

                  <div className="rooms-modal-body">
                    <div className="rooms-confirm-box">
                      <div className="rooms-confirm-room-info">
                        <span className="room-code-badge">{deletingRoom.roomNumber}</span>
                        <div>
                          <strong>{deletingRoom.roomName}</strong>
                          <p>{deletingRoom.buildingBlock} | {deletingRoom.floor} | {deletingRoom.roomType}</p>
                        </div>
                      </div>

                      {deletingRoom.assignedSection && (
                        <div className="rooms-confirm-section-tag">
                          <span>Allocated Section:</span>
                          <strong>
                            <FiCheckCircle /> {deletingRoom.assignedSection}
                            {studentCount > 0 ? (
                              <span className="rooms-student-count-chip">
                                <FiUsers /> {studentCount} Enrolled
                              </span>
                            ) : (
                              <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, marginLeft: '6px' }}>
                                (Assigned Section)
                              </span>
                            )}
                          </strong>
                        </div>
                      )}
                    </div>

                    {isBlocked ? (
                      <div className="rooms-confirm-blocked-banner">
                        <div className="rooms-blocked-icon-box">
                          <FiSlash className="blocked-icon" />
                        </div>
                        <div className="rooms-blocked-text-content">
                          <strong>Deletion Blocked by Academic Governance</strong>
                          <p>
                            Room <strong>"{deletingRoom.roomName}"</strong> is currently allocated to Section <strong>"{deletingRoom.assignedSection}"</strong>{studentCount > 0 ? ` with ${studentCount} active enrolled student${studentCount === 1 ? '' : 's'}` : ''}.
                            You cannot delete this room while a section is allocated. Please deallocate or transfer the section to another room first.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="rooms-confirm-text">
                        Are you sure you want to permanently delete room <strong>"{deletingRoom.roomName}"</strong> ({deletingRoom.roomNumber})? This action cannot be undone.
                      </p>
                    )}
                  </div>

                  <div className="rooms-modal-footer">
                    <button
                      type="button"
                      className="rooms-cancel-btn"
                      onClick={() => setDeletingRoom(null)}
                    >
                      {isBlocked ? 'Close' : 'Cancel'}
                    </button>
                    {isBlocked ? (
                      <button
                        type="button"
                        className="rooms-submit-btn"
                        onClick={() => {
                          const target = deletingRoom
                          setDeletingRoom(null)
                          handleOpenDeallocate(target)
                        }}
                      >
                        <FiUnlock /> Deallocate Section First
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rooms-submit-btn is-delete-confirm"
                        title="Delete Room"
                        onClick={async () => {
                          await handleConfirmDeleteRoom()
                          navigate('/rooms-management')
                        }}
                      >
                        <FiTrash2 /> Confirm & Delete Room
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Deallocate confirmation modal */}
          {deallocatingRoom && (() => {
            const studentCount = deallocatingRoom.assignedSection ? (sectionStudentCountMap.get(deallocatingRoom.assignedSection) || 0) : 0
            return (
              <div className="rooms-modal-backdrop" onClick={() => setDeallocatingRoom(null)}>
                <div className="rooms-modal-card rooms-confirm-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="rooms-modal-header">
                    <div className="rooms-modal-header-icon">
                      <FiUnlock />
                    </div>
                    <div>
                      <h3 className="rooms-modal-title">Free / Deallocate Room</h3>
                      <p className="rooms-modal-subtitle">
                        Release the assigned class section from this room.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rooms-modal-close"
                      onClick={() => setDeallocatingRoom(null)}
                    >
                      <FiX />
                    </button>
                  </div>

                  <div className="rooms-modal-body">
                    <div className="rooms-confirm-box">
                      <div className="rooms-confirm-room-info">
                        <span className="room-code-badge">{deallocatingRoom.roomNumber}</span>
                        <div>
                          <strong>{deallocatingRoom.roomName}</strong>
                          <p>{deallocatingRoom.buildingBlock} | {deallocatingRoom.floor}</p>
                        </div>
                      </div>
                      <div className="rooms-confirm-section-tag">
                        <span>Currently Assigned to:</span>
                        <strong>
                          <FiCheckCircle /> {deallocatingRoom.assignedSection}
                          {studentCount > 0 && (
                            <span className="rooms-student-count-chip">
                              <FiUsers /> {studentCount} Students
                            </span>
                          )}
                        </strong>
                      </div>
                    </div>

                    {studentCount > 0 && (
                      <div className="rooms-confirm-warning" style={{ marginTop: '12px' }}>
                        <FiAlertTriangle />
                        <span>
                          Notice: <strong>{studentCount} students</strong> are currently taking classes in this section. Freeing the room will leave this section without a designated classroom until a new room is allocated.
                        </span>
                      </div>
                    )}

                    <p className="rooms-confirm-text">
                      Are you sure you want to free room <strong>{deallocatingRoom.roomNumber}</strong> from <strong>{deallocatingRoom.assignedSection}</strong>? The room status will return to Available.
                    </p>
                  </div>

                  <div className="rooms-modal-footer">
                    <button
                      type="button"
                      className="rooms-cancel-btn"
                      onClick={() => setDeallocatingRoom(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rooms-submit-btn"
                      onClick={handleConfirmDeallocate}
                    >
                      <FiUnlock /> Confirm & Free Room
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      </DashboardLayout>
    )
  }

  if (formMode) return (
    <DashboardLayout>
      <div className="rooms-page rooms-form-page">
        <PageHeader title={roomId ? 'Edit Room / Classroom' : 'Add New Room / Classroom'} subtitle="Configure room identification, location, capacity, facilities, and section allocation.">
          <button type="button" className="rooms-cancel-btn rooms-form-back-btn" onClick={closeForm}><FiArrowLeft aria-hidden="true" />Back</button>
        </PageHeader>
        {!editingRoom ? <EmptyState title={roomsLoaded ? 'Room not found' : 'Loading room...'} /> : (
          <div className="rooms-form-layout">
            <section className="rooms-editor-panel" aria-label="Room details">
              <form onSubmit={handleSaveRoom}>
                <div className="rooms-modal-body">
                  <div className="rooms-form-grid">
                    {/* Room Number */}
                    <div className="rooms-form-group">
                      <label>
                        Room Code / Number <span className="req-mark">*</span>
                      </label>
                      <input
                        type="text"
                        className="rooms-input"
                        placeholder="e.g. LH-101, CSE-LAB-1"
                        value={editingRoom.roomNumber}
                        onChange={(e) => setEditingRoom({ ...editingRoom, roomNumber: e.target.value })}
                        required
                      />
                    </div>

                    {/* Room Name */}
                    <div className="rooms-form-group">
                      <label>
                        Room Display Name <span className="req-mark">*</span>
                      </label>
                      <input
                        type="text"
                        className="rooms-input"
                        placeholder="e.g. Lecture Hall 101"
                        value={editingRoom.roomName}
                        onChange={(e) => setEditingRoom({ ...editingRoom, roomName: e.target.value })}
                        required
                      />
                    </div>

                    {/* Building Block */}
                    <div className="rooms-form-group">
                      <label>
                        Building Block <span className="req-mark">*</span>
                      </label>
                      <SearchableSelect
                        label="Building Block"
                        value={customBuildingBlock ? '__other__' : editingRoom.buildingBlock}
                        options={[...BUILDING_BLOCKS, { value: '__other__', label: 'Others' }]}
                        placeholder="Select Building Block"
                        searchPlaceholder="Search building blocks..."
                        noOptionsMessage="No matching building blocks. Clear the search and select Others to enter a custom block."
                        onChange={(value) => {
                          const other = value === '__other__'
                          setCustomBuildingBlock(other)
                          setEditingRoom({ ...editingRoom, buildingBlock: other ? '' : value })
                        }}
                        required
                      />
                    </div>

                    {customBuildingBlock && <div className="rooms-form-group">
                      <label htmlFor="other-building-block">Other Building Block <span className="req-mark">*</span></label>
                      <input
                        id="other-building-block"
                        className="rooms-input"
                        type="text"
                        value={editingRoom.buildingBlock}
                        onChange={(e) => setEditingRoom({ ...editingRoom, buildingBlock: e.target.value })}
                        onBlur={() => setEditingRoom((room) => ({ ...room, buildingBlock: room.buildingBlock.trim() }))}
                        placeholder="Enter building block"
                        required
                      />
                    </div>}

                    {/* Floor */}
                    <div className="rooms-form-group">
                      <label>
                        Floor <span className="req-mark">*</span>
                      </label>
                      <ProjectSelect
                        className="rooms-select"
                        value={editingRoom.floor}
                        onChange={(e) => setEditingRoom({ ...editingRoom, floor: e.target.value })}
                        required
                      >
                        <option value="" disabled>Select Floor</option>
                        {FLOORS.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </ProjectSelect>
                    </div>

                    {/* Room Type */}
                    <div className="rooms-form-group">
                      <label>
                        Room Type <span className="req-mark">*</span>
                      </label>
                      <SearchableSelect
                        label="Room Type"
                        value={customRoomType ? '__other__' : editingRoom.roomType}
                        options={[...ROOM_TYPES, { value: '__other__', label: 'Others' }]}
                        placeholder="Select Room Type"
                        searchPlaceholder="Search room types..."
                        noOptionsMessage="No matching room types. Select Others to enter a custom type."
                        onChange={(value) => {
                          const other = value === '__other__'
                          setCustomRoomType(other)
                          setEditingRoom({ ...editingRoom, roomType: other ? '' : value })
                        }}
                        required
                      />
                    </div>

                    {customRoomType && <div className="rooms-form-group">
                      <label htmlFor="other-room-type">Other Room Type <span className="req-mark">*</span></label>
                      <input
                        id="other-room-type"
                        className="rooms-input"
                        type="text"
                        value={editingRoom.roomType}
                        onChange={(e) => setEditingRoom({ ...editingRoom, roomType: e.target.value })}
                        onBlur={() => setEditingRoom((room) => ({ ...room, roomType: room.roomType.trim() }))}
                        placeholder="Enter room type"
                        required
                      />
                    </div>}

                    {/* Seating Capacity */}
                    <div className="rooms-form-group">
                      <label>
                        Seating Capacity <span className="req-mark">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        className="rooms-input"
                        placeholder="e.g. 60"
                        value={editingRoom.capacity}
                        onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) || '' })}
                        required
                      />
                    </div>

                    {/* Availability Status */}
                    <div className="rooms-form-group">
                      <label>
                        Availability Status <span className="req-mark">*</span>
                      </label>
                      <ProjectSelect
                        className="rooms-select"
                        value={editingRoom.status}
                        onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value })}
                        required
                      >
                        <option value="" disabled>Select Availability Status</option>
                        <option value="Available">Available</option>
                        <option value="Allocated">Allocated</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="Inactive">Inactive</option>
                      </ProjectSelect>
                    </div>
                  </div>

                  {/* Facilities & Amenities */}
                  <div className="rooms-form-group" style={{ marginTop: '14px' }}>
                    <label>Available Facilities & Equipment</label>
                    <div className="rooms-facilities-picker">
                      {ROOM_FACILITIES.map((facility) => {
                        const isSelected = editingRoom.facilities?.includes(facility)
                        return (
                          <button
                            type="button"
                            key={facility}
                            className={`facility-chip-btn ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => handleToggleFacility(facility)}
                          >
                            {isSelected ? <FiCheck /> : <FiPlus />} {facility}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Description / Notes */}
                  <div className="rooms-form-group" style={{ marginTop: '12px' }}>
                    <label>Room Notes / Remarks</label>
                    <textarea
                      className="rooms-textarea"
                      rows={2}
                      placeholder="Special audio-visual equipment, teaching amenities, or layout notes..."
                      value={editingRoom.description || ''}
                      onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rooms-modal-footer">
                  <button
                    type="button"
                    className="rooms-cancel-btn"
                    onClick={() => closeForm()}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="rooms-submit-btn" disabled={saving}>
                    <FiCheck /> {saving ? 'Saving...' : editingRoom.id ? 'Save Changes' : 'Create Room'}
                  </button>
                </div>
              </form>
            </section>
            <aside className="rooms-live-preview" aria-label="Room live preview">
              <header><span className="rooms-preview-dot" /> LIVE PREVIEW</header>
              <div className="rooms-preview-content">
                <div className="rooms-preview-identity">
                  {(editingRoom.roomName?.trim() || editingRoom.roomNumber?.trim() || editingRoom.roomType) && <div className="rooms-preview-icon"><FiGrid /></div>}
                  <div>
                    {editingRoom.roomName?.trim() && <h2>{editingRoom.roomName.trim()}</h2>}
                    {[editingRoom.roomNumber, editingRoom.roomType].some(value => String(value || '').trim()) && <p>{[editingRoom.roomNumber, editingRoom.roomType].filter(value => String(value || '').trim()).join(' · ')}</p>}
                  </div>
                </div>
                {editingRoom.status && <div className="rooms-preview-status"><StatusBadge status={editingRoom.status} /></div>}
                <dl>{[
                  ['Building Block', editingRoom.buildingBlock],
                  ['Floor', editingRoom.floor],
                  ['Seating Capacity', editingRoom.capacity ? editingRoom.capacity + ' seats' : ''],
                  ['Allocated Section', editingRoom.assignedSection],
                ].filter(([, value]) => String(value || '').trim()).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
                {editingRoom.facilities?.length > 0 && <><h3>Facilities & Equipment</h3><div className="rooms-preview-facilities">{editingRoom.facilities.map(item => <span key={item}><FiCheck /> {item}</span>)}</div></>}
                {editingRoom.description?.trim() && <><h3>Remarks / Notes</h3><p className="rooms-preview-notes">{editingRoom.description}</p></>}
              </div>
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  )

  return (
    <DashboardLayout>
      <div className="rooms-page">
        {/* Page Header with Compact Top-Right Summary */}
        <PageHeader
          title="Rooms & Classrooms Management"
          subtitle="Manage campus classrooms, lecture halls, laboratories, seating capacities, and allocate sections to rooms."
          compactSummary={compactSummaryItems}
        />

        {/* Main Directory Card */}
        <div className="erp-directory-card rooms-directory-card">
          <div className="course-directory-heading rooms-heading">
            <div className="rooms-heading-left">
              <div className="rooms-heading-icon">
                <FiGrid />
              </div>
              <div>
                <span className="cm-eyebrow">CAMPUS SPATIAL DIRECTORY</span>
                <h2>Classrooms & Facilities</h2>
                <p>{filteredRooms.length} room{filteredRooms.length === 1 ? '' : 's'} configured in directory</p>
              </div>
            </div>
            <div className="directory-export-actions">
              <ExportMenu
                rows={filteredRooms}
                columns={roomExportColumns}
                filename="rooms_directory"
                title="Classrooms & Spatial Directory"
              />
              <button
                type="button"
                className="rooms-add-btn"
                onClick={handleOpenCreate}
              >
                <FiPlus /> Add Classroom
              </button>
            </div>
          </div>

          {/* Controls Toolbar */}
          <FilterPanel active={Boolean(query || typeFilter || blockFilter || statusFilter)} onClear={clearFilters}>
          <div className="course-toolbar rooms-toolbar">
            <label className="rooms-search">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                aria-label="Search rooms and classrooms"
                placeholder="Search room number, name, block, floor, section, branch, course..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button type="button" className="rooms-clear-search" aria-label="Clear room search" onClick={() => setQuery('')}>
                  <FiX />
                </button>
              )}
            </label>

            <div className="rooms-filters-group">
              <ProjectSelect
                className="rooms-filter"
                aria-label="Filter by room type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Room Types</option>
                {ROOM_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </ProjectSelect>

              <ProjectSelect
                className="rooms-filter"
                aria-label="Filter by building block"
                value={blockFilter}
                onChange={(e) => setBlockFilter(e.target.value)}
              >
                <option value="">All Building Blocks</option>
                {BUILDING_BLOCKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </ProjectSelect>

              <ProjectSelect
                className="rooms-filter"
                aria-label="Filter by room status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Allocated">Allocated</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
              </ProjectSelect>

            </div>
          </div>
          </FilterPanel>

          {/* Rooms Data Table */}
          <div className="rooms-table-wrap">
            <table className="rooms-table">
              <thead>
                <tr>
                  <th className="table-center" style={{ minWidth: '200px' }}>Room</th>
                  <th className="table-center" style={{ minWidth: '130px' }}>Room Type</th>
                  <th className="table-center" style={{ minWidth: '160px' }}>Building & Floor</th>
                  <th className="table-center" style={{ minWidth: '105px' }}>Capacity</th>
                  <th className="table-center" style={{ minWidth: '220px' }}>Section Allocation</th>
                  <th className="table-center" style={{ minWidth: '100px' }}>Status</th>
                  <th className="table-center" style={{ width: '110px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRooms.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <EmptyState
                        icon={FiGrid}
                        title="No rooms found"
                        description="Add a room or classroom to get started."
                      />
                    </td>
                  </tr>
                ) : (
                  paginatedRooms.map((room) => {
                    const RoomIcon = getRoomIcon(room.roomType)
                    const assignedStudentsCount = room.assignedSection ? (sectionStudentCountMap.get(room.assignedSection) || 0) : 0
                    const sectionMeta = room.assignedSection ? sectionMetaMap.get(room.assignedSection.toLowerCase()) : null

                    return (
                      <tr key={room.id}>
                        {/* Room Identity */}
                        <td className="table-center">
                          <div className="rooms-identity-cell">
                            <div className="rooms-icon-box">
                              <RoomIcon />
                            </div>
                            <div className="rooms-identity-info">
                              <div className="rooms-title-row">
                                <span className="room-code-badge">{room.roomNumber}</span>
                                <button
                                  type="button"
                                  className="room-name-link table-cell-truncate"
                                  onClick={() => navigate(`/rooms-management/${room.id}`)}
                                  title={room.roomName}
                                  aria-label={`View details for ${room.roomName}`}
                                >
                                  {room.roomName}
                                </button>
                              </div>
                              <small className="room-dept-text" title={room.department || 'General / Shared'}>{room.department || 'General / Shared'}</small>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="table-center">
                          <span className={`room-type-tag ${/lab/i.test(room.roomType) ? 'is-lab' : /seminar/i.test(room.roomType) ? 'is-seminar' : 'is-class'}`}>
                            <RoomIcon /> {room.roomType}
                          </span>
                        </td>

                        {/* Building & Floor */}
                        <td className="table-center">
                          <div className="rooms-location-cell">
                            <div className="rooms-building-row">
                              <FiHome className="rooms-loc-icon" />
                              <span>{room.buildingBlock}</span>
                            </div>
                            <div className="rooms-floor-row">
                              <FiMapPin className="rooms-floor-icon" />
                              <small className="floor-badge">{room.floor}</small>
                            </div>
                          </div>
                        </td>

                        {/* Capacity */}
                        <td className="table-center">
                          <span className="rooms-capacity-badge">
                            <FiUsers /> {room.capacity}
                          </span>
                        </td>

                        {/* Section Allocation & Details (Course, Branch, Semester, Students) */}
                        <td className="table-center" data-no-overflow-tooltip title="">
                          {room.assignedSection ? (
                            <div className="rooms-allocated-wrapper">
                              <div className="rooms-allocated-details">
                                <div className="rooms-allocated-top">
                                  <span className="rooms-allocated-badge">
                                    <FiCheckCircle /> {room.assignedSection}
                                  </span>
                                  {assignedStudentsCount > 0 && (
                                    <span className="rooms-student-count-chip">
                                      <FiUsers /> {assignedStudentsCount}
                                    </span>
                                  )}
                                </div>
                                {sectionMeta?.metaStr && (
                                  <small className="rooms-allocated-meta">
                                    {sectionMeta.metaStr}
                                  </small>
                                )}
                              </div>
                              <button
                                type="button"
                                className="rooms-deallocate-link"
                                title="Deallocate / Free room"
                                onClick={() => setDeallocatingRoom(room)}
                              >
                                <FiUnlock /> Free
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="rooms-allocate-action-btn"
                              onClick={() => handleOpenAllocate(room)}
                            >
                              <FiLink /> Allocate Section
                            </button>
                          )}
                        </td>

                        {/* Status */}
                        <td className="table-center">
                          <StatusBadge status={room.status} />
                        </td>

                        {/* Actions */}
                        <td className="table-center">
                          <div className="rooms-row-actions">
                            <button
                              type="button"
                              className="rooms-icon-btn is-edit"
                              title="Edit Room"
                              onClick={() => handleOpenEdit(room)}
                            >
                              <FiEdit2 />
                            </button>
                            <button
                              type="button"
                              className="rooms-icon-btn is-delete"
                              title="Delete Room"
                              onClick={() => setDeletingRoom(room)}
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalRecords={filteredRooms.length}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* ============================================================== */}
        {/* QUICK ALLOCATE SECTION MODAL */}
        {/* ============================================================== */}
        {allocatingRoom && (
          <div className="rooms-modal-backdrop" onClick={() => setAllocatingRoom(null)}>
            <div className="rooms-modal-card rooms-allocate-modal" onClick={(e) => e.stopPropagation()}>
              <div className="rooms-modal-header">
                <div className="rooms-modal-header-icon">
                  <FiLink />
                </div>
                <div>
                  <h3 className="rooms-modal-title">Allocate Section to Room</h3>
                  <p className="rooms-modal-subtitle">
                    Assign {allocatingRoom.roomNumber} ({allocatingRoom.roomName}) to a B.Tech class section.
                  </p>
                </div>
                <button
                  type="button"
                  className="rooms-modal-close"
                  onClick={() => setAllocatingRoom(null)}
                >
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSaveAllocation}>
                <div className="rooms-modal-body">
                  <div className="rooms-room-preview-box">
                    <div className="rooms-preview-left">
                      <span className="room-code-badge">{allocatingRoom.roomNumber}</span>
                      <strong>{allocatingRoom.roomName}</strong>
                    </div>
                    <div className="room-preview-meta">
                      <span>{allocatingRoom.buildingBlock} | {allocatingRoom.floor}</span>
                      <span><FiUsers /> Capacity: {allocatingRoom.capacity} Seats</span>
                    </div>
                  </div>

                  <div className="rooms-form-group" style={{ marginTop: '16px' }}>
                    <label>Select Section to Allocate</label>
                    <SearchableSelect
                      label="Section"
                      value={selectedSectionId}
                      options={[
                        { id: '', value: '', name: '- None (Leave Available / Unallocated) -', code: 'Free Room' },
                        ...getSectionDropdownOptions(allocatingRoom.id),
                      ]}
                      onChange={(value) => setSelectedSectionId(value)}
                      placeholder="Select an unallocated class section..."
                      searchPlaceholder="Search section, course, or branch..."
                      noOptionsMessage="No matching sections available."
                    />
                  </div>
                </div>

                <div className="rooms-modal-footer">
                  <button
                    type="button"
                    className="rooms-cancel-btn"
                    onClick={() => setAllocatingRoom(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="rooms-submit-btn">
                    <FiCheck /> Confirm Allocation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* CREATE / EDIT ROOM MODAL */}
        {/* ============================================================== */}


        {/* ============================================================== */}
        {/* DELETE CONFIRMATION MODAL POPUP */}
        {/* ============================================================== */}
        {deletingRoom && (() => {
          const studentCount = deletingRoom.assignedSection ? (sectionStudentCountMap.get(deletingRoom.assignedSection) || 0) : 0
          const hasAssignedSection = Boolean(deletingRoom.assignedSection && deletingRoom.assignedSection.trim())
          const isBlocked = hasAssignedSection
          return (
            <div className="rooms-modal-backdrop" onClick={() => setDeletingRoom(null)}>
              <div className="rooms-modal-card rooms-confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="rooms-modal-header delete-header">
                  <div className="rooms-modal-header-icon delete-icon">
                    <FiTrash2 />
                  </div>
                  <div>
                    <h3 className="rooms-modal-title">{isBlocked ? 'Deletion Blocked' : 'Delete Room Confirmation'}</h3>
                    <p className="rooms-modal-subtitle">
                      Campus spatial directory deletion governance.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rooms-modal-close"
                    onClick={() => setDeletingRoom(null)}
                  >
                    <FiX />
                  </button>
                </div>

                <div className="rooms-modal-body">
                  <div className="rooms-confirm-box">
                    <div className="rooms-confirm-room-info">
                      <span className="room-code-badge">{deletingRoom.roomNumber}</span>
                      <div>
                        <strong>{deletingRoom.roomName}</strong>
                        <p>{deletingRoom.buildingBlock} | {deletingRoom.floor} | {deletingRoom.roomType}</p>
                      </div>
                    </div>

                    {deletingRoom.assignedSection && (
                      <div className="rooms-confirm-section-tag">
                        <span>Allocated Section:</span>
                        <strong>
                          <FiCheckCircle /> {deletingRoom.assignedSection}
                          {studentCount > 0 ? (
                            <span className="rooms-student-count-chip">
                              <FiUsers /> {studentCount} Enrolled
                            </span>
                          ) : (
                            <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600, marginLeft: '6px' }}>
                              (Assigned Section)
                            </span>
                          )}
                        </strong>
                      </div>
                    )}
                  </div>

                  {isBlocked ? (
                    <div className="rooms-confirm-blocked-banner">
                      <div className="rooms-blocked-icon-box">
                        <FiSlash className="blocked-icon" />
                      </div>
                      <div className="rooms-blocked-text-content">
                        <strong>Deletion Blocked by Academic Governance</strong>
                        <p>
                          Room <strong>"{deletingRoom.roomName}"</strong> is currently allocated to Section <strong>"{deletingRoom.assignedSection}"</strong>{studentCount > 0 ? ` with ${studentCount} active enrolled student${studentCount === 1 ? '' : 's'}` : ''}.
                          You cannot delete this room while a section is allocated. Please deallocate or transfer the section to another room first.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="rooms-confirm-text">
                      Are you sure you want to permanently delete room <strong>"{deletingRoom.roomName}"</strong> ({deletingRoom.roomNumber})? This action cannot be undone.
                    </p>
                  )}
                </div>

                <div className="rooms-modal-footer">
                  <button
                    type="button"
                    className="rooms-cancel-btn"
                    onClick={() => setDeletingRoom(null)}
                  >
                    {isBlocked ? 'Close' : 'Cancel'}
                  </button>
                  {isBlocked ? (
                    <button
                      type="button"
                      className="rooms-submit-btn"
                      onClick={() => {
                        const target = deletingRoom
                        setDeletingRoom(null)
                        handleOpenDeallocate(target)
                      }}
                    >
                      <FiUnlock /> Deallocate Section First
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rooms-submit-btn is-delete-confirm"
                      title="Delete Room"
                      onClick={handleConfirmDeleteRoom}
                    >
                      <FiTrash2 /> Confirm & Delete Room
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* ============================================================== */}
        {/* DEALLOCATE / FREE CONFIRMATION MODAL POPUP */}
        {/* ============================================================== */}
        {deallocatingRoom && (() => {
          const studentCount = deallocatingRoom.assignedSection ? (sectionStudentCountMap.get(deallocatingRoom.assignedSection) || 0) : 0
          return (
            <div className="rooms-modal-backdrop" onClick={() => setDeallocatingRoom(null)}>
              <div className="rooms-modal-card rooms-confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="rooms-modal-header">
                  <div className="rooms-modal-header-icon">
                    <FiUnlock />
                  </div>
                  <div>
                    <h3 className="rooms-modal-title">Free / Deallocate Room</h3>
                    <p className="rooms-modal-subtitle">
                      Release the assigned class section from this room.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rooms-modal-close"
                    onClick={() => setDeallocatingRoom(null)}
                  >
                    <FiX />
                  </button>
                </div>

                <div className="rooms-modal-body">
                  <div className="rooms-confirm-box">
                    <div className="rooms-confirm-room-info">
                      <span className="room-code-badge">{deallocatingRoom.roomNumber}</span>
                      <div>
                        <strong>{deallocatingRoom.roomName}</strong>
                        <p>{deallocatingRoom.buildingBlock} | {deallocatingRoom.floor}</p>
                      </div>
                    </div>
                    <div className="rooms-confirm-section-tag">
                      <span>Currently Assigned to:</span>
                      <strong>
                        <FiCheckCircle /> {deallocatingRoom.assignedSection}
                        {studentCount > 0 && (
                          <span className="rooms-student-count-chip">
                            <FiUsers /> {studentCount} Students
                          </span>
                        )}
                      </strong>
                    </div>
                  </div>

                  {studentCount > 0 && (
                    <div className="rooms-confirm-warning" style={{ marginTop: '12px' }}>
                      <FiAlertTriangle />
                      <span>
                        Notice: <strong>{studentCount} students</strong> are currently taking classes in this section. Freeing the room will leave this section without a designated classroom until a new room is allocated.
                      </span>
                    </div>
                  )}

                  <p className="rooms-confirm-text">
                    Are you sure you want to free room <strong>{deallocatingRoom.roomNumber}</strong> from <strong>{deallocatingRoom.assignedSection}</strong>? The room status will return to Available.
                  </p>
                </div>

                <div className="rooms-modal-footer">
                  <button
                    type="button"
                    className="rooms-cancel-btn"
                    onClick={() => setDeallocatingRoom(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rooms-submit-btn"
                    onClick={handleConfirmDeallocate}
                  >
                    <FiUnlock /> Confirm & Free Room
                  </button>
                </div>
              </div>
            </div>
          )
        })()}
      </div>
    </DashboardLayout>
  )
}

return { default: RoomsManagement }
})()

export const AcademicYearManagement = AcademicYearManagementScreen.default
export const AddCollege = AddCollegeScreen.default
export const CollegeInstitutionManagement = CollegeInstitutionManagementScreen.default
export const DepartmentManagement = DepartmentManagementScreen.default
export const RolesAndDesignations = RolesAndDesignationsScreen.default
export const SYSTEM_MODULES = RolesAndDesignationsScreen.SYSTEM_MODULES
export const PERMISSION_ACTIONS = RolesAndDesignationsScreen.PERMISSION_ACTIONS
export const fullAccessPermissions = RolesAndDesignationsScreen.fullAccessPermissions
export const readOnlyPermissions = RolesAndDesignationsScreen.readOnlyPermissions
export const hodPresetPermissions = RolesAndDesignationsScreen.hodPresetPermissions
export const facultyPresetPermissions = RolesAndDesignationsScreen.facultyPresetPermissions
export const DEFAULT_SYSTEM_ROLES = RolesAndDesignationsScreen.DEFAULT_SYSTEM_ROLES
export const STANDARD_ROLE_TEMPLATES = RolesAndDesignationsScreen.STANDARD_ROLE_TEMPLATES
export const generateCodeFromName = RolesAndDesignationsScreen.generateCodeFromName
export const validateRoleName = RolesAndDesignationsScreen.validateRoleName
export const validateRoleCode = RolesAndDesignationsScreen.validateRoleCode
export const validateDesTitle = RolesAndDesignationsScreen.validateDesTitle
export const validateDesCode = RolesAndDesignationsScreen.validateDesCode
export const DEFAULT_DESIGNATIONS = RolesAndDesignationsScreen.DEFAULT_DESIGNATIONS
export const DEFAULT_DEPARTMENTS = RolesAndDesignationsScreen.DEFAULT_DEPARTMENTS
export const DEFAULT_STAFF_MEMBERS = RolesAndDesignationsScreen.DEFAULT_STAFF_MEMBERS
export const RoomsManagement = RoomsManagementScreen.default
export default CollegeInstitutionManagement
