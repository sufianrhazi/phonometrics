import * as React from 'react';
import { classes } from './react-utils';

export interface MidiPortProps {
    name: string | null;
    manufacturer: string | null;
    state: string;
    type: "input" | "output";
    onClick: () => void;
    isActive: boolean;
}

export class MidiPort extends React.Component<MidiPortProps,{}> {
    public render() {
        var name = this.props.name;
        if (this.props.manufacturer !== this.props.name) {
            name = `${this.props.manufacturer} ${this.props.name}`;
        } else {
            name = this.props.name
        }
        return <li onClick={this.props.onClick} className={classes('device', { "is-active": this.props.isActive })}>
            <div className="device-type">{this.props.type}</div>
            <div className="device-name">{name}</div>
        </li>;
    }
}