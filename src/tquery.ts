type Constructor<T> = Function & { new(...args: any[]): T, prototype: T };

function isConstructedBy<T>(instance: any, klass: Constructor<T>): instance is T {
    return instance instanceof klass;
}

function allAre<V>(instanceArray: any[], typeCheck: (t: any, v: Constructor<V>) => t is V, thing: Constructor<V>): instanceArray is V[] {
    for (let instance of instanceArray) {
        if (!typeCheck(instance, thing)) {
            return false;
        }
    }
    return true;
}

export function domOne<T extends Element>(kind: Constructor<T>, selector: string): T {
    return domOneFrom(kind, document, selector);
}

export function domOneFrom<T extends Element>(kind: Constructor<T>, root: Element | Document, selector: string): T {
    var el = root.querySelector(selector);
    if (el === null) {
        throw new Error(`Selector "${selector}" not found`);
    }
    if (!isConstructedBy(el, kind)) {
        throw new Error(`Element at selector "${selector}" is not a ${kind.name}`);
    }
    return el;
}

export function domAll<T extends Element>(kind: Constructor<T>, selector: string): T[] {
    return domAllFrom(kind, document, selector);
}

export function domAllFrom<T extends Element>(kind: Constructor<T>, root: Element | Document, selector: string): T[] {
    var els = Array.from(root.querySelectorAll(selector));
    if (!allAre<T>(els, isConstructedBy, kind)) {
        throw new Error(`Element at selector "${selector}" is not a ${kind.name}`);
    }
    return els;
}

export function domOnOne(root: Element | Document, type: string, selector: string, handler: (event: Event) => boolean, capture: boolean=false): void {
    root.addEventListener(type, function (event) {
        for (let potential of domAllFrom(Element, root, selector)) {
            if (event.target === potential) {
                return handler(event);
            }
        }
        return false;
    }, capture);
}

export function domOn(type: string, selector: string, handler: (event: Event) => boolean): void {
    domOnOne(document, type, selector, handler);
}