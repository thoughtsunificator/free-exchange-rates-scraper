import tracer from "tracer"
import MongoDB from "mongodb"
import fetch from "node-fetch"

import config from "./lib/config.js"

import CURRENCIES_MAP from "./data/currencies_map.js"

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

async function retrieveRate(fromCurrency, toCurrency) {
	const url = `https://www.google.com/async/currency_v2_update?async=source_amount:1,source_currency:${fromCurrency.freebase},target_currency:${toCurrency.freebase},lang:en,country:fr,disclaimer_url:https://www.google.com/intl/en/googlefinance/disclaimer/,period:1M,interval:86400,_id:currency-v2-updatable_27,_pms:s,_fmt:pc`
	const response = await fetch(url)
	const text = await response.text()
	const match = text.match(/data-value="([^"]+)"/)
	if(match) {
		const value = parseFloat(match[1])
		logger.log(`[exchange-rate] Rate for ${fromCurrency.code} to ${toCurrency.code} is ${value}...`)
		await collection.updateOne({ from: fromCurrency.code, to: toCurrency.code }, { $set: { value, date: new Date() } }, { upsert: true })
	} else {
		logger.error(`[exchange-rate] Could not retrieve rate for ${fromCurrency.code} to ${toCurrency.code}`)
	}
}

;(async function refreshRates() {
	for(const fromCurrency of CURRENCIES_MAP) {
		for(const toCurrency of CURRENCIES_MAP.filter(currency => currency.code !== fromCurrency.code)) {
			await retrieveRate(fromCurrency, toCurrency)
		}
	}
	logger.log(`[exchange-rate] Rates will be refreshed in 60 minutes`)
	setTimeout(() => refreshRates(), 60 * 60000)
})()
