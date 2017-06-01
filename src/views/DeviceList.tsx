import * as React from 'react';
import { MidiPort } from './MidiPort';

export interface DeviceListProps {
    type: "input" | "output"
    devices: MIDIPort[];
    activeDevice: MIDIPort | null;
    onClick: (device: MIDIPort) => void;
}

export class DeviceList extends React.Component<DeviceListProps, {}> {
    public constructor(props: DeviceListProps) {
        super(props);
    }

    public render() {
        return <div>
            <h2>{this.props.type} devices</h2>
            <ol>
                {this.props.devices.map(
                    device => <MidiPort
                        name={device.name}
                        manufacturer={device.manufacturer}
                        state={device.state}
                        type={device.type}
                        key={device.id}
                        onClick={() => this.props.onClick(device)}
                        isActive={device === this.props.activeDevice}
                        />)}
            </ol>
        </div>;
    }
}