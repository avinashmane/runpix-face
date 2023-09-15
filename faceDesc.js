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
// const faceapi = require('@vladmandic/face-api'); // use this when face-api is installed as module (majority of use cases)

const { getFiles , readFile  }  = require("./filestorage.js")
const { descriptor2fid, fid2descriptor,  setDoc  }  = require("./facedatabase.js")
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

async function getDescriptors(imageFile) {
    if (!modelLoaded) {
        initFaceAPI(); modelLoaded=true;
    }
    const buffer = await readFile(imageFile)
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
    return faces.map((f) => {
        let expr = Object.entries(f.expressions).sort(function (a, b) { return b[1] - a[1]; })[0]
        expr[1]=expr[1].toFixed(2)//
        let xpct = Math.round(20 * f.alignedRect.box.left / f.alignedRect.imageWidth) * 20
        let ypct = Math.round(20 * f.alignedRect.box.top / f.alignedRect.imageHeight) * 20

        return {
            "f": path.basename(imageFile),
            "fid": descriptor2fid(f.descriptor),
            "expression": expr,
            "pos": [xpct, ypct],
            "gender": f.gender,
            age: f.age.toFixed(0),
        }
    });
}
async function registerImage(event,inputFile) {
    if (!inputFile.toLowerCase().endsWith('jpg') && !inputFile.toLowerCase().endsWith('png') && !inputFile.toLowerCase().endsWith('gif')) return [];
    log('Registered:', inputFile);
    let data =await getDescriptors(`gs://run-pix.appspot.com/processed/${event}/${inputFile}`);
                
    let faceDescriptors=data.map(x=> subSet(x, ["fid","expression","age","gender","pos"]))
    saveFaces(event,inputFile,{"f":faceDescriptors})
    console.log(`${inputFile}: ${faceDescriptors.length} faces`)

    return data

}

function saveFaces(event,image,data){
    let fspath = `races/${event}/faces/${image}`
    setDoc(fspath,data)
    // const fs = require('fs');
    // fs.writeFileSync('database'+'.db',JSON.stringify(data))
}

async function main(argv) {
    argv= argv||process.argv
    argv=argv.filter(x=> !["mocha","--watch","--slow"].some(kw=>x.includes(kw)))
    // console.log(argv)
    fileDescriptors={}

    // log.header();
    if (argv.length !== 4) {
        console.error([1], 'Expected <source image or folder> <target database>.'+`Got ${argv.length} arguments`);
        process.exit(1);
    }
    await initFaceAPI();
    // log.info('Input:', argv[2]);

    dbFile = path.join(argv[2], `${argv[3]}`)
    
    let dir = await getFiles(argv[2]);

    for (const f of dir) {
        let fDescr = await registerImage(argv[2]+ f)
        
        fileDescriptors[f]=fDescr.map(x=> subSet(x, ["fid","expression","age","gender","pos"]))
        console.log(`${f}: ${fDescr.length} faces`)
                
        saveFaces(f,{"f":fileDescriptors[f]})
        
        // for (let d of fDescr){
        //     fileDescriptors.push(d);
        // }  ; // register all images in a folder

        // break; //for faster development
    }

    log('Saving:', dbFile, 'Descriptors:', fileDescriptors.length);
    if (fileDescriptors.length > 0) {
        
        writeDatabase(argv[2],fileDescriptors)

    } else {
        log('No registered faces');
    }
}

exports.saveFaces=saveFaces
exports.subSet=subSet
exports.registerImage=registerImage
// exports.main=main

// main();

