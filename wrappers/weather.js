const fetch = require('node-fetch');

class weather {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.long = null;
        this.lat = null;
        this.unit = null;
        this.queryArr = ['excludes=currently'];
        this.getQuery = () => this.queryArr.join('&') + `&units=${this.unit || 'si'}`;
        this.getUrl = () => `https://api.darksky.net/forecast/${this.apiKey}/${this.lat},${this.long}?${this.getQuery()}`;
    }

    static isNotNull(value) {
        return !!value || parseFloat(value) === 0;
    }

    coords({ lat, lng }) {
        this.lat = parseFloat(lat);
        this.long = parseFloat(lng);
        return this;
    }

    metric(bool) {
        this.unit = bool ? 'si' : 'us';
        return this;
    }

    query(queries) {
        if (Array.isArray(queries)) {
            this.queryArr.concat(queries);
        } else {
            this.queryArr.push(queries);
        }
        return this;
    }

    getWeather() {
        return new Promise((resolve, reject) => {
            if (!weather.isNotNull(this.lat) || !weather.isNotNull(this.long)) {
                reject("request is incomplete. Longitude or Latitude is missing.")
            }

            console.log(`Request sent: ${this.getUrl()}`);

            fetch(this.getUrl())
            .then(response => response.json())
            .then(data => resolve({
                temp: Math.round(parseInt(data.currently.temperature)),
                classes: data.currently.icon,
                text: data.currently.summary,
                timezone: data.timezone,
                unit: data.flags.units === 'si' ? 'C' : 'F',
                error: null
            }))
            .catch(err => reject({
                error: `weather could not be retrieved. ${err.message}`
            }))
        })
    }
}

module.exports = weather;