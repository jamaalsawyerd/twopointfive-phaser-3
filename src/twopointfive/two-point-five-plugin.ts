/**
 * Phaser integration: scene plugin (scene.tpf) and TpfExtern game object. The plugin loads levels,
 * runs entity updates with a capped tick, and provides renderToGL for the Extern. MainScene calls
 * tpf.update(delta) each frame and adds the Extern so the 2.5D world renders inside the Phaser canvas.
 */
import Phaser from 'phaser';
import * as TPF from './index.ts';
import type { ImageInfo, TilesetInfo, EntityContext } from './types.ts';
import type { LightMapPixels } from './world/light-map.ts';
import type Renderer from './renderer/renderer.ts';
import type PerspectiveCamera from './renderer/perspective-camera.ts';
import type OrthoCamera from './renderer/ortho-camera.ts';
import type GameState from './game.ts';
import type { GameContext } from './game.ts';
import type Animation from '~/game/tpf/animation.ts';
import type TPFEntity from './entity.ts';

// Augment Phaser.Scene so `this.tpf` is typed
declare module 'phaser' {
  interface Scene {
    tpf: TwoPointFiveScenePlugin;
  }
}

/**
 * TpfExtern is a Phaser.GameObjects.Extern that renders the TwoPointFive
 * 2.5D world as part of the Phaser scene graph.
 */
class TpfExtern extends Phaser.GameObjects.Extern {
  _tpf: TwoPointFiveScenePlugin;
  _drawHud: (() => void) | null;

  constructor(scene: Phaser.Scene, tpfPlugin: TwoPointFiveScenePlugin, drawHud?: () => void) {
    super(scene);
    this._tpf = tpfPlugin;
    this._drawHud = drawHud || null;
  }

  setHudCallback(fn: () => void): this {
    this._drawHud = fn;
    return this;
  }

  render(
    phaserRenderer: Phaser.Renderer.WebGL.WebGLRenderer,
    _phaserCamera: Phaser.Cameras.Scene2D.Camera,
    _calcMatrix: Phaser.GameObjects.Components.TransformMatrix,
  ): void {
    const tpf = this._tpf;
    if (!tpf) return;

    tpf.renderToGL(phaserRenderer.gl, this._drawHud || undefined);
  }
}

/**
 * Global plugin: registers the scene plugin and exposes TPF.
 */
class TwoPointFivePlugin extends Phaser.Plugins.BasePlugin {
  TPF: typeof TPF;

  constructor(pluginManager: Phaser.Plugins.PluginManager) {
    super(pluginManager);
    if (!pluginManager.get('TwoPointFiveScenePlugin')) {
      pluginManager.registerGameObject('twopointfive', function (this: Phaser.GameObjects.GameObjectFactory) {
        return this;
      });
      pluginManager.installScenePlugin(
        'TwoPointFiveScenePlugin',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        TwoPointFiveScenePlugin as unknown as Function,
        'tpf',
        undefined,
      );
    }
    this.TPF = TPF;
  }
}

/**
 * Scene plugin: provides scene.tpf with loadLevel, update, draw, camera, etc.
 */
class TwoPointFiveScenePlugin extends Phaser.Plugins.ScenePlugin {
  declare game: Phaser.Game;
  declare scene: Phaser.Scene;

  renderer: Renderer | null;
  camera: PerspectiveCamera | null;
  gameState: GameState | null;
  entityClasses: Record<
    string,
    new (x: number, y: number, settings: Record<string, unknown>, context: EntityContext) => TPFEntity
  >;
  tilesets: Record<string, TilesetInfo>;
  lightMapPixels: Record<string, LightMapPixels>;
  hudCamera: OrthoCamera | null;
  _gameContext: GameContext | null;
  gravity: number;
  fov: number;
  sectorSize: number;
  backgroundAnims: Record<string, Record<number, Animation>>;

  constructor(scene: Phaser.Scene, pluginManager: Phaser.Plugins.PluginManager, pluginKey: string) {
    super(scene, pluginManager, pluginKey);
    this.game = scene.game;
    this.scene = scene;
    this.renderer = null;
    this.camera = null;
    this.gameState = null;
    this.entityClasses = {};
    this.tilesets = {};
    this.lightMapPixels = {};
    this.hudCamera = null;
    this._gameContext = null;
    this.gravity = 4;
    this.fov = 75;
    this.sectorSize = 4;
    this.backgroundAnims = {};
  }

