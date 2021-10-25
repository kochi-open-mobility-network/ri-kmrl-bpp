const express = require('express');
import { Request, Response, NextFunction } from "express";
import cors from 'cors';
import key from '../config/key';

import { createKeyPair, auth } from './utils/auth';

const app = express();

//app.use(express.json());
app.use(cors());

app.use(express.json({
  verify: (req: Request, res: Response, buf: Buffer) => {
    req.rawBody = buf.toString();
  }
}));

import { sequelize } from './db/index';
import { MODELS } from './db/models';
import { setupData } from './db/models/setupData';


(async () => {
  try {
    await sequelize.addModels(MODELS);
    await sequelize.sync();
    await setupData('./KMRL-Open-Data/');
    console.log('Connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }

  try {
    if (key.get('public_key') === '' || key.get('public_key') === undefined || key.get('private_key') === '' || key.get('private_key') === undefined) {
      await createKeyPair();
    }
  } catch (error) {
    console.error('Key generation error')
  }

  const PORT = process.env.PORT || 8000;
  app.use('/search', auth, require("./routes/search"));
  app.use('/auth', require("./routes/auth"));
  app.listen(PORT, () => {
    console.log(`Metro BPP listening on port ${PORT}`)
  })
})();