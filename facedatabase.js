
const {getApp}  = require( './myfirebase');
const { getFirestore } = require('firebase-admin/firestore');
// import { collection, doc, setDoc } from "firebase/firestore";

app = getApp()
let db = getFirestore()
let  msBufferExpiry=1000*3600 // buffer expires after 1 hr

async function retrieveFacesAll(event) {
    //`/races/${event}/faces`
    
    let imageFaces={}
    let images = await getDocs(`races/${event}/images`).catch(console.error)
    // let images = await db.collection(`facesearch/${event}/images`).collectionGroup().then(x=>

    // i=1
    promises=[]
    for (let img in images){
        // console.log(i++,img)
        promises.push( await getDocs(`races/${event}/images/${img}/f`)
                        .then(faces=>{
                            imageFaces[img]=Object.values(faces).map(face1=>{
                                    face1.fid= blob2descriptor(face1.fid)
                                    return face1;
                            })
                        })
                    )
        
    }
    await Promise.all(promises)
    // for (let img in images){
    //     console.log(i++,img)
    //     const faces=await getDocs(`races/${event}/images/${img}/f`)
    //     imageFaces[img]=Object.values(faces)
    // }
    // return  imageFaces
    return  imageFaces

}


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


exports.listColls= async function (path) {

    return await db.doc(path).listCollections()
    // debugger
}

let getDocs= async function (path) {
    // console.log(db.collection)
    try{
        data = await db.collection(path).get().catch(console.error)
        // console.log(data.docs.map(d=>d.id))
        let ret={}
        data.docs.forEach(d=>{
            ret[d.id]=d.data()
        })
        return ret
    } catch (e) {
        console.error(e)
    }
}

exports.delDoc= async function (path) {
    try{
        ret = await db.doc(path).delete()
        return ret;
        
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
exports.fid2descriptor=fid2descriptor
exports.descriptor2fid=descriptor2fid
exports.descriptor2blob=descriptor2blob
exports.blob2descriptor=blob2descriptor
exports.descriptorToB64=descriptorToB64
exports.b64ToDescriptor=b64ToDescriptor