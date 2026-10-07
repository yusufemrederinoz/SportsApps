import type { LiveRoom, RoomFactory } from '../src/play/live-room';

export function capturing(factory: RoomFactory, rooms: LiveRoom[]): RoomFactory {
  return (context) => {
    const room = factory(context);
    if (room) {
      rooms.push(room);
    }
    return room;
  };
}

export function lastRoom(rooms: readonly LiveRoom[]): LiveRoom {
  const room = rooms.at(-1);
  if (!room) {
    throw new Error('no room created');
  }
  return room;
}
