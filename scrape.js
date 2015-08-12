var scraperjs = require('scraperjs');
var request = require('request');
var fs = require('fs');
var moment = require('moment');
var allTheUrls = [];
var allTheWods = [];
var wodCount = 0;
var promises = [];
var days = 0;

var wodUrl = 'http://beyondthewhiteboard.com/';
var rootUrl = 'http://beyondthewhiteboard.com/gyms/2-main-site/calendar/?d=';
var previousMonth = '2015-08-01';

function scrapeMonth(month) {
    return scraperjs.StaticScraper
        .create(rootUrl + month)
        .scrape(function ($) {
            return $('#main .calendar-details .event-workout a:first-child')
                .map(function () {
                    return this.attribs.href;
                }).get();
        }, function (urls) {
            allTheUrls = allTheUrls.concat(urls.filter(function (url) {
                return allTheUrls.indexOf(url) < 0;
            }));
            return urls.length;
        });
}

function scrapeUntilEmpty(thisMonth) {
    return scrapeMonth(thisMonth)
        .then(function (scraperRes) {
            previousMonth = moment(previousMonth, 'YYYY-MM-DD').subtract(1, 'months').format('YYYY-MM-DD');

            if (scraperRes.lastReturn !== 0) {
                days++;
                return scrapeUntilEmpty(previousMonth);
            } else {
                console.log(allTheUrls);
            }
        });
}

function scrapeAllPages() {
    var urls = fs.readFileSync('wodurls.txt').toString().split("\n");
    //urls = urls.slice(2160, 2170);
    var loopIteration = 0;                     //  set your counter to 1

    function myLoop() {           //  create a loop function
        // setTimeout(function () {    //  call a 3s setTimeout when the loop is called
        var fullUrl = wodUrl + urls[loopIteration];
        //console.log(fullUrl);

        var j = request.jar();
        var cookie = request.cookie('_btwb_session_id=BAh7CEkiD3Nlc3Npb25faWQGOgZFRkkiJTI1NThhNGZkOTRhY2U5NDU4N2U2MDNiY2RmMDcxYTcxBjsAVEkiEF9jc3JmX3Rva2VuBjsARkkiMWFVS0ExWlpab0MrMGlFTjgrcVNhSmdZcDNyUGx0WUUraDhHNkgzZHkydkE9BjsARkkiDm1lbWJlcl9pZAY7AEZpAqR3--8644930bde319f7bd1d53042002385c4927e49e7');
        j.setCookie(cookie, fullUrl);
        cookie = request.cookie('auth_token=ce8f5e9b762d1c4439bfc4dbcb2844b52cd0f33f');
        j.setCookie(cookie, fullUrl);
        var requestOptions = { url: fullUrl, jar: j, proxy: 'http://10.0.1.62:8888' };
        // request(requestUrl, function () {
        // request('http://images.google.com')
        // })
        
        var scraper = scraperjs.StaticScraper.create(fullUrl);
        scraper
            .request(requestOptions)
            .scrape(function ($) {
                return $('script')
                    .filter(function () {
                        if (typeof this.children === 'undefined' || this.children.length < 1) {
                            return false;
                        }
                        return this.children[0].data.indexOf("uiobject") > -1;
                    })
                    .map(function () {
                        var script = this.children[0].data;
                        script = script
                            .substring(script.indexOf("'{") + 1, script.indexOf("}'"))
                            .replace(/\\/g, "");
                        return script;
                    });
            }, function (wod, utils) {
                if (typeof wod[0] === 'undefined') {
                    return;
                }
                console.log(wod[0]);
                // allTheWods.push(wod[0]);
                wodCount++;
                //console.log(wodCount);
            })
            .then(function () {
                loopIteration++;                     //  increment the counter
                if (loopIteration < urls.length) {            //  if the counter < 10, call the loop function
                    myLoop();             //  ..  again which will trigger another 
                }
            });
    }

    myLoop();


};

function getTheScoringTypes() {
    var wods = JSON.parse(fs.readFileSync('wods.json')
        .toString());

    var types = wods.map(function (wod) {
        return wod.prescription.scoring;
    }).reduce(function (acc, curr) {
        if (typeof acc[curr] == 'undefined') {
            acc[curr] = 1;
        } else {
            acc[curr] += 1;
        }

        return acc;
    }, {});

    console.log(types);
}

function getPrescriptionTypes() {
    var wods = JSON.parse(fs.readFileSync('wods.json')
        .toString());

    var types = wods.map(function (wod) {
        return wod.prescription.type;
    }).reduce(function (acc, curr) {
        if (typeof acc[curr] == 'undefined') {
            acc[curr] = 1;
        } else {
            acc[curr] += 1;
        }

        return acc;
    }, {});

    console.log(types);
}

