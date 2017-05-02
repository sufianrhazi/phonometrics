interface Navigator {
    requestMIDIAccess(options?: MIDIOptions): Promise<MIDIAccess>;
}

interface MIDIOptions {
    sysex: boolean;
}

type EventHandler<T> = (event: T) => boolean;

type MIDIInputMap = Map<string, MIDIInput>;
type MIDIOutputMap = Map<string, MIDIOutput>;

type MIDISuccessCallback = (access: MIDIAccess, options: MIDIOptions) => void;

interface MIDIAccess extends EventTarget {
    readonly inputs: MIDIInputMap;
    readonly outputs: MIDIOutputMap;
    onstatechange: EventHandler<MIDIConnectionEvent>;
    readonly sysexEnabled: boolean;
}

type MIDIPortType = "input" | "output";
type MIDIPortDeviceState = "disconnected" | "connected";
type MIDIPortConnectionState = "open" | "closed" | "pending";

interface MIDIPort extends EventTarget {
    readonly id: string;
    readonly manufacturer: string | null;
    readonly name: string | null;
    readonly type: MIDIPortType;
    readonly version: string | null;
    readonly state: MIDIPortDeviceState;
    readonly connection: MIDIPortConnectionState;
    onstatechange: EventHandler<MIDIConnectionEvent>;
    open(): Promise<MIDIPort>;
    close(): Promise<MIDIPort>;
}

interface MIDIInput extends MIDIPort {
    onmidimessage: EventHandler<MIDIMessageEvent>;
}

interface MIDIOutput extends MIDIPort {
    send(data: number[] | Uint8Array, timestamp?: number): void;
    clear(): void;
}

interface MIDIMessageEvent extends Event {
    readonly receivedTime: number;
    readonly data: Uint8Array;
}

interface MIDIMessageEventInit extends EventInit {
    receivedTime: number;
    data: Uint8Array;
}

interface MIDIConnectionEvent extends Event {
    readonly port: MIDIPort;
}

interface MIDIConnectionEventInit extends EventInit {
    port: MIDIPort;
}