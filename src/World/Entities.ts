import { BigUintArray } from '../utils/BigUintArray';
import type { World } from './World';

const nextId = 0;
const freeCount = 1;

const fourBytes = 32n;
const lo32 = 0x00_00_00_00_ff_ff_ff_ffn;
const getIndex = (id: bigint): number => Number(id & lo32);
const getGeneration = (id: bigint): number => Number(id >> fourBytes);

// NOTE: If tableIds move to uint32s, tableIds/row can be transformed into entityLocation: BigUint64Array
export class Entities {
	static fromWorld(world: World): Entities {
		const size = world.config.maxEntities;
		return new Entities(
			world.threads.queue(
				() => new Uint32Array(world.createBuffer(size * 4)),
			),
			new BigUintArray(
				world.components.length,
				size,
				world.threads.queue(() => new Uint8Array(size)),
			),
			world.threads.queue(
				() => new Uint32Array(world.createBuffer(size * 4)),
			),
			world.threads.queue(
				() => new Uint32Array(world.createBuffer(2 * 4)),
			),
			world.threads.queue(
				() =>
					new Uint32Array(
						world.createBuffer(Math.ceil(size / 8) * 4),
					),
			),
		);
	}

	generations: Uint32Array;
	tableIds: BigUintArray;
	row: Uint32Array;
	#data: Uint32Array; // [NextId, FreeCount]
	#free: Uint32Array;
	constructor(
		generations: Uint32Array,
		tableIds: BigUintArray,
		row: Uint32Array,
		data: Uint32Array,
		free: Uint32Array,
	) {
		this.generations = generations;
		this.tableIds = tableIds;
		this.row = row;
		this.#data = data;
		this.#free = free;
	}

	spawn(): bigint {
		for (let i = 0; i < this.#free.length; i++) {
			if (Atomics.load(this.#data, freeCount) === 0) {
				break;
			}
			while (true) {
				const n = Atomics.load(this.#free, i);
				if (n === 0) {
					break;
				}
				const result = ctz32(n);
				if (Atomics.xor(this.#free, i, 0b1 << result) === n) {
					Atomics.sub(this.#data, freeCount, 1);
					return (
						(BigInt(this.generations[result]) << fourBytes) |
						BigInt(32 * i + result)
					);
				}
			}
		}

		const result = Atomics.add(this.#data, nextId, 1);
		return BigInt(result);
	}

	despawn(id: bigint): void {
		const index = getIndex(id);
		const generation = getGeneration(id);
		if (
			Atomics.compareExchange(
				this.generations,
				index,
				generation,
				generation + 1,
			) === generation
		) {
			Atomics.or(this.#free, index >> 5, 1 << (index & 0b0001_1111));
			Atomics.add(this.#data, freeCount, 1);
		}
	}

	getTableId(id: bigint): bigint {
		return this.tableIds.get(getIndex(id));
	}
	getRow(id: bigint): number {
		return this.row[getIndex(id)];
	}

	setLocation(entityId: bigint, tableId: bigint, row: number) {
		this.tableIds.set(getIndex(entityId), tableId);
		this.row[getIndex(entityId)] = row;
	}
}

// NOTE: Requires n is non-zero
const ctz32 = (n: number) => {
	n >>>= 0;
	return 31 - Math.clz32(n & -n);
};

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;

	const createEntities = (length: number = 256) =>
		new Entities(
			new Uint32Array(length),
			new BigUintArray(8, length, new Uint8Array(length)),
			new Uint32Array(length),
			new Uint32Array(3),
			new Uint32Array(length),
		);

	it('ctz counts trailing zeroes', () => {
		for (let i = 0; i < 32; i++) {
			expect(ctz32(Number(`0b1${'0'.repeat(i)}`))).toBe(i);
		}
	});

	it('returns incrementing generational integers', () => {
		const entities = createEntities();

		for (let i = 0n; i < 256n; i++) {
			expect(entities.spawn()).toBe(i);
		}
	});

	it('returns freed indices with incremented generations', () => {
		const entities = createEntities(32);

		for (let i = 0; i < 32; i++) {
			entities.spawn();
		}
		const frees = [1, 2, 3, 9, 10, 16, 24, 25];
		frees.forEach(i => entities.despawn(BigInt(i)));

		for (const i of frees) {
			const result = entities.spawn();
			expect(getGeneration(result)).toBe(1);
			expect(getIndex(result)).toBe(i);
		}

		let prev = 0n;
		for (let i = 1; i < 32; i++) {
			entities.despawn(prev);
			prev = entities.spawn();
			expect(getIndex(prev)).toBe(0);
			expect(getGeneration(prev)).toBe(i);
		}
	});
}
