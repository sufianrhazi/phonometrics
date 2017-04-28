(function () {
    var IS_DEBUG = false;
    var recordEl = document.getElementById('save');
    var exportEl = document.getElementById('export');
    var midiMessages = [];
    save.addEventListener('click', function () {
        exportEl.textContent = JSON.stringify(midiMessages);
        midiMessages = [];
    });

    var logEl = document.getElementById('log');
    function log(msg, isDebug) {
        if (!isDebug || IS_DEBUG) {
            logEl.textContent = msg + '\n' + logEl.textContent;
        }
    }
    log('Requesting MIDI Access (without sysex)...');

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

    navigator.requestMIDIAccess({ sysex: false })
        .then(function (midiAccess) {
            log('Obtained MIDI access');
            log('# inputs: ' + midiAccess.inputs.size);
            midiAccess.inputs.forEach(function (inputPort) {
                logPort(inputPort, 'Found');
                listenForEvents(inputPort);
            });
            log('# outputs: ' + midiAccess.outputs.size);
            midiAccess.outputs.forEach(function (outputPort) {
                logPort(outputPort, 'Found');
            });
            midiAccess.onstatechange = function (event) {
                logPort(event.port, 'Discovered');
                if (event.port.state === 'disconnected') {
                    if (event.port.type === 'input') {
                        stopListeningOn(event.port);
                    }
                } else if (event.port.state === 'connected') {
                    if (event.port.type === 'input') {
                        listenForEvents(event.port);
                    }
                }
            };
        }, function (e) {
            log('MIDI access denied');
            log(e.toString());
            throw e;
        });
}());
