//  TODO: add bot-ness id:0 gh:2 ic:gh
//  TODO: how to organize the "API" vs the bot? id:1 gh:3 ic:gh
//  TODO: logging? id:8 gh:12 ic:gh
//  TODO: data persistance? id:7 gh:11 ic:gh
//  TODO: set up cron id:9 gh:13 ic:gh
//  TODO: reply immediately if 2*lt < ~5 minutes (the period I'll poll twitter for new messages) id:10 gh:14 ic:gh

// init project
var express = require('express');
var app = express();

var requestor = require('request');
var j = requestor.jar();

var cheerio = require('cheerio');

var moment = require('moment');

var horizonsUri = 'https://ssd.jpl.nasa.gov/horizons.cgi';

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {      
  response.send('This will be a bot');
});

app.get("/api/v1/:astroBody", function( request, response ) {
  j = requestor.jar();  //  need a new jar on every request to reset the session
  var step1 = horizons_find_astro_body_step( request.params.astroBody );
  console.log("step: " + step1);
  response.send(step1);
});

app.post("/api/v1", function( request, response ) {
  horizons_find_astro_body_step();
  // response.send('This is an api for testing');
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

//  fake out a Horizon API
//    Horizon tracks the state of the current configuration with sessions, 
//    so we need to reuse the session cookie from the first request

//  TODO: extract the request pattern id:4 gh:7 ic:gh
function horizons_find_astro_body_step( name ) {
  console.clear();
//  curl -d sstr=sedna -d body_group=all -d find_body=Search -d mb_list=planet https://ssd.jpl.nasa.gov/horizons.cgi -v 
  requestor.post({ jar: j, url: horizonsUri, form: {sstr:name, body_group:'all', find_body:'Search', mb_list:'planet'}}, function( error, response, body ) {
    
    var dom = cheerio.load(body);
    var errorNode = dom('.error');
    if( errorNode.length > 0 ) {
      console.log( "Horizons returned an error; most likely the celestial body you requested could not be found.");
      return "error";
    } else {
      var step2 = horizons_set_time_interval_step();
      // console.log("step2: " + step2);
      // console.log(j);
      return step2;
    }
        
  });
  
}

function horizons_set_time_interval_step() {
//  curl --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d start_time="2018-02-25 12:00" -d stop_time="2018-02-25 12:01" -d step_size=1 -d interval_mode=f -d set_time_span="Use Specified Times" https://ssd.jpl.nasa.gov/horizons.cgi -v
  var now = new Date();
  var then = new Date();
  then.setMinutes(now.getMinutes()+1);
  now = moment(now).format('YYYY-MMM-D HH:mm');
  then = moment(then).format('YYYY-MMM-D HH:mm');

  requestor.post({ jar: j, url: horizonsUri, form: {start_time:now, stop_time:then, step_size:'1', interval_mode:'m', set_time_span: 'Use Specified Times'}}, function( error, response, body ) {
    
    var dom = cheerio.load(body);
    var errorNode = dom('.error');
    var settings = dom('h3').next();
    if( errorNode.length > 0 ) {
      console.log( "Horizons returned an error.");
      return "error";
    } else {
      var step3 = horizons_set_out_table_step( now.replace( 'T', ' ' ), then.replace( 'T', ' ') );
      // console.log("step3: " + settings);
      return step3;
    }
    
  });
  
}

function horizons_set_out_table_step( start_time, end_time ) {
//  curl --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d oq_21=1 -d time_digits=MINUTES -d set_table="Use Selected Settings" -d set_table_settings=1 https://ssd.jpl.nasa.gov/horizons.cgi -v
  requestor.post({ jar: j, url: horizonsUri, form: {oq_21:'1', time_digits:'MINUTES', obj_data:'NO', set_table_settings:'1', set_table: 'Use Settings Abbove'}}, function( error, response, body ) {
    
    var dom = cheerio.load(body);
    var errorNode = dom('.error');
    var settings = dom('h3').next();
    if( errorNode.length > 0 ) {
      console.log( "Horizons returned an error.");
      return "error";
    } else {
      var step4 = horizons_set_display_step( start_time, end_time );
      // console.log("step4: " + settings);
      return step4;
    }
    
  });
}

function horizons_set_display_step( start_time, end_time ) {
//  curl --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d display=TEXT -d .cgifields=display -d set_display="Use Selection Above" https://ssd.jpl.nasa.gov/horizons.cgi -v  
  
  requestor.post({ jar: j, url: horizonsUri, form: {display:'TEXT', set_display:'Use Selection Above'}}, function( error, response, body ) {
    
    var dom = cheerio.load(body);
    var errorNode = dom('.error');
    if( errorNode.length > 0 ) {
      console.log( "Horizons returned an error.");
      return "error";
    } else {
      var step5 = horizons_send_query( start_time, end_time );
      // console.log("step5: " + step5);
      return step5;
    }
    
  });

}

function horizons_send_query( start_time, end_time ) {
//  curl -v --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d go="Generate Ephemeris" https://ssd.jpl.nasa.gov/horizons.cgi#results
  
//  TODO: handle the final error model id:5 gh:8 ic:gh
// *** Horizons ERROR/Unexpected Results ***


 

// Cannot interpret date. Type "?!" or try YYYY-Mon-Dy {HH:MM} format.

// *******************************************************************************
  
  requestor.post({ jar: j, url: horizonsUri, form: {go:'Generate Ephemeris'}}, function( error, response, body ) {
    
    var dom = cheerio.load(body);
    var errorNode = dom('.error');
    if( errorNode.length > 0 ) {
      console.log( "Horizons returned an error.");
      return "error";
    } else {
      var lt = find_light_time( body, start_time, end_time );
      // console.log(j);
      // console.log("step5: " + body);
      return lt;
    }
    
  });

}

function find_light_time( output, start_time, end_time ) {
  //  this is a little fragile
  //  the times appear in the output table more than once as of 2018-03-14, but....
  var lt = output.split(start_time)[2].split(end_time)[0].trimLeft();
}

//*****************  BOT-NESS  *********************
var fs = require('fs'),
    path = require('path'),
    Twit = require('twit'),
    config = {
    /* Be sure to update the .env file with your API keys. See how to get them: https://botwiki.org/tutorials/make-an-image-posting-twitter-bot/#creating-a-twitter-app*/      
      twitter: {
        // consumer_key: process.env.CONSUMER_KEY,
        // consumer_secret: process.env.CONSUMER_SECRET,
        // access_token: process.env.ACCESS_TOKEN,
        // access_token_secret: process.env.ACCESS_TOKEN_SECRET
        consumer_key: process.env.TESTING_CKEY,
        consumer_secret: process.env.TESTING_CSECRET,
        access_token: process.env.TESTING_ATOKEN,
        access_token_secret: process.env.TESTING_ASECRET
      }
    },
    T = new Twit(config.twitter),
    stream = T.stream('statuses/sample');

var bot_responses = [
  "I am awake!",
  "I'm awake!",
  "I dozed off.",
  "I dozed off, but I am awake now!",
  "I dozed off, but I'm awake now!"
];

function random_from_array(arr){
  return arr[Math.floor(Math.random()*arr.length)]; 
}

app.all("/tweet", function (request, response) {
  /* Respond to @ mentions */
  fs.readFile(__dirname + '/last_mention_id.txt', 'utf8', function (err, last_mention_id) {
    /* First, let's load the ID of the last tweet we responded to. */
    console.log('last_mention_id:', last_mention_id);

    T.get('search/tweets', { q: 'to:' + process.env.TESTING_TWITTER_HANDLE + ' -from:' + process.env.TESTING_TWITTER_HANDLE, since_id: last_mention_id }, function(err, data, response) {
      /* Next, let's search for Tweets that mention our bot, starting after the last mention we responded to. */
      if (data.statuses.length){
        // console.log(data.statuses);
        data.statuses.forEach(function(status) {
          console.log(status.id_str);
          console.log(status.text);
          console.log(status.user.screen_name);

          /* Now we can respond to each tweet. */
          T.post('statuses/update', {
            status: '@' + status.user.screen_name + ' ' + random_from_array(bot_responses),
            in_reply_to_status_id: status.id_str
          }, function(err, data, response) {
            if (err){
                /* TODO: Proper error handling? id:14 gh:19 ic:gh*/
              console.log('Error!');
              console.log(err);
            }
            else{
              fs.writeFile(__dirname + '/last_mention_id.txt', status.id_str, function (err) {
                /* TODO: Error handling? id:13 gh:18 ic:gh*/
              });
            }
          });
        });
      } else if (err) {
        console.log(err);
      } else {
        /* No new mentions since the last time we checked. */
        console.log('No new mentions...');      
      }
    });    
  });

  /* Respond to DMs */

  fs.readFile(__dirname + '/last_dm_id.txt', 'utf8', function (err, last_dm_id) {
    /* Load the ID of the last DM we responded to. */
    console.log('last_dm_id:', last_dm_id);

    T.get('direct_messages', { since_id: last_dm_id, count: 200 }, function(err, dms, response) {
      /* Next, let's search for Tweets that mention our bot, starting after the last mention we responded to. */
      if (dms.length){
        dms.forEach(function(dm) {
          console.log(dm.sender_id);
          console.log(dm.id_str);
          console.log(dm.text);

          /* Now we can respond to each tweet. */
          T.post('direct_messages/new', {
            user_id: dm.sender_id,
            text: random_from_array(bot_responses)
          }, function(err, data, response) {
            if (err){
              /* TODO: Proper error handling? id:11 gh:16 ic:gh*/
              console.log('Error!');
              console.log(err);
            }
            else{
              fs.writeFile(__dirname + '/last_dm_id.txt', dm.id_str, function (err) {
                /* TODO: Error handling? id:12 gh:17 ic:gh*/
              });
            }
          });
        });
      } else if (err) {
        console.log(err);
      } else {
        /* No new DMs since the last time we checked. */
        console.log('No new DMs...');      
      }
    });    
  });  
  
  /* TODO: Handle proper responses based on whether the tweets succeed, using Promises. For now, let's just return a success message no matter what. id:15 gh:20 ic:gh*/
  response.sendStatus(200);
});
