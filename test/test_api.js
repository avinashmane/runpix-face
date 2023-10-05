// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const assert = require('assert');
const path = require('path');
const {should, expect} = require('chai');
const supertest = require('supertest');
// var request = supertest('localhost:3000');

let app;
let request;
describe('API Tests', () => {
  before(async function ()  {
    process.env.NO_LISTEN="SUPERTEST"
    // app = require(path.join(__dirname, '..', 'index'));
    // request = supertest("app");
    request = supertest("localhost:8080")
    // server = app.listen();
    console.log(new Date(), 'starting')
    await request.get('/api/faceapi').retry(3).expect(200);
    console.log(new Date(), 'faceapi loaded')
  });

  it('Service uses the NAME override', async function( )  {
    process.env.NAME = 'Cloud';
    const response = await request.get('/').retry(3).expect(404);
 
  });

  it('Uploaded to Firebase Storage first for match', async function( )  {
    process.env.NAME = 'Cloud';
    var obj =   {
        "bucket": "run-pix.appspot.com",
        "kind" : "storage#object",
        "name": "faceuploads/mychoice23jun/sandeep%201.jpg~1695636734785~110163"//"faceuploads/mychoice23jun/Avinash%20Gold%20Learner.png~1606218144458~170896" //faceuploads/event/emailid
      };
    var encoded = btoa(JSON.stringify(obj))
    const response =  request
        .post('/api/match')
        .send(obj) // x-www-form-urlencoded upload
        .set('Accept', 'application/json')
        .expect(200) 
        .end(function(err, res) {
            if (err) throw err;
            console.log( res.url ) ;
            // assert.ok(res.text.length>100, true) ; 
            // done()
        });
    console.log(response.url)
  });

  it('/api/get Service uses the NAME default', async () => {
    process.env.NAME = '';
    const response = await request.get('/api/get').retry(3).expect(200);
    assert.equal(response.text, 'Hello World!');
  });


    it('Uploaded thru API for match', function(done) {
    //    let imageFile='/home/avinashmane/face-api/demo/sample1.jpg'
       let imageFile='/home/avinashmane/runpix-face/test/umesh 1.png'

       request.post('/image')
              .field('event', 'mychoice23jun')
              .field('imageFile',imageFile)
              .attach('image' ,imageFile)
              .expect(200)
              .end(function(err, res) {
                  if (err) console.error(err); // 'success' status
                  done();
              });
    });


});
