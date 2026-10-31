import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Mood, Pet, Save, Species } from '../types'

import { EGG_ART, HAT_ART, SPRITES, draw, widthOf } from './art'
import type { Kind } from './art'

const EMPTY: Save = {
  pets: [],
  activeId: null,
  coins: 0,
  owned: [],
  eggs: 1,
  isShopOpen: false,
  patDay: '',
  patXp: 0,
  updatedAt: 0,
}

// Change the tag when Save's fields change: it declines what an earlier
// version stored in the session, which outlives a reload.
const saveAtom = atom({ plugin: 'pet', key: 'save' } as const, EMPTY, { shape: 'save-2' })
const isHidden = atom({ plugin: 'pet', key: 'isHidden' } as const, false)
const tick = atom({ plugin: 'pet', key: 'tick' } as const, 0)

const SHOP = 'pet-shop'
const CHOOSE = 'pet-choose'

const SPECIES: readonly Species[] = ['blob', 'moth', 'ghost', 'crab', 'sprout']

// Each title a pet grows into, from the level it starts at; the art and the
// effects get bigger with each one.
const STAGES = [
  { level: 1, title: 'hatchling', color: 'subtle' },
  { level: 3, title: 'sprite', color: 'suggestion' },
  { level: 5, title: 'companion', color: 'planMode' },
  { level: 10, title: 'legend', color: 'claude' },
  { level: 15, title: 'mythic', color: 'claude' },
] as const

const AURA = [String.raw`' . * . '`, String.raw`. * ' * .`]
const SPARKS = ['*', '.', ' ', '+', ' ', '.']
const RAINBOW = ['claude', 'warning', 'success', 'suggestion', 'merged']
const EVOLVE_MS = 10 * 1000

const FACE: Record<Mood, string> = {
  neutral: 'o.o',
  happy: '^.^',
  proud: '*v*',
  worried: 'o_O',
  scared: 'O_O',
  sleepy: '-.-',
}

const COLOR: Record<Mood, string> = {
  neutral: 'text',
  happy: 'success',
  proud: 'claude',
  worried: 'warning',
  scared: 'error',
  sleepy: 'subtle',
}

// The color a pet wears while calm, and the color of its details.
const SPECIES_COLOR: Record<Species, string> = {
  blob: 'claude',
  moth: 'merged',
  ghost: 'text',
  crab: 'error',
  sprout: 'success',
}
const ACCENT: Record<Species, string> = {
  blob: 'suggestion',
  moth: 'warning',
  ghost: 'suggestion',
  crab: 'warning',
  sprout: 'merged',
}
const MARK: Record<Mood, string> = {
  neutral: '',
  happy: ' ♪',
  proud: ' ★',
  worried: ' ?',
  scared: ' !',
  sleepy: '',
}

type Item = { id: string; name: string; kind: 'hat' | 'dye' | 'snack'; cost: number; look: string }

// A hat's look is the color its pixels are drawn in; a dye's is the color
// the pet wears while calm.
const ITEMS: readonly Item[] = [
  { id: 'party', name: 'party hat', kind: 'hat', cost: 15, look: 'merged' },
  { id: 'tophat', name: 'top hat', kind: 'hat', cost: 30, look: 'inactive' },
  { id: 'halo', name: 'halo', kind: 'hat', cost: 40, look: 'warning' },
  { id: 'wizard', name: 'wizard hat', kind: 'hat', cost: 50, look: 'suggestion' },
  { id: 'crown', name: 'crown', kind: 'hat', cost: 60, look: 'warning' },
  { id: 'ember', name: 'ember dye', kind: 'dye', cost: 20, look: 'claude' },
  { id: 'ocean', name: 'ocean dye', kind: 'dye', cost: 20, look: 'suggestion' },
  { id: 'mint', name: 'mint dye', kind: 'dye', cost: 20, look: 'planMode' },
  { id: 'plum', name: 'plum dye', kind: 'dye', cost: 20, look: 'merged' },
  { id: 'snack', name: 'snack (+10 xp)', kind: 'snack', cost: 5, look: '' },
]

