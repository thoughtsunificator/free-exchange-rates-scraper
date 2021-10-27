import CURRENCIES_MAP from "../data/currencies_map.js"
import chalk from 'chalk'

/**
 * @global
 */
class ExchangeRates {

	/**
	 * @param {Browser} browser
	 * @param {object} logger
	 * @param {collection} MongoClient.Db.Collection
	 */
	constructor(browser, logger, collection) {
		this._browser = browser
		this._logger = logger
		this._collection = collection
		this._page = null
	}

	async load() {
		try {
			this.logger.log("[exchange-rate] Loading...")
			this._page = await this.browser.newPage()
			await this.page.setViewport({ width: 1920, height: 1080 })
			await this.page.setCookie(...[
				{
					name: "CONSENT",
					value: "YES+srp.gws-20211018-0-RC1.fr+FX+634",
					domain: '.google.com',
					secure: true
				}
			])
		} catch(ex) {
			this.logger.error(ex)
			this.logger.log(`An error occuring while loading: Retrying in 10s...`)
			await new Promise(resolve => {
				setTimeout(async () => {
					await this.load()
					resolve()
				}, 10000)
			})
		}
	}

	async retrieveRates() {
		this.logger.log(`[exchange-rate] Retrieving rates...`)
		try {
			for(const fromCurrency of CURRENCIES_MAP) {
				for(const toCurrency of CURRENCIES_MAP.filter(currency => currency.code !== fromCurrency.code)) {
					this.logger.log(`[exchange-rate] Retrieving rate for ${fromCurrency.code} => ${toCurrency.code}`)
					await this.page.goto(`https://www.google.com/search?q=${1}+${fromCurrency.code} to ${toCurrency.code}`, { waitUntil: 'networkidle2' })
					const value = await this.page.evaluate(() => {
						const spanNode = document.querySelector('span[data-value]')
						if(spanNode) {
							const value = spanNode.getAttribute("data-value")
							if(value && !isNaN(value.trim())) {
								return parseFloat(value)
							} else {
								return null
							}
						} else {
							return null
						}
					})
					if(value) {
						this.logger.log(`[exchange-rate] Rate for ${fromCurrency.code} to ${toCurrency.code} is ${value}...`)
						await this.collection.updateOne({ from: fromCurrency.code, to: toCurrency.code }, { $set: { value, date: new Date() } }, { upsert: true })
					} else {
						this.logger.error(`[exchange-rate Could not retrieve rate for ${fromCurrency.code} to ${toCurrency.code}`)
					}
				}

			}
			this.logger.log(`[exchange-rate] Finished retrieving rates`)
		} catch(ex) {
			this.logger.error(ex)
			this.logger.log(`An error occuring while retrieving rates: Retrying in 10s...`)
			await new Promise(resolve => setTimeout(() => this.retrieveRates().then(resolve), 10000))
		}
	}

	/**
	 * @readonly
	 * @type {Browser}
	 */
	get browser() {
		return this._browser
	}

	/**
	 * @readonly
	 * @type {type}
	 */
	get logger() {
		return this._logger
	}

	/**
	 * @readonly
	 * @type {type}
	 */
	get page() {
		return this._page
	}

	/**
	 * @readonly
	 * @type {}
	 */
	get collection() {
		return this._collection
	}

}

export default ExchangeRates
