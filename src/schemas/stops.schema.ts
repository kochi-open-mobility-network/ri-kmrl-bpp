import {z} from 'zod';

const stopSchema= z.object({
    stop_id: z.string(),
    stop_name: z.string(),
    stop_lat: z.string(),
    stop_lon: z.string(),
    zone_id: z.string(),
    wheelchair_boarding: z.string(),
    distance: z.number()
});

export type StopDataType = z.infer<typeof stopSchema>;