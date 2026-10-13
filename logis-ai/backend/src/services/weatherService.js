const axios = require('axios');
const { timeframes } = require('../config/riskConfig');

// In-memory weather cache: key = 'lat,lon'
const weatherCache = {};

class WeatherService {
    constructor() {
        this.apiKey = process.env.WEATHER_API_KEY || '';
        this.provider = process.env.WEATHER_PROVIDER || 'demo';
        this.baseUrl = process.env.WEATHER_BASE_URL || '';
    }

    getCacheKey(lat, lon) {
        // Round to ~10km precision to improve cache hits if appropriate, for prototype we can just round to 2 decimals
        return `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`;
    }

    async getCurrentWeather(lat, lon) {
        const key = this.getCacheKey(lat, lon);
        const cached = weatherCache[key];

        if (cached && cached.current && (Date.now() - cached.current.fetchedAt.getTime() < timeframes.WEATHER_CACHE_TTL)) {
            return cached.current.data;
        }

        try {
            let data;
            if (this.provider === 'demo' || !this.apiKey) {
                data = this._getDemoCurrentWeather(lat, lon);
            } else {
                data = await this._fetchRealWeather(lat, lon);
            }

            // Cache it
            if (!weatherCache[key]) weatherCache[key] = {};
            weatherCache[key].current = {
                fetchedAt: new Date(),
                data
            };

            return data;
        } catch (error) {
            console.error('Weather API error:', error.message);
            // Fallback to degraded response
            return {
                latitude: lat,
                longitude: lon,
                status: 'unavailable',
                message: 'Weather data unavailable; risk assessment generated using remaining factors'
            };
        }
    }

    async getForecast(lat, lon, days = 3) {
        const key = this.getCacheKey(lat, lon);
        const cached = weatherCache[key];

        if (cached && cached.forecast && (Date.now() - cached.forecast.fetchedAt.getTime() < timeframes.WEATHER_CACHE_TTL)) {
            return cached.forecast.data;
        }

        try {
            let data;
            if (this.provider === 'demo' || !this.apiKey) {
                data = this._getDemoForecast(lat, lon, days);
            } else {
                data = await this._fetchRealForecast(lat, lon, days);
            }

            if (!weatherCache[key]) weatherCache[key] = {};
            weatherCache[key].forecast = {
                fetchedAt: new Date(),
                data
            };

            return data;
        } catch (error) {
            console.error('Weather Forecast API error:', error.message);
            return {
                latitude: lat,
                longitude: lon,
                status: 'unavailable'
            };
        }
    }

    async _fetchRealWeather(lat, lon) {
        // Example for OpenWeatherMap if configured
        const url = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric`;
        const response = await axios.get(url);
        const d = response.data;
        return {
            latitude: lat,
            longitude: lon,
            temperature: d.main?.temp || null,
            precipitation: d.rain?.['1h'] || d.snow?.['1h'] || 0,
            windSpeed: d.wind?.speed || 0,
            visibility: d.visibility ? d.visibility / 1000 : null, // convert to km
            condition: this._normalizeCondition(d.weather?.[0]?.main),
            observedAt: new Date(d.dt * 1000 || Date.now()),
            status: 'available',
            source: 'API'
        };
    }

    async _fetchRealForecast(lat, lon, days) {
        // Mocking real implementation for simplicity as we will likely use Demo
        throw new Error('Real forecast not fully implemented yet');
    }

    _normalizeCondition(condition) {
        if (!condition) return 'clear';
        const lower = condition.toLowerCase();
        if (lower.includes('rain')) return 'rain';
        if (lower.includes('snow')) return 'snow';
        if (lower.includes('cloud')) return 'clouds';
        if (lower.includes('thunder')) return 'thunderstorm';
        if (lower.includes('clear')) return 'clear';
        return lower;
    }

    // Demo Data Generators
    _getDemoCurrentWeather(lat, lon) {
        const seed = Math.abs(Math.sin(lat * lon)) * 100;

        // Pseudo-random but deterministic based on location
        let condition = 'clear';
        let temp = 20;
        let wind = 10;
        let precip = 0;

        if (seed > 80) {
            condition = 'thunderstorm';
            temp = 15;
            wind = 45;
            precip = 25;
        } else if (seed > 60) {
            condition = 'rain';
            temp = 18;
            wind = 25;
            precip = 10;
        } else if (seed > 40) {
            condition = 'clouds';
            temp = 22;
        }

        return {
            latitude: lat,
            longitude: lon,
            temperature: temp,
            precipitation: precip,
            windSpeed: wind,
            visibility: seed > 80 ? 2 : (seed > 60 ? 5 : 10),
            condition: condition,
            observedAt: new Date(),
            status: 'available',
            source: 'Simulation / Demo Data'
        };
    }

    _getDemoForecast(lat, lon, days) {
        const current = this._getDemoCurrentWeather(lat, lon);
        const forecast = [];

        let currentDate = new Date();
        const intervals = [6, 12, 24, 48, 72];

        for (const hours of intervals) {
            if (hours > days * 24) break;

            // Randomly worsen or improve the fake weather
            const change = Math.random() > 0.5 ? 1 : -1;
            const newWind = Math.max(0, current.windSpeed + (change * 10));
            const newPrecip = Math.max(0, current.precipitation + (change * 5));

            let condition = current.condition;
            if (newWind > 40 || newPrecip > 20) condition = 'thunderstorm';
            else if (newPrecip > 5) condition = 'rain';
            else if (condition === 'thunderstorm' && newPrecip === 0) condition = 'clouds';

            const forecastTime = new Date(currentDate.getTime() + hours * 60 * 60 * 1000);

            forecast.push({
                offset: hours,
                time: forecastTime,
                temperature: current.temperature + (Math.random() * 4 - 2),
                precipitation: newPrecip,
                windSpeed: newWind,
                visibility: current.visibility + (Math.random() * 4 - 2),
                condition: condition
            });
        }

        return {
            latitude: lat,
            longitude: lon,
            status: 'available',
            source: 'Simulation / Demo Data',
            forecast
        };
    }
}

module.exports = new WeatherService();
