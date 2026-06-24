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

// Lectura/escritura de datos: ver src/lib/roomsStore.ts (SSR, fresca por
// petición). Se re-exportan para que las páginas importen desde un único sitio.
export {
  getAllRooms,
  getActiveRooms,
  getRoomById,
  setRoomActive,
  toggleRoom,
} from './roomsStore';

/** Precio mínimo entre las habitaciones activas (para "desde X €"). */
export function getMinActivePrice(rooms: Room[]): number {
  return Math.min(...rooms.map((r) => r.precio));
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
