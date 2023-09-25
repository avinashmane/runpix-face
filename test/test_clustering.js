/**
 * 
 * face test: sandeep unde 
 * imageUrl: https://storage.googleapis.com/run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06%3A16%3A32.338Z~VENUE~presspune%24gmail.com~1P6A6994.jpg
 * image: run-pix.appspot.com/processed/mychoice23jun/2023-06-11T06:16:32.338Z~VENUE~presspune$gmail.com~1P6A6994.jpg
 * fid:  
 */
const {expect,assert} = chai = require('chai');
const { getApp } = require("../myfirebase")
const { listColls, getDocs, delDoc, setDoc, retrieveFaces, retrieveFacesAll, descriptor2blob } = require('../facedatabase.js');
const { clustering,prepareForClustering } = require("../faceclust")
const { getUrl, getEventFile: getImageFile, getFiles, bucket } = require('../filestorage');
const { fltSubArr,getAvg,log} = require('../util')
const faceapi = require('../dist/face-api.node.js');
const fs = require('fs');



xdescribe(`DESC: face clustering` , function () {
    this.timeout ( 50000 );
    let event = 'mychoice23jun';
    let fids;


    before( async function ()  {

        // let fids
        log("retrieveFacesAll") ;
        // await retrieveFaces(event).catch(console.error) ;
        if (false) {
            fids = JSON.parse(fs.readFileSync("fids.json"));
            done()
        } else {
            delDoc(`/facesearch/${event}`,{recursive:true})
                .then(x=>log(`deleted /facesearch/${event}`));
            return await retrieveFacesAll(event)
                .then(x => {
                    let fids = x ;
                    //map fids to array
                    ({ filesNames, dataset } = prepareForClustering( fids));

                    fs.writeFileSync("fids.json", JSON.stringify(fids));

                    assert.ok(filesNames.length,`${filesNames.length} files found with ${dataset.length} faces`)
        
                })
                .catch(console.error);
        }
    })

    let minScoreSet=[.9] ;//.95,.9,.99,.8,
    let epsSet=[.3] ;// ,0.4,.2,,.35

    minScoreSet.forEach(minScore=>{
        epsSet.forEach(eps=>{

            let suffix=`${minScore.toFixed(2)},${eps.toFixed(2)}`  ;
            //I:${filesNames.length}/F:${dataset.length}

            it(`Clustering DBscan  - ${suffix}`, function ( done)  { 

                log(suffix)

                var { clusters, ret } = clustering(event, dataset, minScore, eps);

                fs.writeFileSync(`temp/faceClusters${suffix}.json`,JSON.stringify(clusters))

                expect(ret.clusters.length).to.greaterThan(100);
                
                done()
            })

            it(`Json to html  ${suffix}`, function ()  {
                this.timeout=1000
                
                clusters = JSON.parse(fs.readFileSync(`temp/faceClusters${suffix}.json`))
                                
                let getImages = (clust) => clust.map(c => `<div class="pic"><img src="${getUrl(`gs://${bucket}/thumbs/${event}/${c.file}`)}"/>${getAttr(c)}</div>`)
                let getAttr = (c)=>{return `<small>${c.score.toFixed(2)},${JSON.stringify(c.pos)},${c.gender},${c.age}</small>`}

                let html = clusters.map((clust, i) => 
                    `<h3>Set:${i} - ${clust.length} imgs Score:${getAvg(clust,"score").toFixed(2)}</h3><div class="imgCtr">${getImages(clust)}</div>`)
            
                fs.writeFileSync(`/mnt/c/temp/clusters_score_${suffix}.html`, html.join("\n"))

            })

        })
    })

    it(`face scores in ${event} `, function ()  {
        let incr = .01
        for (c = 0.7; c < 1; c = c + incr) {
            console.log(c.toFixed(2),
                dataset.filter(x => x.score >= c && x.score < (c + incr)).length)
        }

    })



})

/**
 * 
 * 
     xit('Basic DBscan', function () {
        let simpleResult = dbscan({
            dataset: [21, 22, 23, 24, 27, 28, 29, 30, 9001],
            epsilon: 1.01,
        });
        // => {
        //    clusters: [ [0,1,2,3], [4,5,6,7] ],
        //    noise: [ 8 ]
        //}
        expect(JSON.stringify(simpleResult.clusters)).to.contain('[[0,1,2,3],[4,5,6,7]]')
    })
    
    
 *
 */
