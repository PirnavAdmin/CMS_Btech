import { expect, test } from 'vitest'
import { fireEvent, render } from '@testing-library/react'
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

test('the landing page uses the uploaded platform logo in its header and footer', () => {
  const { container, unmount } = render(<MemoryRouter><LandingPage /></MemoryRouter>)
  try {
    const logos = container.querySelectorAll('.lp-brand .lp-platform-logo')
    expect(logos).toHaveLength(2)
    for (const logo of logos) expect(logo.getAttribute('src')).toMatch(/\/api\/platform-branding\/logo$/)
    fireEvent.error(logos[0])
    expect(container.querySelector('.lp-nav .lp-brand > i > svg')).toBeTruthy()
  } finally {
    unmount()
  }
})
