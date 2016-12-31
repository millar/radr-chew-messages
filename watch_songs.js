#!/usr/bin/env node
var argv = require('yargs')
    .usage('Usage: $0 -u [radr user id] -k [chew api key]')
    .demandOption(['u','k'])
    .alias('u', 'user_id')
    .alias('k', 'api_key')
    .alias('s', 'show_uri')
    .describe('u', 'RADR user ID (as found at end of profile URL)')
    .describe('k', 'Chew API key (from https://chew.tv/developer)')
    .describe('s', 'Chew show URI (if not given first live show will be chosen automatically)')
    .example('$0 -u 2239 -k euWdUdETF3Vt74hRvYIENX8flysPiqGiGCrEsmVI')
    .help('h')
    .alias('h', 'help')
    .argv

var request = require('request-promise')
  , cheerio = require('cheerio')
  , async = require('async')

var apiUrl = 'https://api.chew.tv/v1'
  , user, show, radrUrl, matchedTrackCount = 0

// Validate API key
request.get({url: `${apiUrl}/users/me`, qs: {key: argv.k}}).then(response => {
  user = response.user

  findChewShow().then(result => {
    show = result

    findRadrPlaylist().then(url => {
      radrUrl = url

      console.log(`Attaching most recent RADR playlist songs to show: ${show.name}`)

      loadPlaylistTracks().then(tracks => {
        let newTracks = tracks.slice(matchedTrackCount)

        async.eachSeries(newTracks, (track, callback) => {
          matchedTrackCount++

          let message = `Now Playing: ${track.artist} - ${track.title}`

          sendMessage(message).then(() => callback()).reject(err => callback(err))
        })
      }, error => {
        if (error) {
          console.error(`ERROR: ${error}`)
        }
      })
    })
  }, error => {
    console.error(`ERROR: ${error}`)
    process.exit()
  })
}, error => {
  console.error(`ERROR: Incorrect Chew API key`)
  process.exit()
})

function findChewShow() {
  return new Promise((resolve, reject) => {
    // Validate show (if given)
    if (argv.s) {
      let lastSegment = argv.s.split('/').pop()
      request.get({url: `${apiUrl}/users/me/shows`, qs: {slug: lastSegment}}).then(response => {
        let shows = response.shows

        if (response.shows.length && response.shows[0].slug == lastSegment) {
          let show = response.shows[0]

          if (show.user_id != user.id) {
            reject(`Specified show is not yours!`)
          }

          resolve(show)
        } else {
          reject(`Show matching slug '${lastSegment}' not found`)
        }
      }, error => {
        reject(`Incorrect API key`)
      })
    } else {
      request.get({url: `${apiUrl}/users/me/shows`, qs: {key: argv.k, live: true}, json: true}).then(response => {
        let shows = response.shows

        if (shows.length) {
          resolve(shows[0])
        } else {
          reject(`You do not have any shows live right now. Please start this script once your show has gone live.`)
        }
      })
    }
  })
}

function findRadrPlaylist() {
  return new Promise((resolve, reject) => {
    request({
      url: `https://radr.dj/beta/user/${argv.u}`,
      transform(body) {
        return cheerio.load(body)
      }
    }).then($ => {
      let radrPlaylistUrl = $('.recent_by_user li a.clearfix').attr('href')
      if (radrPlaylistUrl) {
        resolve(radrPlaylistUrl)
      } else {
        reject(`No RADR sessions found for provided user`)
      }
    }, () => {
      reject(`RADR user not found`)
    })
  })
}

function loadPlaylistTracks() {
  return new Promise((resolve, reject) => {
    request({
      url: radrUrl,
      transform(body) {
        return cheerio.load(body)
      }
    }).then($ => {
      let trackStrings = $('.track_details h4').map(function() {
        return $(this).text().trim()
      }).get()

      let tracks = []

      trackStrings.forEach(string => {
        var parts = string.split(' - ')
        tracks.push({
          artist: parts.pop().trim(),
          title: parts.join(' - ').trim()
        })
      })

      resolve(tracks)
    }, () => {
      reject(`RADR playlist not found`)
    })
  })
}

function sendMessage(msg) {
  return new Promise((resolve, reject) => {
    request.post({url: `${apiUrl}/shows/${show.id}/chats`, qs: {key: argv.k}, form: {message: msg}, json: true}).then(response => {
      console.log(`Posted: ${msg}`)

      resolve()
    }, response => {
      reject(`Message could not be sent`)
    })
  })
}
