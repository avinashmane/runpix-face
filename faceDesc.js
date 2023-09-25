/**
 * FaceAPI Demo for NodeJS
 * - Analyzes face descriptors from source (image file or folder containing multiple image files)
 * - Analyzes face descriptor from target
 * - Finds best match
 */


const path = require('path');
const tf = require('@tensorflow/tfjs-node'); // in nodejs environments tfjs-node is required to be loaded before face-api
const faceapi = require('./dist/face-api.node.js'); // use this when using face-api in dev mode

const { getFiles , readFile , getEventFile }  = require("./filestorage.js")
const { descriptor2blob, setDoc, delDoc,retrieveFaces  }  = require("./facedatabase.js")
const { getAvg,log} = require('./util')

let modelLoaded=false
const _ = require("lodash")
let subSet=_.pick //(obj,keys) => keys.reduce((a,k)=>{a[k]=obj[k];return a;},{})

let optionsSSDMobileNet;

const minConfidence = 0.1;
const distanceThreshold = 0.9;
const modelPath = 'model';

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
        log(`${inputFile}: ${faceDescriptors.length} faces`)
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

    let clusters = await retrieveFaces(event) ;
    
    var searchFids = await getFacesSearchFile(filePath);
    
    if  (!searchFids.length) {
        log(`No faces found in the ${filePath}`)
        throw new Error('No faces to search') 
    }
    
    maxDist = opts?.maxDist || 0.35 //lower is strict

    if (opts?.firebaseResults){
        var basename=filePath.split('/').pop() 
        setDoc(`facesearch/${event}/uploads/${basename}`,
            {
                ts:new Date().toISOString(),
                fids: searchFids.map(x=> _.omit(x,['fid','pos'])),
                maxDist: maxDist,
            })
    }    
    let matches=[] ;

    clusters.forEach((clust,i)=>{  // for face in file

        for (let searchFaceNo = 0; searchFaceNo < searchFids.length; searchFaceNo++) {           
            // process.stdout.write(`\t\t\t\t${i}/${clusters.length}\r`);

            let dist = faceapi.euclideanDistance(
                                searchFids[searchFaceNo].fid, 
                                clusters[i].fid)

            if (dist <= maxDist) {
                let files
                if(_.isArray(clusters[i].file))
                    files=clusters[i].file
                else
                    files=[clusters[i].file]
                
                    // insert one row for each file
                files.forEach((file,j)=>{
                    log(`search:${searchFaceNo} = ${i} => ${(dist).toFixed(2)} ${clusters[i].size}/${file.slice(-15)}`)    
                    let matchImg={
                        dist:dist,
                        file:file,
                        score: clusters[i].score
                    }
                    matches.push(matchImg)

                    if (opts?.firebaseResults){        
                        setDoc(`facesearch/${event}/uploads//${basename}/matches/${i}-${j}`,matchImg)
                    }
                }) ;

                
                
            }              
        }
    })        
    
    matches.sort(function (a, b) { return b[1] - a[1]; })
    return matches

}


async function getFacesSearchFile(filePath) {
    if (typeof filePath === 'string') {
        // var searchFids=fids.filter(x=>x.file==file)
        var searchFids = await getDescriptors(filePath);

        searchFids = searchFids.filter((f, i) => (f.score > .98) || (i <= 0));
        log(`Found ${searchFids.length} faces for scanning in ${filePath}`);
    } else {
        console.error("send the blob for scanning");
    }
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
// exports.matchFace=matchFace
exports.subSet=subSet
exports.registerImage=registerImage
exports.matchFaceInFile=matchFaceInFile
exports.extractUrl=extractUrl


// main();

