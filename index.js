// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// [START cloudrun_helloworld_service]
// [START run_helloworld_service]
const express = require('express');
const app = express();
const { getFiles , readFile  }  = require("./filestorage.js")
const { descriptor2fid, fid2descriptor,  setDoc  }  = require("./facedatabase.js")
const {registerImage, subSet, saveFaces} = require("./faceDesc")

const nj = require('nunjucks') ;
nj.configure('templates', {
    autoescape: true,
    express: app
});


app.get('/', (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(nj.render('index.html', { name: name }));
});

app.get('/api/get', (req, res) => {
    const name = process.env.NAME || 'World';
    res.send(`Hello ${name}!`);
  });

app.get('/api/getList', async (req, res) => {
    if (req.query?.race){
        st_path=`gs://run-pix.appspot.com/processed/${req.query?.race}/`
        const dir = await getFiles(st_path)
        console.info(`processing ${dir.length} at ${st_path}`);
        res.send(dir);
    } else {
        res.status(500).send('Something broke!')
    }
});

app.get('/api/procRace', async (req, res) => {
    if (req.query?.event){
        let event=req.query?.event
        
        st_path=`gs://run-pix.appspot.com/processed/${event}/`
        const dir = await getFiles(st_path)
        console.info(`processing ${dir.length} at ${st_path}`);
        res.send(`processing ${dir.length}. Check log `);
   
        for (const f of dir) {
            let fDescr = await registerImage(event,f)
        }
         } else {
        res.status(500).send('Something broke!')
    }

});  

app.post('/api/pubsub', (req, res) => {
if (!req.body) {
    const msg = 'no Pub/Sub message received';
    console.error(`error: ${msg}`);
    res.status(400).send(`Bad Request: ${msg}`);
    return;
}
if (!req.body.message) {
    const msg = 'invalid Pub/Sub message format';
    console.error(`error: ${msg}`);
    res.status(400).send(`Bad Request: ${msg}`);
    return;
}

const pubSubMessage = req.body.message;
const name = pubSubMessage.data
    ? Buffer.from(pubSubMessage.data, 'base64').toString().trim()
    : 'World';

console.log(`Hello ${name}!`);
res.status(204).send();
});  

app.use(function (err, req, res, next) {
    res.status(err.status || 500).json({status: err.status, message: err.message})
  });

const port = parseInt(process.env.PORT) || 8080;
app.listen(port, () => {
  console.log(`${process.env.SERVICE_NAME}: listening on port ${port}`);
});
// [END run_helloworld_service]
// [END cloudrun_helloworld_service]

// Exports for testing purposes.
module.exports = app;
