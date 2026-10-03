export const RED_ORIGIN = 'https://www.red.cl';
export const OTP_ORIGIN = 'https://dtpm.amigocloud.com';
export const MAP_STYLE_URL = 'https://mapasred.tstgo.cl/styles/redstreets/style.json';

export const USER_AGENT =
  'dondeviene/0.1 (+https://github.com/m5b6/dondeviene; read-only transit information client)';

export const STOP_CODE_PATTERN = /^[A-Z]{2}\d+$/;
export const SERVICE_CODE_PATTERN = /^[0-9A-Z]+[a-z]?$/;

export const redUrls = {
  bootstrapPage: `${RED_ORIGIN}/planifica-tu-viaje/cuando-llega/`,
  prediction: `${RED_ORIGIN}/predictorPlus/prediccion`,
  allStops: `${RED_ORIGIN}/jsonPO/paraderos_todos.json`,
  allServices: `${RED_ORIGIN}/jsonPO/servicios_todos.json`,
  serviceFile: (code: string) => `${RED_ORIGIN}/jsonPO/servicio_${code}.json`,
  geocodeSearch: `${RED_ORIGIN}/geocoder/buscar`,
  geocodeReverse: `${RED_ORIGIN}/geocoder/reverse`,
  tripPlan: `${OTP_ORIGIN}/api/otp/plan`,
  scheduledItineraries: `${RED_ORIGIN}/mapas-y-horarios/bus/recorridos-programados/`,
} as const;
