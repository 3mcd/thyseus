import { alignTo8 } from './alignTo8';

type Pointer = number;
export type MemoryViews = {
	buffer: ArrayBuffer;
	u8: Uint8Array;
	u16: Uint16Array;
	u32: Uint32Array;
	u64: BigUint64Array;
	i8: Int8Array;
	i16: Int16Array;
	i32: Int32Array;
	i64: BigInt64Array;
	f32: Float32Array;
	f64: Float64Array;
	dataview: DataView;
};

let buffer: ArrayBuffer;
let u8: Uint8Array;
let u32: Uint32Array;

const views = {} as MemoryViews;

const BLOCK_HEADER_SIZE = 8;
const BLOCK_FOOTER_POSITION = 4;
const BLOCK_METADATA_SIZE = 16;
const MINIMUM_BLOCK_SIZE = 24; // 16 + 8

/**
 * Initializes memory if it has not been initialized yet.
 * @param size The size (in bytes) to initialize.
 * @param isShared Whether this memory should use a `SharedArrayBuffer` (defaults to false).
 */
function init(size: number, isShared?: boolean): void;
/**
 * Initializes memory if it has not been initialized yet.
 * @param size The ArrayBuffer to initialize memory with.
 */
function init(buffer: ArrayBufferLike): void;
function init(
	sizeOrBuffer: number | ArrayBufferLike,
	isShared: boolean = false,
): void {
	if (buffer) {
		return;
	}
	if (typeof sizeOrBuffer === 'number') {
		const size = alignTo8(sizeOrBuffer);
		const bufferType = isShared ? SharedArrayBuffer : ArrayBuffer;
		buffer = new bufferType(size);
	} else {
		buffer = sizeOrBuffer;
	}

	u32 = new Uint32Array(buffer);
	u32[0] = buffer.byteLength;
	u32[u32.length - 1] = buffer.byteLength;
	u8 = new Uint8Array(buffer);
	views.buffer = buffer;
	views.u8 = u8;
	views.u16 = new Uint16Array(buffer);
	views.u32 = u32;
	views.u64 = new BigUint64Array(buffer);
	views.i8 = new Int8Array(buffer);
	views.i16 = new Int16Array(buffer);
	views.i32 = new Int32Array(buffer);
	views.i64 = new BigInt64Array(buffer);
	views.f32 = new Float32Array(buffer);
	views.f64 = new Float64Array(buffer);
	views.dataview = new DataView(buffer);
}

/**
 * Allocates the specified number of bytes and returns a pointer.
 *
 * Throws if there is not enough memory to allocate the specified size.
 *
 * @param size The size (in bytes) to allocate.
 * @returns A pointer.
 */
function alloc(size: number): Pointer {
	size = alignTo8(size);
	let pointer = 0;

	spinlock();
	while (pointer < buffer.byteLength) {
		const header = u32[pointer >> 2];
		const blockSize = header & ~1;
		const isBlockAllocated = header !== blockSize;
		const requiredSize = BLOCK_METADATA_SIZE + size;

		if (isBlockAllocated || blockSize < requiredSize) {
			pointer += blockSize;
			continue;
		}

		const shouldSplit = blockSize - requiredSize >= MINIMUM_BLOCK_SIZE;
		const newBlockSize = shouldSplit ? requiredSize : blockSize;

		u32[pointer >> 2] = newBlockSize | 1;
		u32[(pointer + newBlockSize - BLOCK_FOOTER_POSITION) >> 2] =
			newBlockSize | 1;

		if (shouldSplit) {
			const splitPointer = pointer + requiredSize;
			const splitBlockSize = blockSize - requiredSize;
			u32[splitPointer >> 2] = splitBlockSize;
			u32[(splitPointer + splitBlockSize - BLOCK_FOOTER_POSITION) >> 2] =
				splitBlockSize;
		}

		releaseLock();
		return pointer + BLOCK_HEADER_SIZE;
	}

	// TODO: Just return a null pointer?
	throw new Error(`Out of memory (needed ${size})!`);
}

/**
 * Frees a pointer, allowing the memory at that location to be used again.
 * @param pointer The pointer to free.
 */
function free(pointer: Pointer): void {
	let header = pointer - BLOCK_HEADER_SIZE;
	spinlock();
	let size = u32[header >> 2] & ~1;
	let footer = header + size - BLOCK_FOOTER_POSITION;
	u32[header >> 2] &= ~1;
	u32[footer >> 2] &= ~1;

	if (footer !== buffer.byteLength - BLOCK_FOOTER_POSITION) {
		const next = u32[(header + size) >> 2];
		if ((next & 1) === 0) {
			footer += next;
			size += next;
		}
	}

	if (header !== 0) {
		const prev = u32[(header - BLOCK_FOOTER_POSITION) >> 2];
		if ((prev & 1) === 0) {
			header -= prev;
			size += prev;
		}
	}
	u32[header >> 2] = size;
	u32[footer >> 2] = size;
	u8.fill(0, header + BLOCK_HEADER_SIZE, footer - BLOCK_HEADER_SIZE);
	releaseLock();
}

/**
 * Reallocates the memory at a pointer with a new size, copying data to the new location if necessary.
 *
 *  Throws if there is not enough memory to allocate the specified size.
 *
 * @param pointer The pointer to reallocate
 * @param newSize The new _total_ size (in bytes) to allocate.
 * @returns The new pointer.
 */
