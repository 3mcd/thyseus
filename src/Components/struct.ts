import { addField, TYPE_IDS, resetFields } from './addField';
import type { Class } from '../Resources';
import type {
	ComponentStore,
	ComponentType,
	TypedArray,
	TypedArrayConstructor,
} from './types';

type DiscriminatedUnion<L, R> =
	| (L & { [Key in keyof R]?: never })
	| (R & { [Key in keyof L]?: never });

export function struct() {
	return function structDecorator(targetClass: Class): any {
		const { schema, size, alignment } = resetFields();
		return class extends targetClass {
			static schema = schema | ((targetClass as any).schema ?? 0);
			static size = size;
			static alignment = alignment;

			__$$s: ComponentStore;
			__$$b: number;
			#index: number;
			get __$$i() {
				return this.#index;
			}
			set __$$i(value: number) {
				this.#index = value;
				this.__$$b = value * (this.constructor as any).size;
			}

			constructor(store: ComponentStore, index: number) {
				super();
				this.__$$s = store;
				this.#index = index;
				this.__$$b = index * (this.constructor as any).size;
			}
		};
	};
}
function createPrimativeFieldDecorator(
	type: TypedArrayConstructor,
	storeKey: keyof typeof TYPE_IDS,
) {
	return function () {
		return function fieldDecorator(
			prototype: object,
			propertyKey: string | symbol,
		) {
			const offset = addField(
				propertyKey,
				type.BYTES_PER_ELEMENT,
				type.BYTES_PER_ELEMENT,
				TYPE_IDS[storeKey],
			);
			const shift = 31 - Math.clz32(type.BYTES_PER_ELEMENT);

			Object.defineProperty(prototype, propertyKey, {
				enumerable: true,
				get() {
					return this.__$$s[storeKey][
						(this.__$$b >> shift) + offset[propertyKey]
					];
				},
				set(value: number) {
					this.__$$s[storeKey][
						(this.__$$b >> shift) + offset[propertyKey]
					] = value;
				},
			});
		};
	};
}

