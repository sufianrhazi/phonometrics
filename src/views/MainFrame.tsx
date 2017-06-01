import * as React from 'react';
import { AudioControls, AudioControlsAction } from './AudioControls';
import { DeviceList } from './DeviceList';
import { TabView } from './TabView';
import { DataModel, DebugLevel, LogMessage } from '../ApplicationDataModel';
import { DebugLogView } from './DebugLogView';

export interface MainFrameProps {
    model: DataModel;
}

export interface MainFrameState {
    inputDevices: MIDIInput[];
    inputDevice: MIDIInput | null;
    outputDevices: MIDIOutput[];
    outputDevice: MIDIOutput | null;
    logLevel: DebugLevel;
    logMessages: LogMessage[];
}

export class MainFrame extends React.Component<MainFrameProps, MainFrameState> {
    public constructor(props: MainFrameProps) {
        super(props);
        this.onModelChange = this.onModelChange.bind(this);
    }

    private onModelChange(msg: string) {
        switch (msg) {
            case 'inputDevices':
                this.setState({
                    inputDevices: this.props.model.state.inputDevices,
                });
                break;
            case 'outputDevices':
                this.setState({
                    outputDevices: this.props.model.state.outputDevices,
                });
                break;
            case 'inputDevice':
                this.setState({
                    inputDevice: this.props.model.state.inputDevice,
                });
                break;
            case 'outputDevice':
                this.setState({
                    outputDevice: this.props.model.state.outputDevice,
                });
                break;
            case 'log':
                this.setState({
                    logMessages: this.props.model.state.logMessages,
                });
                break;
            default:
                this.props.model.log(DebugLevel.WARNING, `DataModel unhandled message: ${msg}`);
        }
    }

    public componentWillMount() {
        this.setState({
            inputDevices: this.props.model.state.inputDevices,
            inputDevice: this.props.model.state.inputDevice,
            outputDevices: this.props.model.state.outputDevices,
            outputDevice: this.props.model.state.outputDevice,
            logLevel: this.props.model.state.logLevel,
            logMessages: this.props.model.state.logMessages,
        });
        this.props.model.subscribe(this.onModelChange);
    }

    public componentWillUnmount() {
        this.props.model.unsubscribe(this.onModelChange);
    }

    private handleInputDeviceClick(device: MIDIPort) {
        var active = this.props.model.getInputDevice();
        if (active === device) {
            this.props.model.setInputDevice(null);
        } else {
            this.props.model.setInputDevice(device as MIDIInput);
        }
    }

    private handleOutputDeviceClick(device: MIDIPort) {
        var active = this.props.model.getOutputDevice();
        if (active === device) {
            this.props.model.setOutputDevice(null);
        } else {
            this.props.model.setOutputDevice(device as MIDIOutput);
        }
    }

    public render() {
        return <div>
            <AudioControls
                onAction={(action) => this.onAction(action)}
                isFastForwardDisabled={false}
                isPauseDisabled={false}
                isPlayDisabeld={false}
                isRecordDisabled={false}
                isRewindDisabled={false}
                isStepDisabled={false}
                isStopDisabled={false}
                />
            <DeviceList
                type="input"
                devices={this.state.inputDevices}
                activeDevice={this.state.inputDevice}
                onClick={(device) => this.handleInputDeviceClick(device)}
                />
            <DeviceList
                type="output"
                devices={this.state.outputDevices}
                activeDevice={this.state.outputDevice}
                onClick={(device) => this.handleOutputDeviceClick(device)}
                />
            <TabView
                debugLevel={DebugLevel.INFO} 
                logMessages={this.state.logMessages}
                />
        </div>;
    }

    private onAction(action: AudioControlsAction) {
        this.props.model.log(DebugLevel.INFO, `Button action: ${action}`);
    }
}