import puppeteer from "puppeteer"
import tracer from "tracer"
import MongoDB from "mongodb"

import config from "./lib/config.js"

import ExchangeRates from "./src/exchange-rates.js"

const consoleLogger = tracer.colorConsole({	format : "{{message}}" })

const logger = tracer.dailyfile({
	root: "./logs",
	maxLogFiles: 10,
	format: "{{timestamp}} {{message}}",
	dateformat: "HH:MM:ss",
	splitFormat: "yyyymmdd",
	allLogsFileName: "server",
	transport: function (data) {
		consoleLogger[data.title](data.output)
	}
})

const client = await MongoDB.MongoClient.connect(config.DATABASE_URL, { useUnifiedTopology: true })
const database = client.db(config.DATABASE_NAME)
const collection = database.collection("rates")

const browser = await puppeteer.launch({
	headless: true,
	args: [
		"--no-sandbox",
		"--disable-setuid-sandbox",
		"--ignore-certificate-errors"
	]
})

const exchangeRates = new ExchangeRates(browser, logger, collection)
await exchangeRates.load()

;(async function refreshRates() {
	await exchangeRates.retrieveRates()
	this.logger.log(`[exchange-rate] Rates will be refreshed in 5 minutes`)
	setTimeout(() => refreshRates(), 5 * 60000)
})()