function realloc(pointer: Pointer, newSize: number): Pointer {
	// TODO: Allow realloc to shrink, if we're way under.
	newSize = alignTo8(newSize);
	spinlock();
	const header = pointer - BLOCK_HEADER_SIZE;
	const size = u32[header >> 2] & ~1;
	const payloadSize = size - BLOCK_METADATA_SIZE;
	if (payloadSize >= newSize) {
		releaseLock();
		return pointer;
	}

	// TODO: Bounds check
	const next = header + size;
	const nextSize = u32[next >> 2];

	if (
		(nextSize & 1) === 0 &&
		nextSize - BLOCK_METADATA_SIZE >= newSize - size
	) {
		const remainderSize = newSize - payloadSize;
		const shouldSplit = nextSize - remainderSize >= MINIMUM_BLOCK_SIZE;
		const newBlockSize = shouldSplit
			? newSize + BLOCK_METADATA_SIZE
			: size + nextSize;

		u32[next >> 2] = 0;
		u32[(next - BLOCK_FOOTER_POSITION) >> 2] = 0;

		u32[header >> 2] = newBlockSize | 1;
		u32[(header + newBlockSize - BLOCK_FOOTER_POSITION) >> 2] =
			newBlockSize | 1;

		if (shouldSplit) {
			const splitSize = size + nextSize - newBlockSize;
			u32[(header + newBlockSize) >> 2] = splitSize;
			u32[
				(header + newBlockSize + splitSize - BLOCK_FOOTER_POSITION) >> 2
			] = splitSize;
		}
		releaseLock();
		return pointer;
	}

	releaseLock();
	const newPointer = alloc(newSize);
	copy(pointer, payloadSize, newPointer);
	free(pointer);
	return newPointer;
}

/**
 * Copies memory from one location to another.
 * @param from The location to copy from.
 * @param length The length (in bytes) to copy.
 * @param to The destination to copy to.
 */
function copy(from: Pointer, length: number, to: Pointer) {
	u8.copyWithin(to, from, from + length);
}

/**
 * Sets memory in a range to a particular value.
 * @param from The location to start setting at.
 * @param length The number of bytes to set.
 * @param value The value to set them to.
 */
function set(from: Pointer, length: number, value: number) {
	u8.fill(value, from, from + length);
}

/**
 * **UNSAFE**
 *
 * Clears all allocated memory, resetting the entire buffer as if it were just initialized.
 * Previous pointers will no longer be safe to use and could result in memory corruption.
 */
function UNSAFE_CLEAR_ALL() {
	if (buffer) {
		set(0, buffer.byteLength, 0);
		u32[0] = buffer.byteLength;
		u32[u32.length - 1] = buffer.byteLength;
	}
}

export const memory = {
	init,

	alloc,
	free,
	realloc,

	copy,
	set,

	views,

	UNSAFE_CLEAR_ALL,
};
export type Memory = typeof memory;

function spinlock() {}
function releaseLock() {}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect, beforeEach } = import.meta.vitest;

	beforeEach(() => memory.UNSAFE_CLEAR_ALL());

	describe('alloc', () => {
		it('returns a pointer', () => {
			memory.init(256);
			const ptr1 = memory.alloc(8);
			expect(ptr1).toBe(8);

			const ptr2 = memory.alloc(16);
			expect(ptr2).toBe(32);
		});

		it('yields a full block if splitting is too small', () => {});
	});

	describe('free', () => {
		it('clears a block and allows it to be allocated again', () => {
			memory.init(256);
			const ptr1 = memory.alloc(8);
			expect(ptr1).toBe(8);

			memory.free(ptr1);
			const ptr2 = memory.alloc(8);
			expect(ptr2).toBe(8);
		});

		it('collects the next block if free', () => {
			memory.init(256);
			const ptr1 = memory.alloc(8);
			expect(ptr1).toBe(8);

			memory.free(ptr1);
			const ptr2 = memory.alloc(16);
			expect(ptr2).toBe(8);
		});

		it('collects the previous block if free', () => {
			memory.init(256);
			const ptr1 = memory.alloc(8);
			expect(ptr1).toBe(8);
			const ptr2 = memory.alloc(8);
			expect(ptr2).toBe(32);

			memory.free(ptr1);
			memory.free(ptr2);

			const ptr3 = memory.alloc(16);
			expect(ptr3).toBe(8);
		});
	});

	describe('realloc', () => {
		it('returns the same pointer if allocated block is large enough already', () => {
			memory.init(256);
			const ptr = memory.alloc(3); // This is pushed to 8
			const newPtr = memory.realloc(ptr, 5);
			expect(newPtr).toBe(ptr);
			const newerPtr = memory.realloc(newPtr, 7);
			expect(newerPtr).toBe(ptr);
			const newestPtr = memory.realloc(newerPtr, 7);
			expect(newestPtr).toBe(ptr);
		});

		it('returns the same pointer if following block can be used', () => {
			memory.init(256);
			const ptr = memory.alloc(8);
			const newPtr = memory.realloc(ptr, 16);
			expect(newPtr).toBe(ptr);
		});

		it('returns the same pointer and entire following block, if necessary', () => {
			memory.init(256);
			const ptr1 = memory.alloc(8);
			const ptr2 = memory.alloc(8);
			const heldPtr = memory.alloc(8);
			memory.free(ptr2);
			const ptr1Grow = memory.realloc(ptr1, 12);
			expect(ptr1Grow).toBe(ptr1);
		});
	});
}