(function (exports) {
    var privates = new WeakMap();

    var freq12TetBase = Math.pow(2, 1/12);
    function midiFrequency(numSemitones) {
	return 440 * Math.pow(freq12TetBase, numSemitones - 69); // 440 hz A4 = midi 69
    };

    function lerp(low, hi, val) {
        return ((hi - low) * val) + low;
    }

    function Synth(audioContext) {
        var private = {
            audioContext: audioContext,
            keyNotes: new Map(), // key to [{ active, oscillator, gain }]
        };
        privates.set(this, private);
    }
    Object.assign(Synth.prototype, {
        _getNotes: function (midiNote) {
            var private = privates.get(this);
            var notes = private.keyNotes.get(midiNote);
            if (notes === undefined) {
                notes = [];
                private.keyNotes.set(midiNote, notes);
            }
            return notes;
        },
        off: function (midiNote, when) {
            var private = privates.get(this);
            var notes = this._getNotes(midiNote);
            notes.forEach(function (note) {
                note.active = false;
                note.oscillator.stop(when);
            });
            notes.length = 0; // TODO this is gross
            // TODO: do I need to garbage collect the stopped oscillator and gain from the graph?
        },
        on: function (midiNote, velocity, when) {
            var private = privates.get(this);
            var notes = this._getNotes(midiNote);
            if (velocity === 0) {
                this.off(midiNote, when);
            } else {
                var note = {
                    active: true,
                    oscillator: private.audioContext.createOscillator(),
                    gain: private.audioContext.createGain(),
                };
                note.oscillator.frequency.setValueAtTime(midiFrequency(midiNote), private.audioContext.currentTime);
                note.gain.gain.setValueAtTime(velocity / 127, private.audioContext.currentTime);
                note.oscillator.connect(note.gain);
                note.gain.connect(private.audioContext.destination);
                note.oscillator.start(when);
                console.log(private.audioContext.currentTime, when);
                console.log(note, midiFrequency(midiNote));
                notes.push(note);
            }
        }
    });

    var fakeMidiPortId = 1;
    function FakeMidiPort(audioContext) {
        var private = {
            audioContext: audioContext,
            startTime: performance.now(), // everything should be relative to here
            onStateChange: [],
            timeoutHandle: null,
            synth: new Synth(audioContext),
            state: 'connected',
            connection: 'closed',
        };
        privates.set(this, private);
        Object.defineProperties(this, {
            id: {
                value: 'FakeMidiPort:' + (fakeMidiPortId++),
            },
            manufacturer: {
                value: 'FakeMidi',
            },
            name: {
                value: 'FakeMidi',
            },
            type: {
                value: 'output',
            },
            version: {
                value: '1.0',
            },
            state: {
                get: function () {
                    return private.state;
                },
            },
            connection: {
                get: function () {
                    return private.connection;
                },
            },
            onstatechange: {
                get: function () {
                    return private.onStateChange[0];
                },
                set: function (handler) {
                    this.addEventListener('statechange', handler);
                }.bind(this),
            },
        });
    }
    FakeMidiPort.prototype = Object.assign(Object.create(EventTarget.prototype), {
        addEventListener: function (name, handler, bubbles) {
            var private = privates.get(this);
            if (name !== 'statechange') {
                throw new ValueError('No such event name ' + name);
            }
            private.onStateChange.push(handler);
        },
        removeEventListener: function (name, handler, bubbles) {
            var private = privates.get(this);
            if (name !== 'statechange') {
                throw new ValueError('No such event name ' + name);
            }
            private.onStateChange = private.onStateChange.filter(function (existingHandler) {
                return existingHandler !== handler;
            });
        },
        dispatchEvent: function (name, event) {
            var private = privates.get(this);
            if (name !== 'statechange') {
                throw new ValueError('No such event name ' + name);
            }
            private.onStateChange.forEach(function (handler) {
                handler(event);
            });
        },
        open: function () {
            var private = privates.get(this);
            if (private.openPromise) {
                return private.openPromise;
            }
            private.connection = 'pending';
            private.openPromise = new Promise(function (resolve, reject) {
                private.connection = 'open';
                resolve(this);
            }.bind(this));
            return private.openPromise;
        },
        close: function () {
            var private = privates.get(this);
            private.openPromise = null;
            private.connection = 'pending';
            return new Promise(function (resolve, reject) {
                private.connection = 'close';
                resolve(this);
            }.bind(this));
        },
        send: function (data, timestamp) {
            var private = privates.get(this);
            if (timestamp === undefined) {
                timestamp = private.audioContext.currentTime;
            } else {
                timestamp = (timestamp - private.startTime) / 1000;
            }
            switch (data[0]) {
                case 0x80: // Note off (channel 1)
                    private.synth.on(data[1], 0, timestamp);
                    break;
                case 0x90: // Note on (channel 1)
                    private.synth.on(data[1], data[2], timestamp);
                    break;
                case 0xb0: // Control (channel 1)
                    switch (data[1]) {
                        case 0x40: // Damper Petal
                            switch (data[2]) {
                                case 0:
                                    console.warn('Imagine the damper is down');
                                    break;
                                case 127:
                                    console.warn('Imagine the damper is up');
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
        },
        clear: function () {
            // TODO: implement
            var private = privates.get(this);
            if (private.timeoutHandle !== null) {
                clearTimeout(private.timeoutHandle);
                private.timeoutHandle = null;
            }
        }
    });
    
    exports.FakeMidiPort = FakeMidiPort;
})(window);
