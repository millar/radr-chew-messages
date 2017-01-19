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

var async = require('async')
  , api = require('../lib/interface')(argv.k, argv.u, argv.s)

var user, show, radrUrl, matchedTrackCount = 0

api.validateApiKey().then(u => {
  user = u

  return api.findChewShow(user).then(result => {
    show = result

    return api.findRadrPlaylist().then(url => {
      radrUrl = url

      console.log(`Watching most recent RADR playlist songs for show: ${show.name}`)

      function checkForTracks() {
        console.log(`Checking for tracks...`)

        api.loadPlaylistTracks(radrUrl).then(tracks => {
          let newTracks = tracks.slice(matchedTrackCount)

          console.log(`${newTracks.length} new tracks found`)

          matchedTrackCount += newTracks.length

          async.eachSeries(newTracks, (track, callback) => {
            let message = `Now Playing: ${track.artist} - ${track.title}`

            api.sendMessage(show, message).then(() => callback()).catch(err => callback(err))
          })
        }).catch(error => {
          if (error) {
            console.error(`ERROR: ${error}`)
          }
        })
      }

      setInterval(checkForTracks, 3000)
    })
  })
}).catch(error => {
  console.error(`ERROR: ${error}`)
  process.exit()
})
