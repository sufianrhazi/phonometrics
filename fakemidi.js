(function (exports) {
    var privates = new WeakMap();

    var freq12TetBase = Math.pow(2, 1/12);
    function midiFrequency(numSemitones) {
	return 440 * Math.pow(freq12TetBase, numSemitones - 69); // 440 hz A4 = midi 69
    };

    function lerp(low, hi, val) {
        return ((hi - low) * val) + low;
    }

    function midiVelocityToGain(velocity) {
        return Math.pow(10, (velocity / 127) - 1);
    }

    function Synth(audioContext) {
        var private = {
            audioContext: audioContext,
            keyNotes: new Map(), // key to [{ onTime, offTime, oscillator, gain }]
            sustainStart: Infinity,
            sustainStop: Infinity,
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
            if (when < private.sustainStart || when >= private.sustainStop) {
                notes.forEach(function (note) {
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
        },
        sustainOn: function (timestamp) {
            var private = privates.get(this);
            private.sustainStart = timestamp;
        },
        sustainOff: function (timestamp) {
            var private = privates.get(this);
            private.sustainStop = timestamp;
            Array.from(private.keyNotes.entries()).forEach(function (entry) {
                var midiNote = entry[0];
                var notes = entry[1];
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
            });
        },
        on: function (midiNote, velocity, when) {
            var private = privates.get(this);
            var notes = this._getNotes(midiNote);
            if (velocity === 0) {
                this.off(midiNote, when);
            } else {
                var note = {
                    onTime: when,
                    offTime: Infinity,
                    oscillator: private.audioContext.createOscillator(),
                    gain: private.audioContext.createGain(),
                };
                note.oscillator.type = 'triangle';
                note.oscillator.frequency.setValueAtTime(midiFrequency(midiNote), private.audioContext.currentTime);
                // TODO: make a better envelope
                note.gain.gain.setValueAtTime(0, private.audioContext.currentTime);
                var gain = midiVelocityToGain(velocity);
                note.gain.gain.linearRampToValueAtTime(gain, private.audioContext.currentTime + 0.02);
                note.gain.gain.linearRampToValueAtTime(0.8 * gain, private.audioContext.currentTime + 0.02 + 0.02);
                note.gain.gain.exponentialRampToValueAtTime(0.01, private.audioContext.currentTime + 0.02 + 0.02 + 10);
                note.oscillator.connect(note.gain);
                note.gain.connect(private.audioContext.destination);
                note.oscillator.start(when);
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
                                    private.synth.sustainOff(timestamp);
                                    break;
                                case 127:
                                    private.synth.sustainOn(timestamp);
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
