/**
 * FaceAPI Demo for NodeJS
 * - Analyzes face descriptors from source (image file or folder containing multiple image files)
 * - Analyzes face descriptor from target
 * - Finds best match
 */


const path = require('path');
const tf = require('@tensorflow/tfjs-node'); // in nodejs environments tfjs-node is required to be loaded before face-api
const faceapi = require('./dist/face-api.node.js'); // use this when using face-api in dev mode
const  forEachOfLimit = require("async/eachOfLimit");
const { writeFile , readFile , getEventFile }  = require("./filestorage.js")
const { descriptor2blob, setDoc, delDoc,retrieveFaces, setDocArray  }  = require("./facedatabase.js")
const { getAvg,log, errorHandler} = require('./util')

let modelLoaded=false
const _ = require("lodash")
let subSet=_.pick //(obj,keys) => keys.reduce((a,k)=>{a[k]=obj[k];return a;},{})

let optionsSSDMobileNet;

const minConfidence = 0.8;
const distanceThreshold = 0.9;
const modelPath = 'model';

async function initFaceAPI() {
    if(modelLoaded) return
    log("loading model")    
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceExpressionNet.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    await faceapi.nets.ageGenderNet.loadFromDisk(modelPath);
    optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({ minConfidence, maxResults: 100 });
    modelLoaded=true ;
}
exports.initFaceAPIOnce = initFaceAPI //_.once()

/**
 * getDescriptors
 * @param {*} imageObj or Blob
 * @param {*} minConfidence 
 */
