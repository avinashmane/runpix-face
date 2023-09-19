/**
 * FaceAPI Demo for NodeJS
 * - Analyzes face descriptors from source (image file or folder containing multiple image files)
 * - Analyzes face descriptor from target
 * - Finds best match
 */

const fs = require('fs');
const path = require('path');
const log = console.log//require('@vladmandic/pilogger');
const tf = require('@tensorflow/tfjs-node'); // in nodejs environments tfjs-node is required to be loaded before face-api
const faceapi = require('../dist/face-api.node.js'); // use this when using face-api in dev mode
// const faceapi = require('@vladmandic/face-api'); // use this when face-api is installed as module (majority of use cases)

let optionsSSDMobileNet;
const minConfidence = 0.1;
const distanceThreshold = 0.9;
const modelPath = 'model';
let labeledFaceDescriptors = [];

async function initFaceAPI() {
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceExpressionNet.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
    await faceapi.nets.ageGenderNet.loadFromDisk(modelPath);
    optionsSSDMobileNet = new faceapi.SsdMobilenetv1Options({ minConfidence, maxResults: 100 });
}

async function getDescriptors(imageFile) {
    const buffer = fs.readFileSync(imageFile);
    const tensor = tf.node.decodeImage(buffer, 3);
    const faces = await faceapi.detectAllFaces(tensor, optionsSSDMobileNet)
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender()
        .withFaceDescriptors();
    tf.dispose(tensor);

    return faces.map((face) => face.descriptor);
}

async function registerImage(inputFile) {
    if (!inputFile.toLowerCase().endsWith('jpg') && !inputFile.toLowerCase().endsWith('png') && !inputFile.toLowerCase().endsWith('gif')) return;
    log.data('Registered:', inputFile);
    const descriptors = await getDescriptors(inputFile);
    for (const descriptor of descriptors) {
        const labeledFaceDescriptor = new faceapi.LabeledFaceDescriptors(inputFile, [descriptor]);
        labeledFaceDescriptors.push(labeledFaceDescriptor);
    }
}

async function readDb(inputFile) {
    log.data('Reading:', inputFile);
    let data = JSON.parse(fs.readFileSync(inputFile))
    // const descriptors = await getDescriptors(inputFile);

    for (const d of data) {
        d.descriptor = new Float32Array(Object.values(d.descriptor))
        labeledFaceDescriptors.push(d)
    }
}

async function findBestMatch(inputFile) {
    const matcher = new faceapi.FaceMatcher(labeledFaceDescriptors, distanceThreshold);
    const descriptors = await getDescriptors(inputFile);
    const matches = [];
    for (const descriptor of descriptors) {
        const match = await matcher.findBestMatch(descriptor);
        matches.push(match);
    }
    return matches;
}

async function findAllMatches(inputFile, maxDist) {
    // const matcher = new faceapi.FaceMatcher(labeledFaceDescriptors, distanceThreshold);
    const descriptors = await getDescriptors(inputFile);
    console.log(`Faces:${descriptors.length}`);

    const matches = [];
    for (let j = 0; j < labeledFaceDescriptors.length; j++) {
        const d = labeledFaceDescriptors[j]
        for (let i = 0; i < descriptors.length; i++) {
            const dist = await faceapi.euclideanDistance(d.descriptor, descriptors[i]).toFixed(2);
            if (dist <= maxDist) {
                matches.push([j, d.f, dist]);
                console.log(`${j} ${d.expression[0]} ${d.gender} ${d.age.toFixed(0)} ${d.f} ${dist}`)

                // destination will be created or overwritten by default.
                let base = path.basename(d.f)
                fs.copyFile(path.join(process.argv[2], base),
                    path.join('search', base), (err) => {
                        if (err) throw err;

                    });
                break;
            }
        }
    }
    matches.sort(function (a, b) { return b[1] - a[1]; })
    return matches;
}

let jsonStr = (obj) => JSON.stringify(obj, function (key, value) {
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

let decodedJson = (obj) => JSON.parse(jsonStr, function (key, value) {
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

async function main() {
    log.header();
    if (process.argv.length !== 4) {
        log.error(process.argv[1], 'Expected <source image or folder> <target image>');
        process.exit(1);
    }
    await initFaceAPI();
    log.info('Input:', process.argv[2]);
    if (fs.statSync(process.argv[2]).isFile()) {
        await registerImage(process.argv[2]); // register image
    } else if (fs.statSync(process.argv[2]).isDirectory()) {
        // const dir = fs.readdirSync(process.argv[2]);
        // for (const f of dir) await registerImage(path.join(process.argv[2], f)); // register all images in a folder
        readDb(path.join(process.argv[2], 'faceids.json'))
    }
    log.info('Comparing:', process.argv[3], 'Descriptors:', labeledFaceDescriptors.length);
    if (labeledFaceDescriptors.length > 0) {
        // const bestMatch = await findBestMatch(process.argv[3]); // find best match to all registered images
        // log.data('Match:', bestMatch);
        let listmatches = await findAllMatches(process.argv[3], 0.4)
    } else {
        log.warn('No registered faces');
    }
}

main();
