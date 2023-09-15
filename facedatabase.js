
const {getApp}  = require( './myfirebase');
const { getFirestore } = require('firebase-admin/firestore');
// import { collection, doc, setDoc } from "firebase/firestore";

app = getApp()
let db = getFirestore()

exports.listColls= async function (path) {

    return await db.listCollections()
    // debugger
}

exports.getDocs= async function (path) {
    // console.log(db.collection)
    try{
        data = await db.collection(path).get()
        return data.docs.map(d=>d.data())

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

exports.descriptor2fid = (obj) => JSON.stringify(obj, function (key, value) {
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

exports.fid2descriptor = (obj) => JSON.parse(jsonStr, function (key, value) {
    // the reviver function looks for the typed array flag
    try {
        if ("flag" in value && value.flag === "FLAG_TYPED_ARRAY") {
            // if found, we convert it back to a typed array
            return new context[value.constructor](value.data);
        }
    } catch (e) { }

    // if flag not found no conversion is done
    return value;
});
