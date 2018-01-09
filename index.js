var http	= require("http");
var google = require('googleapis');
var scbconnect = require('./SCBConnect-6fa1aded75c3.json');
const VIEW_ID = 'ga:139822590';
const METRICS_NAME ='rt:activeUsers';
var currentActiveUser = 0;

exports.handler = function (event, context, callback) {
  var redis = require("redis");
  var client = redis.createClient(6380,'gwdev.digitalten.xyz');

  client.on("error", function (err) {
    getFromGA();
  });

  client.get("cacheActiveUser",function(error,value){

      if(error || !value){
        getFromGA();
      } else {
        console.log("use cache");
        currentActiveUser = parseInt(value);
        redirectTo();
      }
  });


  function getFromGA(){
    let jwtClient = new google.auth.JWT(
      scbconnect.client_email, null, scbconnect.private_key,
        ['https://www.googleapis.com/auth/analytics.readonly'], null);
      jwtClient.authorize(function (err, tokens) {
        if (err) {
          console.log(err);
          return;
        }
        let analytics = google.analytics('v3');
        queryData(analytics);
      });
      function queryData(analytics) {
        analytics.data.realtime.get({
          'auth': jwtClient,
          'ids': VIEW_ID,
          'metrics': METRICS_NAME,
        }, function (err, response) {
          if (err) {
            console.log(err);
            return;
          }

          if( !response && !reponse.rows[0]) {
            currentActiveUser = response.rows[0];
          }

          client.set("cacheActiveUser",currentActiveUser);
          client.expire('cacheActiveUser', 5);
          client.quit();
          redirectTo();
      });  
    }
  }

  function redirectTo(){
    const LIMIT_ACTIVE_USER = parseInt(process.env.limitActiveUser) || 200;
    let greaterThanLimit = currentActiveUser > LIMIT_ACTIVE_USER;
    let logMessage = `Current active user ${greaterThanLimit ? 'more' : 'less'} than 200`;
    let location = getPage(greaterThanLimit);
    console.log(logMessage);
    context.succeed({
      location
    });
  }

  
  /* UAT version var register = "http://bit.ly/2qzqr6a"  */
  /* PROD version var register = "http://bit.ly/2l9BM7d" */

  /* UAT version var settings =  "http://bit.ly/2CBmBLl" */
  /* PROD version var settings = "http://bit.ly/2Fg9Zv5" */

  //* SIT version var ccactivation = "http://bit.ly/2ADgx37" */
  function getPage(flag){
    switch (event.resourcePath) {
      case '/register':
        return flag ? "https://s3-ap-southeast-1.amazonaws.com/waitingpage-dev-connect-scb/support-high-traffic.html" :
        "http://bit.ly/2qzqr6a";
      case '/settings':
        return flag ? "https://s3-ap-southeast-1.amazonaws.com/waitingpage-setting-dev-connect-scb/support-high-traffic-setting-page.html" :
        "http://bit.ly/2CBmBLl" ;
      case '/ccactivation':
        return flag ? "https://s3-ap-southeast-1.amazonaws.com/waitingpage-setting-dev-connect-scb/support-high-traffic-setting-page.html" :
        "http://bit.ly/2ADgx37" ; 
      default: 
        return flag ? "https://s3-ap-southeast-1.amazonaws.com/waitingpage-setting-dev-connect-scb/support-high-traffic-setting-page.html" :
        "http://bit.ly/2CBmBLl" ;
    }
  }
};
