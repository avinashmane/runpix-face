// index.js
// begine test
app.get('/stream', function (req, res, next) {
    //when using text/plain it did not stream
    //without charset=utf-8, it only worked in Chrome, not Firefox
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
  
    res.write("Thinking...");
    sendAndSleep(res, 1);
});
  
  
var sendAndSleep = function (response, counter) {
    if (counter > 10) {
        response.end();
    } else {
        response.write(`<br> ;i=${counter}</br>`);
        counter++;
        setTimeout(function () {
        sendAndSleep(response, counter);
        }, 1000)
    };
};
// end test