const NAMES = ['Pip', 'Mochi', 'Bix', 'Nim', 'Tofu', 'Ziggy', 'Pebble', 'Moss', 'Quill', 'Dot']

const LINES = {
  hatch: ["hi! i'm {name}.", '*blinks at the terminal*', 'is this... the codebase?'],
  pat: ['*happy wiggle*', 'hehe', 'again! again!', '*purrs in ASCII*'],
  turn: ['nice work.', 'that went well.', '*takes notes*', 'ship it?', 'we make a good team.'],
  bigTurn: ['phew, that was a lot.', '{n} tool calls! busy busy.'],
  fail: ['uh oh.', "that didn't work...", 'hmm, an error.', "we'll figure it out."],
  failStreak: ['{n} fails in a row. deep breaths.', 'maybe try another angle?'],
  tests: ['tests pass!!', 'green! green!', '*victory dance*'],
  danger: ['eek! careful with that!', 'are you SURE about this?', '*hides behind the prompt*'],
  survived: ['...phew. still here.', 'ok. we survived.'],
  aborted: ['oh, stopped?', 'ok, changing plans.'],
  levelUp: ['I grew! level {n}!', 'level {n}! look at me!'],
  wake: ["*yawn* oh, you're back!", "mm? we're coding again?"],
  sleep: ['zzz', '*curls up*'],
  snack: ['nom nom nom', '*crunch*', 'tasty!'],
} as const

const DANGER =
  /\brm\s+-[a-z]*(rf|fr)|\bgit\s+push\b.*(--force|\s-f\b)|\bgit\s+reset\s+--hard|\bgit\s+clean\s+-[a-z]*f|\bdrop\s+(table|database)\b|Remove-Item\b.*-Recurse/i
const TESTS =
  /\b(npm|pnpm|yarn|bun)\s+(run\s+)?test\b|\bcargo\s+(test|nextest)\b|\bpytest\b|\bgo\s+test\b|\b(jest|vitest)\b|\bdotnet\s+test\b/i

const SLEEP_AFTER_MS = 10 * 60 * 1000
const LINE_TTL_MS = 60 * 1000
const PAT_XP = 2
const PAT_CAP = 20
const SHOP_LEVEL = 4
const EGG_LEVEL = 5

// Total xp each level starts at; past level 10, every 2500 more.
const LEVELS = [0, 30, 100, 250, 500, 900, 1500, 2300, 3400, 5000]
const PAST_TOP = 2500
const TOP = LEVELS[LEVELS.length - 1] as number

const levelOf = (xp: number) =>
  xp >= TOP
    ? LEVELS.length + Math.floor((xp - TOP) / PAST_TOP)
    : LEVELS.filter(floor => xp >= floor).length

const xpFor = (level: number) =>
  level <= LEVELS.length ? (LEVELS[level - 1] ?? 0) : TOP + (level - LEVELS.length) * PAST_TOP

const stageOf = (level: number) => STAGES.filter(stage => level >= stage.level).length - 1

const titleOf = (level: number) => STAGES[stageOf(level)]?.title ?? 'hatchling'


const today = (now: number) => new Date(now).toISOString().slice(0, 10)

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)] as T

const say = (pet: Pet, kind: keyof typeof LINES, now: number, n = 0): Pet => ({
  ...pet,
  line: pick(LINES[kind]).replace('{name}', pet.name).replace('{n}', String(n)),
  lineAt: now,
})

const activeOf = (save: Save): Pet | undefined =>
  save.pets.find(pet => pet.id === save.activeId) ?? save.pets[0]

const withActive = (save: Save, fn: (pet: Pet) => Pet): Save => {
  const active = activeOf(save)
  if (active === undefined) return save
  return { ...save, pets: save.pets.map(pet => (pet.id === active.id ? fn(pet) : pet)) }
}

const newPet = (save: Save, species: Species, now: number): Pet => {
  const taken = new Set(save.pets.map(pet => pet.name))
  const free = NAMES.filter(name => !taken.has(name))
  const pet: Pet = {
    id: `pet-${now}`,
    name: pick(free.length > 0 ? free : NAMES),
    species,
    xp: 0,
    bornAt: now,
    pats: 0,
    turns: 0,
    mood: 'happy',
    line: '',
    lineAt: now,
    lastActiveAt: now,
    failStreak: 0,
    hat: null,
    dye: null,
    hasGivenEgg: false,
  }
  return say(pet, 'hatch', now)
}

