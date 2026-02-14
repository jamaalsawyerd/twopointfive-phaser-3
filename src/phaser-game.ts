import Phaser from 'phaser';
import type { TwoPointFiveScenePlugin } from '~/twopointfive/two-point-five-plugin.ts';
import { TwoPointFivePlugin } from '~/twopointfive/two-point-five-plugin.ts';
import {
  WeaponGrenadeLauncher,
  EntityGrenade,
  EntityGrenadeExplosion,
  EntityBlastRadius,
} from '~/game/tpf/grenade-launcher.ts';
import { EntityEnemyBlobSpawner, EntityEnemyBlob, EntityEnemyBlobGib } from '~/game/tpf/enemy-blob.ts';
import EntityHealthPickup from '~/game/tpf/health-pickup.ts';
import EntityVoid from '~/game/tpf/entity-void.ts';
import EntityPlayer from '~/game/tpf/entity-player.ts';
import EntityGrenadePickup from '~/game/tpf/grenade-pickup.ts';
import { HudBlood } from '~/game/tpf/hud-blood.ts';
import WebFontFile from '~/game/util/web-font-file.ts';
import type TPFEntity from '~/twopointfive/entity.ts';
import type { ImageInfo, EntityContext, LevelData } from '~/twopointfive/types.ts';
import type Map from '~/twopointfive/world/map.ts';

const WIDTH = 640;
const HEIGHT = 480;

export class MainScene extends Phaser.Scene {
  declare tpf: TwoPointFiveScenePlugin;

  _player: EntityPlayer | null;
  _weaponImages: Record<string, ImageInfo>;
  _enemyImages: Record<string, ImageInfo>;
  _sounds: Record<string, Phaser.Sound.BaseSound | Phaser.Sound.BaseSound[]>;
  _killCount: number;
  _dead: boolean;
  _deathAnimActive: boolean;
  _deathAnimDuration: number;

  _blobSpawnWaitInitial: number;
  _blobSpawnWaitCurrent: number;
  _blobSpawnWaitDiv: number;
  _blobSpawnTimer: number;

  _floorMap: Map | null;
  _powerupSpawnWait: number;
  _powerupSpawnTimer: number;
  _deathMessageShown: boolean;
  _deathText: Phaser.GameObjects.Text | null;

  _mouseDeltaX: number;
  _mouseDown: boolean;
  _pointerLockJustAcquired: boolean;

  _tpfExtern: Phaser.GameObjects.Extern | null;
  _hudHealthIcon: Phaser.GameObjects.Image | null;
  _hudHealthText: Phaser.GameObjects.Text | null;
  _hudAmmoIcon: Phaser.GameObjects.Image | null;
  _hudAmmoText: Phaser.GameObjects.Text | null;
  _hudKillsText: Phaser.GameObjects.Text | null;
  _hudBlood: HudBlood | null;

  constructor() {
    super({ key: 'Main' });
    this._player = null;
    this._weaponImages = {};
    this._enemyImages = {};
    this._sounds = {};
    this._killCount = 0;
    this._dead = false;
    this._deathAnimActive = false;
    this._deathAnimDuration = 1;

    this._blobSpawnWaitInitial = 2;
    this._blobSpawnWaitCurrent = 2;
    this._blobSpawnWaitDiv = 1.01;
    this._blobSpawnTimer = 2;

    this._floorMap = null;
    this._powerupSpawnWait = 8;
    this._powerupSpawnTimer = 8;
    this._deathMessageShown = false;
    this._deathText = null;

    this._mouseDeltaX = 0;
    this._mouseDown = false;
    this._pointerLockJustAcquired = false;

    this._tpfExtern = null;
    this._hudHealthIcon = null;
    this._hudHealthText = null;
    this._hudAmmoIcon = null;
    this._hudAmmoText = null;
    this._hudKillsText = null;
    this._hudBlood = null;
  }

