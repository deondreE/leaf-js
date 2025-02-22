export default class WorkQueue {
  wrkr: Worker;
  queue: Promise<unknown>;

  constructor(url: string | URL) {
    this.wrkr = new Worker(url);
    this.queue = new Promise<void>((resolve) => resolve()); //just put a resolved promise at the start of the chain.
  }

  send<T>(message: any, transfers?: Transferable[]): Promise<T> {
    const prom = new Promise<T>((resolve, reject) => {});
    this.queue = prom;
    return prom;
  }
}
