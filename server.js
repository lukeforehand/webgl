var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());

app.get('/', function(req, res) {
  res.end('hello world');
});

var server  = app.listen(8000, function() {
  var host = server.address().address
  var port = server.address().port
  console.log("App listening at http://%s:%s", host, port)
});

