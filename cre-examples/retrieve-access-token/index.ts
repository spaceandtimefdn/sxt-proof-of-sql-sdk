import {
	CronCapability,
	handler,
	Runner,
	type Runtime
} from '@chainlink/cre-sdk'
import { getAccessToken } from 'sxt-proof-of-sql-cre-sdk-typescript'
import { z } from 'zod'

const configSchema = z.object({
	schedule: z.string(),
	authUrl: z.string(),
	sxtApiKeySecretKey: z.string(),
})

type Config = z.infer<typeof configSchema>

const onCronTrigger = (runtime: Runtime<Config>) => {
	let accessToken = getAccessToken(runtime);
	return !!accessToken ? "Success" : "Unexpected error retrieving access token";
}

const initWorkflow = (config: Config) => {
	const cron = new CronCapability()

	return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })

	await runner.run(initWorkflow)
}
