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
const expect = require('chai').expect;
const {getApp} =require("../myfirebase")
const {listColls, getDocs,delDoc, setDoc, retrieveFaces } = require('../facedatabase.js');
const { getUrl} = require('../filestorage');
const assert = require("assert")
// const {Blob} = require("@firebase/database-types") //"firebase-admin/firestore")
const {
    Float16Array, isFloat16Array, isTypedArray,
    getFloat16, setFloat16,
    f16round,
  } = require("@petamoriken/float16");
const faceapi = require('../dist/face-api.node.js');  
  
describe("Firestore: facedatabase", function() {
    let app
    let test_path = '/test'
    let test_data={"comments":"test"}

    keyCount=(obj)=>Object.keys(obj).length

    before( (done)=> {
        app = getApp()
        done()
    });

    it("firestore:getUrl(gs://)",  (done) => {
        let url = getUrl("gs://run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06:16:32.338Z~VENUE~presspune$gmail.com~1P6A6994.jpg")
        // console.log(url)
        expect(url).to.equal("https://storage.googleapis.com/run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06%3A16%3A32.338Z~VENUE~presspune%24gmail.com~1P6A6994.jpg");
        done()
    
    });

    it("firestore:projectId", function() {
        // console.log(app?.options?.credential?.projectId || app)
        expect(app?.options?.credential?.projectId).to.equal('run-pix');
    });

    xit("firestore:getDocs(races)",  (done) => {
        getDocs("races").then(nodes=> {
            console.log("getDocs(races)",keyCount(nodes), ); //nodes
            expect(keyCount(nodes)).to.greaterThan(13);
            done()
        })
    });

    it("firestore:Collections at root",  (done) => {
        listColls("/").then(obj=> {
            // console.log(nodes.length, 
            //     nodes.map(x=>x.path));
            expect(obj.length).to.equal(3);
            done()
        })
    });    
      
    xit("firestore:getDocs(/races/testrun/images)", (done) => {
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

    it("firestore:getDocs(/races/testrun/faces)", (done) => {
        getDocs('/races/mychoice23jun/faces').then(docs=> {
            console.log("getDocs(/races/testrun/faces)",keyCount(docs))
            let desc=[]
            for (let filename in docs) {
                for (fno in docs[filename].f){
                    let f= docs[filename].f[fno]
                    desc.push([f.gender,f.age,// f.fid,
                        filename.replace("/","%2F"),
                    ])
                }
            }
            console.log(
                // desc.map(d=>d.join(" - "))
                //     .join("\n"),
                desc.length
                )

            expect(keyCount(docs)).to.greaterThan(2);
            done()
        }).catch(console.error)
    }).timeout(5000);  

    it("firestore:set/read/delete Data",  (done) => {

        setDoc(test_path+'/mocha', test_data).then(x=> {
            y = x.hasOwnProperty('_writeTime')
            // console.log("setDoc()", x)
            expect(x).to.have.property('_writeTime')
        })
        getDocs('/test').then(docs=> {
            dataStr=docs.map(d=>JSON.stringify(d))//.filter(x=>x.id=='mocha'));
            console.log("getDocs() returns",docs.length,dataStr)
            // expect(dataStr.includes('{"comments":"test"}')).to.be.true;
        })
        delDoc(test_path+'/mocha').then(x=> {
            // console.log("delDoc()", x)
            expect(x).to.have.property('_writeTime')
            done()
        })
    }).timeout(10000);

    it("firestore:set/read/delete Float32Array",  (done) => {
        arr = new Float32Array(Array.from([...Array(5).keys()].map(x=>1/(1+2**x))))
        let blob_test = {"fid":new Buffer.from(arr.buffer)}
        console.warn(arr.toString())
        setDoc(test_path+'/blob', blob_test).then(x=> {
            y = x.hasOwnProperty('_writeTime')
            // console.log("setDoc()", x)
            expect(x).to.have.property('_writeTime')
        })
        getDocs('/test').then(docs=> {
            dataStr=docs.map(d=>JSON.stringify(d))//.filter(x=>x.id=='mocha'));
            console.log("getDocs() returns",docs.length,dataStr)
            // expect(dataStr.includes('{"comments":"test"}')).to.be.true;
        })
        delDoc(test_path+'/blob').then(x=> {
            // console.log("delDoc()", x)
            expect(x).to.have.property('_writeTime')
            done()
        })
    }).timeout(10000);

  });