const { assert } = require("chai");
const {log}= require("../util")
process.env.DEBUG="TS"




describe('test', function () {
    this.timeout(10000);
    let arr=[]
  
    before(function(){
        arr=[1,2,3,4]
        log("starting",arr)
    });
  
    describe('IT', function () {
        before('stating', function(){
            log("starting IT")
        })
        arr.forEach(i=> {
            it("IT plain "+i, function (){
                console.log("IT plain-log "+i)
            });
        });
        it("IT fixed ", function (){
            console.log("IT plain-log ")
        });
    });

})

describe('Array Utility Functions', function() {
    it('should double each element in an array asynchronously', async function() {
      const numbers = [1, 2, 3];
      const doubledNumbers = [];
  
      for (const num of numbers) {
        const doubledNum = await doubleNumber(num); // Assuming doubleNumber is an async function
        doubledNumbers.push(doubledNum);
      }
  
      assert.deepEqual(doubledNumbers, [2, 4, 6]);
    });
  });
  
  async function doubleNumber(num) {
    return new Promise(resolve => setTimeout(() => resolve(num * 2), 10));
  }