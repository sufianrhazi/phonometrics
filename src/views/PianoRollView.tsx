import * as React from 'react';
import { DataModel, DataModelEvent } from '../ApplicationDataModel';

interface PianoRollViewProps {
    model: DataModel;
}

interface PianoRollViewState {
}

const ROW_HEIGHT = 8;
const KEY_BLACK_HEIGHT = 16;
const KEY_WHITE_HEIGHT = 24;
const KEY_WHITE_WIDTH = 80;
const KEY_BLACK_WIDTH = KEY_WHITE_WIDTH / 2; // sure, why not?
const KEY_RADIUS = 6;
const NUM_KEYS = 88;
const A0 = 21;
const KEY_NAMES = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'E#', 'F', 'G', 'G#']; // TODO: what about mapping to current key?

function noteName(note: number): string {
    var fromA0 = note - A0;
    var octave = Math.floor(fromA0 / 12);
    var key = fromA0 % 12;
    if (key < 0) key += 12;
    return `${KEY_NAMES[key]}-${octave}`;
}

function isBlack(note: number): boolean {
    var key = (note - A0) % 12;
    return key === 1 || key === 4 || key === 6 || key === 8 || key === 11;
}

export class PianoRollView extends React.Component<PianoRollViewProps, PianoRollViewState> {
    private canvasContext: CanvasRenderingContext2D | null;
    private scrollTop: number;
    private scrollLeft: number;

    constructor(props: PianoRollViewProps) {
        super(props);
        this.canvasContext = null;
        this.scrollTop = 0;
        this.scrollLeft = 0;
    }

    private setCanvas(el: HTMLCanvasElement) {
        if (el === null) {
            return;
        }
        this.canvasContext = el.getContext('2d');
        if (this.canvasContext === null) {
            throw new Error("Ugh no canvas context");
        }
    }

    private onMessage(msg: DataModelEvent) {
        if (msg === 'midiMessage') {
            this.updateCanvas();
        }
    }

    public componentWillMount() {
        this.props.model.subscribe(this.onMessage);
    }

    public componentDidMount() {
        this.updateCanvas();
    }

    public componentWillUnmount() {
        this.props.model.unsubscribe(this.onMessage);
    }

    public updateCanvas() {
        var ctx = this.canvasContext;
        if (ctx === null) return;
        ctx.save();
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
        this.drawKeys(ctx);
        this.drawTime(ctx);
        this.drawNames(ctx);
        this.drawNotes(ctx);
    }

    private drawWhiteKeyPath(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#DDDDDD'
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(KEY_WHITE_WIDTH, 0);
        ctx.arcTo(0, 0, 0, KEY_WHITE_HEIGHT, KEY_RADIUS);
        ctx.arcTo(0, KEY_WHITE_HEIGHT, KEY_WHITE_WIDTH, KEY_WHITE_HEIGHT, KEY_RADIUS);
        ctx.lineTo(KEY_WHITE_WIDTH, KEY_WHITE_HEIGHT);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    private drawBlackKeyPath(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#DDDDDD'
        ctx.fillStyle = '#222222';
        ctx.beginPath();
        ctx.moveTo(KEY_WHITE_WIDTH, 0);
        ctx.arcTo(KEY_WHITE_WIDTH - KEY_BLACK_WIDTH, 0, KEY_WHITE_WIDTH - KEY_BLACK_WIDTH, KEY_BLACK_HEIGHT, KEY_RADIUS);
        ctx.arcTo(KEY_WHITE_WIDTH - KEY_BLACK_WIDTH, KEY_BLACK_HEIGHT, KEY_WHITE_WIDTH, KEY_BLACK_HEIGHT, KEY_RADIUS);
        ctx.lineTo(KEY_WHITE_WIDTH, KEY_BLACK_HEIGHT);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    private drawKeys(ctx: CanvasRenderingContext2D) {
        // Drawing an endless piano can be done by:
        // 1) draw all of the white keys (all uniform in size, since this is endless we just need to adjust by offset)
        var firstKey = A0 + Math.floor(this.scrollTop / ROW_HEIGHT);
        var lastKey = firstKey + Math.ceil(ctx.canvas.height / ROW_HEIGHT);
        var yOffset = -(this.scrollTop % KEY_WHITE_HEIGHT);
        if (isBlack(firstKey)) {
            ctx.save();
            ctx.translate(0, yOffset - KEY_WHITE_HEIGHT);
            this.drawWhiteKeyPath(ctx);
            ctx.restore();            
        }
        for (let key = firstKey, y = yOffset; key <= lastKey; ++key) {
            if (!isBlack(key)) {
                ctx.save();
                ctx.translate(0, y);
                this.drawWhiteKeyPath(ctx);
                ctx.restore();
                y += KEY_WHITE_HEIGHT;
            }
        }
        // 2) draw all of the black keys on top of the white keys
        for (let key = firstKey, y = yOffset; key <= lastKey; ++key) {
            if (isBlack(key)) {
                ctx.save();
                ctx.translate(0, y - ROW_HEIGHT);
                this.drawBlackKeyPath(ctx);
                ctx.restore();
            } else {
                y += KEY_WHITE_HEIGHT;
            }
        }
    }

    private drawTime(ctx: CanvasRenderingContext2D) {
    }
    private drawNames(ctx: CanvasRenderingContext2D) {
    }
    private drawNotes(ctx: CanvasRenderingContext2D) {
    }

    public render(): JSX.Element {
        return <canvas
            width={800}
            height={600}
            ref={(el) => { if (el !== null) { this.setCanvas(el); } }}
            />;
    }
}