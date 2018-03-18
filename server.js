//  TODO: add bot-ness id:0 gh:2 ic:gh
//  TODO: how to organize the "API" vs the bot? id:1 gh:3 ic:gh
//  TODO: logging? id:8 gh:12 ic:gh
//  TODO: data persistance? id:7 gh:11 ic:gh
//  TODO: set up cron id:9 gh:13 ic:gh
//  TODO: reply immediately if 2*lt < ~5 minutes (the period I'll poll twitter for new messages) id:10 gh:14 ic:gh

// init project
var express = require('express');
var app = express();

var requestor = require('request-promise')
var j = requestor.jar();

var cheerio = require('cheerio');

var moment = require('moment');

var horizonsUri = 'https://ssd.jpl.nasa.gov/horizons.cgi';

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {      
  response.send('This will be a bot');
});

app.get("/api/v1/:astroBody", function( request, response ) {
  j = requestor.jar();  //  need a new jar on every request to reset the session
  var step1 = horizons_find_astro_body_step( request.params.astroBody )
    .then( function ( stepInfo ) {
      console.log("step: " + stepInfo);
      response.send(stepInfo);
  }).catch( function( error ) {
    console.log( 'Exception2: ' + error + error.stack );
    response.send(error.message);
  });
});

//  fake out a Horizon API
//    Horizon tracks the state of the current configuration with sessions, 
//    so we need to reuse the session cookie from the first request

//  TODO: extract the request pattern id:4 gh:7 ic:gh
function horizons_find_astro_body_step( name ) {
//  curl -d sstr=sedna -d body_group=all -d find_body=Search -d mb_list=planet https://ssd.jpl.nasa.gov/horizons.cgi -v 
  var step1 = requestor.post({ jar: j, url: horizonsUri, form: {sstr:name, body_group:'all', find_body:'Search', mb_list:'planet'}});
  
  var step2 = step1.then ( function( body ) {
      var dom = cheerio.load(body);
      var errorNode = dom('.error');
      if( errorNode.length > 0 ) {
        var errorStr = 'Horizons returned an error; most likely the celestial body you requested, ' + name + ', could not be found.';
        throw new Error(errorStr);
      } else {
        return horizons_set_time_interval_step();
      }
    })
    .catch ( function (error) {
      // console.log( 'Exception1: ' + error);
      throw new Error( error );
    });
  
  var step3 = step2.then( function( stepData ) {
    console.log("step2 now: " + stepData.now);
    console.log("step2 then: " + stepData.then);
    return horizons_set_out_table_step( stepData.now, stepData.then);
    })
    .catch( function( err ) {
      throw new Error( err );
    });
  
  var step4 = step3.then( function( stepData ) {
    return horizons_set_display_step( stepData.now, stepData.then );
    })
    .catch( function( err ) {
      throw new Error( err );
    });
  
  var step5 = step4.then( function( stepData ) {
    return horizons_send_query( stepData.now, stepData.then );
    })
    .catch( function( err ) {
      throw new Error( err );
    });
  
          // var step5 = horizons_send_query( start_time, end_time );
        // console.log("step5: " + step5);


  // var step3 = step2.then( function( stepData ) {
  //     console.log(step2);
  //     console.log( stepData.now );
  //     console.log( stepData.then );
  //     var step3 = horizons_set_display_step( stepData.now, stepData.then);
  //     return step3;
  // }).catch( function( err ) {
  //   throw new Error( err );
  // });
  
  return step5;
}

function horizons_set_time_interval_step() {
//  curl --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d start_time="2018-02-25 12:00" -d stop_time="2018-02-25 12:01" -d step_size=1 -d interval_mode=f -d set_time_span="Use Specified Times" https://ssd.jpl.nasa.gov/horizons.cgi -v
  var now = new Date();
  var then = new Date();
  then.setMinutes(now.getMinutes()+1);
  now = moment(now).format('YYYY-MMM-D HH:mm');
  then = moment(then).format('YYYY-MMM-D HH:mm');
  var thisObj = new Object();

  return requestor.post({ jar: j, url: horizonsUri, form: {start_time:now, stop_time:then, step_size:'1', interval_mode:'m', set_time_span: 'Use Specified Times'}})
    .then( function( body ) {
      var dom = cheerio.load(body);
      var errorNode = dom('.error');
      var settings = dom('h3').next();
      if( errorNode.length > 0 ) {
        var errorStr = 'Horizons returned an error.';
        throw new Error( errorStr );
      } else {
        thisObj.now = now.replace( 'T', ' ');
        thisObj.then = then.replace( 'T', ' ');
        return thisObj;
        // var step3 = horizons_set_out_table_step( now.replace( 'T', ' ' ), then.replace( 'T', ' ') );
        // console.log("step3: " + settings);
        // return step3;
      }
    })
    .catch(function( error ) {
      console.log(error);
    });
}

