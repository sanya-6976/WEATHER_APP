// Put your real API key here
const apiKey = "f9b9f0d077b7c1d2811c44629554bd7a"; // Your OpenWeather API key used for all API requests


// DOM elements
const cityInput = document.getElementById("cityInput"); // <input> where user types city name
const searchBtn = document.getElementById("searchBtn"); // Search <button> to trigger fetch
const currentCity = document.getElementById("currentCity");  // Element that displays city name
const currentTemp = document.getElementById("currentTemp"); // Element that displays current temp
const currentDesc = document.getElementById("currentDesc");  // Element that displays weather description
const animatedIcon = document.getElementById("animatedIcon"); // Container for animated weather icon
const forecastContainer = document.getElementById("forecast");  // Container where forecast cards are appended
const loading = document.getElementById("loader"); // Loader element (spinner) shown while fetching

// info items — elements that show wind, humidity, sunrise, sunset

const windVal = document.getElementById("windVal"); // Element to show wind speed
const humidityVal = document.getElementById("humidityVal"); // Element to show humidity %
const sunriseVal = document.getElementById("sunriseVal"); // Element to show sunrise time
const sunsetVal = document.getElementById("sunsetVal"); // Element to show sunset time


// modal elements — popup that shows details when a forecast card is clicked
const modal = document.getElementById("modal");  // Modal overlay element
const closeModal = document.getElementById("closeModal"); // Button to close modal
const modalDay = document.getElementById("modalDay"); // Modal: day/title
const modalIcon = document.getElementById("modalIcon");  // Modal: small icon container
const modalDesc = document.getElementById("modalDesc"); // Modal: weather description
const modalTemp = document.getElementById("modalTemp"); // Modal: temperature text
const modalWind = document.getElementById("modalWind"); // Modal: wind text
const modalHumidity = document.getElementById("modalHumidity"); // Modal: humidity text
const modalSun = document.getElementById("modalSun"); // Modal: sunrise/sunset text

/*OpenWeather returns a "main" value like:

"Clear"

"Rain"

"Clouds"

"Fog"

Your app maps these words → CSS animated icons.

For example:

"Clear" → CSS class "icon-sun"

"Clouds" → "icon-cloud"*/
// mapping main condition -> CSS class for animated icon
const iconClassMap = { // Map OpenWeather "main" strings to CSS classes
  Clear: "icon-sun", // Clear → sun CSS
  Clouds: "icon-cloud", // Clouds → cloud CSS
  Rain: "icon-rain",  // Rain → rain CSS
  Drizzle: "icon-rain", // Drizzle treated like light rain
  Snow: "icon-cloud",   // Snow using cloud icon (you can add icon-snow if you want)
  Mist: "icon-fog",// Mist → fog CSS
  Fog: "icon-fog", // Fog → fog CSS
  Haze: "icon-fog", // Haze → fog CSS
  Smoke: "icon-fog", // Smoke → fog CSS
  Thunderstorm: "icon-rain" // Thunderstorm → reuse rain (or add thunder icon
};

// show/hide loader
//Used to show/hide the spinning loader during API calls
function showLoader() { loading.style.display = "block"; }
function hideLoader() { loading.style.display = "none"; }

