export function hex(number: number, leading: number, usePrefix: boolean = false): string {
	if (typeof(usePrefix) === 'undefined') {
		usePrefix = true;
	}
	if (typeof(leading) === 'undefined') {
		leading = 8;
	}
	const string = (number >>> 0).toString(16).toUpperCase();
	leading -= string.length;
	if (leading < 0)
		return string;
	return (usePrefix ? '0x' : '') + new Array(leading + 1).join('0') + string;
}


export class Serializer {
    static TYPE = 'application/octet-stream'

    static prefix(value: ArrayBuffer): Blob {
        return new Blob([Serializer.pack(value.byteLength), value], { type: Serializer.TYPE });
    }


    static pack(value: number): ArrayBuffer {
        const object = new DataView(new ArrayBuffer(4));
        object.setUint32(0, value, true);
        return object.buffer;
    }
}