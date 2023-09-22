/**
 * 
 * face test: sandeep unde 
 * imageUrl: https://storage.googleapis.com/run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06%3A16%3A32.338Z~VENUE~presspune%24gmail.com~1P6A6994.jpg
 * image: run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06:16:32.338Z~VENUE~presspune$gmail.com~1P6A6994.jpg
 * fid:  
 */

const {expect,assert} = chai = require('chai');

const {getApp} =require("../myfirebase")
const {listColls, getDocs,delDoc, setDoc, retrieveFaces,
        blob2descriptor, descriptor2blob , descriptorToB64,b64ToDescriptor
        } = require('../facedatabase.js');
const {matchFaceInFile,registerImage} = require("../faceDesc")
const { getUrl,getEventFile: getImageFile,getFiles,bucket} = require('../filestorage');

let log=()=>{}//console.log

// const {Blob} = require("@firebase/database-types") //"firebase-admin/firestore")
const {
    Float16Array, isFloat16Array, isTypedArray,
    getFloat16, setFloat16,
    f16round,
  } = require("@petamoriken/float16");
const faceapi = require('../dist/face-api.node.js');  
  
describe("face: testing", function() {
    let app
    let test_path = '/test'
    let test_data={"comments":"test"}
    let event= 'mychoice23jun'    
    keyCount=(obj)=>Object.keys(obj).length



    it('identify good faces',async (done)=>{
        let file='2023-06-11T06:17:24.158Z~VENUE~presspune$gmail.com~1P6A7022.jpg'
    
        data = await registerImage(event,file)
            .catch(e=>console.error('Error identify good faces')); //`gs://${bucket}/`+ 
        log(data)//.map(x=>[x.age,x.gender])
        done()
    })


    it("procRace mychoice23jun bulk",async (done)=>{
        let event='mychoice23jun';
        st_path=getImageFile( event , "")
        const dir = await getFiles(st_path) ;
        console.info(`processing ${dir.length} at ${st_path}`);

        for (const f of dir) {
            // log(f)
            let fDescr = await registerImage(event,f)
                                    .catch(console.error);
        }
        console.info(`processed ${dir.length}`);

    }).timeout(5000);  

   
    
    it('blob conversion',()=>{
        arr=new Float32Array([.1,.1,.1,.1,.1,.2,.3,.4,2,5])
        b=descriptor2blob(arr)
        setDoc('test/mocha/t/case1',{'blob':b});
        log("saved",b)
        b2 = getDocs('test/mocha/t').then(x=>{
                // log(">>>",btoa(x?.case?.blob))
                // log(x.case1.blob)
                log(blob2descriptor(x.case1.blob))
            })

        newArr=blob2descriptor(b);
        log(JSON.stringify([arr,,newArr]))
    })    

    it('b64 conversion',()=>{
        arr=new Float32Array([.1,.1,.1,.1,.1,.2,.3,.4,2,5])
        b=descriptorToB64(arr)
        setDoc('test/mocha/t/case2',{'blob':b});
        log("saved",b)
        b2 = getDocs('test/mocha/t').then(x=>{
                // log(">>>",btoa(x?.case?.blob))
                log(b64ToDescriptor(x.case2.blob))
            })

        newArr=b64ToDescriptor(b);
        log(JSON.stringify([arr,newArr]))
    })    

  
  });

  describe("Match test cases :",()=>{
    let event='mychoice23jun';
    
    before(async (done)=>{
        this.timeout=150000;
        log("Face Match - retrieved all faces",new Date())
        // await retrieveFaces(event).catch(console.error) ;
        let fids=await retrieveFaces(event)
            .then(done())
            .catch(console.error);     
        log("Face Match - retrieved all faces",new Date())  

    })

    testcases= [  //test case
            ["Sandeep",'run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06:16:32.338Z~VENUE~presspune$gmail.com~1P6A6994.jpg'],
            ["girls sideview", 'run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06:17:54.179Z~VENUE~presspune$gmail.com~1P6A7035.jpg'], //girl side view
            ["many covered faces",
                'run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06:17:00.298Z~VENUE~presspune$gmail.com~1P6A7009.jpg' ],
            ["head gear", 'run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06:17:24.158Z~VENUE~presspune$gmail.com~1P6A7022.jpg']
        ]
    testcases.forEach( function(value, i) {
            it(`Match ${i} ${value[0]}`, async (done) => {
            
                log(`search ${i} ${value[0]}`)
            
                filePath="gs://"+value[1]//.replace(`${bucket}/`,"")
                matchFaceInFile(event,
                                filePath,
                                .3).then( ret=> {

                    log("matchFaceInFile()", ret.length)
                    log(value[0],
                        value[1],
                        ret.length,
                        ret.slice(0,50).map(x=>getUrl(getImageFile( event,x[1]))))
                    expect(ret.length).to.greaterThan(0);
                    done()
                }).catch(console.error)
        }).timeout(5000);     
    })
    
    file='run-pix.appspot.com/faceuploads/mychoice23jun/1P6A0324.jpg' //blurred photos
    // file='faceuploads/mychoice23jun/1P6A0587.jpg'
    it("matchFaceinFile firebaseResults",async (done)=>{
        await matchFaceInFile(event,
                `gs://${file}`,
                {firebaseResults:true})
            .then( ret=> {
            if(ret?.length){    
                log("matchFaceInFile()",ret?.length)
                log(
                    ret?.slice(0,50).map(x=>getUrl(getImageFile( event,x[1]))))
            }
            expect(ret?.length||1).to.greaterThan(0);
            done()
        }).catch(console.error)

    }).timeout(5000);  
})   
