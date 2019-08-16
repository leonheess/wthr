require('dotenv').config({path: __dirname + '/.env'});

const Sentry = require('@sentry/node');
const weatherWrapper = require('./wrappers/weather');
const locationWrapper = require('./wrappers/location');
const express = require('express');

const app = express();
const upload = require('multer')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const weather  = new weatherWrapper(process.env.DARK_SKY_API);
const location = new locationWrapper(process.env.MAPBOX_API);

// start Sentry
Sentry.init({ dsn: process.env.SENTRY_KEY });

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
app.post('/', upload.none(), (req, res) => {
    console.log(`Request received: ${JSON.stringify(req.body)}`);

    let weatherPromise;
    if (req.body.latitude && req.body.longitude) {
        let crds = {lat: req.body.latitude, lng: req.body.longitude};
        weatherPromise = new Promise(resolve => location.coords(crds).getLocation()
        .then(locData => weather.coords(crds).metric(req.body.metric === 'true').getWeather()
        .then(weatherData => resolve({...weatherData, ...{city: locData.city}}))));
    } else if (req.body.input) {
        weatherPromise = new Promise(resolve => {
            location.searchFor(req.body.input).getCoords().then(locData => resolve(weather.coords(locData.coords).metric(req.body.metric === 'true').getWeather()));
        });
    } else {
        weatherPromise = Promise.reject({ error: 'Aborted due to unexpected POST-Body: ' + req.body});
    }

    weatherPromise.then(weatherData => {
        io.emit('update', weatherData);
        res.end();
    }, reject => {
        io.emit('update', reject);
        res.status(500).end();
    }).catch(err => {
        console.error(err.message);
        res.status(500).end();
    });
});

