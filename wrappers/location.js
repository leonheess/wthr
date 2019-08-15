const fetch = require('node-fetch');
const url = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

class location {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.long = null;
        this.lat = null;
        this.searchString = null;
        this.getCoordsUrl   = () => `${url}/${this.searchString}.json?types=place&access_token=${this.accessToken}`;
        this.getLocationUrl = () => `${url}/${longitude},${latitude}.json?types=place&access_token=${this.accessToken}`;
    }

    static isNotNull(value) {
        return !!value || parseFloat(value) === 0;
    }

    coords({ lat, lng }) {
        this.lat = parseFloat(lat);
        this.long = parseFloat(lng);
        return this;
    }

    searchFor(searchString) {
        this.searchString = searchString;
        return this;
    }

    getCoords() {
        return new Promise((resolve, reject) => {
            if (!this.searchString) {
                reject("request is incomplete. SearchString is empty.")
            }

            fetch(this.getCoordsUrl())
            .then(response => response.json())
            .then(data => resolve({
                coords: {
                    lat: data.features[0].center[1],
                    lng: data.features[0].center[0]
                },
                error: null
            }))
            .catch(err => reject({
                error: `coordinates could not be retrieved. ${err.message}`
            }))
        })
    }

    getLocation() {
        return new Promise((resolve, reject) => {
            if (!location.isNotNull(this.lat) || !location.isNotNull(this.long)) {
                reject("request is incomplete. Longitude or Latitude is missing.")
            }

            fetch(this.getLocationUrl())
            .then(response => response.json())
            .then(data => resolve({
                city: data.features.text,
                error: null
            }))
            .catch(err => reject({
                error: `location could not be retrieved. ${err.message}`
            }))
        })
    }
}

module.exports = location;