const isSave = (value: unknown): value is Save =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as Save).pets) &&
  typeof (value as Save).coins === 'number'

type OldPet = Omit<Pet, 'id' | 'hat' | 'dye' | 'hasGivenEgg'>

const isOldPet = (value: unknown): value is OldPet =>
  typeof value === 'object' &&
  value !== null &&
  SPECIES.includes((value as OldPet).species) &&
  typeof (value as OldPet).xp === 'number'

const commandOf = (e: { tool: string }): string => {
  const command = (e as { command?: unknown }).command
  return typeof command === 'string' ? command : ''
}

// Reads the save from the store, where every session and project keeps the
// same one; the first version's single pet moves in on first read.
async function load($: EngineInterface): Promise<Save> {
  const stored = await $.store.get('save')
  if (isSave(stored)) return stored

  const old = await $.store.get('pet')
  if (!isOldPet(old)) return EMPTY
  const pet: Pet = {
    ...old,
    id: `pet-${old.bornAt}`,
    hat: null,
    dye: null,
    hasGivenEgg: levelOf(old.xp) >= EGG_LEVEL,
  }
  const moved: Save = {
    ...EMPTY,
    pets: [pet],
    activeId: pet.id,
    eggs: 0,
    isShopOpen: levelOf(old.xp) >= SHOP_LEVEL,
  }
  await $.store.set('save', moved)
  await $.store.delete('pet')
  return moved
}

// Applies one change to the freshest save, so two sessions open at once
// don't overwrite each other, then hands out level ups, the shop and eggs.
async function commit($: EngineInterface, fn: (save: Save, now: number) => Save): Promise<Save> {
  const now = await $.clock.now()
  const before = await load($)
  let after = fn(before, now)

  const was = activeOf(before)
  const pet = activeOf(after)
  const level = pet === undefined ? 0 : levelOf(pet.xp)
  const toasts: string[] = []

  if (pet !== undefined && was?.id === pet.id && level > levelOf(was.xp)) {
    const title = titleOf(level)
    if (stageOf(level) > stageOf(levelOf(was.xp))) {
      after = withActive(after, p => ({
        ...p,
        mood: 'happy',
        line: `*glows* ...I evolved into a ${title}!`,
        lineAt: now,
        evolvedAt: now,
      }))
      toasts.push(`${pet.name} evolved into a ${title}! (level ${level})`)
    } else {
      after = withActive(after, p => say({ ...p, mood: 'happy' }, 'levelUp', now, level))
      toasts.push(`${pet.name} grew to level ${level}!`)
    }
  }
  if (!after.isShopOpen && level >= SHOP_LEVEL) {
    after = { ...after, isShopOpen: true }
    toasts.push('The pet shop is open! /pet shop')
  }
  if (pet !== undefined && !pet.hasGivenEgg && level >= EGG_LEVEL) {
    after = withActive({ ...after, eggs: after.eggs + 1 }, p => ({ ...p, hasGivenEgg: true }))
    toasts.push(`${pet.name} found an egg! /pet-choose to hatch it`)
  }

  const saved = { ...after, updatedAt: now }
  await $.store.set('save', saved)
  await update($, saveAtom, () => saved)
  for (const text of toasts) $.ui.toast(text)
  return saved
}

async function hatchFirst($: EngineInterface, species: Species): Promise<string> {
  let text = ''
  await commit($, (save, now) => {
    if (save.pets.length > 0) {
      text = 'You already have a pet. Eggs from level 5 hatch with /pet-choose.'
      return save
    }
    const pet = newPet(save, species, now)
    text = `${pet.name} the ${species} hatched!`
    return { ...save, pets: [pet], activeId: pet.id, eggs: Math.max(0, save.eggs - 1) }
  })
  return text
}

