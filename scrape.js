var scraperjs = require('scraperjs');
var moment = require('moment');
var allTheUrls = [];
var days = 0;

var rootUrl = 'http://beyondthewhiteboard.com/gyms/2-main-site/calendar/?d=';
var previousMonth = '2015-08-01';

function scrapeMonth(month){
   return scraperjs.StaticScraper
    .create(rootUrl + month)
    .scrape(function($) {
        return $('#main .calendar-details .event-workout a:first-child')
            .map(function() {
                return this.attribs.href;
            }).get();
    }, function(urls) {
        allTheUrls = allTheUrls.concat(urls.filter(function(url){
            return allTheUrls.indexOf(url) < 0;
        }));        
        return urls.length;
    });
}

function scrapeUntilEmpty(thisMonth){
    return scrapeMonth(thisMonth)
        .then(function(scraperRes){
             previousMonth = moment(previousMonth, 'YYYY-MM-DD').subtract(1, 'months').format('YYYY-MM-DD');
             
             if (scraperRes.lastReturn !== 0){
                 days++;
                 return scrapeUntilEmpty(previousMonth);
             } else {
                 console.log(allTheUrls);
             }  
        });
}

scrapeUntilEmpty(previousMonth);
    
    // get the first page
    // grab all the workout links on that page
    // process each link finding the repscheme and saving it
    // get the next page
    // repeat