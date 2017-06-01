export interface MidiMessage {
    ms: number;
    us: number;
    data: number[];
}

export class MidiMessages {
    private messages: MidiMessage[];
    private isEPlaying: boolean;
    private isSustainActive: boolean;

    constructor() {
        this.messages = [];
        this.isEPlaying = false;
        this.isSustainActive = false;
    }

    public get(index: number): MidiMessage {
        return this.messages[index];
    }

    public get length(): number {
        return this.messages.length;
    }

    private log(msg: string): void {
        console.log(msg);
    }

    public serialize(): string {
        return JSON.stringify(this.messages);
    }

    public static load(source: string): MidiMessages {
        var data = JSON.parse(source);
        if (!Array.isArray(data)) {
            throw new Error('Invalid input');
        }
        var messages = new MidiMessages();
        for (var message of data) {
            if (
                (typeof message.ms === 'number') &&
                (typeof message.us === 'number') &&
                Array.isArray(message.data) &&
                message.data.every((item: number) => typeof item === 'number')
            ) {
                var when = message.ms + (message.us/1000);
                messages.add(when, message.data);
            } else {
                throw new Error('Invalid input');
            }
        }
        return messages;
    }

    public add(when: number, msg: Uint8Array) {
        if (msg.length == 1 && msg[0] == 0xfe) {
            // Active Sensing is useless
            return;
        }

        if ((msg[0] == 0x90 || msg[0] == 0xb0) && msg[1] == 0x40) {
            if (msg[2] == 0x00) {
                // If we're not playing a key, and sustain is active, it's a pedal release
                if (!this.isEPlaying && this.isSustainActive) {
                    msg[0] = 0xb0;
                    this.isSustainActive = false;
                }
                if (this.isEPlaying && msg[0] == 0x90) {
                    this.isEPlaying = false;
                }
            } else if (msg[2] == 0x7f) {
                if (this.isEPlaying) {
                    // Definitely a sustain
                    this.log('Adjusting false key press to sustain pedal down');
                    this.isSustainActive = true;
                    msg[0] = 0xb0;
                } else {
                    this.log('Possibly incorrectly adjusting false key press to sustain pedal down');
                    // Most likely this is a sustain
                    this.isSustainActive = true;
                    msg[0] = 0xb0;
                }
            } else {
                if (msg[0] == 0xb0) {
                    throw new Error("Woah there, there's another hardware bug!");
                }
                // We're playing a key
                this.isEPlaying = true;
            }
        }
        this.log('Message: ' + JSON.stringify(Array.from(msg)) + ' ' + when);
        this.messages.push({
            ms: Math.trunc(when),
            us: Math.round((when - Math.trunc(when)) * 1000),
            data: Array.from(msg)
        });
    }

    public clear(): void {
        this.messages = [];
    }
}