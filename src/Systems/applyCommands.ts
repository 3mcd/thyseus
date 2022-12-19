import { defineSystem } from './defineSystem';

const mergeQueues = (a: Map<bigint, bigint>, b: Map<bigint, bigint>) => {
	for (const [key, bVal] of b) {
		const aVal = a.get(key);
		if (aVal === undefined) {
			a.set(key, bVal);
		} else if (aVal !== 0n) {
			a.set(key, aVal | bVal);
		}
	}
	return a;
};
export const applyCommands = defineSystem(
	({ World }) => [World()],
	async function applyCommands(world) {
		const queue = (
			await world.threads.send<Map<bigint, bigint>>(
				'thyseus::getCommandQueue',
			)
		).reduce(mergeQueues, world.commands.queue);

		for (const [entityId, tableId] of queue) {
			world.moveEntity(entityId, tableId);
		}

		queue.clear();
		world.entities.resetCursor();
	},
);
