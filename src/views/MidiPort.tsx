import * as React from 'react';

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
        return <li onClick={this.props.onClick} >
            <p>{this.props.type} {this.props.isActive ? "ACTIVE" : ""}</p>
            <p>Name: {this.props.name}</p>
            <p>Manufacturer: {this.props.manufacturer}</p>
            <p>State: {this.props.state}</p>
        </li>
    }
}