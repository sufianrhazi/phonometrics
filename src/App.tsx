import * as React from "react";
import * as ReactDOM from "react-dom";
import { DataModel } from './ApplicationDataModel';

/**
 * [x] MainFrame
 *   [ ] AudioControls (pause, step, rewind, fast-forward, play, stop, rec)
 *   [x] Input device selection
 *   [x] Output device selection
 *   [ ] Visualiation
 *     [x] Written (debug) log
 *     [ ] Piano Roll
 *     [ ] Rastrum (staff)
 */

import { MainFrame } from './views/MainFrame';

export async function render(target: HTMLElement): Promise<void> {
    var model = await DataModel.get();
    ReactDOM.render(<MainFrame
        model={model}
        />, target);
}