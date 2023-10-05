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
const faceapi = require('../dist/face-api.node.js'); 
const { log} = require('../util') 
const _ = require("lodash")
const fs = require('fs')
  
describe("facedesc1: conversion", function() {
    this.timeout ( 1000);
    let app
    let test_path = '/test'
    let test_data={"comments":"test"}
    let event= 'mychoice23jun'    

    before(async function (done)  {
        
        retrieveFacesAll(event)
            .then(fids => {

                done()

            })
            .catch(console.error);
        assert.fail(`${filesNames.length} files found with ${dataset.length} faces`)

    })

    it('identify good faces', (done)=>{
        let file='2023-06-11T06:17:24.158Z~VENUE~presspune$gmail.com~1P6A7022.jpg'
    
        registerImage({
            event:event,
            imageFile:file
        })
            .then(x=>  data=x )
            .catch(e=>  console.error('Error identify good faces')); //`gs://${bucket}/`+ 
        log(data) //.map(x=>[x.age,x.gender])
        done()
    })

   
    
    it('blob conversion',()=>{
        arr=new Float32Array([.1,.1,.1,.1,.1,.2,.3,.4,2,5])
        b=descriptor2blob(arr)
        setDoc('test/mocha/t/case1',{'blob':b});
        log("saved",b)
        b2 = getDocs('test/mocha/t').then(x=>{
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

  describe("facedesc2: face match :",function () {
    let event='mychoice23jun';
    let results={}
    this.timeout(25000);
    

    let testcases= [  //test case
    ["Sandeep",'run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06:16:32.338Z~VENUE~presspune$gmail.com~1P6A6994.jpg'],
    ["girls sideview", 'run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06:17:54.179Z~VENUE~presspune$gmail.com~1P6A7035.jpg'], //girl side view
    ["many covered faces",
        'run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06:17:00.298Z~VENUE~presspune$gmail.com~1P6A7009.jpg' ],
    ["head gear", 'run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06:17:24.158Z~VENUE~presspune$gmail.com~1P6A7022.jpg']
    ]

    testcases.forEach( function(value, i) {
        [,0.3,.35,0.4,0.45].forEach(dist=>{   //0.2,0.3,
            let suffix=`${dist}:${i} ${value[0]}`
            it(`Match ${suffix}`, async function (done) {
            
                // log(`search ${i} ${value[0]}`)
            
                const filePath = "gs://" + value[1];
                log(value[0]+":start")
                return matchFaceInFile(event,
                                filePath,
                                {maxDist: dist,firebaseResults:true})
                    .then( ret=> {

                        log("matchFaceInFile() returns ",value[0],
                            value[1],
                            ret.length,
                            ret.slice(0,50).map(x=>getUrl(getImageFile( event,x.file))))
                        // expect(ret.length).to.greaterThan(0);
                        results[suffix]=ret
                        log(value[0]+":end")
                        assert(ret.length,"expected to find faces")
                        done()
                    })
                    .catch(console.error)
                
            }).timeout(150000);     
        })
        
        file='run-pix.appspot.com/faceuploads/mychoice23jun/1P6A0324.jpg' //blurred photos
        // file='faceuploads/mychoice23jun/1P6A0587.jpg'
        it("matchFaceinFile firebaseResults", function (done){
            matchFaceInFile(event,
                    `gs://${file}`,
                    {firebaseResults:true,maxDist:.35})
                .then( ret=> {
                    if(ret?.length){    
                        log("matchFaceInFile()",ret?.length)
                        log(ret?.slice(0,50).map(x=>getUrl(getImageFile( event,x[1]))))
                    }
                    expect(ret?.length||1).to.greaterThan(0);
                    done()
            }).catch(console.error)

        }).timeout(5000);  
        
    })

    it(`Json to html `, function ()  {
        this.timeout=1000
        
        // ToC
        let html = `<style>div.imgCtr{
            display:flex;
            width: 80vw;
          }
          div.pic img{
            width: 100px;
          }
          </style>
          <ol>`
        _.forOwn(results,(val,k)=>{
            html +=`<li>${k}:${val.length}</li>`
        })
        html+='</ol><hr/>'
        
        let getImages = (imgs) => imgs.map(c => `<div class="pic"><img src="${getUrl(`gs://${bucket}/thumbs/${event}/${c.file}`)}"/>${getAttr(c)}</div>`)
        let getAttr = (c)=>{return `<small>${c.score.toFixed(2)},${c.dist.toFixed(2)}</small>`}

        _.forOwn(results,(val,k)=>{
        
            html += `<h2>Set:${k} ${val.length}</h2><div class="imgCtr">${getImages(val)}</div>`
    
        })
        fs.writeFileSync(`/mnt/c/temp/clusters_score_match.html`, html)

    })

})   

describe(`facedesc3: bulk load`,()=>{
    xit("procRace mychoice23jun bulk",async (done)=>{
        // let event='mychoice23jun';
        st_path=getImageFile( event , "")
        const dir = await getFiles(st_path) ;
        console.info(`processing ${dir.length} at ${st_path}`);

        for (const f of dir) {
            // log(f)
            let fDescr = await registerImage({
                                                event:event,
                                                imageFile:f
                                            })
                                    .catch(console.error);
        }
        console.info(`processed ${dir.length}`);

    }).timeout(5000000);  

})