struct.u8 = createPrimativeFieldDecorator(Uint8Array, 'u8');
struct.u16 = createPrimativeFieldDecorator(Uint16Array, 'u16');
struct.u32 = createPrimativeFieldDecorator(Uint32Array, 'u32');
struct.u64 = createPrimativeFieldDecorator(BigUint64Array, 'u64');
struct.i8 = createPrimativeFieldDecorator(Int8Array, 'i8');
struct.i16 = createPrimativeFieldDecorator(Int16Array, 'i16');
struct.i32 = createPrimativeFieldDecorator(Int32Array, 'i32');
struct.i64 = createPrimativeFieldDecorator(BigInt64Array, 'i64');
struct.f32 = createPrimativeFieldDecorator(Float32Array, 'f32');
struct.f64 = createPrimativeFieldDecorator(Float64Array, 'f64');
struct.bool = function () {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		const offset = addField(
			propertyKey,
			Uint8Array.BYTES_PER_ELEMENT,
			Uint8Array.BYTES_PER_ELEMENT,
			TYPE_IDS.u8,
		);

		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				return !!this.__$$s.u8[this.__$$b + offset[propertyKey]];
			},
			set(value: boolean) {
				this.__$$s.u8[this.__$$b + offset[propertyKey]] = Number(value);
			},
		});
	};
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
struct.string = function ({
	characterCount,
	byteLength,
}: DiscriminatedUnion<{ byteLength: number }, { characterCount: number }>) {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		byteLength ??= characterCount! * 3;
		const offset = addField(
			propertyKey,
			Uint8Array.BYTES_PER_ELEMENT,
			byteLength,
		);

		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				return decoder
					.decode(
						this.__$$s.u8.subarray(
							this.__$$b + offset[propertyKey],
							this.__$$b + offset[propertyKey] + byteLength!,
						),
					)
					.split('\u0000')[0];
			},
			set(value: string) {
				encoder.encodeInto(
					value,
					this.__$$s.u8
						.subarray(
							this.__$$b + offset[propertyKey],
							this.__$$b + offset[propertyKey] + byteLength!,
						)
						.fill(0),
				);
			},
		});
	};
};
const typeToConstructor = {
	u8: Uint8Array,
	u16: Uint16Array,
	u32: Uint32Array,
	u64: BigUint64Array,
	i8: Int8Array,
	i16: Int16Array,
	i32: Int32Array,
	i64: BigInt64Array,
	f32: Float32Array,
	f64: Float64Array,
} as const;
struct.array = function (typeName: keyof typeof TYPE_IDS, length: number) {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		const typeConstructor = typeToConstructor[typeName];
		const offset = addField(
			propertyKey,
			typeConstructor.BYTES_PER_ELEMENT,
			typeConstructor.BYTES_PER_ELEMENT * length,
			TYPE_IDS[typeName],
		);
		const shift = 31 - Math.clz32(typeConstructor.BYTES_PER_ELEMENT);
		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				return this.__$$s[typeName].subarray(
					(this.__$$b >> shift) + offset[propertyKey],
					(this.__$$b >> shift) + offset[propertyKey] + length,
				);
			},
			set(value: TypedArray) {
				this.__$$s[typeName].set(
					value.subarray(0, length),
					(this.__$$b >> shift) + offset[propertyKey],
				);
			},
		});
	};
};
struct.component = function (componentType: ComponentType) {
	return function fieldDecorator(
		prototype: object,
		propertyKey: string | symbol,
	) {
		const offset = addField(
			propertyKey,
			componentType.alignment!,
			componentType.size!,
			componentType.schema!,
		);
		Object.defineProperty(prototype, propertyKey, {
			enumerable: true,
			get() {
				const val: any = new componentType(this.__$$s, 0, {} as any);
				val.__$$b =
					this.__$$b + offset[propertyKey] * componentType.alignment!;
				return val;
			},
			set(value: any) {
				this.__$$s.u8.set(
					value.__$$s,
					this.__$$b + offset[propertyKey] * componentType.alignment!,
				);
			},
		});
	};
};

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

	@struct()
	class Vec3 {
		declare static schema: number;
		declare __$$i: number;
		@struct.f64() declare x: number;
		@struct.f64() declare y: number;
		@struct.f64() declare z: number;
		constructor(store: ComponentStore, index: number) {}
	}

	it('adds a schema, size, and alignment to decorated classes', () => {
		@struct()
		class CompA {}

		@struct()
		class CompB {
			@struct.i32() declare myField: number;
		}

		@struct()
		class CompC {
			@struct.u8() declare myField: number;
			@struct.u16() declare myField2: number;
			@struct.f64() declare myField3: number;
		}

		expect(CompA).toHaveProperty('schema', 0);
		expect(CompA).toHaveProperty('size', 0);
		expect(CompA).toHaveProperty('alignment', 1);

		expect(CompB).toHaveProperty('schema', TYPE_IDS.i32);
		expect(CompB).toHaveProperty('size', 4);
		expect(CompB).toHaveProperty('alignment', 4);

		expect(CompC).toHaveProperty(
			'schema',
			TYPE_IDS.u8 | TYPE_IDS.u16 | TYPE_IDS.f64,
		);
		expect(CompC).toHaveProperty('size', 16);
		expect(CompC).toHaveProperty('alignment', 8);
	});

	it('creates a getter/setter around fields', () => {
		expect(Vec3).toHaveProperty('schema', TYPE_IDS.f64);

		const buffer = new ArrayBuffer(2 * 8 * 3);
		const store = {
			buffer,
			u8: new Uint8Array(buffer),
			f64: new Float64Array(buffer),
		};
		store.f64[0] = 1;
		store.f64[1] = 2;
		store.f64[2] = 3;

		const vec = new Vec3(store, 0);

		expect(vec.x).toBe(1);
		expect(vec.y).toBe(2);
		expect(vec.z).toBe(3);

		vec.x = Math.PI;
		expect(vec.x).toBe(Math.PI);

		vec.__$$i = 1;

		expect(vec.x).toBe(0);
		expect(vec.y).toBe(0);
		expect(vec.z).toBe(0);

		vec.y = 8;

		expect(vec.x).toBe(0);
		expect(vec.y).toBe(8);
		expect(vec.z).toBe(0);
	});

	it('works with every primitive decorators', () => {
		const fields = [
			[struct.bool, 'u8', Uint8Array, false, true],
			[struct.u8, 'u8', Uint8Array, 0, 1],
			[struct.u16, 'u16', Uint16Array, 0, 65_535],
			[struct.u32, 'u32', Uint32Array, 0, 1_000_000],
			[struct.u64, 'u64', BigUint64Array, 0n, 1_123_000_000n],
			[struct.i8, 'i8', Int8Array, 0, -100],
			[struct.i16, 'i16', Int16Array, 0, -16_000],
			[struct.i32, 'i32', Int32Array, 0, 32],
			[struct.i64, 'i64', BigInt64Array, 0n, -1_000_000_000n],
			[struct.f32, 'f32', Float32Array, 0, 15],
			[struct.f64, 'f64', Float64Array, 0, Math.PI],
		] as const;

		for (const [
			decorator,
			schemaField,
			FieldConstructor,
			init,
			val,
		] of fields) {
			@struct()
			class Comp {
				declare __$$i: number;
				declare static schema: number;
				@decorator() declare field: any;
				constructor(store: ComponentStore, index: number) {}
			}

			expect(Comp.schema).toBe(TYPE_IDS[schemaField]);

			const buffer = new ArrayBuffer(
				FieldConstructor.BYTES_PER_ELEMENT * 2,
			);
			const store = {
				buffer,
				u8: new Uint8Array(buffer),
				[schemaField]: new FieldConstructor(buffer),
			};

			const comp = new Comp(store, 0);
			expect(comp.field).toBe(init);
			comp.field = val;
			expect(comp.field).toBe(val);
			comp.__$$i = 1;
			expect(comp.field).toBe(init);
		}
	});

	it('works for string fields', () => {
		@struct()
		class Comp {
			declare static schema: number;
			@struct.string({ characterCount: 5 }) declare value: string;
			@struct.string({ byteLength: 1 }) declare value2: string;
			constructor(store: ComponentStore, index: number) {}
		}

		const buffer = new ArrayBuffer(17);
		const store = {
			buffer,
			u8: new Uint8Array(buffer),
		};

		const comp = new Comp(store, 0);
		expect(comp.value).toBe('');

		comp.value = 'hello';
		expect(comp.value).toBe('hello');

		comp.value = 'bye';
		expect(comp.value).toBe('bye');

		comp.value += '!!!';
		expect(comp.value).toBe('bye!!!');

		expect(comp.value2).toBe('');
		comp.value2 = 'A';
		expect(comp.value2).toBe('A');
		comp.value2 = 'AA';
		expect(comp.value2).toBe('A');
	});

	it('works for arrays', () => {
		@struct()
		class Comp {
			declare static size: number;
			declare static schema: number;
			declare __$$i: number;
			@struct.array('u8', 8) declare value: Uint8Array;
			@struct.array('f64', 3) declare value2: Float64Array;
			constructor(store: ComponentStore, index: number) {}
		}
		const buffer = new ArrayBuffer(Comp.size * 2);
		const store = {
			buffer,
			u8: new Uint8Array(buffer),
			f64: new Float64Array(buffer),
		};
		const comp = new Comp(store, 0);
		expect(comp.value).toBeInstanceOf(Uint8Array);
		expect(comp.value2).toBeInstanceOf(Float64Array);

		comp.value = new Uint8Array(8).fill(3);
		comp.value2 = new Float64Array(3).fill(Math.PI);
		expect(comp.value).toStrictEqual(new Uint8Array(8).fill(3));
		expect(comp.value2).toStrictEqual(new Float64Array(3).fill(Math.PI));
		comp.__$$i = 1;

		expect(comp.value).toStrictEqual(new Uint8Array(8));
		expect(comp.value2).toStrictEqual(new Float64Array(3));
	});

	it('reorders fields as necessary', () => {
		@struct()
		class Comp {
			declare static size: number;
			declare static schema: number;
			declare __$$i: number;
			@struct.u8() declare a: number;
			@struct.u64() declare b: bigint;
			@struct.i16() declare c: number;
			@struct.f32() declare d: number;
			constructor(store: ComponentStore, index: number) {}
		}
		const buffer = new ArrayBuffer(Comp.size * 2);
		const store = {
			buffer,
			u8: new Uint8Array(buffer),
			u64: new BigUint64Array(buffer),
			i16: new Int16Array(buffer),
			f32: new Float32Array(buffer),
		};
		const comp = new Comp(store, 0);
		expect(comp.a).toBe(0);
		expect(comp.b).toBe(0n);
		expect(comp.c).toBe(0);
		expect(comp.d).toBe(0);

		comp.a = 128;
		comp.b = 0xfffffff0n;
		comp.c = -13;
		comp.d = 1.5;

		expect(comp.a).toBe(128);
		expect(comp.b).toBe(0xfffffff0n);
		expect(comp.c).toBe(-13);
		expect(comp.d).toBe(1.5);
	});

	it('works for components', () => {
		@struct()
		class Transform {
			declare static size: number;
			declare static schema: number;
			declare __$$i: number;
			@struct.component(Vec3) declare position: Vec3;
			@struct.f32() declare scale: number;
			@struct.component(Vec3) declare rotation: Vec3;
			constructor(store: ComponentStore, index: number) {}
		}

		const buffer = new ArrayBuffer(Transform.size * 2);
		const store = {
			buffer,
			u8: new Uint8Array(buffer),
			f32: new Float32Array(buffer),
			f64: new Float64Array(buffer),
		};
		const transform = new Transform(store, 0);
		expect(transform.position.x).toBe(0);
		expect(transform.position.y).toBe(0);
		expect(transform.position.z).toBe(0);
		expect(transform.rotation.x).toBe(0);
		expect(transform.rotation.z).toBe(0);
		expect(transform.rotation.z).toBe(0);
		expect(transform.scale).toBe(0);

		transform.position.x = 1.5;
		transform.position.y = 2.5;
		transform.position.z = 3.5;
		transform.rotation.x = 4.5;
		transform.rotation.y = 5.5;
		transform.rotation.z = 6.5;
		transform.scale = 7.5;

		expect(transform.position.x).toBe(1.5);
		expect(transform.position.y).toBe(2.5);
		expect(transform.position.z).toBe(3.5);
		expect(transform.rotation.x).toBe(4.5);
		expect(transform.rotation.y).toBe(5.5);
		expect(transform.rotation.z).toBe(6.5);
		expect(transform.scale).toBe(7.5);
	});
}
