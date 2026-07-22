import { vi } from "vitest";

// jsdom no implementa matchMedia (usePrefersReducedMotion) ni ResizeObserver
// (Recharts ResponsiveContainer). Polyfills mínimos para los tests de widgets.
if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}

// jsdom no implementa los métodos de HTMLMediaElement (play/pause/load) —
// VideoBlockView llama a pause() al abrir el overlay fullscreen.
if (!window.HTMLMediaElement.prototype.play) {
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
}
window.HTMLMediaElement.prototype.pause = vi.fn();
window.HTMLMediaElement.prototype.load = vi.fn();

// framer-motion (whileInView) necesita IntersectionObserver; jsdom no lo trae.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver;
}
