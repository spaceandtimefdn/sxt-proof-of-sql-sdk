import { CronCapability, handler, Runner, type Runtime } from '@chainlink/cre-sdk'
import { z } from 'zod'
import { proofOfSql } from 'sxt-proof-of-sql-cre-sdk-typescript'
import input from '../../test_assets/valid_gateway_response.json' with { type: 'json' };

const configSchema = z.object({
	schedule: z.string(),
})

type Config = z.infer<typeof configSchema>

const onCronTrigger = (runtime: Runtime<Config>) => {
	const inputString = JSON.stringify(input);
	const result = proofOfSql().verify(inputString, [])
	switch (result.verificationStatus) {
    case "Failure":
      return `SQL Proof Verification Failed: ${result.error}`;
    case "Success":
      runtime.log(`SQL Proof Verification Succeeded`);
  }
  return result.verificationStatus
}

const initWorkflow = (config: Config) => {
	const cron = new CronCapability()
	return [handler(cron.trigger({ schedule: config.schedule }), onCronTrigger)]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })
	await runner.run(initWorkflow)
}
