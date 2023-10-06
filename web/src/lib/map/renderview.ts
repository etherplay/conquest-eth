import {BasicObjectStore} from '$lib/utils/stores/base';
import type {Readable} from 'svelte/store';

export type RenderViewState = {width: number; height: number; devicePixelRatio: number};

export type RenderView = Readable<RenderViewState> & {
  update(): void;
  updateDevicePixelRatio(newRatio: number): void;
};

export class CanvasRenderView extends BasicObjectStore<RenderViewState> implements RenderView {
  constructor(protected canvas: HTMLCanvasElement) {
    super({
      width: canvas.width,
      height: canvas.height,
      devicePixelRatio: 0.5,
    });
  }

  updateDevicePixelRatio(newRatio: number): void {
    this.$store.devicePixelRatio = newRatio;
    this.update();
  }

  update(): void {
    const canvas = this.canvas;
    const devicePixelRatio = this.$store.devicePixelRatio;
    const displayWidth = Math.floor(canvas.clientWidth * devicePixelRatio);
    const displayHeight = Math.floor(canvas.clientHeight * devicePixelRatio);

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      this.$store.width = displayWidth;
      this.$store.height = displayHeight;
      this._set(this.$store);
    }
  }
}

export class ElementRenderView extends BasicObjectStore<RenderViewState> implements RenderView {
  constructor(protected elem: HTMLElement) {
    super({
      width: elem.clientWidth,
      height: elem.clientHeight,
      devicePixelRatio: 1,
    });
  }

  updateDevicePixelRatio(newRatio: number): void {
    this.$store.devicePixelRatio = newRatio;
    this.update();
  }

  update(): void {
    const elem = this.elem;
    const devicePixelRatio = this.$store.devicePixelRatio;
    const displayWidth = Math.floor(elem.clientWidth * devicePixelRatio);
    const displayHeight = Math.floor(elem.clientHeight * devicePixelRatio);

    if (this.$store.width !== displayWidth || this.$store.height !== displayHeight) {
      this.$store.width = displayWidth;
      this.$store.height = displayHeight;
      this._set(this.$store);
    }
  }
}
