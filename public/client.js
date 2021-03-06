let socket, latitude, longitude, bgEl, tempEl, searchEl, metric = true, cloudCover = .5;
const appUrl = "https://thewthr.app", errorTemp = "Something went wrong :(";

window.onload = () => {
    bgEl = document.getElementById("background");
    tempEl = document.getElementById("temp");
    searchEl = document.getElementById("search");

    // init event listeners
    document.getElementById("switch").addEventListener("click", event => switchUnit(event.target));
    document.getElementById("locate").addEventListener("click", () => geolocate());
    document.getElementById("submit").addEventListener("click", () => search());
    document.getElementById("search").addEventListener("keydown", e => {
        if (e.key === "Enter") {
            search();
        }
    });

    createClouds();

    // start inner workings
    connect();
    geolocate(true);
};

// check for screen size on every resize
window.onresize = () => createClouds();

// connect to backend
function connect() {
    socket = io.connect(appUrl, { secure: true, rejectUnauthorized: true });
    socket.on("update", data => {
        if (data.error || !data.text || data.temp === undefined || !data.unit) {
            handleErrors(data.error);
        } else {
            // update cloud amount
            if (data.cloudCover !== cloudCover) {
                cloudCover = data.cloudCover || .5;
                createClouds();
            }

            // update classes of background according to weather
            bgEl.className = data.day ? "day" : "night";
            switch (data.classes) {
                case "rain":
                case "sleet":
                    bgEl.classList.add("rain");
                    break;
                case "snow":
                    bgEl.classList.add("snow");
                    break;
            }
            display(`${data.text} with about ${data.temp}°${data.unit}`);
            searchEl.value = data.city || searchEl.value;
        }
    });
    socket.on("connect_error", handleErrors);
    socket.on("disconnect", handleErrors);
    socket.on("connect_failed", handleErrors);
}

// create clouds
function createClouds() {
    // remove old clouds
    bgEl.querySelectorAll('.cloud').forEach(e => e.remove());

    // create new clouds
    let cloudAmount = Math.floor((window.innerWidth * 0.013) * cloudCover);
    let topValues = randomFromIntervalButSpread(-750, -600, cloudAmount);
    let leftValues = randomFromIntervalButSpread(-500, window.innerWidth - 500, cloudAmount);
    for (let i = 0; i < cloudAmount; i++) {
        let cloud = document.createElement('DIV');
        cloud.classList.add('cloud');
        cloud.style.top = `${topValues[i] - 40000 / window.innerHeight}px`;
        cloud.style.left = `${leftValues[i]}px`;
        bgEl.append(cloud);
    }
}

// post user input
function search() {
    if (searchEl.value) {
        display("Loading<span>.</span><span>.</span><span>.</span>");
        const data = new FormData();
        data.append('input', searchEl.value);
        data.append('metric', metric);

        fetch('/', {
            method: 'POST',
            body: data
        }).then(handleResponses).catch(handleErrors);
    } else {
        alert('No search term entered. Please enter a city or press on the "Locate me!" icon to proceed.');
        tempEl.classList.remove('appeared');
    }

}

// locate user and post coordinates
function geolocate(suppress = false) {
    if (!suppress) {
        display("Loading<span>.</span><span>.</span><span>.</span>");
    }

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
        }).then(handleResponses).catch(handleErrors);
    }).catch(err => {
        if (!suppress) {
            handleErrors(err);
            alert('Locating failed because it is not supported by your machine or because it was denied by the user or the user settings.');
        }
    });
}

// switch units
function switchUnit(button) {
    metric = !metric;
    button.textContent = metric ? '°C' : '°F';
    if (searchEl.value) {
        search();
    }
}

// helper functions
function randomFromIntervalButSpread(min, max, steps) {
    return new Array(steps)
        .fill(0)
        .map((n, i) => Math.floor(Math.random() * ((max - min) / steps + 1) + (i * (max - min)) / steps + min))
        .sort(() => Math.random() - 0.5);
}

function display(newText) {
    if (tempEl.textContent !== newText) {
        tempEl.classList.remove("appeared");
        setTimeout(() => {
            tempEl.innerHTML = newText;
            tempEl.classList.add("appeared");
        }, 500);
    }
}

function handleResponses(response) {
    if (!response.ok) {
        display(errorTemp);
        throw Error(`Data sent - Network response NOT OK: ${response.statusText}. For additional information see error above.`);
    }
}

function handleErrors(err) {
    display(errorTemp);
    console.error(err || "An unknown error occurred.");
    searchEl.value = "";
}


/*

function changeTimezone(date, ianatz) {
    return new Date(date.getTime() + date.getTime() - (new Date(date.toLocaleString('en-US', {
        timeZone: ianatz
    }))).getTime());
}

// set time of day
function watch(timezone) {
    let timeOfDay = timezone ? changeTimezone(new Date(), timezone).getHours() : new Date().getHours();
    if (timeOfDay > 6 && timeOfDay < 20) {
        bgEl.classList.add('day');
        bgEl.classList.remove('night');
    } else {
        bgEl.classList.add('night');
        bgEl.classList.remove('day');
    }
}

*/
