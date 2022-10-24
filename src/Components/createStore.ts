import type { Schema, ComponentType, ComponentStore } from './types';
import type { World } from '../World';

export function createStore<T extends Schema>(
	world: World,
	ComponentType: ComponentType<T>,
): ComponentStore<T> {
	const count = world.config.getNewTableSize(0);
	const buffer = world.createBuffer(ComponentType.size * count);

	let offset = 0;

	return Object.entries(ComponentType.schema).reduce(
		(acc, [key, FieldConstructor]) => {
			acc[key] = new FieldConstructor(buffer, offset, count);
			offset += count * FieldConstructor.BYTES_PER_ELEMENT;
			return acc;
		},
		{} as ComponentStore<any>,
	);
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { struct } = await import('./struct');

	const mockWorld: World = {
		createBuffer: (l: number) => new ArrayBuffer(l),
		config: {
			getNewTableSize: () => 8,
		},
	} as any;

	it('returns an object with TypedArray keys for each field, using a single buffer', () => {
		@struct()
		class MyComponent {
			static size = 0;
			static schema = {};
			@struct.u8() declare unsigned1: number;
			@struct.u16() declare unsigned2: number;
			@struct.u32() declare unsigned3: number;
			@struct.u64() declare unsigned4: bigint;
			@struct.i8() declare int1: number;
			@struct.i16() declare int2: number;
			@struct.i32() declare int3: number;
			@struct.i64() declare int4: bigint;
			@struct.f32() declare float1: number;
			@struct.f64() declare float2: number;
		}
		const result = createStore<any>(mockWorld, MyComponent);

		expect(result.unsigned1).toBeInstanceOf(Uint8Array);
		expect(result.unsigned2).toBeInstanceOf(Uint16Array);
		expect(result.unsigned3).toBeInstanceOf(Uint32Array);
		expect(result.unsigned4).toBeInstanceOf(BigUint64Array);
		expect(result.int1).toBeInstanceOf(Int8Array);
		expect(result.int2).toBeInstanceOf(Int16Array);
		expect(result.int3).toBeInstanceOf(Int32Array);
		expect(result.int4).toBeInstanceOf(BigInt64Array);
		expect(result.float1).toBeInstanceOf(Float32Array);
		expect(result.float2).toBeInstanceOf(Float64Array);

		const buffer = result.unsigned1.buffer;
		for (const key in result) {
			expect(result[key].length).toBe(8);
			expect(result[key].buffer).toBe(buffer);
		}
	});
}
