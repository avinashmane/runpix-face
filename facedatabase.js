
const {getApp}  = require( './myfirebase');
const { getFirestore } = require('firebase-admin/firestore');
const  mapLimit = require("async/mapLimit");
const { log} = require('./util')
var _ = require('lodash');
const { data } = require('@tensorflow/tfjs');

app = getApp()
let db = getFirestore()
const  msBufferExpiry=1000*3600 // buffer expires after 1 hr
const MAX_RETRY_ATTEMPTS=1
let imageFaces={}
let loading={}


async function retrieveFacesAll(event) {
    
    let images=[]

    if (_.isEmpty(imageFaces)){
        if (!loading.retrieveFacesAll_img) {
            
            loading.retrieveFacesAll_img=getIds(`races/${event}/images`)
                    .then(data=>{ 
                        images=data
                        log(`got ${data.length} imgs`)
                    })
                    .catch(console.error)
        } 
        await loading.retrieveFacesAll_img
        try {delete loading.retrieveFacesAll_img} catch {}

        if (!loading.retrieveFacesAll){ 
            loading.retrieveFacesAll = mapLimit(images,50,getFaces).catch(console.error)      
        }
        await loading.retrieveFacesAll
        
        try {delete loading.retrieveFacesAll} catch {}
        // promises=[]
        // for (let img in images){
        //     // console.log(i++,img)
        //     promises.push( await getDocs(`races/${event}/images/${img}/f`)
        //                     .then(faces=>{
        //                         imageFaces[img]=Object.values(faces).map(face1=>{
        //                                 face1.fid= blob2descriptor(face1.fid)
        //                                 return face1;
        //                         })
        //                     })
        //                 )
            
        // }

        // await Promise.all(promises)
        // for (let img in images){
        //     console.log(i++,img)
        //     const faces=await getDocs(`races/${event}/images/${img}/f`)
        //     imageFaces[img]=Object.values(faces)
        // }
        async function getFaces(file) {
            // console.log(file);
            return await getDocs(`races/${event}/images/${file}/f`)
                            .then(faces=>{
                                imageFaces[file]=Object.values(faces).map(face1=>{
                                        face1.fid= blob2descriptor(face1.fid)
                                return face1;
                                })
                            })
        }
        
    }
    return  imageFaces

}

/** we have new version to search fro firestore:/facesearch
let faceDb={event:null,fids:[],ts:null} // for caching
async function retrieveFaces(event) {
    //  diffrent event        or  buffer expired

    if ((faceDb.event!=event) || (faceDb.ts && (new Date(faceDb.ts.getTime() + msBufferExpiry) < new Date()))){
        let fidObj = await retrieveFacesAll(event)
        let fids={}
        for (let f in fidObj){     //for all files
            if(fidObj[f].length)  // if face in the file
                fids[f]= fidObj[f].map((x)=> 
                    x.fid); //get only the fid decsription
        }
        faceDb = {event:event,
                  fids:  fids,
                  ts: new Date() }
    }
    return faceDb.fids
}
 */
let retrieveFaces = _.memoize(retrieveFacesFireStore)
async function retrieveFacesFireStore(event) {
    let data = await getDocs(`/facesearch/${event}/clusters/`);
    data = _.values(data).map(k=> {
        k.fid=blob2descriptor(k.fid);
        return k ;
    })
    return data;
}

exports.listColls= async function (path) {

    return await db.doc(path).listCollections()
    // debugger
}

let getDocs= async function (path) {
    
    try{
        let data = await db.collection(path).get().catch(console.error)
        let ret={}
        data.docs.forEach(d=>{
            ret[d.id]=d.data()
        })
        return ret
    } catch (e) {
        console.error(e)
    }
}

let getIds= async function (path) {
    try {
        let data = await db.collection(path)
                .get()
                .then(x=>
                    x.docs.map(d=>d.id))
                .catch(console.error)
        return  data
    } catch (e) {
        console.error(e)
    }
}

exports.setDoc= async function (path,data) {
    // console.log(db.collection)
    try{
        ret = await db.doc(path).set(data)   
        return ret
    } catch (e) {
        console.error(e)
    }
}

exports.delDoc= async function (path, options) {
    if (options?.recursive) 
        await deleteDocumentRecursive(db.doc(path))
    try{
        ret = await db.doc(path).delete()
        return ret;
        
    } catch (e) {
        console.error(e)
    }

}

async function deleteDocumentRecursive(docRef){
    const bulkWriter = db.bulkWriter();
    bulkWriter.onWriteError((error) => {
        if (error.failedAttempts < MAX_RETRY_ATTEMPTS ) {
            return true;
        } else {
            console.log('Failed write at document: ', error.documentRef.path);
            return false;
        }
    });
    return await db.recursiveDelete(docRef, bulkWriter);
}

let descriptor2fid = (obj) => JSON.stringify(obj, function (key, value) {
    // the replacer function is looking for some typed arrays.
    // If found, it replaces it by a trio
    if (value instanceof Int8Array ||
        value instanceof Uint8Array ||
        value instanceof Uint8ClampedArray ||
        value instanceof Int16Array ||
        value instanceof Uint16Array ||
        value instanceof Int32Array ||
        value instanceof Uint32Array ||
        value instanceof Float32Array ||
        value instanceof Float64Array) {
        var replacement = {
            constructor: value.constructor.name,
            data: Array.apply([], value),
            flag: "FLAG_TYPED_ARRAY"
        }
        return replacement;
    }
    return value;
});

// DECODING ***************************************

let fid2descriptor = (jsonStr) => JSON.parse(jsonStr, function (key, value) {
    // the reviver function looks for the typed array flag
    try {
        if ("flag" in value && value.flag === "FLAG_TYPED_ARRAY") {
            // if found, we convert it back to a typed array
            // return new context[value.constructor](value.data); //ATM
            return new Float32Array(value.data)
        }
    } catch (e) { }

    // if flag not found no conversion is done
    return value;
});

function blob2descriptor(buf) {
    return new Float32Array(buf.buffer.slice(buf.offset,buf.offset+buf.length));
    
}
function descriptor2blob(arr) {
    return new Buffer.from(arr.buffer)
}

function b64ToDescriptor(b64) {
    return blob2descriptor(Buffer.from(b64, 'base64'))
    
}
function descriptorToB64(arr) {
    return new Buffer.from(arr.buffer).toString('Base64')
}


exports.retrieveFacesAll=retrieveFacesAll
exports.retrieveFaces=retrieveFaces
exports.getDocs=getDocs
exports.getIds=getIds
exports.delDoc=this.delDoc
exports.fid2descriptor=fid2descriptor
exports.descriptor2fid=descriptor2fid
exports.descriptor2blob=descriptor2blob
exports.blob2descriptor=blob2descriptor
exports.descriptorToB64=descriptorToB64
exports.b64ToDescriptor=b64ToDescriptor
