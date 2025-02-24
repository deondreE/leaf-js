export default class WorkQueue {
  wrkr: Worker;
  queue: Promise<void>;

  constructor(url: string | URL) {
    const cached = WorkQueue.cache.get(url);
    if(cached) {
      cached.terminate();
    }

    this.wrkr = new Worker(url);
    this.queue = new Promise<void>((resolve) => resolve()); //just put a resolved promise at the start of the chain.
    WorkQueue.cache.set(url, this);
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

  terminate(){
    this.wrkr.terminate();
  }

  //The cache prevents multiple workers queues from using the same source. 
  static cache: Map<string | URL, WorkQueue> = new Map();

}
