import axios from "axios";
import { RedParadero } from "../types/red";
import { calculateDistance } from "./geo";

export interface ParaderoInfo {
  id: number;
  cod: string;
  name: string;
  distance: number;
  pos: [number, number];
  buses?: BusArrival[];
}

export interface BusArrival {
  service: string;
  destination: string;
  timeToArrival: string;
  distance?: string;
  color: string;
  busPlate?: string;
}

// Interface for bus arrival item from API
export interface BusServiceItem {
  codigorespuesta: string;
  distanciabus1: string | null;
  distanciabus2: string | null;
  horaprediccionbus1: string | null;
  horaprediccionbus2: string | null;
  ppubus1: string | null;
  ppubus2: string | null;
  respuestaServicio: string;
  servicio: string;
  color: string;
  destino: string;
  sentido: string;
  itinerario: boolean;
  codigo: string;
}

export async function fetchNearbyParaderos(
  latitude: number,
  longitude: number
): Promise<ParaderoInfo[]> {
  const apiUrl = `https://www.red.cl/restservice/rest/getpuntoparada/?lat=${latitude}&lon=${longitude}&bip=1`;

  try {
    const response = await axios.get<RedParadero[]>(apiUrl);

    const nearbyParaderos: ParaderoInfo[] = response.data
      .filter((p: RedParadero) => p.type === 0 && p.pos)
      .map((paradero: RedParadero) => ({
        id: paradero.id,
        cod: paradero.cod,
        name: paradero.name,
        distance: calculateDistance(
          latitude,
          longitude,
          paradero.pos[0],
          paradero.pos[1]
        ),
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
      } else if (err.message.includes("Network Error")) {
        errorMessage = "Error de red. Verifica tu conexión.";
      }
    }
    throw new Error(errorMessage);
  }
}

const APPARENTLY_PUBLIC_TOKEN =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJleHAiOjE3NDUxNzI4OTU4OTR9.7ZHjIG6cJxVYM3SvxcfxlYg6jcmsXfw2AJU9VwFDp6c";

export async function fetchParaderoByCode(code: string): Promise<ParaderoInfo> {
  // The API endpoint for getting a specific paradero by code
  const apiUrl = `https://www.red.cl/predictor/prediccion?t=${APPARENTLY_PUBLIC_TOKEN}&codsimt=${code}&codser=`;

  try {
    const response = await axios.get(apiUrl);
    const data = response.data;
    
    // Try to parse as JSON first
    let paraderoData;
    try {
      // Check if the response is already a JSON object
      if (typeof data === 'object') {
        paraderoData = data;
      } else {
        // Try to parse string as JSON
        paraderoData = JSON.parse(data);
      }
      
      // Extract location and other info from JSON
      const latitude = parseFloat(paraderoData.x);
      const longitude = parseFloat(paraderoData.y);
      const name = paraderoData.nomett || `Paradero ${code}`;
      
      // Parse bus arrival information
      const buses: BusArrival[] = [];
      
      if (paraderoData.servicios && paraderoData.servicios.item) {
        // Ensure item is always treated as an array
        const busItems = Array.isArray(paraderoData.servicios.item) 
          ? paraderoData.servicios.item 
          : [paraderoData.servicios.item];
          
        busItems.forEach((item: BusServiceItem) => {
          // Only include buses that are actually coming (have valid arrival info)
          if (item.codigorespuesta === "00" || item.codigorespuesta === "01") {
            buses.push({
              service: item.servicio,
              destination: item.destino,
              timeToArrival: item.horaprediccionbus1 || "Sin información",
              distance: item.distanciabus1 ? `${Math.round(parseInt(item.distanciabus1) / 1000)}km` : undefined,
              color: item.color,
              busPlate: item.ppubus1 || undefined
            });
            
            // If there's a second bus, add it too
            if (item.horaprediccionbus2) {
              buses.push({
                service: item.servicio,
                destination: item.destino,
                timeToArrival: item.horaprediccionbus2,
                distance: item.distanciabus2 ? `${Math.round(parseInt(item.distanciabus2) / 1000)}km` : undefined,
                color: item.color,
                busPlate: item.ppubus2 || undefined
              });
            }
          }
        });
      }
      
      return {
        id: 0,
        cod: code,
        name,
        distance: 0,
        pos: [latitude, longitude],
        buses: buses.sort((a, b) => {
          // Sort buses by arrival time (putting "Llegando" first)
          if (a.timeToArrival.includes("Llegando")) return -1;
          if (b.timeToArrival.includes("Llegando")) return 1;
          // Then by estimated minutes
          const aMin = parseInt(a.timeToArrival.match(/\d+/)?.[0] || "999");
          const bMin = parseInt(b.timeToArrival.match(/\d+/)?.[0] || "999");
          return aMin - bMin;
        })
      };
      
    } catch (jsonError) {
      // If JSON parsing fails, fall back to regex extraction from HTML
      console.error("Failed to parse JSON response, falling back to HTML extraction", jsonError);
      
      const htmlContent = data;
      
      // Extract latitude and longitude using regex
      const latMatch = htmlContent.match(/data-lat="([^"]+)"/);
      const lngMatch = htmlContent.match(/data-lng="([^"]+)"/);
      const nameMatch = htmlContent.match(/<h1 class="[^"]*">([^<]+)<\/h1>/);
      
      if (!latMatch || !lngMatch) {
        throw new Error("No se pudo encontrar la ubicación del paradero.");
      }
      
      const latitude = parseFloat(latMatch[1]);
      const longitude = parseFloat(lngMatch[1]);
      const name = nameMatch ? nameMatch[1] : `Paradero ${code}`;
      
      return {
        id: 0,
        cod: code,
        name: name,
        distance: 0,
        pos: [latitude, longitude]
      };
    }
  } catch (err: any) {
    console.error("Error fetching paradero by code:", err);
    throw new Error(`No se pudo obtener información del paradero ${code}`);
  }
}
