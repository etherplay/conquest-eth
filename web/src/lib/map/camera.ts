import {BasicObjectStore} from '$lib/utils/stores/base';
import type {Readable} from 'svelte/store';

export type CameraState = {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom: number;
  renderX: number;
  renderY: number;
  renderWidth: number;
  renderHeight: number;
  renderScale: number;
  devicePixelRatio: number;
};

type RenderViewReadable = Readable<{width: number; height: number; devicePixelRatio: number}>;

export class Camera extends BasicObjectStore<CameraState> {
  private zoomIndex: number;
  private isPanning = false;
  private lastClientPos = {x: 0, y: 0};
  private firstClientPos = {x: 0, y: 0};
  private isZooming = false;
  private lastDist = 0;
  private zoomPoint = {x: 0, y: 0};

  public onClick: (x: number, y: number) => void | undefined;

  protected renderView: RenderViewReadable;
  protected surface: HTMLElement;

  private unsubscribeFromRenderView: () => void;

  // private static zoomLevels = [1000, 500, 200, 100, 50, 20, 10, 5, 4, 3, 2, 1, 0.5];

  constructor() {
    super();
    // this.zoomIndex = Camera.zoomLevels.indexOf(3);
    // if (this.zoomIndex === -1) {
    //   this.zoomIndex = Camera.zoomLevels.length - 3;
    // }
  }

  get zoom(): number {
    return this.$store.zoom;
  }

  start(surface: HTMLElement, renderView: RenderViewReadable): void {
    this.surface = surface;
    this.renderView = renderView;

    if (!this.$store) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._set({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        zoom: 0,
        renderX: 0,
        renderY: 0,
        renderWidth: 0,
        renderHeight: 0,
        renderScale: 0,
        devicePixelRatio: 1,
      });
      this._setXYZoom(0, 0, 5);
      // this._setXYZoom(0, 0, Camera.zoomLevels[this.zoomIndex]);
    }

    this.unsubscribeFromRenderView = this.renderView.subscribe(this.onRenderViewUpdates.bind(this));

