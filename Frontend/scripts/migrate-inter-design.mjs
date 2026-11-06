import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import postcss from 'postcss'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
if (existsSync(resolve(root, 'docs/inter-reference/CSS_MIGRATION.json'))) throw new Error('The one-time CSS migration has already been applied. Review the recorded ownership changes instead of rerunning it.')
const reference = 'C:/Users/ADMIN/Desktop/cms inter/CMS_Inter/Frontend/src/cms.css'
const source = readFileSync(reference, 'utf8')
const ruleBody = (marker, last = false) => {
  const start = last ? source.lastIndexOf(marker) : source.indexOf(marker)
  if (start < 0) throw new Error(`Missing reference rule: ${marker}`)
  const open = source.indexOf('{', start), end = source.indexOf('}', open)
  return source.slice(open + 1, end).trim()
}
const declarations = text => Object.fromEntries([...text.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(match => [match[1], match[2].trim()]))
const light = { ...declarations(ruleBody(':root:not([data-theme-palette]),')), ...declarations(ruleBody(':root[data-theme="light"]:not([data-theme-palette])')), ...declarations(ruleBody(':root[data-theme="light"]:not([data-theme-palette])', true)) }
const dark = { ...light, ...declarations(ruleBody('/* ---------------- Dark Mode Palette Tokens ---------------- */')), ...declarations(ruleBody(':root[data-theme="dark"]:not([data-theme-palette])')), ...declarations(ruleBody(':root[data-theme="dark"]:not([data-theme-palette])', true)) }
const aliases = {
 '--app-bg': 'var(--cms-bg)', '--surface': 'var(--cms-surface)', '--surface-soft': 'var(--cms-subtle)', '--surface-raised': 'var(--cms-elevated)', '--surface-alt': 'var(--cms-secondary)',
 '--text-primary': 'var(--cms-text)', '--text-secondary': 'var(--cms-text-secondary)', '--text-muted': 'var(--cms-muted)', '--border': 'var(--cms-border)', '--border-strong': 'var(--cms-border-strong)',
 '--brand': 'var(--cms-primary)', '--brand-hover': 'var(--cms-primary-hover)', '--brand-soft': 'var(--cms-primary-soft)', '--brand-dark': 'var(--cms-primary-dark)', '--brand-dark-hover': 'var(--cms-primary-active)',
 '--brand-blue': 'var(--cms-primary)', '--brand-blue-hover': 'var(--cms-primary-hover)', '--brand-navy': 'var(--cms-text)', '--brand-navy-dark': 'var(--cms-primary-dark)', '--brand-navy-light': 'var(--cms-primary-soft)', '--brand-text-light': '#fff', '--brand-text-muted': 'var(--cms-muted)',
 '--success': 'var(--cms-green)', '--warning': 'var(--cms-amber)', '--danger': 'var(--cms-red)', '--info': 'var(--cms-info)', '--error-text': 'var(--cms-red)', '--error-bg': 'var(--cms-red-soft)', '--color-success': 'var(--cms-green)', '--color-warning': 'var(--cms-amber)',
 '--erp-bg': 'var(--cms-bg)', '--erp-surface': 'var(--cms-surface)', '--erp-surface-soft': 'var(--cms-subtle)', '--erp-text': 'var(--cms-text)', '--erp-text-muted': 'var(--cms-muted)', '--erp-muted': 'var(--cms-muted)', '--erp-border': 'var(--cms-border)', '--erp-navy': 'var(--cms-text)', '--erp-blue': 'var(--cms-primary)', '--erp-blue-soft': 'var(--cms-primary-soft)',
 '--shadow-sm': 'var(--cms-shadow)', '--shadow-md': 'var(--cms-shadow-lg)', '--radius-sm': '9px', '--radius-md': '12px', '--radius-lg': '16px',
 '--table-bg': 'var(--cms-surface)', '--table-row': 'var(--cms-surface)', '--table-row-alt': 'var(--cms-secondary)', '--table-row-hover': 'var(--cms-hover)', '--table-head': 'var(--cms-table-header)', '--sidebar-background': 'var(--cms-sidebar)',
 '--sidebar-width': '218px', '--sidebar-collapsed-width': '70px', '--header-height': 'clamp(56px, 4.2vw, 64px)', '--font-family': '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
 '--page-gradient': 'linear-gradient(135deg, #dce8be 0%, #f9fbf3 45%, #d2e1b0 100%)', '--scrollbar-track': 'transparent', '--scrollbar-thumb': 'var(--cms-border-strong)', '--scrollbar-thumb-hover': 'var(--cms-primary)',
}
const print = object => Object.entries(object).map(([name, value]) => `  ${name}: ${value};`).join('\n')
const tokens = `/* Adapted from the active CMS Inter cms.css olive palette and final glass surfaces.\n   See docs/inter-reference/MODULE_COMPARISON.md. This file owns shared design tokens. */\n:root {\n  color-scheme: light;\n${print(light)}\n${print(aliases)}\n}\n:root[data-theme="dark"] {\n  color-scheme: dark;\n${print(dark)}\n  --page-gradient: linear-gradient(135deg, #0d110a 0%, #192014 45%, #0f140c 100%);\n}\n`
writeFileSync(resolve(root, 'src/styles/tokens.css'), tokens)
const canonical = new Set(Object.keys(aliases))
// Actual shell selectors are consolidated into their existing owners, not overridden later.
const shellSelector = /\.(?:sidebar(?:[-_][\w-]+)?|dashboard-layout|dashboard-header(?:[-_][\w-]+)?|global-search(?:[-_][\w-]+)?|account-menu(?:[-_][\w-]+)?|account-avatar|theme-toggle|page-content|app-breadcrumb(?:[-_][\w-]+)?)(?![\w-])/
const owners = new Set(['src/components/Sidebar.css', 'src/layouts/DashboardLayout.css'])
const colors = { '#1769c2': '--brand', '#125aa8': '--brand-hover', '#eaf3ff': '--brand-soft', '#d8e4f2': '--border' }
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(resolve(dir, entry.name)) : [resolve(dir, entry.name)])
const changes = []
for (const path of walk(resolve(root, 'src')).filter(path => path.endsWith('.css') && !path.endsWith('tokens.css'))) {
  const name = relative(root, path).replaceAll('\\', '/'), original = readFileSync(path, 'utf8'), ast = postcss.parse(original)
  let tokenDefinitions = 0, shellSelectors = 0, colorsChanged = 0
  ast.walkDecls(declaration => {
    if (canonical.has(declaration.prop)) { declaration.remove(); tokenDefinitions++; return }
    if (declaration.prop.startsWith('--')) return
    declaration.value = declaration.value.replace(/#[\da-f]{6}\b/gi, value => {
      const token = colors[value.toLowerCase()]
      if (!token) return value
      colorsChanged++; return `var(${token})`
    })
  })
  ast.walkRules(rule => {
    const selectors = postcss.list.comma(rule.selector)
    const keep = selectors.filter(selector => !shellSelector.test(selector))
    if (keep.length !== selectors.length) { shellSelectors += selectors.length - keep.length; if (keep.length) rule.selector = keep.join(', '); else rule.remove() }
  })
  ast.walkRules(rule => { if (!rule.nodes?.length) rule.remove() })
  ast.walkAtRules(rule => { if (rule.nodes && !rule.nodes.length) rule.remove() })
  if (tokenDefinitions || shellSelectors || colorsChanged) {
    // The non-shell portions of DashboardLayout (password and logout flows) remain.
    const transformed = ast.toString()
    writeFileSync(path, transformed)
    changes.push({ file: name, tokenDefinitions, shellSelectors, colorsChanged, isShellOwner: owners.has(name) })
  }
}
writeFileSync(resolve(root, 'docs/inter-reference/CSS_MIGRATION.json'), JSON.stringify(changes, null, 2) + '\n')
console.log(JSON.stringify({ files: changes.length, removedTokenDefinitions: changes.reduce((sum, file) => sum + file.tokenDefinitions, 0), removedShellSelectors: changes.reduce((sum, file) => sum + file.shellSelectors, 0) }))