// A later egg holds a species the person has not raised yet, when one is left.
async function hatchEgg($: EngineInterface): Promise<string> {
  let text = ''
  await commit($, (save, now) => {
    if (save.eggs < 1) {
      text = `No egg yet. A pet finds one at level ${EGG_LEVEL}.`
      return save
    }
    const unseen = SPECIES.filter(species => !save.pets.some(pet => pet.species === species))
    const pet = newPet(save, pick(unseen.length > 0 ? unseen : SPECIES), now)
    text = `The egg cracks... ${pet.name} the ${pet.species} hatched!`
    return { ...save, pets: [...save.pets, pet], activeId: pet.id, eggs: save.eggs - 1 }
  })
  return text
}

async function choose($: EngineInterface, id: string): Promise<string> {
  let text = ''
  await commit($, (save, now) => {
    const pet = save.pets.find(p => p.id === id)
    if (pet === undefined) {
      text = 'No such pet.'
      return save
    }
    text = `${pet.name} is with you now.`
    return withActive({ ...save, activeId: id }, p => ({ ...p, lastActiveAt: now }))
  })
  return text
}

const wearOn = (pet: Pet, item: Item): Pet =>
  item.kind === 'hat'
    ? { ...pet, hat: pet.hat === item.id ? null : item.id }
    : item.kind === 'dye'
      ? { ...pet, dye: pet.dye === item.id ? null : item.id }
      : pet

async function buy($: EngineInterface, id: string): Promise<string> {
  const item = ITEMS.find(one => one.id === id)
  if (item === undefined) return `No item "${id}". Items: ${ITEMS.map(one => one.id).join(', ')}`
  let text = ''
  await commit($, (save, now) => {
    if (!save.isShopOpen) {
      text = `The shop opens when a pet reaches level ${SHOP_LEVEL}.`
      return save
    }
    if (item.kind !== 'snack' && save.owned.includes(id)) {
      text = `You already own the ${item.name}.`
      return save
    }
    if (save.coins < item.cost) {
      text = `The ${item.name} costs ${item.cost} coins, you have ${save.coins}.`
      return save
    }
    const paid = { ...save, coins: save.coins - item.cost }
    if (item.kind === 'snack') {
      text = 'Snack eaten. +10 xp'
      return withActive(paid, p => say({ ...p, xp: p.xp + 10, mood: 'happy' }, 'snack', now))
    }
    text = `Bought the ${item.name}.`
    return withActive({ ...paid, owned: [...paid.owned, id] }, p => wearOn(p, item))
  })
  return text
}

async function wear($: EngineInterface, id: string): Promise<string> {
  const item = ITEMS.find(one => one.id === id && one.kind !== 'snack')
  if (item === undefined) return `Nothing to wear called "${id}".`
  let text = ''
  await commit($, save => {
    if (!save.owned.includes(id)) {
      text = `You don't own the ${item.name} yet.`
      return save
    }
    text = `Changed ${activeOf(save)?.name ?? 'your pet'}'s look.`
    return withActive(save, p => wearOn(p, item))
  })
  return text
}

async function setHidden($: EngineInterface, value: boolean) {
  await update($, isHidden, () => value)
  await $.store.set('isHidden', value)
}

let isWorking = false
let ticks = 0

// Blinks, picks up what other sessions changed, falls asleep when left
// alone, and lets old lines fade.
async function onTick($: EngineInterface) {
  ticks += 1
  await update($, tick, () => ticks)

  if (ticks % 4 === 0) {
    const stored = await $.store.get('save')
    const held = await read($, saveAtom)
    if (isSave(stored) && stored.updatedAt > held.updatedAt) {
      await update($, saveAtom, () => stored)
    }
  }

  const pet = activeOf(await read($, saveAtom))
  if (pet === undefined) return
  const now = await $.clock.now()

  if (!isWorking && pet.mood !== 'sleepy' && now - pet.lastActiveAt > SLEEP_AFTER_MS) {
    await commit($, (save, at) => withActive(save, p => say({ ...p, mood: 'sleepy' }, 'sleep', at)))
  } else if (pet.line !== '' && now - pet.lineAt > LINE_TTL_MS && pet.mood !== 'sleepy') {
    await commit($, save => withActive(save, p => ({ ...p, line: '', mood: 'neutral' })))
  }
}