  boot(): void {
    const game = this.game;
    if (game.renderer && (game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl) {
      this._initRenderer((game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl);
    } else {
      this.scene.sys.events.once('start', () => {
        if (game.renderer && (game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl) {
          this._initRenderer((game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl);
        }
      });
    }
    this.scene.sys.events.on('shutdown', this.shutdown, this);
    this.scene.sys.events.on('destroy', this.destroy, this);
  }

  _initRenderer(gl: WebGLRenderingContext): void {
    if (this.renderer) return;
    const globalPlugin = this.pluginManager.get('TwoPointFivePlugin') as TwoPointFivePlugin | null;
    const tpf = globalPlugin?.TPF ? globalPlugin.TPF : TPF;
    this.renderer = new tpf.Renderer(gl);
    const width = this.game.scale.width;
    const height = this.game.scale.height;
    this.renderer.setSize(width, height);
    this.camera = new tpf.PerspectiveCamera(this.fov, width / height, 1, 10000);
    this.camera.depthTest = true;
    this.hudCamera = new tpf.OrthoCamera(width, height);
    this.gameState = new tpf.GameState(this._getGameContext());
    this.scene.scale.on('resize', this._onResize, this);
  }

  _getGameContext(): GameContext {
    if (this._gameContext) {
      this._gameContext.renderer = this.renderer;
      this._gameContext.camera = this.camera;
      return this._gameContext;
    }
    this._gameContext = {
      renderer: this.renderer,
      camera: this.camera,
      entityClasses: this.entityClasses,
      backgroundAnims: this.backgroundAnims,
      gravity: this.gravity,
      tick: 1 / 60,
      getTileset: (name: string) => this.tilesets[name] || null,
      getLightMapPixels: (name: string) => this.lightMapPixels[name] || null,
      horizontalFov: () => this.fov * this.camera!.aspect,
    };
    return this._gameContext;
  }

  _onResize(gameSize: Phaser.Structs.Size): void {
    if (!this.renderer || !this.camera) return;
    const w = gameSize.width;
    const h = gameSize.height;
    this.renderer.setSize(w, h);
    this.camera.updateProjection(this.fov, w / h, 1, 10000);
    this.hudCamera!.updateProjection(w, h);
  }

  registerEntityClass(
    typeName: string,
    Class: new (x: number, y: number, settings: Record<string, unknown>, context: EntityContext) => TPFEntity,
  ): void {
    this.entityClasses[typeName] = Class;
  }

  setTileset(
    name: string,
    imageOrTexture: Phaser.Textures.Texture | { getSourceImage?(): HTMLImageElement | HTMLCanvasElement },
  ): TilesetInfo | null {
    if (!this.renderer) return null;
    const img =
      'getSourceImage' in imageOrTexture && imageOrTexture.getSourceImage
        ? (imageOrTexture.getSourceImage() as HTMLImageElement | HTMLCanvasElement)
        : (imageOrTexture as unknown as HTMLImageElement);
    if (!img) return null;
    const texture = this.renderer.loadTexture(img as HTMLImageElement);
    const globalPlugin = this.pluginManager.get('TwoPointFivePlugin') as TwoPointFivePlugin | null;
    const tpf = globalPlugin?.TPF ? globalPlugin.TPF : TPF;
    const expanded = tpf.expandSeams(img as HTMLImageElement, 64, this.renderer);
    this.tilesets[name] = {
      texture: expanded.texture || texture,
      width: img.width,
      height: img.height,
      textureWidth: expanded.textureWidth || img.width,
      textureHeight: expanded.textureHeight || img.height,
      seamsExpanded: expanded.seamsExpanded,
    };
    return this.tilesets[name];
  }

  setLightMapPixels(name: string, imageData: LightMapPixels): void {
    this.lightMapPixels[name] = imageData;
  }

  loadLevel(data: import('./types.ts').LevelData): void {
    if (!this.gameState) return;
    this.gameState.context = this._getGameContext();
    this.gameState.sectorSize = this.sectorSize;
    this.gameState.loadLevel(data);
  }

  update(delta?: number): void {
    if (!this.gameState?.entities) return;
    const tick = (delta || this.game.loop.delta) / 1000;
    const ctx = this.gameState.context;
    if (ctx) ctx.tick = tick;
    const entities = this.gameState.entities.slice();
    for (let i = 0; i < entities.length; i++) {
      const ent = entities[i];
      if (!ent._killed && ent.update) {
        if (ent.context) ent.context.tick = tick;
        ent.update();
      }
    }
    this.gameState.checkEntities();

    this.gameState.entities = this.gameState.entities.filter((e) => !e._killed);
  }

  createExtern(drawHud?: () => void): TpfExtern {
    const ext = new TpfExtern(this.scene, this, drawHud);
    this.scene.add.existing(ext);
    return ext;
  }

  renderToGL(gl: WebGLRenderingContext, drawHud?: () => void): void {
    if (!this.gameState) return;
    if (!this.renderer && gl) {
      this._initRenderer(gl);
    }
    if (!this.renderer) return;

    const prevDepthTest = gl.isEnabled(gl.DEPTH_TEST);
    const prevBlend = gl.isEnabled(gl.BLEND);
    const prevCullFace = gl.isEnabled(gl.CULL_FACE);
    const prevScissor = gl.isEnabled(gl.SCISSOR_TEST);

    const width = this.renderer.width;
    const height = this.renderer.height;
    gl.viewport(0, 0, width, height);
    gl.disable(gl.SCISSOR_TEST);

    gl.activeTexture(gl.TEXTURE0);

    this.renderer.prepare();

    gl.uniform1i(this.renderer.program.uniform.texture, 0);
    this.renderer.texture = null;
    if (this.renderer.fog) {
      this.renderer.setFog(this.renderer.fog.color, this.renderer.fog.near, this.renderer.fog.far);
    }

    const ctx = this.gameState.context;
    ctx.tick = (this.game.loop.delta || 16) / 1000;

    this.gameState.draw(
      this.renderer,
      () => {
        this.gameState!.drawWorld(this.camera!, this.renderer!);
      },
      typeof drawHud === 'function' ? drawHud : undefined,
    );

    if (!prevDepthTest) gl.disable(gl.DEPTH_TEST);
    else gl.enable(gl.DEPTH_TEST);
    if (!prevBlend) gl.disable(gl.BLEND);
    else gl.enable(gl.BLEND);
    if (!prevCullFace) gl.disable(gl.CULL_FACE);
    else gl.enable(gl.CULL_FACE);
    if (prevScissor) gl.enable(gl.SCISSOR_TEST);

    const canvas = this.game.canvas;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  draw(drawHud?: () => void): void {
    if (!this.gameState) return;
    if (!this.renderer && this.game.renderer && (this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl) {
      this._initRenderer((this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl);
    }
    if (!this.renderer) return;
    const gl = (this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const width = this.renderer.width;
    const height = this.renderer.height;
    gl.viewport(0, 0, width, height);
    gl.disable(gl.SCISSOR_TEST);
    this.renderer.prepare();
    if (this.renderer.fog) {
      this.renderer.setFog(this.renderer.fog.color, this.renderer.fog.near, this.renderer.fog.far);
    }
    const ctx = this.gameState.context;
    ctx.tick = (this.game.loop.delta || 16) / 1000;
    this.gameState.draw(
      this.renderer,
      () => {
        this.gameState!.drawWorld(this.camera!, this.renderer!);
      },
      typeof drawHud === 'function' ? drawHud : undefined,
    );
  }

  getCamera(): PerspectiveCamera | null {
    return this.camera;
  }

  getHudCamera(): OrthoCamera | null {
    return this.hudCamera;
  }

  getRenderer(): Renderer | null {
    if (this.renderer) return this.renderer;
    if (
      this.game.renderer &&
      (this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl &&
      this.scene.sys.isActive()
    ) {
      this._initRenderer((this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl);
    }
    return this.renderer;
  }

  getGameState(): GameState | null {
    return this.gameState;
  }

  loadImage(
    phaserTexture: Phaser.Textures.Texture | { getSourceImage?(): HTMLImageElement | HTMLCanvasElement },
  ): ImageInfo | null {
    if (!this.renderer) return null;
    const img =
      'getSourceImage' in phaserTexture && phaserTexture.getSourceImage
        ? (phaserTexture.getSourceImage() as HTMLImageElement | HTMLCanvasElement)
        : (phaserTexture as unknown as HTMLImageElement);
    if (!img) return null;
    const glTexture = this.renderer.loadTexture(img as HTMLImageElement);
    return {
      texture: glTexture,
      width: img.width,
      height: img.height,
    };
  }

  setFog(color: number, near: number, far: number): void {
    if (this.renderer) this.renderer.setFog(color, near, far);
  }

  shutdown(): void {
    this.scene.scale.off('resize', this._onResize, this);
  }

  destroy(): void {
    this.shutdown();
    this.renderer = null;
    this.camera = null;
    this.gameState = null;
  }
}

export { TwoPointFivePlugin, TwoPointFiveScenePlugin };
