import { expect, test } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { LandingPage, Login, Register, ActivateAccount, Unauthorized } from '../pages/Pages.jsx'

test.each([
  ['landing', LandingPage],
  ['login', Login],
  ['registration', Register],
  ['activation', ActivateAccount],
  ['unauthorized', Unauthorized],
])('the %s page imports and renders without crashing', (_name, Page) => {
  const html = renderToStaticMarkup(<MemoryRouter><Page /></MemoryRouter>)
  expect(html).toMatch(/<h[12][\s>]/)
})
