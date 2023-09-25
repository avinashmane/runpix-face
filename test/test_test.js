const {log}= require("../util")

describe('test', function () {
    this.timeout(10000);
  
    before(function(){
        log("starting")
    });
  
    [1,2,3,4].forEach(i=> {
        it("IT plain"+i, function (){
            log("IT plain-log"+i)
        });
    });
})