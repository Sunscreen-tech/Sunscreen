// Settings for Overlap Removal process. Usage of the properties depends on the algorithm.
export class OverlapRemovalSettings {
  epsilon = 0.01

  iterationsMax = 1000

  stopOnMaxIterat = false

  nodeSeparation = 4

  randomizationSeed = 1

  workInInches: boolean

  private randomizationShift = 0.1

  // If true, the overlap iteration process stops after maxIterat iterations.
  public get StopOnMaxIterat(): boolean {
    return this.stopOnMaxIterat
  }
  public set StopOnMaxIterat(value: boolean) {
    this.stopOnMaxIterat = value
  }

  // Epsilon
  public get Epsilon(): number {
    return this.epsilon
  }
  public set Epsilon(value: number) {
    this.epsilon = value
  }

  // Number of maxIterat to be made. In each iteration overlap is partly removed.
  public get IterationsMax(): number {
    return this.iterationsMax
  }
  public set IterationsMax(value: number) {
    this.iterationsMax = value
  }

  // Minimal distance between nodes.
  public get NodeSeparation(): number {
    return this.nodeSeparation
  }
  public set NodeSeparation(value: number) {
    this.nodeSeparation = value
  }

  //
  public get RandomizationSeed(): number {
    return this.randomizationSeed
  }
  public set RandomizationSeed(value: number) {
    this.randomizationSeed = value
  }

  //
  public get RandomizationShift(): number {
    return this.randomizationShift
  }
  public set RandomizationShift(value: number) {
    this.randomizationShift = value
  }

  // Clones the settings together with the stressmajorization settings
  public Clone(): OverlapRemovalSettings {
    const settings: OverlapRemovalSettings = new OverlapRemovalSettings()
    settings.Epsilon = this.Epsilon
    settings.IterationsMax = this.IterationsMax
    settings.StopOnMaxIterat = this.StopOnMaxIterat
    settings.NodeSeparation = this.NodeSeparation
    settings.RandomizationSeed = this.RandomizationSeed
    settings.RandomizationShift = this.randomizationShift
    return settings
  }
}
