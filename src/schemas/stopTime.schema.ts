import { z } from 'zod';

export const stopTimeSchema = z.object({
    id: z.number(),
    trip_id: z.string(),
    arrival_time: z.string(),
    departure_time: z.string(),
    stop_id: z.string(),
    stop_sequence: z.number(),
    timepoint: z.string(),
    shape_dist_traveled: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    destination_time: z.string(),
});

export type StopTimeDataType = z.infer<typeof stopTimeSchema>;