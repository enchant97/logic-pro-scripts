/*
Poly Aftertouch -> MPE Converter
Assigns each note its own channel and converts Poly AT to Channel Pressure.
MPE zone: channels 2–16 (channel 1 = master).

Usage:
    1. Add Scripter to top of MIDI effects for instrument
    2. Right-Click on Scripter and enable "Record MIDI to Track Here"
    3. Make sure MIDI controller is set to Poly Aftertouch
    4. Record as normal
*/

var NOTE_CHANNEL_MAP = {};
var CHANNEL_NOTE_MAP = {};
var FREE_CHANNELS = [];

var MPE_FIRST_CHANNEL = 2;
var MPE_LAST_CHANNEL = 16;

var PluginParameters = [
    {
        name: "First MPE Channel",
        type: "lin",
        minValue: 2,
        maxValue: 16,
        numberOfSteps: 14,
        defaultValue: 2,
    },
    {
        name: "Last MPE Channel",
        type: "lin",
        minValue: 2,
        maxValue: 16,
        numberOfSteps: 14,
        defaultValue: 16,
    },
];

function ResetChannels() {
    FREE_CHANNELS = [];
    for (var ch = MPE_FIRST_CHANNEL; ch <= MPE_LAST_CHANNEL; ch++) {
        FREE_CHANNELS.push(ch);
    }
}

function ParameterChanged(param, value) {
    if (param === 0) {
        MPE_FIRST_CHANNEL = Math.round(value);
    } else if (param === 1) {
        MPE_LAST_CHANNEL = Math.round(value);
    } else if (MPE_LAST_CHANNEL < MPE_FIRST_CHANNEL) {
        MPE_LAST_CHANNEL = MPE_FIRST_CHANNEL;
    }
    ResetChannels();
}

function allocateChannel(note) {
    if (FREE_CHANNELS.length === 0) return null;
    var ch = FREE_CHANNELS.shift();
    NOTE_CHANNEL_MAP[note] = ch;
    CHANNEL_NOTE_MAP[ch] = note;
    return ch;
}

function releaseChannel(note) {
    var ch = NOTE_CHANNEL_MAP[note];
    if (ch !== undefined) {
        FREE_CHANNELS.push(ch);
        delete NOTE_CHANNEL_MAP[note];
        delete CHANNEL_NOTE_MAP[ch];
    }
}

function HandleMIDI(event) {
    if (event instanceof NoteOn) {
        var ch = allocateChannel(event.pitch);
        if (ch === null) return; // no free channels left
        event.channel = ch;
        event.send();
        return;
    }
    if (event instanceof NoteOff) {
        var ch = NOTE_CHANNEL_MAP[event.pitch];
        if (ch !== undefined) {
            event.channel = ch;
            event.send();
            releaseChannel(event.pitch);
        }
        return;
    }
    if (event instanceof PolyPressure) {
        var ch = NOTE_CHANNEL_MAP[event.pitch];
        if (ch === undefined) return;
        var pressure = new ChannelPressure();
        pressure.channel = ch;
        pressure.value = event.value;
        pressure.send();
        return;
    }
    event.send();
}

ResetChannels();
