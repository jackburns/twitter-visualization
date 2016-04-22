var express = require('express');
var http = require('http');
var path = require('path');
var Twitter = require('twit');
var async = require('async');
var request = require('request');
var Q = require('q');

//var config = require('./config.json');

var app = express();
var promises = [];

var client = new Twitter({
  consumer_key: process.env.key,
  consumer_secret: process.env.secret,
  app_only_auth: true
});

// sends previous game information or starts a new game
app.get('/username/:username', function (req, res) {
  var username = req.params.username.replace(/[^a-z0-9áéíóúñü \.,_-]/gim,"");

  async.parallel([
    function(callback) {
      client.get('/search/tweets', {
        q: 'from:' + username + ' @',
        count: 3200
      }, function(error, item) {
        callback(error, item);
      });
    },
    function(callback) {
      client.get('search/tweets', {
        q: '@' + username,
        count: 3200
        }, function(error, item) {
          callback(error, item);
        });
      }
    ], function(err, results) {
      var userModels = [];
      if(err) {
        res.send(err);
      } else {
        transformStatuses(results[1].statuses, userModels);
        transformTweets(results[0].statuses, userModels);
        var model = {
          user: {
            username: username
          },
          models: userModels
        };
        getProfileImageUrl(username).then(function(url) {
          model.user.profile_image_url = url;
        });
        Q.allSettled(promises).done(function() {
          res.send(model);
        });
      }
    });
});

function transformTweets(tweets, userModels) {
  for(var i = 0; i < tweets.length; i++) {
    var tweet = tweets[i];
    var users = tweet.entities.user_mentions;
    for(var j = 0; j < users.length; j++) {
      var user = users[j];
      var existingUser = matchExistingUser(user, userModels);
      if(existingUser) {
        existingUser.to_freq++;
      } else {
        var userModel = makeUserModel(user);
        userModel.from_freq = 0;
        userModel.to_freq = 1;
        userModels.push(userModel);
      }
    }
  }
}

function transformStatuses(statuses, userModels) {
  for(var i = 0; i < statuses.length; i++) {
    var user = statuses[i].user;
    var existingUser = matchExistingUser(user, userModels);
    if(existingUser) {
      existingUser.from_freq++;
    } else {
      var userModel = makeUserModel(user);
      userModel.from_freq = 1;
      userModel.to_freq = 0;
      userModels.push(userModel);
    }
  }
}

function matchExistingUser(user, userModels) {
  return userModels.find(function(userModel) {
    return user.id_str == userModel.id;
  });
}

function makeUserModel(user) {
  var obj = {
    id: user.id_str,
    username: user.screen_name,
  };
  if (user.profile_image_url) {
    var url = user.profile_image_url;
    var begin = url.search('_normal');
    obj.profile_image_url = url.substr(0, begin) + url.substr(begin + 7, url.length);
  } else {
    getProfileImageUrl(user.screen_name).then(function(url) {
      obj.profile_image_url = url;
    });
  }
  return obj;
}

// Hacky stuff to avoid API calls :)
function getProfileImageUrl(username) {
  var deferred = Q.defer();
  promises.push(deferred.promise);
  request('https://www.twitter.com/' + username + '/profile_image?size=original',
    function(e, response) {
      if(response){
        deferred.resolve(response.request.uri.href);
      } else {
        deferred.resolve(null);
      }
    }
  );
  return deferred.promise;
}

// load static files
app.use(express.static(__dirname + '/public'));

var port      = process.env.PORT || 3000;
//var ipaddress = process.env.IP || "127.0.0.1";
var server    = app.listen(port);
