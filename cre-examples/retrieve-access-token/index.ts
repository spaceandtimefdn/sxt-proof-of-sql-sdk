import {
	CronCapability,
	handler,
	hexToBytes,
	Runner,
	type Runtime
} from '@chainlink/cre-sdk'
import { getAccessToken, submitZkQuery } from 'sxt-proof-of-sql-cre-sdk-typescript'
import { z } from 'zod'

const configSchema = z.object({
	schedule: z.string(),
	authUrl: z.string(),
	sxtApiKeySecretKey: z.string(),
	zkQueryUrl: z.string(),
})

type Config = z.infer<typeof configSchema>

const onCronTrigger = (runtime: Runtime<Config>) => {
	let accessToken = getAccessToken(runtime)!;
	let result = submitZkQuery(runtime, accessToken, "0x", "0x", "0x");
	return result;
}

const initWorkflow = (config: Config) => {
	const cron = new CronCapability()

	return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })

	await runner.run(initWorkflow)
}
