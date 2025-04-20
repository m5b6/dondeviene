export interface RedServicio {
  id: number;
  cod: string;
  destino: string;
  orden: number;
  color: string;
  negocio: {
    nombre: string;
    color: string;
  };
  recorrido: {
    destino: string;
  };
  horarios: any[]; // Define more strictly if needed
  paradas: any[]; // Define more strictly if needed
  shapes: any[]; // Define more strictly if needed
  itinerario: boolean;
  codigo: string;
}

export interface RedParadero {
  id: number;
  cod: string;
  pos: [number, number]; // [latitude, longitude]
  name: string;
  comuna: string;
  type: number; // 0 for bus stop, 1 for BIP point?
  servicios?: RedServicio[]; // Optional for BIP points
  distancia: number; // Raw distance value from API, might not be meters
  direccion?: string; // Optional for BIP points
} 