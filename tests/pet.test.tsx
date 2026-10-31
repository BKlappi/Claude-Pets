import { expect, mock, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const BAND = {
  plugin: 'pet',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

const pet = (name: string, xp = 0) => ({
  id: `pet-${name}`,
  name,
  species: 'crab',
  xp,
  bornAt: 0,
  pats: 0,
  turns: 0,
  mood: 'neutral',
  line: '',
  lineAt: 0,
  lastActiveAt: 0,
  failStreak: 0,
  hat: null,
  dye: null,
  hasGivenEgg: false,
})

const save = (fields: Record<string, unknown>) => ({
  pets: [pet('Pip')],
  activeId: 'pet-Pip',
  coins: 0,
  owned: [],
  eggs: 0,
  isShopOpen: false,
  patDay: '',
  patXp: 0,
  updatedAt: 0,
  ...fields,
})

function engine(on: On, store: Record<string, unknown> = {}) {
  mock.store(on, store)
  mock.clock(on, { now: 1_000 })
  on('command.register', () => ({ value: { command: 'pet' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
}

const start = { cwd: '/', surface: 'terminal', isInteractive: true } as const

test('an egg offers species, and a press hatches one', async ($, on) => {
  engine(on)
  await $.session.start(start)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /egg is wobbling/ })).toBeDefined()
    await ui.unmount()
  }

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'hatch-ghost' })
  expect(await ui.find({ type: 'Text', text: /lvl 1 ghost/ })).toBeDefined()
  await ui.unmount()
})

test('a pet from the first version moves into the new save', async ($, on) => {
  const { id, hat, dye, hasGivenEgg, ...old } = pet('Oldie', 120)
  engine(on, { pet: old })
  await $.session.start(start)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /lvl 3 crab/ })).toBeDefined()
  await ui.unmount()
})

test('a risky command that goes fine leaves it relieved', async ($, on) => {
  engine(on, { save: save({}) })
  on('tool.call', () => ({ result: {} }))
  await $.session.start(start)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await $.tool.call({ tool: 'Bash', command: 'rm -rf build' })
  expect(await ui.find({ type: 'Text', text: /phew|survived/ })).toBeDefined()
  await ui.unmount()
})

test('pats give xp up to 20 a day', async ($, on) => {
  engine(on, { save: save({}) })
  await $.session.start(start)

  const first = await $.command.run({ command: 'pet', args: 'pat' })
  expect(first.text).toBe('You pat Pip. +2 xp (2/20 today)')
  for (let i = 0; i < 9; i++) await $.command.run({ command: 'pet', args: 'pat' })
  const capped = await $.command.run({ command: 'pet', args: 'pat' })
  expect(capped.text).toBe('You pat Pip. No more pat xp today.')
})

test('the shop stays shut before level 4', async ($, on) => {
  engine(on, { save: save({ coins: 99 }) })
  await $.session.start(start)

  const out = await $.command.run({ command: 'pet', args: 'buy party' })
  expect(out.text).toBe('The shop opens when a pet reaches level 4.')
})

test('a bought hat is worn above the pet', async ($, on) => {
  engine(on, { save: save({ coins: 20, isShopOpen: true }) })
  await $.session.start(start)

  expect((await $.command.run({ command: 'pet', args: 'buy crown' })).text).toBe(
    'The crown costs 60 coins, you have 20.',
  )
  expect((await $.command.run({ command: 'pet', args: 'buy party' })).text).toBe('Bought the party hat.')

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '▟█▙' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /5c/ })).toBeDefined()
  await ui.unmount()
})

test('/pet-choose switches pets and hatches eggs', async ($, on) => {
  engine(on, { save: save({ pets: [pet('Pip', 600), pet('Bix')], eggs: 1 }) })
  await $.session.start(start)

  expect((await $.command.run({ command: 'pet-choose', args: 'bix' })).text).toBe('Bix is with you now.')
  const hatched = await $.command.run({ command: 'pet-choose', args: 'hatch' })
  expect(hatched.text).toMatch(/hatched!$/)
  expect((await $.command.run({ command: 'pet-choose', args: 'hatch' })).text).toBe(
    'No egg yet. A pet finds one at level 5.',
  )
})

test('crossing into a new title evolves it', async ($, on) => {
  engine(on, { save: save({ pets: [pet('Pip', 98)] }) })
  await $.session.start(start)

  await $.command.run({ command: 'pet', args: 'pat' })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /evolved into a sprite/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'sprite' })).toBeDefined()
  await ui.unmount()
})

test('a legend wears its big art and a starred name', async ($, on) => {
  engine(on, { save: save({ pets: [pet('Pip', 5000)] }) })
  await $.session.start(start)

  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '* Pip *' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /█/ })).toBeDefined()
  await ui.unmount()
})

test('/pet name renames it', async ($, on) => {
  engine(on, { save: save({}) })
  await $.session.start(start)

  const out = await $.command.run({ command: 'pet', args: 'name Gizmo' })
  expect(out.text).toBe('Your pet is now called Gizmo.')
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: /Gizmo/ })).toBeDefined()
  await ui.unmount()
})
