(function () {
    var IS_DEBUG = false;
    var recordEl = document.getElementById('save');
    var exportEl = document.getElementById('export');
    var midiMessages = [];
    save.addEventListener('click', function () {
        exportEl.textContent = JSON.stringify(midiMessages);
        midiMessages = [];
    });

    var startEl = document.getElementById('start');
    startEl.addEventListener('click', function () {
        startEl.disabled = true;
        start();
    });

    var playEl = document.getElementById('play');
    playEl.addEventListener('click', function () {
        var toOutput = JSON.parse(exportEl.value);
        play(toOutput);
    });

    var playEl = document.getElementById('play-software');
    playEl.addEventListener('click', function () {
        var toOutput = JSON.parse(exportEl.value);
        var audioContext = new AudioContext();
        var fakeMidi = new FakeMidiPort(audioContext);
        play(toOutput, fakeMidi);
    });

    var logEl = document.getElementById('log');
    function log(msg, isDebug) {
        if (!isDebug || IS_DEBUG) {
            logEl.textContent = msg + '\n' + logEl.textContent;
        }
    }

    function fmtData(data) {
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

    function fmtPort(port) {
        return `<${port.type}:${port.id}>`;
    }

    function logPort(port, msg) {
        if (msg !== undefined) {
            msg += ' ';
        }
        var portStr = fmtPort(port);
        log(`${msg}${portStr}: ${port.state},${port.connection}`);
    }

    var listening = new Set();
    function stopListeningOn(inputPort) {
        if (listening.has(inputPort)) {
            listening.remove(inputPort);
        }
    }
    function listenForEvents(inputPort) {
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
                    midiMessages.push({
                        ms: Math.trunc(timestamp),
                        us: Math.round((timestamp - Math.trunc(timestamp)) * 1000),
                        data: Array.from(event.data)
                    });
                    var midiData = fmtData(event.data);
                    log(`${portStr} ${midiData} @${timestamp}`, true);
                }
            })
            .catch(function () {
                listening.remove(inputPort);
            });
    }

    function initialize(onInput, onOutput) {
        log('Requesting MIDI Access (without sysex)...');
        return navigator.requestMIDIAccess({ sysex: false })
            .then(function (midiAccess) {
                log('Obtained MIDI access');
                log('# inputs: ' + midiAccess.inputs.size);
                midiAccess.inputs.forEach(function (inputPort) {
                    logPort(inputPort, 'Found');
                    onInput(inputPort, true);
                });
                log('# outputs: ' + midiAccess.outputs.size);
                midiAccess.outputs.forEach(function (outputPort) {
                    logPort(outputPort, 'Found');
                    onOutput(outputPort, true);
                });
                midiAccess.onstatechange = function (event) {
                    logPort(event.port, 'Discovered');
                    if (event.port.state === 'disconnected') {
                        if (event.port.type === 'input') {
                            onInput(event.port, false);
                        } else if (event.port.type === 'output') {
                            onOutput(event.port, false);
                        }
                    } else if (event.port.state === 'connected') {
                        if (event.port.type === 'input') {
                            onInput(event.port, true);
                        } else if (event.port.type === 'output') {
                            onOutput(event.port, true);
                        }
                    }
                };
            }, function (e) {
                log('MIDI access denied');
                log(e.toString());
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

    function play(messages, fakePort) {
        var firstOutputPort = null;
        var timeoutHandle = null;
        var startTime = null;
        var lastIndex = null;

        if (fakePort) { // TODO: refactor so this is less gross
            firstOutputPort = fakePort;
            firstOutputPort.open()
                .then(function () {
                    startTime = performance.now();
                    lastIndex = 0;
                    update();
                });
            return;
        }

        initialize(function (inputPort, isConnected) {
        }, function (outputPort, isConnected) {
            if (isConnected) {
                if (firstOutputPort === null) {
                    firstOutputPort = outputPort;
                    firstOutputPort.open()
                        .then(function () {
                            startTime = performance.now();
                            lastIndex = 0;
                            update();
                        });
                }
            } else {
                if (firstOutputPort === outputPort) {
                    clearTimeout(timeoutHandle);
                    timeoutHandle = null;
                }
            }
        });

        function update() {
            var firstMessageTime = (messages[0].ms * 1000 + messages[0].us) / 1000;
            var now = performance.now();
            var delta = now - startTime;
            log('At ' + delta);
            var toSend = [];
            for (var i = lastIndex; i < messages.length; ++i) {
                var messageDelta = ((messages[i].ms * 1000 + messages[i].us) / 1000) - firstMessageTime;
                if (messageDelta < delta + 200) {
                    toSend.push({
                        data: messages[i].data,
                        when: messageDelta - delta
                    });
                    lastIndex = i + 1;
                }
            }
            log('Sending ' + JSON.stringify(toSend));
            toSend.forEach(function (message) {
                firstOutputPort.send(message.data, now + message.when);
            });
            if (lastIndex < messages.length - 1) {
                timeoutHandle = setTimeout(update, 100);
            }
        }
    }
}());
