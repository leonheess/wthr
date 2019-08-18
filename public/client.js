let latitude, longitude, bgEl, tempEl, searchEl, locatable = true, metric = true, errorTemp = 'Something went wrong :(';

window.onload = () => {
    if (window.innerWidth < 700) {
        displayDisclaimer();
    } else {
        bgEl = document.getElementById('background');
        tempEl = document.getElementById('temp');
        searchEl = document.getElementById('search');

        // init event listeners
        searchEl.addEventListener('change', () => search());
        document.getElementById('switch').addEventListener('click', event => switchUnit(event.target));
        document.getElementById('submit').addEventListener('click', () => search());
        document.getElementById('submit').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') search()
        });
        document.getElementById('locate').addEventListener('click', () => {
            if (locatable) {
                geolocate();
            } else {
                alert('Locating failed because it is not supported by your machine or because it was denied by the user or the user settings.');
            }
        });

        watch();
        geolocate();
        createClouds();

        // connect to socket
        let socket = io.connect('https://thewthr.app', {secure: true, rejectUnauthorized: true});
        socket.on('update', data => {
            //console.log(data);
            if (data.error || !data.text || !data.temp || !data.unit) {
                console.log(data.error || 'An unknown error occured.');
                displayTemp(errorTemp);
            } else {
                // update classes of background according to weather
                bgEl.className = 'default';
                watch(data.timezone);
                switch (data.classes) {
                    case 'rain':
                    case 'sleet':
                        bgEl.classList.add('rain');
                        break;
                    case 'snow':
                        bgEl.classList.add('snow');
                        break;
                    case 'cloudy':
                        bgEl.classList.add('cloudy');
                        break;
                    case 'partly-cloudy-day':
                    case 'partly-cloudy-night':
                        bgEl.classList.add('partly-cloudy');
                        break;
                }
                let newText = `${data.text} and about ${data.temp}°${data.unit}`;
                if (tempEl.textContent !== newText) {
                    displayTemp(newText);
                }
                searchEl.value = data.city || searchEl.value;
            }
        });
    }
};

// check for screen size on every resize
window.onresize = () => {
    if (document.getElementById('background') && window.innerWidth < 700) {
        displayDisclaimer();
    } else if (!document.getElementById('background')) {
        location.reload();
    } else {
        createClouds();
    }
};

// creat clouds
function createClouds() {
    bgEl.querySelectorAll('.cloud').forEach(e => e.remove());
    let topValues = randomFromIntervalButSpread(-750, -600, 20);
    let leftValues = randomFromIntervalButSpread(-500, window.innerWidth - 500, 20);
    for (let i = 0; i < Math.ceil(window.innerWidth * 0.013); i++) {
        let cloud = document.createElement('DIV');
        cloud.classList.add('cloud');
        cloud.style.top = `${topValues[i] - 40000 / window.innerHeight}px`;
        cloud.style.left = `${leftValues[i]}px`;
        bgEl.append(cloud);
    }
}

// post user input
function search() {
    displayTemp('Loading...');

    if (searchEl.value) {
        const data = new FormData();
        data.append('input', searchEl.value);
        data.append('metric', metric);

        fetch('/', {
            method: 'POST',
            body: data
        }).then(response => handleResponses(response)).catch(err => handleErrors(err));
    } else {
        alert('No search term entered. Please enter a city or press on the "Locate me!" icon to proceed.');
    }

}

// locate user and post coordinates
function geolocate() {
    displayTemp('Loading...');
    searchEl.value = '';

    // position getter
    let getPosition = options => {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    };

    // post position to backend-service
    getPosition().then(pos => {
        const data = new FormData();
        data.append('latitude', String(pos.coords.latitude));
        data.append('longitude', String(pos.coords.longitude));
        data.append('metric', metric);

        fetch('/', {
            method: 'POST',
            body: data
        }).then(response => handleResponses(response)).catch(err => handleErrors(err));
    }).catch(err => {
        handleErrors(err);
        locatable = false;
        alert('Could not locate this machine. Try again or change the location settings.')
    });
}

// set time of day
function watch(timezone) {
    let timeOfDay = timezone ? changeTimezone(new Date(), timezone).getHours() : new Date().getHours();
    if (timeOfDay > 6 && timeOfDay < 21) {
        bgEl.classList.add('day');
        bgEl.classList.remove('night');
    } else {
        bgEl.classList.add('night');
        bgEl.classList.remove('day');
    }
}

// switch units
function switchUnit(button) {
    metric = !metric;
    button.textContent = metric ? '°C' : '°F';
}

// helper functions
function randomFromIntervalButSpread(min, max, steps) {
    return new Array(steps).fill(0).map((n, i) => Math.floor(Math.random() * ((max - min) / steps + 1) + (i * (max - min)) / steps + min)).sort(() => Math.random() - 0.5);
}

function changeTimezone(date, ianatz) {
    return new Date(date.getTime() + date.getTime() - (new Date(date.toLocaleString('en-US', {
        timeZone: ianatz
    }))).getTime());
}

function displayDisclaimer() {
    let vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.body.innerHTML = '<div style="display:grid;align-items:center;justify-items:center;height:100vh;height:calc(var(--vh,1vh)*100);width:100vw;"><h1 style="color:#000;width:80vw;font-weight:400">Unfortunately this website is not available on small screens for the time being. Please resize the window or switch to another device.</h1></div>';
}

function displayTemp(newText) {
    tempEl.classList.remove('appeared');
    setTimeout(() => {
        tempEl.textContent = newText;
        tempEl.classList.add('appeared');
    }, 500);
}

function handleResponses(response) {
    if (!response.ok) {
        displayTemp(errorTemp);
        throw Error('Data sent - Network response NOT OK: ' + response.statusText);
    }
}

function handleErrors(err) {
    console.error(err.message);
    displayTemp(errorTemp);
}
