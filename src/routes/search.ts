import express, { Request, Response } from 'express';

const utils = require('../utils/util');

const router = express.Router();


router.post("/", async (req: Request, res: Response) => {
    try {
        console.log('Received search');
        utils.createOnSearch(req);
        res.status(200).send({
            "message": {
                "ack": {
                    "status": "ACK"
                }
            }
        })
    } catch (error) {
        res.status(500).send((error as Error).message);
    }
});


module.exports = router;