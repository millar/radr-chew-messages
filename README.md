radr-chew-messages
==================

A node.js demon designed to scrape tracks from RADR playlists and send track info as messages on a specified Chew show.

## Requirements
- node.js v6+

## Installation
```sh
git clone https://github.com/millar/radr-chew-messages
cd radr-chew-messages
chmod +x watch_songs.js
```

## Usage
```sh
Usage: ./watch_songs.js -u [radr user id] -k [chew api key]

Options:
  -u, --user_id   RADR user ID (as found at end of profile URL)       [required]
  -k, --api_key   Chew API key (from https://chew.tv/developer)       [required]
  -s, --show_uri  Chew show URI (if not given first live show will be chosen
                  automatically)
  -h, --help      Show help                                            [boolean]

Examples:
  ./watch_songs.js -u 2239 -k euWdUdETF3Vt74hRvYIENX8flysPiqGiGCrEsmVI
```
