const { initializeApp, cert, getApps } = require('firebase-admin/app');

// process.env. =process.env.get'/home/avinashmane/.config/firebase/serviceaccount.json'
// const serviceAccount = require();
console.info(`GOOGLE_APPLICATION_CREDENTIALS=${process.env.GOOGLE_APPLICATION_CREDENTIALS}`)
const getApp = function  () {
    let apps=getApps()

    if (!apps.length) {
        let opts= {
            storageBucket: process?.env?.BUCKET || 'run-pix.appspot.com'
        }
        // if(process.env.GOOGLE_APPLICATION_CREDENTIALS)
        //     opts.credential= cert(serviceAccount);
            
        return initializeApp(opts);
    } else {
        return apps[0]
    }

}

exports.getApp=getApp
getApp()