export const register: Register = on => {
  let tools = 0
  let hasSpokenThisTurn = false

  on('session.start', async ($, e, next) => {
    const save = await load($)
    await update($, saveAtom, () => save)
    const hidden = await $.store.get('isHidden')
    await update($, isHidden, () => hidden === true)

    await $.command.register({
      name: 'pet',
      description: 'Your companion: pat it, name it, shop, or hide it',
      argumentHint: '[pat | name <name> | stats | shop | buy <item> | wear <item> | hide | show | release]',
      immediate: true,
    })
    await $.command.register({
      name: 'pet-choose',
      description: 'Pick which of your pets is with you, or hatch an egg',
      argumentHint: '[<name> | hatch]',
      immediate: true,
    })

    $.clock.every(2500, () => {
      void onTick($)
    })

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    // One coin for each prompt the person sends; slash commands earn none.
    const isPrompt = e.command === undefined && e.isMeta !== true
    if (isPrompt) isWorking = true
    await commit($, (save, now) =>
      withActive(isPrompt ? { ...save, coins: save.coins + 1 } : save, p =>
        p.mood === 'sleepy'
          ? say({ ...p, mood: 'happy', lastActiveAt: now }, 'wake', now)
          : { ...p, lastActiveAt: now },
      ),
    )
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    tools += 1
    const command = commandOf(e)
    const isDanger = command !== '' && DANGER.test(command)
    if (isDanger) {
      hasSpokenThisTurn = true
      await commit($, (save, now) => withActive(save, p => say({ ...p, mood: 'scared' }, 'danger', now)))
    }

    const ran = await next(e)

    if (ran.isError === true) {
      hasSpokenThisTurn = true
      await commit($, (save, now) =>
        withActive(save, p => {
          const failStreak = p.failStreak + 1
          const worried = { ...p, mood: 'worried' as const, failStreak, lastActiveAt: now }
          return failStreak >= 3 ? say(worried, 'failStreak', now, failStreak) : say(worried, 'fail', now)
        }),
      )
    } else if (ran.deny === undefined) {
      const isTest = command !== '' && TESTS.test(command)
      if (isTest) hasSpokenThisTurn = true
      await commit($, (save, now) =>
        withActive(save, p => {
          const calm = { ...p, failStreak: 0, lastActiveAt: now }
          if (isTest) return say({ ...calm, mood: 'proud' }, 'tests', now)
          if (isDanger) return say({ ...calm, mood: 'neutral' }, 'survived', now)
          return calm
        }),
      )
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) return next(e)

    const turnTools = tools
    const hasSpoken = hasSpokenThisTurn
    isWorking = false
    tools = 0
    hasSpokenThisTurn = false

    await commit($, (save, now) =>
      withActive(save, p => {
        const xp = e.isAborted ? p.xp : p.xp + 5 + Math.min(turnTools, 10)
        const grown = { ...p, xp, turns: p.turns + 1, lastActiveAt: now }
        if (e.isAborted) return say({ ...grown, mood: 'neutral' }, 'aborted', now)
        if (hasSpoken) return grown
        if (turnTools >= 15) return say({ ...grown, mood: 'happy' }, 'bigTurn', now, turnTools)
        return Math.random() < 0.5 ? say({ ...grown, mood: 'happy' }, 'turn', now) : grown
      }),
    )

    return next(e)
  })

  on('command.run', { command: 'pet' }, async ($, e) => {
    const [verb = 'pat', ...rest] = e.args.trim().split(/\s+/).filter(Boolean)
    const arg = rest.join(' ')
    const save = await load($)
    const pet = activeOf(save)

    if (verb === 'hatch') {
      const species = SPECIES.find(s => s === arg.toLowerCase())
      if (species === undefined) return { text: `Pick a species: ${SPECIES.join(', ')}` }
      return { text: await hatchFirst($, species) }
    }
    if (verb === 'hide') {
      await setHidden($, true)
      return { text: 'Pet hidden. /pet show brings it back.' }
    }
    if (verb === 'show') {
      await setHidden($, false)
      return { text: 'Pet shown.' }
    }
    if (verb === 'shop') {
      if (!save.isShopOpen) {
        return { text: `The shop opens when a pet reaches level ${SHOP_LEVEL}. You have ${save.coins} coins saved.` }
      }
      await $.ui.open({ id: SHOP, title: 'Pet shop', focus: true, closeOnEscape: true })
      return { text: 'Pet shop opened.' }
    }
    if (verb === 'buy') return { text: await buy($, arg.toLowerCase()) }
    if (verb === 'wear') return { text: await wear($, arg.toLowerCase()) }
    if (pet === undefined) {
      return { text: `No pet yet. /pet hatch <${SPECIES.join('|')}>` }
    }
    if (verb === 'pat') {
      let gained = 0
      const after = await commit($, (current, now) => {
        const day = today(now)
        const used = current.patDay === day ? current.patXp : 0
        gained = Math.max(0, Math.min(PAT_XP, PAT_CAP - used))
        return withActive({ ...current, patDay: day, patXp: used + gained }, p =>
          say({ ...p, pats: p.pats + 1, xp: p.xp + gained, mood: 'happy', lastActiveAt: now }, 'pat', now),
        )
      })
      return {
        text:
          gained > 0
            ? `You pat ${pet.name}. +${gained} xp (${after.patXp}/${PAT_CAP} today)`
            : `You pat ${pet.name}. No more pat xp today.`,
      }
    }
    if (verb === 'name') {
      const name = arg.slice(0, 20)
      if (name === '') return { text: 'Usage: /pet name <name>' }
      await commit($, (current, now) =>
        withActive(current, p => ({ ...p, name, line: `${name}? i love it.`, lineAt: now, mood: 'happy' })),
      )
      return { text: `Your pet is now called ${name}.` }
    }
    if (verb === 'stats') {
      const level = levelOf(pet.xp)
      const now = await $.clock.now()
      const days = Math.floor((now - pet.bornAt) / 86_400_000)
      const patXp = save.patDay === today(now) ? save.patXp : 0
      return {
        text: [
          `${pet.name} the ${pet.species}, level ${level} ${titleOf(level)}`,
          `${pet.xp} xp, level ${level + 1} at ${xpFor(level + 1)}`,
          `${pet.turns} turns together, ${pet.pats} pats, ${days} day${days === 1 ? '' : 's'} old`,
          `${save.coins} coins, pat xp today ${patXp}/${PAT_CAP}, ${save.pets.length} pet${save.pets.length === 1 ? '' : 's'}, ${save.eggs} egg${save.eggs === 1 ? '' : 's'}`,
          save.isShopOpen ? 'Shop: open (/pet shop)' : `Shop: opens at level ${SHOP_LEVEL}`,
        ].join('\n'),
      }
    }
    if (verb === 'release') {
      if (arg !== 'yes') {
        return { text: `Really let ${pet.name} go? Its xp is lost. Type /pet release yes` }
      }
      await commit($, current => {
        const pets = current.pets.filter(p => p.id !== pet.id)
        return {
          ...current,
          pets,
          activeId: pets[0]?.id ?? null,
          eggs: pets.length === 0 ? Math.max(1, current.eggs) : current.eggs,
        }
      })
      return { text: `${pet.name} waves goodbye.` }
    }
    return {
      text: 'Usage: /pet [pat | name <name> | stats | shop | buy <item> | wear <item> | hide | show | release]',
    }
  })

  on('command.run', { command: 'pet-choose' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === 'hatch') return { text: await hatchEgg($) }
    if (arg !== '') {
      const save = await load($)
      const pet = save.pets.find(p => p.name.toLowerCase() === arg.toLowerCase())
      if (pet === undefined) {
        return { text: `No pet called ${arg}. Yours: ${save.pets.map(p => p.name).join(', ') || 'none'}` }
      }
      return { text: await choose($, pet.id) }
    }
    await $.ui.open({ id: CHOOSE, title: 'Your pets', focus: true, closeOnEscape: true })
    return { text: 'Pet picker opened.' }
  })

  on('ui.render', { component: 'Pane', requestId: SHOP }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const save = await read($, saveAtom)
    const pet = activeOf(save)

    if (!save.isShopOpen) {
      return <Text dimColor>The shop opens when a pet reaches level {SHOP_LEVEL}.</Text>
    }

    return (
      <Box flexDirection="column">
        <Text>
          <Text weight="bold">{save.coins} coins</Text>
          <Text dimColor>
            {' '}
            · 1 per prompt{pet !== undefined ? ` · dressing ${pet.name}` : ''}
          </Text>
        </Text>
        {ITEMS.map(item => {
          const isOwned = item.kind !== 'snack' && save.owned.includes(item.id)
          const isWorn = pet?.hat === item.id || pet?.dye === item.id
          const label = !isOwned ? `buy ${item.cost}c` : isWorn ? 'take off' : 'wear'
          return (
            <Box flexDirection="row" gap={1}>
              <Button
                key={item.id}
                label={label}
                onPress={() =>
                  void (isOwned ? wear($, item.id) : buy($, item.id)).then(text => $.ui.toast(text))
                }
              />
              <Text dimColor={!isOwned && save.coins < item.cost}>
                {item.kind === 'snack' ? '' : (
                  <Text color={item.look}>
                    {item.kind === 'hat' ? draw(HAT_ART[item.id] ?? []).map(runs => runs.map(run => run.text).join('')).join(' ') : '███'}{' '}
                  </Text>
                )}
                {item.name}
              </Text>
            </Box>
          )
        })}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: CHOOSE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const save = await read($, saveAtom)
    const active = activeOf(save)
    const isEggWaiting = save.eggs > 0 && save.pets.length > 0

    return (
      <Box flexDirection="column">
        {save.pets.length === 0 && <Text dimColor>No pets yet. Hatch your first egg above the prompt.</Text>}
        {save.pets.map(pet => (
          <Box flexDirection="row" gap={1}>
            <Button
              key={`choose-${pet.id}`}
              label={pet.id === active?.id ? 'with you' : 'choose'}
              onPress={() => void choose($, pet.id)}
            />
            <Text>
              {pet.name}
              <Text dimColor>
                {' '}
                lvl {levelOf(pet.xp)} {pet.species}
              </Text>
            </Text>
          </Box>
        ))}
        {isEggWaiting ? (
          <Button
            key="hatch-egg"
            variant="primary"
            label={`hatch egg (${save.eggs})`}
            onPress={() => void hatchEgg($).then(text => $.ui.toast(text))}
          />
        ) : (
          save.pets.length > 0 && <Text dimColor>A pet finds an egg when it reaches level {EGG_LEVEL}.</Text>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)

    const save = await read($, saveAtom)
    const pet = activeOf(save)
    const frame = await read($, tick)
    const { Box, Button, Text } = $.ui.resolve(e)

    if (pet === undefined) {
      return (
        <Box flexDirection="row" gap={1}>
          <Box flexDirection="column">
            {draw(EGG_ART[frame % 2] ?? []).map(runs => (
              <Text color={frame % 2 === 0 ? 'text' : 'claude'}>{runs.map(run => run.text).join('')}</Text>
            ))}
          </Box>
          <Box flexDirection="column">
            <Text>An egg is wobbling. What hatches?</Text>
            <Box flexDirection="row" gap={1} flexWrap="wrap">
              {SPECIES.map((species, i) => (
                <Button
                  key={`hatch-${species}`}
                  label={species}
                  hotkey={String(i + 1)}
                  onPress={() => void hatchFirst($, species)}
                />
              ))}
            </Box>
            <Text dimColor>or /pet hatch &lt;species&gt;</Text>
          </Box>
        </Box>
      )
    }

    const level = levelOf(pet.xp)
    const stage = stageOf(level)
    const isBlinking = pet.mood !== 'sleepy' && frame % 4 === 0
    const base = FACE[pet.mood]
    const face = isBlinking ? `-${base[1]}-` : base
    const hat = ITEMS.find(item => item.id === pet.hat)
    const dye = ITEMS.find(item => item.id === pet.dye)
    const now = await $.clock.now()
    const isEvolving = pet.evolvedAt !== undefined && now - pet.evolvedAt < EVOLVE_MS
    const rainbow = RAINBOW[frame % RAINBOW.length] as string

    // Alarmed moods tint the whole pet; otherwise it wears its dye, its
    // species' color, or at mythic every color in turn.
    const isAlarmed = pet.mood === 'worried' || pet.mood === 'scared'
    const calm = dye !== undefined ? dye.look : stage >= 4 ? rainbow : SPECIES_COLOR[pet.species]
    const color = isEvolving ? rainbow : isAlarmed ? COLOR[pet.mood] : calm
    const accent = ACCENT[pet.species]
    const tint: Record<Kind, string> = { body: color, accent, shell: 'subtle' }

    const isClosed = isBlinking || pet.mood === 'sleepy'
    const body = draw(SPRITES[pet.species][Math.min(stage, 3)] ?? [], isClosed)
    const width = widthOf(body)
    const hatRows = hat !== undefined ? draw(HAT_ART[hat.id] ?? []) : []
    type Line = { color: string; text: string }[]
    const pad = (line: Line, size: number): Line => {
      const left = Math.max(0, Math.floor((width - size) / 2))
      return [{ color, text: ' '.repeat(left) }, ...line, { color, text: ' '.repeat(Math.max(0, width - size - left)) }]
    }
    const crowned: Line[] = [
      ...(stage >= 4 ? [pad([{ color: accent, text: AURA[frame % 2] as string }], 9)] : []),
      ...hatRows.map(runs => pad(runs.map(run => ({ color: hat?.look ?? color, text: run.text })), widthOf([runs]))),
      ...body.map(runs => runs.map(run => ({ color: tint[run.kind], text: run.text }))),
    ]
    // Legends and newly evolved pets glitter at their edges.
    const art: Line[] =
      stage >= 3 || isEvolving
        ? crowned.map((line, i) => [
            { color: accent, text: SPARKS[(frame + i) % SPARKS.length] as string },
            ...line,
            { color: accent, text: SPARKS[(frame + i + 3) % SPARKS.length] as string },
          ])
        : crowned

    const snore = pet.mood === 'sleepy' ? (frame % 2 === 0 ? ' z' : ' Z') : ''
    const line = pet.line !== '' ? pet.line : e.props.isWorking ? '*watches Claude work*' : ''
    const titleColor = STAGES[stage]?.color ?? 'subtle'

    if (e.props.bodyColumns < 40) {
      return (
        <Text>
          <Text color={isAlarmed ? COLOR[pet.mood] : calm}>({face})</Text> <Text weight="bold">{pet.name}</Text>
          {line !== '' ? `: ${line}` : snore}
        </Text>
      )
    }

    const floor = xpFor(level)
    const ceiling = xpFor(level + 1)
    const filled = Math.min(10, Math.round(((pet.xp - floor) / (ceiling - floor)) * 10))
    const bar = '#'.repeat(filled) + '-'.repeat(10 - filled)

    return (
      <Box flexDirection="row" gap={1}>
        <Box flexDirection="column">
          {art.map(row => (
            <Text>
              {row.map(run => (
                <Text color={run.color}>{run.text}</Text>
              ))}
            </Text>
          ))}
        </Box>
        <Box flexDirection="column">
          <Text>
            <Text weight="bold">{stage >= 3 ? `* ${pet.name} *` : pet.name}</Text>
            <Text color={COLOR[pet.mood]}>{MARK[pet.mood]}</Text>{' '}
            <Text color={titleColor} weight={stage >= 3 ? 'bold' : 'regular'}>
              {titleOf(level)}
            </Text>
            <Text dimColor>
              {' '}
              · lvl {level} {pet.species} · {save.coins}c
              {snore}
            </Text>
          </Text>
          <Text>{line !== '' ? `< ${line}` : ' '}</Text>
          <Text dimColor>
            [{bar}] {pet.xp}/{ceiling} xp
            {save.eggs > 0 ? ' · egg ready: /pet-choose' : ''}
          </Text>
        </Box>
      </Box>
    )
  })
}
