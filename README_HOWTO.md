# HOW TO USE

# FOR SEARCHING PHOTOS

* Upload photo
* click on + button

# FOR RACE PROCESSING

* Upload photos to gs://bucket/processed/** thru standard process

* Scan faces (runpix-face.web.site/races) 
    * takes time / can be done using scripts
    * start job 
* Cluster faces
    * saves clustered face ids in firestore /facesearch
    * needs 2-3 GB memory / can ne done offlines

## tweaks

May need separate instance with higher memory for clustering
https://console.cloud.google.com/run/detail/us-central1/runpix-face/revisions?authuser=0&project=run-pix


# ARCHIVAL

Not supported currently but required due to high volume of faceid data
* under /race/event/images/xxxx/f/xxxx 
* cloud be deleted after clustering...need to check

# How to deploy

## google cloudcode>cloud run deploy thru VScode



## thru github

not tested


