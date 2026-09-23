import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDirectory, '..');

const fragments = [
  'Database/Semester/SemesterCourseIntegration.sql',
  'Database/Sections/SectionUpdateStoredProcedure.sql',
  'Database/Sql/Stored Procedures/Sections/sp_section_get_all.sql',
  'Database/Sql/Stored Procedures/Sections/sp_section_get_by_id.sql',
  'Database/Sql/Stored Procedures/Sections/sp_section_search.sql',
  'Database/Sql/Stored Procedures/Sections/sp_section_update_details.sql',
  'Database/StudentIntegration/StudentIntegrationOperations.sql',
  'Database/StudentProfile/StudentProfileUpdatesTable.sql',
  'Database/StudentProfile/StudentProfileFullUpdateStoredProcedure.sql',
  'Database/StudentManagement/StudentManagementStoredProcedures.sql',
  'Database/StudentProfile/StudentPersonalInformationStoredProcedures.sql',
  'Database/Sql/Stored Procedures/StudentProfileMain/sp_student_profile_get_all.sql',
  'Database/Sql/Stored Procedures/StudentProfileMain/sp_student_profile_get_preview.sql',
  'Database/Sql/Stored Procedures/StudentPromotionEligible/sp_student_promotion_get_eligible.sql',
  'Database/StudentPromotion/StudentPromotionAtomicStoredProcedure.sql',
  'Database/StudentPromotion/StudentPromotionFrontendContractStoredProcedure.sql',
  'Database/Sql/Stored Procedures/StudentPromotionHistory/sp_student_promotion_get_history.sql'
];

const header = `-- =============================================================\n` +
  `-- CMS BTECH BACKEND INTEGRATION UPDATE\n` +
  `-- Generated: 2026-09-03\n` +
  `-- Target: MySQL 8.x / cms_btech\n` +
  `--\n` +
  `-- Run after importing the supplied cms_btech database dump.\n` +
  `-- Existing APIs, tables and data are preserved. Procedures in this\n` +
  `-- file are replaced with their integration-ready definitions.\n` +
  `-- =============================================================\n\n` +
  `USE \`cms_btech\`;\n\n`;

const body = fragments.map((fragment) => {
  const path = resolve(root, fragment);
  const sql = readFileSync(path, 'utf8').replace(/^\uFEFF/, '').trim();
  return `\n-- BEGIN ${fragment}\n${sql}\n-- END ${fragment}\n`;
}).join('\n');

const output = resolve(
  root,
  'Database/IntegrationUpdates/CMS_BTECH_INTEGRATION_UPDATE_20260903.sql'
);

writeFileSync(output, `${header}${body}\n`, 'utf8');
console.log(output);
