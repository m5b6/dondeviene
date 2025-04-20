import axios from "axios";
import { RedParadero } from "../types/red";
import { calculateDistance } from "./geo";

export interface ParaderoInfo {
  id: number;
  cod: string;
  name: string;
  distance: number;
  pos: [number, number];
}

export async function fetchNearbyParaderos(latitude: number, longitude: number): Promise<ParaderoInfo[]> {
    const apiUrl = `https://www.red.cl/restservice/rest/getpuntoparada/?lat=${latitude}&lon=${longitude}&bip=1`;

    try {
        const response = await axios.get<RedParadero[]>(apiUrl);

        const nearbyParaderos: ParaderoInfo[] = response.data
            .filter((p: RedParadero) => p.type === 0 && p.pos)
            .map((paradero: RedParadero) => ({
                id: paradero.id,
                cod: paradero.cod,
                name: paradero.name,
                distance: calculateDistance(latitude, longitude, paradero.pos[0], paradero.pos[1]),
                pos: paradero.pos,
            }))
            .sort((a, b) => a.distance - b.distance);

        return nearbyParaderos;

    } catch (err: any) {
        console.error("Error fetching paraderos:", err);
        let errorMessage = "Error al buscar paraderos. Intenta de nuevo.";
        if (axios.isAxiosError(err)) {
             if (err.response?.status === 403) {
                 errorMessage = "Error de CORS o acceso denegado. Se necesita un proxy.";
             } else if (err.message.includes('Network Error')) {
                errorMessage = "Error de red. Verifica tu conexión.";
             }
        }
        throw new Error(errorMessage);
    }
} 