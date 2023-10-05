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
const { delDoc, retrieveFacesAll  }  = require("./facedatabase.js")
const {registerImage, matchFaceInFile, initFaceAPIOnce} = require("./faceDesc")
const { clustering,prepareForClustering } = require("./faceclust")
const {log} = require("./util.js")
const _ = require("lodash")

const app = express();
var cors = require('cors')
nj.configure('templates', {
    autoescape: true,
    express: app,
    noCache: true
});

// middleware
app.use(cors())
app.use(express.json());
const multer  = require('multer');
const upload = multer();

app.get(/\/(index)*$/, (req, res) => {
  const name = process.env.NAME || 'World';
  res.send(nj.render('index.html', { name: name }));
});

app.get('/races', (req, res) => {
    // console.log(req.route,req.params,req.query,req.body,req.url,req.baseUrl,req.originalUrl)
    res.send(nj.render('races.html', ));
  });


app.get('/api/faceapi',async (req, res) => {
    await initFaceAPIOnce()
    res.status(200).send('OK');
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

app.get('/api/eventscan', async (req, res) => {
    const  mapLimit = require("async/mapLimit");

    if (req.query?.event) {
        let event = req.query?.event

        st_path = getEventFile(event, "")
        const dir = await getFiles(st_path)
        log(`processing ${dir.length} at ${st_path}`);
        // console.dir(dir)
        // res.send(`processing ${dir.length}. Check log `);

        let imageObjs = dir.map(f=>{return {
                        imageFile:  st_path.replace("gs://","")+f,
                        event:      event,
                        kind:       "storage#object",
                    }});

        await mapLimit(imageObjs  ,5 ,registerImage)
        // for (const f of dir) {
                
        //     let fDescr = await registerImage(event, imageObj)
        // }
        console.info(`processed ${dir.length} ${event}`);
        res.status(200).send();
    } else {
        res.status(500).send('Something broke!')
    }

});  


app.get('/api/eventcluster', async (req, res) => {
    if (req.query?.event) {
        let event = req.query?.event

        let minScore = process.env.CLUSTER_MINSCORE ?? .98
        let eps = process.env.CLUSTER_EPSILON ?? .3
        
        delDoc(`/facesearch/${event}`, { recursive: true })
            .then(x => log(`deleted /facesearch/${event}`))
            .catch(console.error);
        
        await retrieveFacesAll(event)
            .then(fids => {
            
                //map fids to array
                ({ filesNames, dataset } = prepareForClustering( fids ));

                var { clusters, ret } = clustering(event, dataset, minScore, eps);

                res.status(200).send(`processed ${event} images:${filesNames.length} ${ret.clusters.length}  ${ret.noise.length}`);
            })
            .catch(console.error);

    } else {
        res.status(500).send('Something broke!')
    }

});

// app.post('/upload', upload.single('file'), (req, res) => {
//     if (!req.file) {
//         return res.status(400).send('No file uploaded.');
//     }
//     res.status(200).send(`File uploaded: ${req.file.filename}`);
// });

app.post('/api/matchimage', upload.single('image'), async (req, res) => {
    try {
        let imgObj=req.file
        imgObj.event=req?.body?.event  ;
        imgObj.imageFile =req?.body?.imageFile  ;//temp
        matches =  await matchFaceInFile(imgObj.event,
            imgObj, // needs full path or blob
            {firebaseResults:true})  ;// background check ok    
        // log('Done post /image')    ;                
        res.status(200).send(matches);

    } catch (error) {
        console.log(error)
        res.status(422).send([]);
    }
});

// const image = require('./image');
/**
 * Process following message for storage event
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
app.post('/api/matchqueue', async (req, res) => {

    function showerrExit(msg,err) {
        err=err||''
        console.error(`error: ${msg}: ${err}`,JSON.stringify(req.body));
        res.status(400).send(`Bad Request: ${msg}`);
    }

    let data ;
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
        log(`Received ${data.name}`)
        let [root,event,file] = data?.name?.split("/")
        let imageObj = {
            imageFile:`${data.bucket}/${data.name}`,
            kind:data?.kind,
        }
        if (root=='faceuploads'){
            await matchFaceInFile(event,
                            imageObj, // needs full path
                            {firebaseResults:true})  ;// background check ok    
            log('Done matchFaceInFile()')    ;                
            res.status(200).send(true);
        }
    } catch (err) {
        console.error(`error: Match face: ${JSON.stringify(req.body)} ${err}`);
        res.status(500).send();
    }
});
 
app.post('/user', async (req, res) => {
    if (req.query?.confirm) {
        res.send(req.body)
    }
})
app.use(function (err, req, res, next) {
    res.status(err.status || 500).json({status: err.status, message: err.message})
  });

const port = parseInt(process.env.PORT) || 8080;
if(process.env.NO_LISTEN){
    console.log('Not listening : for testing purposes')
} else{
    app.listen(port, () => {
    console.log(`${process.env.SERVICE_NAME}: listening on port ${port}`);
    });
}



// Exports for testing purposes.
module.exports = app;