  preload(): void {
    this.load.addFile(new WebFontFile(this.load, 'Fredoka One'));

    this.load.image('tiles', 'media/tiles/basic-tiles-64.png');
    this.load.image('lights', 'media/tiles/lights-64.png');
    this.load.json('level', 'media/levels/base1.json');

    this.load.image('grenade-launcher', 'media/grenade-launcher.png');
    this.load.image('grenade', 'media/grenade.png');
    this.load.image('explosion', 'media/explosion.png');

    this.load.image('grenade-pickup', 'media/grenade-pickup.png');
    this.load.image('health', 'media/health.png');

    this.load.image('blob-spawn', 'media/blob-spawn.png');
    this.load.image('blob', 'media/blob.png');
    this.load.image('blob-gib', 'media/blob-gib.png');

    this.load.image('health-icon', 'media/health-icon.png');
    this.load.image('hud-blood', 'media/hud-blood-low.png');

    this.load.audio('snd-grenade-launcher', 'media/sounds/grenade-launcher.ogg');
    this.load.audio('snd-empty-click', 'media/sounds/empty-click.ogg');
    this.load.audio('snd-explosion', 'media/sounds/explosion.ogg');
    this.load.audio('snd-grenade-bounce', 'media/sounds/grenade-bounce.ogg');
    this.load.audio('snd-health-pickup', 'media/sounds/health-pickup.ogg');
    this.load.audio('snd-blob-gib', 'media/sounds/blob-gib.ogg');
    this.load.audio('snd-hurt1', 'media/sounds/hurt1.ogg');
    this.load.audio('snd-hurt2', 'media/sounds/hurt2.ogg');
    this.load.audio('snd-hurt3', 'media/sounds/hurt3.ogg');
  }

