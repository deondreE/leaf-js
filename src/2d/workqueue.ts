export default class WorkQueue {
  wrkr: Worker;
  queue: Promise<void>;

  constructor(url: string | URL) {
    this.wrkr = new Worker(url);
    this.queue = new Promise<void>((resolve) => resolve()); //just put a resolved promise at the start of the chain.
  }

  /**
   * When a message is posted it waits for the previous promise to resolve. 
   * each post results in another promise. in addition this results in the entire queue halting if an error is encountered.
   * @param message 
   * @param transfers 
   * @returns 
   */
  post<T>(message: any, transfers: Transferable[]=[]): Promise<T> {
    const prom = this.queue.then(()=>new Promise<T>((resolve, reject) => {
      this.wrkr.onmessage = e => resolve(e.data);
      this.wrkr.onerror = e => reject(e);
      this.wrkr.postMessage(message, transfers);
    }));
    this.queue = prom.then(); 
    return prom;
  }
}
