# Claude Pets

A pixel-art companion that lives above your Claude Code prompt. It watches what Claude does, reacts to it, earns XP, evolves into bigger forms, and stays the same pet across every session and project.

```
                                    ▚  ▄███▄  ▞
                         ▄███▄       ▚███████▞
▗███▖      ▄███▄       ▟█████▙      ▗███ █ ███▖
▐ █ ▌     ▟█ █ █▙      ▟██ █ ██▙     █████ █████
▜███▛     ▐▜▛█▜▛▌      ▐▜█▜▄▛█▛▌     ▛█▛██▀██▜█▜
hatchling   sprite     companion       legend
```

It's a [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview): a plugin of JavaScript hooks that runs inside Claude Code.

## Install

At the prompt of a Claude Code session in your terminal:

```
/plugin install pet --marketplace BKlappi/Claude-Pets
```

Answer `y` to add the marketplace, then pick the user scope so the pet follows you into every project.

From a shell instead:

```
claude plugin install pet --marketplace BKlappi/Claude-Pets
```

In the Claude Desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `BKlappi/Claude-Pets`, then **Add plugin**.

Needs Claude Code v2.1.287 or later (`claude --version`).

## What it does

- **Hatch an egg.** The first time, an egg wobbles above the prompt. Pick a species: blob, moth, ghost, crab or sprout.
- **It reacts.** It gets scared at `rm -rf`, force pushes and `git reset --hard`, worried when a tool call fails, proud when your tests pass, and falls asleep after 10 idle minutes.
- **It grows.** It earns XP for every finished turn and evolves through five forms, each bigger and flashier: hatchling, sprite, companion, legend, mythic.
- **It's yours everywhere.** One save per user, shared by every session and project, even when several sessions are open at once.

## Progression

| Level | XP | Title |
| --- | --- | --- |
| 1 | 0 | hatchling |
| 3 | 100 | sprite |
| 4 | 250 | sprite, the **shop** opens |
| 5 | 500 | companion, the pet finds an **egg** |
| 10 | 5000 | legend |
| 15 | 17500 | mythic |

- **Turns:** 5 XP for each finished turn, plus 1 for each tool call Claude made (up to 10). Interrupted turns give nothing.
- **Pats:** 2 XP each, up to 20 XP a day.
- **Coins:** 1 for each prompt you send. Spend them in the shop on hats (party hat, top hat, halo, wizard hat, crown), dyes, and snacks (+10 XP).
- **Eggs:** each pet finds one egg at level 5. It hatches a species you haven't raised yet.

## Commands

| Command | What it does |
| --- | --- |
| `/pet` | Pat your pet |
| `/pet name <name>` | Rename it |
| `/pet stats` | XP, level, coins, pats, eggs |
| `/pet shop` | Open the shop (from level 4) |
| `/pet buy <item>` / `/pet wear <item>` | Buy or put on an item without the shop |
| `/pet hide` / `/pet show` | Hide or show the pet |
| `/pet release yes` | Say goodbye to the current pet |
| `/pet-choose` | Switch between your pets or hatch an egg |
| `/pet-choose <name>` / `/pet-choose hatch` | The same, by text |

The pet's buttons (hatching, the shop, the picker) can be clicked, or reached with ctrl+x tab and the number keys.

## Privacy

Everything stays on your machine. The mod reads no files, makes no network requests and calls no model. Your pet is saved in Claude Code's own plugin store under `~/.claude/plugins/store/`. Run `claude plugin validate .` in this folder to list every hook and call the mod makes.

## Develop

Load this folder for one session:

```
claude --plugin-dir ./
```

Run the tests:

```
claude plugin test ./
```

## License

MIT
