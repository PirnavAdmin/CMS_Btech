export function buildProgramSemesterCards(program, scopes, semesterNumber) {
  const expectedCount = program === 'B.Tech' ? 8 : 6
  const configured = new Map()
  for (const scope of scopes) {
    const number = semesterNumber(scope.semester)
    if (number > 0 && number <= expectedCount && !configured.has(number)) {
      configured.set(number, scope)
    }
  }
  return Array.from({ length: expectedCount }, (_, index) => {
    const number = index + 1
    return { number, year: Math.ceil(number / 2), scope: configured.get(number) ?? null }
  })
}