  create(): void {
    const tpf = this.tpf;
    if (!tpf) return;
    if (!tpf.getRenderer()) {
      this.time.delayedCall(100, () => this.scene.restart());
      return;
    }

    const tilesTexture = this.textures.get('tiles');
    const lightsTexture = this.textures.get('lights');
    tpf.setTileset('media/tiles/basic-tiles-64.png', tilesTexture);
    tpf.setTileset('media/tiles/lights-64.png', lightsTexture);
    const lightsSource = lightsTexture.getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    if (lightsSource) {
      const canvas = document.createElement('canvas');
      canvas.width = lightsSource.width;
      canvas.height = lightsSource.height;
      const ctx2d = canvas.getContext('2d')!;
      ctx2d.drawImage(lightsSource, 0, 0);
      const imageData = ctx2d.getImageData(0, 0, canvas.width, canvas.height);
      tpf.setLightMapPixels('media/tiles/lights-64.png', imageData);
    }

    this._weaponImages = {
      grenadeLauncher: tpf.loadImage(this.textures.get('grenade-launcher'))!,
      grenade: tpf.loadImage(this.textures.get('grenade'))!,
      explosion: tpf.loadImage(this.textures.get('explosion'))!,
      grenadePickup: tpf.loadImage(this.textures.get('grenade-pickup'))!,
    };

    this._enemyImages = {
      blobSpawn: tpf.loadImage(this.textures.get('blob-spawn'))!,
      blob: tpf.loadImage(this.textures.get('blob'))!,
      blobGib: tpf.loadImage(this.textures.get('blob-gib'))!,
      health: tpf.loadImage(this.textures.get('health'))!,
    };

    this._sounds = {
      shoot: this.sound.add('snd-grenade-launcher', { volume: 0.8 }),
      empty: this.sound.add('snd-empty-click'),
      explosion: this.sound.add('snd-explosion', { volume: 0.9 }),
      bounce: this.sound.add('snd-grenade-bounce', { volume: 0.6 }),
      pickup: this.sound.add('snd-health-pickup'),
      blobGib: this.sound.add('snd-blob-gib', { volume: 0.6 }),
      hurt: [this.sound.add('snd-hurt1'), this.sound.add('snd-hurt2'), this.sound.add('snd-hurt3')],
    };

    tpf.registerEntityClass(
      'EntityVoid',
      EntityVoid as unknown as new (
        x: number,
        y: number,
        settings: Record<string, unknown>,
        context: EntityContext,
      ) => TPFEntity,
    );
    tpf.registerEntityClass(
      'EntityPlayer',
      EntityPlayer as unknown as new (
        x: number,
        y: number,
        settings: Record<string, unknown>,
        context: EntityContext,
      ) => TPFEntity,
    );

    const grenadeFactory = (
      x: number,
      y: number,
      settings: Record<string, unknown>,
      context: EntityContext,
    ): TPFEntity => {
      settings = settings;
      settings.bounceSound = this._sounds.bounce;
      settings.explodeSound = this._sounds.explosion;
      settings.grenadeImage = this._weaponImages.grenade;
      settings.explosionImage = this._weaponImages.explosion;
      settings.EntityGrenadeExplosion = explosionFactory;
      settings.EntityBlastRadius = EntityBlastRadius;
      return new EntityGrenade(x, y, settings, context);
    };

    const explosionFactory = (
      x: number,
      y: number,
      settings: Record<string, unknown>,
      context: EntityContext,
    ): TPFEntity => {
      settings = settings;
      settings.explosionImage = this._weaponImages.explosion;
      return new EntityGrenadeExplosion(x, y, settings, context);
    };

    const levelData = this.cache.json.get('level') as LevelData | undefined;
    if (levelData) {
      const info = levelData.entities.find((e) => e.settings?.name === 'info');
      if (info?.settings) {
        const s = info.settings;
        if (s.sectorSize != null) tpf.sectorSize = s.sectorSize as number;
      }
      tpf.loadLevel(levelData);
      if (info?.settings) {
        const s = info.settings;
        if (s.fogColor != null)
          tpf.setFog(Number(s.fogColor), (s.fogNear as number) || 128, (s.fogFar as number) || 512);
      }

      const player = tpf.getGameState()?.entities.find(function (e) {
        return e instanceof EntityPlayer;
      });
      if (player) {
        this._player = player;
        player._cursors = {
          forward: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
          back: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
          left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
          right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
          stepleft: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
          stepright: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
          shoot: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
        };

        const weapon = new WeaponGrenadeLauncher({
          ammo: 16,
          image: this._weaponImages.grenadeLauncher,
          tileWidth: 180,
          tileHeight: 134,
          renderer: tpf.getRenderer(),
          hudWidth: WIDTH,
          hudHeight: HEIGHT,
          gameState: tpf.getGameState(),
          sounds: {
            shoot: this._sounds.shoot as { play(): void },
            empty: this._sounds.empty as { play(): void },
          },
          ammoIconImage: this._weaponImages.grenade,
          EntityGrenade: grenadeFactory as unknown as typeof EntityGrenade,
          onAmmoChange: (ammo: number) => {
            this.updateAmmoDisplay(ammo);
          },
        });
        player.giveWeapon(weapon);

        player._hurtSounds = this._sounds.hurt as { play(): void }[];
        player._scene = this;
      }

      const gs = tpf.getGameState();
      this._floorMap = gs ? gs.getMapByName('floor') : null;
      this._powerupSpawnWait = 8;
      this._powerupSpawnTimer = this._powerupSpawnWait;

      this._dead = false;
      this._deathAnimActive = false;
      this._deathMessageShown = false;
      this._killCount = 0;
      this._blobSpawnWaitCurrent = this._blobSpawnWaitInitial;
      this._blobSpawnTimer = this._blobSpawnWaitInitial;

      const cam = tpf.getCamera();
      if (cam && !player) cam.setPosition(1010, 818, 0);
    }

    const gameCanvas = this.sys.game.canvas;
    this._mouseDeltaX = 0;
    this._mouseDown = false;
    this._pointerLockJustAcquired = false;

    gameCanvas.addEventListener('click', () => {
      void gameCanvas.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === gameCanvas) {
        this._pointerLockJustAcquired = true;
      }
    });

    gameCanvas.addEventListener('mousemove', (event: MouseEvent) => {
      if (document.pointerLockElement === gameCanvas) {
        if (this._pointerLockJustAcquired) {
          this._pointerLockJustAcquired = false;
          return;
        }
        let mx = event.movementX || 0;
        if (mx > 150) mx = 150;
        if (mx < -150) mx = -150;
        this._mouseDeltaX += mx;
      }
    });

    gameCanvas.addEventListener('mousedown', (event: MouseEvent) => {
      if (event.button === 0 && document.pointerLockElement === gameCanvas) {
        this._mouseDown = true;
      }
    });

    gameCanvas.addEventListener('mouseup', (event: MouseEvent) => {
      if (event.button === 0) {
        this._mouseDown = false;
      }
    });

