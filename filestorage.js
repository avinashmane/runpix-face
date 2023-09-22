
/**
 * The ID of your GCS bucket
const bucketName = 'run-pix.appspot.com';
The directory prefix to search for WITH ENDING '/'
const prefix = 'processed/testrun/';

 */
const { getStorage } = require('firebase-admin/storage');
const {getApp}  = require( './myfirebase');
const app=getApp()
const storage = getStorage(app)
const fs = require('fs');

let folder=process.env['INPUT_FOLDER'] || 'processed'
let bucket=process.env['BUCKET'] || 'run-pix.appspot.com'

exports.getEventFile = (event, file, gs_folder) =>{
    gs_folder=gs_folder||folder;
    return `gs://${bucket}/${gs_folder}/${event}/${file}`;
}

exports.readFile = async function (filePath) {
    let contents;
    try{
        if (filePath.substring(0,5).toLowerCase()=='gs://' || filePath.includes(folder)){
            let gs_path =getGSpath(filePath)
            contents =   await getStorage().bucket(gs_path[1]).file(gs_path[2]).download()
            contents = contents[0]
        } else {
            contents = fs.readFileSync(filePath);
        }
        return contents;
    } catch (e) {
        console.error(e)
    }
}
/**
 * 
 * @param {*} dirPath 
 */
function getGSpath(dirPath){
    let dirPref= dirPath.split("/",3) ;   
    let prefix = dirPath.replace(dirPref.join("/"),"")
    if (prefix[0]=="/") prefix = prefix.substring(1)  
    return ["gs://",dirPref[2],prefix]
}

exports.getFiles = async function (dirPath) {

    try {
        if (dirPath.substring(0,5).toLowerCase()=='gs://'){ 
            let [_,bucketName,prefix]=getGSpath(dirPath)
            let dir = await getFilesStorage( bucketName,prefix)
            return dir.map(d => d.replace(prefix,""))

        } else if (fs.statSync(dirPath).isFile()) {
            return [dirPath]; // register image
        }
        else if (fs.statSync(dirPath).isDirectory()) {
            const dir = fs.readdirSync(dirPath);
            return dir
        }
    } catch (e) {console.error(e)}

}

let getFilesStorage = async function (bucketName, prefix) {

    // The delimiter to use
    const delimiter = '/';
    if (prefix.slice(-1)!="/") prefix = prefix.concat("/")    


    async function listFilesByPrefix(bucketName,prefix) {
        /**
         * This can be used to list all blobs in a "folder", e.g. "public/".
         *
         * The delimiter argument can be used to restrict the results to only the
         * "files" in the given "folder". Without the delimiter, the entire tree under
         * the prefix is returned. For example, given these blobs:
         *
         *   /a/1.txt
         *   /a/b/2.txt
         *
         * If you just specify prefix = 'a/', you'll get back:
         *
         *   /a/1.txt
         *   /a/b/2.txt
         *
         * However, if you specify prefix='a/' and delimiter='/', you'll get back:
         *
         *   /a/1.txt
         */
        const options = {
            prefix: prefix,
        };

        if (delimiter) {
            options.delimiter = delimiter;
        }

        // Lists files in the bucket, filtered by a prefix
        let files
        try {
            [files] = await storage.bucket(bucketName).getFiles(options);
        } catch (e) {
            console.error(e)
        }

        // console.log('Files:');
        return files.map(file => {
            return file.name;
        });
    }

    return await listFilesByPrefix(bucketName,prefix)
            .catch(console.error);
 }

 function getUrl(gs_path)  {
    // const path = require('node:path'); 
    let [b,base,file] = /(?:gs\:\/\/)*([^\/]+)\/(.*)\/([^\/]+)$/.exec(gs_path).slice(1)
    // console.log(encodeURIComponent(file))
    return `https://storage.googleapis.com/${b}/${base}/${encodeURIComponent(file)}` //&alt=media

 }

 /**
  * unused..not working
  */
//  exports.getFilesold = function (path) {

//     const { initializeApp, cert } = require('firebase-admin/app');
//     const { getStorage } = require('firebase-admin/storage');
//     // import { getStorage, ref, listAll } from "firebase/storage";
//     const serviceAccount = require('/home/avinashmane/.config/firebase/serviceaccount.json');

//     initializeApp({
//         credential: cert(serviceAccount),
//         storageBucket: 'run-pix.appspot.com'
//     });

//     const bucket = getStorage().bucket();
//     let a,b;
//     bucket.exists().then(`${bucket} exists`)
//     bucket.file("ref/accDef.json").then(console.warn)

//     async function listFiles(bucket,path) {

//         const opts= {
//             prefix: path,
//           }
//         try {
//         const [files] = await bucket.getFiles(opts);
//         } catch (e) {
//             console.error(e)
//         }

//         console.log('Files:');
//         files.forEach(file => {
//           console.log(file.name);
//         });
//       }
      
//       listFiles(bucket,path).catch(console.error);

// }


exports.getUrl = getUrl
exports.bucket=bucket

