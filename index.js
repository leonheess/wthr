require('dotenv').config({path: __dirname + '/.env'});

const Sentry = require('@sentry/node');
const darkskyWrapper = require('./wrappers/darksky');
const mapboxWrapper = require('./wrappers/mapbox');
const express = require('express');

const app = express();
const upload = require('multer')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const weather = new darkskyWrapper(process.env.DARK_SKY_API);
const location = new mapboxWrapper(process.env.MAPBOX_API);

let timeout, updater;

// start Sentry
Sentry.init({dsn: process.env.SENTRY_KEY});

// start server
server.listen(process.env.PORT, () => console.log(`Express running → PORT ${server.address().port}`));

// start rendering engine
app.set('view engine', 'pug');
app.set('views', 'public');

// define express props
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));
app.use(express.json());

// render view
app.get('/', (req, res) => {
    res.render('index', {
        title: `weather ☀`
    });
});

// start socket connection for continuous updates
io.on('connection', () => console.log(`Socket.io running → PORT ${server.address().port}`));

// react to post request by client
app.post('/', upload.none(), async (req, res) => {
    console.log(`Request received: ${JSON.stringify(req.body)}`);

    timeout = setTimeout(() => {
        io.emit('update', {error: 'Aborted request due to servers not responding. Please try again later.'});
        res.status(500).end();
    }, 5000);

    try {
        const weatherData = await retrieveWeather(req.body);

        clearTimeout(timeout);
        clearInterval(updater);

        io.emit("update", weatherData);
        console.log(`All data received. Initial response sent: ${JSON.stringify(weatherData)}. Updater started.`);

        updater = setInterval(() => {
            io.emit("update", weatherData);
            console.log(`Update sent: ${JSON.stringify(weatherData)}`);
        }, 100000);
        res.status(201).send({});
    } catch (err) {
        clearTimeout(timeout);
        clearInterval(updater);

        console.error(err.error);

        io.emit("update", err);
        res.status(500).end();
    }
});

async function retrieveWeather(req) {
    let locationData, weatherData;
    if (req.latitude && req.longitude) {
        let crds = { lat: req.latitude, lng: req.longitude };
        locationData = await location.coords(crds).getLocation();
        weatherData = await weather.coords(crds).metric(req.metric === "true").getWeather();
    } else if (req.input) {
        locationData = await location.searchFor(req.input).getCoords();
        weatherData = await weather.coords(locationData.crds).metric(req.metric === "true").getWeather();
    } else {
        throw {error: 'Aborted request due to unexpected POST-Body.'};
    }
    return Object.assign(weatherData, { city: locationData.city });
}