    this._tpfExtern = tpf.createExtern(() => {
      const renderer = tpf.getRenderer();
      const hudCamera = tpf.getHudCamera();
      if (!renderer || !hudCamera) return;

      renderer.setCamera(hudCamera);

      if (this._player?.currentWeapon) {
        this._player.currentWeapon.draw(renderer);
      }
    });

    const hudStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Fredoka One", Arial, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    };

    this._hudHealthIcon = this.add
      .image(96, HEIGHT - 20, 'health-icon')
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setDisplaySize(32, 32);
    this._hudHealthText = this.add
      .text(80, HEIGHT - 20, '100', hudStyle)
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this._hudAmmoIcon = this.add
      .image(215, HEIGHT - 20, 'grenade')
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000)
      .setDisplaySize(32, 32);
    this._hudAmmoText = this.add
      .text(199, HEIGHT - 20, '16', hudStyle)
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this._hudKillsText = this.add.text(32, 8, 'Kills: 0', hudStyle).setOrigin(0, 0).setScrollFactor(0).setDepth(1000);

    this._hudBlood = new HudBlood(this, { viewWidth: WIDTH, viewHeight: HEIGHT });

    const deathStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Fredoka One", Arial, sans-serif',
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    };
    this._deathText = this.add
      .text(WIDTH / 2, HEIGHT / 2, 'You are Dead!', deathStyle)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000)
      .setVisible(false);
  }

  showDeathAnim(): void {
    this._deathAnimActive = true;
    const cam = this.tpf.getCamera();
    const tilesize = this.tpf.gameState?.collisionMap
      ? (this.tpf.gameState.collisionMap as { tilesize: number }).tilesize
      : 64;
    const endY = -(tilesize / 4);
    if (cam) {
      const target = { y: cam.position[1] };
      this.tweens.add({
        targets: target,
        y: endY,
        duration: this._deathAnimDuration * 1000,
        onUpdate: () => {
          if (cam) cam.position[1] = target.y;
        },
      });
    }
    this.time.delayedCall(this._deathAnimDuration * 1000, this.onDeathComplete, [], this);
  }

  onDeathComplete(): void {
    this._deathAnimActive = false;
    this._dead = true;
    if (!this._deathMessageShown) {
      this._deathMessageShown = true;
      if (this._deathText) this._deathText.setVisible(true);
    }
    const doRestart = () => {
      if (this._dead && this._deathMessageShown) {
        this.scene.restart();
      }
    };
    this.input.keyboard?.once('keydown-SPACE', doRestart);
    this.input.once('pointerdown', doRestart);
  }

  showDamageIndicator(): void {
    this._hudBlood?.show();
  }

  onPlayerHealthChanged(health: number): void {
    if (this._hudHealthText) this._hudHealthText.setText(String(health));
  }

  updateAmmoDisplay(ammo: number): void {
    if (this._hudAmmoText) this._hudAmmoText.setText(String(ammo));
  }

  incrementKillCount(): void {
    this._killCount++;
    if (this._hudKillsText) this._hudKillsText.setText(`Kills: ${String(this._killCount)}`);
  }

  getRandomSpawnPos(): { x: number; y: number } {
    const fm = this._floorMap;
    if (!fm) return { x: 0, y: 0 };
    const ts = fm.tilesize;
    for (let attempts = 0; attempts < 200; attempts++) {
      const x = ((Math.random() * fm.width) | 0) * ts + ts / 2;
      const y = ((Math.random() * fm.height) | 0) * ts + ts / 2;
      if (fm.getTile(x, y)) {
        return { x: x, y: y };
      }
    }
    return { x: ts, y: ts };
  }

  checkSpawn(dt: number): void {
    if (!this._dead && !this._deathAnimActive) {
      if (this._floorMap && this._player) {
        this._blobSpawnTimer -= dt;
        if (this._blobSpawnTimer <= 0) {
          this.spawnBlob();
        }
      }

      if (this._floorMap && this._player) {
        this._powerupSpawnTimer -= dt;
        if (this._powerupSpawnTimer <= 0) {
          this.spawnPowerup();
          this._powerupSpawnTimer = this._powerupSpawnWait;
        }
      }
    }
  }

  spawnPowerup(): void {
    const gs = this.tpf.getGameState();
    if (!gs || !this._player || !this._floorMap) return;
    const pos = this.getRandomSpawnPos();

    const roll = Math.random();
    if (roll < 1 / 3) {
      gs.spawnEntity(
        ((x: number, y: number, settings: Record<string, unknown>, context: EntityContext) => {
          settings = settings || {};
          settings.healthImage = this._enemyImages.health;
          settings.pickupSound = this._sounds.pickup;
          settings.player = this._player;
          return new EntityHealthPickup(x, y, settings, context);
        }) as unknown as new (x: number, y: number, s: Record<string, unknown>, c: EntityContext) => TPFEntity,
        pos.x,
        pos.y,
        {},
      );
    } else {
      gs.spawnEntity(
        ((x: number, y: number, settings: Record<string, unknown>, context: EntityContext) => {
          settings = settings || {};
          settings.pickupSound = this._sounds.pickup;
          settings.animSheet = { image: this._weaponImages.grenadePickup, width: 32, height: 32 };
          return new EntityGrenadePickup(x, y, settings, context);
        }) as unknown as new (x: number, y: number, s: Record<string, unknown>, c: EntityContext) => TPFEntity,
        pos.x,
        pos.y,
        {},
      );
    }
  }

  spawnBlob(): void {
    const gs = this.tpf.getGameState();
    if (!gs || !this._player || !this._floorMap) return;
    const playerPos = this._player.pos;

    let spawnPos: { x: number; y: number } = this.getRandomSpawnPos();
    for (let i = 0; i < 10; i++) {
      spawnPos = this.getRandomSpawnPos();
      if (Math.abs(spawnPos.x - playerPos.x) + Math.abs(spawnPos.y - playerPos.y) > 256) {
        break;
      }
    }

    gs.spawnEntity(
      ((x: number, y: number, settings: Record<string, unknown>, context: EntityContext) => {
        settings = settings || {};
        settings.blobSpawnImage = this._enemyImages.blobSpawn;
        settings.blobImage = this._enemyImages.blob;
        settings.blobGibImage = this._enemyImages.blobGib;
        settings.blobGibSound = this._sounds.blobGib;
        settings.player = this._player;
        settings.scene = this;
        settings.EntityEnemyBlob = (
          bx: number,
          by: number,
          bSettings: Record<string, unknown>,
          bContext: EntityContext,
        ) => {
          bSettings = bSettings || {};
          bSettings.blobImage = this._enemyImages.blob;
          bSettings.blobGibImage = this._enemyImages.blobGib;
          bSettings.blobGibSound = this._sounds.blobGib;
          bSettings.player = this._player;
          bSettings.scene = this;
          bSettings.EntityEnemyBlobGib = (
            gx: number,
            gy: number,
            gSettings: Record<string, unknown>,
            gContext: EntityContext,
          ) => {
            gSettings = gSettings || {};
            gSettings.blobGibImage = this._enemyImages.blobGib;
            return new EntityEnemyBlobGib(gx, gy, gSettings, gContext);
          };
          return new EntityEnemyBlob(bx, by, bSettings, bContext);
        };
        return new EntityEnemyBlobSpawner(x, y, settings, context);
      }) as unknown as new (x: number, y: number, s: Record<string, unknown>, c: EntityContext) => TPFEntity,
      spawnPos.x,
      spawnPos.y,
      {},
    );

    this._blobSpawnWaitCurrent /= this._blobSpawnWaitDiv;
    this._blobSpawnTimer = Math.max(this._blobSpawnWaitCurrent, 0.5);
  }

  update(_time: number, delta: number): void {
    if (this._player && !this._dead && !this._deathAnimActive) {
      this._player._mouseDeltaX = this._mouseDeltaX || 0;
      this._player._mouseDown = this._mouseDown || false;
    }
    this._mouseDeltaX = 0;
    this.tpf.update(delta);
    this.checkSpawn(delta / 1000);
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: WIDTH,
  height: HEIGHT,
  parent: 'game',
  backgroundColor: '#000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: false,
  },
  plugins: {
    global: [{ key: 'TwoPointFivePlugin', plugin: TwoPointFivePlugin, start: true }],
  },
  scene: [MainScene],
};

const _game = new Phaser.Game(config);
