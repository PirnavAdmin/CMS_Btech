import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), server: { middlewareMode: true } })
try {
  const { FilterPanelModule } = await server.ssrLoadModule('/src/components/components.jsx')
  const { default: FilterPanel } = FilterPanelModule
  const search = React.createElement('label', { className: 'grm-search' },
    React.createElement('span', null, 'Search icon'),
    React.createElement('input', { placeholder: 'Search student name', defaultValue: 'Sai CSE' }))
  const filters = React.createElement('select', null, React.createElement('option', null, 'All departments'))
  for (const primary of [search, React.createElement('div', { className: 'toolbar' }, search, filters)]) {
    const html = renderToStaticMarkup(React.createElement(FilterPanel, null, primary, filters))
    assert.match(html, /filter-disclosure__search[\s\S]*<input[^>]*placeholder="Search student name"[^>]*value="Sai CSE"/)
    assert.equal((html.match(/<input/g) || []).length, 1)
    assert.doesNotMatch(html, /<select/)
    assert.match(html, /aria-expanded="false"/)
  }
  console.log('PASS: collapsed filters preserve search input, placeholder and value for direct labels and toolbar wrappers')
} finally { await server.close() }