    this.surface.onmousedown = (e) => {
      this.onmousedown(e);
    };
    this.surface.onmouseup = (e) => {
      this.onmouseup(e);
    };
    this.surface.onmousemove = (e) => {
      this.onmousemove(e);
    };
    this.surface.ontouchstart = (e: TouchEvent) => {
      this.ontouchstart(e);
    };
    this.surface.ontouchend = (e: TouchEvent) => {
      this.ontouchend(e);
    };
    this.surface.ontouchmove = (e: TouchEvent) => {
      this.ontouchmove(e);
    };
    this.surface.onwheel = (e) => {
      this.onwheel(e);
    };
  }

  stop(): void {
    if (this.unsubscribeFromRenderView) {
      console.log(this.unsubscribeFromRenderView);
      this.unsubscribeFromRenderView();
      this.unsubscribeFromRenderView = undefined;
    }

    if (this.surface) {
      this.surface.onmousedown = undefined;
      this.surface.onmouseup = undefined;
      this.surface.onmousemove = undefined;
      this.surface.ontouchstart = undefined;
      this.surface.ontouchend = undefined;
      this.surface.ontouchmove = undefined;
      this.surface.onwheel = undefined;
      this.surface = undefined;
    }
  }

  _setXYZoom(x: number, y: number, zoom: number): void {
    this.$store.x = x;
    this.$store.y = y;
    this.$store.zoom = zoom;
    const scale = this.$store.zoom * this.$store.devicePixelRatio;
    this.$store.renderScale = scale;
    this.$store.width = this.$store.renderWidth / scale;
    this.$store.height = this.$store.renderHeight / scale;
    this.$store.renderX = this.$store.renderWidth / 2 - this.$store.x;
    this.$store.renderY = this.$store.renderHeight / 2 - this.$store.y;
    super._set(this.$store);
  }

  screenToWorld(x: number, y: number): {x: number; y: number} {
    const devicePixelRatio = this.$store.devicePixelRatio;
    const scale = this.$store.zoom * devicePixelRatio;
    x = (x * devicePixelRatio - this.$store.renderWidth / 2) / scale + this.$store.x;
    y = (y * devicePixelRatio - this.$store.renderHeight / 2) / scale + this.$store.y;
    return {
      x,
      y,
    };
  }

  worldToScreen(x: number, y: number): {x: number; y: number} {
    const devicePixelRatio = this.$store.devicePixelRatio;
    const scale = this.$store.zoom * devicePixelRatio;
    return {
      x: ((x - this.$store.x) * scale + this.$store.renderWidth / 2) / devicePixelRatio,
      y: ((y - this.$store.y) * scale + this.$store.renderHeight / 2) / devicePixelRatio,
    };
  }

  _update(): void {
    this._setXYZoom(this.$store.x, this.$store.y, this.$store.zoom);
  }

  _onClick(x: number, y: number): void {
    const worldPos = this.screenToWorld(x, y);
    if (this.onClick) {
      this.onClick(worldPos.x, worldPos.y);
    }
  }

  onmousedown(e: TouchEvent | MouseEvent): void {
    // console.log({button: (e as MouseEvent).button});
    if ((e as MouseEvent).button === 2) {
      return;
    }
    // console.log('startPanning');
    this.isPanning = true;
    let eventX;
    let eventY;
    if ('clientX' in e) {
      // console.log('mouse');
      eventX = e.clientX;
      eventY = e.clientY;
    } else {
      // console.log('touch', e);
      eventX = e.touches[0].clientX;
      eventY = e.touches[0].clientY;
    }
    this.lastClientPos = {x: eventX, y: eventY};
    this.firstClientPos = {x: eventX, y: eventY};
  }

  onmouseup(e: TouchEvent | MouseEvent): void {
    // console.log('endPanning');
    this.isPanning = false;

    let eventX;
    let eventY;
    if ('clientX' in e) {
      // console.log('mouse');
      eventX = e.clientX;
      eventY = e.clientY;
    } else {
      // console.log('touch', e);
      eventX = e.changedTouches[0].clientX;
      eventY = e.changedTouches[0].clientY;
    }
    const dist = Math.hypot(eventX - this.firstClientPos.x, eventY - this.firstClientPos.y);
    if (dist < 22) {
      // TODO : devicePixelRatio?
      // TODO time too ?
      this._onClick(this.lastClientPos.x, this.lastClientPos.y);
    }
  }

  onmousemove(e: TouchEvent | MouseEvent): void {
    if (!this.isPanning) return;

    // let movementX;
    // let movementY;
    // if (e.movementX) {
    // 	movementX = e.movementX / windowDevicePxelRatio;
    // 	movementY = e.movementY / windowDevicePxelRatio;
    // }
    let eventX;
    let eventY;
    if ('clientX' in e) {
      eventX = e.clientX;
      eventY = e.clientY;
    } else {
      eventX = e.touches[0].clientX;
      eventY = e.touches[0].clientY;
    }

    // console.log({eventX, eventY});
    const movementX = eventX - this.lastClientPos.x;
    const movementY = eventY - this.lastClientPos.y;
    // console.log(JSON.stringify({movementX, movementY, eMovementX: e.movementX, eMovementY: e.movementY}))
    this.lastClientPos = {x: eventX, y: eventY};

    // console.log('panning', movementX, movementY);

    const devicePixelRatio = this.$store.devicePixelRatio;
    const scale = this.$store.zoom * devicePixelRatio;
    this.$store.x -= (movementX * devicePixelRatio) / scale;
    this.$store.y -= (movementY * devicePixelRatio) / scale;
    this._update();
  }

  navigate(x: number, y: number, zoom: number): void {
    this.$store.x = x;
    this.$store.y = y;
    this.$store.zoom = zoom;
    this._update();
  }

  onwheel(e: WheelEvent): void {
    e.preventDefault();
    const {clientX, clientY, deltaY} = e;
    const offsetX = clientX - this.surface.clientLeft;
    const offsetY = clientY - this.surface.clientTop;
    const dir = (Math.abs(deltaY) / deltaY) as 0 | -1 | 1;
    this.updateZoom(offsetX, offsetY, dir);
  }

  startZooming(e: TouchEvent): void {
    this.isPanning = false; // zooming override panning
    this.isZooming = true;
    this.lastDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    this.zoomPoint = {
      x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
      y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  endZooming(_e: TouchEvent): void {
    this.isZooming = false;
  }

  doZooming(e: TouchEvent): void {
    const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);

    // console.log(JSON.stringify({dist, lastDist}));
    const diff = this.lastDist - dist;
    if (Math.abs(diff) > 50) {
      // devicePixelRatio
      const dir: 0 | -1 | 1 = Math.sign(diff) as 0 | -1 | 1;
      this.updateZoom(this.zoomPoint.x, this.zoomPoint.y, dir);
      this.lastDist = dist;
    }
  }

  logTouchEvent(_title: string, e: TouchEvent): void {
    const touches = [];
    for (let i = 0; i < e.touches.length; i++) {
      touches.push({identifier: e.touches[i].identifier});
    }
    // console.log(title, JSON.stringify(touches));
  }

  ontouchstart(e: TouchEvent): void {
    e.preventDefault();
    this.logTouchEvent('start', e);
    if (!this.isZooming && e.touches.length === 2) {
      this.startZooming(e);
    } else if (!this.isZooming) {
      this.onmousedown(e); // TODO ?
    }
  }

  ontouchend(e: TouchEvent): void {
    e.preventDefault();
    this.logTouchEvent('end', e);
    if (this.isZooming) {
      this.endZooming(e);
    } else if (this.isPanning) {
      this.onmouseup(e); // TODO ?
    }
  }

  ontouchmove(e: TouchEvent): void {
    e.preventDefault();
    this.logTouchEvent('move', e);
    if (this.isZooming) {
      if (e.touches.length != 2) {
        this.endZooming(e);
      } else {
        this.doZooming(e);
      } // TODO allow panning if one touch left?
    } else if (this.isPanning) {
      this.onmousemove(e); // TODO ?
    }
  }

  // function clientToCanvas(x: number, y: number) {
  //   const devicePixelRatio = this.render.devicePixelRatio;
  //   x = x * devicePixelRatio;
  //   y = y * devicePixelRatio;
  //   return {
  //     x,
  //     y,
  //   };
  // }

  updateZoom(offsetX: number, offsetY: number, dir: 1 | -1 | 0): void {
    const {x, y} = this.screenToWorld(offsetX, offsetY);

    const maxSize = 500 * 500; //700 * 700; was too big
    const minSize = 16 * 16;

    const size = this.$store.width * this.$store.height;
    const renderSize = this.$store.renderWidth * this.$store.renderHeight;
    let newSize = size;
    if (dir > 0) {
      newSize = size + size / 5; // + 20%
      if (newSize > maxSize) {
        if (maxSize / size > 1.1) {
          newSize = maxSize;
        } else {
          return;
        }
      }
    } else {
      newSize = size - size / 5; // - 20%
      if (newSize < minSize) {
        if (minSize / size < 0.9) {
          newSize = minSize;
        } else {
          return;
        }
      }
    }
    const scale = Math.sqrt(renderSize) / Math.sqrt(newSize);
    this.$store.zoom = scale / this.$store.devicePixelRatio;

    // if (dir > 0) {
    //   const size = this.$store.width * this.$store.height;
    //   const renderSize = this.$store.renderWidth * this.$store.renderHeight;
    //   let newSize = size + size / 5; // + 20%
    //   if (newSize > maxSize) {
    //     if ((maxSize) / size > 1.1) {
    //       newSize = maxSize;
    //     } else {
    //       return;
    //     }
    //   }
    //   const scale = Math.sqrt(renderSize) / Math.sqrt(newSize);
    //   this.$store.zoom = scale / this.$store.devicePixelRatio;
    //   // let size = this.$store.width;
    //   // let renderSize = this.$store.renderWidth;
    //   // if (this.$store.height > size) {
    //   //   size = this.$store.height;
    //   //   renderSize = this.$store.renderHeight;
    //   // }
    //   // let newSize = size + size / 5; // + 20%
    //   // if (newSize > 1000) {
    //   //   if (1000 / size > 1.1) {
    //   //     newSize = 1000;
    //   //   } else {
    //   //     return;
    //   //   }
    //   // }
    //   // const scale = renderSize / newSize;
    //   // this.$store.zoom = scale / this.$store.devicePixelRatio;
    // } else {
    //   let size = this.$store.width;
    //   let renderSize = this.$store.renderWidth;
    //   if (this.$store.height < size) {
    //     size = this.$store.height;
    //     renderSize = this.$store.renderHeight;
    //   }
    //   let newSize = size - size / 5; // - 20%
    //   if (newSize < 9) {
    //     if (9 / size < 0.9) {
    //       newSize = 9;
    //     } else {
    //       return;
    //     }
    //   }
    //   const scale = renderSize / newSize;
    //   this.$store.zoom = scale / this.$store.devicePixelRatio;
    // }

    const screenPos = this.worldToScreen(x, y);
    const delta = {
      x: (offsetX - screenPos.x) / this.$store.zoom,
      y: (offsetY - screenPos.y) / this.$store.zoom,
    };

    // console.log({screenPosX: screenPos.x, screenPosY: screenPos.y, deltaX: delta.x, deltaY: delta.y});

    this.$store.x -= delta.x;
    this.$store.y -= delta.y;
    this._update();
  }

  onRenderViewUpdates(renderView: {width: number; height: number; devicePixelRatio}): void {
    this.$store.renderWidth = renderView.width;
    this.$store.renderHeight = renderView.height;
    this.$store.devicePixelRatio = renderView.devicePixelRatio;

    this._update();
  }
}

