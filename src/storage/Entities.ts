import { Entity } from './Entity';
import { RESIZE_ENTITY_LOCATIONS } from '../World/channels';
import type { Table } from './Table';
import type { World } from '../World';

const NEXT_ID = 0;
const CURSOR = 1;
const lo32 = 0x00_00_00_00_ff_ff_ff_ffn;
const getIndex = (id: bigint): number => Number(id & lo32);

const ENTITY_BATCH_SIZE = 256;

export class Entities {
	static fromWorld(world: World): Entities {
		const bufferSize = ENTITY_BATCH_SIZE * Uint32Array.BYTES_PER_ELEMENT;
		return new this(
			world,
			world.threads.queue(
				() => new Uint32Array(world.createBuffer(bufferSize)),
			),
			world.threads.queue(() => new Uint32Array(world.createBuffer(8))),
			world.archetypes[0],
		);
	}

	#world: World;
	#locations: Uint32Array;
	#data: Uint32Array; // [NEXT_ID, CURSOR]
	#recycled: Table;
	constructor(
		world: World,
		locations: Uint32Array,
		data: Uint32Array,
		recycled: Table,
	) {
		this.#world = world;
		this.#locations = locations;
		this.#data = data;
		this.#recycled = recycled;
	}

	get isFull() {
		return this.#data[0] >= this.#locations.length;
	}

	/**
	 * A lockfree method to obtain a new Entity ID
	 */
	spawn(): bigint {
		const recycledSize = this.#recycled.size;
		for (
			let currentCursor = this.#getCursor();
			currentCursor < recycledSize;
			currentCursor = this.#getCursor()
		) {
			if (this.#tryCursorMove(currentCursor)) {
				return this.#recycled.columns.get(Entity)!.u64![
					recycledSize - currentCursor - 1
				];
			}
		}
		return BigInt(Atomics.add(this.#data, NEXT_ID, 1));
	}

	/**
	 * Checks if an entity is currently alive or not.
	 * @param entityId The entity id to check
	 * @returns `true` if alive, `false` if not.
	 */
	isAlive(entityId: bigint) {
		const tableIndex = this.getTableIndex(entityId);
		const row = this.getRow(entityId);
		return (
			tableIndex === 0 ||
			this.#world.archetypes[tableIndex].columns.get(Entity)!.u64![
				row
			] === entityId
		);
	}

	/**
	 * Atomically grabs the current cursor.
	 * @returns The current cursor value.
	 */
	#getCursor() {
		return Atomics.load(this.#data, CURSOR);
	}

	/**
	 * Tries to atomically move the cursor by one.
	 * @param expected The value the cursor is currently expected to be.
	 * @returns A boolean, indicating if the move was successful or not.
	 */
	#tryCursorMove(expected: number) {
		return (
			expected ===
			Atomics.compareExchange(this.#data, CURSOR, expected, expected + 1)
		);
	}

	resetCursor() {
		this.#data[CURSOR] = 0;
	}

	grow(world: World) {
		// TODO: TEST
		const newLocations = new Uint32Array(
			world.createBuffer(
				Uint32Array.BYTES_PER_ELEMENT *
					Math.ceil(this.#data[0] / ENTITY_BATCH_SIZE) *
					ENTITY_BATCH_SIZE,
			),
		);
		newLocations.set(this.#locations);
		this.#locations = newLocations;
		world.threads.send(RESIZE_ENTITY_LOCATIONS(this.#locations));
	}
	setLocations(newLocations: Uint32Array) {
		this.#locations = newLocations;
	}

	getTableIndex(entityId: bigint) {
		return this.#locations[getIndex(entityId) << 1] ?? 0;
	}
	setTableIndex(entityId: bigint, tableIndex: number) {
		this.#locations[getIndex(entityId) << 1] = tableIndex;
	}

	getRow(entityId: bigint) {
		return this.#locations[(getIndex(entityId) << 1) + 1] ?? 0;
	}
	setRow(entityId: bigint, row: number) {
		this.#locations[(getIndex(entityId) << 1) + 1] = row;
	}
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { it, expect } = import.meta.vitest;
	const { Table } = await import('./Table');

	it('returns incrementing generational integers', () => {
		const entities = new Entities(
			{} as any,
			new Uint32Array(256 * 2),
			new Uint32Array(3),
			new Table(
				{ tableLengths: new Uint32Array(1) } as any,
				new Map(),
				0,
				0n,
				0,
			),
		);

		for (let i = 0n; i < 256n; i++) {
			expect(entities.spawn()).toBe(i);
		}
	});

	it('returns entities from the Recycled table', () => {
		const table = new Table(
			{ tableLengths: new Uint32Array(1) } as any,
			new Map().set(Entity, { u64: new BigUint64Array(8) }),
			0,
			0n,
			0,
		);

		const entities = new Entities(
			{} as any,
			new Uint32Array(256 * 2),
			new Uint32Array(3),
			table,
		);

		expect(entities.spawn()).toBe(0n);
		expect(entities.spawn()).toBe(1n);
		expect(entities.spawn()).toBe(2n);

		table.size = 3;
		table.columns.get(Entity)!.u64![0] = 0n;
		table.columns.get(Entity)!.u64![1] = 1n;
		table.columns.get(Entity)!.u64![2] = 2n;

		expect(entities.spawn()).toBe(2n);
		expect(entities.spawn()).toBe(1n);
		expect(entities.spawn()).toBe(0n);
		expect(entities.spawn()).toBe(3n);
	});
}