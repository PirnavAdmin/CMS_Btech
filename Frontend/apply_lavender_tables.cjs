const fs = require('fs');

// 1. Update erp-theme.css
let erpContent = fs.readFileSync('src/styles/erp-theme.css', 'utf8');

// Update line 108 list of modules
erpContent = erpContent.replace(
  /\.page-content :is\(\.college-management,\.add-college,\.department-management,\.ay,\.cm-page,\.semester-management,\.section-management,\.profile-page,\.settings-page\)/g,
  '.page-content :is(.college-management,.add-college,.department-management,.ay,.cm-page,.semester-management,.section-management,.profile-page,.settings-page,.sm-screen,.em-screen,.cm-screen,.subject-management,.elective-management,.credits-management)'
);

// Update dark mode table headers in erp-theme.css
erpContent = erpContent.replace(
  /:root\[data-theme="dark"\] \.page-content :is\(\.cm-table th,\.department-table-wrap th,\.semester-table th,\.section-table th\)\{[^}]*\}/,
  `:root[data-theme="dark"] .page-content :is(.cm-table th,.department-table-wrap th,.semester-table th,.section-table th,.sm-table th,.em-table th,table th,thead th){background:#8782BC !important;color:#FFFFFF !important;border-bottom:2px solid #756FB2 !important}`
);

fs.writeFileSync('src/styles/erp-theme.css', erpContent, 'utf8');
console.log('erp-theme.css updated');

// 2. Update dark-mode.css
let darkContent = fs.readFileSync('src/styles/dark-mode.css', 'utf8');

// Update thead th styling in dark mode
darkContent = darkContent.replace(
  /:root\[data-theme="dark"\] \.page-content thead :is\(th, td\) \{[\s\S]*?\}/,
  `:root[data-theme="dark"] .page-content thead :is(th, td),
:root[data-theme="dark"] .page-content :is(table, .cm-table, .course-advanced-table, .branch-table, .department-table-wrap table, .semester-table, .section-table, .ay .table table, .sa-table-wrap table, .sm-table, .em-table) thead th,
:root[data-theme="dark"] .page-content :is(table, .cm-table, .course-advanced-table, .branch-table, .department-table-wrap table, .semester-table, .section-table, .ay .table table, .sa-table-wrap table, .sm-table, .em-table) th {
  color: #FFFFFF !important;
  background: #8782BC !important;
  border-bottom: 2px solid #756FB2 !important;
}`
);

// Add subject, elective, credits classes to dark-mode.css
if (!darkContent.includes('.sm-screen')) {
  darkContent += `\n
/* Subject, Elective, Credit Management Dark Theme Support */
:root[data-theme="dark"] :is(.sm-screen, .em-screen, .cm-screen) {
  color: var(--text-primary);
}
:root[data-theme="dark"] :is(.sm-kpi-card, .em-kpi-card, .cm-kpi-card, .sm-card, .em-card, .cm-card, .sm-modal, .em-modal, .cm-modal, .sm-preview, .sm-details-section > div) {
  background: var(--surface) !important;
  border-color: var(--border) !important;
  color: var(--text-primary) !important;
}
:root[data-theme="dark"] :is(.sm-card-header, .em-toolbar, .cm-card-header, .sm-modal-header, .sm-modal-footer, .sm-filter-grid, .em-tabs, .cm-tabs) {
  background: var(--surface-soft) !important;
  border-color: var(--border) !important;
  color: var(--text-primary) !important;
}
:root[data-theme="dark"] :is(.sm-search-wrap, .em-search, .sm-select, .em-filters select, .sm-field input, .sm-field select, .sm-field textarea, .sm-active-year-field) {
  background: var(--surface) !important;
  border-color: var(--border) !important;
  color: var(--text-primary) !important;
}
:root[data-theme="dark"] :is(.sm-btn--primary, .em-header-actions .sm-btn--primary) {
  background: #8782BC !important;
  color: #FFFFFF !important;
  border-color: #8782BC !important;
}
:root[data-theme="dark"] :is(.sm-btn--primary, .em-header-actions .sm-btn--primary):hover {
  background: #756FB2 !important;
  border-color: #756FB2 !important;
}
:root[data-theme="dark"] :is(.sm-btn--secondary, .sm-icon-btn, .em-tab-btn:not(.active), .cm-tab-btn:not(.active)) {
  background: var(--surface-raised) !important;
  color: var(--text-primary) !important;
  border-color: var(--border) !important;
}
:root[data-theme="dark"] :is(.em-tab-btn.active, .cm-tab-btn.active) {
  color: #8782BC !important;
  border-bottom-color: #8782BC !important;
}
:root[data-theme="dark"] :is(.sm-table td, .em-table td, .cm-table td) {
  background: var(--surface) !important;
  color: var(--text-secondary) !important;
  border-color: var(--border) !important;
}
:root[data-theme="dark"] :is(.sm-table tr:hover td, .em-table tr:hover td, .cm-table tr:hover td) {
  background: var(--surface-soft) !important;
}
:root[data-theme="dark"] :is(.sm-code-badge, .cm-cat-code) {
  background: var(--surface-soft) !important;
  color: var(--text-primary) !important;
  border-color: var(--border) !important;
}
:root[data-theme="dark"] :is(.sm-kpi-content strong, .em-kpi-content strong, .cm-kpi-card strong, .cm-cat-name, .cm-cat-credits, .sm-directory-title h2, .sm-header h1, .em-header h1, .cm-header h1) {
  color: var(--text-primary) !important;
}
:root[data-theme="dark"] :is(.sm-kpi-content small, .em-kpi-content small, .cm-kpi-card small, .sm-directory-title p, .sm-header p, .em-header p, .cm-header p, .sm-details-section span) {
  color: var(--text-muted) !important;
}
`;
}

fs.writeFileSync('src/styles/dark-mode.css', darkContent, 'utf8');
console.log('dark-mode.css updated');
