

let fltSubArr= (float32array,start,end) => {
    return new Float32Array(float32array.buffer,4*start,end) 
}

let getAvg = (jsonArray,attr) => {
    let sum = jsonArray.reduce((total, obj) => total + obj[attr], 0.0);
    return average = sum / jsonArray.length;

}


exports.fltSubArr=fltSubArr
exports.getAvg=getAvg