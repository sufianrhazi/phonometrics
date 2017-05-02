/// <reference path="webmidi.d.ts" />

var freq12TetBase: number = Math.pow(2, 1/12);
function midiFrequency(numSemitones: number) {
    return 440 * Math.pow(freq12TetBase, numSemitones - 69); // 440 hz A4 = midi 69
};

function midiVelocityToGain(velocity: number): number {
    return Math.pow(10, (velocity / 127) - 1);
}

interface Note {
    onTime: number;
    offTime: number;
    oscillator: OscillatorNode;
    gain: GainNode;
}

class Synth {
    private audioContext: AudioContext;
    private keyNotes: Map<number,Note[]>;
    private sustainStart: number;
    private sustainStop: number;

    constructor(audioContext: AudioContext) {
        this.audioContext = audioContext;
        this.keyNotes = new Map(); // key to [{ onTime, offTime, oscillator, gain }]
        this.sustainStart = Infinity;
        this.sustainStop = Infinity;
    }

    private getNotes(midiNote: number): Note[] {
        var notes = this.keyNotes.get(midiNote);
        if (notes === undefined) {
            notes = [];
            this.keyNotes.set(midiNote, notes);
        }
        return notes;
    }

    public off(midiNote: number, when: number) {
        var notes = this.getNotes(midiNote);
        if (when < this.sustainStart || when >= this.sustainStop) {
            notes.forEach((note) => {
                note.offTime = when;
                note.gain.gain.exponentialRampToValueAtTime(0.01, when + 0.1);
                note.gain.gain.linearRampToValueAtTime(0, when + 0.15);
                note.oscillator.stop(when + 0.15);
            });
            notes.length = 0; // TODO this is gross
        } else {
            notes.forEach(function (note) {
                note.offTime = when;
            });
        }
        // TODO: do I need to garbage collect the stopped oscillator and gain from the graph?
    }

    public sustainOn(timestamp: number) {
        this.sustainStart = timestamp;
    }

    public sustainOff(timestamp: number) {
        this.sustainStop = timestamp;
        for (let [midiNote, notes] of this.keyNotes.entries()) {
            // remove an item from an array
            var i = 0;
            var len = notes.length;
            while (i < len) {
                var note = notes[i];
                if (note.offTime < timestamp) {
                    note.oscillator.stop(timestamp); // TODO: this is copy-pasted
                    note.gain.gain.exponentialRampToValueAtTime(0.01, timestamp + 0.1);
                    note.gain.gain.linearRampToValueAtTime(0, timestamp + 0.15);
                    note.oscillator.stop(timestamp + 0.15);
                    notes[i] = notes[len - 1]; // NOTE: THIS DOES NOT PRESERVE ORDER
                    len--;
                }
                i += 1;
            }
            notes.length = len;
        }
    }

    public on(midiNote: number, velocity: number, when: number) {
        var notes = this.getNotes(midiNote);
        if (velocity === 0) {
            this.off(midiNote, when);
        } else {
            var note = {
                onTime: when,
                offTime: Infinity,
                oscillator: this.audioContext.createOscillator(),
                gain: this.audioContext.createGain(),
            };
            note.oscillator.type = 'triangle';
            note.oscillator.frequency.setValueAtTime(midiFrequency(midiNote), this.audioContext.currentTime);
            // TODO: make a better envelope
            note.gain.gain.setValueAtTime(0, this.audioContext.currentTime);
            var gain = midiVelocityToGain(velocity);
            note.gain.gain.linearRampToValueAtTime(gain, this.audioContext.currentTime + 0.02);
            note.gain.gain.linearRampToValueAtTime(0.8 * gain, this.audioContext.currentTime + 0.02 + 0.02);
            note.gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.02 + 0.02 + 10);
            note.oscillator.connect(note.gain);
            note.gain.connect(this.audioContext.destination);
            note.oscillator.start(when);
            notes.push(note);
        }
    }
}

var fakeMidiPortId = 1;

