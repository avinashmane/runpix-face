/**
 * 
 * Utility functions in this
 * Bulk process
 * 
 * face test: sandeep unde 
 * imageUrl: https://storage.googleapis.com/run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06%3A16%3A32.338Z~VENUE~presspune%24gmail.com~1P6A6994.jpg
 * image: run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06:16:32.338Z~VENUE~presspune$gmail.com~1P6A6994.jpg
 * fid:  
 */

const {expect,assert} = chai = require('chai');
const {getApp} =require("../myfirebase")
const {listColls, getDocs,delDoc, setDoc, retrieveFaces,
        blob2descriptor, descriptor2blob , descriptorToB64,b64ToDescriptor, getIds
        } = require('../facedatabase.js');
const {matchFaceInFile,registerImage} = require("../faceDesc")
const { getUrl,getEventFile: getImageFile,getFiles,bucket} = require('../filestorage');
const faceapi = require('../dist/face-api.node.js'); 
const { log} = require('../util') 
const _ = require("lodash")
const fs = require('fs');
const { start } = require('repl');
  

xdescribe("facedesc2: face match :",function () {
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


xdescribe(`facedesc3: bulk load`,()=>{
    const mapLimit = require( 'async/mapLimit');
    let event='werun2024';
    let startFileNumber = 12000
    let endFileNumber = null
    let firestore_images_file = `test/data/firestore_images_${event}.json`
    let storage_processed_file = `test/data/storage_processed_${event}.json`


    before(async (done)=>{
        log("loading data")
        if (fs.existsSync(firestore_images_file)){
            log(`${firestore_images_file} exists`)             
        } else {
     
            log(`races/${event}/images`)
            images = await getIds(`races/${event}/images`)
            log(`writing list of ${images.length} images to ${firestore_images_file}`)
            fs.writeFileSync(firestore_images_file, JSON.stringify(images) )
        }

        if (fs.existsSync(storage_processed_file)){
                log(`${storage_processed_file} exists`)
                
        } else {       
            st_path=getImageFile( event , "")
            const dir = await getFiles(st_path) ;
            log(`writing list of ${dir.length} at ${st_path} to ${storage_processed_file}`);
            fs.writeFileSync(storage_processed_file, JSON.stringify(dir) )
        }
        done()
    });  
    
    xit(`Race/slice ${event} bulk`,async (done)=>{
        log("reading files")
        st_path=getImageFile( event , "")
        let dir = await getFiles(st_path) ;
        
        log(`processing ${dir.length} from ${startFileNumber||0} to ${endFileNumber||dir.length}`);

        fileObjs= dir.map((f,i)=>({
            i:i,
            event:event,
            imageFile: getImageFile( event , f),
            kind : 'storage#object'
        }))

        await mapLimit(fileObjs.slice(startFileNumber,endFileNumber||dir.length),
                        10, 
                        registerImage);
            
        console.info(`processed ${dir.length}`);

    }).timeout(5000000);  



    it(`Race ${event} smart`,async (done)=>{
        // st_path=getImageFile( event , "")
        // const dir = await getFiles(st_path) ;
        // log(`processing ${dir.length} at ${st_path}`);
        let dir = JSON.parse(fs.readFileSync(storage_processed_file))
        log(`${storage_processed_file}: ${dir.length} blob imeages`)
        
        let images = JSON.parse(fs.readFileSync(firestore_images_file))
        log(`${firestore_images_file}: ${images.length} image entries`)

        // images.slice(10,20).forEach((img,i)=>{
        for (let i=startFileNumber; i<(endFileNumber||images.length);i++) {
            img=images[i]
            fids = await getIds(`races/${event}/images/${img}/f`)
            
            if (fids.length==0){
                const file_path=`processed/${event}/${img}`
                let fDescr = await registerImage({
                                                                i:i,
                                                                event:event,
                                                                imageFile: file_path,
                                                                kind : 'storage#object'
                                                            })
                                                        .catch(console.error);
            } else {
                log(`${i}:${img} : ${fids.length} faces registered`)
            }
        }

        //
        // for (let i=0;i<dir.length;i++) {
        //     f=dir[i]
            
        //     if (i>9000){
        //         const file_path=getImageFile( event , f)
        //         let fDescr = await registerImage({
        //                                         i:i,
        //                                         event:event,
        //                                         imageFile: file_path,
        //                                         kind : 'storage#object'
        //                                     })
        //                             .catch(console.error);
        //     }
        // }
        // console.info(`processed ${dir.length}`);
        done()
        assert(images.length.to.greaterThan(0))
    }).timeout(5000000);  


})

const yaml = require('js-yaml');
let imgFaces=yaml.load(
`
- processed/werun2024/2024-03-17T08:31:20.000Z~VENUE~avinashmane$gmail.com~1Z2A9807.jpg: 3
- processed/werun2024/2024-03-17T08:31:22.000Z~VENUE~avinashmane$gmail.com~1Z2A9808.jpg: 0
`)  
// log(imgFaces)

describe(`facedesc4: troubleshoot image`,function (){
    let event= 'werun2024'

    imgFaces.forEach(x=>log(x))
    it('one image in werun2024',async function (done) {
        // const f = 'processed/')    
        for (let i=0;i<imgFaces.length;i++) {    
        
            // const f = 'processed/werun2024/2024-03-17T01:51:58.698Z~VENUE~ranerohitv$gmail.com~img_313.jpg';
            let [rec]=Object.entries(imgFaces[i])
            log(rec);
            const f =  rec[0]// zero image

            let fDescr = await registerImage({
                                                event:event,
                                                imageFile: f, //getImageFile( event , f),
                                                kind : 'storage#object'
                                            })
                                    .catch(console.error);
            assert(fDescr.faces.length.to.equal(rec[1]))
        }                                
        done()

    }).timeout(200000);  
    
})