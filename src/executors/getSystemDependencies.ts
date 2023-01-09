import { DEV } from 'esm-env';
import { assert } from '../utils/assert';
import { bits } from '../utils/bits';
import type { SystemDefinition } from '../systems';

export function getSystemDependencies(
	systems: SystemDefinition[],
	intersections: bigint[],
): bigint[] {
	const masks = systems.map(system =>
		system.dependencies.reduce((acc, dep) => {
			const beforeIndex = systems.indexOf(dep);
			return beforeIndex === -1 ? acc : acc | (1n << BigInt(beforeIndex));
		}, 0n),
	);

	const deepDependencies = [...masks];
	deepDependencies.forEach(function mergeDependencies(mask, i) {
		for (const bit of bits(mask)) {
			mergeDependencies(deepDependencies[bit], bit);
			deepDependencies[i] |= deepDependencies[bit];
		}
	});

	if (DEV) {
		deepDependencies.forEach((mask, i) => {
			assert(
				(mask & (1n << BigInt(i))) === 0n,
				`Circular Dependency Detected - Sytem #${i} (${systems[i].fn.name}) depends on itself!`,
			);
		});
	}

	for (let i = 0; i < systems.length; i++) {
		const system = systems[i];
		if (system.isBeforeAll) {
			for (const bit of bits(intersections[i])) {
				if (
					bit !== i &&
					(deepDependencies[i] & (1n << BigInt(bit))) === 0n
				) {
					masks[bit] |= 1n << BigInt(i);
					deepDependencies[bit] |= 1n << BigInt(i);
				}
			}
		} else if (system.isAfterAll) {
			for (const bit of bits(intersections[i])) {
				if (
					bit !== i &&
					(deepDependencies[bit] & (1n << BigInt(i))) === 0n
				) {
					masks[i] |= 1n << BigInt(bit);
					deepDependencies[i] |= 1n << BigInt(bit);
				}
			}
		}
	}

	masks.forEach((_, i) => (masks[i] &= intersections[i]));
	return masks;
}

/*---------*\
|   TESTS   |
\*---------*/
if (import.meta.vitest) {
	const { describe, it, expect } = import.meta.vitest;
	const { SystemDefinition } = await import('../systems/SystemDefinition');

	const createMockSystems = (length: number): SystemDefinition[] =>
		Array.from(
			{ length },
			() =>
				new SystemDefinition(
					() => [],
					() => {},
				),
		);

	describe('getSystemDependencies', () => {
		it('returns a 0n array if no dependencies are specified', () => {
			expect(
				getSystemDependencies(createMockSystems(4), [
					0b1111n,
					0b1111n,
					0b1111n,
					0b1111n,
				]),
			).toStrictEqual([0n, 0n, 0n, 0n]);
		});

		it('creates dependencies with before/after', () => {
			const systems = createMockSystems(4);
			systems[0].before(systems[1]);
			systems[1].after(systems[2]);
			systems[2].after(systems[0]);
			systems[3].before(systems[0]);
			expect(
				getSystemDependencies(systems, [
					0b1111n,
					0b1111n,
					0b1111n,
					0b1111n,
				]),
			).toStrictEqual([0b1000n, 0b0101n, 0b0001n, 0b0000n]);
		});

		it('creates dependencies with beforeAll/afterAll', () => {
			const systems = createMockSystems(4);
			systems[0].afterAll();
			systems[3].beforeAll();
			expect(
				getSystemDependencies(systems, [
					0b1111n,
					0b1111n,
					0b1111n,
					0b1111n,
				]),
			).toStrictEqual([0b1110n, 0b1000n, 0b1000n, 0b0000n]);
		});

		it('only creates dependencies between intersecting systems', () => {
			const systems = createMockSystems(2);
			systems[0].after(systems[1]);
			expect(
				getSystemDependencies(systems, [0b00n, 0b00n]),
			).toStrictEqual([0b00n, 0b00n]);
			const systems2 = createMockSystems(2);
			systems2[0].beforeAll();
			expect(
				getSystemDependencies(systems2, [0b00n, 0b00n]),
			).toStrictEqual([0b00n, 0b00n]);
		});

		it('prioritizes explicit dependencies over implicit', () => {
			const systems = createMockSystems(3);
			systems[0].afterAll();
			systems[1].after(systems[0]);
			expect(
				getSystemDependencies(systems, [0b111n, 0b111n, 0b111n]),
			).toStrictEqual([0b100n, 0b001n, 0b000n]);

			const systems2 = createMockSystems(3);
			systems2[1].before(systems2[2]);
			systems2[2].beforeAll();
			expect(
				getSystemDependencies(systems2, [0b111n, 0b111n, 0b111n]),
			).toStrictEqual([0b100n, 0b000n, 0b010n]);
		});

		it('evaluates in passed order when identical implicit dependencies are provided', () => {
			const systems = createMockSystems(4);
			systems[0].beforeAll();
			systems[1].beforeAll();
			systems[3].beforeAll();
			expect(
				getSystemDependencies(systems, [
					0b1111n,
					0b1111n,
					0b1111n,
					0b1111n,
				]),
			).toStrictEqual([0b0000n, 0b0001n, 0b1011n, 0b0011n]);

			const systems2 = createMockSystems(4);
			systems2[1].afterAll();
			systems2[2].afterAll();
			systems2[3].afterAll();
			expect(
				getSystemDependencies(systems2, [
					0b1111n,
					0b1111n,
					0b1111n,
					0b1111n,
				]),
			).toStrictEqual([0b0000n, 0b1101n, 0b1001n, 0b0001n]);
		});

		// Changelog v0.8 bugfix
		it('does not create circular dependencies', () => {
			const systems = createMockSystems(3);
			systems[0].before(systems[1]);
			systems[1].before(systems[2]);
			systems[2].beforeAll();
			expect(
				getSystemDependencies(systems, [
					0b111n,
					0b111n,
					0b111n,
					0b111n,
				]),
			).toStrictEqual([0b000n, 0b001n, 0b010n]);
		});

		it('throws for directly contradictory dependencies', () => {
			const systems = createMockSystems(2);
			systems[0].after(systems[0]);
			expect(() =>
				getSystemDependencies(systems, [0b11n, 0b11n]),
			).toThrowError();

			const systems2 = createMockSystems(2);
			systems2[0].before(systems2[1]);
			systems2[1].before(systems2[0]);
			expect(() =>
				getSystemDependencies(systems2, [0b11n, 0b11n]),
			).toThrowError();

			const systems3 = createMockSystems(2);
			systems3[0].after(systems3[1]);
			systems3[1].after(systems3[0]);
			expect(() =>
				getSystemDependencies(systems3, [0b11n, 0b11n]),
			).toThrowError();

			const systems4 = createMockSystems(3);
			systems4[0].before(systems4[1]);
			systems4[1].before(systems4[2]);
			systems4[2].before(systems4[0]);
			expect(() =>
				getSystemDependencies(systems4, [0b111n, 0b111n]),
			).toThrowError();
		});
	});
}