export class FakeMidiPort implements EventTarget, MIDIOutput {
    private audioContext: AudioContext;
    private startTime: number;
    private onStateChange: EventHandler<MIDIConnectionEvent>[];
    private timeoutHandle: number | null;
    private synth: Synth;
    private openPromise: Promise<MIDIPort> | null;

    public readonly id: string;
    public readonly manufacturer: string;
    public readonly name: string;
    public readonly type: MIDIPortType;
    public readonly version: string;

    private _state: MIDIPortDeviceState;
    public get state(): MIDIPortDeviceState {
        return this._state;
    }

    private _connection: MIDIPortConnectionState;
    public get connection(): MIDIPortConnectionState {
        return this._connection;
    }

    public get onstatechange(): EventHandler<MIDIConnectionEvent> {
        return this.onStateChange[0];
    }

    public set onstatechange(handler: EventHandler<MIDIConnectionEvent>) {
        this.addEventListener('statechange', handler);
    }

    constructor(audioContext: AudioContext) {
        this.audioContext = audioContext;
        this.startTime = performance.now(); // everything should be relative to here
        this.onStateChange = [];
        this.timeoutHandle = null;
        this.synth = new Synth(audioContext);
        this._state = 'connected';
        this._connection = 'closed';
        this.id = 'FakeMidiPort:' + (fakeMidiPortId++);
        this.manufacturer = 'FakeMidi';
        this.name = 'FakeMidi';
        this.type = 'output';
        this.version = '1.0';
        this.openPromise = null;
    }

    addEventListener(name: string, handler: EventHandler<MIDIConnectionEvent>, bubbles?: boolean): void {
        if (name !== 'statechange') {
            throw new Error('No such event name ' + name);
        }
        this.onStateChange.push(handler);
    }

    removeEventListener(name: string, handler: EventHandler<MIDIConnectionEvent>, bubbles?: boolean): void {
        if (name !== 'statechange') {
            throw new Error('No such event name ' + name);
        }
        this.onStateChange = this.onStateChange.filter((existingHandler) => existingHandler !== handler);
    }

    dispatchEvent(event: MIDIConnectionEvent): boolean {
        this.onStateChange.forEach((handler) => {
            handler(event);
        });
        return false;
    }

    open(): Promise<MIDIPort> {
        if (this.openPromise) {
            return this.openPromise;
        }
        this._connection = 'pending';
        this.openPromise = new Promise((resolve, reject) => {
            this._connection = 'open';
            resolve(this);
        });
        return this.openPromise;
    }

    close(): Promise<MIDIPort> {
        this.openPromise = null;
        this._connection = 'pending';
        return new Promise((resolve, reject) => {
            this._connection = 'closed';
            resolve(this);
        });
    }

    send(data: number[] | Uint8Array, timestamp?: number) {
        if (timestamp === undefined) {
            timestamp = this.audioContext.currentTime;
        } else {
            timestamp = (timestamp - this.startTime) / 1000;
        }
        switch (data[0]) {
            case 0x80: // Note off (channel 1)
                this.synth.on(data[1], 0, timestamp);
                break;
            case 0x90: // Note on (channel 1)
                this.synth.on(data[1], data[2], timestamp);
                break;
            case 0xb0: // Control (channel 1)
                switch (data[1]) {
                    case 0x40: // Damper Petal
                        switch (data[2]) {
                            case 0x00:
                                this.synth.sustainOff(timestamp);
                                break;
                            case 0x7f:
                                this.synth.sustainOn(timestamp);
                                break;
                            default:
                                console.warn("Ignoring unknown MIDI data", data);
                        }
                        break;
                    default:
                        console.warn("Ignoring unknown MIDI data", data);
                }
                break;
            case 0xfe: // Active Sensing
                break;
            default:
                console.warn("Ignoring unknown MIDI data", data);
        }
    }

    clear(): void {
        // TODO: implement
        if (this.timeoutHandle !== null) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = null;
        }
    }
}