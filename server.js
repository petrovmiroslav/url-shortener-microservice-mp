'use strict';

var express = require('express');
var app = express();
var mongo = require('mongodb');
var mongoose = require('mongoose');
var dns = require('dns');
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));

var port = process.env.PORT || 3000;

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });
var Schema = mongoose.Schema;

  var URLShortenerSchema = new Schema({
    original_url: {
            type: String,
            required: true
          },
    short_url: String
  });
var UrlBase = mongoose.model('UrlBase', URLShortenerSchema);
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
/*mongoose.connection.once('open', function() {
  console.log("CONNECT");
});*/
function addAndSaveUrl(hostname, short_url, res) {
  var urlToAdd = new UrlBase ({ original_url: hostname, short_url:  short_url});
    urlToAdd.save(function (err, data) {
    if (err) return console.error(err);
    res.json({"original_url": hostname,"short_url": short_url}); 
  });
};
function URLShortener() {
  return (Date.now()+"mp");
};

function handlerPOST(req, res) {
  
  const matchUrl = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.exec(req.body.url);
  if(matchUrl === null) {
    return res.json({"error":"invalid URL"});
  }
  const url = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.exec(req.body.url)[0];
  const hostname = /[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/.exec(url)[0];
  
  dns.lookup(hostname, (err, address, family) => {
    if(address === undefined) {
       res.json({"error":"invalid URL"});
    } else {
       UrlBase.findOne({"original_url": hostname }, function (err, data) {
          if (err) return console.error(err);
          if(!data) {
            const shortUrl = URLShortener();
            addAndSaveUrl(hostname, shortUrl, res);
          }
          if(data) {
            res.json({"original_url": data.original_url,"short_url": data.short_url});
          }
       });
    }
  });
};
function handlerGET(req, res) {
  const shortUrl = req.params.url;
  UrlBase.findOne({"short_url": shortUrl }, function (err, data) {
          if (err) return console.error(err);
          if(!data) {
            res.json({"error": "URL NOT FOUND"});
          }
          if(data) {
            res.redirect("http://"+data.original_url);
          }   
  });
};
app.route("/api/shorturl/:url").get(handlerGET);
app.route("/api/shorturl/new").post(handlerPOST);


app.listen(port, function () {
  console.log('Node.js listening ...');
});
