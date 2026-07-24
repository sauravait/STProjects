# Archer's Path (HTML5 Canvas Game)

A complete 2D side-scrolling archery action game built with **HTML5, CSS3, and vanilla JavaScript**.

## How to Run
1. Clone/download the repository.
2. Open `/home/runner/work/STProjects/STProjects/index.html` in any modern browser.
3. No build tools or server setup are required.

## Controls
- **Move:** `A / D` or `Left / Right Arrow`
- **Jump / Dodge:** `W` or `Up Arrow`
- **Shoot Arrow:** `J` or `Space`
- **Secondary Ability (Power Dash + short shield):** `K` or `Shift` (costs power)
- **Pause / Resume:** `P`

## Game Rules
- Reach the destination flag alive to complete each level.
- Villains attack from both left and right sides with projectiles.
- Shoot enemies to survive and gain score.
- Collect power orbs with values **20**, **30**, and **100**:
  - **20:** restores health
  - **30:** increases power and grants temporary rapid fire
  - **100:** grants shield, bonus power, and health boost
- If health reaches zero, game is over.

## Level Progression (5 Levels)
Difficulty scales by:
- More enemies each level
- Faster enemy movement
- Higher enemy projectile speed
- Better enemy accuracy and faster attack rate
- More elite enemies at higher levels
- **Boss enemy on Level 5** with burst attacks and high health

## HUD
The in-game HUD shows:
- Health bar
- Power meter
- Current level
- Score
- Remaining enemies
- Progress-to-destination percentage

## Architecture Overview
Core classes in `game.js`:
- `Game`: central loop, state machine, rendering, collisions
- `Player`: movement, jump, shooting, secondary power
- `Enemy` / `BossEnemy`: AI movement + projectile attacks
- `Projectile`: arrow behavior for hero and enemies
- `PowerUp`: collectible powers (20/30/100)
- `LevelManager`: 5-level configs and difficulty scaling
- `UIManager`: overlays/screens + HUD updates
- `SoundManager`: lightweight generated SFX with audio fallback

## Known Limitations
- Uses simple shape-based graphics (no sprite sheets).
- Sound effects are generated tones, not recorded audio assets.
- Best experience is on desktop keyboard; no touch controls.

## Future Enhancements
- Add sprite animation sheets and richer VFX.
- Add mobile/touch controls and gamepad support.
- Add checkpoints and persistent high scores.
- Add terrain obstacles and melee enemy types.
- Add save/load progress and multiple hero loadouts.
