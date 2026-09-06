export class LatestRequestTracker<Key> {
  private readonly versions = new Map<Key, number>();

  begin(key: Key) {
    const version = (this.versions.get(key) ?? 0) + 1;
    this.versions.set(key, version);
    return version;
  }

  isLatest(key: Key, version: number) {
    return this.versions.get(key) === version;
  }
}
