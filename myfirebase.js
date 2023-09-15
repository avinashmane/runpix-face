const { initializeApp, cert, getApps } = require('firebase-admin/app');

// import { getStorage, ref, listAll } from "firebase/storage";
const serviceAccount = require('/home/avinashmane/.config/firebase/serviceaccount.json');

exports.getApp = function  () {
    apps=getApps()
    if (!apps.length) {
        var app = initializeApp({
            credential: cert(serviceAccount),
            storageBucket: 'run-pix.appspot.com'
        });
    } else {
        app = apps[0]
    }
    // console.log("getApp()")
    return app
}