export const camera = new Camera();

// (async () => {
//   if (import.meta.hot) {
//     const moduleUrl = import.meta.url;
//     const previousModule = await import(moduleUrl);
//     import.meta.hot.accept((module) => {
//       for (const field of Object.keys(module)) {
//         const newValue = module[field];
//         const previousValue = previousModule[field];
//         if (previousValue) {
//           let __hmr__;
//           if (newValue.__hmr__) {
//             __hmr__ = newValue.__hmr__.bind(previousValue);
//           } else if (previousValue.__hmr__) {
//             __hmr__ = previousValue.__hmr__;
//           }
//           if (__hmr__) {
//             try {
//               __hmr__({previousModule, module, newValue});
//             } catch (e) {
//               import.meta.hot.invalidate();
//             }
//           } else {
//             const clazz = previousValue.prototype?.constructor;
//             if (clazz && clazz.__instances) {
//               for (const instance of clazz.__instances) {
//                 const classPrototype = newValue.prototype;
//                 Reflect.setPrototypeOf(instance, classPrototype);
//               }
//             } else {
//               const newPrototype = Reflect.getPrototypeOf(newValue);
//               Reflect.setPrototypeOf(previousValue, newPrototype);
//             }
//           }
//         } else {
//           previousModule[field] = newValue;
//         }
//       }
//     });
//   }
// })();
