import * as React from "react";
import * as ReactDOM from "react-dom";

interface HelloWorldProps {
    name: string;
}

class HelloWorld extends React.Component<HelloWorldProps,undefined> {
    public render(): JSX.Element {
        return <h1>Hello, {this.props.name}!</h1>;
    }
}

export function render(target: HTMLElement): void {
    ReactDOM.render(<HelloWorld name="Sufian" />, target);
}