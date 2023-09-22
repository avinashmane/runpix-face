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
const { matchFaceInFile, matchFace, registerImage, clustering,prepareForClustering } = require("../faceDesc")
const { getUrl, getEventFile: getImageFile, getFiles, bucket } = require('../filestorage');
const { fltSubArr,getAvg} = require('../util')

const faceapi = require('../dist/face-api.node.js');
const fs = require('fs');

let log = console.log //()=>{}//
    
describe(`face clustering ${ new Date()}`, () => {
    let event = 'mychoice23jun';
    let fids, dataset, filesNames='';

    before((done) => {
        this.timeout = 150000;

        // await retrieveFaces(event).catch(console.error) ;
        if (true) {
            fids = JSON.parse(fs.readFileSync("fids.json"));
            done()
        } else {
            retrieveFacesAll(event)
                .then(fids => {

                    fs.writeFileSync("fids.json", JSON.stringify(fids));
                    done()

                })
                .catch(console.error);
            ;
        }
        //map fids to array
        ({ filesNames, dataset } = prepareForClustering(filesNames, fids, dataset));

    // /filesNames.length,10000,

        assert.fail(`${filesNames.length} files found with ${dataset.length} faces`)

    })

    let minScoreSet=[.9] //.95,.9,9,.8,
    let epsSet=[.3,.35] // ,0.4,.2,

    minScoreSet.forEach(minScore=>{
        epsSet.forEach(eps=>{

            let suffix=`${minScore.toFixed(2)},${eps.toFixed(2)}`
            //I:${filesNames.length}/F:${dataset.length}
            it(`Match DBscan  - ${minScore} ${eps.toFixed(2)}`, ( done) => { 
                var { clusters, ret } = clustering(dataset, minScore, eps);

                fs.writeFileSync(`temp/faceClusters${suffix}.json`,JSON.stringify(clusters))

                expect(ret.clusters.length).to.greaterThan(100);
                // done()

            }).timeout(300000);
        })

        it('json to html', () => {
            
            clusters = JSON.parse(fs.readFileSync(`faceClusters${suffix}.json`))
            // clusters=JSON.parse(fs.readFileSync("faceClusters.json"))
            
            let getImages = (clust) => clust.map(c => `<div class="pic"><img src="${getUrl(`gs://${bucket}/thumbs/${event}/${c.file}`)}"/>${getAttr(c)}</div>`)
            let getAttr = (c)=>{return `<small>${c.score.toFixed(2)},${JSON.stringify(c.pos)},${c.gender},${c.age}</small>`}

            let html = clusters.map((clust, i) => 
                `<h3>Set:${i} - ${clust.length} imgs Score:${getAvg(clust,"score").toFixed(2)}</h3><div class="imgCtr">${getImages(clust)}</div>`)
        
            fs.writeFileSync(`/mnt/c/temp/clusters_score_${suffix}.html`, html.join("\n"))

        })
    })

    it(`face scores in ${event} `, () => {
        let incr = .01
        for (c = 0.7; c < 1; c = c + incr) {
            console.log(c.toFixed(2),
                dataset.filter(x => x.score >= c && x.score < (c + incr)).length)
        }

    })

    xit('Basic DBscan', () => {
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
})
