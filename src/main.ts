/// <reference path="webmidi.d.ts" />

import { FakeMidiPort } from "./fakemidi";
import { MidiMessages } from "./MidiMessages";
import { Logger } from "./Logger";
import { domOne, domAll } from "./tquery";
import { render } from "./App";

render(domOne(HTMLElement, "#react-start"));

var logger = new Logger(domOne(HTMLElement, '#log'));

var midiMessages = new MidiMessages();

var exportEl = domOne(HTMLTextAreaElement, '#export');

var recordEl = domOne(HTMLButtonElement, '#save');
recordEl.addEventListener('click', function () {
    exportEl.textContent = midiMessages.serialize();
    midiMessages.clear();
});

var startEl = domOne(HTMLButtonElement, '#start');
startEl.addEventListener('click', function () {
    startEl.disabled = true;
    start();
});

var playEl = domOne(HTMLButtonElement, '#play');
playEl.addEventListener('click', function () {
    var messages = MidiMessages.load(exportEl.value);
    play(messages, null);
});

var playEl = domOne(HTMLButtonElement, '#play-software');
playEl.addEventListener('click', function () {
    var messages = MidiMessages.load(exportEl.value);
    var audioContext = new AudioContext();
    var fakeMidi = new FakeMidiPort(audioContext);
    play(messages, fakeMidi);
});


function fmtData(data: Uint8Array) {
    var str = '';
    for (var i = 0; i < data.length; ++i) {
        if (i > 0) {
            str += ' ';
        }
        if (data[i] < 16) {
            str += '0';
        }
        str += data[i].toString(16);
    }
    return str;
}

function fmtPort(port: MIDIPort) {
    return `<${port.type}:${port.id}>`;
}

function logPort(port: MIDIPort, msg: string) {
    if (msg !== undefined) {
        msg += ' ';
    }
    var portStr = fmtPort(port);
    logger.log(`${msg}${portStr}: ${port.state},${port.connection}`);
}

var listening = new Set();
function stopListeningOn(inputPort: MIDIInput) {
    if (listening.has(inputPort)) {
        listening.delete(inputPort);
    }
}
function listenForEvents(inputPort: MIDIInput) {
    logPort(inputPort, 'Listening');
    if (listening.has(inputPort)) {
        return;
    }
    listening.add(inputPort);
    inputPort.open()
        .then(function () {
            listening.add(inputPort);
            inputPort.onmidimessage = function (event) {
                var timestamp = event.receivedTime;
                if (timestamp === undefined) {
                    // receivedTime is not set on Chrome, as DOM Event timestamps are high resolution: https://bugs.chromium.org/p/chromium/issues/detail?id=599335
                    timestamp = event.timeStamp;
                }
                var portStr = fmtPort(inputPort);
                midiMessages.add(timestamp, event.data);
                var midiData = fmtData(event.data);
                logger.log(`${portStr} ${midiData} @${timestamp}`, true);
                return false;
            }
        })
        .catch(function () {
            listening.delete(inputPort);
        });
}

type InputHandler = (port: MIDIInput, isConnected: boolean) => void;
type OutputHandler = (port: MIDIOutput, isConnected: boolean) => void;

function initialize(onInput: InputHandler, onOutput: OutputHandler): Promise<void> {
    logger.log('Requesting MIDI Access (without sysex)...');
    return navigator.requestMIDIAccess({ sysex: false })
        .then(function (midiAccess) {
            logger.log('Obtained MIDI access');
            logger.log('# inputs: ' + midiAccess.inputs.size);
            midiAccess.inputs.forEach(function (inputPort) {
                logPort(inputPort, 'Found');
                onInput(inputPort, true);
            });
            logger.log('# outputs: ' + midiAccess.outputs.size);
            midiAccess.outputs.forEach(function (outputPort) {
                logPort(outputPort, 'Found');
                onOutput(outputPort, true);
            });
            midiAccess.onstatechange = function (event) {
                var port = event.port;
                logPort(port, 'Discovered');
                if (port.type === 'input') {
                    onInput(<MIDIInput>port, port.state === "connected");
                } else if (event.port.type === 'output') {
                    onOutput(<MIDIOutput>port, port.state === "connected");
                }
                return false;
            };
        }, function (e) {
            logger.log('MIDI access denied');
            logger.log(e.toString());
            throw e;
        });
}

function start() {
    initialize(function (inputPort, isConnected) {
        if (isConnected) {
            listenForEvents(inputPort);
        } else {
            stopListeningOn(inputPort);
        }
    }, function (outputPort, isConnected) {
    });
}

function play(messages: MidiMessages, fakePort: MIDIOutput | null) {
    var firstOutputPort: MIDIOutput | null = null;
    var timeoutHandle: number | null = null;
    var startTime: number | null;
    var lastIndex: number | null = null;

    if (fakePort) { // TODO: refactor so this is less gross
        firstOutputPort = fakePort;
        fakePort.open()
            .then(function () {
                startTime = performance.now();
                lastIndex = 0;
                update(fakePort);
            });
        return;
    }

    initialize(function (inputPort, isConnected) {
    }, function (outputPort, isConnected) {
        if (isConnected) {
            if (firstOutputPort === null) {
                firstOutputPort = outputPort;
                outputPort.open()
                    .then(function () {
                        startTime = performance.now();
                        lastIndex = 0;
                        update(outputPort);
                    });
            }
        } else {
            if (firstOutputPort === outputPort) {
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }
                timeoutHandle = null;
            }
        }
    });

    function update(port: MIDIOutput) {
        var firstMessageTime = (messages.get(0).ms * 1000 + messages.get(0).us) / 1000;
        var now = performance.now();
        if (startTime === null) {
            throw new Error(`This should never happen, startTime is null`);
        }
        if (lastIndex === null) {
            throw new Error(`This should never happen, lastIndex is null`);
        }
        var delta = now - startTime;
        log('At ' + delta);
        var toSend = [];
        for (var i = lastIndex; i < messages.length; ++i) {
            var message = messages.get(i);
            var messageDelta = ((message.ms * 1000 + message.us) / 1000) - firstMessageTime;
            if (messageDelta < delta + 200) {
                toSend.push({
                    data: message.data,
                    when: messageDelta - delta
                });
                lastIndex = i + 1;
            }
        }
        log('Sending ' + JSON.stringify(toSend));
        toSend.forEach(function (message) {
            port.send(message.data, now + message.when);
        });
        if (lastIndex < messages.length - 1) {
            timeoutHandle = setTimeout(() => update(port), 100);
        }
    }
}