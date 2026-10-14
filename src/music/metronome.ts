export class WebMetronome {
  private audioCtx: AudioContext | null = null
  private isRunning: boolean = false
  private bpm: number = 100
  private beatsPerMeasure: number = 4
  private currentBeat: number = 0
  private nextBeatTime: number = 0
  private timerId: number | null = null
  private onBeatCallback?: (beat: number) => void
  private isMuted: boolean = false

  constructor(bpm = 100, beatsPerMeasure = 4) {
    this.bpm = bpm
    this.beatsPerMeasure = beatsPerMeasure
  }

  public setOnBeat(cb: (beat: number) => void) {
    this.onBeatCallback = cb
  }

  public setBpm(bpm: number) {
    this.bpm = Math.max(30, Math.min(260, bpm))
  }

  public getBpm(): number {
    return this.bpm
  }

  public setBeatsPerMeasure(beats: number) {
    this.beatsPerMeasure = beats
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted
  }

  public start() {
    if (this.isRunning) return
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!this.audioCtx) {
      this.audioCtx = new AudioContextClass()
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }

    this.isRunning = true
    this.currentBeat = 0
    this.nextBeatTime = this.audioCtx.currentTime + 0.05
    this.schedule()
  }

  public stop() {
    this.isRunning = false
    if (this.timerId !== null) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
  }

  public toggle(): boolean {
    if (this.isRunning) {
      this.stop()
      return false
    } else {
      this.start()
      return true
    }
  }

  public getStatus(): boolean {
    return this.isRunning
  }

  private schedule = () => {
    if (!this.isRunning || !this.audioCtx) return

    while (this.nextBeatTime < this.audioCtx.currentTime + 0.1) {
      this.playTick(this.nextBeatTime, this.currentBeat)
      
      const secondsPerBeat = 60.0 / this.bpm
      this.nextBeatTime += secondsPerBeat
      this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure
    }

    this.timerId = window.setTimeout(this.schedule, 25)
  }

  private playTick(time: number, beat: number) {
    if (!this.audioCtx) return

    // Visual trigger callback scheduled
    const delay = Math.max(0, (time - this.audioCtx.currentTime) * 1000)
    setTimeout(() => {
      if (this.isRunning && this.onBeatCallback) {
        this.onBeatCallback(beat)
      }
    }, delay)

    if (this.isMuted) return

    const osc = this.audioCtx.createOscillator()
    const gain = this.audioCtx.createGain()

    // Accented high pitch on beat 0 (1st beat of measure)
    const isFirstBeat = beat === 0
    osc.frequency.setValueAtTime(isFirstBeat ? 1000 : 750, time)

    gain.gain.setValueAtTime(isFirstBeat ? 0.8 : 0.4, time)
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04)

    osc.connect(gain)
    gain.connect(this.audioCtx.destination)

    osc.start(time)
    osc.stop(time + 0.05)
  }
}
