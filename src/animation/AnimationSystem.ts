import {
  AnimationConfig,
  AnimationTrack,
  Keyframe,
} from "../types/scene.types";
import { lerp } from "../utils/math";

export default class AnimationSystem {
  private tracks: AnimationTrack[];
  private startTime: number | null = null;
  private duration: number | null = null;
  private enabled: boolean;

  constructor(config: AnimationConfig) {
    this.tracks = config.tracks;
    this.duration = config.duration;
    this.enabled = config.enabled;
  }

  start() {
    if (!this.enabled) return;
    this.startTime = performance.now();
  }

  stop() {
    this.startTime = null;
  }

  update(timestamp: number, sceneObjects: Map<string, any>) {
    if (!this.enabled || this.startTime === null) return;

    const elapsed = (timestamp - this.startTime) / 1000;
    const t = elapsed % this.duration!;

    for (const track of this.tracks) {
      const obj = sceneObjects.get(track.target);
      if (!obj) continue;
      const currentValue = this.interpolate(track.keyframes, t, track.easing);

      // Apply the value to the property path (e.g: "position.x");
      const [prop, axis] = track.property.split(".");
      if (obj[prop] && axis in obj[prop]) {
        // needs to be the typeof the value because value is any.
        obj[prop][axis as keyof typeof prop] = currentValue;
      }
    }
  }

  private interpolate(
    keyframes: Keyframe<number>[],
    time: number,
    easing: AnimationTrack["easing"] = "linear",
  ): number {
    if (keyframes.length < 2) return keyframes[0]?.value ?? 0;

    let i = 0;
    while (i < keyframes.length - 1 && time > keyframes[i + 1].time) {
      ++i;
    }
    const a = keyframes[i];
    const b = keyframes[i + 1] ?? a;

    const span = b.time - a.time;
    const localT = span === 0 ? 0 : (time - a.time) / span;

    const easedT =
      easing === "easeIn"
        ? localT * localT
        : easing === "easeOut"
          ? localT * (2 - localT)
          : localT;

    return lerp(a.value, b.value, easedT);
  }
}
