require('dotenv').config();

const weatherWorker = require('./workers/weather');
const express = require('express');

const app = express();
const upload = require('multer')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const weather = new weatherWorker(process.env.DARK_SKY_API);

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
        title: `☀ ${process.env.npm_package_name} ☁`
    });
});

// start socket connection for continuous updates
io.on('connection', () => console.log(`Socket.io running → PORT ${server.address().port}`));

// react to post request by client
app.post('/', upload.none(), (req, res) => {
    let weatherPromise;
    if (req.body.latitude && req.body.longitude) {
        weatherPromise = weather.coords({lat: req.body.latitude, lng: req.body.longitude}).metric(true).getWeather();
    } else if (req.body.input) {
        weatherPromise = weather.city({searchString: req.body.input, key: process.env.MAPBOX_API}).metric(true).getWeather();
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

