var IS_DEBUG = false;

export class Logger {
    private logEl: HTMLElement;

    constructor(logEl: HTMLElement) {
        this.logEl = logEl;
    }

    public log(msg: string, isImportant: boolean=false): void {
        if (isImportant || IS_DEBUG) {
            this.logEl.textContent = msg + '\n' + this.logEl.textContent;
        }        
    }
}