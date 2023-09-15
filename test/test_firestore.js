/**
 * 
 */
const expect = require('chai').expect;
const {getApp,listColls, getDocs,delDoc, setDoc} = require('../facedatabase.js');
const assert = require("assert")
// const {Blob} = require("@firebase/database-types") //"firebase-admin/firestore")
const {
    Float16Array, isFloat16Array, isTypedArray,
    getFloat16, setFloat16,
    f16round,
  } = require("@petamoriken/float16");
  
describe("Firestore: facedatabase", function() {
    let app
    let test_path = '/test'
    let test_data={"comments":"test"}

    before( (done)=> {
        app = getApp()
        done()
    });

    it("firestore:projectId", function() {
        console.log(app?.options?.credential?.projectId || app)
        expect(app?.options?.credential?.projectId).to.equal('run-pix');
    });

    it("firestore:Collections at root",  (done) => {
        listColls("/").then(nodes=> {
            console.log(nodes.length, 
                nodes.map(x=>x.path));
            expect(nodes.length).to.equal(3);
            done()
        })
    });
      
    it("firestore:Documents at /races/testrun/images", (done) => {
        getDocs('/races/testrun/images').then(docs=> {
            console.log("getDocs()",docs.length,
                    );
            expect(docs.length).to.equal(29);
            done()
        })
    }).timeout(5000);  

    it("firestore:set/read/delete Data",  (done) => {

        setDoc(test_path+'/mocha', test_data).then(x=> {
            y = x.hasOwnProperty('_writeTime')
            console.log("setDoc()", x)
            // debugger
            expect(x).to.have.property('_writeTime')
        })
        getDocs('/test').then(docs=> {
            dataStr=docs.map(d=>JSON.stringify(d))//.filter(x=>x.id=='mocha'));
            console.log("getDocs() returns",docs.length,dataStr)
            // expect(dataStr.includes('{"comments":"test"}')).to.be.true;
        })
        delDoc(test_path+'/mocha').then(x=> {
            console.log("delDoc()", x)
            // debugger
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
            console.log("setDoc()", x)
            // debugger
            expect(x).to.have.property('_writeTime')
        })
        getDocs('/test').then(docs=> {
            dataStr=docs.map(d=>JSON.stringify(d))//.filter(x=>x.id=='mocha'));
            console.log("getDocs() returns",docs.length,dataStr)
            // expect(dataStr.includes('{"comments":"test"}')).to.be.true;
        })
        // delDoc(test_path+'/blob').then(x=> {
        //     console.log("delDoc()", x)
        //     // debugger
        //     expect(x).to.have.property('_writeTime')
        //     done()
        // })
    }).timeout(10000);

  });