
class Serializer {
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