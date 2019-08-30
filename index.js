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

let timeout;

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
        io.emit('update', weatherData);
        console.log(`Answer sent: ${JSON.stringify(weatherData)}`);
        res.status(201).send({});
    } catch (err) {
        clearTimeout(timeout);
        io.emit('update', err);
        console.error(err.error);
        res.status(500).end();
    }
});

async function retrieveWeather(req) {
    if (req.latitude && req.longitude) {
        let crds = {lat: req.latitude, lng: req.longitude};
        const locationData = await location.coords(crds).getLocation();
        const weatherData = await weather.coords(crds).metric(req.metric === 'true').getWeather();
        return Object.assign(weatherData, {city: locationData.city});
    } else if (req.input) {
        const locationData = await location.searchFor(req.input).getCoords();
        return await weather.coords(locationData.crds).metric(req.metric === 'true').getWeather();
    } else {
        throw {error: 'Aborted request due to unexpected POST-Body.'};
    }
}