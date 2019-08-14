let latitude, longitude, bgEl, tempEl, searchEl, locatable = true;

window.onload = () => {
    bgEl = document.getElementById('background');
    tempEl = document.getElementById('temp');
    searchEl = document.getElementById('search');

    // init event listeners
    searchEl.addEventListener('change', () => search());
    document.getElementById('submit').addEventListener('click', () => search());
    document.getElementById('locate').addEventListener('click', () => {
        if (locatable) {
            geolocate();
        } else {
            alert('Locating failed because it is not supported by your machine or because it was denied by the user or the user settings.');
        }
    });

    watch();
    geolocate();

    // connect to socket
    let socket = io.connect('http://localhost:7000');
    socket.on('update', data => {
        if (data.error || !data.text || !data.temp) {
            console.log(data.error);
            tempEl.textContent = 'Something went wrong :( - see console for details';
        } else {
            // update classes of background according to weather
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

            tempEl.classList.add('appeared');
            tempEl.textContent = `${data.text} and about ${data.temp}°C`;
        }
    });

    // create clouds
    let topValues = randomFromIntervalButSpread(-750, -600, 20);
    let leftValues = randomFromIntervalButSpread(-500, window.innerWidth + 500, 20);
    for (let i = 0; i < 20; i++) {
        let cloud = document.createElement('DIV');
        cloud.classList.add('cloud');
        cloud.style.top = `${topValues[i]}px`;
        cloud.style.left = `${leftValues[i]}px`;
        document.getElementById('background').append(cloud);
    }
};

function search() {
    document.getElementById('temp').classList.remove('appeared');

    const data = new FormData();
    data.append('input', searchEl.value);

    fetch('/', {
        method: 'POST',
        body: data
    }).then(response => {
        if (!response.ok) {
            throw Error('Data sent - Network response NOT OK');
        } else {
            console.log('Data sent - Network response OK')
        }
    }).catch(err => console.error(err.message));

}

function geolocate() {
    // position getter
    let getPosition = (options) => {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    };

    // post position to backend-service
    getPosition().then(pos => {
        const data = new FormData();
        data.append('latitude', String(pos.coords.latitude));
        data.append('longitude', String(pos.coords.longitude));

        fetch('/', {
            method: 'POST',
            body: data
        }).then(response => {
            if (!response.ok) {
                throw Error('Data sent - Network response NOT OK');
            } else {
                console.log('Data sent - Network response OK')
            }
        }).catch(err => console.error(err.message));
    }).catch(err => {
        locatable = false;
        console.error(err.message);
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

let updater = () => {
    watch();
    geolocate();
};


// helper functions
function randomFromIntervalButSpread(min, max, steps) {
    return new Array(steps).fill(0).map((n, i) => Math.floor(Math.random() * ((max - min) / steps + 1) + (i * (max - min)) / steps + min)).sort(() => Math.random() - 0.5);
}

function changeTimezone(date, ianatz) {
    return new Date(date.getTime() + date.getTime() - (new Date(date.toLocaleString('en-US', {
        timeZone: ianatz
    }))).getTime());
}