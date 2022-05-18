import {z} from 'zod';
import { locationSchema } from './location.schema';

export const fulfillmentSchehma = z.object({
    "id": z.string(),
    "start": z.object({
        "location": locationSchema.pick({
            descriptor: true,
            gps: true
        }),
        "time": z.object({
            "timestamp": z.string()
        })
    }),
    "end": z.object({
        "location": locationSchema.pick({
            descriptor: true,
            gps: true
        }),
        "time": z.object({
            "timestamp": z.string()
        })
    }),
    "vehicle": z.object({
        "category": z.string()
    })
});

export type FulfillmentDataType = z.infer<typeof fulfillmentSchehma>;