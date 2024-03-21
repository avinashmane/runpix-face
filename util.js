

let fltSubArr= (float32array,start,end) => {
    return new Float32Array(float32array.buffer,4*start,end) 
}

let getAvg = (jsonArray,attr) => {
    let sum = jsonArray.reduce((total, obj) => total + obj[attr], 0.0);
    return average = sum / jsonArray.length;

}

function formatDate(date) {
    const year = date.getFullYear().toString().padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
  
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

function log(...arg){
    
    if ( process.env.DEBUG) {
        let prefix="\t"+(process.env.DEBUG=="TS"? formatDate(new Date()):'');
        console.log(prefix, ...arg)
    }
}

function errorHandler(err){
    err=`Error: `+JSON.stringify(err.message || err)
    if ( process.env.DEBUG) {
        let TS = process.env.DEBUG=="TS"? formatDate(new Date()):''
        let prefix=`\t\t\t${TS}`;
        console.error(prefix, err)
        console.trace("errHandler")
    } else {
        console.error(err.message || err)
    }
}

exports.keyCount=(obj)=>Object.keys(obj).length

exports.fltSubArr=fltSubArr
exports.getAvg=getAvg
exports.log=log 
exports.errorHandler=errorHandler