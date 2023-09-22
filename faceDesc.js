/**
 * FaceAPI Demo for NodeJS
 * - Analyzes face descriptors from source (image file or folder containing multiple image files)
 * - Analyzes face descriptor from target
 * - Finds best match
 */


const path = require('path');
const log = console.log //require('@vladmandic/pilogger');
const tf = require('@tensorflow/tfjs-node'); // in nodejs environments tfjs-node is required to be loaded before face-api
const faceapi = require('./dist/face-api.node.js'); // use this when using face-api in dev mode
const dbscan = require('@cdxoo/dbscan');
const { getFiles , readFile , getEventFile }  = require("./filestorage.js")
const { descriptor2fid, fid2descriptor,descriptor2blob,  setDoc, retrieveFaces  }  = require("./facedatabase.js")
const { getAvg} = require('./util')

let modelLoaded=false
let subSet= (obj,keys) => keys.reduce((a,k)=>{a[k]=obj[k];return a;},{})

let optionsSSDMobileNet;
const minConfidence = 0.1;
const distanceThreshold = 0.9;
const modelPath = 'model';
// const labeledFaceDescriptors = [];
let dbFile;

async function initFaceAPI() {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceExpressionNet.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    await faceapi.nets.ageGenderNet.loadFromDisk(modelPath);
    optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({ minConfidence, maxResults: 100 });
}

/**
 * 
 * @param {*} imageFile 
 * @param {*} minConfidence 
 */
async function getDescriptors(imageFile,minConfidence) {
    if (!modelLoaded) {
        initFaceAPI(); modelLoaded=true;
    }
    const buffer = await readFile(imageFile);
    const tensor = tf.node.decodeImage(buffer, 3);
    const faces = await faceapi.detectAllFaces(tensor, optionsSSDMobileNet)
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender()
        .withFaceDescriptors();
    tf.dispose(tensor);
    //   faces.forEach(f=>{
    //     log.data(`x:${xpct} y:${ypct} ${expr[0]} ${expr[1].toFixed(2)}`,f.gender,f.age.toFixed(0))
    //   })
    return faces.filter(x=>(x.detection.score> (minConfidence||0.7)))
                .map((f) => {

        let expr = Object.entries(f.expressions)
                            .sort(function (a, b) { return b[1] - a[1]; })[0]
        //expr[1]=expr[1].toFixed(2)//
        let xpct = Math.round(100 * f.alignedRect.box.left / f.alignedRect.imageWidth) 
        let ypct = Math.round(100 * f.alignedRect.box.top / f.alignedRect.imageHeight) 

        return {
            // "f": path.basename(imageFile),
            "fid": f.descriptor,
            "expression": expr,
            "pos": [xpct, ypct],
            "gender": f.gender,
            age: Math.round(f.age),
            score: f.detection.score,
        }
    });
}

/**
 * 
 * @param {*} event 
 * @param {*} inputFile 
 * @param {*} noDbSave 
 */
async function registerImage(event,inputFile,noDbSave) {
    if (!inputFile.toLowerCase().endsWith('jpg') && !inputFile.toLowerCase().endsWith('png') && !inputFile.toLowerCase().endsWith('gif')) return [];
    log('Registering',new Date(), inputFile);
    let data =await getDescriptors(getEventFile(event, inputFile));
                
    let faceDescriptors=data.map(x=> subSet(x, ["fid","expression","age","gender","pos","score"]))
    if(!noDbSave) {
        saveFaces(event,inputFile,{"f":faceDescriptors})
        console.log(`${inputFile}: ${faceDescriptors.length} faces`)
    }
    return faceDescriptors

}



function saveFaces(event,image,data){
    let fspath = (i) => `races/${event}/images/${image}/f/${i}`
    // setDoc(fspath(i),x)
    
    data=data.f.map((x,i)=>{
                        // x.fid=descriptor2fid(x.fid)
                        x.fid=descriptor2blob(x.fid)
                        setDoc(fspath(i),x)
                    })
    // const fs = require('fs');
    // fs.writeFileSync('database'+'.db',JSON.stringify(data))
}

/**
 * 
 * @param {*} event 
 * @param {*} filePath 
 * @param {*} opts : maxDist, firebaseResults
 */
async function matchFaceInFile(event,filePath,opts) {

    let eventFids = await retrieveFaces(event)
    
    if (typeof filePath === 'string'){
        // var searchFids=fids.filter(x=>x.file==file)
        var searchFids =await getDescriptors(filePath);
        
        searchFids=searchFids.filter((f,i) => (f.score>.9) || (i<0))
        console.info(`Found ${searchFids.length} faces for scanning in ${filePath}`)
    } else {
        console.error("send the blob for scanning")
    }
    
    if  (searchFids.length) {    
    
        maxDist = opts?.maxDist || 0.4 //lower is strict
        let matches=[]

        for (let curFile in eventFids) { // for each file
            loopSearch:
            for (let i=0; i<eventFids[curFile].length ; i++){  // for face in file
                for (let searchFaceNo = 0; searchFaceNo < searchFids.length; searchFaceNo++) {           
                    let dist=await faceapi.euclideanDistance(
                                        searchFids[searchFaceNo].fid, 
                                        eventFids[curFile][i])
                    console.warn(`${filePath.split("/").pop()}:${searchFaceNo} = ${curFile.split("/").pop()}${i} => ${(dist*100).toFixed(2)}`)    
                    if (dist <= maxDist) {

                        matches.push([i, curFile, dist]);

                        if (opts?.firebaseResults){
                            setDoc(`facesearch/${event}/${filePath}/${curFile}`,
                                    {f:`${searchFaceNo}/${searchFids.length}`,d:dist })
                        }// console.log(`${file}:${searchFaceNo} ${i} ${dist}`)
                        break loopSearch;
                    }
                }
            }
        }
        matches.sort(function (a, b) { return b[1] - a[1]; })
        return matches
    } else{ 
        console.warn(`No faces found in the ${filePath}`)
    }
}