function horizons_set_out_table_step( start_time, end_time ) {
//  curl --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d oq_21=1 -d time_digits=MINUTES -d set_table="Use Selected Settings" -d set_table_settings=1 https://ssd.jpl.nasa.gov/horizons.cgi -v
  var thisObj = new Object();
  return requestor.post({ jar: j, url: horizonsUri, form: {oq_21:'1', time_digits:'MINUTES', obj_data:'NO', set_table_settings:'1', set_table: 'Use Settings Abbove'}})
    .then( function( body ) {
      console.log( 'out table: ' + start_time );
      console.log( 'out table: ' + end_time );
      var dom = cheerio.load(body);
      var errorNode = dom('.error');
      var settings = dom('h3').next();
      if( errorNode.length > 0 ) {
        console.log( "Horizons returned an error.");
        return "error";
      } else {
        thisObj.now = start_time;
        thisObj.then = end_time;
        return thisObj;
        // var step4 = horizons_set_display_step( start_time, end_time );
        // console.log("step4: " + settings);
        // return step4;
      }
    })
    .catch(function( error ) {
      console.log(error);
    });    
}

function horizons_set_display_step( start_time, end_time ) {
//  curl --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d display=TEXT -d .cgifields=display -d set_display="Use Selection Above" https://ssd.jpl.nasa.gov/horizons.cgi -v  
  var thisObj = new Object();
  return requestor.post({ jar: j, url: horizonsUri, form: {display:'TEXT', set_display:'Use Selection Above'}})
    .then( function( body ) {
      console.log( 'display: ' + start_time );
      console.log( 'display: ' + end_time );
      var dom = cheerio.load(body);
      var errorNode = dom('.error');
      if( errorNode.length > 0 ) {
        console.log( "Horizons returned an error.");
        return "error";
      } else {
        thisObj.now = start_time;
        thisObj.then = end_time;
        return thisObj;
      }
    })
    .catch( function( err ) {
      throw new Error( err );
    });
}

function horizons_send_query( start_time, end_time ) {
//  curl -v --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d go="Generate Ephemeris" https://ssd.jpl.nasa.gov/horizons.cgi#results
  
//  TODO: handle the final error model id:5 gh:8 ic:gh
// *** Horizons ERROR/Unexpected Results ***


 

// Cannot interpret date. Type "?!" or try YYYY-Mon-Dy {HH:MM} format.

// *******************************************************************************
  
  return requestor.post({ jar: j, url: horizonsUri, form: {go:'Generate Ephemeris'}})
    .then( function( body ) {
      console.log( 'send: ' + start_time );
      console.log( 'send: ' + end_time );

      var dom = cheerio.load(body);
      var errorNode = dom('.error');
      if( errorNode.length > 0 ) {
        console.log( "Horizons returned an error.");
        return "error";
      } else {
        var lt = extract_one_way_light_time( body, start_time, end_time );
        // console.log(j);
        // console.log("step5: " + body);
        var rt = convert_owlt_to_round_trip( lt );
        return rt;
      }

    })
    .catch( function( err ) {
      throw new Error( err );
    });
}

function extract_one_way_light_time( output, start_time, end_time ) {
  //  this is a little fragile
  //  the times appear in the output table more than once as of 2018-03-14, but....
  var lt = output.split(start_time)[2].split(end_time)[0].trimLeft();
  return lt;
}

function convert_owlt_to_round_trip( one_way_light_time ) {
  var rt_time_decimal = one_way_light_time * 2;
  return moment().startOf( 'day' ).add( rt_time_decimal, 'minutes' ).format( 'm:ss' );
}

function respond_to_tweet(screen_name, id_str, body_name, light_time) {
    /* Now we can respond to each tweet. */
  T.post('statuses/update', {
    status: '@' + screen_name + ', the round-trip light-time to ' + body_name + ' is ' + light_time,
    in_reply_to_status_id: id_str
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
}

function respond_to_dm(sender_id, id_str, body_name, light_time) {
  /* Now we can respond to each tweet. */
  T.post('direct_messages/new', {
    user_id: sender_id,
    text: 'tTe round-trip light-time to ' + body_name + ' is ' + light_time
  }, function(err, data, response) {
    if (err){
      /* TODO: Proper error handling? id:11 gh:16 ic:gh*/
      console.log('Error!');
      console.log(err);
    }
    else{
      fs.writeFile(__dirname + '/last_dm_id.txt', id_str, function (err) {
        /* TODO: Error handling? id:12 gh:17 ic:gh*/
      });
    }
  });
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

app.all("/tweet", function (request, response) {
  /* Respond to @ mentions */
  fs.readFile(__dirname + '/last_mention_id.txt', 'utf8', function (err, last_mention_id) {
    /* First, let's load the ID of the last tweet we responded to. */
    console.log('last_mention_id:', last_mention_id);

    T.get('search/tweets', { q: 'to:' + process.env.TESTING_TWITTER_HANDLE + ' -from:' + process.env.TESTING_TWITTER_HANDLE, since_id: last_mention_id, result_type: "recent", count: 100 }, function(err, data, response) {
      /* Next, let's search for Tweets that mention our bot, starting after the last mention we responded to. */
      // console.log(data);
      if (data.statuses.length){
        // console.log(data.statuses);
        data.statuses.forEach(function(status) {
          console.log(status.id_str);
          console.log(status.text);
          console.log(status.user.screen_name);
          var tweet_content = status.text.replace('@' + process.env.TESTING_TWITTER_HANDLE + ' ', '');
          console.log(tweet_content);
          //  TODO  send query and respond
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
          //  TODO  send query and respond to dm
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

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});