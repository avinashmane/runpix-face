

let fltSubArr= (float32array,start,end) => {
    return new Float32Array(float32array.buffer,4*start,end) 
}

let getAvg = (jsonArray,attr) => {
    let sum = jsonArray.reduce((total, obj) => total + obj[attr], 0.0);
    return average = sum / jsonArray.length;

}

function log(...arg){
    
    if ( process.env.DEBUG) {
        let prefix="\t\t\t"+(process.env.DEBUG=="TS"?new Date().toISOString():'');
        console.log(prefix, ...arg)
    }
}


exports.keyCount=(obj)=>Object.keys(obj).length

exports.fltSubArr=fltSubArr
exports.getAvg=getAvg
exports.log=log 