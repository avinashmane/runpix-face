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
const nj = require('nunjucks') ;
const { getFiles ,getEventFile  }  = require("./filestorage.js")
// const { descriptor2fid, fid2descriptor,  setDoc  }  = require("./facedatabase.js")
const {registerImage, matchFaceInFile, saveFaces} = require("./faceDesc")

const app = express();
var cors = require('cors')
nj.configure('templates', {
    autoescape: true,
    express: app
});

// middleware
app.use(cors())
app.use(express.json());
// app.use(express.urlencoded());

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
        st_path=getEventFile( req.query?.race , "")
        const dir = await getFiles(st_path)
        console.info(`Processing ${dir.length} at ${st_path}`);
        res.send(dir);
    } else {
        res.status(500).send('Something broke!')
    }
});

app.get('/api/procRace', async (req, res) => {
    if (req.query?.event){
        let event=req.query?.event
        
        st_path=getEventFile( event , "")
        const dir = await getFiles(st_path)
        console.info(`processing ${dir.length} at ${st_path}`);
        res.send(`processing ${dir.length}. Check log `);
   
        for (const f of dir) {
            let fDescr = await registerImage(event,f)
        }
        console.info(`processed ${dir.length} `);
        
         } else {
        res.status(500).send('Something broke!')
    }

});  


// const image = require('./image');
/**
 * Process following message 
  {
    "insertId": "650736c700005377186f524a",
    "jsonPayload": {
      "metageneration": "1",
      "timeCreated": "2023-09-17T16:18:55.234Z",
      "etag": "CLrX3I6GsoEDEAE=",
      "bucket": "run-pix.appspot.com",
      "updated": "2023-09-17T16:18:55.234Z",
      "crc32c": "JqZ8cg==",
      "kind": "storage#object",
      "storageClass": "STANDARD",
      "md5Hash": "2vAwuG77+q91mUivehjaPg==",
      "mediaLink": "https://storage.googleapis.com/download/storage/v1/b/run-pix.appspot.com/o/faceuploads%2F1P6A0324.jpg?generation=1694967535184826&alt=media",
      "generation": "1694967535184826",
      "size": "6053434",
      "id": "run-pix.appspot.com/faceuploads/1P6A0324.jpg/1694967535184826",
      "timeStorageClassUpdated": "2023-09-17T16:18:55.234Z",
      "contentType": "image/jpeg",
      "selfLink": "https://www.googleapis.com/storage/v1/b/run-pix.appspot.com/o/faceuploads%2F1P6A0324.jpg",
      "name": "faceuploads/1P6A0324.jpg" faceuploads/event/emailid
    },
  
 */
app.post('/api/match', async (req, res) => {

    function showerrExit(msg,err) {
        err=err||''
        console.error(`error: ${msg}: ${err}`,JSON.stringify(req.body));
        res.status(400).send(`Bad Request: ${msg}`);
    }

    let data
    if (req?.body?.name && req?.body?.bucket) {
        data=req.body   
    } else if (req?.body?.message?.data) {
    // Decode the Pub/Sub message.
        try {
            data = Buffer.from(req.body.message.data, 'base64').toString().trim();
            data = JSON.parse(data);
            if (!data?.name || !data?.bucket) {
                throw new Error('no name/bucket in message')
            }
        } catch (err) {
            let msg
            msg = `Invalid Pub/Sub message: ${JSON.stringify(req.body)}`;
            showerrExit(msg,err)
            return;
        }
    }
    // Validate the message is a Cloud Storage event.
    

    try {
        console.log(data.name)
        let [root,event,file] = data?.name?.split("/")
        if (root=='faceuploads'){
            matchFaceInFile(event,
                            file,
                            {firebaseResults:true})  // background check ok        
            res.status(204).send();
        }
    } catch (err) {
        console.error(`error: Match face: ${JSON.stringify(req.body)} ${err}`);
        res.status(500).send();
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
