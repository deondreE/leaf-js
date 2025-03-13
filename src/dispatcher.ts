enum DispatcherStatus {
  IDLE,
  STARTING,
  RUNNING,
  DONE,
}

/** WorkDispatcher is a class that calls any function that is in zig, dispatching to another langauge the workload. */
class WorkDispatcher {
  private cur_job: string | '' = '';
  private job_queue: any | null = null;

  constructor(job: string) {}

  /** 'Builds', the platform of LeafJS, in wasm. */
  async build(): Promise<void> {
    // fetch the .wasm lib from the public GitHub uri, copy it and put it in the public directory.
    const github_uri = 'http://github.com/deondreE/leaf-js';
  }

  /** Reads the leaf.wasm that is inputted into your `/public` directory at runtime. */
  async call(job: string): Promise<void> {}

  check(funcName: string): DispatcherStatus {
    return DispatcherStatus.IDLE;
  }
}

export default WorkDispatcher;
