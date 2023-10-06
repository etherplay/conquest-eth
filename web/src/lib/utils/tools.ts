/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function trackInstances<T extends {new (...args: any[]): {}}>(constructor: T): T | undefined {
  if (import.meta.hot) {
    return class extends constructor {
      static __instances: any[] = [];
      constructor(...args: any[]) {
        super(...args);
        (this.constructor as any).__instances.push(this);
      }
    };
  }
}
