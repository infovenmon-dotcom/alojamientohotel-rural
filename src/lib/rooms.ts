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
  lema: string;
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

/** Palabra de baño según tipo (igual que la maqueta). */
export function bathWord(room: Room): string {
  if (room.tipo === 'apartamento') return 'baño propio';
  if (room.tipo === 'accesible') return 'baño adaptado';
  return 'baño privado';
}

/** Lista de servicios de la habitación según tipo (igual que la maqueta). */
export function amenList(room: Room): string[] {
  if (room.tipo === 'apartamento') return ['Baño propio', 'Cocina', 'Terraza', 'Jardín', 'A/C', 'WiFi'];
  if (room.tipo === 'accesible') return ['Baño adaptado', 'Sin escalones', 'TV', 'A/C', 'WiFi'];
  return ['Baño privado', 'TV', 'A/C y calefacción', 'WiFi', 'Secador'];
}

/** Etiqueta de tipo para la tarjeta (apartamento / accesible). */
export function roomTag(room: Room): string | null {
  if (room.tipo === 'apartamento') return 'Apartamento · 4 personas';
  if (room.tipo === 'accesible') return 'Accesible · movilidad reducida';
  return null;
}
