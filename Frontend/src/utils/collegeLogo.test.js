import test from 'node:test'
import assert from 'node:assert/strict'
import { collegeLogoValue, resolveCollegeLogo } from './collegeLogo.js'

test('empty logo does not hide populated API aliases', () => {
  assert.equal(collegeLogoValue({ logo: '', logoUrl: '/uploads/logo.png' }), '/uploads/logo.png')
  assert.equal(collegeLogoValue({ logo: 'null', LogoPath: '/images/logo.png' }), '/images/logo.png')
})

test('old backend tunnel images use the current backend or dev proxy', () => {
  const old = 'https://old.ngrok-free.dev/uploads/logo.png?v=2'
  assert.equal(resolveCollegeLogo(old), '/uploads/logo.png?v=2')
  assert.equal(resolveCollegeLogo(old, 'https://new.ngrok-free.dev'), 'https://new.ngrok-free.dev/uploads/logo.png?v=2')
  assert.equal(resolveCollegeLogo('uploads\\logo.png'), '/uploads/logo.png')
})

test('external and local preview images retain their source', () => {
  for (const url of ['https://cdn.example.com/logo.png', 'data:image/png;base64,aGVsbG8=', 'blob:http://localhost/test']) assert.equal(resolveCollegeLogo(url), url)
  assert.equal(resolveCollegeLogo('javascript:alert(1)'), '')
  assert.equal(resolveCollegeLogo(''), '')
})
