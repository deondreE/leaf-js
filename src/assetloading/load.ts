/** Idetifies where the data is stored, the returns that data to the client in chunks. */
class AssetLoader {
  constructor(dataType: 'static' | 'dyn' | 'cloudflare' | 's3') {}

  /** This will update the current scenes active data cache.  */
  async updateDataCache(): Promise<void> {}
}

export default AssetLoader;
