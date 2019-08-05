const fetch = require('node-fetch');

class weather {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.long = null;
        this.lat = null;
        this.unit = 'si';
        this.queryArr = ['excludes=currently', `units=${this.unit}`];
        this.getQuery = () => this.queryArr.join('&');
        this.getUrl = () => `https://api.darksky.net/forecast/${this.apiKey}/${this.lat},${this.long}?${this.getQuery()}`;
    }

    static isNull(value) {
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

    query(querys) {
        if (Array.isArray(querys)) {
            this.queryArr.concat(querys);
        } else {
            this.queryArr.push(querys);
        }
        return this;
    }

    getTemp() {
        return new Promise((resolve, reject) => {
            if (!weather.isNull(this.lat) || !weather.isNull(this.long)) {
                reject("Request not sent. ERROR: Longitude or Latitude is missing.")
            }

            fetch(this.getUrl())
            .then(response => response.json())
            .then(data => resolve(`${data.currently.summary} and about ${Math.round(parseInt(data.currently.temperature))}°`))
            .catch(err => reject(`Forecast could not be retrieved. ERROR: ${err}`))
        })
    }
}

module.exports = weather;