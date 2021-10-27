import fs from "fs"

export function config(envPath = ".env.json", confPath = "data/config.json") {
	let envFile
	if (fs.existsSync(envPath)) {
		try {
			const data = fs.readFileSync(envPath);
			envFile = JSON.parse(data)
		} catch(ex) {
			console.error(ex)
		}
	} else {
		envFile = {}
	}
	let configFile
	if (fs.existsSync(confPath)) {
		try {
			const data = fs.readFileSync(confPath);
			configFile = JSON.parse(data)
		} catch(ex) {
			console.error(ex)
		}
	} else {
		configFile = {}
	}
	const config = {}
	for(const key in configFile) {
		config[key] = configFile[key]
	}
	for(const key in envFile) {
		config[key] = envFile[key]
	}
	const processEnvKeys = Object.keys(config).filter(key => key in process.env)
	for(const key of processEnvKeys) {
		config[key] = process.env[key]
	}
	return config
}

export default config()