function getTheRepSchemes() {
    var wods = JSON.parse(fs.readFileSync('wods.json').toString())
        .filter(function (wod) {
            return wod.prescription.scoring === 'totalRounds' ||
                wod.prescription.scoring === 'totalReps' ||
                wod.prescription.scoring === 'totalTime';
        })
    //.slice(0, 20)
        ;

    var repsDifferByEx = wods
        .filter(function (wod) {
            return typeof wod.prescription.repScheme === 'undefined' &&
            wod.prescription.type !== 'deathby/reps' &&
            wod.prescription.type !== 'fgb' &&
            !(wod.prescription.type === 'amreps' && wod.contents.length == 1);
        })
        .map(function (wod) {
            return wod.contents.map(function (movement) {
                if (typeof movement.reps !== 'undefined') {
                    return movement.reps.value + (movement.movementName === 'Double Under' ? 'du' : '');
                } else if (typeof movement.distance !== 'undefined') {
                    return movement.distance.value + movement.distance.unit;
                } else if (typeof movement.time !== 'undefined') {
                    return movement.time.value + movement.time.unit + ' ' + movement.type;
                } else if (typeof movement.contents !== 'undefined') {
                    return 'section'; // could refine this
                } else if (movement.movementName === 'Alternating Kettlebell Snatch') {
                    return 'Alternating Kettlebell Snatch';
                } else {
                    return movement.movementName;
                }
            });
        })
        .reduce(function (acc, curr) {
            if (typeof acc[JSON.stringify(curr)] == 'undefined') {
                acc[JSON.stringify(curr)] = 1;
            } else {
                acc[JSON.stringify(curr)] += 1;
            }

            return acc;
        }, {});
        
   var repsDifferByRound = wods
        .filter(function (wod) {
            return typeof wod.prescription.repScheme !== 'undefined';
        })
        .map(function (wod) {
            return wod.prescription.repScheme;
        })
        .reduce(function (acc, curr) {
            if (typeof acc[JSON.stringify(curr)] == 'undefined') {
                acc[JSON.stringify(curr)] = 1;
            } else {
                acc[JSON.stringify(curr)] += 1;
            }

            return acc;
        }, {});

    // var schemes = wods
    //     .map(function (wod) {
    //         var scheme = {};
    //         // scheme.hashCode = function () {
    //         //     var hash = 0;
    //         //     if (this.length == 0) return hash;
    //         //     for (var i = 0; i < this.length; i++) {
    //         //         var character = this.charCodeAt(i);
    //         //         hash = ((hash << 5) - hash) + character;
    //         //         hash = hash & hash; // Convert to 32bit integer
    //         //     }
    //         //     return hash;
    //         // }

    //         if (typeof wod.prescription.repScheme !== 'undefined') {
    //             scheme.repsDifferByRound = wod.prescription.repScheme;

    //             scheme.repsDifferByEx = [0]
    //         } else if (wod.prescription.type == 'deathby/reps') {
    //             scheme.repsDifferByRound = [wod.prescription.startReps.value, wod.prescription.startReps.value +
    //                 wod.prescription.addReps.value, wod.prescription.startReps.value + 2 * wod.prescription.addReps.value, '...'];

    //             scheme.repsDifferByEx = [0]
    //         } else if (wod.prescription.type == 'fgb') {
    //             scheme.repsDifferByRound = ['fgb'];

    //             scheme.repsDifferByEx = [0]
    //         } else if (wod.prescription.type == 'amreps' && wod.contents.length === 1) {
    //             scheme.repsDifferByRound = ['total reps in ' + wod.prescription.time.value];

    //             scheme.repsDifferByEx = [0]
    //         }
    //         else {
    //             scheme.repsDifferByRound = [0];

    //             scheme.repsDifferByEx = wod.contents.map(function (movement) {
    //                 if (typeof movement.reps !== 'undefined') {
    //                     return movement.reps.value + (movement.movementName === 'Double Under' ? 'du' : '');
    //                 } else if (typeof movement.distance !== 'undefined') {
    //                     return movement.distance.value + movement.distance.unit;
    //                 } else if (typeof movement.time !== 'undefined') {
    //                     return movement.time.value + movement.time.unit + ' ' + movement.type;
    //                 } else if (typeof movement.contents !== 'undefined') {
    //                     return 'section'; // could refine this
    //                 } else if (movement.movementName === 'Alternating Kettlebell Snatch') {
    //                     return 'Alternating Kettlebell Snatch';
    //                 } else {
    //                     return movement.movementName;
    //                 }
    //             });
    //             var test;
    //         }

    //         return scheme;
    //     })
    //     .reduce(function (acc, curr) {
    //         // if (typeof acc[curr.hashCode()] == 'undefined') {
    //         //     acc[curr.hashCode()] = {};
    //         //     acc[curr.hashCode()].scheme = curr;
    //         //     acc[curr.hashCode()].total = 1;
    //         // } else {
    //         //     acc[curr.hashCode()].total += 1;
    //         // }
    //         if (JSON.stringify(curr) === '{"repsDifferByRound":[0],"repsDifferByEx":[0,0,0,0,0,"60seconds rest"]}') {
    //             var one;
    //         }

    //         if (typeof acc[JSON.stringify(curr)] == 'undefined') {
    //             acc[JSON.stringify(curr)] = 1;
    //         } else {
    //             acc[JSON.stringify(curr)] += 1;
    //         }

    //         return acc;
    //     }, {});

    // var sortable = [];
    // for (var scheme in schemes)
    //     sortable.push([scheme, schemes[scheme]])
    // sortable.sort(function (a, b) { return a[1] - b[1] })


    var sortedEx = [];
    for (var scheme in repsDifferByEx) {
        var i = {};
        i.scheme = scheme;
        i.total = repsDifferByEx[scheme];
        sortedEx.push(i)
    }
    sortedEx.sort(function (a, b) { return b.total - a.total })
    console.log("Differing reps by exercise:")
    console.log(sortedEx);
    
    var sortedRounds = [];
    for (var scheme in repsDifferByRound) {
        var i = {};
        i.scheme = scheme;
        i.total = repsDifferByRound[scheme];
        sortedRounds.push(i)
    }
    sortedRounds.sort(function (a, b) { return b.total - a.total })
    console.log("Differing reps by round:")
    console.log(sortedRounds);    
}

//scrapeUntilEmpty(previousMonth);
// scrapeAllPages();
getTheRepSchemes();
//getTheScoringTypes();
//getPrescriptionTypes();sortedRounds