async function getDescriptors(imageObj,minConfidence) {
    
    await initFaceAPI() ; 

    try{
        var buffer = await getBufferStorage(imageObj)
    } catch (e) {       //.catch(errorHandler);
        console.error(`Error getting buffer`,imageObj,e)
        return []
    }

    try{
        const tensor = tf.node.decodeImage(buffer, 3) ; 
    
        var faces = await faceapi.detectAllFaces(tensor, optionsSSDMobileNet)
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender()
            .withFaceDescriptors();
        tf.dispose(tensor);
    } catch (e) {
        // faces.forEach(f=>{
        //     log.data(`x:${xpct} y:${ypct} ${expr[0]} ${expr[1].toFixed(2)}`,f.gender,f.age.toFixed(0))
        //   })
        console.error("error processing",imageObj)
        errorHandler(e)
        return [] 
    }

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

async function getBufferStorage(imageObj) {
    let buffer
    if ( imageObj.kind == 'storage#object')  // source is storage object
        buffer = await readFile(imageObj.imageFile);
    else {
        buffer = imageObj.buffer; //assume buffer  // source is buffer
        let GCSpath = `faceuploads/${imageObj.event}/${imageObj.imageFile.split('/').pop()}`;
        writeFile(GCSpath, buffer);
    }
    return buffer;
}

/**
 * 
 * @param {*} event 
 * @param {*} inputFile 
 * @param {*} noDbSave 
 */
async function registerImage(imageObj) {

    let {event, imageFile,noDbSave}=imageObj
    imageFile=imageFile.split("/").pop()
    
    if (!imageFile.toLowerCase().endsWith('jpg') && !imageFile.toLowerCase().endsWith('png') && !imageFile.toLowerCase().endsWith('gif')) return [];
    // log('Registering', inputFile);
    let data =await getDescriptors(imageObj); //removed getEventFile(event, imageFile)
                
    let faceDescriptors=data.map(x=> subSet(x, ["fid","expression","age","gender","pos","score"]))
    if(!noDbSave) {
        await saveFaces(event,imageFile,{"f":faceDescriptors})
        log(`${imageObj.i||'-'}: ${imageFile}: ${faceDescriptors.length} faces`)
    }
    return faceDescriptors

}

async function saveFaces(event,image,data){
    // let fspath = (i) => `races/${event}/images/${image}/f/${i}`
    
    // data=data.f.map(async (x,i)=>{
    //                     x.fid=descriptor2blob(x.fid)
    //                     await setDoc(fspath(i),x)
    //                 })

    let path = `races/${event}/images/${image}/f`

    data=data.f.map( (x,i)=>{
                        x.fid=descriptor2blob(x.fid)
                        return x
                    })

    return await setDocArray(path,data)
                    
}

/**
 * 
 * @param {*} event 
 * @param {*} imageObj (could be Object)
 * @param {*} opts : maxDist, firebaseResults
 */
async function matchFaceInFile(event,imageObj,opts) {

    let clusters = await retrieveFaces(event).catch(errorHandler) ;
        
    var searchFids = await getFacesSearchFile(imageObj)
                                .catch(errorHandler) ;
    
    if  (!searchFids?.length) {
        log(`No faces found in the uploaded image`)
        throw new Error('No faces to search') 
    }
    
    let maxDist = opts?.maxDist || 0.6 //lower is strict

    if (opts?.firebaseResults){
        var basename=imageObj.imageFile.split('/').pop() ;
        setDoc(`facesearch/${event}/uploads/${basename}`,
            {
                ts:new Date().toISOString(),
                fids: searchFids.map(x=> _.omit(x,['fid','pos'])),
                maxDist: maxDist,
            })
    }    
    let matches=[] ;
    let stats={} ;
    clusters.forEach((clust,i)=>{  // for face in file

        for (let searchFaceNo = 0; searchFaceNo < searchFids.length; searchFaceNo++) {           
            // process.stdout.write(`\t\t\t\t${i}/${clusters.length}\r`);
            // log(stats)
            let dist = faceapi.euclideanDistance(
                                searchFids[searchFaceNo].fid, 
                                clust.fid)

            stats[parseInt(dist*10)]= 1 + (stats[parseInt(dist*10)]??0)
            
            if (dist <= maxDist) {
                // if a single file make it a array
                let files = (_.isArray(clust.file)) ? clust.file : [clust.file]
                
                let saveMatchesInDb = async (file,j)=>{
                    // console.warn(j) //`search:${searchFaceNo} = ${i} => ${dist.toFixed(2)} ${clust.file}}`,String(j).padStart(2,'0'))   
                    let matchImg={
                        dist:dist,
                        file:file,
                        score: clusters[i].score
                    }
                    matches.push(matchImg)
                    
                    if (opts?.firebaseResults){        
                        let clustName =`${String(i).padStart(4, '0')}${clusters[i].size?"=":"-"}${String(j).padStart(2,'0')}`
                        setDoc(`facesearch/${event}/uploads/${basename}/matches/${clustName}`,matchImg)
                            // .then(x=>log("saved",x))
                            .catch(errorHandler) ;
                    }
                }
                // insert one row for each file   
                // await forEachOfLimit(files,2,saveMatchesInDb) ; 
                files.forEach(saveMatchesInDb) ;              
            }              
        }
    })        
    matches.sort(function (a, b) { return b[1] - a[1]; })
    // log(stats)
    log(`${matches.length} matches found with maxDist: ${maxDist}`)
    return matches
}

/**
 * 
 * @param {*} imageObj 
 */
async function getFacesSearchFile(imageObj) {
    // if ( imageObj.kind == 'storage#object') {
        // var searchFids = await getDescriptors(imageObj);

    // } else {
        var searchFids = await getDescriptors(imageObj)
            .catch(new Error('cant get descriptors'));
        // console.error("send the blob for scanning");
    // }

    searchFids = searchFids.filter((f, i) => (f.score > .98) || (i <= 0));
    log(`Found ${searchFids.length} faces for scanning in ${imageObj.imageFile}`);
    return searchFids;
}

function extractUrl(event, dataset, i) {
    let obj=dataset[i]
    obj.file=getUrl(`gs://${bucket}/thumbs/${event}/${obj.file}`)
    return obj ;
}


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
//     await initFaceAPIOnce();
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
// exports.matchFace=matchFace
exports.subSet=subSet
exports.registerImage=registerImage
exports.matchFaceInFile=matchFaceInFile
exports.extractUrl=extractUrl


// main();

