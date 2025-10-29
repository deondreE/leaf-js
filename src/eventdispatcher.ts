type EventCallback = () => void;
type EventHandler = () => void;

/**
 * Allows for triggering custom events, similar to the default event stack,
 * but also allows for rendering the current event stack inside the profiler that only relates
 * to the leaf canvas.
 */
class EventDispatcher {
  private listeners: Map<string, EventHandler[]> = new Map();

  on(event: string, callback: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  emit(event: string) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const cb of callbacks) {
        cb();
      }
    }
  }

  off(event: string, callback: EventHandler) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(
        event,
        callbacks.filter((cb) => cb !== callback),
      );
    }
  }

  clear(event?: string) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

export default EventDispatcher;
