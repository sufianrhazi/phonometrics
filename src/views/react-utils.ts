type ClassNameEntry = string | { [name: string]: boolean };
export function classes(...entries: ClassNameEntry[]): string {
    var collected = [];
    for (let entry of entries) {
        if (typeof entry === 'string') {
            collected.push(entry);
        } else {
            for (let key in entry) {
                if (entry[key]) {
                    collected.push(key);
                }
            }
        }
    }
    return collected.join(' ');
}