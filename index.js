require('dotenv').config();

const weatherWorker = require('./workers/weather');
const express = require('express');
const app = express();
const weather = new weatherWorker(process.env.DARK_SKY_API);
const server = app.listen(process.env.PORT, () => {
    console.log(`Express running → PORT ${server.address().port}`);
});

app.set('view engine', 'pug');
app.set('views', 'public');

app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));

app.get('/', (req, res) => {
    res.render('index', {
        title: process.env.npm_package_name,
        temperature: ''
    });
});

app.post('/', async (req, res) => {
    console.log(req.body);
    console.log(await weather.coords({lat: 37.8267, lng: -122.423}).metric(true).getTemp());
});


