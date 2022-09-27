import {z} from 'zod';

export const locationSchema = z.object({
    "id": z.string(),
    "descriptor": z.object({
        "name": z.string(),
    }),
    "station_code": z.string(),
    "gps": z.string()
});

export type LocationDataType = z.infer<typeof locationSchema>;