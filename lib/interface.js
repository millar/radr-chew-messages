var request = require('request-promise')
  , cheerio = require('cheerio')

var apiUrl = 'https://api.chew.tv/v1'

module.exports = function(apiKey, radrUserId, showUri) {
  return {
    validateApiKey() {
      return new Promise((resolve, reject) => {
        request.get({url: `${apiUrl}/users/me`, qs: {key: apiKey}, json: true}).then(response => {
          resolve(response.user)
        }).catch(error => {
          reject(`Incorrect Chew api key`)
        })
      })
    },

    findChewShow(user) {
      return new Promise((resolve, reject) => {
        // Validate show (if given)
        if (showUri) {
          let lastSegment = showUri.split('/').pop()
          request.get({url: `${apiUrl}/shows`, qs: {slug: lastSegment, key: apiKey}, json: true}).then(response => {
            let shows = response.shows

            if (response.shows.length && response.shows[0].slug == lastSegment) {
              let show = response.shows[0]

              if (show.user.id != user.id) {
                reject(`Specified show is not yours!`)
              }

              resolve(show)
            } else {
              reject(`Show matching slug '${lastSegment}' not found`)
            }
          }, error => {
            reject(`Chew show not found`)
          })
        } else {
          request.get({url: `${apiUrl}/users/me/shows`, qs: {key: apiKey, live: true}, json: true}).then(response => {
            let shows = response.shows

            if (shows.length) {
              resolve(shows[0])
            } else {
              reject(`You do not have any shows live right now. Please start this script once your show has gone live.`)
            }
          })
        }
      })
    },

    findRadrPlaylist() {
      return new Promise((resolve, reject) => {
        request({
          url: `https://radr.dj/beta/user/${radrUserId}`,
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
    },

    loadPlaylistTracks(radrUrl) {
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
    },

    sendMessage(show, msg) {
      return new Promise((resolve, reject) => {
        request.post({url: `${apiUrl}/shows/${show.id}/chats`, qs: {key: apiKey}, form: {message: msg}, json: true}).then(response => {
          console.log(`Posted: ${msg}`)

          resolve()
        }, response => {
          reject(`Message could not be sent`)
        })
      })
    }
  }
}
