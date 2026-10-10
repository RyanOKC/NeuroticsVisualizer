declare module "butterchurn" {
  type Visualizer = {
    connectAudio(node: AudioNode): void;
    loadPreset(preset: object, blendTime: number): void;
    render(): void;
    setRendererSize(width: number, height: number, opts?: { pixelRatio?: number }): void;
  };

  export default class Butterchurn {
    static createVisualizer(
      context: AudioContext,
      canvas: HTMLCanvasElement,
      options: { width: number; height: number; pixelRatio?: number; textureRatio?: number },
    ): Visualizer;
  }
}

declare module "butterchurn-presets" {
  const pack: { getPresets(): Record<string, object> };
  export default pack;
}
