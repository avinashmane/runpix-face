/**
 * 
 * 
 * 
 * 
 * face test: sandeep unde 
 * imageUrl: https://storage.googleapis.com/run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06%3A16%3A32.338Z~VENUE~presspune%24gmail.com~1P6A6994.jpg
 * image: run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06:16:32.338Z~VENUE~presspune$gmail.com~1P6A6994.jpg
 * fid:  
 */
process.env.GOOGLE_APPLICATION_CREDENTIALS='/mnt/c/i/auth/run-pix-092258e3cb1b.json'
process.env.RACEID='werun2024'

const expect = require('chai').expect;
const {getApp} =require("../myfirebase")
const {listColls, getDocs,delDoc, setDoc, retrieveFaces, getIds } = require('../facedatabase.js');

const {getFiles, getUrl} = require('../filestorage');
const assert = require("assert")
// const {Blob} = require("@firebase/database-types") //"firebase-admin/firestore")

const faceapi = require('../dist/face-api.node.js');  


const test_file='2024-03-17T01:05:00.000Z~VENUE~avinashmane$gmail.com~_O4A4219.JPG'

describe(`Race: ${process.env.RACEID} blobs operations`, function() {
    let app
    let test_path = '/test'
    let test_data={"comments":"test"}

    keyCount=(obj)=>Object.keys(obj).length

    before( (done)=> {
        app = getApp()
        done()
    });


    it("list blobs (long running)",  (done) => {
        getFiles(`gs://run-pix.appspot.com/processed/${process.env.RACEID}/`).then(blobs=> {
            console.log("getFiles()",keyCount(blobs), blobs.slice(0,4)); //nodes
             blobs
                .slice(0,4)
                .forEach(async (f)=>{
                    let faces=await getIds(`races/${process.env.RACEID}/images/${f}/f`)
                    console.log(faces)
                })
            done()
        })
    }).timeout(50000);

    it("list blobs (uploads)",  (done) => {
        getFiles(`gs://run-pix.appspot.com/processed/${process.env.RACEID}/`).then(blobs=> {
            console.log("getFiles()",keyCount(blobs), blobs.slice(0,4)); //nodes
            blobs
                .slice(0,4)
                .forEach(f=>{
                    let faces=collection(`races/${process.env.RACEID}/images/${f}/f`)
                    console.log(faces)
                })
            done()
        })
    }).timeout(50000);
     
    xit(`firestore:getDocs(/races/${process.env.RACEID}/images)`, (done) => {
        getDocs('/races/testrun/images').then(docs=> {
            console.log("getDocs(/races/testrun/images)",keyCount(docs),
                    );
            expect(keyCount(docs)).to.greaterThan(29);
            done()
        })
    }).timeout(5000);  

    xit("firestore:getDocs(retrieveFaces)", async (done) => {
        retrieveFaces('mychoice23jun').then(fids=> {
            console.log("getDocs(retrieveFaces)",keyCount(fids))
            let file='2023-06-11T06:16:32.338Z~VENUE~presspune$gmail.com~1P6A6994.jpg'
            let testRec=fids.filter(x=>x.file==file)

            let maxDist=.2
            let matches=[]
            for (let i = 0; i < fids.length; i++) {
                for (let j = 0; j < testRec.length; j++) {
                    faceapi.euclideanDistance(
                        testRec[j].fid, 
                        fids[i].fid)
                    .then(dist=>{
                        if (dist <= maxDist) {
                            matches.push([i, fids[i].file, dist]);
                            console.log(`${i} ${fids[i].file} ${dist}`)
                        }
                    })

                }
            }
            matches.sort(function (a, b) { return b[1] - a[1]; })
            console.warn(matches)

            expect(keyCount(fids)).to.greaterThan(13940);
            done()
        }).catch(console.error)
    }).timeout(5000);     

  });