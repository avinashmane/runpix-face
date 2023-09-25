/**
 * FaceAPI Demo for NodeJS
 * - Analyzes face descriptors from source (image file or folder containing multiple image files)
 * - Analyzes face descriptor from target
 * - Finds best match
 */


const path = require('path');
const faceapi = require('./dist/face-api.node.js'); // use this when using face-api in dev mode
const dbscan = require('@cdxoo/dbscan');
const { getFiles , readFile , getEventFile }  = require("./filestorage.js")
const { descriptor2blob, setDoc, delDoc,retrieveFaces, deleteCollection  }  = require("./facedatabase.js")
const {getAvg, log} = require('./util.js')

let modelLoaded=false
const _ = require("lodash")
let subSet=_.pick //(obj,keys) => keys.reduce((a,k)=>{a[k]=obj[k];return a;},{})

let optionsSSDMobileNet;

const minConfidence = 0.1;
const distanceThreshold = 0.9;
const modelPath = 'model';


/**
 * 
 * @param {*} dataset 
 * @param {*} minScore 
 * @param {*} eps 
 * @returns 
 */
function clustering(event, dataset, minScore, eps) {
    // 1000 ops in 40 seconds
    // console.time("euclide");
    // for(i=0;i<1000;i++) faceapi.euclideanDistance(dataset[3000].fid,dataset[i].fid)
    // console.timeEnd("euclide");
    /** Epsilong value for 1000 images
     *  0.31 136, 0.32 136,0.33 138,0.34 142,0.35 141,0.36 144,0.37 145,,0.38 141
     */
    // hoping old clusters will be deleted by the time new cluster is created


    let data = dataset.filter(x => x.score > minScore);
    let n = data.length;

    //console.time("dbscan");
    var ret = dbscan({
        dataset: data.slice(0, n),
        epsilon: eps,
        distanceFunction: (a, b) => faceapi.euclideanDistance(a.fid, b.fid)
    });

    log(minScore, eps, n, ret.clusters.length, ret.noise.length);

    let clusters = ret.clusters.map(clust => clust.map(i => data[i]));

    let getAggr = (clust) => {
        let meanDesc = meanDescriptor(clust.map(x => x.fid));
        // console.log('>>', fltSubArr(meanDesc,0,4),"\n",
        //             clust.map(x=>fltSubArr(x.fid,0,4)))
        return {
            score: getAvg(clust, "score"),
            age: getAvg(clust, "age"),
            size: clust.length,
            fid: meanDesc,
            file: clust.map(x=>x.file)
        };
    };
    let clusterDocs = clusters.map(getAggr);

    ret.noise.forEach(i => clusterDocs.push(data[i]));
    
    
    clusterDocs.forEach((x,i)=>{
        x.fid=descriptor2blob(x.fid) ;
        docKey=String(i).padStart(4, '0')+"-"+x.age.toFixed(0)
        setDoc(`/facesearch/${event}/clusters/${docKey}`,x);

        if (x.size){
            clusters[i].forEach((f,fno)=>{
                f.fid=descriptor2blob(f.fid)
                setDoc(`/facesearch/${event}/clusters/${docKey}/f/${fno}`,f)
            })
        }
    })
    
    // ret.noise.forEach(i => clusters.push([data[i]]));

    return { clusters, ret };

}

function prepareForClustering(filesNames, fids, dataset) {
    filesNames = Object.keys(fids);
    dataset = [];
    filesNames.forEach(f => 
        fids[f].forEach(face => {
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

exports.clustering=clustering
exports.prepareForClustering=prepareForClustering
// exports.getAggr=getAggr
exports.extractUrl=extractUrl
// exports.main=main

// main();

