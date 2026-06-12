// modules/weather.js - Weather Module for Smart Turkistan
import { api } from '../api.js';

export const WeatherModule = {
  async render() {
    const currentContainer = document.getElementById('weather-current-card');
    const forecastContainer = document.getElementById('weather-forecast-grid');

    if (!currentContainer || !forecastContainer) return;

    // Show loading state
    currentContainer.innerHTML = `<div class="loading-spinner">Жүктелуде...</div>`;
    forecastContainer.innerHTML = ``;

    try {
      const weatherData = await api.getWeather();
      const curr = weatherData.current;
      const forecast = weatherData.forecast;

      // 1. Render Current Weather Card
      currentContainer.innerHTML = `
        <div class="weather-city">Түркістан қаласы</div>
        <div class="weather-icon-large">${curr.icon}</div>
        <div class="weather-temp">${curr.temp}°C</div>
        <div class="weather-desc">${curr.condition}</div>
        
        <div class="weather-details-grid">
          <div class="weather-detail-item">
            <span class="label">${curr.humidity_icon} Ылғалдылық</span>
            <span class="value">${curr.humidity}%</span>
          </div>
          <div class="weather-detail-item">
            <span class="label">${curr.wind_icon} Жел жылдамдығы</span>
            <span class="value">${curr.wind_speed} м/с</span>
          </div>
          <div class="weather-detail-item" style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; margin-top: 4px;">
            <span class="label">Сезіледі:</span>
            <span class="value">${curr.feels_like}°C</span>
          </div>
        </div>
      `;

      // 2. Render 7-day Forecast Cards
      forecastContainer.innerHTML = forecast.map(f => `
        <div class="forecast-card glass">
          <span class="forecast-day">${f.day}</span>
          <span class="forecast-icon">${f.icon}</span>
          <span class="forecast-temp">${f.temp}°C</span>
          <span class="sub-text" style="font-size: 10px; margin-top: 2px;">${f.condition}</span>
        </div>
      `).join('');

    } catch (error) {
      console.error("Error rendering weather:", error);
      currentContainer.innerHTML = `<p class="error-text">Ауа райын жүктеу мүмкін болмады.</p>`;
    }
  }
};
