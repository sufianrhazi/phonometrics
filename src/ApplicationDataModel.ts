import { MidiMessage } from './MidiMessages';
import { FakeMidiPort } from './fakemidi';
import { pad } from './strutil';

function formatDate(date: Date): string {
    return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth(), 2)}-${pad(date.getUTCDay(), 2)} ${pad(date.getUTCHours(), 2)}:${pad(date.getUTCMinutes(), 2)}:${pad(date.getUTCSeconds(), 2)}.${pad(date.getUTCMilliseconds(), 3)}`;
}

export enum DebugLevel {
    INFO,
    WARNING,
    ERROR,
}

export interface LogMessage {
    id: number; // this is such react bullshit; can't key take objects?
    when: string;
    message: string;
    level: DebugLevel;
}

export type DataModelEvent = 'inputDevice' | 'inputDevices' | 'outputDevice' | 'outputDevices' | 'log' | 'midiMessage';

export interface ApplicationState {
    // Audio controls
    isPlaying: boolean;
    playStartTime: number | null;
    isRecording: boolean;
    recordingStartTime: number | null;

    // Audio devices
    inputDevices: MIDIInput[];
    inputDevice: MIDIInput | null;
    outputDevices: MIDIOutput[];
    outputDevice: MIDIOutput | null;

    // Playback and recording
    messages: MidiMessage[];

    // Logging
    logLevel: DebugLevel;
    logMessages: LogMessage[];
}

export class DataModel {
    public state: ApplicationState;
    private logId: number;
    private subscribers: ((name: DataModelEvent) => void)[];
    private constructor(state: ApplicationState) {
        this.logId = 0;
        this.state = state;
        this.subscribers = [];
    }
    
    public subscribe(listener: (name: DataModelEvent) => void) {
        this.subscribers.push(listener);
    }

    public unsubscribe(listener: (name: DataModelEvent) => void) {
        this.subscribers = this.subscribers.filter(subscriber => subscriber !== listener);
    }

    private dispatch(name: DataModelEvent) {
        this.subscribers.forEach(listener => listener(name));
    }

    public static async initial(): Promise<DataModel> {
        var midiAccess: MIDIAccess = await navigator.requestMIDIAccess({ sysex: false });
        var inputs: MIDIInput[] = Array.from(midiAccess.inputs.values());
        var audioContext: AudioContext = new AudioContext();
        var fakeMidiOutput: MIDIOutput = new FakeMidiPort(audioContext);
        var outputs: MIDIOutput[] = [fakeMidiOutput].concat(Array.from(midiAccess.outputs.values()));
        var dataModel = new DataModel({
            isPlaying: false,
            playStartTime: null,
            isRecording: false,
            recordingStartTime: null,

            inputDevices: inputs,
            inputDevice: null,
            outputDevices: outputs,
            outputDevice: null,

            messages: [],

            logLevel: DebugLevel.INFO,
            logMessages: [],
        });
        midiAccess.addEventListener('statechange', (event: MIDIConnectionEvent) => {
            if (event.port.type === 'input') {
                if (event.port.state === 'connected') {
                    dataModel.state.inputDevices.push(event.port as MIDIInput);
                } else {
                    dataModel.state.inputDevices = dataModel.state.inputDevices.filter(device => device !== event.port);
                    if (dataModel.state.inputDevice === event.port) {
                        dataModel.state.inputDevice = null;
                        dataModel.dispatch('inputDevice');
                    }
                }
                dataModel.dispatch('inputDevices');
            } else {
                if (event.port.state === 'connected') {
                    dataModel.state.outputDevices.push(event.port as MIDIOutput);
                } else {
                    dataModel.state.outputDevices = dataModel.state.outputDevices.filter(device => device !== event.port);
                    if (dataModel.state.outputDevice === event.port) {
                        dataModel.state.outputDevice = null;
                        dataModel.dispatch('outputDevice');
                    }
                }
                dataModel.dispatch('outputDevices');
            }
        });
        return dataModel;
    }

    public static singleton: Promise<DataModel> | null = null;
    public static async get(): Promise<DataModel> {
        if (this.singleton === null) {
            this.singleton = DataModel.initial();
        }
        return this.singleton;
    }

    public log(level: DebugLevel, message: string): void {
        this.state.logMessages.unshift({
            id: this.logId++,
            when: formatDate(new Date()),
            message,
            level,
        });
        this.dispatch('log');
    }

    public getInputDevice(): MIDIInput | null {
        return this.state.inputDevice;
    }

    public setInputDevice(device: MIDIInput | null) {
        var needsEvent = device !== this.state.inputDevice;
        this.state.inputDevice = device;
        if (needsEvent) {
            this.dispatch('inputDevice');
        }
    }

    public getOutputDevice(): MIDIOutput | null {
        return this.state.outputDevice;
    }

    public setOutputDevice(device: MIDIOutput | null) {
        var needsEvent = device !== this.state.outputDevice;
        this.state.outputDevice = device;
        if (needsEvent) {
            this.dispatch('outputDevice');
        }
    }
}