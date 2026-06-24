import data from '@/data/rooms.json';

export type RoomType = 'doble' | 'apartamento' | 'accesible';
export type Floor = 'superior' | 'baja';

export interface Room {
  id: string;
  nombre: string;
  significado: string;
  concepto: string;
  planta: Floor;
  tipo: RoomType;
  capacidad: number;
  m2: number;
  cama: string;
  precio: number;
  activa: boolean;
  fotos: string[];
  storytelling: string;
}

/** Todas las habitaciones (incluye bloqueadas). Uso interno / panel. */
export const allRooms: Room[] = (data.rooms as Room[]);

/**
 * Habitaciones visibles en la web pública: SOLO las activas.
 * Bloquear en el panel (activa:false) = ocultar en web, calendario y reserva.
 */
export function getActiveRooms(): Room[] {
  return allRooms.filter((room) => room.activa);
}

export function getRoomById(id: string): Room | undefined {
  return allRooms.find((room) => room.id === id);
}

/** Precio mínimo entre las habitaciones activas (para "desde X €"). */
export function getMinActivePrice(): number {
  return Math.min(...getActiveRooms().map((r) => r.precio));
}
