type EventCallback = () => void;

/**
 * Allows for triggering custom events, similar to the default event stack,
 * but also allows for rendering the current event stack inside the profiler that only relates
 * to the leaf canvas.
 */
class EventDispatcher {
    private events: Map<string, EventCallback[]> = new Map();
    private callStack: string[] = [];

    on(event: string, callback: EventCallback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        this.events.get(event)!.push(callback);
    }

    off(event: string, callback: EventCallback) {
        if (this.events.has(event)) {
            this.events.set(
                event,
                this.events.get(event)!.filter(cb => cb !== callback)
            );
        }
    }

    dispatch(event: string) {
        this.callStack.push(event);
        
        if (this.events.has(event)) {
            this.events.get(event)?.forEach(callback => callback());
        }
    }

    /**
     * Will return the event call stack for rendering inside of the profiler.
     */
    get getLeafCallStack(): string[] {
        return [...this.callStack];
    }
}

export default EventDispatcher;