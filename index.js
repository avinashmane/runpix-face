/**
 * Run-pix face
 * 
 * purpose:  API host for face recognition using face-api
 * 
 * can be Google cloud run: service or job (with parameters)
 * help: node index.js [SCAN|CLUSTER|SCANCLUSTER|SERVER] [RACEID]
 * 
 */
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
    if (req.query?.event) {
        let event = req.query?.event

        await eventScan(event);
        res.status(200).send();
    } else {
        res.status(500).send('Something broke!')
    }

});  


app.get('/api/eventcluster', async (req, res) => {
    if (req.query?.event) {
        let event = req.query?.event

        let minScore = process.env.CLUSTER_MINSCORE || .98
        let eps = process.env.CLUSTER_EPSILON || .3
        
        await eventCluster(event, minScore, eps, res).then((ret) => {
            res.status(200).send(`processed ${event} images:${ret.filesNames.length} ${ret.clusters.length}  ${ret.noise.length}`);
        })

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

async function eventCluster(event, minScore, eps) {

    delDoc(`/facesearch/${event}`, { recursive: true })
        .then(x => {
            log(`deleted /facesearch/${event}`);
        })
        .catch(console.error);

    await retrieveFacesAll(event)
        .then(fids => {

            //map fids to array
            ({ filesNames, dataset } = prepareForClustering(fids));

            // clustering and saving on firestore
            var { clusters, ret } = clustering(event, dataset, minScore, eps);

            return { filesNames, clusters, ret }
        })
        .catch(console.error);
}

async function eventScan(event) {
    const  mapLimit = require("async/mapLimit");

    
    st_path = getEventFile(event, "");
    const dir = await getFiles(st_path);
    log(`processing ${dir.length} at ${st_path}`);
    // console.dir(dir)
    // res.send(`processing ${dir.length}. Check log `);
    let imageObjs = dir.map((f, i) => {
        return {
            i: i,
            imageFile: st_path.replace("gs://", "") + f,
            event: event,
            kind: "storage#object",
        };
    });

    await mapLimit(imageObjs, 3, registerImage);

    console.info(`processed ${dir.length} ${event}`);
}

/**
 * --------------------------------------------------------------------------------------------------------
 */

const port = parseInt(process.env.PORT) || 8080;
process.env.DEBUG=process.env.DEBUG||'TS'
    
console.log(`Parameters (${process.argv.length}): ${process.argv.slice(2).join(' ')}`)

if (["","SERVER","server"].includes(process.argv[2]) || !process.argv[2]) { 
    // start server
    app.listen(port, () => {
        console.log(`${process.env.SERVICE_NAME}: listening on port ${port}`);
    });
} 

if( ["SCAN","scan","SCANCLUSTER"].includes(process.argv[2]) ){
    if (!process.argv[3]) {
        console.warn(`\n\nhelp: node index.js ${process.argv[2]} [RACEID]`)
        process.exit(1);
    }
    
    console.log(`Scanning images for event ${process.argv[3]}`)
    eventScan(process.argv[3])

} else if (["CLUSTER","cluster","SCANCLUSTER"].includes(process.argv[2])) {
    if (!process.argv[3]) {
        console.warn(`\n\nhelp: node index.js ${process.argv[2]} [RACEID]`)
        process.exit(1);
    }

    console.log(`Clustering faces event ${process.argv[3]}`)
    eventCluster(process.argv[3], 
        process.argv[4]||0.98, 
        process.argv[5]||0.3)

} else {
    console.warn(`\n\nhelp: node index.js [SERVER|SCAN|CLUSTER] [RACEID]\
    n> ${process.argv.join(' ')}`)
}


async function eventScan(event) {
    const  mapLimit = require("async/mapLimit");
        
    st_path = getEventFile(event, "");
    const dir = await getFiles(st_path);
    log(`processing ${dir.length} at ${st_path}`);
    // console.dir(dir)
    // res.send(`processing ${dir.length}. Check log `);
    let imageObjs = dir.map((f, i) => {
        return {
            i: i,
            imageFile: st_path.replace("gs://", "") + f,
            event: event,
            kind: "storage#object",
        };
    });

    await mapLimit(imageObjs, 3, registerImage);

    console.info(`processed ${dir.length} ${event}`);
}



// Exports for testing purposes.
module.exports = app;