async function matchFace(event,file,name, addtoPool) {

    

}


/**
 * 
 * @param {*} dataset 
 * @param {*} minScore 
 * @param {*} eps 
 * @returns 
 */
function clustering(dataset, minScore, eps) {
    let data = dataset.filter(x => x.score > minScore);
    // 1000 ops in 40 seconds
    // console.time("euclide");
    // for(i=0;i<1000;i++) faceapi.euclideanDistance(dataset[3000].fid,dataset[i].fid)
    // console.timeEnd("euclide");
    /** Epsilong value for 1000 images
     *  0.31 136, 0.32 136,0.33 138,0.34 142,0.35 141,0.36 144,0.37 145,,0.38 141
     */
    let n = data.length; //100//

    // for( n=100; n <= dataset.length; n=n+100) 
    {
        console.time("dbscan");
        var ret = dbscan({
            dataset: data.slice(0, n),
            epsilon: eps,
            distanceFunction: (a, b) => faceapi.euclideanDistance(a.fid, b.fid)
        });
        console.timeEnd("dbscan");
        // => {
        //    clusters: [ [0,1], [2,3] ],
        //    noise: []
        //}
        log(minScore, eps, n, ret.clusters.length, ret.noise.length);
    }

    let clusters = ret.clusters.map(clust => clust.map(i => data[i]));



    let clusterDocs = clusters.map(getAggr);

    // extractUrl(event, data, i)
    ret.noise.forEach(i => clusters.push([data[i]]));
    return { clusters, ret };
}

function prepareForClustering(filesNames, fids, dataset) {
    filesNames = Object.keys(fids);
    dataset = [];
    filesNames.forEach(f => fids[f]
        .forEach(face => {
            face['file'] = f;
            face['fid'] = Float32Array.from(Object.values(face.fid));
            dataset.push(face);
        }));
    return { filesNames, dataset };
}

function extractUrl(event, dataset, i) {
    let obj=dataset[i]
    obj.file=getUrl(`gs://${bucket}/thumbs/${event}/${obj.file}`)
    return obj ;
}



let getAggr = (clust) => {

    let meanDesc = meanDescriptor(clust.map(x => x.fid));
    // console.log('>>', fltSubArr(meanDesc,0,4),"\n",
    //             clust.map(x=>fltSubArr(x.fid,0,4)))
    return {
        score: getAvg(clust, "score"),
        age: getAvg(clust, "age"),
        size: clust.length,
        avgFid: meanDesc
    };
};

let meanDescriptor = (descArray) => {
    let iTo128 = [...Array(descArray[0].length).keys()];
    return new Float32Array(iTo128.map(i => getAvg(descArray, i)));
};

// async function main(argv) {
//     argv= argv||process.argv
//     argv=argv.filter(x=> !["mocha","--watch","--slow"].some(kw=>x.includes(kw)))
//     // console.log(argv)
//     fileDescriptors={}

//     // log.header();
//     if (argv.length !== 4) {
//         console.error([1], 'Expected <source image or folder> <target database>.'+`Got ${argv.length} arguments`);
//         process.exit(1);
//     }
//     await initFaceAPI();
//     // log.info('Input:', argv[2]);

//     dbFile = path.join(argv[2], `${argv[3]}`)
    
//     let dir = await getFiles(argv[2]);

//     for (const f of dir) {
//         let fDescr = await registerImage(argv[2]+ f)
        
//         fileDescriptors[f]=fDescr.map(x=> subSet(x, ["fid","expression","age","gender","pos"]))
//         console.log(`${f}: ${fDescr.length} faces`)
                
//         saveFaces(f,{"f":fileDescriptors[f]})
        
//         // for (let d of fDescr){
//         //     fileDescriptors.push(d);
//         // }  ; // register all images in a folder

//         // break; //for faster development
//     }

//     log('Saving:', dbFile, 'Descriptors:', fileDescriptors.length);
//     if (fileDescriptors.length > 0) {
        
//         writeDatabase(argv[2],fileDescriptors)

//     } else {
//         log('No registered faces');
//     }
// }

exports.saveFaces=saveFaces
exports.matchFace=matchFace
exports.subSet=subSet
exports.registerImage=registerImage
exports.matchFaceInFile=matchFaceInFile
exports.clustering=clustering
exports.prepareForClustering=prepareForClustering
exports.getAggr=getAggr
exports.extractUrl=extractUrl
// exports.main=main

// main();