// convert unix timestamp to local time string like 6:45 AM
function toLocalTime(unixSec, tzOffsetSeconds = 0) {
  /*
  unixSec — expected to be a UNIX timestamp in seconds (number of seconds since 1970-01-01 00:00:00 UTC).
  tzOffsetSeconds = 0 — optional timezone offset in seconds (default 0 if not supplied). This is how many seconds to add to UTC to get the target local time. Many APIs (like OpenWeather) provide timezone offsets in seconds.
  Example meaning: if unixSec is 1609459200 (2021-01-01 00:00:00 UTC) and tzOffsetSeconds is 19800 (India, +5:30), then:

1609459200 + 19800 = 1609479000 (this is the UNIX seconds representing 2021-01-01 05:30:00 local).
avaScript Date expects milliseconds since epoch, not seconds — so multiply seconds by 1000 to convert to milliseconds.

Continuing example: 1609479000 * 1000 = 1609479000000 (milliseconds).

Step C — new Date(...):
Creates a JavaScript Date object representing that exact instant in time (the local-time-adjusted instant). Internally the Date stores UTC milliseconds; you can format it later in the local representation you want.

Why we do this whole expression: OpenWeather gives timestamps in seconds (and its timezone offset in seconds). To show a readable local time (sunrise/sunset) for that city, add the city's offset and convert to a Date.
return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

date.toLocaleTimeString(...) formats the Date into a human-readable time string.

First argument []: means “use the runtime/user default locale”; an empty array asks JS to use the environment’s locale settings.

Options object { hour: "numeric", minute: "2-digit" }:

hour: "numeric" → show the hour (no leading zero if not needed).

minute: "2-digit" → always show two digits for minutes (e.g., 5:05).

Result examples:

In an en-US locale you might get "5:30 AM".

In a 24-hour locale you might get "05:30".

Why use toLocaleTimeString: it respects locale conventions (12h vs 24h) and formats well without extra libraries.*/
  const date = new Date((unixSec + tzOffsetSeconds) * 1000);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// set animated icon by main condition
function setAnimatedIcon(main) {
  // remove old classes
  animatedIcon.className = "animated-icon"; //Gets/sets the entire class="" attribute
  const cls = iconClassMap[main] || "icon-cloud"; //Clears old icon + keeps base animation class
  animatedIcon.classList.add(cls); //Adds the correct weather icon class
}

// format wind speed value (m/s -> km/h)
function msToKmh(ms) {
  if (ms == null) return "--";
  return Math.round(ms * 3.6);
}

// fill today's main UI and info bar
function fillToday(data) {
  /*currentCity is a DOM element (e.g., <h1 id="currentCity">).

.textContent sets the text visible inside that element.

This line displays the city name from the API (e.g., "Delhi").

If data.name is missing, it will display undefined — in practice the API provides this.*/
  currentCity.textContent = data.name;
  /*data.main.temp is the current temperature in Celsius (because we requested units=metric).

Math.round(...) rounds that number to the nearest integer (e.g., 29.4 → 29).

Template string `${...}°C` builds a string like "29°C".

.textContent updates the page so the user sees the temperature.*/
  currentTemp.textContent = `${Math.round(data.main.temp)}°C`;
  /*data.weather is an array; index 0 is the primary weather condition object.

.description is a human-readable description like "clear sky", "light rain".

This line writes that description into the UI (and the CSS .desc class usually capitalizes it visually).

Note: weather is an array because there can be multiple conditions; using index 0 picks the primary one.*/
  currentDesc.textContent = data.weather[0].description;

  // icon
  /*Calls the helper setAnimatedIcon(...) which updates the big animated icon on the left.

data.weather[0].main is a short condition string such as "Clear", "Clouds", "Rain", "Fog".

setAnimatedIcon uses that value to map to CSS classes like icon-sun, icon-cloud so the correct animation shows.*/
  setAnimatedIcon(data.weather[0].main);

  // wind/humidity
  /*ata.wind.speed is wind speed in meters per second (m/s) (the API default).

msToKmh(...) is your helper that converts m/s → km/h and rounds (it does Math.round(ms * 3.6)).

Example: 3.2 m/s → 3.2 * 3.6 = 11.52 → 12 km/h.*/

/*The template string appends " km/h" and updates the DOM element windVal so user sees wind speed in km/h, a more common unit.*/
  windVal.textContent = `${msToKmh(data.wind.speed)} km/h`;
  humidityVal.textContent = `${data.main.humidity}%`;

  // sunrise/sunset (convert using city's timezone offset)
  /*If API gives timezone → use it

If not → default to 0 (UTC)
*/
  const tzOffset = data.timezone || 0; // seconds offset from UTC
  sunriseVal.textContent = toLocalTime(data.sys.sunrise, tzOffset);
  sunsetVal.textContent = toLocalTime(data.sys.sunset, tzOffset);
}

// build forecast cards (4-days):

function buildForecast(forecastData, tzOffset=0) {
  //forecastData: the JSON from OpenWeather 5-day/3hr forecast API
  /*Clears the forecast container

Removes old cards before adding new ones

Prevents stacking*/
  forecastContainer.innerHTML = "";
  // pick entries approx every 24 hours — forecastData.list is each 3h
  // get next days: take indices i=8,16,24,32 (if available)
  let idx = 8;
  let count = 0;
  while (idx < forecastData.list.length && count < 5) {
    /*orecastData.list is an array of weather entries (every 3 hours)

We pick item at index idx (i.e., next 24-hour interval)*/
    const item = forecastData.list[idx];
    //item.dt = UNIX timestamp in UTC seconds
    const dateStr = new Date((item.dt + tzOffset) * 1000).toLocaleDateString([], { weekday: "long" });
    const temp = Math.round(item.main.temp);
    const main = item.weather[0].main;
    const desc = item.weather[0].description;

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `<h4>${dateStr}</h4><p>${temp}°C</p><p style="text-transform:capitalize">${main}</p>`;
    // attach click => show modal with details
    card.addEventListener("click", () => {
      modalDay.textContent = dateStr;
      modalIcon.className = ""; // clear
      modalIcon.className = `modal-icon ${iconClassMap[main] || "icon-cloud"}`;
      modalDesc.textContent = desc;
      modalTemp.textContent = `Temp: ${temp}°C`;
      // wind & humidity from that item
      modalWind.textContent = `Wind: ${msToKmh(item.wind.speed)} km/h`;
      modalHumidity.textContent = `Humidity: ${item.main.humidity}%`;
      // approximate sunrise/sunset remain same as main city day - show city's sunrise/sunset
      const sunRise = toLocalTime(forecastData.city.sunrise, tzOffset);
      const sunSet = toLocalTime(forecastData.city.sunset, tzOffset);
      modalSun.textContent = `Sunrise: ${sunRise} • Sunset: ${sunSet}`;
      modal.style.display = "flex";
    });
//Adds the new forecast card to the forecast grid in the UI
    forecastContainer.appendChild(card);
    //Skip 8 entries → move to the next day
    idx += 8;
    //Increase the number of created cards
    count++;
  }
}

// fetch weather + forecast for a city
async function fetchWeather(city) {
  /*async means the function can use await to pause execution until Promises resolve (makes async code easier to read).

Purpose: fetch current weather + forecast for the given city and update the UI.*/
  if (!city) return;
  try {
    showLoader();
    // clear
    /*Clears any previously rendered forecast cards from the page.

Important to avoid appending new cards on top of old ones when searching multiple times.*/
    forecastContainer.innerHTML = "";
    currentCity.textContent = "Loading...";

    // current weather
    const resp = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${apiKey}`);
    if (!resp.ok) {
      currentCity.textContent = "City not found";
      currentTemp.textContent = "--°C";
      currentDesc.textContent = "";
      hideLoader();
      return;
    }
    const data = await resp.json();

    fillToday(data);
/*Calls a helper that updates the main “today” UI with data (city name, temp, description, icon, wind, humidity, sunrise/sunset).

Keeps code modular — UI update logic separated from fetch logic*/
    // forecast (use city name or data.coord)
    /*resp → current weather response

respF → forecast response (5-day / 3-hour steps)

The F in respF simply stands for “Forecast”.*/ 
    const respF = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(data.name)}&units=metric&appid=${apiKey}`);
    const fData = await respF.json();

    // some APIs return timezone on forecast .city.timezone, else use data.timezone
    const tz = (fData.city && fData.city.timezone) ? fData.city.timezone : data.timezone || 0;
/*Call helper buildForecast with the forecast data and timezone offset to:

generate daily forecast cards (one per day approx),

attach click handlers for modal,

format times using tz.*/
    buildForecast(fData, tz);

  } catch (err) {
    console.error(err);
    currentCity.textContent = "Error fetching data";
    currentTemp.textContent = "--°C";
    currentDesc.textContent = "";
  } finally {
    hideLoader();
  }
}

/* Events */
searchBtn.addEventListener("click", () => fetchWeather(cityInput.value.trim()));
/*“Run this function every time the user releases a keyboard key while typing inside the input box.”

So it detects:

typing

backspace

arrow keys

Enter key

(e) = event object
It tells us which key was pressed.
*/
cityInput.addEventListener("keyup", (e) => { if (e.key === "Enter") fetchWeather(cityInput.value.trim()); });

// modal close
document.getElementById("closeModal").addEventListener("click", () => modal.style.display = "none");
modal.addEventListener("click", (ev) => { if (ev.target === modal) modal.style.display = "none"; });

// initialize with a default
fetchWeather("Delhi");
