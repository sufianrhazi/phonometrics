export function pad(number: number|string, places: number, filler: string="0"): string {
    return (filler.repeat(places) + number.toString()).slice(-places);
}